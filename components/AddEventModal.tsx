
import React, { useState, useEffect } from 'react';
import { ScheduleEvent, EventColorMap, EventType, PeriodDefinition, CourseGrade } from '../types';
import { parseNaturalLanguageEvent } from '../services/geminiService';
import { styles, theme } from '../theme';
import { getLocalISOString } from '../constants';
import { X, Sparkles, Loader2, Wand2, BookOpen, ChevronRight, Calendar } from 'lucide-react';
import { logger } from '../utils/logger';

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
      logger.error('Error saving event:', e);
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

  const RequiredMark = () => <span style={{color: theme.danger, marginLeft: '4px'}}>*</span>;

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
        <div style={{...styles.modalContent, width: '90%', maxWidth: '450px', maxHeight: '90vh', overflowY: 'auto'}} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px"}}>
              <h2 style={{margin: 0, fontSize: "1.5rem", fontWeight: 800}}>
                  {formData.id ? 'Edit Event' : 'New Event'}
              </h2>
              <button 
                style={{background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", borderRadius: '50%', padding: '8px', display: 'flex'}} 
                onClick={onClose}
              >
                  <X size={20} color="#fff" />
              </button>
            </div>

            {/* Magic Autofill Section */}
            {!formData.id && (
                <div style={{background: `linear-gradient(135deg, ${theme.accent}22 0%, rgba(0,0,0,0) 100%)`, borderRadius: '20px', padding: '18px', border: '1px solid rgba(139, 92, 246, 0.3)', marginBottom: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', boxSizing: 'border-box'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px'}}>
                        <Sparkles size={16} color={theme.accent} />
                        <span style={{fontSize: '0.9rem', fontWeight: 700, color: theme.accent}}>Magic Autofill</span>
                    </div>
                    <div style={{display: 'flex', gap: '10px'}}>
                        <input 
                                style={{...styles.input, padding: '12px', fontSize: '0.9rem', border: '1px solid rgba(139, 92, 246, 0.2)', backgroundColor: 'rgba(0,0,0,0.3)'}} 
                                placeholder="e.g. Math quiz next Monday at 10am" 
                                value={magicPrompt}
                                onChange={(e) => setMagicPrompt(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleMagicAutofill()}
                        />
                        <button 
                                style={{...styles.button, padding: '0 14px', borderRadius: '14px', minWidth: '44px', justifyContent: 'center'}} 
                                onClick={handleMagicAutofill}
                                disabled={isMagicLoading}
                        >
                            {isMagicLoading ? <Loader2 size={20} className="spin" style={{animation: "spin 1s linear infinite"}} /> : <Wand2 size={20} />}
                        </button>
                    </div>
                </div>
            )}

            <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                {/* Title Input with Suggestions */}
                <div style={styles.formGroup}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                        <label style={{...styles.label, marginBottom: 0}}>Title <RequiredMark /></label>
                        {courses.length > 0 && (
                            <button 
                                onClick={() => setShowCoursePicker(!showCoursePicker)}
                                style={{fontSize: '0.75rem', color: theme.accent, background: 'rgba(139, 92, 246, 0.1)', border: 'none', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px'}}
                            >
                                <BookOpen size={12} /> Select Course
                            </button>
                        )}
                    </div>
                    
                    {showCoursePicker && (
                         <div style={{marginBottom: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '8px', maxHeight: '150px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)', animation: 'fadeIn 0.2s'}}>
                             {courses.map((c, i) => (
                                 <div 
                                    key={i} 
                                    onClick={() => selectCourse(c)}
                                    style={{padding: '8px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}
                                    className="hover:bg-white/5 transition-colors"
                                 >
                                     <span style={{fontSize: '0.9rem', fontWeight: 600, color: '#fff'}}>{c.title}</span>
                                     <ChevronRight size={14} color={theme.textMuted} />
                                 </div>
                             ))}
                         </div>
                    )}

                    <input 
                        list="course-suggestions"
                        style={{...styles.input, width: "100%", boxSizing: 'border-box', fontSize: '1.1rem', fontWeight: 600}} 
                        placeholder="Event Title" 
                        value={formData.title || ''} 
                        onChange={handleTitleChange} 
                    />
                    <datalist id="course-suggestions">
                        {courses.map((c, i) => <option key={i} value={c.title} />)}
                    </datalist>
                </div>
                
                {/* Code & Group Grid */}
                <div style={{display: "flex", flexWrap: "wrap", gap: "16px"}}>
                    <div style={{flex: '1 1 140px'}}>
                        <label style={styles.label}>Code</label>
                        <input style={{...styles.input, width: "100%", boxSizing: 'border-box'}} placeholder="CS101" value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value})} />
                    </div>
                    <div style={{flex: '1 1 140px'}}>
                        <label style={styles.label}>Group</label>
                        <input style={{...styles.input, width: "100%", boxSizing: 'border-box'}} placeholder="A1" value={formData.group || ''} onChange={e => setFormData({...formData, group: e.target.value})} />
                    </div>
                </div>

                {/* Add to Grades Checkbox */}
                {!formData.id && (
                    <div style={{background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', border: theme.glassBorder, boxSizing: 'border-box'}}>
                       <label style={{...styles.label, marginBottom: 0, textTransform: 'none', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '0.9rem', color: '#fff', width: '100%'}}>
                         <div style={{position: 'relative', display: 'flex', alignItems: 'center'}}>
                             <input type="checkbox" checked={addToGrades} onChange={e => setAddToGrades(e.target.checked)} style={{width: '20px', height: '20px', accentColor: theme.accent, cursor: 'pointer'}} /> 
                         </div>
                         <span>Add to Grades / Courses</span>
                       </label>
                    </div>
                )}

                {/* Type, Date & Recurring Row */}
                <div style={{display: "flex", flexWrap: "wrap", gap: "12px", background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '16px', border: theme.glassBorder}}>
                    <div style={{flex: '1 1 120px'}}>
                        <label style={{...styles.label, fontSize: '0.7rem', marginBottom: '4px'}}>Type <RequiredMark /></label>
                        <select style={{...styles.select, padding: '10px', fontSize: '0.85rem'}} value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as EventType})}>
                            {Object.keys(eventColors).map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                        </select>
                    </div>

                    <div style={{flex: '1 1 140px'}}>
                         <label style={{...styles.label, fontSize: '0.7rem', marginBottom: '4px'}}>{formData.isRecurring ? 'Weekly Day' : 'Date'} <RequiredMark /></label>
                         {formData.isRecurring ? (
                             <div style={{position: 'relative'}}>
                                <select style={{...styles.select, padding: '10px', fontSize: '0.85rem'}} value={formData.dayOfWeek} onChange={e => setFormData({...formData, dayOfWeek: e.target.value})}>
                                    {["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                                <div style={{position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none'}}>
                                    <Calendar size={14} color={theme.textMuted} />
                                </div>
                             </div>
                         ) : (
                             <input type="date" style={{...styles.input, width: "100%", boxSizing: 'border-box', padding: '10px', fontSize: '0.85rem'}} value={formData.date} onChange={e => {
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

                    <div style={{flex: '1 1 100%', display: 'flex', alignItems: 'center', marginTop: '4px'}}>
                       <label style={{...styles.label, marginBottom: 0, textTransform: 'none', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: '#fff'}}>
                         <input type="checkbox" checked={formData.isRecurring} onChange={e => setFormData({...formData, isRecurring: e.target.checked})} style={{width: '16px', height: '16px', accentColor: theme.accent, cursor: 'pointer'}} /> 
                         <span>Repeat Weekly</span>
                       </label>
                    </div>
                </div>

                {/* Time Selection Section */}
                <div style={{background: 'rgba(255,255,255,0.02)', borderRadius: '16px', padding: '12px', border: theme.glassBorder, boxSizing: 'border-box'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
                        <label style={{...styles.label, marginBottom: 0, color: '#fff', fontSize: '0.75rem'}}>Time & Duration <RequiredMark /></label>
                        <div style={{display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '2px'}}>
                            <button 
                                onClick={() => setTimeMode('time')} 
                                style={{
                                    padding: '4px 8px', 
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: timeMode === 'time' ? theme.accent : 'transparent', 
                                    color: timeMode === 'time' ? '#fff' : theme.textMuted,
                                    fontWeight: 600,
                                    fontSize: '0.7rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                }}
                            >
                                Custom
                            </button>
                            <button 
                                onClick={() => setTimeMode('slot')} 
                                style={{
                                    padding: '4px 8px', 
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: timeMode === 'slot' ? theme.accent : 'transparent', 
                                    color: timeMode === 'slot' ? '#fff' : theme.textMuted,
                                    fontWeight: 600,
                                    fontSize: '0.7rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                }}
                            >
                                Slot
                            </button>
                        </div>
                    </div>

                    {timeMode === 'time' ? (
                        <div style={{display: "flex", flexWrap: "wrap", gap: "12px", animation: "fadeIn 0.2s"}}>
                            <div style={{flex: '1 1 120px'}}>
                                <label style={{...styles.label, fontSize: '0.7rem', marginBottom: '4px'}}>Starts At</label>
                                <input type="time" style={{...styles.input, width: "100%", boxSizing: 'border-box', padding: '10px', fontSize: '0.85rem'}} value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
                            </div>
                            <div style={{flex: '1 1 120px'}}>
                                <label style={{...styles.label, fontSize: '0.7rem', marginBottom: '4px'}}>Duration (Min)</label>
                                <input type="number" style={{...styles.input, width: "100%", boxSizing: 'border-box', padding: '10px', fontSize: '0.85rem'}} value={formData.durationMinutes} onChange={e => setFormData({...formData, durationMinutes: parseInt(e.target.value) || 0})} />
                            </div>
                        </div>
                    ) : (
                        <div style={{animation: "fadeIn 0.2s"}}>
                            <select 
                                style={{...styles.select, padding: '10px', fontSize: '0.85rem'}} 
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
                    <label style={styles.label}>Location</label>
                    <input style={{...styles.input, width: "100%", boxSizing: 'border-box'}} placeholder="e.g. Room 204" value={formData.location || ''} onChange={e => setFormData({...formData, location: e.target.value})} />
                </div>

                {/* Description */}
                <div>
                    <label style={styles.label}>Description</label>
                    <textarea style={{...styles.input, width: "100%", boxSizing: 'border-box', minHeight: '100px', resize: 'none', lineHeight: '1.5'}} placeholder="Details about the event..." value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
                </div>
                
                {saveError && (
                    <div style={{color: theme.danger, fontSize: '0.85rem', marginTop: '8px', textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', padding: '8px', borderRadius: '8px'}}>
                        {saveError}
                    </div>
                )}
            </div>

            <button 
                style={{
                    ...styles.button, 
                    width: "100%", 
                    justifyContent: "center", 
                    marginTop: "32px", 
                    padding: "18px", 
                    fontSize: '1.1rem', 
                    boxShadow: '0 8px 25px rgba(139, 92, 246, 0.4)',
                    opacity: isSaving ? 0.7 : 1,
                    cursor: isSaving ? 'not-allowed' : 'pointer'
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
                {isSaving ? <Loader2 size={20} className="spin" style={{animation: "spin 1s linear infinite"}} /> : (formData.id ? "Update Event" : "Add to Schedule")}
            </button>
        </div>
        <style>{`
            @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
    </div>
  );
};

export default AddEventModal;
