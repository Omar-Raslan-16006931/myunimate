




// ... (imports)
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, CalendarDays, Palette, Layers, Pencil, Upload, ImageIcon, Loader2, LogOut, ChevronDown, ChevronUp, Columns, AlertTriangle, User, GraduationCap, Calendar, Building, Users, Moon, Sun, Check, X, Shield, Search, Ban, MessageSquare, Sparkles, Clock, ChevronRight, Ticket, Send, ArrowLeft, CheckCircle2, DollarSign } from 'lucide-react';
import { ScheduleProfile, EventColorMap, EventType, ScheduleEvent, PeriodDefinition, ThemeMode, ReferralCode, AppFeedback, FeedbackReply, ViewState } from '../types';
import { theme, styles } from '../theme';
import ScheduleSettings from './ScheduleSettings';
import FeedbackModal from './FeedbackModal';
import AdminInbox from './AdminInbox';

// ... (SupportHistoryModal code remains unchanged)
const SupportHistoryModal = ({ isOpen, onClose, userId }: { isOpen: boolean, onClose: () => void, userId?: string }) => {
    const [tickets, setTickets] = useState<AppFeedback[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTicket, setActiveTicket] = useState<AppFeedback | null>(null);
    const [replies, setReplies] = useState<FeedbackReply[]>([]);
    const [replyText, setReplyText] = useState('');
    const [sendingReply, setSendingReply] = useState(false);
    const replyEndRef = useRef<HTMLDivElement>(null);

    // Fetch Tickets & Subscribe to updates
    useEffect(() => {
        if (isOpen && userId) {
            setLoading(true);
            const fetchTickets = async () => {
                const { data } = await supabase.from('app_feedback')
                    .select('*')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false });
                setTickets(data || []);
                setLoading(false);
            };
            fetchTickets();

            // Subscribe to Ticket Changes (e.g. admin deletes a ticket or changes status)
            const channel = supabase.channel(`user_feedback_list_${userId}`)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'app_feedback', filter: `user_id=eq.${userId}` },
                    (payload) => {
                        if (payload.eventType === 'INSERT') {
                            setTickets(prev => [payload.new as AppFeedback, ...prev]);
                        } else if (payload.eventType === 'UPDATE') {
                            setTickets(prev => prev.map(t => t.id === payload.new.id ? { ...t, ...payload.new } : t));
                            // Also update active ticket if it's the one modified
                            setActiveTicket(prev => prev?.id === payload.new.id ? { ...prev, ...payload.new } : prev);
                        } else if (payload.eventType === 'DELETE') {
                            setTickets(prev => prev.filter(t => t.id !== payload.old.id));
                            // Close chat if active ticket was deleted
                            setActiveTicket(prev => prev?.id === payload.old.id ? null : prev);
                        }
                    }
                )
                .subscribe();

            return () => { supabase.removeChannel(channel); };
        }
    }, [isOpen, userId]);

    // Fetch replies & Subscribe to chat
    useEffect(() => {
        if (activeTicket) {
            setReplies([]);
            supabase.from('feedback_replies')
                .select('*')
                .eq('feedback_id', activeTicket.id)
                .order('created_at', { ascending: true })
                .then(({ data }) => {
                    if (data) setReplies(data);
                });
                
            const channelId = `user_chat_${activeTicket.id}`;
            const channel = supabase.channel(channelId)
            .on(
              'postgres_changes',
              { event: 'INSERT', schema: 'public', table: 'feedback_replies', filter: `feedback_id=eq.${activeTicket.id}` },
              (payload: any) => {
                setReplies(prev => [...prev, payload.new as FeedbackReply]);
              }
            )
            .subscribe();

            return () => { supabase.removeChannel(channel); };
        }
    }, [activeTicket?.id]); // Depend on ID specifically to prevent stale closures

    // Auto-scroll to bottom
    useEffect(() => {
        if (activeTicket) {
            setTimeout(() => {
                replyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    }, [replies, activeTicket]);

    const handleSendReply = async () => {
        if (!replyText.trim() || !activeTicket || !userId) return;
        setSendingReply(true);
        
        try {
            const { error: replyError } = await supabase.from('feedback_replies').insert({
                feedback_id: activeTicket.id,
                sender_id: userId,
                message: replyText.trim(),
                is_admin: false 
            });
            
            if (replyError) throw replyError;
            
            // Mark as unread for admins
            await supabase.from('app_feedback').update({ status: 'unread' }).eq('id', activeTicket.id);
            setReplyText('');
        } catch (error) {
            console.error(error);
            alert('Failed to send reply');
        } finally {
            setSendingReply(false);
        }
    };

    if (!isOpen) return null;

    // Use Portal to break out of any scroll containers or overflow:hidden parents
    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div 
                className="w-full max-w-md h-[85vh] bg-[#0f172a] rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-[#130f1c] shrink-0">
                    <div className="flex items-center gap-3">
                        {activeTicket ? (
                            <button 
                                onClick={() => setActiveTicket(null)}
                                className="p-1.5 -ml-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition"
                            >
                                <ArrowLeft size={20} />
                            </button>
                        ) : (
                            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                                <MessageSquare size={20} />
                            </div>
                        )}
                        <div>
                            <h3 className="text-lg font-bold text-white leading-none">
                                {activeTicket ? 'Support Chat' : 'Support Inbox'}
                            </h3>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
                
                {/* Content Area */}
                <div className="flex-1 overflow-hidden relative bg-[#0f172a]">
                    
                    {!activeTicket ? (
                        /* TICKET LIST VIEW */
                        <div className="absolute inset-0 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {loading ? (
                                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-indigo-500" /></div>
                            ) : tickets.length === 0 ? (
                                <div className="text-center text-white/30 py-12 text-sm italic">No support tickets found.</div>
                            ) : (
                                tickets.map(t => (
                                    <div 
                                        key={t.id} 
                                        onClick={() => setActiveTicket(t)}
                                        className="group bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-2xl p-4 cursor-pointer transition-all active:scale-[0.98]"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                                                    t.category === 'Bug' ? 'text-red-400 bg-red-400/10' : 
                                                    t.category === 'Feature Request' ? 'text-green-400 bg-green-400/10' : 
                                                    'text-blue-400 bg-blue-400/10'
                                                }`}>
                                                    {t.category}
                                                </span>
                                                <span className="text-[10px] text-white/30">{new Date(t.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <ChevronRight size={16} className="text-white/20 group-hover:text-white/60 transition-colors" />
                                        </div>
                                        <p className="text-sm text-white/90 font-medium line-clamp-2 leading-relaxed">
                                            {t.message}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        /* CHAT VIEW */
                        <div className="flex flex-col h-full">
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-[#0f172a] to-[#130f1c] custom-scrollbar">
                                {/* Original Ticket - Shown as user message */}
                                <div className="flex flex-col items-end animate-in slide-in-from-bottom-2">
                                    <div className="bg-indigo-600 text-white px-4 py-3 rounded-2xl rounded-tr-none max-w-[85%] text-sm shadow-md leading-relaxed">
                                        {activeTicket.message}
                                    </div>
                                    <span className="text-[10px] text-white/20 mt-1 mr-1">
                                        {new Date(activeTicket.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                </div>

                                {/* Thread */}
                                {replies.map(reply => {
                                    const isMe = !reply.is_admin;
                                    return (
                                        <div 
                                            key={reply.id} 
                                            className={`flex flex-col animate-in slide-in-from-bottom-2 ${isMe ? 'items-end' : 'items-start'}`}
                                        >
                                            <div className={`px-4 py-3 rounded-2xl max-w-[85%] text-sm shadow-md leading-relaxed ${
                                                isMe 
                                                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                                                    : 'bg-white/10 text-white/90 rounded-tl-none border border-white/5'
                                            }`}>
                                                {reply.message}
                                            </div>
                                            <span className={`text-[10px] text-white/20 mt-1 ${isMe ? 'mr-1' : 'ml-1'}`}>
                                                {isMe ? 'You' : 'Support'} • {new Date(reply.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                        </div>
                                    );
                                })}
                                <div ref={replyEndRef} />
                            </div>

                            {/* Input Bar */}
                            <div className="p-3 bg-[#130f1c] border-t border-white/5 shrink-0">
                                <div className="flex gap-2 items-end bg-white/5 rounded-3xl p-1 border border-white/10 focus-within:border-indigo-500/50 transition-colors">
                                    <textarea 
                                        value={replyText}
                                        onChange={e => setReplyText(e.target.value)}
                                        onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
                                        placeholder="Type a message..."
                                        className="flex-1 bg-transparent border-none text-white text-sm px-4 py-3 focus:outline-none resize-none max-h-[100px] min-h-[44px] placeholder-white/30"
                                        rows={1}
                                    />
                                    <button 
                                        onClick={handleSendReply}
                                        disabled={!replyText.trim() || sendingReply}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0 ${
                                            (!replyText.trim() || sendingReply) 
                                                ? 'bg-white/5 text-white/20' 
                                                : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-900/20'
                                        }`}
                                    >
                                        {sendingReply ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className={replyText.trim() ? 'ml-0.5' : ''} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

// ... (BanModal code remains unchanged)
const BanModal = ({ isOpen, onClose, onConfirm, username }: { isOpen: boolean, onClose: () => void, onConfirm: (duration: string | null) => void, username: string }) => {
    if (!isOpen) return null;
    return (
        <div style={styles.modalOverlay} onClick={onClose}>
            <div style={{...styles.modalContent, maxWidth: '300px', textAlign: 'center'}} onClick={e => e.stopPropagation()}>
                <div style={{margin: '0 auto 16px', width: '50px', height: '50px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.danger}}>
                    <Ban size={24} />
                </div>
                <h3 style={{fontSize: '1.2rem', fontWeight: 800, margin: '0 0 8px 0'}}>Suspend {username}?</h3>
                <p style={{fontSize: '0.85rem', color: theme.textMuted, marginBottom: '20px'}}>Select suspension duration.</p>
                
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px'}}>
                    <button onClick={() => onConfirm('1d')} style={{padding: '8px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.8rem'}}>1 Day</button>
                    <button onClick={() => onConfirm('3d')} style={{padding: '8px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.8rem'}}>3 Days</button>
                    <button onClick={() => onConfirm('1w')} style={{padding: '8px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.8rem'}}>1 Week</button>
                    <button onClick={() => onConfirm('1m')} style={{padding: '8px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.8rem'}}>1 Month</button>
                </div>
                <button onClick={() => onConfirm(null)} style={{width: '100%', padding: '10px', background: 'rgba(239, 68, 68, 0.2)', color: theme.danger, border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', fontWeight: 700, marginBottom: '8px'}}>Permanent Ban</button>
                <button onClick={onClose} style={{width: '100%', padding: '10px', background: 'transparent', color: theme.textMuted, border: 'none'}}>Cancel</button>
            </div>
        </div>
    );
};

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
  accountInfo: any;
  onUpdateAccount: (data: any) => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  onImpersonate: (userId: string) => void;
  onNavigate: (view: ViewState) => void; // Added prop
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
  onImpersonate,
  onNavigate
}) => {
  // ... (rest of the state hooks)
  const [newProfileName, setNewProfileName] = useState('');
  const [isScheduleSettingsExpanded, setIsScheduleSettingsExpanded] = useState(false);
  const [isProfilesExpanded, setIsProfilesExpanded] = useState(false);
  const [isColorsExpanded, setIsColorsExpanded] = useState(false);
  const [isBaseScheduleExpanded, setIsBaseScheduleExpanded] = useState(false);
  const [isAccountExpanded, setIsAccountExpanded] = useState(false);
  const [isUserMgmtExpanded, setIsUserMgmtExpanded] = useState(false);
  const [isFeedbackInboxExpanded, setIsFeedbackInboxExpanded] = useState(false);
  
  const [isReferralExpanded, setIsReferralExpanded] = useState(false);
  const [referralCodes, setReferralCodes] = useState<ReferralCode[]>([]);
  const [isCreatingReferral, setIsCreatingReferral] = useState(false);
  const [newReferralCode, setNewReferralCode] = useState('');
  const [newReferralTier, setNewReferralTier] = useState(0);

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [banModalUser, setBanModalUser] = useState<{id: string, username: string} | null>(null);

  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // ... (all the handler functions: handleCreateProfile, to12h, account editing logic, user mgmt, referral logic)
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
      setIsAccountExpanded(true); 
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

  useEffect(() => {
      const timer = setTimeout(() => {
          setDebouncedSearch(userSearch);
      }, 500);
      return () => clearTimeout(timer);
  }, [userSearch]);

  const fetchUsers = useCallback(async (manualSearchTerm?: string) => {
      if (!isUserMgmtExpanded) return;
      
      setIsLoadingUsers(true);
      const term = manualSearchTerm !== undefined ? manualSearchTerm : debouncedSearch;
      const cleanTerm = term.trim();
      
      try {
          let query = supabase
            .from('profiles')
            .select('id, username, created_at, updated_at, college, subscription_tier, is_banned, settings')
            .order('updated_at', { ascending: false });

          if (cleanTerm) {
             const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanTerm);
             if (isUUID) {
                 query = query.eq('id', cleanTerm);
             } else {
                 query = query.ilike('username', `%${cleanTerm}%`);
             }
             query = query.limit(50); 
          } else {
             query = query.limit(20);
          }

          const { data, error } = await query;

          if (data) {
              const mappedUsers = data.map((u: any) => ({
                  ...u,
                  email: u.settings?.account?.email || 'No Email',
                  usage: u.settings?.usage || { total: 0, today: 0, features: {} }
              }));
              setUsers(mappedUsers);
          } else if (error) {
              if (error.message?.includes("Failed to fetch")) {
                  console.warn("Failed to fetch users (offline or blocked)");
              } else {
                  console.error("Error loading users:", error);
              }
          }
      } catch (err) {
          console.error("Failed to fetch users", err);
      } finally {
          setIsLoadingUsers(false);
      }
  }, [debouncedSearch, isUserMgmtExpanded]);

  useEffect(() => {
      if (isUserMgmtExpanded) {
          fetchUsers();
      }
  }, [fetchUsers, isUserMgmtExpanded]);

  const handleBanConfirm = async (duration: string | null) => {
      if (!banModalUser) return;
      
      let bannedUntil = null;
      if (duration) {
          const now = new Date();
          if (duration === '1d') now.setDate(now.getDate() + 1);
          if (duration === '3d') now.setDate(now.getDate() + 3);
          if (duration === '1w') now.setDate(now.getDate() + 7);
          if (duration === '1m') now.setMonth(now.getMonth() + 1);
          bannedUntil = now.toISOString();
      }

      const { error } = await supabase
          .from('profiles')
          .update({ is_banned: true, banned_until: bannedUntil })
          .eq('id', banModalUser.id);

      if (!error) {
          setUsers(users.map(u => u.id === banModalUser.id ? { ...u, is_banned: true } : u));
      } else {
          alert("Failed to ban user");
      }
      setBanModalUser(null);
  };

  const unbanUser = async (id: string) => {
      if (!confirm("Unban this user?")) return;
      const { error } = await supabase
          .from('profiles')
          .update({ is_banned: false, banned_until: null })
          .eq('id', id);
      
      if (!error) {
          setUsers(users.map(u => u.id === id ? { ...u, is_banned: false } : u));
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

  const fetchReferralCodes = useCallback(async () => {
      const { data, error } = await supabase.from('referral_codes').select('*').order('created_at', { ascending: false });
      if (data) {
          setReferralCodes(data);
      } else if (error) {
          console.error("Error fetching referral codes:", error);
      }
  }, []);

  useEffect(() => {
      if (isReferralExpanded) fetchReferralCodes();
  }, [isReferralExpanded, fetchReferralCodes]);

  const createReferralCode = async () => {
      if (!newReferralCode.trim()) return;
      const code = newReferralCode.trim().toUpperCase();
      
      try {
          const { data, error } = await supabase.from('referral_codes').insert({
              code,
              is_active: true,
              usage_count: 0,
              subscription_tier: newReferralTier
          }).select().single();

          if (error) throw error;

          if (data) {
              setReferralCodes([data, ...referralCodes]);
              setIsCreatingReferral(false);
              setNewReferralCode('');
          }
      } catch (err: any) {
          console.error("Error creating code:", err);
          alert(`Failed to create code: ${err.message || 'Unknown error'}`);
      }
  };

  const toggleReferralCode = async (id: string, currentState: boolean) => {
      const { error } = await supabase.from('referral_codes').update({ is_active: !currentState }).eq('id', id);
      if (!error) {
          setReferralCodes(referralCodes.map(c => c.id === id ? { ...c, is_active: !currentState } : c));
      } else {
          console.error("Error toggling code:", error);
          alert("Failed to update code status.");
      }
  };

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
  const isSaveDisabled = isCheckingUsername || (usernameAvailable === false && editForm.username !== accountInfo?.username) || (editForm.username && editForm.username.length < 4);
  const days = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

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

  const adminCardStyle = {
      ...compactCardStyle,
      background: '#130f1c', // Solid background for admin tools
      backdropFilter: 'none'
  };

  return (
    <div style={styles.scrollableContent}>
          <h1 style={{...styles.title, fontSize: '1.5rem'}}>Settings</h1>
          <p style={styles.subtitle}>Personalize your app</p>
          <div style={{display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px"}}>
                
                {/* Account Info Accordion */}
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
                              {/* Account Fields (same as original) */}
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
                                      <User size={12} color={theme.textMuted} />
                                  </div>
                                  <div style={{flex: 1, minWidth: 0}}>
                                      <div style={{fontSize: '0.55rem', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', marginBottom: '0px', letterSpacing: '0.5px'}}>Email</div>
                                      <div style={{fontSize: '0.8rem', fontWeight: 600, color: theme.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2}}>{accountInfo.email}</div>
                                  </div>
                              </div>

                              {/* Gender & Year Grid */}
                              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px'}}>
                                  <div style={{backgroundColor: 'var(--input-bg)', padding: '6px 8px', borderRadius: '8px', border: '1px solid var(--glass-border)', display: 'flex', gap: '8px', alignItems: 'center'}}>
                                      <div style={{background: 'rgba(255,255,255,0.05)', padding: '5px', borderRadius: '6px', height: 'fit-content', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                          <Users size={12} color={theme.textMuted} />
                                      </div>
                                      <div style={{flex: 1}}>
                                          <div style={{fontSize: '0.55rem', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', marginBottom: '0px', letterSpacing: '0.5px'}}>Gender</div>
                                          {isEditingAccount ? (
                                              <select 
                                                  value={editForm.gender || ''} 
                                                  onChange={e => setEditForm({...editForm, gender: e.target.value})}
                                                  style={{...styles.input, width: '100%', padding: '2px', fontSize: '0.8rem', minHeight: 'auto', borderRadius: '4px', background: 'transparent', border: 'none'}}
                                              >
                                                  <option value="" disabled>Select</option>
                                                  <option value="male">Male</option>
                                                  <option value="female">Female</option>
                                                  <option value="other">Other</option>
                                              </select>
                                          ) : (
                                              <div style={{fontSize: '0.8rem', fontWeight: 600, color: '#fff'}}>{accountInfo.gender || 'Not Set'}</div>
                                          )}
                                      </div>
                                  </div>

                                  <div style={{backgroundColor: 'var(--input-bg)', padding: '6px 8px', borderRadius: '8px', border: '1px solid var(--glass-border)', display: 'flex', gap: '8px', alignItems: 'center'}}>
                                      <div style={{background: 'rgba(255,255,255,0.05)', padding: '5px', borderRadius: '6px', height: 'fit-content', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                          <Calendar size={12} color={theme.textMuted} />
                                      </div>
                                      <div style={{flex: 1}}>
                                          <div style={{fontSize: '0.55rem', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', marginBottom: '0px', letterSpacing: '0.5px'}}>Year</div>
                                          {isEditingAccount ? (
                                              <select 
                                                  value={editForm.year || ''} 
                                                  onChange={e => setEditForm({...editForm, year: e.target.value})}
                                                  style={{...styles.input, width: '100%', padding: '2px', fontSize: '0.8rem', minHeight: 'auto', borderRadius: '4px', background: 'transparent', border: 'none'}}
                                              >
                                                  <option value="" disabled>Select</option>
                                                  <option value="1">Year 1</option>
                                                  <option value="2">Year 2</option>
                                                  <option value="3">Year 3</option>
                                                  <option value="4">Year 4</option>
                                                  <option value="5">Year 5+</option>
                                              </select>
                                          ) : (
                                              <div style={{fontSize: '0.8rem', fontWeight: 600, color: '#fff'}}>Year {accountInfo.year || '-'}</div>
                                          )}
                                      </div>
                                  </div>
                              </div>

                              {/* Major Field */}
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
                                              style={{...styles.input, width: '100%', padding: '2px', fontSize: '0.8rem', minHeight: 'auto', borderRadius: '4px', background: 'transparent', border: 'none'}}
                                              placeholder="Major"
                                          />
                                      ) : (
                                          <div style={{fontSize: '0.8rem', fontWeight: 600, color: '#fff'}}>{accountInfo.major || 'Not Set'}</div>
                                      )}
                                  </div>
                              </div>

                              {/* College Field */}
                              <div style={{backgroundColor: 'var(--input-bg)', padding: '6px 8px', borderRadius: '8px', border: '1px solid var(--glass-border)', display: 'flex', gap: '8px', alignItems: 'center'}}>
                                  <div style={{background: 'rgba(255,255,255,0.05)', padding: '5px', borderRadius: '6px', height: 'fit-content', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                      <Building size={12} color={theme.textMuted} />
                                  </div>
                                  <div style={{flex: 1}}>
                                      <div style={{fontSize: '0.55rem', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', marginBottom: '0px', letterSpacing: '0.5px'}}>College / University</div>
                                      {isEditingAccount ? (
                                          <input 
                                              value={editForm.college || ''} 
                                              onChange={e => setEditForm({...editForm, college: e.target.value})}
                                              style={{...styles.input, width: '100%', padding: '2px', fontSize: '0.8rem', minHeight: 'auto', borderRadius: '4px', background: 'transparent', border: 'none'}}
                                              placeholder="College Name"
                                          />
                                      ) : (
                                          <div style={{fontSize: '0.8rem', fontWeight: 600, color: '#fff'}}>{accountInfo.college || 'Not Set'}</div>
                                      )}
                                  </div>
                              </div>

                              {/* Subscription Tier */}
                              <div 
                                onClick={() => onNavigate('subscription')}
                                style={{
                                  backgroundColor: accountInfo.subscription_tier === 1 ? 'rgba(234, 179, 8, 0.1)' : 'var(--input-bg)',
                                  padding: '12px',
                                  borderRadius: '14px',
                                  border: accountInfo.subscription_tier === 1 ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid var(--glass-border)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '2px',
                                  marginTop: '8px',
                                  position: 'relative',
                                  overflow: 'hidden',
                                  boxShadow: accountInfo.subscription_tier === 1 ? '0 4px 15px rgba(234, 179, 8, 0.15)' : 'none',
                                  cursor: 'pointer'
                              }}>
                                  {/* Background Shine */}
                                  {accountInfo.subscription_tier === 1 && (
                                      <div style={{
                                          position: 'absolute',
                                          top: -20, left: -20, right: -20, bottom: -20,
                                          background: 'linear-gradient(120deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%)',
                                          animation: 'shine 4s infinite linear',
                                          pointerEvents: 'none'
                                      }} />
                                  )}

                                  <div style={{
                                      background: accountInfo.subscription_tier === 1 ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'rgba(255,255,255,0.05)',
                                      padding: '6px',
                                      borderRadius: '50%',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      marginBottom: '4px',
                                      boxShadow: accountInfo.subscription_tier === 1 ? '0 4px 10px rgba(245, 158, 11, 0.3)' : 'none'
                                  }}>
                                      <Sparkles
                                          size={12}
                                          color={accountInfo.subscription_tier === 1 ? '#fff' : theme.textMuted}
                                          fill={accountInfo.subscription_tier === 1 ? '#fff' : 'none'}
                                      />
                                  </div>
                                  
                                  <div style={{fontSize: '0.55rem', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '1px'}}>Current Plan</div>
                                  
                                  <div style={{
                                      fontSize: '1rem',
                                      fontWeight: 900,
                                      letterSpacing: '-0.5px',
                                      color: '#fff'
                                  }}>
                                      {accountInfo.subscription_tier === 1 ? (
                                          <span style={{
                                              background: 'linear-gradient(to right, #fde047, #fbbf24, #fff, #fde047)',
                                              backgroundSize: '200% auto',
                                              WebkitBackgroundClip: 'text',
                                              WebkitTextFillColor: 'transparent',
                                              animation: 'textShine 3s linear infinite',
                                              textShadow: '0 0 15px rgba(251, 191, 36, 0.4)'
                                          }}>
                                              PRO MEMBER
                                          </span>
                                      ) : 'Free Plan'}
                                  </div>
                                  <div className="text-[10px] text-white/40 mt-1 font-medium bg-white/5 px-2 py-0.5 rounded-full">
                                      Click to Manage
                                  </div>
                              </div>

                              {/* Refer & Earn Button */}
                              <div 
                                onClick={() => onNavigate('referral')}
                                style={{
                                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                  padding: '10px',
                                  borderRadius: '12px',
                                  border: '1px solid rgba(16, 185, 129, 0.2)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '8px',
                                  marginTop: '4px',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                }}
                                className="hover:bg-emerald-500/20 active:scale-[0.98]"
                              >
                                  <div className="bg-emerald-500/20 p-1.5 rounded-full">
                                      <DollarSign size={14} className="text-emerald-400" />
                                  </div>
                                  <div className="text-center">
                                      <div className="text-xs font-bold text-emerald-400">Refer & Earn</div>
                                      <div className="text-[9px] text-emerald-400/60">Get 20% commission</div>
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
                {/* ... existing code ... */}
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
                            <div style={{display: 'flex', gap: '8px'}}>
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

                {/* AI Import */}
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

                {/* Appearance Card */}
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

                {/* Support Tickets for Users */}
                <div 
                    style={{...compactCardStyle, cursor: 'pointer', background: 'rgba(139, 92, 246, 0.1)'}} 
                    onClick={() => setIsHistoryModalOpen(true)}
                >
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                        <div style={{background: 'rgba(139, 92, 246, 0.2)', padding: '6px', borderRadius: '50%'}}>
                            <MessageSquare size={16} color={theme.accent} />
                        </div>
                        <div>
                            <h3 style={{margin: 0, fontSize: '0.9rem', color: theme.accent, fontWeight: 800}}>Support Tickets</h3>
                            <p style={{margin: 0, fontSize: '0.7rem', color: theme.textMuted}}>View history & replies</p>
                        </div>
                        <ChevronRight size={16} color={theme.textMuted} style={{marginLeft: 'auto'}} />
                    </div>
                </div>

                {/* Feedback Button for Users */}
                <div 
                    style={{...compactCardStyle, cursor: 'pointer'}} 
                    onClick={() => setIsFeedbackModalOpen(true)}
                >
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                        <div style={{background: 'rgba(255,255,255,0.1)', padding: '6px', borderRadius: '50%'}}>
                            <Pencil size={16} color="#fff" />
                        </div>
                        <div>
                            <h3 style={{margin: 0, fontSize: '0.9rem', color: '#fff', fontWeight: 800}}>New Ticket</h3>
                            <p style={{margin: 0, fontSize: '0.7rem', color: theme.textMuted}}>Report bugs or suggest features</p>
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

                {/* --- ADMIN ONLY SECTIONS --- */}
                {accountInfo?.is_admin && (
                    <div style={{marginTop: '30px', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '20px'}}>
                        <h3 style={{fontSize: '0.8rem', fontWeight: 800, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px'}}>Admin Tools</h3>
                        
                        {/* User Management */}
                        <div style={adminCardStyle}>
                            <div 
                                onClick={() => setIsUserMgmtExpanded(!isUserMgmtExpanded)}
                                style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '2px 0'}}
                            >
                                <h3 style={sectionHeaderStyle}>
                                    <div style={{...sectionIconStyle, background: 'rgba(255, 255, 255, 0.1)', color: '#fff'}}>
                                        <Shield size={16} />
                                    </div>
                                    <span>User Management</span>
                                </h3>
                                {isUserMgmtExpanded ? <ChevronUp size={16} color={theme.textMuted} /> : <ChevronDown size={16} color={theme.textMuted} />}
                            </div>

                            {isUserMgmtExpanded && (
                                <div style={{marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px'}}>
                                    <div style={{display: 'flex', gap: '8px', marginBottom: '10px'}}>
                                        <input 
                                            placeholder="Search username or exact ID..." 
                                            value={userSearch} 
                                            onChange={(e) => setUserSearch(e.target.value)} 
                                            onKeyDown={(e) => e.key === 'Enter' && fetchUsers(userSearch)}
                                            style={{...styles.input, width: '100%', fontSize: '0.8rem', padding: '8px', flex: 1}}
                                        />
                                        <button 
                                            onClick={() => fetchUsers(userSearch)}
                                            style={{...styles.button, padding: '0 12px', fontSize: '0.8rem', fontWeight: 700}}
                                        >
                                            <Search size={14} /> Search
                                        </button>
                                    </div>
                                    
                                    {isLoadingUsers ? (
                                        <div style={{textAlign: 'center', padding: '10px'}}><Loader2 className="animate-spin" size={20} /></div>
                                    ) : (
                                        <div style={{display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto'}}>
                                            {users.map(user => (
                                                <div key={user.id} style={{background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)'}}>
                                                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                                        <div>
                                                            <div style={{fontWeight: 700, fontSize: '0.8rem', color: '#fff'}}>{user.username}</div>
                                                            <div style={{fontSize: '0.65rem', color: theme.textMuted}}>{user.email}</div>
                                                        </div>
                                                        <div style={{display: 'flex', gap: '4px'}}>
                                                            <button 
                                                                onClick={() => toggleUserPro(user.id, user.subscription_tier || 0)}
                                                                style={{padding: '4px 8px', borderRadius: '4px', background: user.subscription_tier === 1 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.1)', color: user.subscription_tier === 1 ? theme.success : theme.textMuted, border: 'none', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer'}}
                                                            >
                                                                {user.subscription_tier === 1 ? 'PRO' : 'FREE'}
                                                            </button>
                                                            {user.is_banned ? (
                                                                <button 
                                                                    onClick={() => unbanUser(user.id)}
                                                                    style={{padding: '4px', borderRadius: '4px', background: theme.success, color: '#fff', border: 'none', cursor: 'pointer'}}
                                                                    title="Unban"
                                                                >
                                                                    <Check size={12} />
                                                                </button>
                                                            ) : (
                                                                <button 
                                                                    onClick={() => setBanModalUser({id: user.id, username: user.username})}
                                                                    style={{padding: '4px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', color: theme.textMuted, border: 'none', cursor: 'pointer'}}
                                                                    title="Ban"
                                                                >
                                                                    <Ban size={12} />
                                                                </button>
                                                            )}
                                                            <button 
                                                                onClick={() => deleteUser(user.id)}
                                                                style={{padding: '4px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.2)', color: theme.danger, border: 'none', cursor: 'pointer'}}
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {users.length === 0 && !isLoadingUsers && (
                                                <div style={{textAlign: 'center', padding: '20px', color: theme.textMuted, fontSize: '0.8rem'}}>No users found.</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Referral Codes Management */}
                        <div style={adminCardStyle}>
                            <div 
                                onClick={() => setIsReferralExpanded(!isReferralExpanded)}
                                style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '2px 0'}}
                            >
                                <h3 style={sectionHeaderStyle}>
                                    <div style={{...sectionIconStyle, background: 'rgba(16, 185, 129, 0.15)', color: theme.success}}>
                                        <Ticket size={16} /> 
                                    </div>
                                    <span>Referral Codes</span>
                                </h3>
                                {isReferralExpanded ? <ChevronUp size={16} color={theme.textMuted} /> : <ChevronDown size={16} color={theme.textMuted} />}
                            </div>

                            {isReferralExpanded && (
                                <div style={{marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px'}}>
                                    
                                    {!isCreatingReferral ? (
                                        <button 
                                            onClick={() => setIsCreatingReferral(true)}
                                            style={{...styles.button, width: '100%', justifyContent: 'center', fontSize: '0.8rem', padding: '8px', marginBottom: '12px'}}
                                        >
                                            <Plus size={14} /> Create New Code
                                        </button>
                                    ) : (
                                        <div style={{background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', marginBottom: '12px'}}>
                                            <input 
                                                value={newReferralCode}
                                                onChange={(e) => setNewReferralCode(e.target.value.toUpperCase())}
                                                placeholder="CODE (e.g. VIP2024)"
                                                style={{...styles.input, width: '100%', marginBottom: '8px', fontSize: '0.9rem', textTransform: 'uppercase'}}
                                            />
                                            <div style={{display: 'flex', gap: '8px', marginBottom: '8px'}}>
                                                <button 
                                                    onClick={() => setNewReferralTier(0)}
                                                    style={{flex: 1, padding: '6px', borderRadius: '6px', border: 'none', background: newReferralTier === 0 ? theme.accent : 'rgba(255,255,255,0.1)', color: newReferralTier === 0 ? '#fff' : theme.textMuted, fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer'}}
                                                >
                                                    Free Tier
                                                </button>
                                                <button 
                                                    onClick={() => setNewReferralTier(1)}
                                                    style={{flex: 1, padding: '6px', borderRadius: '6px', border: 'none', background: newReferralTier === 1 ? '#eab308' : 'rgba(255,255,255,0.1)', color: newReferralTier === 1 ? '#fff' : theme.textMuted, fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer'}}
                                                >
                                                    Pro Tier
                                                </button>
                                            </div>
                                            <div style={{display: 'flex', gap: '8px'}}>
                                                <button onClick={createReferralCode} style={{...styles.button, flex: 1, justifyContent: 'center', padding: '6px', fontSize: '0.75rem'}}>Save</button>
                                                <button onClick={() => setIsCreatingReferral(false)} style={{...styles.secondaryButton, flex: 1, justifyContent: 'center', padding: '6px', fontSize: '0.75rem'}}>Cancel</button>
                                            </div>
                                        </div>
                                    )}

                                    <div style={{display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto'}}>
                                        {referralCodes.map(code => (
                                            <div key={code.id} style={{background: 'rgba(255,255,255,0.02)', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                                <div>
                                                    <div style={{fontWeight: 700, fontSize: '0.85rem', color: code.is_active ? '#fff' : theme.textMuted, textDecoration: code.is_active ? 'none' : 'line-through'}}>{code.code}</div>
                                                    <div style={{fontSize: '0.65rem', color: theme.textMuted, display: 'flex', gap: '6px'}}>
                                                        <span>Used: {code.usage_count}</span>
                                                        <span style={{color: code.subscription_tier === 1 ? '#eab308' : theme.textMuted}}>{code.subscription_tier === 1 ? 'PRO' : 'FREE'}</span>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => toggleReferralCode(code.id, code.is_active)}
                                                    style={{background: code.is_active ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: code.is_active ? theme.success : theme.danger, border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer'}}
                                                >
                                                    {code.is_active ? 'Active' : 'Inactive'}
                                                </button>
                                            </div>
                                        ))}
                                        {referralCodes.length === 0 && <div style={{textAlign: 'center', color: theme.textMuted, fontSize: '0.8rem', fontStyle: 'italic'}}>No codes yet.</div>}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Admin Inbox for Feedback */}
                        <div style={adminCardStyle}>
                            <div 
                                onClick={() => setIsFeedbackInboxExpanded(!isFeedbackInboxExpanded)}
                                style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '2px 0'}}
                            >
                                <h3 style={sectionHeaderStyle}>
                                    <div style={{...sectionIconStyle, background: 'rgba(139, 92, 246, 0.15)', color: theme.accent}}>
                                        <MessageSquare size={16} />
                                    </div>
                                    <span>Feedback Inbox</span>
                                </h3>
                                {isFeedbackInboxExpanded ? <ChevronUp size={16} color={theme.textMuted} /> : <ChevronDown size={16} color={theme.textMuted} />}
                            </div>
                            
                            {isFeedbackInboxExpanded && (
                                <div style={{borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '10px'}}>
                                    <AdminInbox />
                                </div>
                            )}
                        </div>

                    </div>
                )}

          </div>
          
          {/* ... reset modal ... */}
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

          <FeedbackModal 
            isOpen={isFeedbackModalOpen} 
            onClose={() => setIsFeedbackModalOpen(false)} 
            userId={accountInfo?.id}
          />

          <SupportHistoryModal 
            isOpen={isHistoryModalOpen}
            onClose={() => setIsHistoryModalOpen(false)}
            userId={accountInfo?.id}
          />

          <BanModal 
            isOpen={!!banModalUser}
            username={banModalUser?.username || ''}
            onClose={() => setBanModalUser(null)}
            onConfirm={handleBanConfirm}
          />

          <style>{`
            @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes shine { 
                0% { transform: translateX(-100%) translateY(-100%) rotate(30deg); }
                100% { transform: translateX(200%) translateY(200%) rotate(30deg); }
            }
            @keyframes textShine {
                to { background-position: 200% center; }
            }
          `}</style>
    </div>
  );
};

export default Settings;
