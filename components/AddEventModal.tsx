
import React, { useState, useEffect } from 'react';
import { ScheduleEvent, EventColorMap, EventType, PeriodDefinition, CourseGrade } from '../types';
import { parseNaturalLanguageEvent } from '../services/geminiService';
import { getLocalISOString } from '../constants';
import { X, Sparkles, Loader2, Wand2, BookOpen, ChevronRight, Calendar } from 'lucide-react';

// ── Design tokens ─────────────────────────────────────────────────────────────
const INK       = '#1A1730';
const CARD_BG   = '#FAFAF6';
const HL_YELLOW = '#F6DF63';
const HL_GREEN  = '#8CE3B7';
const HL_RED    = '#E56A5A';

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 2000,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '16px',
  background: 'rgba(26,23,48,0.6)',
};

const card: React.CSSProperties = {
  background: CARD_BG,
  border: `1.5px solid ${INK}`,
  borderRadius: '14px',
  boxShadow: `8px 10px 0 ${INK}`,
  padding: '24px',
  width: '90%',
  maxWidth: '450px',
  maxHeight: '90vh',
  overflowY: 'auto',
  boxSizing: 'border-box',
};

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
  fontSize: '0.7rem',
  fontWeight: 700,
  letterSpacing: '0.5px',
  textTransform: 'uppercase',
  color: INK,
  fontFamily: "'Instrument Sans', 'Inter', sans-serif",
  marginBottom: '6px',
};

const primaryBtn: React.CSSProperties = {
  background: INK,
  color: '#fff',
  border: `1.5px solid ${INK}`,
  borderRadius: '10px',
  fontWeight: 700,
  boxShadow: `4px 4px 0 ${HL_YELLOW}`,
  cursor: 'pointer',
  padding: '10px 18px',
  fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif",
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  fontSize: '1rem',
};

// ── Component ─────────────────────────────────────────────────────────────────

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: Partial<ScheduleEvent>, addToGrades?: boolean) => void;
  eventColors: EventColorMap;
  initialData: Partial<ScheduleEvent> | null;
  periods: PeriodDefinition[];
  courses?: CourseGrade[];
}

