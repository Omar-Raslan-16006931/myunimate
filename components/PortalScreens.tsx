import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, RefreshCw, Loader2, ChevronDown, KeyRound } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { styles } from '../theme';
import {
  getPortalAccount, getPortalGrades, getPortalAttendance, getPortalAbsenceLevels, markPortalGradesSeen,
  syncPortal, timeAgo, isAbsent,
  PortalAccount, PortalGrade, PortalAttendanceRow, PortalAbsenceLevel,
} from '../services/portal';

const card: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  backdropFilter: 'var(--glass-blur)',
  WebkitBackdropFilter: 'var(--glass-blur)',
  boxShadow: 'var(--glass-shadow)',
};
const muted: React.CSSProperties = { color: 'var(--text-muted)' };
const strong: React.CSSProperties = { color: 'var(--text-primary)' };

interface ScreenProps {
  onBack: () => void;
  onOpenSettings: () => void;
}

/** Title bar, sync button and the "not connected" / loading states shared by both screens. */
const Shell: React.FC<{
  title: string;
  account: PortalAccount | null;
  loading: boolean;
  syncing: boolean;
  onSync: () => void;
  onBack: () => void;
  onOpenSettings: () => void;
  empty: boolean;
  emptyText: string;
  children: React.ReactNode;
}> = ({ title, account, loading, syncing, onSync, onBack, onOpenSettings, empty, emptyText, children }) => (
  <div style={styles.scrollableContent} className="custom-scrollbar">
    <div className="max-w-3xl mx-auto w-full">
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <button onClick={onBack} aria-label="Back" className="flex items-center justify-center w-10 h-10 rounded-[14px] shrink-0" style={{ ...card, ...strong }}>
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <h1 className="m-0 font-extrabold leading-tight truncate" style={{ fontSize: '1.45rem', letterSpacing: '-0.02em', ...strong }}>{title}</h1>
            {account && (
              <div className="text-[0.74rem] font-semibold truncate" style={account.last_status === 'error' ? { color: '#fbbf24' } : muted}>
                {account.last_status === 'error' ? `Last check failed · ${timeAgo(account.last_sync_at)}` : `From the portal · checked ${timeAgo(account.last_sync_at)}`}
              </div>
            )}
          </div>
        </div>
        {account && (
          <button onClick={onSync} disabled={syncing} aria-label="Check the portal now" className="flex items-center justify-center w-10 h-10 rounded-[14px] shrink-0" style={{ ...card, color: 'var(--accent)' }}>
            {syncing ? <Loader2 size={17} className="animate-spin" /> : <RefreshCw size={17} />}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16" style={muted}><Loader2 size={22} className="animate-spin" /></div>
      ) : !account ? (
        <div className="rounded-[20px] px-5 py-6 text-center" style={card}>
          <KeyRound size={22} className="mx-auto mb-2" style={{ color: 'var(--accent)' }} />
          <div className="text-[1rem] font-extrabold" style={strong}>Connect your uni portal</div>
          <p className="mt-1 mb-4 text-[0.82rem] leading-snug" style={muted}>Add your GIU portal username and password in Settings. The app then reads this page for you.</p>
          <button onClick={onOpenSettings} className="rounded-[14px] border-0 px-5 py-2.5 text-[0.85rem] font-bold" style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}>
            Open Settings
          </button>
        </div>
      ) : (
        <>
          {account.last_status === 'error' && account.last_error && (
            <div className="mb-3 rounded-[16px] px-3.5 py-2.5 text-[0.8rem] font-semibold" style={{ ...card, color: '#fbbf24' }}>
              {account.last_error} Showing the last saved data.
            </div>
          )}
          {empty ? (
            <div className="rounded-[18px] px-4 py-5 text-center text-[0.85rem]" style={{ ...card, ...muted }}>{emptyText}</div>
          ) : children}
        </>
      )}
    </div>
  </div>
);

const useSync = (reload: () => Promise<void>) => {
  const [syncing, setSyncing] = useState(false);
  const sync = async () => {
    setSyncing(true);
    const res = await syncPortal();
    await reload();
    setSyncing(false);
    if (res.ok) toast.success(res.newGrades ? `${res.newGrades} new grade${res.newGrades === 1 ? '' : 's'}` : 'Up to date');
    else toast.error(res.message || 'Could not check the portal.');
  };
  return { syncing, sync };
};

const pct = (score: number | null, total: number | null): number | null =>
  score !== null && total ? Math.max(0, Math.min(100, (score / total) * 100)) : null;

// ───────────────────────── Portal grades ─────────────────────────

