import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Palette, Layers, Loader2, LogOut, ChevronDown, AlertTriangle, User, Check, X, Shield, Search, Ban, Send, ArrowLeft, MessageSquare, ChevronRight, Heart, Columns } from 'lucide-react';
import { ScheduleProfile, EventColorMap, EventType, ScheduleEvent, PeriodDefinition, ThemeMode, AppFeedback, FeedbackReply, ViewState } from '../types';
import { theme, styles } from '../theme';
import ScheduleSettings from './ScheduleSettings';
import FeedbackModal from './FeedbackModal';
import AdminInbox from './AdminInbox';

// ─── Design tokens ───────────────────────────────────────────────────────────
const INK       = '#1A1730';
const CARD_BG   = '#FAFAF6';
const HL_YELLOW = '#F6DF63';
const HL_GREEN  = '#8CE3B7';
const HL_BLUE   = '#9ECFFF';
const HL_RED    = '#E56A5A';
const DIVIDER   = 'rgba(26,23,48,0.1)';
const MUTED     = 'rgba(26,23,48,0.5)';

// ─── Shared card style ────────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
    background: CARD_BG,
    border: `1.5px solid ${INK}`,
    borderRadius: 14,
    boxShadow: `4px 5px 0 ${INK}`,
    overflow: 'hidden',
};

// ─── Toggle Switch ────────────────────────────────────────────────────────────
const Toggle = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
    <button
        onClick={onToggle}
        style={{
            width: 44,
            height: 26,
            borderRadius: 999,
            border: `1.5px solid ${INK}`,
            background: on ? HL_GREEN : 'rgba(26,23,48,0.1)',
            position: 'relative',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'background 0.2s',
        }}
    >
        <motion.div
            layout
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            style={{
                position: 'absolute',
                top: 3,
                left: on ? 'calc(100% - 21px)' : 3,
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: INK,
            }}
        />
    </button>
);

// ─── Section label ────────────────────────────────────────────────────────────
const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <p style={{
        fontFamily: "'Instrument Sans', sans-serif",
        fontSize: '0.65rem',
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: MUTED,
        padding: '16px 18px 8px',
    }}>
        {children}
    </p>
);

// ─── Row divider ──────────────────────────────────────────────────────────────
const RowDivider = () => (
    <div style={{ height: 1, background: DIVIDER, margin: '0 18px' }} />
);

// ─── Collapsible section header ───────────────────────────────────────────────
const SectionHeader = ({ icon: Icon, color, title, isExpanded, onToggle, rightElement }: any) => (
    <motion.div
        onClick={onToggle}
        whileTap={{ scale: 0.98 }}
        style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            cursor: 'pointer',
        }}
    >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: `${color}22`,
                color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <Icon size={18} />
            </div>
            <span style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontWeight: 700,
                fontSize: '0.95rem',
                color: INK,
            }}>
                {title}
            </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {rightElement}
            <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.25 }}
                style={{ color: MUTED, display: 'flex' }}
            >
                <ChevronDown size={18} />
            </motion.div>
        </div>
    </motion.div>
);

// ─── Paper card group ─────────────────────────────────────────────────────────
const GroupCard = ({ children, accentColor }: { children: React.ReactNode; accentColor?: string }) => (
    <div style={{
        ...cardStyle,
        ...(accentColor ? { borderColor: accentColor, boxShadow: `4px 5px 0 ${accentColor}` } : {}),
    }}>
        {children}
    </div>
);

// ─── Input style helper ───────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
    background: 'rgba(26,23,48,0.06)',
    border: `1.5px solid ${INK}`,
    borderRadius: 8,
    padding: '10px 14px',
    color: INK,
    fontFamily: "'Instrument Sans', sans-serif",
    fontSize: '0.9rem',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
};

// ─── Primary button ───────────────────────────────────────────────────────────
const PrimaryBtn = ({ onClick, disabled, children, style: extraStyle = {} }: any) => (
    <motion.button
        onClick={onClick}
        disabled={disabled}
        whileHover={!disabled ? { x: -2, y: -2, boxShadow: `7px 7px 0 ${HL_YELLOW}` } : {}}
        whileTap={!disabled ? { x: 2, y: 2, boxShadow: `1px 1px 0 ${HL_YELLOW}` } : {}}
        style={{
            background: INK,
            color: '#fff',
            border: `1.5px solid ${INK}`,
            borderRadius: 10,
            fontWeight: 700,
            boxShadow: `4px 4px 0 ${HL_YELLOW}`,
            cursor: disabled ? 'not-allowed' : 'pointer',
            padding: '10px 18px',
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontSize: '0.85rem',
            opacity: disabled ? 0.5 : 1,
            ...extraStyle,
        }}
    >
        {children}
    </motion.button>
);

