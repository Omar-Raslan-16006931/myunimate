import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, Bug, ChevronLeft, ChevronRight, HelpCircle, LifeBuoy, Lightbulb, Loader2, Plus, RotateCw, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Sheet from './Sheet';
import { supabase } from '../lib/supabase';
import { AppFeedback, FeedbackReply } from '../types';
import {
  MAX_MESSAGE, MIN_TICKET, TicketKind, TicketSummary, createTicket, friendlyError, getReplies,
  hasNewReply, listTickets, markSeen, readSeen, sendReply, summarize, ticketCode, ticketTitle,
} from '../services/support';

// ── look ──
const field: React.CSSProperties = { background: 'var(--sheet-field)', border: '1px solid var(--line)' };
const muted: React.CSSProperties = { color: 'var(--text-muted)' };
const cta: React.CSSProperties = { background: 'var(--cta-bg)', color: 'var(--cta-ink)' };

const KINDS: { value: TicketKind; label: string; sub: string; icon: React.ElementType; tint: string; hint: string }[] = [
  { value: 'Bug', label: 'Bug', sub: 'Something broke', icon: Bug, tint: '#ff6b6b', hint: 'What happened, and what did you expect? Steps help a lot.' },
  { value: 'Feature Request', label: 'Idea', sub: 'Make it better', icon: Lightbulb, tint: '#f5b84a', hint: 'What would you like UniMate to do?' },
  { value: 'Other', label: 'Question', sub: 'Ask anything', icon: HelpCircle, tint: '#2ee6d6', hint: 'How can we help?' },
];
const kindOf = (c: string) => KINDS.find(k => k.value === c) || KINDS[2];

// ── time words ──
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const ago = (iso: string) => {
  const d = new Date(iso), now = new Date();
  const s = Math.max(0, (now.getTime() - d.getTime()) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (sameDay(d, now)) return `${Math.floor(s / 3600)}h`;
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (sameDay(d, y)) return 'Yesterday';
  if (s < 6 * 86400) return d.toLocaleDateString(undefined, { weekday: 'short' });
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};
const dayLabel = (iso: string) => {
  const d = new Date(iso), now = new Date();
  if (sameDay(d, now)) return 'Today';
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (sameDay(d, y)) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
};
const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const finePointer = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: fine)').matches;

// ── small parts ──
const TopBar: React.FC<{ left: React.ReactNode; title: React.ReactNode; right?: React.ReactNode }> = ({ left, title, right }) => (
  <div className="grid shrink-0 grid-cols-[80px_1fr_80px] items-center px-4 pb-2.5">
    <div className="justify-self-start">{left}</div>
    <div className="min-w-0 text-center">{title}</div>
    <div className="justify-self-end">{right}</div>
  </div>
);

const TextButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, className = '', ...rest }) => (
  <button {...rest} className={`flex items-center border-0 bg-transparent p-1 text-[16px] font-semibold active:opacity-60 ${className}`} style={muted}>
    {children}
  </button>
);

const KindIcon: React.FC<{ category: string; size?: number }> = ({ category, size = 40 }) => {
  const k = kindOf(category);
  const Icon = k.icon;
  return (
    <div className="flex shrink-0 items-center justify-center rounded-[13px]" style={{ width: size, height: size, background: `${k.tint}1f`, color: k.tint }}>
      <Icon size={Math.round(size * 0.48)} />
    </div>
  );
};

const StatusPill: React.FC<{ t: TicketSummary; fresh: boolean }> = ({ t, fresh }) => {
  if (fresh) return <span className="rounded-full px-2 py-[3px] text-[11px] font-extrabold" style={cta}>New reply</span>;
  if (t.lastFromSupport) return <span className="rounded-full px-2 py-[3px] text-[11px] font-bold" style={{ background: 'rgba(46,230,214,0.12)', color: 'var(--cta-bg)' }}>Replied</span>;
  return <span className="rounded-full px-2 py-[3px] text-[11px] font-bold" style={{ background: 'var(--surface-2)', ...muted }}>Waiting</span>;
};