export const PortalGrades: React.FC<ScreenProps> = ({ onBack, onOpenSettings }) => {
  const [account, setAccount] = useState<PortalAccount | null>(null);
  const [grades, setGrades] = useState<PortalGrade[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    const [a, g] = await Promise.all([getPortalAccount(), getPortalGrades()]);
    setAccount(a);
    setGrades(g);
    setLoading(false);
    // keep the "New" tags on screen for this visit, but clear them for next time
    markPortalGradesSeen(g.filter(x => x.is_new).map(x => x.id));
  };
  useEffect(() => { reload(); }, []);
  const { syncing, sync } = useSync(reload);

  const courses = useMemo(() => {
    const map = new Map<string, { key: string; name: string; items: PortalGrade[]; midterm: PortalGrade | null }>();
    for (const g of grades) {
      if (!map.has(g.course_key)) map.set(g.course_key, { key: g.course_key, name: g.course_name, items: [], midterm: null });
      const c = map.get(g.course_key)!;
      if (g.kind === 'midterm') c.midterm = g; else c.items.push(g);
    }
    return [...map.values()].sort((a, b) => Number(b.items.some(i => i.is_new) || !!b.midterm?.is_new) - Number(a.items.some(i => i.is_new) || !!a.midterm?.is_new) || a.key.localeCompare(b.key));
  }, [grades]);

  return (
    <Shell
      title="Portal grades" account={account} loading={loading} syncing={syncing} onSync={sync}
      onBack={onBack} onOpenSettings={onOpenSettings}
      empty={courses.length === 0} emptyText="No grades are on the portal yet. New ones appear here as soon as they are released."
    >
      <div className="flex flex-col gap-3">
        {courses.map(c => {
          const scored = c.items.filter(i => i.score !== null && i.total);
          const got = scored.reduce((n, i) => n + (i.score as number), 0);
          const outOf = scored.reduce((n, i) => n + (i.total as number), 0);
          return (
            <section key={c.key} className="rounded-[18px] px-3.5 pt-3 pb-1" style={card}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[0.72rem] font-bold uppercase tracking-[0.08em]" style={muted}>{c.key}</div>
                  <h2 className="m-0 text-[1rem] font-extrabold leading-tight" style={strong}>{c.name}</h2>
                </div>
                {outOf > 0 && (
                  <div className="text-right shrink-0" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    <div className="text-[1rem] font-extrabold" style={{ color: 'var(--accent-text)' }}>{Math.round((got / outOf) * 100)}%</div>
                    <div className="text-[0.7rem]" style={muted}>{+got.toFixed(2)} / {+outOf.toFixed(2)} pts</div>
                  </div>
                )}
              </div>

              <div className="mt-2">
                {c.midterm && <GradeRow g={c.midterm} label="Midterm" first />}
                {c.items.map((g, i) => <GradeRow key={g.id} g={g} label={g.element || g.category} first={i === 0 && !c.midterm} />)}
                {!c.midterm && c.items.length === 0 && <div className="py-2.5 text-[0.82rem]" style={muted}>Nothing released yet.</div>}
              </div>
            </section>
          );
        })}
        <p className="px-1 text-[0.72rem] leading-snug" style={muted}>
          The percentage is points earned out of points released so far. It ignores how much each item counts toward the final grade.
        </p>
      </div>
    </Shell>
  );
};

const GradeRow: React.FC<{ g: PortalGrade; label: string; first: boolean }> = ({ g, label, first }) => {
  const p = pct(g.score, g.total);
  return (
    <div className="py-2.5" style={{ borderTop: first ? 'none' : '1px solid var(--line)' }}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex items-center gap-2">
          <span className="text-[0.88rem] font-bold truncate" style={strong}>{label}</span>
          {g.is_new && (
            <span className="shrink-0 rounded-full px-2 py-0.5 text-[0.62rem] font-extrabold uppercase tracking-wide" style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}>New</span>
          )}
        </div>
        <span className="shrink-0 text-[0.88rem] font-extrabold" style={{ ...strong, fontVariantNumeric: 'tabular-nums' }}>{g.grade_text || '–'}</span>
      </div>
      {p !== null && (
        <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
          <div className="h-full rounded-full" style={{ width: `${p}%`, background: 'var(--accent)' }} />
        </div>
      )}
      {g.lecturer && <div className="mt-1 text-[0.7rem] truncate" style={muted}>{g.lecturer}</div>}
    </div>
  );
};

// ───────────────────────── Attendance ─────────────────────────

const LEVEL_TEXT: Record<string, string> = {
  '1': 'First warning',
  '2': 'Second warning',
  '3': 'Course drop (over 25% absence)',
};

const fmtDate = (iso: string | null): string =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '';