// ─── Danger button ────────────────────────────────────────────────────────────
const DangerBtn = ({ onClick, children, style: extraStyle = {} }: any) => (
    <motion.button
        onClick={onClick}
        whileHover={{ x: -2, y: -2, boxShadow: `7px 7px 0 ${INK}` }}
        whileTap={{ x: 2, y: 2, boxShadow: `1px 1px 0 ${INK}` }}
        style={{
            background: HL_RED,
            color: '#fff',
            border: `1.5px solid ${INK}`,
            borderRadius: 10,
            fontWeight: 700,
            boxShadow: `4px 4px 0 ${INK}`,
            cursor: 'pointer',
            padding: '10px 18px',
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontSize: '0.85rem',
            ...extraStyle,
        }}
    >
        {children}
    </motion.button>
);

// ─── Ghost button ─────────────────────────────────────────────────────────────
const GhostBtn = ({ onClick, children, style: extraStyle = {} }: any) => (
    <motion.button
        onClick={onClick}
        whileTap={{ scale: 0.97 }}
        style={{
            background: 'rgba(26,23,48,0.07)',
            color: INK,
            border: `1.5px solid ${INK}`,
            borderRadius: 10,
            fontWeight: 600,
            cursor: 'pointer',
            padding: '10px 18px',
            fontFamily: "'Instrument Sans', sans-serif",
            fontSize: '0.85rem',
            ...extraStyle,
        }}
    >
        {children}
    </motion.button>
);