/** Text box that grows with the text, up to a few lines. */
const GrowingInput: React.FC<{
  value: string; onChange: (v: string) => void; onSubmit?: () => void; placeholder: string; maxRows?: number; autoFocus?: boolean; minRows?: number;
}> = ({ value, onChange, onSubmit, placeholder, maxRows = 6, minRows = 1, autoFocus }) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    const line = 22;
    el.style.height = Math.min(Math.max(el.scrollHeight, line * minRows + 20), line * maxRows + 20) + 'px';
  }, [value, maxRows, minRows]);
  return (
    <textarea
      ref={ref}
      value={value}
      autoFocus={autoFocus}
      maxLength={MAX_MESSAGE}
      rows={minRows}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => {
        // Enter sends on a keyboard + mouse; on phones Enter makes a new line
        if (onSubmit && e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && finePointer()) { e.preventDefault(); onSubmit(); }
      }}
      className="block w-full resize-none border-0 bg-transparent px-3.5 py-2.5 text-[16px] leading-[22px] outline-none placeholder:opacity-50"
      style={{ color: 'var(--text-primary)' }}
    />
  );
};

// ── one unique channel name per open, so two screens never share a channel ──
const channelName = (base: string) => `${base}_${Math.random().toString(36).slice(2, 10)}`;

type Pending = { key: string; message: string; state: 'sending' | 'failed' };

const slide = {
  initial: (dir: number) => ({ opacity: 0, x: 24 * dir }),
  animate: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: -24 * dir }),
};

// ═════════════════════════════════════════════════════════════════════════════

const Support: React.FC<{
  open: boolean;
  onClose: () => void;
  userId?: string;
  /** open straight on "New ticket" */
  startNew?: boolean;
}> = ({ open, onClose, userId, startNew }) => {
  const [view, setView] = useState<'list' | 'new' | 'thread'>('list');
  const [dir, setDir] = useState(1);
  const [tickets, setTickets] = useState<TicketSummary[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [seen, setSeen] = useState<Record<string, string>>({});
  const [active, setActive] = useState<AppFeedback | null>(null);
  const [justOpened, setJustOpened] = useState(false);

  const go = (v: typeof view, d = 1) => { setDir(d); setView(v); };

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      setListError(null);
      setTickets(await listTickets(userId));
      setSeen(readSeen(userId));
    } catch (e) {
      setListError(friendlyError(e));
      setTickets(prev => prev ?? []);
    }
  }, [userId]);

  // reset to the right screen every time the sheet opens
  useEffect(() => {
    if (!open) return;
    setActive(null);
    setJustOpened(false);
    setDir(1);
    setView(startNew ? 'new' : 'list');
    load();
  }, [open, startNew, load]);

  // live updates for the list: new replies and status changes
  useEffect(() => {
    if (!open || !userId) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => { clearTimeout(t); t = setTimeout(load, 300); };
    const ch = supabase.channel(channelName(`support_list_${userId}`))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_feedback', filter: `user_id=eq.${userId}` }, refresh)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feedback_replies' }, refresh)
      .subscribe();
    return () => { clearTimeout(t); supabase.removeChannel(ch); };
  }, [open, userId, load]);

  const openTicket = (t: AppFeedback, fresh = false) => {
    setActive(t);
    setJustOpened(fresh);
    go('thread', 1);
  };

  const backToList = () => {
    go('list', -1);
    if (userId) setSeen(readSeen(userId));
    load();
  };

  const newCount = useMemo(() => (tickets || []).filter(t => hasNewReply(t, seen)).length, [tickets, seen]);

  return (
    <Sheet open={open} onClose={onClose} size="tall">
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          {view === 'list' && (
            <motion.div key="list" custom={dir} variants={slide} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.18 }} className="flex min-h-0 flex-1 flex-col">
              <TicketList
                tickets={tickets}
                error={listError}
                seen={seen}
                newCount={newCount}
                onClose={onClose}
                onNew={() => go('new', 1)}
                onOpen={t => openTicket(t)}
                onRetry={load}
              />
            </motion.div>
          )}
          {view === 'new' && userId && (
            <motion.div key="new" custom={dir} variants={slide} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.18 }} className="flex min-h-0 flex-1 flex-col">
              <NewTicket
                userId={userId}
                onCancel={startNew && !tickets?.length ? onClose : () => go('list', -1)}
                cancelLabel={startNew && !tickets?.length ? 'Cancel' : 'Back'}
                onCreated={t => { setTickets(prev => [summarize(t, []), ...(prev || [])]); openTicket(t, true); }}
              />
            </motion.div>
          )}
          {view === 'thread' && active && userId && (
            <motion.div key={`thread_${active.id}`} custom={dir} variants={slide} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.18 }} className="flex min-h-0 flex-1 flex-col">
              <Thread userId={userId} ticket={active} justOpened={justOpened} onBack={backToList} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Sheet>
  );
};

