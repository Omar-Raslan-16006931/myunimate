
import React, { useState } from 'react';
import { Plus, Trash2, CalendarDays, Palette, Layers, Pencil, Upload, ImageIcon, Loader2, LogOut, ChevronDown, ChevronUp, Columns, AlertTriangle } from 'lucide-react';
import { ScheduleProfile, EventColorMap, EventType, ScheduleEvent, PeriodDefinition } from '../types';
import { theme, styles } from '../theme';
import ScheduleSettings from './ScheduleSettings';

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
  onResetApp: () => void;
  onSignOut: () => void;
  periods: PeriodDefinition[];
  setPeriods: (periods: PeriodDefinition[]) => void;
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
  onResetApp,
  onSignOut,
  periods,
  setPeriods
}) => {
  const [newProfileName, setNewProfileName] = useState('');
  const [isScheduleSettingsExpanded, setIsScheduleSettingsExpanded] = useState(false);
  const [isProfilesExpanded, setIsProfilesExpanded] = useState(false);
  const [isColorsExpanded, setIsColorsExpanded] = useState(false);
  const [isBaseScheduleExpanded, setIsBaseScheduleExpanded] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
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

  const days = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  return (
    <div style={styles.scrollableContent}>
          <h1 style={styles.title}>Settings</h1>
          <p style={styles.subtitle}>Personalize your app</p>
          <div style={{display: "flex", flexDirection: "column", gap: "20px", marginTop: "24px"}}>
                
                {/* Profiles Accordion */}
                <div style={styles.card}>
                    <div 
                        onClick={() => setIsProfilesExpanded(!isProfilesExpanded)}
                        style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '4px 0'}}
                    >
                         <h3 style={{marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.1rem', margin: 0}}>
                            <div style={{background: 'rgba(139, 92, 246, 0.15)', padding: '8px', borderRadius: '50%', color: theme.accent, display: 'flex', alignItems: 'center', justifyItems: 'center'}}>
                                <Layers size={20} />
                            </div>
                            <span>Profiles</span>
                        </h3>
                        {isProfilesExpanded ? <ChevronUp size={20} color={theme.textMuted} /> : <ChevronDown size={20} color={theme.textMuted} />}
                    </div>

                    {isProfilesExpanded && (
                        <div style={{marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', animation: 'fadeIn 0.2s'}}>
                            <div style={{marginBottom: "16px"}}>
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
                    )}
                </div>

                {/* Grid Structure Accordion */}
                <div style={styles.card}>
                    <div 
                        onClick={() => setIsScheduleSettingsExpanded(!isScheduleSettingsExpanded)}
                        style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '4px 0'}}
                    >
                        <h3 style={{marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.1rem', margin: 0}}>
                            <div style={{background: 'rgba(139, 92, 246, 0.15)', padding: '8px', borderRadius: '50%', color: theme.accent, display: 'flex', alignItems: 'center', justifyItems: 'center'}}>
                                <Columns size={20} />
                            </div>
                            <span>Grid Structure</span>
                        </h3>
                        {isScheduleSettingsExpanded ? <ChevronUp size={20} color={theme.textMuted} /> : <ChevronDown size={20} color={theme.textMuted} />}
                    </div>
                    
                    {isScheduleSettingsExpanded && (
                        <div style={{marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', animation: 'fadeIn 0.2s'}}>
                             <ScheduleSettings periods={periods} setPeriods={setPeriods} />
                        </div>
                    )}
                </div>

                {/* Colors Accordion */}
                <div style={styles.card}>
                    <div 
                        onClick={() => setIsColorsExpanded(!isColorsExpanded)}
                        style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '4px 0'}}
                    >
                        <h3 style={{marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.1rem', margin: 0}}>
                            <div style={{background: 'rgba(139, 92, 246, 0.15)', padding: '8px', borderRadius: '50%', color: theme.accent, display: 'flex', alignItems: 'center', justifyItems: 'center'}}>
                                <Palette size={20} />
                            </div>
                            <span>Colors</span>
                        </h3>
                        {isColorsExpanded ? <ChevronUp size={20} color={theme.textMuted} /> : <ChevronDown size={20} color={theme.textMuted} />}
                    </div>

                    {isColorsExpanded && (
                        <div style={{marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', animation: 'fadeIn 0.2s'}}>
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
                    )}
                </div>

                {/* Base Schedule Accordion */}
                <div style={styles.card}>
                    <div 
                        onClick={() => setIsBaseScheduleExpanded(!isBaseScheduleExpanded)}
                        style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '4px 0'}}
                    >
                        <h3 style={{marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.1rem', margin: 0}}>
                            <div style={{background: 'rgba(139, 92, 246, 0.15)', padding: '8px', borderRadius: '50%', color: theme.accent, display: 'flex', alignItems: 'center', justifyItems: 'center'}}>
                                <CalendarDays size={20} />
                            </div>
                            <span>Base Schedule</span>
                        </h3>
                        {isBaseScheduleExpanded ? <ChevronUp size={20} color={theme.textMuted} /> : <ChevronDown size={20} color={theme.textMuted} />}
                    </div>

                    {isBaseScheduleExpanded && (
                        <div style={{marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', animation: 'fadeIn 0.2s'}}>
                            <div style={{display: 'flex', justifyContent: 'flex-end', marginBottom: '16px'}}>
                                <button onClick={onAddBaseEventClick} style={{...styles.secondaryButton, padding: '8px 16px', fontSize: '0.8rem'}}>
                                    <Plus size={16} /> Add Class
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
                    )}
                </div>

                <div style={styles.card}>
                    <h3 style={{marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', fontSize: '1.1rem'}}>
                        <div style={{background: 'rgba(192, 132, 252, 0.15)', padding: '8px', borderRadius: '50%', color: '#c084fc', display: 'flex', alignItems: 'center', justifyItems: 'center'}}>
                            <ImageIcon size={20} />
                        </div>
                        <span>AI Import</span>
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

                <div 
                    style={{
                        ...styles.card, 
                        cursor: 'pointer',
                        border: `1px solid ${theme.danger}`,
                        background: 'rgba(239, 68, 68, 0.1)'
                    }} 
                    onClick={() => setShowResetConfirm(true)}
                >
                    <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                        <div style={{background: 'rgba(239, 68, 68, 0.2)', padding: '10px', borderRadius: '50%'}}>
                            <AlertTriangle size={20} color={theme.danger} />
                        </div>
                        <div>
                            <h3 style={{margin: 0, fontSize: '1rem', color: theme.danger, fontWeight: 800}}>Factory Reset</h3>
                            <p style={{margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)'}}>Wipe all data & restore defaults</p>
                        </div>
                    </div>
                </div>

                <div 
                    style={{
                        ...styles.card, 
                        cursor: 'pointer',
                        border: `1px solid ${theme.danger}`,
                        background: 'rgba(239, 68, 68, 0.1)'
                    }} 
                    onClick={onSignOut}
                >
                    <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                        <div style={{background: 'rgba(239, 68, 68, 0.2)', padding: '10px', borderRadius: '50%'}}>
                            <LogOut size={20} color={theme.danger} />
                        </div>
                        <div>
                            <h3 style={{margin: 0, fontSize: '1rem', color: theme.danger, fontWeight: 800}}>Log Out</h3>
                            <p style={{margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)'}}>Sign out of your account</p>
                        </div>
                    </div>
                </div>
          </div>
          
          {/* Reset Confirmation Modal */}
          {showResetConfirm && (
             <div style={styles.modalOverlay}>
                 <div style={{...styles.modalContent, maxWidth: '320px', padding: '0', overflow: 'hidden'}} onClick={e => e.stopPropagation()}>
                     <div style={{padding: '24px', textAlign: 'center'}}>
                         <div style={{width: '60px', height: '60px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'}}>
                             <AlertTriangle size={32} color={theme.danger} />
                         </div>
                         <h3 style={{margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 800}}>Factory Reset?</h3>
                         <p style={{margin: 0, fontSize: '0.9rem', color: theme.textMuted, lineHeight: '1.5'}}>
                             This will wipe <b>ALL</b> your data including schedules, grades, and gym history. This cannot be undone.
                         </p>
                     </div>
                     <div style={{display: 'flex', borderTop: '1px solid rgba(255,255,255,0.1)'}}>
                         <button 
                             onClick={() => setShowResetConfirm(false)}
                             style={{flex: 1, padding: '16px', background: 'transparent', border: 'none', color: theme.text, fontSize: '1rem', fontWeight: 600, cursor: 'pointer', borderRight: '1px solid rgba(255,255,255,0.1)'}}
                         >
                             Cancel
                         </button>
                         <button 
                             onClick={() => { setShowResetConfirm(false); onResetApp(); }}
                             style={{flex: 1, padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: theme.danger, fontSize: '1rem', fontWeight: 800, cursor: 'pointer'}}
                         >
                             Reset App
                         </button>
                     </div>
                 </div>
             </div>
          )}

          <style>{`
            @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
          `}</style>
    </div>
  );
};

export default Settings;