// ─────────────────────────────────────────────────────────────────────────────
//  SupportHistoryModal
// ─────────────────────────────────────────────────────────────────────────────
const SupportHistoryModal = ({ isOpen, onClose, userId }: { isOpen: boolean; onClose: () => void; userId?: string }) => {
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

    const categoryChip = (cat: string) => {
        const map: Record<string, { bg: string; color: string }> = {
            'Bug': { bg: `${HL_RED}22`, color: HL_RED },
            'Feature Request': { bg: `${HL_GREEN}33`, color: '#1a7a4a' },
        };
        const s = map[cat] || { bg: `${HL_BLUE}33`, color: '#1a4a7a' };
        return (
            <span style={{
                background: s.bg,
                color: s.color,
                fontFamily: "'Instrument Sans', sans-serif",
                fontSize: '0.6rem',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                padding: '2px 8px',
                borderRadius: 6,
                border: `1px solid ${INK}`,
            }}>
                {cat}
            </span>
        );
    };

    return createPortal(
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 16,
                background: 'rgba(26,23,48,0.6)',
            }}
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={e => e.stopPropagation()}
                style={{
                    width: '100%',
                    maxWidth: 440,
                    height: '82vh',
                    background: CARD_BG,
                    borderRadius: 16,
                    border: `1.5px solid ${INK}`,
                    boxShadow: `8px 10px 0 ${INK}`,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderBottom: `1.5px solid ${DIVIDER}`,
                    flexShrink: 0,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {activeTicket ? (
                            <button
                                onClick={() => setActiveTicket(null)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: INK, display: 'flex', padding: 4 }}
                            >
                                <ArrowLeft size={20} />
                            </button>
                        ) : (
                            <div style={{
                                width: 32, height: 32, borderRadius: 8,
                                background: `${HL_BLUE}55`, color: INK,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <MessageSquare size={16} />
                            </div>
                        )}
                        <h3 style={{
                            fontFamily: "'Bricolage Grotesque', sans-serif",
                            fontWeight: 800, fontSize: '1rem', color: INK, margin: 0,
                        }}>
                            {activeTicket ? 'Support Chat' : 'Support Inbox'}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED, display: 'flex' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                    {!activeTicket ? (
                        <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {loading ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                                    <Loader2 className="animate-spin" style={{ color: INK }} />
                                </div>
                            ) : tickets.length === 0 ? (
                                <p style={{ textAlign: 'center', color: MUTED, fontSize: '0.85rem', padding: 32 }}>No support tickets found.</p>
                            ) : (
                                tickets.map(t => (
                                    <motion.div
                                        key={t.id}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setActiveTicket(t)}
                                        style={{
                                            background: CARD_BG,
                                            border: `1.5px solid ${INK}`,
                                            borderRadius: 12,
                                            padding: '12px 14px',
                                            cursor: 'pointer',
                                            boxShadow: `3px 3px 0 ${INK}`,
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                {categoryChip(t.category)}
                                                <span style={{ fontSize: '0.7rem', color: MUTED, fontFamily: "'Instrument Sans', sans-serif" }}>
                                                    {new Date(t.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <ChevronRight size={16} style={{ color: MUTED }} />
                                        </div>
                                        <p style={{ fontSize: '0.88rem', color: INK, fontFamily: "'Instrument Sans', sans-serif", fontWeight: 500, margin: 0, lineHeight: 1.5 }}>
                                            {t.message}
                                        </p>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {/* Original message */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                    <div style={{
                                        background: INK, color: '#fff',
                                        padding: '10px 14px', borderRadius: '12px 12px 2px 12px',
                                        maxWidth: '85%', fontSize: '0.88rem',
                                        fontFamily: "'Instrument Sans', sans-serif", lineHeight: 1.5,
                                    }}>
                                        {activeTicket.message}
                                    </div>
                                    <span style={{ fontSize: '0.65rem', color: MUTED, marginTop: 4, fontFamily: "'Instrument Sans', sans-serif" }}>
                                        {new Date(activeTicket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                {replies.map(reply => {
                                    const isMe = !reply.is_admin;
                                    return (
                                        <div key={reply.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                                            <div style={{
                                                background: isMe ? INK : `${HL_BLUE}55`,
                                                color: isMe ? '#fff' : INK,
                                                border: `1.5px solid ${INK}`,
                                                padding: '10px 14px',
                                                borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                                                maxWidth: '85%', fontSize: '0.88rem',
                                                fontFamily: "'Instrument Sans', sans-serif", lineHeight: 1.5,
                                            }}>
                                                {reply.message}
                                            </div>
                                            <span style={{ fontSize: '0.65rem', color: MUTED, marginTop: 4, fontFamily: "'Instrument Sans', sans-serif" }}>
                                                {isMe ? 'You' : 'Support'} • {new Date(reply.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    );
                                })}
                                <div ref={replyEndRef} />
                            </div>
                            <div style={{ padding: 12, borderTop: `1.5px solid ${DIVIDER}`, flexShrink: 0, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                                <textarea
                                    value={replyText}
                                    onChange={e => setReplyText(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
                                    placeholder="Type a message..."
                                    rows={1}
                                    style={{
                                        ...inputStyle,
                                        resize: 'none',
                                        maxHeight: 100,
                                        minHeight: 42,
                                        flex: 1,
                                        width: 'auto',
                                        borderRadius: 10,
                                    }}
                                />
                                <motion.button
                                    onClick={handleSendReply}
                                    disabled={!replyText.trim() || sendingReply}
                                    whileTap={{ scale: 0.93 }}
                                    style={{
                                        width: 42, height: 42, borderRadius: 10,
                                        border: `1.5px solid ${INK}`,
                                        background: replyText.trim() ? INK : 'rgba(26,23,48,0.1)',
                                        color: replyText.trim() ? '#fff' : MUTED,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: replyText.trim() ? 'pointer' : 'default',
                                        flexShrink: 0,
                                    }}
                                >
                                    {sendingReply ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                </motion.button>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>,
        document.body
    );
};

// ─────────────────────────────────────────────────────────────────────────────
//  BanModal
// ─────────────────────────────────────────────────────────────────────────────
const BanModal = ({ isOpen, onClose, onConfirm, username }: { isOpen: boolean; onClose: () => void; onConfirm: (duration: string | null) => void; username: string }) => {
    if (!isOpen) return null;

    const durationBtnStyle: React.CSSProperties = {
        padding: '10px 8px',
        background: 'rgba(26,23,48,0.07)',
        border: `1.5px solid ${INK}`,
        borderRadius: 8,
        color: INK,
        fontFamily: "'Instrument Sans', sans-serif",
        fontWeight: 600,
        fontSize: '0.85rem',
        cursor: 'pointer',
    };

    return createPortal(
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 16, background: 'rgba(26,23,48,0.6)',
            }}
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={e => e.stopPropagation()}
                style={{
                    ...cardStyle,
                    maxWidth: 320,
                    width: '100%',
                    padding: 24,
                    textAlign: 'center',
                }}
            >
                <div style={{
                    width: 52, height: 52, borderRadius: '50%',
                    background: `${HL_RED}22`,
                    border: `1.5px solid ${INK}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: HL_RED, margin: '0 auto 16px',
                }}>
                    <Ban size={24} />
                </div>
                <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '1.1rem', color: INK, margin: '0 0 8px' }}>
                    Suspend {username}?
                </h3>
                <p style={{ fontSize: '0.85rem', color: MUTED, marginBottom: 20, fontFamily: "'Instrument Sans', sans-serif" }}>
                    Select suspension duration.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                    <button onClick={() => onConfirm('1d')} style={durationBtnStyle}>1 Day</button>
                    <button onClick={() => onConfirm('3d')} style={durationBtnStyle}>3 Days</button>
                    <button onClick={() => onConfirm('1w')} style={durationBtnStyle}>1 Week</button>
                    <button onClick={() => onConfirm('1m')} style={durationBtnStyle}>1 Month</button>
                </div>
                <DangerBtn onClick={() => onConfirm(null)} style={{ width: '100%', marginBottom: 8 }}>
                    Permanent Ban
                </DangerBtn>
                <button
                    onClick={onClose}
                    style={{ width: '100%', padding: '10px', background: 'transparent', color: MUTED, border: 'none', cursor: 'pointer', fontFamily: "'Instrument Sans', sans-serif", fontSize: '0.85rem' }}
                >
                    Cancel
                </button>
            </motion.div>
        </div>,
        document.body
    );
};

// ─────────────────────────────────────────────────────────────────────────────
//  Main Settings component
// ─────────────────────────────────────────────────────────────────────────────

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

const Settings: React.FC<SettingsProps> = ({
    profiles, activeProfileId, eventColors, onAddProfile, onSwitchProfile, onDeleteProfile, onUpdateColor, onResetApp, onSignOut, periods, setPeriods, accountInfo, onUpdateAccount,
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
    const [banModalUser, setBanModalUser] = useState<{ id: string; username: string } | null>(null);
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

    // ─── Shared expand panel styles ───────────────────────────────────────
    const expandedPanelStyle: React.CSSProperties = {
        padding: '0 18px 20px',
    };

    // ─── Info tile ────────────────────────────────────────────────────────
    const InfoTile = ({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) => (
        <div style={{
            background: 'rgba(26,23,48,0.04)',
            border: `1px solid ${DIVIDER}`,
            borderRadius: 10,
            padding: '10px 14px',
        }}>
            <p style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: MUTED, margin: '0 0 4px' }}>
                {label}
            </p>
            {children || <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '0.9rem', color: INK, margin: 0 }}>{value}</p>}
        </div>
    );

    return (
        <div style={styles.scrollableContent}>
            {/* Page header */}
            <header style={{ marginBottom: 28, padding: '0 2px' }}>
                <h1 style={{
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    fontWeight: 800, fontSize: '1.9rem', color: INK,
                    margin: '0 0 4px', letterSpacing: '-0.02em',
                }}>
                    Settings
                </h1>
                <p style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: '0.82rem', color: MUTED, margin: 0 }}>
                    Manage your university operating system
                </p>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* ── PERSONAL & IDENTITY ─────────────────────────────────── */}
                <GroupCard>
                    <SectionLabel>Personal &amp; Identity</SectionLabel>

                    {accountInfo && (
                        <>
                            <SectionHeader
                                icon={User}
                                color={HL_BLUE}
                                title="Account Profile"
                                isExpanded={isAccountExpanded}
                                onToggle={() => setIsAccountExpanded(!isAccountExpanded)}
                                rightElement={!isEditingAccount && (
                                    <motion.button
                                        onClick={startEditingAccount}
                                        whileTap={{ scale: 0.95 }}
                                        style={{
                                            padding: '4px 12px',
                                            background: `${HL_YELLOW}99`,
                                            border: `1.5px solid ${INK}`,
                                            borderRadius: 20,
                                            fontSize: '0.72rem',
                                            fontWeight: 700,
                                            color: INK,
                                            cursor: 'pointer',
                                            fontFamily: "'Instrument Sans', sans-serif",
                                        }}
                                    >
                                        Edit
                                    </motion.button>
                                )}
                            />

                            <AnimatePresence initial={false}>
                                {isAccountExpanded && (
                                    <motion.div
                                        key="account-panel"
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.25 }}
                                        style={{ overflow: 'hidden' }}
                                    >
                                        <div style={expandedPanelStyle}>
                                            {isEditingAccount && (
                                                <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                                                    <PrimaryBtn onClick={saveEditingAccount} disabled={isSaveDisabled} style={{ flex: 1 }}>
                                                        Save Changes
                                                    </PrimaryBtn>
                                                    <GhostBtn onClick={cancelEditingAccount} style={{ flex: 1 }}>
                                                        Cancel
                                                    </GhostBtn>
                                                </div>
                                            )}
                                            <div style={{ display: 'grid', gap: 10 }}>
                                                {/* Username */}
                                                <InfoTile label="Username">
                                                    {isEditingAccount ? (
                                                        <div style={{ position: 'relative' }}>
                                                            <input
                                                                value={editForm.username}
                                                                onChange={e => setEditForm({ ...editForm, username: e.target.value })}
                                                                disabled={!canEditUsername}
                                                                style={{ ...inputStyle, padding: '6px 0', background: 'transparent', border: 'none', borderBottom: `1.5px solid ${INK}`, borderRadius: 0, fontWeight: 700, fontSize: '0.9rem' }}
                                                            />
                                                            {isCheckingUsername && <Loader2 size={12} className="animate-spin" style={{ position: 'absolute', right: 0, top: 8, color: MUTED }} />}
                                                            {usernameAvailable === true && <Check size={12} style={{ position: 'absolute', right: 0, top: 8, color: '#1a7a4a' }} />}
                                                            {usernameAvailable === false && <X size={12} style={{ position: 'absolute', right: 0, top: 8, color: HL_RED }} />}
                                                        </div>
                                                    ) : (
                                                        <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '0.9rem', color: INK, margin: 0 }}>{accountInfo.username}</p>
                                                    )}
                                                </InfoTile>

                                                {/* Email */}
                                                <InfoTile label="Email Address" value={accountInfo.email} />

                                                {/* Gender + Year */}
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                                    <InfoTile label="Gender">
                                                        {isEditingAccount ? (
                                                            <select
                                                                value={editForm.gender || ''}
                                                                onChange={e => setEditForm({ ...editForm, gender: e.target.value })}
                                                                style={{ background: 'transparent', border: 'none', borderBottom: `1.5px solid ${INK}`, color: INK, fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '0.9rem', outline: 'none', width: '100%', padding: '2px 0' }}
                                                            >
                                                                <option value="male">Male</option>
                                                                <option value="female">Female</option>
                                                            </select>
                                                        ) : <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '0.9rem', color: INK, margin: 0 }}>{accountInfo.gender || '—'}</p>}
                                                    </InfoTile>
                                                    <InfoTile label="Year">
                                                        {isEditingAccount ? (
                                                            <select
                                                                value={editForm.year || ''}
                                                                onChange={e => setEditForm({ ...editForm, year: e.target.value })}
                                                                style={{ background: 'transparent', border: 'none', borderBottom: `1.5px solid ${INK}`, color: INK, fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '0.9rem', outline: 'none', width: '100%', padding: '2px 0' }}
                                                            >
                                                                <option value="1">Year 1</option>
                                                                <option value="2">Year 2</option>
                                                                <option value="3">Year 3</option>
                                                                <option value="4">Year 4</option>
                                                                <option value="5">Year 5+</option>
                                                            </select>
                                                        ) : <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '0.9rem', color: INK, margin: 0 }}>Year {accountInfo.year || '—'}</p>}
                                                    </InfoTile>
                                                </div>

                                                {/* College / Major */}
                                                <InfoTile label="College / Major">
                                                    <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '0.9rem', color: INK, margin: 0 }}>
                                                        {accountInfo.college || 'Not set'} &bull; <span style={{ color: MUTED }}>{accountInfo.major || 'Not set'}</span>
                                                    </p>
                                                </InfoTile>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </>
                    )}
                </GroupCard>

                {/* ── ACADEMIC ENGINE ──────────────────────────────────────── */}
                <GroupCard>
                    <SectionLabel>Academic Engine</SectionLabel>

                    {/* Schedules & Profiles */}
                    <SectionHeader
                        icon={Layers}
                        color="#8b5cf6"
                        title="Schedules & Profiles"
                        isExpanded={isProfilesExpanded}
                        onToggle={() => setIsProfilesExpanded(!isProfilesExpanded)}
                        rightElement={
                            <span style={{
                                fontSize: '0.65rem', fontWeight: 700, color: MUTED,
                                background: 'rgba(26,23,48,0.07)',
                                border: `1px solid ${DIVIDER}`,
                                borderRadius: 6, padding: '2px 8px',
                                fontFamily: "'Instrument Sans', sans-serif",
                            }}>
                                {profiles.length} Profiles
                            </span>
                        }
                    />
                    <AnimatePresence initial={false}>
                        {isProfilesExpanded && (
                            <motion.div key="profiles-panel" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} style={{ overflow: 'hidden' }}>
                                <div style={{ ...expandedPanelStyle, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {profiles.map(s => (
                                            <motion.div
                                                key={s.id}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => onSwitchProfile(s.id)}
                                                style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                    padding: '10px 14px',
                                                    borderRadius: 10,
                                                    border: `1.5px solid ${s.id === activeProfileId ? INK : DIVIDER}`,
                                                    background: s.id === activeProfileId ? `${HL_YELLOW}55` : 'transparent',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div style={{
                                                        width: 8, height: 8, borderRadius: '50%',
                                                        background: s.id === activeProfileId ? INK : DIVIDER,
                                                    }} />
                                                    <span style={{
                                                        fontFamily: "'Bricolage Grotesque', sans-serif",
                                                        fontWeight: 700, fontSize: '0.9rem',
                                                        color: s.id === activeProfileId ? INK : MUTED,
                                                    }}>
                                                        {s.name}
                                                    </span>
                                                </div>
                                                {profiles.length > 1 && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onDeleteProfile(s.id); }}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED, display: 'flex', padding: 4 }}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </motion.div>
                                        ))}
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <input
                                            style={{ ...inputStyle, flex: 1, width: 'auto' }}
                                            placeholder="Profile name..."
                                            value={newProfileName}
                                            onChange={e => setNewProfileName(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleCreateProfile()}
                                        />
                                        <PrimaryBtn onClick={handleCreateProfile} style={{ padding: '10px 16px' }}>
                                            <Plus size={18} />
                                        </PrimaryBtn>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <RowDivider />

                    {/* Timeline Grid */}
                    <SectionHeader
                        icon={Columns}
                        color="#ec4899"
                        title="Timeline Grid"
                        isExpanded={isScheduleSettingsExpanded}
                        onToggle={() => setIsScheduleSettingsExpanded(!isScheduleSettingsExpanded)}
                    />
                    <AnimatePresence initial={false}>
                        {isScheduleSettingsExpanded && (
                            <motion.div key="timeline-panel" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} style={{ overflow: 'hidden' }}>
                                <div style={expandedPanelStyle}>
                                    <ScheduleSettings periods={periods} setPeriods={setPeriods} />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <RowDivider />

                    {/* Theme Colors */}
                    <SectionHeader
                        icon={Palette}
                        color="#f59e0b"
                        title="Theme Colors"
                        isExpanded={isColorsExpanded}
                        onToggle={() => setIsColorsExpanded(!isColorsExpanded)}
                    />
                    <AnimatePresence initial={false}>
                        {isColorsExpanded && (
                            <motion.div key="colors-panel" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} style={{ overflow: 'hidden' }}>
                                <div style={{ ...expandedPanelStyle, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                    {Object.keys(eventColors).map(key => (
                                        <div
                                            key={key}
                                            style={{
                                                background: 'rgba(26,23,48,0.04)',
                                                border: `1px solid ${DIVIDER}`,
                                                borderRadius: 10,
                                                padding: '10px 12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                            }}
                                        >
                                            <span style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: '0.72rem', fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                {key}
                                            </span>
                                            <div style={{ width: 24, height: 24, borderRadius: 6, overflow: 'hidden', border: `1.5px solid ${INK}`, position: 'relative' }}>
                                                <input
                                                    type="color"
                                                    value={eventColors[key as EventType]}
                                                    onChange={(e) => onUpdateColor(key as EventType, e.target.value)}
                                                    style={{ position: 'absolute', inset: -10, width: '200%', height: '200%', cursor: 'pointer', border: 'none', padding: 0 }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </GroupCard>

                {/* ── SYSTEM & SUPPORT ─────────────────────────────────────── */}
                <GroupCard>
                    <SectionLabel>System &amp; Support</SectionLabel>

                    {/* Support Tickets */}
                    <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setIsHistoryModalOpen(true)}
                        style={{
                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${HL_BLUE}55`, border: `1px solid ${DIVIDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: INK }}>
                                <MessageSquare size={18} />
                            </div>
                            <div style={{ textAlign: 'left' }}>
                                <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '0.95rem', color: INK, margin: 0 }}>Support Tickets</p>
                                <p style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: '0.72rem', color: MUTED, margin: 0 }}>History &amp; Communications</p>
                            </div>
                        </div>
                        <ChevronRight size={16} style={{ color: MUTED }} />
                    </motion.button>

                    <RowDivider />

                    {/* New Ticket */}
                    <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setIsFeedbackModalOpen(true)}
                        style={{
                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${HL_GREEN}55`, border: `1px solid ${DIVIDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: INK }}>
                                <Plus size={18} />
                            </div>
                            <div style={{ textAlign: 'left' }}>
                                <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '0.95rem', color: INK, margin: 0 }}>New Ticket</p>
                                <p style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: '0.72rem', color: MUTED, margin: 0 }}>Feature Request or Bug Report</p>
                            </div>
                        </div>
                        <ChevronRight size={16} style={{ color: MUTED }} />
                    </motion.button>

                    {/* Sign Out + Factory Reset */}
                    <div style={{ padding: '8px 18px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <DangerBtn onClick={onSignOut} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            <LogOut size={16} /> Sign Out
                        </DangerBtn>
                        <button
                            onClick={() => setShowResetConfirm(true)}
                            style={{
                                width: '100%', padding: '10px', background: 'transparent',
                                color: MUTED, border: 'none', cursor: 'pointer',
                                fontFamily: "'Instrument Sans', sans-serif",
                                fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                            }}
                        >
                            Factory Reset
                        </button>
                    </div>
                </GroupCard>

                {/* ── ADMIN ZONE ───────────────────────────────────────────── */}
                {accountInfo?.is_admin && (
                    <GroupCard accentColor={HL_RED}>
                        <div style={{ padding: '14px 18px 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: HL_RED }} className="animate-pulse" />
                            <span style={{
                                fontFamily: "'Instrument Sans', sans-serif",
                                fontSize: '0.65rem', fontWeight: 700,
                                letterSpacing: '0.08em', textTransform: 'uppercase',
                                color: HL_RED,
                            }}>
                                Restricted Admin Access
                            </span>
                        </div>

                        {/* User Control */}
                        <SectionHeader
                            icon={Shield}
                            color={HL_RED}
                            title="User Control"
                            isExpanded={isUserMgmtExpanded}
                            onToggle={() => setIsUserMgmtExpanded(!isUserMgmtExpanded)}
                        />
                        <AnimatePresence initial={false}>
                            {isUserMgmtExpanded && (
                                <motion.div key="user-control-panel" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} style={{ overflow: 'hidden' }}>
                                    <div style={{ ...expandedPanelStyle }}>
                                        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                                            <input
                                                placeholder="Search username..."
                                                value={userSearch}
                                                onChange={(e) => setUserSearch(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && fetchUsers(userSearch)}
                                                style={{ ...inputStyle, flex: 1, width: 'auto' }}
                                            />
                                            <motion.button
                                                onClick={() => fetchUsers(userSearch)}
                                                whileTap={{ scale: 0.95 }}
                                                style={{
                                                    background: INK, color: '#fff',
                                                    border: `1.5px solid ${INK}`,
                                                    borderRadius: 8, padding: '0 12px',
                                                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                                                }}
                                            >
                                                <Search size={18} />
                                            </motion.button>
                                        </div>
                                        {isLoadingUsers ? (
                                            <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
                                                <Loader2 className="animate-spin" style={{ color: MUTED }} />
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                                                {users.map(user => (
                                                    <div
                                                        key={user.id}
                                                        style={{
                                                            background: 'rgba(26,23,48,0.04)',
                                                            border: `1px solid ${DIVIDER}`,
                                                            borderRadius: 10,
                                                            padding: '10px 14px',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                        }}
                                                    >
                                                        <div>
                                                            <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '0.88rem', color: INK, margin: 0 }}>{user.username}</p>
                                                            <p style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: '0.7rem', color: MUTED, margin: 0, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: 6 }}>
                                                            {user.is_banned ? (
                                                                <button
                                                                    onClick={() => unbanUser(user.id)}
                                                                    style={{ padding: 6, background: `${HL_GREEN}55`, border: `1px solid ${INK}`, borderRadius: 8, color: INK, cursor: 'pointer', display: 'flex' }}
                                                                >
                                                                    <Check size={14} />
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => setBanModalUser({ id: user.id, username: user.username })}
                                                                    style={{ padding: 6, background: 'rgba(26,23,48,0.07)', border: `1px solid ${DIVIDER}`, borderRadius: 8, color: MUTED, cursor: 'pointer', display: 'flex' }}
                                                                >
                                                                    <Ban size={14} />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => deleteUser(user.id)}
                                                                style={{ padding: 6, background: `${HL_RED}22`, border: `1px solid ${HL_RED}`, borderRadius: 8, color: HL_RED, cursor: 'pointer', display: 'flex' }}
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <RowDivider />

                        {/* Feedback Inbox */}
                        <SectionHeader
                            icon={MessageSquare}
                            color={HL_BLUE}
                            title="Feedback Inbox"
                            isExpanded={isFeedbackInboxExpanded}
                            onToggle={() => setIsFeedbackInboxExpanded(!isFeedbackInboxExpanded)}
                        />
                        <AnimatePresence initial={false}>
                            {isFeedbackInboxExpanded && (
                                <motion.div key="feedback-inbox-panel" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} style={{ overflow: 'hidden' }}>
                                    <div style={expandedPanelStyle}>
                                        <AdminInbox />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </GroupCard>
                )}

                {/* ── Footer ───────────────────────────────────────────────── */}
                <div style={{ paddingBottom: 48, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '6px 16px',
                        background: CARD_BG,
                        border: `1.5px solid ${INK}`,
                        borderRadius: 999,
                        boxShadow: `2px 2px 0 ${INK}`,
                    }}>
                        <Heart size={11} style={{ color: HL_RED, fill: HL_RED }} />
                        <span style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: MUTED }}>
                            VERSION 3.5 &bull; Made with PASSION
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: 20 }}>
                        <a href="#" style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: '0.7rem', fontWeight: 700, color: MUTED, textDecoration: 'underline' }}>Terms of Service</a>
                        <a href="#" style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: '0.7rem', fontWeight: 700, color: MUTED, textDecoration: 'underline' }}>Privacy Policy</a>
                        <a href="https://paypal.me/OmarRaslan298" target="_blank" rel="noopener noreferrer" style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: '0.7rem', fontWeight: 700, color: INK, textDecoration: 'underline' }}>Support Me</a>
                    </div>
                </div>
            </div>

            {/* ── Factory Reset Modal ───────────────────────────────────── */}
            <AnimatePresence>
                {showResetConfirm && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(26,23,48,0.6)' }}>
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            style={{ ...cardStyle, maxWidth: 340, width: '100%', padding: 28, textAlign: 'center' }}
                        >
                            <div style={{
                                width: 60, height: 60, borderRadius: '50%',
                                background: `${HL_RED}22`,
                                border: `1.5px solid ${INK}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: HL_RED, margin: '0 auto 20px',
                            }}>
                                <AlertTriangle size={28} />
                            </div>
                            <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '1.2rem', color: INK, margin: '0 0 10px' }}>
                                Factory Reset?
                            </h3>
                            <p style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: '0.88rem', color: MUTED, lineHeight: 1.6, margin: '0 0 24px' }}>
                                This will permanently wipe <strong>all</strong> your courses, logs, and settings. This cannot be undone.
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <DangerBtn
                                    onClick={() => { onResetApp(); setShowResetConfirm(false); }}
                                    style={{ width: '100%' }}
                                >
                                    Wipe Data
                                </DangerBtn>
                                <GhostBtn onClick={() => setShowResetConfirm(false)} style={{ width: '100%' }}>
                                    Cancel
                                </GhostBtn>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <FeedbackModal isOpen={isFeedbackModalOpen} onClose={() => setIsFeedbackModalOpen(false)} userId={accountInfo?.id} />
            <SupportHistoryModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} userId={accountInfo?.id} />
            <BanModal isOpen={!!banModalUser} username={banModalUser?.username || ''} onClose={() => setBanModalUser(null)} onConfirm={handleBanConfirm} />
        </div>
    );
};

export default Settings;