export default Support;

// ═══ list ════════════════════════════════════════════════════════════════════

const TicketList: React.FC<{
  tickets: TicketSummary[] | null; error: string | null; seen: Record<string, string>; newCount: number;
  onClose: () => void; onNew: () => void; onOpen: (t: TicketSummary) => void; onRetry: () => void;
}> = ({ tickets, error, seen, newCount, onClose, onNew, onOpen, onRetry }) => (
  <>
    <TopBar
      left={<TextButton onClick={onClose}>Close</TextButton>}
      title={<span className="text-[17px] font-extrabold">Support</span>}
      right={tickets && tickets.length > 0 ? (
        <button onClick={onNew} aria-label="New ticket" className="flex h-9 w-9 items-center justify-center rounded-full border-0 active:scale-95" style={cta}>
          <Plus size={20} strokeWidth={2.6} />
        </button>
      ) : <span />}
    />

    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-10">
      {tickets === null ? (
        <div className="space-y-2.5 pt-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex animate-pulse items-center gap-3 rounded-[20px] p-3.5" style={field}>
              <div className="h-10 w-10 rounded-[13px]" style={{ background: 'var(--surface-2)' }} />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-2/3 rounded-full" style={{ background: 'var(--surface-2)' }} />
                <div className="h-2.5 w-1/3 rounded-full" style={{ background: 'var(--surface-2)' }} />
              </div>
            </div>
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center px-4 pt-[12vh] text-center">
          <div className="flex h-[72px] w-[72px] items-center justify-center rounded-[22px]" style={{ background: 'var(--surface-2)', color: 'var(--cta-bg)' }}>
            <LifeBuoy size={34} />
          </div>
          <div className="mt-5 text-[22px] font-extrabold">How can we help?</div>
          <p className="mt-1.5 max-w-[280px] text-[15px] leading-snug" style={muted}>
            Report a bug, share an idea or ask a question. A real person reads every ticket.
          </p>
          {error && <p className="mt-3 text-[13px] font-semibold" style={{ color: 'var(--danger)' }}>{error}</p>}
          <button onClick={error ? onRetry : onNew} className="mt-6 w-full max-w-[320px] rounded-2xl border-0 py-3.5 text-[16px] font-extrabold active:scale-[0.98]" style={cta}>
            {error ? 'Try again' : 'New ticket'}
          </button>
        </div>
      ) : (
        <>
          {error && (
            <button onClick={onRetry} className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl border-0 py-2.5 text-[13px] font-bold" style={{ background: 'rgba(255,90,95,0.12)', color: 'var(--danger)' }}>
              <RotateCw size={14} /> {error} Tap to retry.
            </button>
          )}
          <div className="mb-2 mt-1 px-1 text-[12px] font-bold uppercase tracking-[0.08em]" style={muted}>
            {newCount > 0 ? `${newCount} new ${newCount === 1 ? 'reply' : 'replies'}` : 'Your tickets'}
          </div>
          <motion.div className="space-y-2" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.035 } } }}>
            {tickets.map(t => {
              const fresh = hasNewReply(t, seen);
              return (
                <motion.button
                  key={t.id}
                  variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
                  onClick={() => onOpen(t)}
                  className="flex w-full items-center gap-3 rounded-[20px] p-3.5 text-left active:scale-[0.985]"
                  style={{ ...field, borderColor: fresh ? 'rgba(46,230,214,0.45)' : 'var(--line)' }}
                >
                  <KindIcon category={t.category} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`min-w-0 flex-1 truncate text-[15px] ${fresh ? 'font-extrabold' : 'font-bold'}`} style={{ color: 'var(--text-primary)' }}>{ticketTitle(t.message)}</span>
                      <span className="shrink-0 text-[12px] font-semibold" style={muted}>{ago(t.lastAt)}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-[13px]" style={muted}>
                        {t.replyCount > 0 ? `${t.lastFromSupport ? 'Support' : 'You'}: ${t.lastMessage.replace(/\s+/g, ' ')}` : `${kindOf(t.category).label} · ${ticketCode(t.id)}`}
                      </span>
                      <StatusPill t={t} fresh={fresh} />
                    </div>
                  </div>
                  <ChevronRight size={16} className="shrink-0 opacity-30" />
                </motion.button>
              );
            })}
          </motion.div>
        </>
      )}
    </div>
  </>
);

