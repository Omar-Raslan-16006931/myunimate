
import React, { useState } from 'react';
import { X, Brain, Sparkles, Copy, Check, Info, AlertCircle, Calendar, Clock, MapPin, Loader2 } from 'lucide-react';
import { ExtractedScheduleItem, ScheduleEvent, EventType, ScheduleProfile } from '../types';

// ── Design tokens ─────────────────────────────────────────────────────────────
const INK       = '#1A1730';
const CARD_BG   = '#FAFAF6';
const HL_YELLOW = '#F6DF63';
const HL_BLUE   = '#9ECFFF';
const HL_GREEN  = '#8CE3B7';
const HL_RED    = '#E56A5A';

const inputStyle: React.CSSProperties = {
  background: 'rgba(26,23,48,0.06)',
  border: `1.5px solid ${INK}`,
  borderRadius: '8px',
  padding: '12px 14px',
  color: INK,
  fontFamily: "'Instrument Sans', 'Inter', sans-serif",
  fontSize: '0.9rem',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.68rem',
  fontWeight: 700,
  letterSpacing: '0.5px',
  textTransform: 'uppercase',
  color: `${INK}80`,
  fontFamily: "'Instrument Sans', 'Inter', sans-serif",
  marginBottom: '8px',
};

const primaryBtn: React.CSSProperties = {
  background: INK,
  color: '#fff',
  border: `1.5px solid ${INK}`,
  borderRadius: '10px',
  fontWeight: 700,
  boxShadow: `4px 4px 0 ${HL_YELLOW}`,
  cursor: 'pointer',
  padding: '12px 18px',
  fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif",
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  fontSize: '0.9rem',
  width: '100%',
};

interface SmartImportModalProps {
  onClose: () => void;
  onImport: (events: (Partial<ScheduleEvent> & { period_number?: number })[], importMode: 'full' | 'slots-only', targetProfileId: string, addToCourses: boolean) => void;
  profiles: ScheduleProfile[];
  activeProfileId: string;
}

