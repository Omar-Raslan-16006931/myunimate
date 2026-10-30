
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { AppFeedback, FeedbackReply } from '../types';
import { Check, Loader2, RefreshCw, Trash2, Send, Search, ChevronLeft, Copy, Ban, ShieldCheck, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import BanSheet from './BanSheet';
import { BanDuration, banActive, banUser, unbanUser, niceDate } from '../services/admin';

const AdminInbox: React.FC = () => {
  const [feedbackItems, setFeedbackItems] = useState<AppFeedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<AppFeedback | null>(null);
  const [replies, setReplies] = useState<FeedbackReply[]>([]);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'Bug' | 'Feature Request'>('all');
  const [people, setPeople] = useState<Record<string, { is_banned: boolean; banned_until: string | null; ban_reason: string | null }>>({});
  const [banning, setBanning] = useState(false);
  const [banBusy, setBanBusy] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [search, setSearch] = useState('');
  const threadScrollRef = useRef<HTMLDivElement>(null);

  // Check if user is admin before showing admin panel
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setIsAuthorized(false);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', session.user.id)
          .single();

        setIsAuthorized(!!profile?.is_admin);
      } catch (err) {
        console.error("Admin check failed:", err);
        setIsAuthorized(false);
      }
    };

    checkAdminStatus();
  }, []);

  // Fetch feedback only if authorized
  const fetchFeedback = async () => {
    if (!isAuthorized) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const items = (data || []) as AppFeedback[];
      // show who sent each ticket
      const ids = [...new Set(items.map(i => i.user_id).filter(Boolean))];
      if (ids.length) {
        const { data: ppl } = await supabase.from('profiles').select('id, username, is_banned, banned_until, ban_reason').in('id', ids);
        const names = new Map<string, string>((ppl || []).map((p: any) => [p.id, p.username]));
        setPeople(Object.fromEntries((ppl || []).map((p: any) => [p.id, { is_banned: p.is_banned, banned_until: p.banned_until, ban_reason: p.ban_reason }])));
        items.forEach(i => { i.username = names.get(i.user_id) || i.username; });
      }
      setFeedbackItems(items);
    } catch (err) {
      console.error("Error fetching feedback:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthorized) return;
    fetchFeedback();
    // new tickets and status changes show up without refreshing
    const ch = supabase.channel(`admin_inbox_${Math.random().toString(36).slice(2, 10)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_feedback' }, () => fetchFeedback())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [isAuthorized]);

  // Fetch replies when message selected
  useEffect(() => {
      if (selectedMessage) {
          setReplies([]);
          const fetchReplies = async () => {
            const { data } = await supabase.from('feedback_replies')
                .select('*')
                .eq('feedback_id', selectedMessage.id)
                .order('created_at', { ascending: true });
            if (data) setReplies(data);
          };
          fetchReplies();

          const channel = supabase.channel(`admin_chat_${selectedMessage.id}_${Math.random().toString(36).slice(2, 8)}`)
            .on(
              'postgres_changes',
              { event: 'INSERT', schema: 'public', table: 'feedback_replies', filter: `feedback_id=eq.${selectedMessage.id}` },
              (payload: any) => {
                const r = payload.new as FeedbackReply;
                setReplies(prev => prev.some(x => x.id === r.id) ? prev : [...prev, r]);
              }
            )
            .subscribe();

          return () => { supabase.removeChannel(channel); };
      }
  }, [selectedMessage?.id]);

  // scroll only the conversation, and only when a ticket opens or a message arrives
  // (scrollIntoView also dragged the whole page down, and ran on every button tap)
  useEffect(() => {
      if (!selectedMessage) return;
      const t = setTimeout(() => {
          const el = threadScrollRef.current;
          if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      }, 100);
      return () => clearTimeout(t);
  }, [replies.length, selectedMessage?.id]);

  const markAsRead = async (id: string, currentStatus?: string) => {
    const newStatus = currentStatus === 'read' ? 'unread' : 'read';
    
    // Optimistic Update
    setFeedbackItems(prev => prev.map(item => 
      item.id === id ? { ...item, status: newStatus as 'read' | 'unread' } : item
    ));
    if (selectedMessage?.id === id) {
        setSelectedMessage(prev => prev ? { ...prev, status: newStatus as 'read' | 'unread' } : null);
    }

    try {
      await supabase.from('app_feedback').update({ status: newStatus }).eq('id', id);
    } catch (err: any) {
      console.error("Error updating status:", err);
      fetchFeedback(); // Revert on error
    }
  };

  const deleteMessage = async (id: string) => {
    setFeedbackItems(prev => prev.filter(item => item.id !== id));
    setIsDeleteConfirmOpen(false);
    if (selectedMessage?.id === id) setSelectedMessage(null);

    try {
      const { error } = await supabase.from('app_feedback').delete().eq('id', id);
      if (error) throw error;
    } catch (err: any) {
      console.error("Error deleting message:", err);
      console.error(`Failed to delete: ${err.message}`);
      fetchFeedback();
    }
  };

  const sendReply = async () => {
      if (!selectedMessage || !replyText.trim()) return;
      setIsSendingReply(true);

      try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error("No session");

          // NOTE: is_admin status is now determined server-side via RLS policies
          // The client MUST NOT set is_admin flag - backend verifies admin status
          // the database marks the reply as support and the ticket as read
          const { data: row, error } = await supabase.from('feedback_replies').insert({
                feedback_id: selectedMessage.id,
                sender_id: session.user.id,
                message: replyText.trim().slice(0, 2000)
            }).select('*').single();

          if (error) throw error;
          if (row) setReplies(prev => prev.some(x => x.id === row.id) ? prev : [...prev, row as FeedbackReply]);
          setFeedbackItems(prev => prev.map(i => i.id === selectedMessage.id ? { ...i, status: 'read' } : i));
          setSelectedMessage(prev => prev ? { ...prev, status: 'read' } : prev);

          setReplyText('');
      } catch (err: any) {
          console.error("Error sending reply:", err);
      } finally {
          setIsSendingReply(false);
      }
  };

  const q = search.trim().toLowerCase();
  const filteredItems = feedbackItems.filter(item => {
      if (filter === 'unread' && item.status !== 'unread') return false;
      if ((filter === 'Bug' || filter === 'Feature Request') && item.category !== filter) return false;
      if (!q) return true;
      return item.message.toLowerCase().includes(q) || (item.username || '').toLowerCase().includes(q) || item.id.startsWith(q.replace('#', ''));
  });
  const unreadCount = feedbackItems.filter(i => i.status === 'unread').length;

  const person = selectedMessage ? people[selectedMessage.user_id] : undefined;
  const personBanned = !!person && banActive(person);

  const doBan = async (d: BanDuration, reason: string) => {
    if (!selectedMessage) return;
    setBanBusy(true);
    const patch = await banUser(selectedMessage.user_id, d, reason);
    setBanBusy(false);
    if (patch) { setPeople(p => ({ ...p, [selectedMessage.user_id]: patch })); setBanning(false); toast.success(d === 'perm' ? 'User banned' : 'User suspended'); }
    else toast.error("Couldn't suspend. Try again.");
  };
  const doUnban = async () => {
    if (!selectedMessage) return;
    setBanBusy(true);
    const patch = await unbanUser(selectedMessage.user_id);
    setBanBusy(false);
    if (patch) { setPeople(p => ({ ...p, [selectedMessage.user_id]: patch })); toast.success('User unbanned'); }
    else toast.error("Couldn't unban. Try again.");
  };

  const chip = (key: typeof filter, label: string, n?: number) => (
    <button key={key} onClick={() => setFilter(key)}
      className={`shrink-0 rounded-full border-0 px-3.5 py-1.5 text-xs font-bold transition-colors ${filter === key ? 'bg-teal-500 text-black' : 'bg-white/[0.07] text-white/60'}`}>
      {label}{n ? <span className={`ml-1.5 rounded-full px-1.5 py-px text-[10px] ${filter === key ? 'bg-black/20' : 'bg-white/10'}`}>{n}</span> : null}
    </button>
  );
  const catStyle = (c: string) => c === 'Bug' ? 'text-red-400 bg-red-500/10' : c === 'Feature Request' ? 'text-emerald-400 bg-emerald-500/10' : 'text-sky-400 bg-sky-500/10';
  const catName = (c: string) => c === 'Feature Request' ? 'Idea' : c;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.05] bg-black/30" style={{ height: 'min(620px, 72dvh)' }}>
      <AnimatePresence initial={false} mode="popLayout">
        {!selectedMessage ? (
          <motion.div key="list" initial={{ x: '-12%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '-12%', opacity: 0 }} transition={{ duration: 0.2 }} className="absolute inset-0 flex flex-col">
            <div className="shrink-0 space-y-2.5 p-3 pb-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tickets or people"
                    className="w-full rounded-xl border border-white/5 bg-black/40 py-2.5 pl-9 pr-8 text-sm text-white placeholder-white/30 outline-none focus:border-teal-500/50" />
                  {search && <button onClick={() => setSearch('')} aria-label="Clear" className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border-0 bg-white/10 text-white/60"><X size={12} /></button>}
                </div>
                <button onClick={fetchFeedback} disabled={loading} aria-label="Refresh" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-0 bg-white/5 text-white/70 hit">
                  <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
                {chip('all', 'All')}{chip('unread', 'Unread', unreadCount)}{chip('Bug', 'Bugs')}{chip('Feature Request', 'Ideas')}
              </div>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 pb-3">
              {loading && !feedbackItems.length ? (
                <div className="flex h-40 items-center justify-center text-teal-400"><Loader2 className="animate-spin" /></div>
              ) : !filteredItems.length ? (
                <div className="flex h-full flex-col items-center justify-center pb-8 text-white/30">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/5"><Check size={22} /></div>
                  <span className="text-sm font-semibold">{feedbackItems.length ? 'Nothing matches' : 'All caught up'}</span>
                </div>
              ) : filteredItems.map(item => {
                const unread = item.status === 'unread';
                const banned = people[item.user_id] && banActive(people[item.user_id]);
                return (
                  <button key={item.id} onClick={() => setSelectedMessage(item)} className="block w-full rounded-2xl border border-white/[0.04] bg-black/30 p-3.5 text-left transition-colors active:bg-white/5">
                    <div className="mb-1.5 flex items-center gap-2">
                      {unread && <span className="h-2 w-2 shrink-0 rounded-full bg-teal-400" />}
                      <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${catStyle(item.category)}`}>{catName(item.category)}</span>
                      {banned && <span className="rounded-md bg-red-500/15 px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-red-400">Suspended</span>}
                      <span className="ml-auto text-[11px] text-white/30">{new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    </div>
                    <p className={`line-clamp-2 text-[13px] leading-snug ${unread ? 'font-semibold text-white' : 'text-white/60'}`}>{item.message}</p>
                    <div className="mt-2 text-[11px] font-semibold text-white/35">{item.username || 'Unknown user'}</div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div key="thread" initial={{ x: '12%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '12%', opacity: 0 }} transition={{ duration: 0.2 }} className="absolute inset-0 flex flex-col">
            <div className="flex shrink-0 items-center gap-2 border-b border-white/5 px-2.5 py-2.5">
              <button onClick={() => { setSelectedMessage(null); setIsDeleteConfirmOpen(false); }} aria-label="Back" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-0 bg-white/5 text-white/70"><ChevronLeft size={18} /></button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-bold text-white">{selectedMessage.username || 'Unknown user'}</span>
                  {personBanned && <span className="shrink-0 rounded-md bg-red-500/15 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-red-400">Suspended</span>}
                </div>
                <button onClick={() => { navigator.clipboard?.writeText(selectedMessage.user_id); toast.success('ID copied'); }} className="flex items-center gap-1 border-0 bg-transparent p-0 text-[10px] text-white/30">
                  <span className="font-mono">{selectedMessage.user_id.slice(0, 8)}…</span><Copy size={9} />
                </button>
              </div>
              <button onClick={() => markAsRead(selectedMessage.id, selectedMessage.status)} aria-label={selectedMessage.status === 'unread' ? 'Mark read' : 'Mark unread'}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-0 ${selectedMessage.status === 'read' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/5 text-white/50'}`}><Check size={16} /></button>
              {personBanned ? (
                <button onClick={doUnban} disabled={banBusy} aria-label="Unban user" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-0 bg-teal-500/15 text-teal-300 hit">
                  {banBusy ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={16} />}
                </button>
              ) : (
                <button onClick={() => setBanning(true)} aria-label="Suspend user" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-0 bg-white/5 text-white/50"><Ban size={16} /></button>
              )}
              <button onClick={() => setIsDeleteConfirmOpen(true)} aria-label="Delete ticket" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-0 bg-white/5 text-white/50"><Trash2 size={16} /></button>
            </div>

            {personBanned && person && (
              <div className="shrink-0 border-b border-red-500/15 bg-red-500/[0.07] px-3.5 py-2 text-[12px] leading-snug text-red-200/90">
                <b>{person.banned_until ? `Suspended until ${niceDate(person.banned_until)}` : 'Banned forever'}.</b> {person.ban_reason || 'No reason written.'}
              </div>
            )}

            <div ref={threadScrollRef} className="flex-1 space-y-3 overflow-y-auto overscroll-contain p-3.5">
              <div className="flex">
                <div className="max-w-[88%]">
                  <div className="rounded-2xl rounded-tl-md border border-white/5 bg-white/[0.06] px-3.5 py-2.5 text-[13px] leading-relaxed text-white/90 whitespace-pre-wrap">{selectedMessage.message}</div>
                  <div className="mt-1 px-1 text-[10px] text-white/25">{catName(selectedMessage.category)} · {new Date(selectedMessage.created_at).toLocaleString()}</div>
                </div>
              </div>
              {replies.map(r => (
                <div key={r.id} className={`flex ${r.is_admin ? 'justify-end' : ''}`}>
                  <div className={`max-w-[88%] ${r.is_admin ? 'items-end text-right' : ''}`}>
                    <div className={`rounded-2xl px-3.5 py-2.5 text-left text-[13px] leading-relaxed whitespace-pre-wrap ${r.is_admin ? 'rounded-tr-md bg-teal-600 text-white' : 'rounded-tl-md border border-white/5 bg-white/[0.06] text-white/90'}`}>{r.message}</div>
                    <div className="mt-1 px-1 text-[10px] text-white/25">{new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="shrink-0 border-t border-white/5 p-2.5">
              {isDeleteConfirmOpen ? (
                <div className="flex items-center justify-between rounded-2xl border border-red-500/20 bg-red-500/10 p-2.5">
                  <span className="px-2 text-xs font-semibold text-red-200">Delete this ticket for good?</span>
                  <div className="flex gap-2">
                    <button onClick={() => setIsDeleteConfirmOpen(false)} className="rounded-xl border-0 bg-white/10 px-3.5 py-2 text-xs font-bold text-white/70">No</button>
                    <button onClick={() => deleteMessage(selectedMessage.id)} className="rounded-xl border-0 bg-red-500 px-3.5 py-2 text-xs font-extrabold text-white">Delete</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-end gap-2 rounded-2xl border border-white/5 bg-black/40 p-1.5 focus-within:border-teal-500/50">
                  <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                    placeholder="Reply as Support…" rows={1}
                    className="max-h-[100px] min-h-[40px] flex-1 resize-none border-none bg-transparent px-3 py-2.5 text-[13px] text-white placeholder-white/25 outline-none" />
                  <button onClick={sendReply} disabled={!replyText.trim() || isSendingReply} aria-label="Send"
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-0 ${(!replyText.trim() || isSendingReply) ? 'bg-white/5 text-white/20' : 'bg-teal-600 text-white active:scale-95'}`}>
                    {isSendingReply ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <BanSheet open={banning} username={selectedMessage?.username || ''} busy={banBusy} onClose={() => setBanning(false)} onConfirm={doBan} />
    </div>
  );
};

export default AdminInbox;