// ═══ new ticket ══════════════════════════════════════════════════════════════

const NewTicket: React.FC<{ userId: string; onCancel: () => void; cancelLabel: string; onCreated: (t: AppFeedback) => void }> = ({ userId, onCancel, cancelLabel, onCreated }) => {
  const [kind, setKind] = useState<TicketKind>('Bug');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const len = text.trim().length;
  const ready = len >= MIN_TICKET && !busy;

  const submit = async () => {
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      const t = await createTicket(userId, kind, text);
      toast.success(`Ticket ${ticketCode(t.id)} sent`);
      onCreated(t);
    } catch (e) {
      setError(friendlyError(e));
      setBusy(false);
    }
  };

  return (
    <>
      <TopBar
        left={<TextButton onClick={onCancel} disabled={busy}>{cancelLabel === 'Back' ? <><ChevronLeft size={18} /> Back</> : 'Cancel'}</TextButton>}
        title={<span className="text-[17px] font-extrabold">New ticket</span>}
      />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
        <div className="mt-1 text-[13px] font-bold uppercase tracking-[0.08em]" style={muted}>What’s this about?</div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {KINDS.map(k => {
            const on = kind === k.value;
            const Icon = k.icon;
            return (
              <button key={k.value} onClick={() => setKind(k.value)} aria-pressed={on}
                className="flex flex-col items-center rounded-[18px] px-1 pb-3 pt-3.5 transition-transform active:scale-[0.97]"
                style={{ background: on ? `${k.tint}1a` : 'var(--sheet-field)', border: `1.5px solid ${on ? k.tint : 'var(--line)'}` }}>
                <Icon size={22} style={{ color: k.tint }} />
                <span className="mt-1.5 text-[14px] font-extrabold" style={{ color: 'var(--text-primary)' }}>{k.label}</span>
                <span className="text-[11px] font-semibold" style={muted}>{k.sub}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 text-[13px] font-bold uppercase tracking-[0.08em]" style={muted}>Message</div>
        <div className="mt-2 rounded-[18px]" style={field}>
          <GrowingInput value={text} onChange={v => { setText(v); setError(null); }} placeholder={kindOf(kind).hint} minRows={6} maxRows={12} />
          <div className="flex items-center justify-between px-3.5 pb-2.5 text-[12px] font-semibold" style={muted}>
            <span>{len > 0 && len < MIN_TICKET ? `${MIN_TICKET - len} more characters` : ' '}</span>
            <span style={text.length > MAX_MESSAGE - 100 ? { color: 'var(--danger)' } : undefined}>{text.length}/{MAX_MESSAGE}</span>
          </div>
        </div>
        <p className="mt-2.5 px-1 text-[13px] leading-snug" style={muted}>
          Replies show up right here in Support. Please don’t share passwords.
        </p>
        {error && <p className="mt-2 px-1 text-[13px] font-semibold" style={{ color: 'var(--danger)' }}>{error}</p>}
      </div>
      <div className="shrink-0 px-4 pb-6 pt-2">
        <button onClick={submit} disabled={!ready}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-0 py-3.5 text-[16px] font-extrabold transition-opacity active:scale-[0.98] disabled:opacity-40" style={cta}>
          {busy ? <><Loader2 size={18} className="animate-spin" /> Sending…</> : 'Send ticket'}
        </button>
      </div>
    </>
  );
};

// ═══ conversation ════════════════════════════════════════════════════════════

type Bubble =
  | { kind: 'day'; key: string; label: string }
  | { kind: 'msg'; key: string; mine: boolean; text: string; at?: string; state?: Pending['state']; pendingKey?: string; first?: boolean; lastInGroup: boolean };

const Thread: React.FC<{ userId: string; ticket: AppFeedback; justOpened: boolean; onBack: () => void }> = ({ userId, ticket, justOpened, onBack }) => {
  const [replies, setReplies] = useState<FeedbackReply[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const firstScroll = useRef(true);

  const addReply = (r: FeedbackReply) =>
    setReplies(prev => (prev || []).some(x => x.id === r.id) ? prev : [...(prev || []), r].sort((a, b) => a.created_at.localeCompare(b.created_at)));

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      const rows = await getReplies(ticket.id);
      setReplies(prev => {
        // keep anything that arrived live while loading
        const extra = (prev || []).filter(p => !rows.some(r => r.id === p.id));
        return [...rows, ...extra].sort((a, b) => a.created_at.localeCompare(b.created_at));
      });
    } catch (e) {
      setLoadError(friendlyError(e));
      setReplies(prev => prev ?? []);
    }
  }, [ticket.id]);

  useEffect(() => {
    load();
    const ch = supabase.channel(channelName(`support_thread_${ticket.id}`))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feedback_replies', filter: `feedback_id=eq.${ticket.id}` },
        (p: any) => addReply(p.new as FeedbackReply))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [ticket.id, load]);

  // opening the conversation counts as reading it
  useEffect(() => {
    const last = replies?.[replies.length - 1];
    markSeen(userId, ticket.id, last ? last.created_at : ticket.created_at);
  }, [replies, userId, ticket.id, ticket.created_at]);

  useEffect(() => {
    if (replies === null) return;
    bottomRef.current?.scrollIntoView({ behavior: firstScroll.current ? 'auto' : 'smooth', block: 'end' });
    firstScroll.current = false;
  }, [replies, pending]);

  const deliver = async (key: string, message: string) => {
    setPending(p => p.map(x => x.key === key ? { ...x, state: 'sending' } : x));
    try {
      const row = await sendReply(userId, ticket.id, message);
      addReply(row);
      setPending(p => p.filter(x => x.key !== key));
    } catch (e) {
      setPending(p => p.map(x => x.key === key ? { ...x, state: 'failed' } : x));
      toast.error(friendlyError(e));
    }
  };

  const send = () => {
    const message = text.trim();
    if (!message) return;
    const key = `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setPending(p => [...p, { key, message, state: 'sending' }]);
    setText('');
    deliver(key, message);
  };

  // build the bubbles with day separators and grouping
  const bubbles = useMemo<Bubble[]>(() => {
    const items: { mine: boolean; text: string; at?: string; state?: Pending['state']; pendingKey?: string; first?: boolean }[] = [
      { mine: true, text: ticket.message, at: ticket.created_at, first: true },
      ...(replies || []).map(r => ({ mine: !r.is_admin, text: r.message, at: r.created_at })),
      ...pending.map(p => ({ mine: true, text: p.message, state: p.state, pendingKey: p.key })),
    ];
    const out: Bubble[] = [];
    let lastDay = '';
    items.forEach((m, i) => {
      const day = m.at ? new Date(m.at).toDateString() : new Date().toDateString();
      if (day !== lastDay) { out.push({ kind: 'day', key: `d_${day}_${i}`, label: dayLabel(m.at || new Date().toISOString()) }); lastDay = day; }
      const next = items[i + 1];
      const nextDay = next ? (next.at ? new Date(next.at).toDateString() : new Date().toDateString()) : '';
      out.push({ kind: 'msg', key: m.pendingKey || `${m.at}_${i}`, ...m, lastInGroup: !next || next.mine !== m.mine || nextDay !== day });
    });
    return out;
  }, [ticket, replies, pending]);

  const k = kindOf(ticket.category);
  const answered = (replies || []).some(r => r.is_admin);

  return (
    <>
      <TopBar
        left={<TextButton onClick={onBack}><ChevronLeft size={18} /> Back</TextButton>}
        title={
          <div className="leading-tight">
            <div className="truncate text-[16px] font-extrabold">{k.label} {ticketCode(ticket.id)}</div>
            <div className="text-[12px] font-semibold" style={muted}>{answered ? 'Support replied' : 'Waiting for support'}</div>
          </div>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3" style={{ borderTop: '1px solid var(--line)' }}>
        <div className="flex flex-col items-center px-6 pb-2 pt-5 text-center">
          <KindIcon category={ticket.category} size={44} />
          <div className="mt-2 text-[13px] font-semibold" style={muted}>
            {justOpened ? 'Ticket sent. We’ll reply right here.' : `Opened ${['Today', 'Yesterday'].includes(dayLabel(ticket.created_at)) ? dayLabel(ticket.created_at).toLowerCase() : dayLabel(ticket.created_at)}`}
          </div>
        </div>

        {replies === null ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin opacity-40" /></div>
        ) : (
          <div className="pb-1">
            {bubbles.map(b => b.kind === 'day' ? (
              <div key={b.key} className="my-3 text-center text-[11px] font-bold uppercase tracking-[0.08em]" style={muted}>{b.label}</div>
            ) : (
              <motion.div key={b.key} initial={b.state ? { opacity: 0, y: 10, scale: 0.98 } : false} animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex items-end gap-2 ${b.mine ? 'justify-end' : 'justify-start'} ${b.lastInGroup ? 'mb-2.5' : 'mb-[3px]'}`}>
                {!b.mine && (
                  b.lastInGroup
                    ? <img src="/apple-touch-icon.png" alt="" className="h-7 w-7 shrink-0 rounded-full" style={{ border: '1px solid var(--line)' }} />
                    : <span className="w-7 shrink-0" />
                )}
                <div className={`flex max-w-[80%] flex-col ${b.mine ? 'items-end' : 'items-start'}`}>
                  <button
                    disabled={b.state !== 'failed'}
                    onClick={() => b.pendingKey && deliver(b.pendingKey, b.text)}
                    className="whitespace-pre-wrap break-words border-0 px-3.5 py-2 text-left text-[15px] leading-[21px]"
                    style={{
                      ...(b.mine ? cta : { background: 'var(--surface-2)', color: 'var(--text-primary)' }),
                      borderRadius: 20,
                      [b.mine ? 'borderBottomRightRadius' : 'borderBottomLeftRadius']: b.lastInGroup ? 6 : 20,
                      opacity: b.state === 'sending' ? 0.7 : 1,
                      cursor: b.state === 'failed' ? 'pointer' : 'default',
                    } as React.CSSProperties}
                  >
                    {b.text}
                  </button>
                  {b.lastInGroup && (
                    <span className="mt-1 px-1 text-[11px] font-semibold" style={b.state === 'failed' ? { color: 'var(--danger)' } : muted}>
                      {b.state === 'failed' ? 'Not sent · tap to retry'
                        : b.state === 'sending' ? 'Sending…'
                        : <>{b.mine ? 'You' : 'UniMate Support'} · {b.at ? clock(b.at) : ''}{b.mine && b.at && <Check size={11} className="ml-0.5 inline -translate-y-px" />}</>}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
            {loadError && (
              <button onClick={load} className="mx-auto mt-2 flex items-center gap-1.5 rounded-full border-0 px-3 py-1.5 text-[12px] font-bold" style={{ background: 'rgba(255,90,95,0.12)', color: 'var(--danger)' }}>
                <RotateCw size={12} /> Couldn’t load replies. Retry
              </button>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 px-3 pb-4 pt-2" style={{ borderTop: '1px solid var(--line)' }}>
        <div className="flex items-end gap-2 rounded-[24px] p-1" style={field}>
          <GrowingInput value={text} onChange={setText} onSubmit={send} placeholder="Message" />
          <button onClick={send} disabled={!text.trim()} aria-label="Send"
            className="mb-[3px] mr-[3px] flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-0 transition-all active:scale-90 disabled:opacity-30" style={cta}>
            <ArrowUp size={19} strokeWidth={2.8} />
          </button>
        </div>
      </div>
    </>
  );
};