const SmartImportModal: React.FC<SmartImportModalProps> = ({ onClose, onImport, profiles, activeProfileId }) => {
  const [importType, setImportType] = useState<'weekly' | 'exam'>('weekly');
  const [jsonInput, setJsonInput] = useState('');
  const [parsedItems, setParsedItems] = useState<ExtractedScheduleItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'full' | 'slots-only'>('full');
  const [copied, setCopied] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState(activeProfileId);
  const [addToCourses, setAddToCourses] = useState(true);

  const weeklyPrompt = `I am sending you an image of my university schedule. Please extract all the courses and their details into a valid JSON array. Each object in the array should follow this structure:\n[\n  {\n    "day": "Monday",\n    "period_number": 1,\n    "time_start": "08:30",\n    "time_end": "10:00",\n    "course_name": "Course Name",\n    "course_code": "CODE123",\n    "room": "Room 101",\n    "type": "lecture"\n  }\n]\nValid types: lecture, tutorial, lab, quiz, assignment, exam, study, other.\nReturn ONLY the JSON array.`;

  const examPrompt = `I am sending you an image of my exam schedule. Please extract all the exams and their details into a valid JSON array. Each object in the array should follow this structure:\n[\n  {\n    "date": "2026-05-15",\n    "day": "Friday",\n    "time_start": "09:00",\n    "time_end": "12:00",\n    "course_name": "Information Security",\n    "course_code": "INCS407",\n    "room": "A3.228",\n    "type": "exam"\n  }\n]\nReturn ONLY the JSON array. Ensure the date is in YYYY-MM-DD format.`;

  const promptText = importType === 'weekly' ? weeklyPrompt : examPrompt;

  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime24 = (timeStr: string) => {
    if (!timeStr) return "";
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (!match) return timeStr;
    let h = parseInt(match[1], 10);
    const m = match[2];
    const ampm = match[3]?.toUpperCase();
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:${m}`;
  };

  const handleParse = () => {
    try {
      setError(null);
      // Clean input (remove markdown code blocks if present)
      const cleaned = jsonInput.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      
      if (!Array.isArray(parsed)) {
        throw new Error('Input must be a JSON array of objects.');
      }
      
      const formattedItems = parsed.map(item => ({
        ...item,
        time_start: formatTime24(item.time_start),
        time_end: formatTime24(item.time_end)
      }));

      setParsedItems(formattedItems);
    } catch (err) {
      setError('Invalid JSON format. Please make sure you copied the entire array correctly.');
      console.error(err);
    }
  };

  const handleFinalImport = async () => {
    setIsImporting(true);
    setImportError(null);
    try {
      const events: (Partial<ScheduleEvent> & { period_number?: number })[] = parsedItems.map(item => ({
        title: item.course_name,
        code: item.course_code,
        location: item.room,
        type: (item.type?.toLowerCase() as EventType) || (importType === 'exam' ? 'exam' : 'lecture'),
        dayOfWeek: item.day,
        date: item.date,
        startTime: item.time_start,
        durationMinutes: calculateDuration(item.time_start, item.time_end),
        isRecurring: importType === 'weekly',
        period_number: item.period_number
      }));

      await onImport(events, importMode, selectedProfileId, addToCourses);
      onClose();
    } catch (err: any) {
      console.error("Import error:", err);
      setImportError(err.message || "An error occurred during import.");
    } finally {
      setIsImporting(false);
    }
  };

  const calculateDuration = (start: string, end: string) => {
    if (!start || !end) return 60;
    try {
      const [sH, sM] = start.split(':').map(Number);
      const [eH, eM] = end.split(':').map(Number);
      const duration = (eH * 60 + eM) - (sH * 60 + sM);
      return isNaN(duration) || duration <= 0 ? 60 : duration;
    } catch {
      return 60;
    }
  };

  const removeItem = (index: number) => {
    setParsedItems(prev => prev.filter((_, i) => i !== index));
  };

  // Toggle button helper
  const toggleBtn = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '9px',
    borderRadius: '8px',
    border: active ? `1.5px solid ${INK}` : '1.5px solid transparent',
    background: active ? HL_YELLOW : 'transparent',
    color: INK,
    fontSize: '0.78rem',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
    transition: 'all 0.15s',
    fontFamily: "'Instrument Sans', 'Inter', sans-serif",
  });

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '12px',
        background: 'rgba(26,23,48,0.6)',
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: CARD_BG,
          border: `1.5px solid ${INK}`,
          borderRadius: '14px',
          boxShadow: `8px 10px 0 ${INK}`,
          width: '95%',
          maxWidth: '580px',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }} 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: `1.5px solid rgba(26,23,48,0.12)`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: `${HL_YELLOW}40`,
          flexShrink: 0,
        }}>
          <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
            <div style={{background: INK, padding: '8px', borderRadius: '10px', display: 'flex', border: `1.5px solid ${INK}`}}>
              <Brain size={19} color="#fff" />
            </div>
            <div>
              <h2 style={{margin: 0, fontSize: '1.1rem', fontWeight: 800, color: INK, fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif"}}>Smart Schedule Import</h2>
              <p style={{margin: 0, fontSize: '0.72rem', color: `${INK}70`, fontFamily: "'Instrument Sans', 'Inter', sans-serif"}}>Import from any AI using JSON</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{background: 'rgba(26,23,48,0.07)', border: `1.5px solid ${INK}`, color: INK, cursor: 'pointer', padding: '6px', borderRadius: '8px', display: 'flex'}}
          >
            <X size={18} color={INK} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{flex: 1, overflowY: 'auto', padding: '20px'}}>
          {parsedItems.length === 0 ? (
            <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
              {/* Import Type Toggle */}
              <div style={{background: 'rgba(26,23,48,0.04)', padding: '4px', borderRadius: '12px', display: 'flex', border: `1.5px solid rgba(26,23,48,0.12)`}}>
                <button onClick={() => setImportType('weekly')} style={toggleBtn(importType === 'weekly')}>
                  <Calendar size={13} /> Weekly Schedule
                </button>
                <button onClick={() => setImportType('exam')} style={toggleBtn(importType === 'exam')}>
                  <Sparkles size={13} /> Exam Schedule
                </button>
              </div>

              {/* Instructions */}
              <div style={{background: `${HL_BLUE}40`, border: `1.5px solid ${INK}`, borderRadius: '12px', padding: '16px', boxShadow: `3px 3px 0 ${INK}`}}>
                <h3 style={{margin: '0 0 10px 0', fontSize: '0.88rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '7px', color: INK, fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif"}}>
                  <Info size={15} color={INK} /> How it works
                </h3>
                <ol style={{margin: 0, paddingLeft: '18px', fontSize: '0.84rem', color: `${INK}90`, display: 'flex', flexDirection: 'column', gap: '6px', fontFamily: "'Instrument Sans', 'Inter', sans-serif", lineHeight: 1.5}}>
                  <li>Take a clear photo or screenshot of your {importType === 'weekly' ? 'weekly' : 'exam'} schedule.</li>
                  <li>Copy the AI Prompt below.</li>
                  <li>Send the photo and the prompt to ChatGPT, Gemini, or Claude.</li>
                  <li>Paste the JSON response from the AI into the box below.</li>
                </ol>
              </div>

              {/* Prompt Section */}
              <div>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                  <label style={labelStyle}>AI Prompt</label>
                  <button 
                    onClick={handleCopyPrompt}
                    style={{
                      background: copied ? `${HL_GREEN}40` : 'rgba(26,23,48,0.06)', 
                      border: `1.5px solid ${copied ? HL_GREEN : INK}`,
                      color: INK, 
                      padding: '5px 12px', 
                      borderRadius: '8px', 
                      fontSize: '0.72rem', 
                      fontWeight: 700, 
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '5px',
                      fontFamily: "'Instrument Sans', 'Inter', sans-serif",
                    }}
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    {copied ? 'Copied!' : 'Copy Prompt'}
                  </button>
                </div>
                <div style={{
                  background: 'rgba(26,23,48,0.04)', padding: '14px', borderRadius: '10px',
                  fontSize: '0.72rem', color: `${INK}90`,
                  border: `1.5px solid rgba(26,23,48,0.12)`,
                  fontFamily: "'Space Mono', monospace",
                  whiteSpace: 'pre-wrap', lineHeight: 1.6,
                }}>
                  {promptText}
                </div>
              </div>

              {/* JSON Input */}
              <div>
                <label style={labelStyle}>Paste JSON Here</label>
                <textarea 
                  value={jsonInput}
                  onChange={e => setJsonInput(e.target.value)}
                  placeholder='[ { "day": "Monday", ... } ]'
                  style={{
                    ...inputStyle,
                    height: '140px',
                    fontFamily: "'Space Mono', monospace",
                    fontSize: '0.82rem',
                    resize: 'none',
                    lineHeight: 1.5,
                  }}
                />
                {error && (
                  <div style={{marginTop: '8px', color: HL_RED, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Instrument Sans', 'Inter', sans-serif"}}>
                    <AlertCircle size={13} /> {error}
                  </div>
                )}
                <button 
                  onClick={handleParse}
                  disabled={!jsonInput.trim()}
                  style={{
                    ...primaryBtn, 
                    marginTop: '14px',
                    opacity: jsonInput.trim() ? 1 : 0.45,
                    cursor: jsonInput.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  <Sparkles size={17} /> Preview Import
                </button>
              </div>
            </div>
          ) : (
            <div style={{display: 'flex', flexDirection: 'column', gap: '18px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <h3 style={{margin: 0, fontSize: '1rem', fontWeight: 800, color: INK, fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif"}}>Preview ({parsedItems.length} items)</h3>
                <button
                  onClick={() => setParsedItems([])}
                  style={{background: 'transparent', border: 'none', color: INK, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', fontFamily: "'Instrument Sans', 'Inter', sans-serif"}}
                >
                  Start Over
                </button>
              </div>

              {/* Import Mode Toggle */}
              <div style={{background: 'rgba(26,23,48,0.04)', padding: '4px', borderRadius: '12px', display: 'flex', border: `1.5px solid rgba(26,23,48,0.12)`}}>
                <button onClick={() => setImportMode('full')} style={toggleBtn(importMode === 'full')}>
                  <Clock size={13} /> Timings & Slots
                </button>
                <button onClick={() => setImportMode('slots-only')} style={toggleBtn(importMode === 'slots-only')}>
                  <Calendar size={13} /> Slots Only
                </button>
              </div>

              {/* Import Settings */}
              <div style={{
                display: 'flex', flexDirection: 'column', gap: '14px',
                background: 'rgba(26,23,48,0.04)', padding: '14px', borderRadius: '10px',
                border: `1.5px solid rgba(26,23,48,0.12)`,
              }}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px'}}>
                  <label style={{fontSize: '0.875rem', fontWeight: 600, color: INK, fontFamily: "'Instrument Sans', 'Inter', sans-serif"}}>Import to Schedule</label>
                  <select 
                    value={selectedProfileId}
                    onChange={(e) => setSelectedProfileId(e.target.value)}
                    style={{
                      background: 'rgba(26,23,48,0.06)', 
                      border: `1.5px solid ${INK}`, 
                      color: INK, 
                      fontSize: '0.8rem', 
                      padding: '7px 12px', 
                      borderRadius: '8px', 
                      outline: 'none', 
                      cursor: 'pointer',
                      fontFamily: "'Instrument Sans', 'Inter', sans-serif",
                    }}
                  >
                    {profiles.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px'}}>
                  <label style={{fontSize: '0.875rem', fontWeight: 600, color: INK, fontFamily: "'Instrument Sans', 'Inter', sans-serif"}}>
                    Add distinct courses to Grades section
                  </label>
                  <input 
                    type="checkbox" 
                    checked={addToCourses}
                    onChange={(e) => setAddToCourses(e.target.checked)}
                    style={{width: '18px', height: '18px', cursor: 'pointer', accentColor: INK, flexShrink: 0}}
                  />
                </div>
              </div>

              {/* Preview items */}
              <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                {parsedItems.map((item, idx) => (
                  <div key={idx} style={{
                    background: CARD_BG,
                    border: `1.5px solid rgba(26,23,48,0.2)`,
                    borderRadius: '12px', padding: '12px 14px',
                    display: 'flex', gap: '12px', alignItems: 'flex-start',
                    boxShadow: `2px 2px 0 rgba(26,23,48,0.12)`,
                  }}>
                    <div style={{flex: 1}}>
                      <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px'}}>
                        <input 
                          value={item.course_name}
                          onChange={e => {
                            const newItems = [...parsedItems];
                            newItems[idx].course_name = e.target.value;
                            setParsedItems(newItems);
                          }}
                          style={{
                            background: 'rgba(26,23,48,0.05)', border: `1.5px solid rgba(26,23,48,0.2)`,
                            color: INK, fontSize: '0.85rem', fontWeight: 700,
                            padding: '5px 9px', borderRadius: '6px', flex: 1,
                            outline: 'none', fontFamily: "'Instrument Sans', 'Inter', sans-serif",
                          }}
                        />
                        <input 
                          value={item.course_code || ''}
                          placeholder="Code"
                          onChange={e => {
                            const newItems = [...parsedItems];
                            newItems[idx].course_code = e.target.value;
                            setParsedItems(newItems);
                          }}
                          style={{
                            background: 'rgba(26,23,48,0.05)', border: `1.5px solid rgba(26,23,48,0.2)`,
                            color: `${INK}80`, fontSize: '0.72rem',
                            padding: '5px 9px', borderRadius: '6px', width: '80px',
                            outline: 'none', fontFamily: "'Space Mono', monospace",
                          }}
                        />
                      </div>
                      <div style={{display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '0.75rem', color: `${INK}70`}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                          <Calendar size={11} color={`${INK}70`} />
                          {importType === 'exam' ? (
                            <input 
                              type="date"
                              value={item.date || ''}
                              onChange={e => {
                                const newItems = [...parsedItems];
                                newItems[idx].date = e.target.value;
                                setParsedItems(newItems);
                              }}
                              style={{background: 'transparent', border: 'none', color: `${INK}80`, fontSize: '0.75rem', outline: 'none', cursor: 'pointer', fontFamily: "'Instrument Sans', 'Inter', sans-serif"}}
                            />
                          ) : (
                            <select 
                              value={item.day}
                              onChange={e => {
                                const newItems = [...parsedItems];
                                newItems[idx].day = e.target.value;
                                setParsedItems(newItems);
                              }}
                              style={{background: 'transparent', border: 'none', color: `${INK}80`, fontSize: '0.75rem', outline: 'none', cursor: 'pointer', fontFamily: "'Instrument Sans', 'Inter', sans-serif"}}
                            >
                              {['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(d => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                          )}
                        </div>
                        {importMode === 'full' && (
                          <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                            <Clock size={11} color={`${INK}70`} />
                            <input 
                              type="time"
                              value={item.time_start}
                              onChange={e => {
                                const newItems = [...parsedItems];
                                newItems[idx].time_start = e.target.value;
                                setParsedItems(newItems);
                              }}
                              style={{background: 'transparent', border: 'none', color: `${INK}80`, fontSize: '0.75rem', outline: 'none', fontFamily: "'Instrument Sans', 'Inter', sans-serif"}}
                            />
                            –
                            <input 
                              type="time"
                              value={item.time_end}
                              onChange={e => {
                                const newItems = [...parsedItems];
                                newItems[idx].time_end = e.target.value;
                                setParsedItems(newItems);
                              }}
                              style={{background: 'transparent', border: 'none', color: `${INK}80`, fontSize: '0.75rem', outline: 'none', fontFamily: "'Instrument Sans', 'Inter', sans-serif"}}
                            />
                          </div>
                        )}
                        <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                          <MapPin size={11} color={`${INK}70`} />
                          <input 
                            value={item.room || ''}
                            placeholder="Room"
                            onChange={e => {
                              const newItems = [...parsedItems];
                              newItems[idx].room = e.target.value;
                              setParsedItems(newItems);
                            }}
                            style={{background: 'transparent', border: 'none', color: `${INK}80`, fontSize: '0.75rem', outline: 'none', width: '80px', fontFamily: "'Instrument Sans', 'Inter', sans-serif"}}
                          />
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeItem(idx)}
                      style={{background: `${HL_RED}18`, border: `1.5px solid ${HL_RED}60`, color: HL_RED, cursor: 'pointer', padding: '7px', borderRadius: '8px', display: 'flex', flexShrink: 0}}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>

            {importError && (
              <div style={{color: HL_RED, fontSize: '0.85rem', marginTop: '8px', padding: '10px 14px', background: `${HL_RED}15`, borderRadius: '10px', textAlign: 'center', border: `1px solid ${HL_RED}50`, fontFamily: "'Instrument Sans', 'Inter', sans-serif"}}>
                {importError}
              </div>
            )}

            <button 
              onClick={handleFinalImport}
              disabled={isImporting}
              style={{...primaryBtn, marginTop: '6px', opacity: isImporting ? 0.7 : 1, cursor: isImporting ? 'not-allowed' : 'pointer'}}
            >
              {isImporting ? <Loader2 size={18} style={{animation: "spin 1s linear infinite"}} /> : `Finalize Import (${parsedItems.length} items)`}
            </button>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default SmartImportModal;