export const PortalAttendance: React.FC<ScreenProps> = ({ onBack, onOpenSettings }) => {
  const [account, setAccount] = useState<PortalAccount | null>(null);
  const [rows, setRows] = useState<PortalAttendanceRow[]>([]);
  const [levels, setLevels] = useState<PortalAbsenceLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  const reload = async () => {
    const [a, r, l] = await Promise.all([getPortalAccount(), getPortalAttendance(), getPortalAbsenceLevels()]);
    setAccount(a);
    setRows(r);
    setLevels(l);
    setLoading(false);
  };
  useEffect(() => { reload(); }, []);
  const { syncing, sync } = useSync(reload);

  const courses = useMemo(() => {
    const map = new Map<string, { key: string; name: string; rows: PortalAttendanceRow[] }>();
    for (const r of rows) {
      if (!map.has(r.course_key)) map.set(r.course_key, { key: r.course_key, name: r.course_name, rows: [] });
      map.get(r.course_key)!.rows.push(r);
    }
    return [...map.values()].map(c => {
      const absent = c.rows.filter(r => isAbsent(r.status)).length;
      const level = levels.find(l => l.code.replace(/\s+/g, '').toLowerCase() === c.key.toLowerCase())?.level ?? '';
      return { ...c, absent, level };
    }).sort((a, b) => b.absent - a.absent || a.key.localeCompare(b.key));
  }, [rows, levels]);

  const totalAbsent = courses.reduce((n, c) => n + c.absent, 0);

  return (
    <Shell
      title="Attendance" account={account} loading={loading} syncing={syncing} onSync={sync}
      onBack={onBack} onOpenSettings={onOpenSettings}
      empty={courses.length === 0} emptyText="No attendance has been entered on the portal yet."
    >
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-2">
          {[
            { n: rows.length, label: 'Sessions' },
            { n: rows.length - totalAbsent, label: 'Attended' },
            { n: totalAbsent, label: 'Absent' },
          ].map(s => (
            <div key={s.label} className="rounded-[16px] px-3 py-2.5" style={card}>
              <div className="text-[1.3rem] font-extrabold leading-none" style={{ ...strong, fontVariantNumeric: 'tabular-nums' }}>{s.n}</div>
              <div className="mt-1 text-[0.72rem] font-semibold" style={muted}>{s.label}</div>
            </div>
          ))}
        </div>

        {courses.map(c => {
          const expanded = open === c.key;
          return (
            <section key={c.key} className="rounded-[18px] px-3.5" style={card}>
              <button
                onClick={() => setOpen(expanded ? null : c.key)}
                aria-expanded={expanded}
                className="flex w-full items-center justify-between gap-3 bg-transparent border-0 p-0 py-3 text-left"
              >
                <div className="min-w-0">
                  <div className="text-[0.72rem] font-bold uppercase tracking-[0.08em]" style={muted}>{c.key}</div>
                  <div className="text-[1rem] font-extrabold leading-tight" style={strong}>{c.name}</div>
                  <div className="mt-1 text-[0.76rem] font-semibold" style={c.absent ? { color: '#fbbf24' } : muted}>
                    {c.absent ? `Absent ${c.absent} of ${c.rows.length}` : `Attended all ${c.rows.length}`}
                    {c.level && LEVEL_TEXT[c.level] ? ` · ${LEVEL_TEXT[c.level]}` : c.level ? ` · Level ${c.level}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex gap-[3px]" aria-hidden="true">
                    {c.rows.slice(-10).map(r => (
                      <span key={r.id} className="inline-block w-[6px] h-[18px] rounded-full" style={{ background: isAbsent(r.status) ? '#fbbf24' : 'var(--accent)' }} />
                    ))}
                  </div>
                  <ChevronDown size={16} style={{ ...muted, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                </div>
              </button>

              {expanded && (
                <div className="pb-1">
                  {c.rows.map(r => (
                    <div key={r.id} className="flex items-center justify-between gap-3 py-2" style={{ borderTop: '1px solid var(--line)' }}>
                      <div className="min-w-0">
                        <div className="text-[0.84rem] font-bold" style={strong}>{fmtDate(r.session_date) || `Session ${r.row_number}`}</div>
                        <div className="text-[0.7rem] truncate" style={muted}>{r.session_type || r.session_desc}</div>
                      </div>
                      <span
                        className="shrink-0 rounded-full px-2.5 py-0.5 text-[0.7rem] font-extrabold"
                        style={isAbsent(r.status)
                          ? { background: 'rgba(251,191,36,0.16)', color: '#fbbf24' }
                          : { background: 'var(--surface-2)', color: 'var(--text-primary)' }}
                      >
                        {r.status || '–'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
        <p className="px-1 text-[0.72rem] leading-snug" style={muted}>
          Warning levels come from the portal. It can take about an hour to update after a teacher changes your attendance.
        </p>
      </div>
    </Shell>
  );
};
