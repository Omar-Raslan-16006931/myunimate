
import React, { useState } from 'react';
import { X, Brain, Sparkles, Copy, Check, Info, AlertCircle, Calendar, Clock, MapPin, Loader2 } from 'lucide-react';
import { ExtractedScheduleItem, ScheduleEvent, EventType, ScheduleProfile } from '../types';
import { theme, styles } from '../theme';

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

  const weeklyPrompt = `I am sending you an image of my university schedule. Please extract all the courses and their details into a valid JSON array. Each object in the array should follow this structure:
[
  {
    "day": "Monday",
    "period_number": 1,
    "time_start": "08:30",
    "time_end": "10:00",
    "course_name": "Course Name",
    "course_code": "CODE123",
    "room": "Room 101",
    "type": "lecture"
  }
]
Valid types: lecture, tutorial, lab, quiz, assignment, exam, study, other.
Return ONLY the JSON array.`;

  const examPrompt = `I am sending you an image of my exam schedule. Please extract all the exams and their details into a valid JSON array. Each object in the array should follow this structure:
[
  {
    "date": "2026-05-15",
    "day": "Friday",
    "time_start": "09:00",
    "time_end": "12:00",
    "course_name": "Information Security",
    "course_code": "INCS407",
    "room": "A3.228",
    "type": "exam"
  }
]
Return ONLY the JSON array. Ensure the date is in YYYY-MM-DD format.`;

  const promptText = importType === 'weekly' ? weeklyPrompt : examPrompt;

  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      
      setParsedItems(parsed);
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
        date: item.date || null,
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
      return (eH * 60 + eM) - (sH * 60 + sM);
    } catch {
      return 60;
    }
  };

  const removeItem = (index: number) => {
    setParsedItems(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div 
        style={{
          ...styles.modalContent, 
          width: '95%', 
          maxWidth: '600px', 
          maxHeight: '85vh', 
          display: 'flex', 
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden'
        }} 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
            <div style={{background: theme.accent, padding: '8px', borderRadius: '12px', color: '#fff'}}>
              <Brain size={20} />
            </div>
            <div>
              <h2 style={{margin: 0, fontSize: '1.2rem', fontWeight: 800}}>Smart Schedule Import</h2>
              <p style={{margin: 0, fontSize: '0.75rem', color: theme.textMuted}}>Import from any AI using JSON</p>
            </div>
          </div>
          <button onClick={onClose} style={{background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', cursor: 'pointer', padding: '8px', borderRadius: '50%'}}>
            <X size={20} />
          </button>
        </div>

        <div style={{flex: 1, overflowY: 'auto', padding: '20px'}}>
          {parsedItems.length === 0 ? (
            <div style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
              {/* Import Type Toggle */}
              <div style={{background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '14px', display: 'flex', border: '1px solid rgba(255,255,255,0.05)'}}>
                <button 
                  onClick={() => setImportType('weekly')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    border: 'none',
                    background: importType === 'weekly' ? theme.accent : 'transparent',
                    color: '#fff',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                >
                  <Calendar size={14} /> Weekly Schedule
                </button>
                <button 
                  onClick={() => setImportType('exam')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    border: 'none',
                    background: importType === 'exam' ? theme.accent : 'transparent',
                    color: '#fff',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                >
                  <Sparkles size={14} /> Exam Schedule
                </button>
              </div>

              {/* Instructions */}
              <div style={{background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '20px', padding: '20px'}}>
                <h3 style={{margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: theme.accent}}>
                  <Info size={16} /> How it works
                </h3>
                <ol style={{margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', display: 'flex', flexDirection: 'column', gap: '8px'}}>
                  <li>Take a clear photo or screenshot of your {importType === 'weekly' ? 'weekly' : 'exam'} schedule.</li>
                  <li>Copy the AI Prompt below.</li>
                  <li>Send the photo and the prompt to ChatGPT, Gemini, or Claude.</li>
                  <li>Paste the JSON response from the AI into the box below.</li>
                </ol>
              </div>

              {/* Prompt Section */}
              <div>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                  <label style={{fontSize: '0.8rem', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase'}}>AI Prompt</label>
                  <button 
                    onClick={handleCopyPrompt}
                    style={{
                      background: copied ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255,255,255,0.05)', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      color: copied ? '#4ade80' : '#fff', 
                      padding: '6px 12px', 
                      borderRadius: '10px', 
                      fontSize: '0.75rem', 
                      fontWeight: 600, 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s'
                    }}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copied!' : 'Copy Prompt'}
                  </button>
                </div>
                <div style={{background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '12px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.05)', fontFamily: 'monospace', whiteSpace: 'pre-wrap'}}>
                  {promptText}
                </div>
              </div>

              {/* Input Section */}
              <div>
                <label style={{fontSize: '0.8rem', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', marginBottom: '10px', display: 'block'}}>Paste JSON Here</label>
                <textarea 
                  value={jsonInput}
                  onChange={e => setJsonInput(e.target.value)}
                  placeholder='[ { "day": "Monday", ... } ]'
                  style={{
                    width: '100%',
                    height: '150px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '16px',
                    color: '#fff',
                    padding: '16px',
                    fontSize: '0.85rem',
                    fontFamily: 'monospace',
                    outline: 'none',
                    resize: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                {error && (
                  <div style={{marginTop: '10px', color: theme.danger, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px'}}>
                    <AlertCircle size={14} /> {error}
                  </div>
                )}
                <button 
                  onClick={handleParse}
                  disabled={!jsonInput.trim()}
                  style={{
                    ...styles.button, 
                    width: '100%', 
                    marginTop: '16px', 
                    opacity: jsonInput.trim() ? 1 : 0.5,
                    cursor: jsonInput.trim() ? 'pointer' : 'not-allowed'
                  }}
                >
                  <Sparkles size={18} /> Preview Import
                </button>
              </div>
            </div>
          ) : (
            <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <h3 style={{margin: 0, fontSize: '1rem', fontWeight: 700}}>Preview ({parsedItems.length} items)</h3>
                <button onClick={() => setParsedItems([])} style={{background: 'transparent', border: 'none', color: theme.accent, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer'}}>Start Over</button>
              </div>

              {/* Import Mode Toggle */}
              <div style={{background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '14px', display: 'flex', border: '1px solid rgba(255,255,255,0.05)'}}>
                <button 
                  onClick={() => setImportMode('full')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    border: 'none',
                    background: importMode === 'full' ? theme.accent : 'transparent',
                    color: '#fff',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                >
                  <Clock size={14} /> Timings & Slots
                </button>
                <button 
                  onClick={() => setImportMode('slots-only')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    border: 'none',
                    background: importMode === 'slots-only' ? theme.accent : 'transparent',
                    color: '#fff',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                >
                  <Calendar size={14} /> Slots Only
                </button>
              </div>

              {/* Import Settings */}
              <div style={{display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <label style={{fontSize: '0.85rem', fontWeight: 600, color: '#fff'}}>Import to Schedule</label>
                  <select 
                    value={selectedProfileId}
                    onChange={(e) => setSelectedProfileId(e.target.value)}
                    style={{
                      background: 'rgba(255,255,255,0.05)', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      color: '#fff', 
                      fontSize: '0.8rem', 
                      padding: '8px 12px', 
                      borderRadius: '10px', 
                      outline: 'none', 
                      cursor: 'pointer'
                    }}
                  >
                    {profiles.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <label style={{fontSize: '0.85rem', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px'}}>
                    Add distinct courses to Grades section
                  </label>
                  <input 
                    type="checkbox" 
                    checked={addToCourses}
                    onChange={(e) => setAddToCourses(e.target.checked)}
                    style={{width: '18px', height: '18px', cursor: 'pointer', accentColor: theme.accent}}
                  />
                </div>
              </div>

              <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                {parsedItems.map((item, idx) => (
                  <div key={idx} style={{background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '14px', display: 'flex', gap: '12px', alignItems: 'flex-start'}}>
                    <div style={{flex: 1}}>
                      <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px'}}>
                        <input 
                          value={item.course_name}
                          onChange={e => {
                            const newItems = [...parsedItems];
                            newItems[idx].course_name = e.target.value;
                            setParsedItems(newItems);
                          }}
                          style={{background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.85rem', fontWeight: 700, padding: '4px 8px', borderRadius: '6px', flex: 1}}
                        />
                        <input 
                          value={item.course_code || ''}
                          placeholder="Code"
                          onChange={e => {
                            const newItems = [...parsedItems];
                            newItems[idx].course_code = e.target.value;
                            setParsedItems(newItems);
                          }}
                          style={{background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: theme.textMuted, fontSize: '0.7rem', padding: '4px 8px', borderRadius: '6px', width: '80px'}}
                        />
                      </div>
                      <div style={{display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '0.75rem', color: theme.textMuted}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                          <Calendar size={12} />
                          {importType === 'exam' ? (
                            <input 
                              type="date"
                              value={item.date || ''}
                              onChange={e => {
                                const newItems = [...parsedItems];
                                newItems[idx].date = e.target.value;
                                setParsedItems(newItems);
                              }}
                              style={{background: 'transparent', border: 'none', color: theme.textMuted, fontSize: '0.75rem', outline: 'none', cursor: 'pointer'}}
                            />
                          ) : (
                            <select 
                              value={item.day}
                              onChange={e => {
                                const newItems = [...parsedItems];
                                newItems[idx].day = e.target.value;
                                setParsedItems(newItems);
                              }}
                              style={{background: 'transparent', border: 'none', color: theme.textMuted, fontSize: '0.75rem', outline: 'none', cursor: 'pointer'}}
                            >
                              {['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(d => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                          )}
                        </div>
                        {importMode === 'full' && (
                          <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                            <Clock size={12} />
                            <input 
                              type="time"
                              value={item.time_start}
                              onChange={e => {
                                const newItems = [...parsedItems];
                                newItems[idx].time_start = e.target.value;
                                setParsedItems(newItems);
                              }}
                              style={{background: 'transparent', border: 'none', color: theme.textMuted, fontSize: '0.75rem', outline: 'none'}}
                            />
                            -
                            <input 
                              type="time"
                              value={item.time_end}
                              onChange={e => {
                                const newItems = [...parsedItems];
                                newItems[idx].time_end = e.target.value;
                                setParsedItems(newItems);
                              }}
                              style={{background: 'transparent', border: 'none', color: theme.textMuted, fontSize: '0.75rem', outline: 'none'}}
                            />
                          </div>
                        )}
                        <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                          <MapPin size={12} />
                          <input 
                            value={item.room || ''}
                            placeholder="Room"
                            onChange={e => {
                              const newItems = [...parsedItems];
                              newItems[idx].room = e.target.value;
                              setParsedItems(newItems);
                            }}
                            style={{background: 'transparent', border: 'none', color: theme.textMuted, fontSize: '0.75rem', outline: 'none', width: '80px'}}
                          />
                        </div>
                      </div>
                    </div>
                    <button onClick={() => removeItem(idx)} style={{background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: theme.danger, cursor: 'pointer', padding: '8px', borderRadius: '10px'}}><X size={18} /></button>
                  </div>
                ))}
              </div>

            {importError && (
              <div style={{color: theme.danger, fontSize: '0.85rem', marginTop: '10px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', textAlign: 'center'}}>
                {importError}
              </div>
            )}

            <button 
              onClick={handleFinalImport}
              disabled={isImporting}
              style={{...styles.button, width: '100%', marginTop: '10px', opacity: isImporting ? 0.7 : 1, justifyContent: 'center'}}
            >
              {isImporting ? <Loader2 size={20} className="spin" style={{animation: "spin 1s linear infinite"}} /> : `Finalize Import (${parsedItems.length} items)`}
            </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SmartImportModal;
