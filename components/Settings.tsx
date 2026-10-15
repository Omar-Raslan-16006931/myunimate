import React, { useState, useEffect } from 'react';
import Collapse from './ui/Collapse';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Palette, Layers, Loader2, LogOut, ChevronDown, AlertTriangle, User, Shield, MessageSquare, ChevronRight, Columns, KeyRound, LifeBuoy, Fingerprint } from 'lucide-react';
import { ScheduleProfile, EventColorMap, EventType, ScheduleEvent, PeriodDefinition, ThemeMode, ViewState } from '../types';
import { styles } from '../theme';
import ScheduleSettings from './ScheduleSettings';
import PortalSettings from './PortalSettings';
import Support from './Support';
import Sheet from './Sheet';
import PasskeySettings from './PasskeySettings';
import { listTickets, readSeen, hasNewReply } from '../services/support';
import AdminInbox from './AdminInbox';
import AdminUsers from './AdminUsers';

// --- SUPPORTING COMPONENTS ---

/** How many tickets have a support reply you haven't opened yet. */
const useSupportBadge = (userId: string | undefined, refreshKey: unknown) => {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (!userId) return;
        let alive = true;
        listTickets(userId)
            .then(list => { if (alive) { const seen = readSeen(userId); setCount(list.filter(t => hasNewReply(t, seen)).length); } })
            .catch(() => { /* offline: keep the last number */ });
        return () => { alive = false; };
    }, [userId, refreshKey]);
    return count;
};

// --- MAIN SETTINGS COMPONENT ---

interface SettingsProps {
    openSupportKey?: number;
    onSupportOpened?: () => void;
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
    onSignOut: () => void | Promise<unknown>;
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
        <div className={`bg-white/[0.04] border border-white/[0.06] rounded-[28px] overflow-hidden isolate transform-gpu ${className}`}>
            {children}
        </div>
    );
};

