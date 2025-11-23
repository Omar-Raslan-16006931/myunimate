import React, { useState } from 'react';
import { Plus, Trash2, CalendarDays, Palette, Layers, Pencil, Upload, ImageIcon, Loader2, RotateCcw } from 'lucide-react';
import { ScheduleProfile, EventColorMap, EventType, ScheduleEvent } from '../types';
import { theme, styles } from '../theme';

interface SettingsProps {
  profiles: ScheduleProfile[];
  activeProfileId: string;
  eventColors: EventColorMap;
  baseEvents: ScheduleEvent[];
  onAddProfile: (name: string) => void;
  onSwitchProfile: (id: string) => void;
  onDeleteProfile: (id: string) => void;
  onUpdateColor: (type: EventType, color: string) => void;
  onDeleteEvent: (id: string) => void;
  onEditEvent: (event: ScheduleEvent) => void;
  onAddBaseEventClick: () => void;
  onImageUpload: (file: File) => void;
  isAnalyzing: boolean;
  onResetGrades?: () => void;
}

const Settings: React.FC<SettingsProps> = ({
  profiles,
  activeProfileId,
  eventColors,
  baseEvents,
  onAddProfile,
  onSwitchProfile,
  onDeleteProfile,
  onUpdateColor,
  onDeleteEvent,
  onEditEvent,
  onAddBaseEventClick,
  onImageUpload,
  isAnalyzing,
  onResetGrades
}) => {
  const [newProfileName, setNewProfileName] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleCreateProfile = () => {
    if (newProfileName.trim()) {
      onAddProfile(newProfileName);
      setNewProfileName('');
    }
  };
  
  const to12h = (time24: string) => {
    if (!time24) return "";
    const [h, m] = time24.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
  };

  const days = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];

  return (
    <div style={styles.scrollableContent}>
          <h1 style={styles.title}>Settings</h1>
          <p style={styles.subtitle}>Personalize your app</p>
          <div style={{display: "flex", flexDirection: "column", gap: "20px", marginTop: "24px"}}>
                <div style={styles.card}>
                    <h3 style={{marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem'}}>
                        <Layers size={20} color={theme.accent} /> Profiles
                    </h3>
                    <div style={{marginBottom: "12px"}}>
                        <label style={styles.label}>Active Profile</label>
                        <div style={{display: 'flex', gap: '10px'}}>
                            <select style={{...styles.select, flex: 1}} value={activeProfileId} onChange={(e) => onSwitchProfile(e.target.value)}>
                                {profiles.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <button 
                                onClick={() => onDeleteProfile(activeProfileId)}
                                style={{
                                    backgroundColor: 'rgba(239, 68, 68, 0.15)', 
                                    color: theme.danger, 
                                    border: '1px solid rgba(239, 68, 68, 0.3)', 
                                    borderRadius: '16px', 
                                    padding: '0 14px',
                                    cursor: 'pointer'
                                }}
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>
                    </div>
                    <div style={{display: "flex", gap: "10px"}}>
                        <input style={{...styles.input, padding: "12px"}} placeholder="New Profile..." value={newProfileName} onChange={e => setNewProfileName(e.target.value)} />
                        <button style={{...styles.button, padding: "12px"}} onClick={handleCreateProfile}><Plus size={20} /></button>
                    </div>
                </div>

                <div style={styles.card}>
                    <h3 style={{marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem'}}>
                        <Palette size={20} color={theme.accent} /> Colors
                    </h3>
                    <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px"}}>
                        {Object.keys(eventColors).map(key => (
                            <div key={key} style={styles.colorPickerContainer}>
                                 <div style={{width: '32px', height: '32px', borderRadius: '8px', overflow: 'hidden', position: 'relative'}}>
                                     <input type="color" value={eventColors[key as EventType]} onChange={(e) => onUpdateColor(key as EventType, e.target.value)} style={{border: 'none', padding: 0, width: '200%', height: '200%', margin: '-50%', cursor: 'pointer'}} />
                                 </div>
                                 <span style={{fontSize: '0.8rem', textTransform: 'capitalize', color: theme.textMuted, fontWeight: 600}}>{key}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={styles.card}>
                    <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px"}}>
                        <h3 style={{marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', margin: 0}}>
                            <CalendarDays size={20} color={theme.accent} /> Base Schedule
                        </h3>
                        <button onClick={onAddBaseEventClick} style={{background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff"}}>
                             <Plus size={16} />
                        </button>
                    </div>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                        {days.map(day => {
                            const dayEvents = baseEvents.filter(e => e.dayOfWeek === day).sort((a,b) => a.startTime.localeCompare(b.startTime));
                            if (dayEvents.length === 0) return null;
                            return (
                                <div key={day}>
                                    <div style={{fontSize: '0.8rem', fontWeight: 700, color: theme.textMuted, marginBottom: '8px', textTransform: 'uppercase'}}>{day}</div>
                                    <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                                        {dayEvents.map(e => (
                                            <div key={e.id} style={{backgroundColor: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                                <div>
                                                    <div style={{fontWeight: 600, fontSize: '0.9rem'}}>{e.title}</div>
                                                    <div style={{fontSize: '0.75rem', color: theme.textMuted}}>{to12h(e.startTime)} • {e.type}</div>
                                                </div>
                                                <div style={{display: 'flex', gap: '8px'}}>
                                                    <button onClick={() => onEditEvent(e)} style={{background: 'rgba(255,255,255,0.05)', border: 'none', padding: '6px', borderRadius: '8px', cursor: 'pointer', color: theme.text}}><Pencil size={16} /></button>
                                                    <button onClick={() => onDeleteEvent(e.id)} style={{background: 'rgba(255,255,255,0.05)', border: 'none', padding: '6px', borderRadius: '8px', cursor: 'pointer', color: theme.danger}}><Trash2 size={16} /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                        {baseEvents.length === 0 && (
                            <div style={{color: theme.textMuted, textAlign: 'center', fontSize: '0.9rem', fontStyle: 'italic'}}>No recurring classes found. Import schedule below or add events manually.</div>
                        )}
                    </div>
                </div>

                <div style={styles.card}>
                    <h3 style={{marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '1.1rem'}}>
                        <ImageIcon size={20} color="#c084fc" /> AI Import
                    </h3>
                    <div style={styles.dropZone} onClick={() => fileInputRef.current?.click()}>
                        {isAnalyzing ? (
                            <div style={{color: theme.accent, display: "flex", alignItems: "center", justifyContent: "center", gap: "10px"}}>
                                <Loader2 size={20} className="spin" style={{animation: "spin 1s linear infinite"}} />
                                <span style={{fontSize: '0.95rem'}}>Analyzing Schedule...</span>
                            </div>
                        ) : (
                            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}>
                                <Upload size={20} color={theme.textMuted} />
                                <span style={{color: theme.textMuted, fontSize: '0.95rem'}}>Upload Schedule Image</span>
                            </div>
                        )}
                        <input 
                            ref={fileInputRef}
                            type="file" 
                            accept="image/*" 
                            style={{display: "none"}} 
                            onChange={e => {
                                if (e.target.files?.[0]) onImageUpload(e.target.files[0]);
                                e.target.value = ''; // Reset
                            }} 
                        />
                    </div>
                </div>

                {onResetGrades && (
                    <div style={styles.card} onClick={onResetGrades}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer'}}>
                            <div style={{background: 'rgba(239, 68, 68, 0.15)', padding: '10px', borderRadius: '50%'}}>
                                <RotateCcw size={20} color={theme.danger} />
                            </div>
                            <div>
                                <h3 style={{margin: 0, fontSize: '1rem', color: theme.text}}>Reset Grades</h3>
                                <p style={{margin: 0, fontSize: '0.8rem', color: theme.textMuted}}>Clear all grade calculator data</p>
                            </div>
                        </div>
                    </div>
                )}
          </div>
    </div>
  );
};

export default Settings;