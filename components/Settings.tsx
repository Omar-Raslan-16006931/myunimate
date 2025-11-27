
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, CalendarDays, Palette, Layers, Pencil, Upload, ImageIcon, Loader2, LogOut, ChevronDown, ChevronUp, Columns, AlertTriangle, User, GraduationCap, Calendar, Building, Users, Moon, Sun, CreditCard, Lock, Check, X, AlertCircle } from 'lucide-react';
import { ScheduleProfile, EventColorMap, EventType, ScheduleEvent, PeriodDefinition, ThemeMode } from '../types';
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
  accountInfo?: { 
      email: string, 
      username: string, 
      id: string, 
      gender?: string, 
      major?: string, 
      year?: string, 
      college?: string, 
      subscription_tier?: number,
      lastUsernameChange?: string,
      genderChangeCount?: number
  } | null;
  onUpdateAccount: (data: any) => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
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
  setPeriods,
  accountInfo,
  onUpdateAccount,
  themeMode,
  setThemeMode
}) => {
  const [newProfileName, setNewProfileName] = useState('');
  const [isScheduleSettingsExpanded, setIsScheduleSettingsExpanded] = useState(false);
  const [isProfilesExpanded, setIsProfilesExpanded] = useState(false);
  const [isColorsExpanded, setIsColorsExpanded] = useState(false);
  const [isBaseScheduleExpanded, setIsBaseScheduleExpanded] = useState(false);
  const [isAccountExpanded, setIsAccountExpanded] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Edit Account State
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  
  // Username Availability State
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

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

  const getTierName = (tier: number) => {
      switch(tier) {
          case 0: return "Free Tier";
          case 1: return "Pro Tier";
          default: return "Free Tier";
      }
  };

  const startEditingAccount = (e: React.MouseEvent) => {
      e.stopPropagation();
      setEditForm({ ...accountInfo });
      setIsEditingAccount(true);
      setIsAccountExpanded(true); // Force expand
      setUsernameAvailable(null);
  };

  const cancelEditingAccount = () => {
      setIsEditingAccount(false);
      setEditForm({});
      setUsernameAvailable(null);
      setIsCheckingUsername(false);
  };

  const saveEditingAccount = () => {
      onUpdateAccount(editForm);
      setIsEditingAccount(false);
      setUsernameAvailable(null);
  };

  // Real-time Username Check
  useEffect(() => {
    if (!isEditingAccount || !editForm.username) return;

    // If username hasn't changed from original, clear check status
    if (editForm.username === accountInfo?.username) {
        setUsernameAvailable(null);
        setIsCheckingUsername(false);
        return;
    }

    // Basic validation length check
    if (editForm.username.length < 4) {
        setUsernameAvailable(null); // Just invalid length, not taken check
        return;
    }

    setIsCheckingUsername(true);
    const timer = setTimeout(async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('username')
                .ilike('username', editForm.username.trim())
                .neq('id', accountInfo?.id || '') // Ensure we don't count ourselves if logic gets weird
                .maybeSingle();
            
            if (data) {
                setUsernameAvailable(false);
            } else {
                setUsernameAvailable(true);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsCheckingUsername(false);
        }
    }, 500);

    return () => clearTimeout(timer);
  }, [editForm.username, isEditingAccount, accountInfo]);

  // Constraint Logic
  const canEditUsername = !accountInfo?.lastUsernameChange || (new Date().getTime() - new Date(accountInfo.lastUsernameChange).getTime()) > 14 * 24 * 60 * 60 * 1000;
  
  const nextUsernameEditDate = accountInfo?.lastUsernameChange 
        ? new Date(new Date(accountInfo.lastUsernameChange).getTime() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString() 
        : null;

  // Gender Constraint: 1 change allowed (starts at 0 count)
  const genderChangesLeft = 1 - (accountInfo?.genderChangeCount || 0);
  const canEditGender = genderChangesLeft > 0;

  const days = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  
  const isSaveDisabled = isCheckingUsername || (usernameAvailable === false && editForm.username !== accountInfo?.username) || (editForm.username && editForm.username.length < 4);

  return (
    <div style={styles.scrollableContent}>
          <h1 style={styles.title}>Settings</h1>
          <p style={styles.subtitle}>Personalize your app</p>
          <div style={{display: "flex", flexDirection: "column", gap: "20px", marginTop: "24px"}}>
                
                {/* Account Info Accordion */}
                {accountInfo && (
                  <div style={styles.card}>
                      <div 
                        onClick={() => setIsAccountExpanded(!isAccountExpanded)}
                        style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '4px 0'}}
                      >
                          <h3 style={{marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.1rem', margin: 0}}>
                              <div style={{background: 'rgba(59, 130, 246, 0.15)', padding: '8px', borderRadius: '50%', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyItems: 'center'}}>
                                  <User size={20} />
                              </div>
                              <span>Account Info</span>
                          </h3>
                          <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                              {!isEditingAccount && (
                                  <button 
                                    onClick={startEditingAccount}
                                    style={{background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '0.75rem', fontWeight: 600, color: theme.text, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'}}
                                  >
                                      <Pencil size={12} /> Edit
                                  </button>
                              )}
                              {isAccountExpanded ? <ChevronUp size={20} color={theme.textMuted} /> : <ChevronDown size={20} color={theme.textMuted} />}
                          </div>
                      </div>

                      {isAccountExpanded && (
                          <div style={{marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', animation: 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)', display: 'flex', flexDirection: 'column', gap: '12px'}}>
                              
                              {/* Edit Mode: Action Buttons */}
                              {isEditingAccount && (
                                  <div style={{display: 'flex', gap: '8px', marginBottom: '8px'}}>
                                      <button 
                                        onClick={saveEditingAccount} 
                                        disabled={isSaveDisabled}
                                        style={{
                                            ...styles.button, 
                                            flex: 1, 
                                            justifyContent: 'center', 
                                            fontSize: '0.85rem',
                                            opacity: isSaveDisabled ? 0.5 : 1,
                                            cursor: isSaveDisabled ? 'not-allowed' : 'pointer'
                                        }}
                                      >
                                          <Check size={16} /> Save Changes
                                      </button>
                                      <button onClick={cancelEditingAccount} style={{...styles.secondaryButton, flex: 1, justifyContent: 'center', fontSize: '0.85rem'}}>
                                          <X size={16} /> Cancel
                                      </button>
                                  </div>
                              )}

                              <div style={{backgroundColor: 'var(--input-bg)', padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-border)'}}>
                                  <div style={styles.label}>Username</div>
                                  {isEditingAccount ? (
                                      <div>
                                          <div style={{position: 'relative'}}>
                                              <input 
                                                value={editForm.username}
                                                onChange={e => setEditForm({...editForm, username: e.target.value})}
                                                disabled={!canEditUsername}
                                                style={{...styles.input, width: '100%', boxSizing: 'border-box', opacity: canEditUsername ? 1 : 0.5, paddingRight: canEditUsername ? '36px' : '40px'}}
                                              />
                                              
                                              {/* Status Icons for Username */}
                                              <div style={{position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center'}}>
                                                  {isCheckingUsername ? (
                                                      <Loader2 size={16} className="animate-spin text-white/50" />
                                                  ) : !canEditUsername ? (
                                                      <Lock size={16} style={{color: theme.textMuted}} />
                                                  ) : editForm.username !== accountInfo?.username && editForm.username.length >= 4 ? (
                                                      usernameAvailable === true ? (
                                                          <Check size={16} className="text-emerald-500" />
                                                      ) : usernameAvailable === false ? (
                                                          <AlertCircle size={16} className="text-red-500" />
                                                      ) : null
                                                  ) : null}
                                              </div>
                                          </div>
                                          
                                          {/* Feedback Messages */}
                                          {!canEditUsername && (
                                              <div style={{fontSize: '0.7rem', color: theme.textMuted, marginTop: '4px', fontStyle: 'italic'}}>
                                                  Next change available: {nextUsernameEditDate}
                                              </div>
                                          )}
                                          {canEditUsername && usernameAvailable === false && !isCheckingUsername && editForm.username.length >= 4 && (
                                              <div style={{fontSize: '0.7rem', color: theme.danger, marginTop: '4px', fontWeight: 600}}>
                                                  Username already taken
                                              </div>
                                          )}
                                          {canEditUsername && editForm.username.length > 0 && editForm.username.length < 4 && (
                                              <div style={{fontSize: '0.7rem', color: theme.danger, marginTop: '4px', fontWeight: 600}}>
                                                  Must be at least 4 characters
                                              </div>
                                          )}
                                      </div>
                                  ) : (
                                      <div style={{color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.9rem'}}>{accountInfo.username || 'N/A'}</div>
                                  )}
                              </div>

                              <div style={{backgroundColor: 'var(--input-bg)', padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-border)'}}>
                                  <div style={styles.label}>Email <Lock size={10} style={{display: 'inline', marginLeft: '4px', opacity: 0.5}}/></div>
                                  <div style={{color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.9rem', opacity: isEditingAccount ? 0.7 : 1}}>{accountInfo.email}</div>
                              </div>

                              {/* Subscription Tier */}
                              <div style={{backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)'}}>
                                  <div style={{...styles.label, display: 'flex', alignItems: 'center', gap: '4px', color: '#34d399'}}><CreditCard size={12}/> Subscription</div>
                                  <div style={{color: '#fff', fontWeight: 800, fontSize: '0.9rem'}}>{getTierName(accountInfo.subscription_tier || 0)}</div>
                              </div>
                              
                              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                                  <div style={{backgroundColor: 'var(--input-bg)', padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-border)'}}>
                                      <div style={{...styles.label, display: 'flex', alignItems: 'center', gap: '4px'}}><GraduationCap size={12}/> Major</div>
                                      {isEditingAccount ? (
                                          <input 
                                            value={editForm.major || ''}
                                            onChange={e => setEditForm({...editForm, major: e.target.value})}
                                            style={{...styles.input, width: '100%', boxSizing: 'border-box', padding: '8px', fontSize: '0.85rem'}}
                                            placeholder="Major"
                                          />
                                      ) : (
                                          <div style={{color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.85rem'}}>{accountInfo.major || 'Not set'}</div>
                                      )}
                                  </div>
                                  
                                  <div style={{backgroundColor: 'var(--input-bg)', padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-border)'}}>
                                      <div style={{...styles.label, display: 'flex', alignItems: 'center', gap: '4px'}}><Calendar size={12}/> Year</div>
                                      {isEditingAccount ? (
                                          <select
                                            value={editForm.year || ''}
                                            onChange={(e) => setEditForm({...editForm, year: e.target.value})}
                                            style={{...styles.select, padding: '8px', fontSize: '0.85rem'}}
                                          >
                                            <option value="">Select...</option>
                                            <option value="1">Year 1</option>
                                            <option value="2">Year 2</option>
                                            <option value="3">Year 3</option>
                                            <option value="4">Year 4</option>
                                            <option value="5">Year 5+</option>
                                          </select>
                                      ) : (
                                          <div style={{color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.85rem', textTransform: 'capitalize'}}>{accountInfo.year ? `Year ${accountInfo.year}` : 'Not set'}</div>
                                      )}
                                  </div>
                              </div>
                              
                              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                                  <div style={{backgroundColor: 'var(--input-bg)', padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-border)'}}>
                                      <div style={{...styles.label, display: 'flex', alignItems: 'center', gap: '4px'}}><Building size={12}/> College</div>
                                      {isEditingAccount ? (
                                          <input 
                                            value={editForm.college || ''}
                                            onChange={e => setEditForm({...editForm, college: e.target.value})}
                                            style={{...styles.input, width: '100%', boxSizing: 'border-box', padding: '8px', fontSize: '0.85rem'}}
                                            placeholder="College"
                                          />
                                      ) : (
                                          <div style={{color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.85rem'}}>{accountInfo.college || 'Not set'}</div>
                                      )}
                                  </div>
                                  
                                  <div style={{backgroundColor: 'var(--input-bg)', padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-border)'}}>
                                      <div style={{...styles.label, display: 'flex', alignItems: 'center', gap: '4px'}}><Users size={12}/> Gender</div>
                                      {isEditingAccount ? (
                                          <div>
                                              <select
                                                value={editForm.gender || ''}
                                                onChange={(e) => setEditForm({...editForm, gender: e.target.value})}
                                                disabled={!canEditGender}
                                                style={{...styles.select, padding: '8px', fontSize: '0.85rem', opacity: canEditGender ? 1 : 0.5}}
                                              >
                                                <option value="">Select...</option>
                                                <option value="male">Male</option>
                                                <option value="female">Female</option>
                                                <option value="other">Other</option>
                                              </select>
                                              <div style={{fontSize: '0.7rem', color: canEditGender ? theme.textMuted : theme.danger, marginTop: '4px', fontStyle: 'italic'}}>
                                                  {genderChangesLeft} change{genderChangesLeft !== 1 ? 's' : ''} remaining
                                              </div>
                                          </div>
                                      ) : (
                                          <div style={{color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.85rem', textTransform: 'capitalize'}}>{accountInfo.gender || 'Not set'}</div>
                                      )}
                                  </div>
                              </div>

                              <div style={{backgroundColor: 'var(--input-bg)', padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-border)'}}>
                                  <div style={styles.label}>User ID</div>
                                  <div style={{color: theme.textMuted, fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all'}}>{accountInfo.id}</div>
                              </div>
                          </div>
                      )}
                  </div>
                )}

                {/* Appearance Card */}
                <div style={styles.card}>
                     <h3 style={{marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', fontSize: '1.1rem'}}>
                          <div style={{background: 'rgba(255, 255, 255, 0.1)', padding: '8px', borderRadius: '50%', color: theme.text, display: 'flex', alignItems: 'center', justifyItems: 'center'}}>
                              {themeMode === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                          </div>
                          <span>Appearance</span>
                      </h3>
                      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                          <span style={{fontSize: '0.9rem', color: theme.textMuted}}>App Theme</span>
                          <div style={{display: 'flex', gap: '4px', background: 'var(--input-bg)', padding: '4px', borderRadius: '12px', border: '1px solid var(--glass-border)'}}>
                              <button 
                                onClick={() => setThemeMode('light')}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: themeMode === 'light' ? theme.accent : 'transparent',
                                    color: themeMode === 'light' ? '#fff' : theme.textMuted,
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '4px'
                                }}
                              >
                                  <Sun size={14} /> Light
                              </button>
                              <button 
                                onClick={() => setThemeMode('dark')}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: themeMode === 'dark' ? theme.accent : 'transparent',
                                    color: themeMode === 'dark' ? '#fff' : theme.textMuted,
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '4px'
                                }}
                              >
                                  <Moon size={14} /> Dark
                              </button>
                          </div>
                      </div>
                </div>

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
                        <div style={{marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', animation: 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'}}>
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
                        <div style={{marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', animation: 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'}}>
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
                        <div style={{marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', animation: 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'}}>
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
                        <div style={{marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', animation: 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'}}>
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
                                                    <div key={e.id} style={{backgroundColor: 'var(--input-bg)', padding: '10px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                                        <div>
                                                            <div style={{fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)'}}>{e.title}</div>
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
                            <p style={{margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)'}}>Wipe all data & restore defaults</p>
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
                            <p style={{margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)'}}>Sign out of your account</p>
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