const AddEventModal: React.FC<AddEventModalProps> = ({ isOpen, onClose, onSave, eventColors, initialData, periods, courses = [] }) => {
  const [formData, setFormData] = useState<Partial<ScheduleEvent>>({
    isRecurring: false,
    type: "lecture",
    durationMinutes: 90,
    startTime: "08:30",
    dayOfWeek: "Saturday",
    date: getLocalISOString()
  });
  const [magicPrompt, setMagicPrompt] = useState("");
  const [isMagicLoading, setIsMagicLoading] = useState(false);
  const [timeMode, setTimeMode] = useState<'time' | 'slot'>('time');
  const [showCoursePicker, setShowCoursePicker] = useState(false);
  const [addToGrades, setAddToGrades] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
        setFormData({ 
            ...formData, 
            ...initialData,
            dayOfWeek: initialData.dayOfWeek || "Saturday",
            date: initialData.date || getLocalISOString()
        });
        // Auto-detect mode if editing
        if (initialData.startTime) {
             const isSlot = periods.some(p => p.startTime === initialData.startTime);
             if (isSlot) setTimeMode('slot');
        }
        setAddToGrades(false);
    } else {
        setFormData({
            isRecurring: false,
            type: "lecture",
            durationMinutes: 90,
            startTime: "08:30",
            dayOfWeek: "Saturday",
            date: getLocalISOString()
        });
        setAddToGrades(false);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleMagicAutofill = async () => {
    if (!magicPrompt.trim()) return;
    setIsMagicLoading(true);
    try {
      const result = await parseNaturalLanguageEvent(magicPrompt, periods);
      if (result) {
        setFormData(prev => ({ ...prev, ...result }));
        // If result maps to a slot, switch mode?
        if (result.startTime && periods.some(p => p.startTime === result.startTime)) {
            setTimeMode('slot');
        } else {
            setTimeMode('time');
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsMagicLoading(false);
    }
  };

  const handleSlotChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const periodId = e.target.value;
      const period = periods.find(p => p.id === periodId);
      if (period) {
          const [hStart, mStart] = period.startTime.split(':').map(Number);
          const [hEnd, mEnd] = period.endTime.split(':').map(Number);
          const startMins = hStart * 60 + mStart;
          const endMins = hEnd * 60 + mEnd;
          
          setFormData(prev => ({
              ...prev,
              startTime: period.startTime,
              durationMinutes: endMins - startMins
          }));
      }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      const match = courses.find(c => c.title === val);
      
      setFormData(prev => ({
          ...prev,
          title: val,
          ...(match ? { code: match.code } : {})
      }));
  };

  const selectCourse = (course: CourseGrade) => {
      setFormData(prev => ({
          ...prev,
          title: course.title,
          code: course.code,
      }));
      setShowCoursePicker(false);
  };

  const RequiredMark = () => <span style={{color: HL_RED, marginLeft: '4px'}}>*</span>;

  // Toggle-button style helper
  const toggleBtn = (active: boolean): React.CSSProperties => ({
    padding: '5px 12px',
    borderRadius: '6px',
    border: active ? `1.5px solid ${INK}` : '1.5px solid transparent',
    background: active ? HL_YELLOW : 'transparent',
    color: INK,
    fontWeight: 700,
    fontSize: '0.72rem',
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontFamily: "'Instrument Sans', 'Inter', sans-serif",
  });

  const sectionBox: React.CSSProperties = {
    background: 'rgba(26,23,48,0.04)',
    borderRadius: '10px',
    padding: '14px',
    border: `1.5px solid rgba(26,23,48,0.12)`,
    boxSizing: 'border-box',
  };

  return (
    <div style={overlay} onClick={onClose}>
        <div style={card} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px"}}>
              <h2 style={{margin: 0, fontSize: "1.5rem", fontWeight: 800, fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif", color: INK}}>
                  {formData.id ? 'Edit Event' : 'New Event'}
              </h2>
              <button 
                style={{background: 'rgba(26,23,48,0.07)', border: `1.5px solid ${INK}`, cursor: "pointer", borderRadius: '8px', padding: '6px', display: 'flex', color: INK}} 
                onClick={onClose}
              >
                  <X size={18} color={INK} />
              </button>
            </div>

            {/* Magic Autofill Section */}
            {!formData.id && (
                <div style={{background: `${HL_YELLOW}40`, borderRadius: '12px', padding: '16px', border: `1.5px solid ${INK}`, marginBottom: '24px', boxSizing: 'border-box', boxShadow: `3px 3px 0 ${INK}`}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px'}}>
                        <Sparkles size={16} color={INK} />
                        <span style={{fontSize: '0.85rem', fontWeight: 700, color: INK, fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif"}}>Magic Autofill</span>
                    </div>
                    <div style={{display: 'flex', gap: '10px'}}>
                        <input 
                                style={{...inputStyle, flex: 1}} 
                                placeholder="e.g. Math quiz next Monday at 10am" 
                                value={magicPrompt}
                                onChange={(e) => setMagicPrompt(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleMagicAutofill()}
                        />
                        <button 
                                style={{...primaryBtn, padding: '0 14px', minWidth: '44px', boxShadow: `3px 3px 0 ${HL_YELLOW}`}} 
                                onClick={handleMagicAutofill}
                                disabled={isMagicLoading}
                        >
                            {isMagicLoading ? <Loader2 size={18} style={{animation: "spin 1s linear infinite"}} /> : <Wand2 size={18} />}
                        </button>
                    </div>
                </div>
            )}

            <div style={{display: 'flex', flexDirection: 'column', gap: '18px'}}>
                {/* Title Input with Suggestions */}
                <div>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px'}}>
                        <label style={{...labelStyle, marginBottom: 0}}>Title <RequiredMark /></label>
                        {courses.length > 0 && (
                            <button 
                                onClick={() => setShowCoursePicker(!showCoursePicker)}
                                style={{fontSize: '0.72rem', color: INK, background: `${HL_YELLOW}80`, border: `1.5px solid ${INK}`, padding: '3px 8px', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', fontFamily: "'Instrument Sans', 'Inter', sans-serif"}}
                            >
                                <BookOpen size={11} /> Select Course
                            </button>
                        )}
                    </div>
                    
                    {showCoursePicker && (
                         <div style={{marginBottom: '10px', background: CARD_BG, borderRadius: '10px', padding: '6px', maxHeight: '150px', overflowY: 'auto', border: `1.5px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}`}}>
                             {courses.map((c, i) => (
                                 <div 
                                    key={i} 
                                    onClick={() => selectCourse(c)}
                                    style={{padding: '8px 10px', cursor: 'pointer', borderBottom: `1px solid rgba(26,23,48,0.08)`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '6px'}}
                                 >
                                     <span style={{fontSize: '0.88rem', fontWeight: 600, color: INK, fontFamily: "'Instrument Sans', 'Inter', sans-serif"}}>{c.title}</span>
                                     <ChevronRight size={13} color={`${INK}80`} />
                                 </div>
                             ))}
                         </div>
                    )}

                    <input 
                        list="course-suggestions"
                        style={{...inputStyle, fontSize: '1rem', fontWeight: 600}} 
                        placeholder="Event Title" 
                        maxLength={50}
                        value={formData.title || ''} 
                        onChange={handleTitleChange} 
                    />
                    <datalist id="course-suggestions">
                        {courses.map((c, i) => <option key={i} value={c.title} />)}
                    </datalist>
                </div>
                
                {/* Code & Group Grid */}
                <div style={{display: "flex", flexWrap: "wrap", gap: "14px"}}>
                    <div style={{flex: '1 1 130px'}}>
                        <label style={labelStyle}>Code</label>
                        <input style={inputStyle} maxLength={15} placeholder="CS101" value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value})} />
                    </div>
                    <div style={{flex: '1 1 130px'}}>
                        <label style={labelStyle}>Group</label>
                        <input style={inputStyle} maxLength={15} placeholder="A1" value={formData.group || ''} onChange={e => setFormData({...formData, group: e.target.value})} />
                    </div>
                </div>

                {/* Add to Grades Checkbox */}
                {!formData.id && (
                    <div style={{...sectionBox, background: `${HL_GREEN}30`}}>
                       <label style={{...labelStyle, marginBottom: 0, textTransform: 'none', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '0.88rem', color: INK, width: '100%', fontWeight: 600}}>
                         <input type="checkbox" checked={addToGrades} onChange={e => setAddToGrades(e.target.checked)} style={{width: '18px', height: '18px', accentColor: INK, cursor: 'pointer'}} /> 
                         <span>Add to Grades / Courses</span>
                       </label>
                    </div>
                )}

                {/* Type, Date & Recurring Row */}
                <div style={{...sectionBox, display: "flex", flexWrap: "wrap", gap: "12px"}}>
                    <div style={{flex: '1 1 120px'}}>
                        <label style={{...labelStyle, fontSize: '0.68rem', marginBottom: '4px'}}>Type <RequiredMark /></label>
                        <select style={{...inputStyle, padding: '10px 12px', fontSize: '0.85rem'}} value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as EventType})}>
                            {Object.keys(eventColors).map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                        </select>
                    </div>

                    <div style={{flex: '1 1 140px'}}>
                         <label style={{...labelStyle, fontSize: '0.68rem', marginBottom: '4px'}}>{formData.isRecurring ? 'Weekly Day' : 'Date'} <RequiredMark /></label>
                         {formData.isRecurring ? (
                             <div style={{position: 'relative'}}>
                                <select style={{...inputStyle, padding: '10px 12px', fontSize: '0.85rem'}} value={formData.dayOfWeek} onChange={e => setFormData({...formData, dayOfWeek: e.target.value})}>
                                    {["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                                <div style={{position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none'}}>
                                    <Calendar size={14} color={`${INK}80`} />
                                </div>
                             </div>
                         ) : (
                             <input type="date" style={{...inputStyle, padding: '10px 12px', fontSize: '0.85rem'}} value={formData.date} onChange={e => {
                                 const newDate = e.target.value;
                                 let newDay = formData.dayOfWeek;
                                 if (newDate) {
                                     const [y, m, d] = newDate.split('-').map(Number);
                                     const dateObj = new Date(y, m - 1, d);
                                     const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                                     newDay = days[dateObj.getDay()];
                                 }
                                 setFormData({...formData, date: newDate, dayOfWeek: newDay});
                             }} />
                         )}
                    </div>

                    <div style={{flex: '1 1 100%', display: 'flex', alignItems: 'center', marginTop: '2px'}}>
                       <label style={{...labelStyle, marginBottom: 0, textTransform: 'none', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem', color: INK, fontWeight: 600}}>
                         <input type="checkbox" checked={formData.isRecurring} onChange={e => setFormData({...formData, isRecurring: e.target.checked})} style={{width: '16px', height: '16px', accentColor: INK, cursor: 'pointer'}} /> 
                         <span>Repeat Weekly</span>
                       </label>
                    </div>
                </div>

                {/* Time Selection Section */}
                <div style={sectionBox}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
                        <label style={{...labelStyle, marginBottom: 0, fontSize: '0.7rem'}}>Time & Duration <RequiredMark /></label>
                        <div style={{display: 'flex', background: 'rgba(26,23,48,0.06)', borderRadius: '8px', padding: '2px', border: `1px solid rgba(26,23,48,0.12)`}}>
                            <button onClick={() => setTimeMode('time')} style={toggleBtn(timeMode === 'time')}>Custom</button>
                            <button onClick={() => setTimeMode('slot')} style={toggleBtn(timeMode === 'slot')}>Slot</button>
                        </div>
                    </div>

                    {timeMode === 'time' ? (
                        <div style={{display: "flex", flexWrap: "wrap", gap: "12px"}}>
                            <div style={{flex: '1 1 120px'}}>
                                <label style={{...labelStyle, fontSize: '0.68rem', marginBottom: '4px'}}>Starts At</label>
                                <input type="time" style={{...inputStyle, padding: '10px 12px', fontSize: '0.85rem'}} value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
                            </div>
                            <div style={{flex: '1 1 120px'}}>
                                <label style={{...labelStyle, fontSize: '0.68rem', marginBottom: '4px'}}>Duration (Min)</label>
                                <input type="number" style={{...inputStyle, padding: '10px 12px', fontSize: '0.85rem'}} value={formData.durationMinutes} onChange={e => setFormData({...formData, durationMinutes: parseInt(e.target.value) || 0})} />
                            </div>
                        </div>
                    ) : (
                        <div>
                            <select 
                                style={{...inputStyle, padding: '10px 12px', fontSize: '0.85rem'}} 
                                onChange={handleSlotChange}
                                defaultValue=""
                            >
                                <option value="" disabled>Choose a time slot...</option>
                                {periods.filter(p => !p.isBreak).map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.label} ({p.startTime} - {p.endTime})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
                
                {/* Location */}
                <div>
                    <label style={labelStyle}>Location</label>
                    <input style={inputStyle} placeholder="e.g. Room 204" value={formData.location || ''} onChange={e => setFormData({...formData, location: e.target.value})} />
                </div>

                {/* Description */}
                <div>
                    <label style={labelStyle}>Description</label>
                    <textarea style={{...inputStyle, minHeight: '90px', resize: 'none', lineHeight: '1.5'}} placeholder="Details about the event..." value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
                </div>
                
                {saveError && (
                    <div style={{color: HL_RED, fontSize: '0.85rem', textAlign: 'center', background: `${HL_RED}18`, padding: '8px 12px', borderRadius: '8px', border: `1px solid ${HL_RED}60`}}>
                        {saveError}
                    </div>
                )}
            </div>

            <button 
                style={{
                    ...primaryBtn, 
                    width: "100%", 
                    marginTop: "28px", 
                    padding: "16px", 
                    fontSize: '1rem', 
                    opacity: isSaving ? 0.7 : 1,
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    boxShadow: `5px 5px 0 ${HL_YELLOW}`,
                }} 
                disabled={isSaving}
                onClick={async () => {
                    setIsSaving(true);
                    setSaveError(null);
                    try {
                        await onSave(formData, addToGrades);
                    } catch (err: any) {
                        setSaveError(err.message || "Failed to save event. Please try again.");
                    } finally {
                        setIsSaving(false);
                    }
                }}
            >
                {isSaving ? <Loader2 size={20} style={{animation: "spin 1s linear infinite"}} /> : (formData.id ? "Update Event" : "Add to Schedule")}
            </button>
        </div>
        <style>{`
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
    </div>
  );
};

export default AddEventModal;
