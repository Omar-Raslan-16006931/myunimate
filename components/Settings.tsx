import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Palette, Layers, Loader2, LogOut, ChevronDown, AlertTriangle, User, Check, X, Shield, Search, Ban, Send, ArrowLeft, MessageSquare, ChevronRight, Heart, Columns } from 'lucide-react';
import { ScheduleProfile, EventColorMap, EventType, ScheduleEvent, PeriodDefinition, ThemeMode, AppFeedback, FeedbackReply, ViewState } from '../types';
import { theme, styles } from '../theme';
import ScheduleSettings from './ScheduleSettings';
import FeedbackModal from './FeedbackModal';
import AdminInbox from './AdminInbox';

// --- SUPPORTING COMPONENTS ---

const SupportHistoryModal = ({ isOpen, onClose, userId }: { isOpen: boolean, onClose: () => void, userId?: string }) => {
    const [tickets, setTickets] = useState<AppFeedback[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTicket, setActiveTicket] = useState<AppFeedback | null>(null);
    const [replies, setReplies] = useState<FeedbackReply[]>([]);
    const [replyText, setReplyText] = useState('');
    const [sendingReply, setSendingReply] = useState(false);
    const replyEndRef = useRef<HTMLDivElement>(null);

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

            const channel = supabase.channel(`user_feedback_list_${userId}`)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'app_feedback', filter: `user_id=eq.${userId}` },
                    (payload: any) => {
                        if (payload.eventType === 'INSERT') {
                            setTickets(prev => [payload.new as AppFeedback, ...prev]);
                        } else if (payload.eventType === 'UPDATE') {
                            setTickets(prev => prev.map(t => t.id === payload.new.id ? { ...t, ...payload.new } : t));
                            setActiveTicket(prev => prev?.id === payload.new.id ? { ...prev, ...payload.new } : prev);
                        } else if (payload.eventType === 'DELETE') {
                            setTickets(prev => prev.filter(t => t.id !== payload.old.id));
                            setActiveTicket(prev => prev?.id === payload.old.id ? null : prev);
                        }
                    }
                )
                .subscribe();

            return () => { supabase.removeChannel(channel); };
        }
    }, [isOpen, userId]);

    useEffect(() => {
        if (activeTicket) {
            setReplies([]);
            supabase.from('feedback_replies')
                .select('*')
                .eq('feedback_id', activeTicket.id)
                .order('created_at', { ascending: true })
                .then(({ data }: any) => {
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
    }, [activeTicket?.id]);

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
            await supabase.from('app_feedback').update({ status: 'unread' }).eq('id', activeTicket.id);
            setReplyText('');
        } catch (error) {
            console.error(error);
        } finally {
            setSendingReply(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div
                className="w-full max-w-md h-[85vh] bg-[#0f172a] rounded-[32px] border border-white/10 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-[#130f1c] shrink-0">
                    <div className="flex items-center gap-3">
                        {activeTicket ? (
                            <button onClick={() => setActiveTicket(null)} className="p-1.5 -ml-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition">
                                <ArrowLeft size={20} />
                            </button>
                        ) : (
                            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                                <MessageSquare size={20} />
                            </div>
                        )}
                        <h3 className="text-lg font-bold text-white leading-none">
                            {activeTicket ? 'Support Chat' : 'Support Inbox'}
                        </h3>
                    </div>
                    <button onClick={onClose} className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden relative bg-[#0f172a]">
                    {!activeTicket ? (
                        <div className="absolute inset-0 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {loading ? (
                                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-indigo-500" /></div>
                            ) : tickets.length === 0 ? (
                                <div className="text-center text-white/30 py-12 text-sm italic">No support tickets found.</div>
                            ) : (
                                tickets.map(t => (
                                    <div key={t.id} onClick={() => setActiveTicket(t)} className="group bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-2xl p-4 cursor-pointer transition-all active:scale-[0.98]">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${t.category === 'Bug' ? 'text-red-400 bg-red-400/10' : t.category === 'Feature Request' ? 'text-green-400 bg-green-400/10' : 'text-blue-400 bg-blue-400/10'}`}>{t.category}</span>
                                                <span className="text-[10px] text-white/30">{new Date(t.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <ChevronRight size={16} className="text-white/20 group-hover:text-white/60 transition-colors" />
                                        </div>
                                        <p className="text-sm text-white/90 font-medium line-clamp-2 leading-relaxed">{t.message}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col h-full">
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-[#0f172a] to-[#130f1c] custom-scrollbar">
                                <div className="flex flex-col items-end animate-in slide-in-from-bottom-2">
                                    <div className="bg-indigo-600 text-white px-4 py-3 rounded-2xl rounded-tr-none max-w-[85%] text-sm shadow-md leading-relaxed">{activeTicket.message}</div>
                                    <span className="text-[10px] text-white/20 mt-1 mr-1">{new Date(activeTicket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                {replies.map(reply => {
                                    const isMe = !reply.is_admin;
                                    return (
                                        <div key={reply.id} className={`flex flex-col animate-in slide-in-from-bottom-2 ${isMe ? 'items-end' : 'items-start'}`}>
                                            <div className={`px-4 py-3 rounded-2xl max-w-[85%] text-sm shadow-md leading-relaxed ${isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white/10 text-white/90 rounded-tl-none border border-white/5'}`}>{reply.message}</div>
                                            <span className={`text-[10px] text-white/20 mt-1 ${isMe ? 'mr-1' : 'ml-1'}`}>{isMe ? 'You' : 'Support'} • {new Date(reply.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    );
                                })}
                                <div ref={replyEndRef} />
                            </div>
                            <div className="p-3 bg-[#130f1c] border-t border-white/5 shrink-0">
                                <div className="flex gap-2 items-end bg-white/5 rounded-3xl p-1 border border-white/10 focus-within:border-indigo-500/50 transition-colors">
                                    <textarea value={replyText} onChange={e => setReplyText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }} placeholder="Type a message..." className="flex-1 bg-transparent border-none text-white text-sm px-4 py-3 focus:outline-none resize-none max-h-[100px] min-h-[44px] placeholder-white/30" rows={1} />
                                    <button onClick={handleSendReply} disabled={!replyText.trim() || sendingReply} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0 ${(!replyText.trim() || sendingReply) ? 'bg-white/5 text-white/20' : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-900/20'}`}>
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

const BanModal = ({ isOpen, onClose, onConfirm, username }: { isOpen: boolean, onClose: () => void, onConfirm: (duration: string | null) => void, username: string }) => {
    if (!isOpen) return null;
    return (
        <div style={styles.modalOverlay} onClick={onClose}>
            <div style={{ ...styles.modalContent, maxWidth: '300px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                <div style={{ margin: '0 auto 16px', width: '50px', height: '50px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.danger }}>
                    <Ban size={24} />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 8px 0' }}>Suspend {username}?</h3>
                <p style={{ fontSize: '0.85rem', color: theme.textMuted, marginBottom: '20px' }}>Select suspension duration.</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                    <button onClick={() => onConfirm('1d')} style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.8rem' }}>1 Day</button>
                    <button onClick={() => onConfirm('3d')} style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.8rem' }}>3 Days</button>
                    <button onClick={() => onConfirm('1w')} style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.8rem' }}>1 Week</button>
                    <button onClick={() => onConfirm('1m')} style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.8rem' }}>1 Month</button>
                </div>
                <button onClick={() => onConfirm(null)} style={{ width: '100%', padding: '10px', background: 'rgba(239, 68, 68, 0.2)', color: theme.danger, border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', fontWeight: 700, marginBottom: '8px' }}>Permanent Ban</button>
                <button onClick={onClose} style={{ width: '100%', padding: '10px', background: 'transparent', color: theme.textMuted, border: 'none' }}>Cancel</button>
            </div>
        </div>
    );
};

// --- MAIN SETTINGS COMPONENT ---

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
    onNavigate: (view: ViewState) => void;
}

const SectionHeader = ({ icon: Icon, color, title, isExpanded, onToggle, rightElement }: any) => {
    return (
        <div onClick={onToggle} className="flex items-center justify-between cursor-pointer p-4 group">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110" style={{ background: `${color}15`, color: color }}>
                    <Icon size={20} />
                </div>
                <h3 className="text-[15px] font-bold text-white tracking-tight">{title}</h3>
            </div>
            <div className="flex items-center gap-3">
                {rightElement}
                <div className={`text-white/20 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                    <ChevronDown size={18} />
                </div>
            </div>
        </div>
    );
};

const GroupCard = ({ children, className = "" }: any) => {
    return (
        <div className={`bg-white/[0.03] backdrop-blur-xl border border-white/[0.05] rounded-[28px] overflow-hidden shadow-2xl ${className}`}>
            {children}
        </div>
    );
};

const Settings: React.FC<SettingsProps> = ({
    profiles, activeProfileId, eventColors, onAddProfile, onSwitchProfile, onDeleteProfile, onUpdateColor, onResetApp, onSignOut, periods, setPeriods, accountInfo, onUpdateAccount, onNavigate
}) => {
    const [newProfileName, setNewProfileName] = useState('');
    const [isScheduleSettingsExpanded, setIsScheduleSettingsExpanded] = useState(false);
    const [isProfilesExpanded, setIsProfilesExpanded] = useState(false);
    const [isColorsExpanded, setIsColorsExpanded] = useState(false);
    const [isAccountExpanded, setIsAccountExpanded] = useState(false);
    const [isUserMgmtExpanded, setIsUserMgmtExpanded] = useState(false);
    const [isFeedbackInboxExpanded, setIsFeedbackInboxExpanded] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [isEditingAccount, setIsEditingAccount] = useState(false);
    const [editForm, setEditForm] = useState<any>({});
    const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const [users, setUsers] = useState<any[]>([]);
    const [userSearch, setUserSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [banModalUser, setBanModalUser] = useState<{ id: string, username: string } | null>(null);
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

    const handleCreateProfile = () => { if (newProfileName.trim()) { onAddProfile(newProfileName); setNewProfileName(''); } };
    const startEditingAccount = (e: React.MouseEvent) => { e.stopPropagation(); setEditForm({ ...accountInfo }); setIsEditingAccount(true); setIsAccountExpanded(true); setUsernameAvailable(null); };
    const cancelEditingAccount = () => { setIsEditingAccount(false); setEditForm({}); setUsernameAvailable(null); setIsCheckingUsername(false); };
    const saveEditingAccount = () => { onUpdateAccount(editForm); setIsEditingAccount(false); setUsernameAvailable(null); };

    useEffect(() => { const timer = setTimeout(() => setDebouncedSearch(userSearch), 500); return () => clearTimeout(timer); }, [userSearch]);

    const fetchUsers = useCallback(async (manualSearchTerm?: string) => {
        if (!isUserMgmtExpanded) return;
        setIsLoadingUsers(true);
        const term = manualSearchTerm !== undefined ? manualSearchTerm : debouncedSearch;
        const cleanTerm = term.trim();
        try {
            let query = supabase.from('profiles').select('id, username, created_at, updated_at, college, is_banned, settings').order('updated_at', { ascending: false });
            if (cleanTerm) {
                const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanTerm);
                if (isUUID) query = query.eq('id', cleanTerm);
                else query = query.ilike('username', `%${cleanTerm}%`);
                query = query.limit(50);
            } else query = query.limit(20);
            const { data } = await query;
            if (data) setUsers(data.map((u: any) => ({ ...u, email: u.settings?.account?.email || 'No Email' })));
        } catch (err) { console.error(err); } finally { setIsLoadingUsers(false); }
    }, [debouncedSearch, isUserMgmtExpanded]);

    useEffect(() => { if (isUserMgmtExpanded) fetchUsers(); }, [fetchUsers, isUserMgmtExpanded]);

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
        const { error } = await supabase.from('profiles').update({ is_banned: true, banned_until: bannedUntil }).eq('id', banModalUser.id);
        if (!error) setUsers(users.map(u => u.id === banModalUser.id ? { ...u, is_banned: true } : u));
        setBanModalUser(null);
    };

    const unbanUser = async (id: string) => { if (!confirm("Unban this user?")) return; const { error } = await supabase.from('profiles').update({ is_banned: false, banned_until: null }).eq('id', id); if (!error) setUsers(users.map(u => u.id === id ? { ...u, is_banned: false } : u)); };
    const deleteUser = async (id: string) => { if (!confirm("Are you sure?")) return; const { error } = await supabase.from('profiles').delete().eq('id', id); if (!error) setUsers(users.filter(u => u.id !== id)); };

    useEffect(() => {
        if (!isEditingAccount || !editForm.username || editForm.username === accountInfo?.username || editForm.username.length < 4) { setUsernameAvailable(null); setIsCheckingUsername(false); return; }
        setIsCheckingUsername(true);
        const timer = setTimeout(async () => {
            try {
                const { data } = await supabase.from('profiles').select('username').ilike('username', editForm.username.trim()).neq('id', accountInfo?.id || '').maybeSingle();
                setUsernameAvailable(!data);
            } catch (err) { console.error(err); } finally { setIsCheckingUsername(false); }
        }, 500);
        return () => clearTimeout(timer);
    }, [editForm.username, isEditingAccount, accountInfo]);

    const canEditUsername = !accountInfo?.lastUsernameChange || (new Date().getTime() - new Date(accountInfo.lastUsernameChange).getTime()) > 14 * 24 * 60 * 60 * 1000;
    const isSaveDisabled = isCheckingUsername || (usernameAvailable === false && editForm.username !== accountInfo?.username) || (editForm.username && editForm.username.length < 4);

    return (
        <div style={styles.scrollableContent} className="animate-in fade-in duration-700">
            <header className="mb-8 px-1">
                <h1 className="text-3xl font-black text-white tracking-tight leading-tight">Settings</h1>
                <p className="text-[13px] text-white/40 font-medium tracking-wide">Manage your university operating system</p>
            </header>

            <div className="space-y-6">

                {/* --- PERSONAL GROUP --- */}
                <GroupCard>
                    <div className="px-5 pt-6 pb-2">
                        <div className="flex items-center gap-2 mb-4 opacity-40">
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">Personal & Identity</span>
                        </div>
                    </div>

                    {accountInfo && (
                        <div className="border-b border-white/[0.05] last:border-0">
                            <SectionHeader
                                icon={User}
                                color="#3b82f6"
                                title="Account Profile"
                                isExpanded={isAccountExpanded}
                                onToggle={() => setIsAccountExpanded(!isAccountExpanded)}
                                rightElement={!isEditingAccount && (
                                    <button onClick={startEditingAccount} className="px-3 py-1.5 bg-white/5 rounded-full text-[11px] font-bold text-white/60 hover:text-white transition-colors border border-white/5">Edit</button>
                                )}
                            />
                            {isAccountExpanded && (
                                <div className="px-5 pb-6 pt-2 animate-in slide-in-from-top-2 duration-300">
                                    {isEditingAccount && (
                                        <div className="flex gap-2 mb-5">
                                            <button onClick={saveEditingAccount} disabled={isSaveDisabled} className="flex-1 py-2.5 bg-blue-600 rounded-xl text-xs font-bold text-white shadow-lg shadow-blue-900/20 disabled:opacity-50">Save Changes</button>
                                            <button onClick={cancelEditingAccount} className="flex-1 py-2.5 bg-white/5 rounded-xl text-xs font-bold text-white/60">Cancel</button>
                                        </div>
                                    )}
                                    <div className="grid gap-3">
                                        <div className="bg-black/20 rounded-[20px] p-4 border border-white/[0.03] flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/20"><User size={18} /></div>
                                            <div className="flex-1">
                                                <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-0.5">Username</p>
                                                {isEditingAccount ? (
                                                    <div className="relative">
                                                        <input value={editForm.username} onChange={e => setEditForm({ ...editForm, username: e.target.value })} disabled={!canEditUsername} className="w-full bg-transparent text-sm font-bold text-white outline-none" />
                                                        {isCheckingUsername && <Loader2 size={12} className="absolute right-0 top-1 animate-spin text-white/40" />}
                                                    </div>
                                                ) : <p className="text-sm font-bold text-white">{accountInfo.username}</p>}
                                            </div>
                                        </div>
                                        <div className="bg-black/20 rounded-[20px] p-4 border border-white/[0.03] flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/20"><MessageSquare size={18} /></div>
                                            <div className="flex-1 overflow-hidden">
                                                <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-0.5">Email Address</p>
                                                <p className="text-sm font-bold text-white/60 truncate">{accountInfo.email}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-black/20 rounded-[20px] p-4 border border-white/[0.03]">
                                                <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1.5">Gender</p>
                                                {isEditingAccount ? (
                                                    <select value={editForm.gender || ''} onChange={e => setEditForm({ ...editForm, gender: e.target.value })} className="bg-transparent text-sm font-bold text-white outline-none w-full appearance-none">
                                                        <option value="male">Male</option>
                                                        <option value="female">Female</option>
                                                    </select>
                                                ) : <p className="text-sm font-bold text-white">{accountInfo.gender || '—'}</p>}
                                            </div>
                                            <div className="bg-black/20 rounded-[20px] p-4 border border-white/[0.03]">
                                                <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1.5">Year</p>
                                                {isEditingAccount ? (
                                                    <select value={editForm.year || ''} onChange={e => setEditForm({ ...editForm, year: e.target.value })} className="bg-transparent text-sm font-bold text-white outline-none w-full appearance-none">
                                                        <option value="1">Year 1</option>
                                                        <option value="2">Year 2</option>
                                                        <option value="3">Year 3</option>
                                                        <option value="4">Year 4</option>
                                                        <option value="5">Year 5+</option>
                                                    </select>
                                                ) : <p className="text-sm font-bold text-white">Year {accountInfo.year || '—'}</p>}
                                            </div>
                                        </div>
                                        <div className="bg-black/20 rounded-[20px] p-4 border border-white/[0.03]">
                                            <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-0.5">College / Major</p>
                                            <p className="text-sm font-bold text-white">{accountInfo.college || 'Not set'} • <span className="text-white/50">{accountInfo.major || 'Not set'}</span></p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </GroupCard>

                {/* --- ACADEMIC ENGINE GROUP --- */}
                <GroupCard>
                    <div className="px-5 pt-6 pb-2">
                        <div className="flex items-center gap-2 mb-4 opacity-40">
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">Academic Engine</span>
                        </div>
                    </div>

                    <div className="border-b border-white/[0.05] last:border-0">
                        <SectionHeader
                            icon={Layers} color="#8b5cf6" title="Schedules & Profiles"
                            isExpanded={isProfilesExpanded} onToggle={() => setIsProfilesExpanded(!isProfilesExpanded)}
                            rightElement={<span className="text-[10px] font-bold text-white/30 bg-white/5 px-2 py-0.5 rounded-md">{profiles.length} Profiles</span>}
                        />
                        {isProfilesExpanded && (
                            <div className="px-5 pb-6 pt-2 animate-in slide-in-from-top-2 duration-300 space-y-4">
                                <div className="grid gap-2">
                                    {profiles.map(s => (
                                        <div key={s.id} className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${s.id === activeProfileId ? 'bg-violet-500/10 border-violet-500/30' : 'bg-white/5 border-transparent'}`} onClick={() => onSwitchProfile(s.id)}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full ${s.id === activeProfileId ? 'bg-violet-400 animate-pulse' : 'bg-white/20'}`} />
                                                <span className={`text-sm font-bold ${s.id === activeProfileId ? 'text-white' : 'text-white/40'}`}>{s.name}</span>
                                            </div>
                                            {profiles.length > 1 && (
                                                <button onClick={(e) => { e.stopPropagation(); onDeleteProfile(s.id); }} className="p-2 text-white/20 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50" placeholder="Profile name..." value={newProfileName} onChange={e => setNewProfileName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateProfile()} />
                                    <button onClick={handleCreateProfile} className="bg-violet-600 text-white px-4 rounded-xl shadow-lg shadow-violet-900/20 active:scale-95 transition-transform"><Plus size={20} /></button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="border-b border-white/[0.05] last:border-0">
                        <SectionHeader icon={Columns} color="#ec4899" title="Timeline Grid" isExpanded={isScheduleSettingsExpanded} onToggle={() => setIsScheduleSettingsExpanded(!isScheduleSettingsExpanded)} />
                        {isScheduleSettingsExpanded && <div className="px-5 pb-6 pt-2 animate-in slide-in-from-top-2 duration-300"><ScheduleSettings periods={periods} setPeriods={setPeriods} /></div>}
                    </div>

                    <div className="border-b border-white/[0.05] last:border-0">
                        <SectionHeader icon={Palette} color="#f59e0b" title="Theme Colors" isExpanded={isColorsExpanded} onToggle={() => setIsColorsExpanded(!isColorsExpanded)} />
                        {isColorsExpanded && (
                            <div className="px-5 pb-6 pt-2 animate-in slide-in-from-top-2 duration-300 grid grid-cols-2 gap-2">
                                {Object.keys(eventColors).map(key => (
                                    <div key={key} className="bg-black/40 p-2.5 rounded-2xl border border-white/[0.03] flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider pl-1">{key}</span>
                                        <div className="w-6 h-6 rounded-lg overflow-hidden border border-white/10 relative">
                                            <input type="color" value={eventColors[key as EventType]} onChange={(e) => onUpdateColor(key as EventType, e.target.value)} className="absolute inset-[-10px] w-[200%] h-[200%] cursor-pointer border-none p-0" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </GroupCard>

                {/* --- UTILITIES & SUPPORT GROUP --- */}
                <GroupCard>
                    <div className="px-5 pt-6 pb-2">
                        <div className="flex items-center gap-2 mb-4 opacity-40">
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">System & Support</span>
                        </div>
                    </div>

                    <div className="p-4 px-5 space-y-2">
                        <button onClick={() => setIsHistoryModalOpen(true)} className="w-full flex items-center justify-between p-4 bg-white/5 rounded-[20px] hover:bg-white/10 transition-all group border border-white/[0.03]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform"><MessageSquare size={20} /></div>
                                <div className="text-left">
                                    <p className="text-[15px] font-bold text-white leading-tight">Support Tickets</p>
                                    <p className="text-[11px] text-white/30 font-medium">History & Communications</p>
                                </div>
                            </div>
                            <ChevronRight size={18} className="text-white/10" />
                        </button>
                        <button onClick={() => setIsFeedbackModalOpen(true)} className="w-full flex items-center justify-between p-4 bg-white/5 rounded-[20px] hover:bg-white/10 transition-all group border border-white/[0.03]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-white/5 text-white/60 flex items-center justify-center group-hover:scale-110 transition-transform"><Plus size={20} /></div>
                                <div className="text-left">
                                    <p className="text-[15px] font-bold text-white leading-tight">New Ticket</p>
                                    <p className="text-[11px] text-white/30 font-medium">Feature Request or Bug Report</p>
                                </div>
                            </div>
                            <ChevronRight size={18} className="text-white/10" />
                        </button>
                    </div>

                    <div className="p-5 pt-0">
                        <button onClick={onSignOut} className="w-full py-4 bg-red-500/10 text-red-500 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-red-500/20 transition-all flex items-center justify-center gap-3"><LogOut size={16} /> Sign Out</button>
                        <button onClick={() => setShowResetConfirm(true)} className="w-full py-3 text-white/20 hover:text-white/40 text-[10px] font-bold uppercase tracking-widest transition-colors mt-2">Factory Reset</button>
                    </div>
                </GroupCard>

                {/* --- ADMIN ZONE --- */}
                {accountInfo?.is_admin && (
                    <GroupCard className="border-red-500/20 bg-red-500/[0.02]">
                        <div className="px-5 pt-6 pb-2">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400">Restricted Admin Access</span>
                            </div>
                        </div>

                        <div className="border-b border-red-500/10 last:border-0">
                            <SectionHeader icon={Shield} color="#ef4444" title="User Control" isExpanded={isUserMgmtExpanded} onToggle={() => setIsUserMgmtExpanded(!isUserMgmtExpanded)} />
                            {isUserMgmtExpanded && (
                                <div className="px-5 pb-6 pt-2 animate-in slide-in-from-top-2 duration-300">
                                    <div className="flex gap-2 mb-4">
                                        <input placeholder="Search username..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchUsers(userSearch)} className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white" />
                                        <button onClick={() => fetchUsers(userSearch)} className="bg-white/5 hover:bg-white/10 text-white p-2.5 rounded-xl transition-all"><Search size={18} /></button>
                                    </div>
                                    {isLoadingUsers ? <div className="text-center py-4"><Loader2 className="animate-spin text-white/20" /></div> : (
                                        <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                            {users.map(user => (
                                                <div key={user.id} className="bg-black/40 p-3 rounded-2xl border border-white/[0.03] flex items-center justify-between">
                                                    <div>
                                                        <p className="text-xs font-bold text-white">{user.username}</p>
                                                        <p className="text-[10px] text-white/30 truncate max-w-[120px]">{user.email}</p>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        {user.is_banned ? (
                                                            <button onClick={() => unbanUser(user.id)} className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg"><Check size={14} /></button>
                                                        ) : (
                                                            <button onClick={() => setBanModalUser({ id: user.id, username: user.username })} className="p-1.5 bg-white/5 text-white/40 rounded-lg"><Ban size={14} /></button>
                                                        )}
                                                        <button onClick={() => deleteUser(user.id)} className="p-1.5 bg-red-500/20 text-red-400 rounded-lg"><Trash2 size={14} /></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="border-b border-red-500/10 last:border-0">
                            <SectionHeader icon={MessageSquare} color="#3b82f6" title="Feedback Inbox" isExpanded={isFeedbackInboxExpanded} onToggle={() => setIsFeedbackInboxExpanded(!isFeedbackInboxExpanded)} />
                            {isFeedbackInboxExpanded && <div className="px-5 pb-6 pt-2 animate-in slide-in-from-top-2 duration-300"><AdminInbox /></div>}
                        </div>
                    </GroupCard>
                )}

                <div className="pt-4 pb-12 text-center flex flex-col items-center gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/5 backdrop-blur-sm">
                        <Heart size={12} className="text-red-500 fill-red-500" />
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">VERSION 3.5 • Made with PASSION</span>
                    </div>
                    <div className="flex gap-4">
                        <a href="#" className="text-[10px] font-bold text-white/20 hover:text-white transition-colors underline-offset-4 underline decoration-white/10">Terms of Service</a>
                        <a href="#" className="text-[10px] font-bold text-white/20 hover:text-white transition-colors underline-offset-4 underline decoration-white/10">Privacy Policy</a>
                    </div>
                </div>
            </div>

            {showResetConfirm && (
                <div style={styles.modalOverlay}>
                    <div style={{ ...styles.modalContent, maxWidth: '320px', padding: '0', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: '32px 24px', textAlign: 'center' }}>
                            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-5 text-red-500">
                                <AlertTriangle size={32} />
                            </div>
                            <h3 className="text-xl font-black text-white mb-2">Factory Reset?</h3>
                            <p className="text-sm text-white/40 leading-relaxed font-medium">
                                This will permanently wipe <b>all</b> your courses, logs, and settings. This cannot be undone.
                            </p>
                        </div>
                        <div className="flex border-t border-white/5">
                            <button onClick={() => setShowResetConfirm(false)} className="flex-1 py-5 text-sm font-bold text-white/40 hover:bg-white/5 transition-colors border-r border-white/5">Cancel</button>
                            <button onClick={() => { setShowResetConfirm(false); onResetApp(); }} className="flex-1 py-5 text-sm font-black text-red-500 hover:bg-red-500/10 transition-colors uppercase tracking-widest">Wipe Data</button>
                        </div>
                    </div>
                </div>
            )}

            <FeedbackModal isOpen={isFeedbackModalOpen} onClose={() => setIsFeedbackModalOpen(false)} userId={accountInfo?.id} />
            <SupportHistoryModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} userId={accountInfo?.id} />
            <BanModal isOpen={!!banModalUser} username={banModalUser?.username || ''} onClose={() => setBanModalUser(null)} onConfirm={handleBanConfirm} />
        </div>
    );
};

export default Settings;