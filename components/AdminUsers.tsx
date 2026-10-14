import React, { useCallback, useEffect, useState } from 'react';
import { Search, Loader2, Ban, ShieldCheck, Trash2, Copy, RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import Sheet from './Sheet';
import BanSheet from './BanSheet';
import { AdminUser, BanDuration, USER_COLUMNS, banActive, banUser, unbanUser, deleteUserRow, niceDate } from '../services/admin';

export const StatusPill: React.FC<{ u: Pick<AdminUser, 'is_banned' | 'banned_until'> }> = ({ u }) => {
  const on = banActive(u);
  const forever = on && !u.banned_until;
  const [bg, fg, text] = !on ? ['rgba(52,211,153,0.14)', '#34d399', 'Active'] : forever ? ['rgba(255,90,95,0.16)', '#ff5a5f', 'Banned'] : ['rgba(251,191,36,0.15)', '#fbbf24', 'Suspended'];
  return <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide" style={{ background: bg, color: fg }}>{text}</span>;
};

const initials = (n?: string | null) => (n || '?').slice(0, 2).toUpperCase();

/** Admin: find people, see their status, suspend with a reason, unban, delete. */
const AdminUsers: React.FC<{ selfId?: string }> = ({ selfId }) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState<AdminUser | null>(null);
  const [banning, setBanning] = useState(false);
  const [busy, setBusy] = useState<'ban' | 'unban' | 'delete' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => { const t = setTimeout(() => setDebounced(search), 350); return () => clearTimeout(t); }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const term = debounced.trim();
      let q = supabase.from('profiles').select(USER_COLUMNS).order('updated_at', { ascending: false }).limit(term ? 50 : 25);
      if (term) {
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(term)) q = q.eq('id', term);
        else q = q.or(`username.ilike.%${term.replace(/[%,()]/g, '')}%,email.ilike.%${term.replace(/[%,()]/g, '')}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      setUsers((data || []) as AdminUser[]);
    } catch { toast.error("Couldn't load users."); }
    finally { setLoading(false); }
  }, [debounced]);
  useEffect(() => { load(); }, [load]);

  const show = (u: AdminUser) => { setOpen(u); setConfirmDelete(false); setSheetOpen(true); };
  const patchUser = (id: string, patch: Partial<AdminUser>) => {
    setUsers(l => l.map(u => u.id === id ? { ...u, ...patch } : u));
    setOpen(o => o && o.id === id ? { ...o, ...patch } : o);
  };

  const doBan = async (d: BanDuration, reason: string) => {
    if (!open) return;
    setBusy('ban');
    const patch = await banUser(open.id, d, reason);
    setBusy(null);
    if (patch) { patchUser(open.id, patch); setBanning(false); toast.success(d === 'perm' ? 'User banned' : 'User suspended'); }
    else toast.error("Couldn't suspend. Try again.");
  };
  const doUnban = async () => {
    if (!open) return;
    setBusy('unban');
    const patch = await unbanUser(open.id);
    setBusy(null);
    if (patch) { patchUser(open.id, patch); toast.success('User unbanned'); } else toast.error("Couldn't unban. Try again.");
  };
  const doDelete = async () => {
    if (!open) return;
    setBusy('delete');
    const ok = await deleteUserRow(open.id);
    setBusy(null);
    if (ok) { setUsers(l => l.filter(u => u.id !== open.id)); setSheetOpen(false); toast('Profile deleted'); }
    else toast.error("Couldn't delete. Try again.");
  };

  const isSelf = !!open && open.id === selfId;
  const isOtherAdmin = !!open?.is_admin && !isSelf;
  const active = open ? banActive(open) : false;

  return (
    <div>
      <div className="mb-3 flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email or ID"
            className="w-full rounded-xl border border-white/5 bg-black/40 py-3 pl-10 pr-9 text-sm text-white placeholder-white/30 outline-none focus:border-teal-500/50" />
          {search && <button onClick={() => setSearch('')} aria-label="Clear" className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border-0 bg-white/10 text-white/60"><X size={13} /></button>}
        </div>
        <button onClick={load} aria-label="Refresh" className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl border-0 bg-white/5 text-white/70">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading && !users.length ? (
        <div className="flex justify-center py-8 text-white/30"><Loader2 className="animate-spin" /></div>
      ) : !users.length ? (
        <div className="py-8 text-center text-sm text-white/40">No one found.</div>
      ) : (
        <div className="max-h-[420px] space-y-2 overflow-y-auto overscroll-contain pr-0.5">
          {users.map(u => (
            <button key={u.id} onClick={() => show(u)} className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.04] bg-black/30 p-3 text-left transition-colors active:bg-white/5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-[13px] font-extrabold text-white/70">{initials(u.username)}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-bold text-white">{u.username || 'No username'}</span>
                  {u.is_admin && <span className="rounded bg-teal-500/15 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-teal-300">Admin</span>}
                </div>
                <div className="truncate text-xs text-white/40">{u.email || 'No email'}</div>
              </div>
              <StatusPill u={u} />
            </button>
          ))}
        </div>
      )}

      {/* person details */}
      <Sheet open={sheetOpen && !!open} onClose={() => setSheetOpen(false)}>
        {open && (
          <div className="overflow-y-auto overscroll-contain px-5 pb-6 pt-1">
            <div className="flex items-center gap-3.5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-extrabold" style={{ background: 'var(--surface-2)' }}>{initials(open.username)}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[20px] font-extrabold">{open.username || 'No username'}</div>
                <div className="truncate text-[13px]" style={{ color: 'var(--text-muted)' }}>{open.email || 'No email'}</div>
              </div>
              <StatusPill u={open} />
            </div>

            <AnimatePresence initial={false}>
              {active && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="mt-4 rounded-2xl p-3.5" style={{ background: 'rgba(255,90,95,0.1)', border: '1px solid rgba(255,90,95,0.25)' }}>
                    <div className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: 'var(--danger)' }}>
                      {open.banned_until ? `Suspended until ${niceDate(open.banned_until)}` : 'Banned forever'}
                    </div>
                    <p className="mt-1 text-[14px] leading-snug">{open.ban_reason || 'No reason was written.'}</p>
                    {open.banned_at && <p className="mt-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>Since {niceDate(open.banned_at)}</p>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-4 grid grid-cols-2 gap-2.5 text-[13px]">
              {[['Joined', niceDate(open.created_at)], ['Last active', niceDate(open.updated_at)], ['College', open.college || '—']].map(([k, v]) => (
                <div key={k} className="rounded-2xl p-3" style={{ background: 'var(--sheet-field)', border: '1px solid var(--line)' }}>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{k}</div>
                  <div className="mt-0.5 truncate font-bold">{v}</div>
                </div>
              ))}
              <button onClick={() => { navigator.clipboard?.writeText(open.id); toast.success('ID copied'); }}
                className="flex items-center justify-between rounded-2xl border-0 p-3 text-left" style={{ background: 'var(--sheet-field)', border: '1px solid var(--line)', color: 'var(--text-primary)' }}>
                <div className="min-w-0">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>User ID</div>
                  <div className="mt-0.5 truncate font-mono text-[12px] font-bold">{open.id.slice(0, 8)}…</div>
                </div>
                <Copy size={14} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            <div className="mt-5 space-y-2.5">
              {isSelf || isOtherAdmin ? (
                <p className="text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>{isSelf ? "That's you." : 'Admins can only be changed in the database.'}</p>
              ) : (
                <>
                  {active ? (
                    <button onClick={doUnban} disabled={busy !== null}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border-0 py-3.5 text-[16px] font-extrabold disabled:opacity-50" style={{ background: 'var(--cta-bg)', color: 'var(--cta-ink)' }}>
                      {busy === 'unban' ? <Loader2 size={18} className="animate-spin" /> : <><ShieldCheck size={18} /> Unban</>}
                    </button>
                  ) : (
                    <button onClick={() => setBanning(true)} disabled={busy !== null}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border-0 py-3.5 text-[16px] font-extrabold text-white disabled:opacity-50" style={{ background: 'var(--danger)' }}>
                      <Ban size={18} /> Suspend…
                    </button>
                  )}
                  {confirmDelete ? (
                    <div className="flex gap-2.5">
                      <button onClick={() => setConfirmDelete(false)} disabled={busy !== null} className="flex-1 rounded-2xl border-0 py-3.5 text-[15px] font-bold" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}>Keep</button>
                      <button onClick={doDelete} disabled={busy !== null} className="flex flex-1 items-center justify-center rounded-2xl border-0 py-3.5 text-[15px] font-extrabold text-white" style={{ background: 'var(--danger)' }}>
                        {busy === 'delete' ? <Loader2 size={17} className="animate-spin" /> : 'Delete for good'}
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(true)} disabled={busy !== null}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border-0 py-3.5 text-[15px] font-bold" style={{ background: 'var(--surface-2)', color: 'var(--danger)' }}>
                      <Trash2 size={16} /> Delete profile
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </Sheet>

      <BanSheet open={banning} username={open?.username || ''} busy={busy === 'ban'} onClose={() => setBanning(false)} onConfirm={doBan} />
    </div>
  );
};

export default AdminUsers;
