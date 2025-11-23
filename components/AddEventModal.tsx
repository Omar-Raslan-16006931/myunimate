import React, { useState, useEffect } from 'react';
import { X, Sparkles, Loader2, Wand2 } from 'lucide-react';
import { ScheduleEvent, EventColorMap, EventType } from '../types';
import { parseNaturalLanguageEvent } from '../services/geminiService';
import { styles, theme } from '../theme';
import { getLocalISOString } from '../constants';

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: Partial<ScheduleEvent>) => void;
  eventColors: EventColorMap;
  initialData: Partial<ScheduleEvent> | null;
}

const AddEventModal: React.FC<AddEventModalProps> = ({ isOpen, onClose, onSave, eventColors, initialData }) => {
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

  useEffect(() => {
    if (initialData) {
        setFormData({ ...formData, ...initialData });
    } else {
        // Reset defaults
        setFormData({
            isRecurring: false,
            type: "lecture",
            durationMinutes: 90,
            startTime: "08:30",
            dayOfWeek: "Saturday",
            date: getLocalISOString()
        });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleMagicAutofill = async () => {
    if (!magicPrompt.trim()) return;
    setIsMagicLoading(true);
    try {
      const result = await parseNaturalLanguageEvent(magicPrompt);
      if (result) {
        setFormData(prev => ({ ...prev, ...result }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsMagicLoading(false);
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
        <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px"}}>
              <h2 style={{margin: 0, fontSize: "1.4rem", fontWeight: 800}}>
                  {formData.id ? 'Edit Event' : 'New Event'}
              </h2>
              <button style={{background: "none", border: "none", cursor: "pointer"}} onClick={onClose}><X size={24} color="#fff" /></button>
            </div>

            {/* Magic Autofill Section */}
            {!formData.id && (
                <div style={{background: `linear-gradient(135deg, ${theme.accent}22 0%, rgba(0,0,0,0) 100%)`, borderRadius: '16px', padding: '16px', border: '1px solid rgba(139, 92, 246, 0.2)', marginBottom: '20px'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px'}}>
                    <Sparkles size={16} color={theme.accent} />
                    <span style={{fontSize: '0.85rem', fontWeight: 700, color: theme.accent}}>Magic Autofill</span>
                </div>
                <div style={{display: 'flex', gap: '8px'}}>
                    <input 
                            style={{...styles.input, padding: '10px', fontSize: '0.9rem', border: '1px solid rgba(139, 92, 246, 0.2)'}} 
                            placeholder="e.g. Math quiz next Monday at 10am" 
                            value={magicPrompt}
                            onChange={(e) => setMagicPrompt(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleMagicAutofill()}
                    />
                    <button 
                            style={{...styles.button, padding: '0 12px', borderRadius: '12px', minWidth: '40px', justifyContent: 'center'}} 
                            onClick={handleMagicAutofill}
                            disabled={isMagicLoading}
                    >
                        {isMagicLoading ? <Loader2 size={18} className="spin" style={{animation: "spin 1s linear infinite"}} /> : <Wand2 size={18} />}
                    </button>
                </div>
                </div>
            )}

            <div style={styles.formGroup}><label style={styles.label}>Title</label><input style={{...styles.input, width: "100%", boxSizing: 'border-box'}} placeholder="e.g. Calculus" value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} /></div>
            <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px"}}>
                <div style={styles.formGroup}><label style={styles.label}>Code</label><input style={{...styles.input, width: "100%", boxSizing: 'border-box'}} placeholder="e.g. CS101" value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value})} /></div>
                <div style={styles.formGroup}><label style={styles.label}>Group</label><input style={{...styles.input, width: "100%", boxSizing: 'border-box'}} placeholder="e.g. A1" value={formData.group || ''} onChange={e => setFormData({...formData, group: e.target.value})} /></div>
            </div>
            <div style={styles.formGroup}><label style={styles.label}>Location</label><input style={{...styles.input, width: "100%", boxSizing: 'border-box'}} placeholder="e.g. M1.205" value={formData.location || ''} onChange={e => setFormData({...formData, location: e.target.value})} /></div>
            <div style={styles.formGroup}><label style={styles.label}>Description</label><textarea style={{...styles.input, width: "100%", boxSizing: 'border-box', minHeight: '80px', resize: 'none'}} placeholder="Details about the event..." value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
            <div style={styles.formGroup}>
               <label style={{...styles.label, textTransform: 'none', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.9rem'}}>
                 <input type="checkbox" checked={formData.isRecurring} onChange={e => setFormData({...formData, isRecurring: e.target.checked})} style={{width: '16px', height: '16px'}} /> Repeat Weekly (Base Schedule)
               </label>
            </div>
            <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px"}}>
              <div style={styles.formGroup}><label style={styles.label}>{formData.isRecurring ? 'Day' : 'Date'}</label>
                {formData.isRecurring ? <select style={styles.select} value={formData.dayOfWeek} onChange={e => setFormData({...formData, dayOfWeek: e.target.value})}>{["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"].map(d => <option key={d} value={d}>{d}</option>)}</select> : <input type="date" style={{...styles.input, width: "100%", boxSizing: 'border-box'}} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />}
              </div>
              <div style={styles.formGroup}><label style={styles.label}>Type</label><select style={styles.select} value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as EventType})}>{Object.keys(eventColors).map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}</select></div>
            </div>
            <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px"}}>
              <div style={styles.formGroup}><label style={styles.label}>Start Time</label><input type="time" style={{...styles.input, width: "100%", boxSizing: 'border-box'}} value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} /></div>
              <div style={styles.formGroup}><label style={styles.label}>Duration (min)</label><input type="number" style={{...styles.input, width: "100%", boxSizing: 'border-box'}} value={formData.durationMinutes} onChange={e => setFormData({...formData, durationMinutes: parseInt(e.target.value) || 0})} /></div>
            </div>
            <button style={{...styles.button, width: "100%", justifyContent: "center", marginTop: "10px"}} onClick={() => onSave(formData)}>
                {formData.id ? "Update Event" : "Add to Schedule"}
            </button>
        </div>
    </div>
  );
};

export default AddEventModal;