const Settings: React.FC<SettingsProps> = ({
    profiles, activeProfileId, eventColors, onAddProfile, onSwitchProfile, onDeleteProfile, onUpdateColor, onResetApp, onSignOut, periods, setPeriods, accountInfo, onUpdateAccount, openSupportKey, onSupportOpened,
}) => {
    const [newProfileName, setNewProfileName] = useState('');
    const [isScheduleSettingsExpanded, setIsScheduleSettingsExpanded] = useState(false);
    const [isProfilesExpanded, setIsProfilesExpanded] = useState(false);
    const [isColorsExpanded, setIsColorsExpanded] = useState(false);
    const [isPortalExpanded, setIsPortalExpanded] = useState(false);
    const [isPasskeysExpanded, setIsPasskeysExpanded] = useState(false);
    const [isAccountExpanded, setIsAccountExpanded] = useState(false);
    const [isUserMgmtExpanded, setIsUserMgmtExpanded] = useState(false);
    const [isFeedbackInboxExpanded, setIsFeedbackInboxExpanded] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [isEditingAccount, setIsEditingAccount] = useState(false);
    const [editForm, setEditForm] = useState<any>({});
    const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const [support, setSupport] = useState<null | 'list' | 'new'>(null);
    const supportBadge = useSupportBadge(accountInfo?.id, support);
    // a tap on the "Support replied" banner opens the ticket list
    useEffect(() => { if (openSupportKey) { setSupport('list'); onSupportOpened?.(); } }, [openSupportKey]);
    const [showSignOut, setShowSignOut] = useState(false);
    const [signingOut, setSigningOut] = useState(false);
    const confirmSignOut = async () => {
        setSigningOut(true);
        try { await onSignOut(); }
        catch { setSigningOut(false); setShowSignOut(false); }
    };

    const handleCreateProfile = () => { if (newProfileName.trim()) { onAddProfile(newProfileName); setNewProfileName(''); } };
    const startEditingAccount = (e: React.MouseEvent) => { e.stopPropagation(); setEditForm({ ...accountInfo }); setIsEditingAccount(true); setIsAccountExpanded(true); setUsernameAvailable(null); };
    const cancelEditingAccount = () => { setIsEditingAccount(false); setEditForm({}); setUsernameAvailable(null); setIsCheckingUsername(false); };
    const saveEditingAccount = () => { onUpdateAccount(editForm); setIsEditingAccount(false); setUsernameAvailable(null); };

    useEffect(() => {
        if (!isEditingAccount || !editForm.username || editForm.username === accountInfo?.username || editForm.username.length < 4) { setUsernameAvailable(null); setIsCheckingUsername(false); return; }
        setIsCheckingUsername(true);
        const timer = setTimeout(async () => {
            try {
                const { data, error } = await supabase.rpc('username_available', { p_username: editForm.username.trim() });
                setUsernameAvailable(error ? null : !!data);
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
                    <div className="px-5 pt-5 pb-0">
                        <div className="flex items-center gap-2 mb-1 opacity-40">
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
                            <Collapse open={isAccountExpanded}>
                                <div className="px-5 pb-6 pt-2">
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
                            </Collapse>
                        </div>
                    )}

                    <div className="border-b border-white/[0.05] last:border-0">
                        <SectionHeader icon={KeyRound} color="#19b8a6" title="Uni Portal" isExpanded={isPortalExpanded} onToggle={() => setIsPortalExpanded(!isPortalExpanded)} />
                        <Collapse open={isPortalExpanded}><div className="px-5 pb-6 pt-2"><PortalSettings /></div></Collapse>
                    </div>

                    <div className="border-b border-white/[0.05] last:border-0">
                        <SectionHeader icon={Fingerprint} color="#19b8a6" title="Passkeys" isExpanded={isPasskeysExpanded} onToggle={() => setIsPasskeysExpanded(!isPasskeysExpanded)} />
                        <Collapse open={isPasskeysExpanded}><div className="px-5 pb-6 pt-2"><PasskeySettings /></div></Collapse>
                    </div>
                </GroupCard>

                {/* --- ACADEMIC ENGINE GROUP --- */}
                <GroupCard>
                    <div className="px-5 pt-5 pb-0">
                        <div className="flex items-center gap-2 mb-1 opacity-40">
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">Academic Engine</span>
                        </div>
                    </div>

                    <div className="border-b border-white/[0.05] last:border-0">
                        <SectionHeader
                            icon={Layers} color="#19b8a6" title="Schedules & Profiles"
                            isExpanded={isProfilesExpanded} onToggle={() => setIsProfilesExpanded(!isProfilesExpanded)}
                            rightElement={<span className="text-[10px] font-bold text-white/30 bg-white/5 px-2 py-0.5 rounded-md">{profiles.length} Profiles</span>}
                        />
                        <Collapse open={isProfilesExpanded}>
                            <div className="px-5 pb-6 pt-2 space-y-4">
                                <div className="grid gap-2">
                                    {profiles.map(s => (
                                        <div key={s.id} className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${s.id === activeProfileId ? 'bg-teal-500/10 border-teal-500/30' : 'bg-white/5 border-transparent'}`} onClick={() => onSwitchProfile(s.id)}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full ${s.id === activeProfileId ? 'bg-teal-400 animate-pulse' : 'bg-white/20'}`} />
                                                <span className={`text-sm font-bold ${s.id === activeProfileId ? 'text-white' : 'text-white/40'}`}>{s.name}</span>
                                            </div>
                                            {profiles.length > 1 && (
                                                <button onClick={(e) => { e.stopPropagation(); onDeleteProfile(s.id); }} className="p-2 text-white/20 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-teal-500/50" placeholder="Profile name..." value={newProfileName} onChange={e => setNewProfileName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateProfile()} />
                                    <button onClick={handleCreateProfile} className="bg-teal-600 text-white px-4 rounded-xl shadow-lg shadow-teal-900/20 active:scale-95 transition-transform"><Plus size={20} /></button>
                                </div>
                            </div>
                        </Collapse>
                    </div>

                    <div className="border-b border-white/[0.05] last:border-0">
                        <SectionHeader icon={Columns} color="#ec4899" title="Timeline Grid" isExpanded={isScheduleSettingsExpanded} onToggle={() => setIsScheduleSettingsExpanded(!isScheduleSettingsExpanded)} />
                        <Collapse open={isScheduleSettingsExpanded}><div className="px-5 pb-6 pt-2"><ScheduleSettings periods={periods} setPeriods={setPeriods} /></div></Collapse>
                    </div>


                    <div className="border-b border-white/[0.05] last:border-0">
                        <SectionHeader icon={Palette} color="#f59e0b" title="Theme Colors" isExpanded={isColorsExpanded} onToggle={() => setIsColorsExpanded(!isColorsExpanded)} />
                        <Collapse open={isColorsExpanded}>
                            <div className="px-5 pb-6 pt-2 grid grid-cols-2 gap-2">
                                {Object.keys(eventColors).map(key => (
                                    <div key={key} className="bg-black/40 p-2.5 rounded-2xl border border-white/[0.03] flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider pl-1">{key}</span>
                                        <div className="w-6 h-6 rounded-lg overflow-hidden border border-white/10 relative">
                                            <input type="color" value={eventColors[key as EventType]} onChange={(e) => onUpdateColor(key as EventType, e.target.value)} className="absolute inset-[-10px] w-[200%] h-[200%] cursor-pointer border-none p-0" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Collapse>
                    </div>
                </GroupCard>

                {/* --- UTILITIES & SUPPORT GROUP --- */}
                <GroupCard>
                    <div className="px-5 pt-5 pb-0">
                        <div className="flex items-center gap-2 mb-1 opacity-40">
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">System & Support</span>
                        </div>
                    </div>


                    <div className="p-4 px-5 space-y-2">
                        <button onClick={() => setSupport('list')} className="w-full flex items-center justify-between p-4 bg-white/5 rounded-[20px] hover:bg-white/10 transition-all group border border-white/[0.03]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-300 flex items-center justify-center group-hover:scale-110 transition-transform"><LifeBuoy size={20} /></div>
                                <div className="text-left">
                                    <p className="text-[15px] font-bold text-white leading-tight">Support</p>
                                    <p className="text-[11px] text-white/40 font-medium">{supportBadge > 0 ? `${supportBadge} new ${supportBadge === 1 ? 'reply' : 'replies'}` : 'Your tickets and replies'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {supportBadge > 0 && <span className="min-w-[22px] h-[22px] px-1.5 rounded-full text-[12px] font-extrabold flex items-center justify-center" style={{ background: 'var(--cta-bg)', color: 'var(--cta-ink)' }}>{supportBadge}</span>}
                                <ChevronRight size={18} className="text-white/20" />
                            </div>
                        </button>
                        <button onClick={() => setSupport('new')} className="w-full flex items-center justify-between p-4 bg-white/5 rounded-[20px] hover:bg-white/10 transition-all group border border-white/[0.03]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-white/5 text-white/70 flex items-center justify-center group-hover:scale-110 transition-transform"><Plus size={20} /></div>
                                <div className="text-left">
                                    <p className="text-[15px] font-bold text-white leading-tight">New ticket</p>
                                    <p className="text-[11px] text-white/40 font-medium">Report a bug, share an idea or ask</p>
                                </div>
                            </div>
                            <ChevronRight size={18} className="text-white/20" />
                        </button>
                    </div>

                    <div className="p-5 pt-0">
                        <button onClick={() => setShowSignOut(true)} className="w-full py-4 bg-red-500/10 text-red-500 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-red-500/20 transition-all flex items-center justify-center gap-3"><LogOut size={16} /> Sign Out</button>
                        <button onClick={() => setShowResetConfirm(true)} className="w-full py-3 text-white/20 hover:text-white/40 text-[10px] font-bold uppercase tracking-widest transition-colors mt-2">Factory Reset</button>
                    </div>
                </GroupCard>

                {/* --- ADMIN ZONE --- */}
                {accountInfo?.is_admin && (
                    <GroupCard className="border-red-500/20 bg-red-500/[0.02]">
                        <div className="px-5 pt-5 pb-0">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400">Restricted Admin Access</span>
                            </div>
                        </div>

                        <div className="border-b border-red-500/10 last:border-0">
                            <SectionHeader icon={Shield} color="#ef4444" title="User Control" isExpanded={isUserMgmtExpanded} onToggle={() => setIsUserMgmtExpanded(!isUserMgmtExpanded)} />
                            <Collapse open={isUserMgmtExpanded}>
                                <div className="px-5 pb-6 pt-2">
                                    <AdminUsers selfId={accountInfo?.id} />
                                </div>
                            </Collapse>
                        </div>

                        <div className="border-b border-red-500/10 last:border-0">
                            <SectionHeader icon={MessageSquare} color="#3b82f6" title="Feedback Inbox" isExpanded={isFeedbackInboxExpanded} onToggle={() => setIsFeedbackInboxExpanded(!isFeedbackInboxExpanded)} />
                            <Collapse open={isFeedbackInboxExpanded}><div className="px-5 pb-6 pt-2"><AdminInbox /></div></Collapse>
                        </div>
                    </GroupCard>
                )}

                <div className="pb-12" />
            </div>

            <Sheet open={showResetConfirm} onClose={() => setShowResetConfirm(false)}>
                <div className="px-5 pb-6 pt-1 text-center">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: 'var(--surface-2)', color: 'var(--danger)' }}>
                        <AlertTriangle size={26} />
                    </div>
                    <div className="text-[20px] font-extrabold">Factory reset?</div>
                    <p className="mt-1 text-[14px]" style={{ color: 'var(--text-muted)' }}>
                        This permanently wipes <b>all</b> your courses, logs and settings. It can't be undone.
                    </p>
                    <button onClick={() => { setShowResetConfirm(false); onResetApp(); }}
                        className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border-0 py-3.5 text-[16px] font-extrabold text-white" style={{ background: 'var(--danger)' }}>
                        Wipe my data
                    </button>
                    <button onClick={() => setShowResetConfirm(false)}
                        className="mt-2 w-full rounded-2xl border-0 py-3.5 text-[16px] font-bold" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}>
                        Cancel
                    </button>
                </div>
            </Sheet>

            <Support open={support !== null} startNew={support === 'new'} onClose={() => setSupport(null)} userId={accountInfo?.id} />
            <Sheet open={showSignOut} onClose={() => { if (!signingOut) setShowSignOut(false); }}>
                <div className="px-5 pb-6 pt-1 text-center">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: 'var(--surface-2)', color: 'var(--danger)' }}>
                        {signingOut ? <Loader2 size={24} className="animate-spin" /> : <LogOut size={24} />}
                    </div>
                    <div className="text-[20px] font-extrabold">{signingOut ? 'Signing you out…' : 'Sign out?'}</div>
                    <p className="mt-1 text-[14px]" style={{ color: 'var(--text-muted)' }}>
                        {signingOut ? 'Hang tight, this takes a second.' : "You'll need your email or username and password to get back in."}
                    </p>
                    <button onClick={confirmSignOut} disabled={signingOut}
                        className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border-0 py-3.5 text-[16px] font-extrabold text-white disabled:opacity-60" style={{ background: 'var(--danger)' }}>
                        {signingOut ? 'Signing out…' : 'Sign out'}
                    </button>
                    <button onClick={() => setShowSignOut(false)} disabled={signingOut}
                        className="mt-2 w-full rounded-2xl border-0 py-3.5 text-[16px] font-bold disabled:opacity-40" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}>
                        Cancel
                    </button>
                </div>
            </Sheet>
        </div>
    );
};

export default Settings;