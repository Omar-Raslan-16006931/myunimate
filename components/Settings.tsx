
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, CalendarDays, Palette, Layers, Pencil, Upload, ImageIcon, Loader2, LogOut, ChevronDown, ChevronUp, Columns, AlertTriangle, User, GraduationCap, Calendar, Building, Users, Moon, Sun, CreditCard, Lock, Check, X, AlertCircle, Ticket, Copy, Shield, Search, Zap, Ban, RotateCcw, Activity, BarChart3, Coins, PieChart as PieIcon, Megaphone, Eye, Mail, MessageSquare, Bug, Lightbulb } from 'lucide-react';
import { ScheduleProfile, EventColorMap, EventType, ScheduleEvent, PeriodDefinition, ThemeMode, ReferralCode, FeedbackItem } from '../types';
import { theme, styles } from '../theme';
import ScheduleSettings from './ScheduleSettings';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

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
      genderChangeCount?: number,
      is_admin?: boolean,
      is_banned?: boolean
  } | null;
  onUpdateAccount: (data: any) => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  onImpersonate?: (userId: string) => void;
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
  setThemeMode,
  onImpersonate
}) => {
  const [newProfileName, setNewProfileName] = useState('');
  const [isScheduleSettingsExpanded, setIsScheduleSettingsExpanded] = useState(false);
  const [isProfilesExpanded, setIsProfilesExpanded] = useState(false);
  const [isColorsExpanded, setIsColorsExpanded] = useState(false);
  const [isBaseScheduleExpanded, setIsBaseScheduleExpanded] = useState(false);
  const [isAccountExpanded, setIsAccountExpanded] = useState(false);
  const [isReferralExpanded, setIsReferralExpanded] = useState(false);
  const [isUserMgmtExpanded, setIsUserMgmtExpanded] = useState(false);
  const [isAiMonitorExpanded, setIsAiMonitorExpanded] = useState(false);
  const [isAnnouncementsExpanded, setIsAnnouncementsExpanded] = useState(false);
  const [isFeedbackInboxExpanded, setIsFeedbackInboxExpanded] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Edit Account State
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  
  // Username Availability State
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  // Referral State
  const [referralCodes, setReferralCodes] = useState<ReferralCode[]>([]);
  const [newReferralCode, setNewReferralCode] = useState('');
  const [isReferralLoading, setIsReferralLoading] = useState(false);

  // User Management State (Admin)
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Announcements State (Admin)
  const [announcementMsg, setAnnouncementMsg] = useState('');

  // Feedback State
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [feedbackType, setFeedbackType] = useState<'bug' | 'feature' | 'general'>('general');
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);

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

  // --- FEEDBACK LOGIC ---

  const sendFeedback = async () => {
      if (!feedbackMsg.trim()) return;
      setIsSendingFeedback(true);
      try {
          await supabase.from('feedback').insert({
              message: feedbackMsg,
              type: feedbackType,
              user_id: accountInfo?.id
          });
          setShowFeedbackModal(false);
          setFeedbackMsg('');
          setFeedbackType('general');
          alert("Feedback sent! Thank you.");
      } catch (e) {
          console.error(e);
          alert("Failed to send feedback.");
      } finally {
          setIsSendingFeedback(false);
      }
  };

  const fetchFeedback = async () => {
      setIsLoadingFeedback(true);
      try {
          const { data, error } = await supabase
            .from('feedback')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (data) {
              setFeedbackList(data);
          }
      } catch (e) {
          console.error(e);
      } finally {
          setIsLoadingFeedback(false);
      }
  };

  useEffect(() => {
      if (isFeedbackInboxExpanded) fetchFeedback();
  }, [isFeedbackInboxExpanded]);

  // --- REFERRAL SYSTEM LOGIC ---

  const fetchReferralCodes = async () => {
      setIsReferralLoading(true);
      const { data, error } = await supabase.from('referral_codes').select('*').order('created_at', { ascending: false });
      if (data) {
          setReferralCodes(data);
      }
      setIsReferralLoading(false);
  };

  const createReferralCode = async () => {
      if (!newReferralCode.trim()) return;
      const code = newReferralCode.trim().toUpperCase();
      
      const { data, error } = await supabase
        .from('referral_codes')
        .insert([{ code }])
        .select()
        .single();
        
      if (data) {
          setReferralCodes([data, ...referralCodes]);
          setNewReferralCode('');
      } else if (error) {
          alert("Error creating code. It might already exist.");
      }
  };

  const toggleReferralStatus = async (id: string, currentStatus: boolean) => {
      const { error } = await supabase
        .from('referral_codes')
        .update({ is_active: !currentStatus })
        .eq('id', id);
        
      if (!error) {
          setReferralCodes(referralCodes.map(rc => rc.id === id ? { ...rc, is_active: !currentStatus } : rc));
      }
  };

  // --- USER MANAGEMENT LOGIC (ADMIN) ---

  useEffect(() => {
      const timer = setTimeout(() => {
          setDebouncedSearch(userSearch);
      }, 500);
      return () => clearTimeout(timer);
  }, [userSearch]);

  const fetchUsers = useCallback(async () => {
      if (!isUserMgmtExpanded && !isAiMonitorExpanded) return;
      
      setIsLoadingUsers(true);
      
      try {
          let query = supabase
            .from('profiles')
            .select('id, username, created_at, updated_at, college, subscription_tier, is_banned, settings')
            .order('updated_at', { ascending: false });

          if (debouncedSearch.trim()) {
             query = query.ilike('username', `%${debouncedSearch.trim()}%`);
          }

          query = query.limit(50);

          const { data, error } = await query;

          if (data) {
              const mappedUsers = data.map((u: any) => ({
                  ...u,
                  email: u.settings?.account?.email || 'No Email',
                  usage: u.settings?.usage || { total: 0, today: 0, features: {} }
              }));
              setUsers(mappedUsers);
          }
      } catch (err) {
          console.error("Failed to fetch users", err);
      } finally {
          setIsLoadingUsers(false);
      }
  }, [debouncedSearch, isUserMgmtExpanded, isAiMonitorExpanded]);

  useEffect(() => {
      fetchUsers();
  }, [fetchUsers]);

  const toggleUserBan = async (id: string, currentStatus: boolean) => {
      if (!confirm(`Are you sure you want to ${currentStatus ? 'unban' : 'BAN'} this user?`)) return;
      
      const { error } = await supabase
          .from('profiles')
          .update({ is_banned: !currentStatus })
          .eq('id', id);

      if (!error) {
          setUsers(users.map(u => u.id === id ? { ...u, is_banned: !currentStatus } : u));
      } else {
          alert("Failed to update ban status");
      }
  };

  const toggleUserPro = async (id: string, currentTier: number) => {
      const newTier = currentTier === 1 ? 0 : 1;
      const { error } = await supabase
          .from('profiles')
          .update({ subscription_tier: newTier })
          .eq('id', id);

      if (!error) {
          setUsers(users.map(u => u.id === id ? { ...u, subscription_tier: newTier } : u));
      } else {
          alert("Failed to update subscription");
      }
  };

  const deleteUser = async (id: string) => {
      if (!confirm("DANGER: This will permanently delete the user profile. This action cannot be undone. Are you absolutely sure?")) return;
      
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (!error) {
          setUsers(users.filter(u => u.id !== id));
      } else {
          alert("Failed to delete user. Check permissions.");
      }
  };

  const postAnnouncement = async () => {
      if (!announcementMsg.trim()) return;
      await supabase.from('announcements').update({ is_active: false }).eq('is_active', true);
      const { error } = await supabase.from('announcements').insert([{ 
          message: announcementMsg, 
          is_active: true
      }]);

      if (!error) {
          setAnnouncementMsg('');
          alert('Announcement posted successfully!');
      } else {
          alert('Failed to post announcement.');
      }
  };

  const clearAnnouncement = async () => {
      const { error } = await supabase.from('announcements').update({ is_active: false }).eq('is_active', true);
      if (!error) {
          alert('Announcement cleared.');
      } else {
          alert('Failed to clear announcement.');
      }
  };

  const aiStats = useMemo(() => {
      const todayStr = new Date().toISOString().split('T')[0];
      let totalRequestsToday = 0;
      let totalAllTime = 0;
      const featureCounts: Record<string, number> = {};
      const spamCandidates: any[] = [];

      users.forEach(u => {
          const usage = u.usage || {};
          const uDate = usage.date === todayStr;
          const uToday = uDate ? (usage.today || 0) : 0;
          
          totalRequestsToday += uToday;
          totalAllTime += (usage.total || 0);

          if (usage.features) {
              Object.entries(usage.features).forEach(([feat, count]) => {
                  featureCounts[feat] = (featureCounts[feat] || 0) + (count as number);
              });
          }

          if (uToday > 0) {
              spamCandidates.push({
                  username: u.username,
                  today: uToday,
                  isSpam: uToday > 50,
                  id: u.id
              });
          }
      });

      spamCandidates.sort((a, b) => b.today - a.today);
      const topSpenders = spamCandidates.slice(0, 10);

      const featureData = Object.keys(featureCounts).map(key => ({
          name: key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
          value: featureCounts[key]
      }));

      const estimatedCost = (totalRequestsToday * 0.002).toFixed(3);

      return { totalRequestsToday, totalAllTime, featureData, topSpenders, estimatedCost };
  }, [users]);

  useEffect(() => {
      if (isReferralExpanded) fetchReferralCodes();
  }, [isReferralExpanded]);

  useEffect(() => {
    if (!isEditingAccount || !editForm.username) return;

    if (editForm.username === accountInfo?.username) {
        setUsernameAvailable(null);
        setIsCheckingUsername(false);
        return;
    }

    if (editForm.username.length < 4) {
        setUsernameAvailable(null);
        return;
    }

    setIsCheckingUsername(true);
    const timer = setTimeout(async () => {
        try {
            const { data } = await supabase
                .from('profiles')
                .select('username')
                .ilike('username', editForm.username.trim())
                .neq('id', accountInfo?.id || '')
                .maybeSingle();
            
            setUsernameAvailable(!data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsCheckingUsername(false);
        }
    }, 500);

    return () => clearTimeout(timer);
  }, [editForm.username, isEditingAccount, accountInfo]);

  const canEditUsername = !accountInfo?.lastUsernameChange || (new Date().getTime() - new Date(accountInfo.lastUsernameChange).getTime()) > 14 * 24 * 60 * 60 * 1000;
  const nextChangeDate = accountInfo?.lastUsernameChange ? new Date(new Date(accountInfo.lastUsernameChange).getTime() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString() : '';
  const isSaveDisabled = isCheckingUsername || (usernameAvailable === false && editForm.username !== accountInfo?.username) || (editForm.username && editForm.username.length < 4);
  const CHART_COLORS = [theme.accent, '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];
  const days = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  // Styles override for smaller UI
  const sectionHeaderStyle: React.CSSProperties = {
      marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', margin: 0, fontWeight: 700
  };
  const sectionIconStyle = {
      padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyItems: 'center'
  };
  const compactCardStyle = {
      ...styles.card,
      padding: '14px',
      borderRadius: '18px',
      marginBottom: '12px'
  };

  return (
    <div style={styles.scrollableContent}>
          <h1 style={{...styles.title, fontSize: '1.5rem'}}>Settings</h1>
          <p style={styles.subtitle}>Personalize your app</p>
          <div style={{display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px"}}>
                
                {/* Account Info Accordion - Compacted */}
                {accountInfo && (
                  <div style={compactCardStyle}>
                      <div 
                        onClick={() => setIsAccountExpanded(!isAccountExpanded)}
                        style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '2px 0'}}
                      >
                          <h3 style={sectionHeaderStyle}>
                              <div style={{...sectionIconStyle, background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa'}}>
                                  <User size={16} />
                              </div>
                              <span>Account Info</span>
                          </h3>
                          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                              {!isEditingAccount && (
                                  <button 
                                    onClick={startEditingAccount}
                                    style={{background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '0.65rem', fontWeight: 600, color: theme.text, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px'}}
                                  >
                                      <Pencil size={10} /> Edit
                                  </button>
                              )}
                              {isAccountExpanded ? <ChevronUp size={16} color={theme.textMuted} /> : <ChevronDown size={16} color={theme.textMuted} />}
                          </div>
                      </div>

                      {isAccountExpanded && (
                          <div style={{marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.1)', animation: 'fadeIn 0.2s', display: 'flex', flexDirection: 'column', gap: '6px'}}>
                              
                              {/* Edit Mode Actions */}
                              {isEditingAccount && (
                                  <div style={{display: 'flex', gap: '6px', marginBottom: '4px'}}>
                                      <button 
                                        onClick={saveEditingAccount} 
                                        disabled={isSaveDisabled}
                                        style={{...styles.button, flex: 1, justifyContent: 'center', opacity: isSaveDisabled ? 0.5 : 1, padding: '6px', fontSize: '0.75rem', borderRadius: '8px'}}
                                      >
                                          <Check size={14} /> Save
                                      </button>
                                      <button onClick={cancelEditingAccount} style={{...styles.secondaryButton, flex: 1, justifyContent: 'center', padding: '6px', fontSize: '0.75rem', borderRadius: '8px'}}>
                                          <X size={14} /> Cancel
                                      </button>
                                  </div>
                              )}

                              {/* Username Field */}
                              <div style={{backgroundColor: 'var(--input-bg)', padding: '6px 8px', borderRadius: '8px', border: '1px solid var(--glass-border)', display: 'flex', gap: '8px', alignItems: 'center'}}>
                                  <div style={{background: 'rgba(255,255,255,0.05)', padding: '5px', borderRadius: '6px', height: 'fit-content', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                      <User size={12} color={theme.textMuted} />
                                  </div>
                                  <div style={{flex: 1}}>
                                      <div style={{fontSize: '0.55rem', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', marginBottom: '0px', letterSpacing: '0.5px'}}>Username</div>
                                      {isEditingAccount ? (
                                          <div style={{position: 'relative'}}>
                                              <input 
                                                value={editForm.username}
                                                onChange={e => setEditForm({...editForm, username: e.target.value})}
                                                disabled={!canEditUsername}
                                                style={{...styles.input, width: '100%', boxSizing: 'border-box', opacity: canEditUsername ? 1 : 0.5, paddingRight: '24px', padding: '4px', fontSize: '0.8rem', minHeight: 'auto', borderRadius: '6px'}}
                                              />
                                              <div style={{position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)'}}>
                                                  {isCheckingUsername ? <Loader2 size={12} className="animate-spin text-white/50" /> : null}
                                              </div>
                                          </div>
                                      ) : (
                                          <div style={{fontSize: '0.8rem', fontWeight: 600, color: '#fff', lineHeight: 1.2}}>{accountInfo.username}</div>
                                      )}
                                  </div>
                              </div>

                              {/* Email Field */}
                              <div style={{backgroundColor: 'var(--input-bg)', padding: '6px 8px', borderRadius: '8px', border: '1px solid var(--glass-border)', display: 'flex', gap: '8px', alignItems: 'center'}}>
                                  <div style={{background: 'rgba(255,255,255,0.05)', padding: '5px', borderRadius: '6px', height: 'fit-content', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                      <Mail size={12} color={theme.textMuted} />
                                  </div>
                                  <div style={{flex: 1, minWidth: 0}}>
                                      <div style={{fontSize: '0.55rem', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', marginBottom: '0px', letterSpacing: '0.5px'}}>Email</div>
                                      <div style={{fontSize: '0.8rem', fontWeight: 600, color: theme.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2}}>{accountInfo.email}</div>
                                  </div>
                              </div>

                              {/* Gender & Year Row */}
                              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px'}}>
                                  <div style={{backgroundColor: 'var(--input-bg)', padding: '6px 8px', borderRadius: '8px', border: '1px solid var(--glass-border)'}}>
                                      <div style={{display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px'}}>
                                          <Users size={10} color={theme.textMuted} />
                                          <span style={{fontSize: '0.55rem', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase'}}>Gender</span>
                                      </div>
                                      {isEditingAccount ? (
                                          <select 
                                              value={editForm.gender} 
                                              onChange={e => setEditForm({...editForm, gender: e.target.value})}
                                              style={{...styles.select, width: '100%', padding: '2px', fontSize: '0.75rem', borderRadius: '6px', minHeight: 'auto'}}
                                          >
                                              <option value="">-</option>
                                              <option value="male">Male</option>
                                              <option value="female">Female</option>
                                              <option value="other">Other</option>
                                          </select>
                                      ) : (
                                          <div style={{fontSize: '0.8rem', fontWeight: 600, color: '#fff', textTransform: 'capitalize'}}>{accountInfo.gender || 'Not Set'}</div>
                                      )}
                                  </div>

                                  <div style={{backgroundColor: 'var(--input-bg)', padding: '6px 8px', borderRadius: '8px', border: '1px solid var(--glass-border)'}}>
                                      <div style={{display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px'}}>
                                          <Calendar size={10} color={theme.textMuted} />
                                          <span style={{fontSize: '0.55rem', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase'}}>Year</span>
                                      </div>
                                      {isEditingAccount ? (
                                          <select 
                                              value={editForm.year} 
                                              onChange={e => setEditForm({...editForm, year: e.target.value})}
                                              style={{...styles.select, width: '100%', padding: '2px', fontSize: '0.75rem', borderRadius: '6px', minHeight: 'auto'}}
                                          >
                                              <option value="">-</option>
                                              {[1,2,3,4,5].map(y => <option key={y} value={y}>{y}</option>)}
                                          </select>
                                      ) : (
                                          <div style={{fontSize: '0.8rem', fontWeight: 600, color: '#fff'}}>Year {accountInfo.year || '-'}</div>
                                      )}
                                  </div>
                              </div>

                              {/* Major */}
                              <div style={{backgroundColor: 'var(--input-bg)', padding: '6px 8px', borderRadius: '8px', border: '1px solid var(--glass-border)', display: 'flex', gap: '8px', alignItems: 'center'}}>
                                  <div style={{background: 'rgba(255,255,255,0.05)', padding: '5px', borderRadius: '6px', height: 'fit-content', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                      <GraduationCap size={12} color={theme.textMuted} />
                                  </div>
                                  <div style={{flex: 1}}>
                                      <div style={{fontSize: '0.55rem', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', marginBottom: '0px', letterSpacing: '0.5px'}}>Major</div>
                                      {isEditingAccount ? (
                                          <input 
                                              value={editForm.major || ''}
                                              onChange={e => setEditForm({...editForm, major: e.target.value})}
                                              style={{...styles.input, width: '100%', boxSizing: 'border-box', padding: '4px', fontSize: '0.8rem', minHeight: 'auto', borderRadius: '6px'}}
                                              placeholder="e.g. CS"
                                          />
                                      ) : (
                                          <div style={{fontSize: '0.8rem', fontWeight: 600, color: '#fff'}}>{accountInfo.major || 'Not Set'}</div>
                                      )}
                                  </div>
                              </div>

                              {/* College */}
                              <div style={{backgroundColor: 'var(--input-bg)', padding: '6px 8px', borderRadius: '8px', border: '1px solid var(--glass-border)', display: 'flex', gap: '8px', alignItems: 'center'}}>
                                  <div style={{background: 'rgba(255,255,255,0.05)', padding: '5px', borderRadius: '6px', height: 'fit-content', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                      <Building size={12} color={theme.textMuted} />
                                  </div>
                                  <div style={{flex: 1}}>
                                      <div style={{fontSize: '0.55rem', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', marginBottom: '0px', letterSpacing: '0.5px'}}>College</div>
                                      {isEditingAccount ? (
                                          <input 
                                              value={editForm.college || ''}
                                              onChange={e => setEditForm({...editForm, college: e.target.value})}
                                              style={{...styles.input, width: '100%', boxSizing: 'border-box', padding: '4px', fontSize: '0.8rem', minHeight: 'auto', borderRadius: '6px'}}
                                              placeholder="University"
                                          />
                                      ) : (
                                          <div style={{fontSize: '0.8rem', fontWeight: 600, color: '#fff'}}>{accountInfo.college || 'Not Set'}</div>
                                      )}
                                  </div>
                              </div>

                              {/* Log Out Button */}
                              <button 
                                  onClick={onSignOut}
                                  style={{
                                      marginTop: '6px',
                                      background: 'rgba(239, 68, 68, 0.1)', 
                                      border: '1px solid rgba(239, 68, 68, 0.2)', 
                                      borderRadius: '8px', 
                                      padding: '8px', 
                                      color: theme.danger, 
                                      fontWeight: 700, 
                                      fontSize: '0.75rem',
                                      cursor: 'pointer',
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      justifyContent: 'center', 
                                      gap: '4px',
                                      width: '100%'
                                  }}
                              >
                                  <LogOut size={14} /> Log Out
                              </button>

                          </div>
                      )}
                  </div>
                )}
                
                {/* Profiles Accordion */}
                <div style={compactCardStyle}>
                    <div 
                        onClick={() => setIsProfilesExpanded(!isProfilesExpanded)}
                        style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '2px 0'}}
                    >
                         <h3 style={sectionHeaderStyle}>
                            <div style={{...sectionIconStyle, background: 'rgba(139, 92, 246, 0.15)', color: theme.accent}}>
                                <Layers size={16} />
                            </div>
                            <span>Profiles</span>
                        </h3>
                        {isProfilesExpanded ? <ChevronUp size={16} color={theme.textMuted} /> : <ChevronDown size={16} color={theme.textMuted} />}
                    </div>

                    {isProfilesExpanded && (
                        <div style={{marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', animation: 'fadeIn 0.2s'}}>
                            <div style={{marginBottom: "10px"}}>
                                <label style={{...styles.label, fontSize: '0.65rem'}}>Active Profile</label>
                                <div style={{display: 'flex', gap: '8px'}}>
                                    <select style={{...styles.select, flex: 1, padding: '8px', fontSize: '0.8rem'}} value={activeProfileId} onChange={(e) => onSwitchProfile(e.target.value)}>
                                        {profiles.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                    <button 
                                        onClick={() => onDeleteProfile(activeProfileId)}
                                        style={{
                                            backgroundColor: 'rgba(239, 68, 68, 0.15)', color: theme.danger, border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '0 10px', cursor: 'pointer'
                                        }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            <div style={{display: "flex", gap: "8px"}}>
                                <input style={{...styles.input, padding: "8px", fontSize: '0.8rem'}} placeholder="New Profile..." value={newProfileName} onChange={e => setNewProfileName(e.target.value)} />
                                <button style={{...styles.button, padding: "8px"}} onClick={handleCreateProfile}><Plus size={16} /></button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Grid Structure Accordion */}
                <div style={compactCardStyle}>
                    <div 
                        onClick={() => setIsScheduleSettingsExpanded(!isScheduleSettingsExpanded)}
                        style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '2px 0'}}
                    >
                        <h3 style={sectionHeaderStyle}>
                            <div style={{...sectionIconStyle, background: 'rgba(139, 92, 246, 0.15)', color: theme.accent}}>
                                <Columns size={16} />
                            </div>
                            <span>Grid Structure</span>
                        </h3>
                        {isScheduleSettingsExpanded ? <ChevronUp size={16} color={theme.textMuted} /> : <ChevronDown size={16} color={theme.textMuted} />}
                    </div>
                    
                    {isScheduleSettingsExpanded && (
                        <div style={{marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', animation: 'fadeIn 0.2s'}}>
                             <ScheduleSettings periods={periods} setPeriods={setPeriods} />
                        </div>
                    )}
                </div>

                {/* Colors Accordion */}
                <div style={compactCardStyle}>
                    <div 
                        onClick={() => setIsColorsExpanded(!isColorsExpanded)}
                        style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '2px 0'}}
                    >
                        <h3 style={sectionHeaderStyle}>
                            <div style={{...sectionIconStyle, background: 'rgba(139, 92, 246, 0.15)', color: theme.accent}}>
                                <Palette size={16} />
                            </div>
                            <span>Colors</span>
                        </h3>
                        {isColorsExpanded ? <ChevronUp size={16} color={theme.textMuted} /> : <ChevronDown size={16} color={theme.textMuted} />}
                    </div>

                    {isColorsExpanded && (
                        <div style={{marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', animation: 'fadeIn 0.2s'}}>
                            <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px"}}>
                                {Object.keys(eventColors).map(key => (
                                    <div key={key} style={{...styles.colorPickerContainer, padding: '6px'}}>
                                        <div style={{width: '24px', height: '24px', borderRadius: '6px', overflow: 'hidden', position: 'relative'}}>
                                            <input type="color" value={eventColors[key as EventType]} onChange={(e) => onUpdateColor(key as EventType, e.target.value)} style={{border: 'none', padding: 0, width: '200%', height: '200%', margin: '-50%', cursor: 'pointer'}} />
                                        </div>
                                        <span style={{fontSize: '0.7rem', textTransform: 'capitalize', color: theme.textMuted, fontWeight: 600}}>{key}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Base Schedule Accordion */}
                <div style={compactCardStyle}>
                    <div 
                        onClick={() => setIsBaseScheduleExpanded(!isBaseScheduleExpanded)}
                        style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '2px 0'}}
                    >
                        <h3 style={sectionHeaderStyle}>
                            <div style={{...sectionIconStyle, background: 'rgba(139, 92, 246, 0.15)', color: theme.accent}}>
                                <CalendarDays size={16} />
                            </div>
                            <span>Base Schedule</span>
                        </h3>
                        {isBaseScheduleExpanded ? <ChevronUp size={16} color={theme.textMuted} /> : <ChevronDown size={16} color={theme.textMuted} />}
                    </div>

                    {isBaseScheduleExpanded && (
                        <div style={{marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', animation: 'fadeIn 0.2s'}}>
                            <div style={{display: 'flex', justifyContent: 'flex-end', marginBottom: '12px'}}>
                                <button onClick={onAddBaseEventClick} style={{...styles.secondaryButton, padding: '6px 12px', fontSize: '0.75rem', borderRadius: '8px'}}>
                                    <Plus size={14} /> Add Class
                                </button>
                            </div>
                            <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                                {days.map(day => {
                                    const dayEvents = baseEvents.filter(e => e.dayOfWeek === day).sort((a,b) => a.startTime.localeCompare(b.startTime));
                                    if (dayEvents.length === 0) return null;
                                    return (
                                        <div key={day}>
                                            <div style={{fontSize: '0.7rem', fontWeight: 700, color: theme.textMuted, marginBottom: '6px', textTransform: 'uppercase'}}>{day}</div>
                                            <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
                                                {dayEvents.map(e => (
                                                    <div key={e.id} style={{backgroundColor: 'var(--input-bg)', padding: '8px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                                        <div>
                                                            <div style={{fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)'}}>{e.title}</div>
                                                            <div style={{fontSize: '0.65rem', color: theme.textMuted}}>{to12h(e.startTime)} • {e.type}</div>
                                                        </div>
                                                        <div style={{display: 'flex', gap: '6px'}}>
                                                            <button onClick={() => onEditEvent(e)} style={{background: 'rgba(255,255,255,0.05)', border: 'none', padding: '4px', borderRadius: '6px', cursor: 'pointer', color: theme.text}}><Pencil size={14} /></button>
                                                            <button onClick={() => onDeleteEvent(e.id)} style={{background: 'rgba(255,255,255,0.05)', border: 'none', padding: '4px', borderRadius: '6px', cursor: 'pointer', color: theme.danger}}><Trash2 size={14} /></button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <div style={compactCardStyle}>
                    <h3 style={{...sectionHeaderStyle, marginBottom: '12px'}}>
                        <div style={{...sectionIconStyle, background: 'rgba(192, 132, 252, 0.15)', color: '#c084fc'}}>
                            <ImageIcon size={16} />
                        </div>
                        <span>AI Import</span>
                    </h3>
                    <div style={{...styles.dropZone, padding: '16px', borderRadius: '12px'}} onClick={() => fileInputRef.current?.click()}>
                        {isAnalyzing ? (
                            <div style={{color: theme.accent, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"}}>
                                <Loader2 size={16} className="spin" style={{animation: "spin 1s linear infinite"}} />
                                <span style={{fontSize: '0.8rem'}}>Analyzing Schedule...</span>
                            </div>
                        ) : (
                            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
                                <Upload size={16} color={theme.textMuted} />
                                <span style={{color: theme.textMuted, fontSize: '0.8rem'}}>Upload Schedule Image</span>
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

                {/* Appearance Card - MOVED HERE */}
                <div style={compactCardStyle}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0'}}>
                        <h3 style={sectionHeaderStyle}>
                            <div style={{...sectionIconStyle, background: 'rgba(255, 255, 255, 0.1)', color: theme.text}}>
                                {themeMode === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                            </div>
                            <span>Appearance</span>
                        </h3>
                        <div style={{display: 'flex', gap: '4px', background: 'var(--input-bg)', padding: '3px', borderRadius: '8px', border: '1px solid var(--glass-border)'}}>
                            <button 
                            onClick={() => setThemeMode('light')}
                            style={{
                                padding: '4px 8px', borderRadius: '6px', border: 'none',
                                background: themeMode === 'light' ? theme.accent : 'transparent',
                                color: themeMode === 'light' ? '#fff' : theme.textMuted,
                                fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '3px'
                            }}
                            >
                                <Sun size={12} /> Light
                            </button>
                            <button 
                            onClick={() => setThemeMode('dark')}
                            style={{
                                padding: '4px 8px', borderRadius: '6px', border: 'none',
                                background: themeMode === 'dark' ? theme.accent : 'transparent',
                                color: themeMode === 'dark' ? '#fff' : theme.textMuted,
                                fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '3px'
                            }}
                            >
                                <Moon size={12} /> Dark
                            </button>
                        </div>
                    </div>
                </div>

                <div 
                    style={{...compactCardStyle, cursor: 'pointer', border: `1px solid ${theme.danger}`, background: 'rgba(239, 68, 68, 0.1)'}} 
                    onClick={() => setShowResetConfirm(true)}
                >
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                        <div style={{background: 'rgba(239, 68, 68, 0.2)', padding: '6px', borderRadius: '50%'}}>
                            <AlertTriangle size={16} color={theme.danger} />
                        </div>
                        <div>
                            <h3 style={{margin: 0, fontSize: '0.9rem', color: theme.danger, fontWeight: 800}}>Factory Reset</h3>
                            <p style={{margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)'}}>Wipe all data & restore defaults</p>
                        </div>
                    </div>
                </div>
          </div>
          
          {/* Modals omitted for brevity, keeping existing logic */}
          {showResetConfirm && (
             <div style={styles.modalOverlay}>
                 <div style={{...styles.modalContent, maxWidth: '320px', padding: '0', overflow: 'hidden'}} onClick={e => e.stopPropagation()}>
                     <div style={{padding: '24px', textAlign: 'center'}}>
                         <div style={{width: '60px', height: '60px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'}}>
                             <AlertTriangle size={32} color={theme.danger} />
                         </div>
                         <h3 style={{margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 800}}>Factory Reset?</h3>
                         <p style={{margin: 0, fontSize: '0.9rem', color: theme.textMuted, lineHeight: '1.5'}}>
                             This will wipe <b>ALL</b> your data.
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
            @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
          `}</style>
    </div>
  );
};

export default Settings;
