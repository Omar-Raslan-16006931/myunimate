import React, { useEffect, useMemo, useRef, useState } from 'react';
import Collapse from './ui/Collapse';
import { ArrowLeft, RefreshCw, Loader2, ChevronDown, KeyRound, Calendar, MapPin, Armchair, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { styles } from '../theme';
import {
  getPortalAccount, getPortalGrades, getPortalAttendance, getPortalAbsenceLevels, getPortalExamSeats, markPortalGradesSeen,
  syncPortal, timeAgo, isAbsent, readPortalCache, writePortalCache, PortalSyncResult,
  PortalAccount, PortalGrade, PortalAttendanceRow, PortalExamSeat,
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
  checking?: 'saved' | 'portal' | null;
  onSync: () => void;
  onBack: () => void;
  onOpenSettings: () => void;
  empty: boolean;
  emptyText: string;
  children: React.ReactNode;
}> = ({ title, account, loading, syncing, checking = null, onSync, onBack, onOpenSettings, empty, emptyText, children }) => (
  <div style={styles.scrollableContent} className="custom-scrollbar">
    <div className="max-w-3xl mx-auto w-full page-in">
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <button onClick={onBack} aria-label="Back" className="flex items-center justify-center w-10 h-10 rounded-[14px] shrink-0" style={{ ...card, ...strong }}>
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <h1 className="m-0 font-extrabold leading-tight truncate" style={{ fontSize: '1.45rem', letterSpacing: '-0.02em', ...strong }}>{title}</h1>
            {checking ? (
              <div className="flex items-center gap-1.5 text-[0.74rem] font-semibold truncate" style={{ color: 'var(--accent)' }}>
                <span className="relative inline-flex h-1.5 w-1.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full rounded-full animate-ping" style={{ background: 'var(--accent)', opacity: 0.6 }} />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
                </span>
                {checking === 'portal' ? 'Checking the portal for updates…' : 'Checking for updates…'}
              </div>
            ) : account && (
              <div className="text-[0.74rem] font-semibold truncate" style={account.last_status === 'error' ? { color: '#fbbf24' } : muted}>
                {account.last_status === 'error' ? `Last check failed · ${timeAgo(account.last_sync_at)}` : `From the portal · checked ${timeAgo(account.last_sync_at)}`}
              </div>
            )}
          </div>
        </div>
        {account && (
          <button onClick={onSync} disabled={syncing || checking === 'portal'} aria-label="Check the portal now" className="flex items-center justify-center w-10 h-10 rounded-[14px] shrink-0" style={{ ...card, color: 'var(--accent)' }}>
            {syncing || checking === 'portal' ? <Loader2 size={17} className="animate-spin" /> : <RefreshCw size={17} />}
          </button>
        )}
      </div>

      {loading ? (
        <div key="loading" className="page-in-fade flex justify-center py-16" style={muted}><Loader2 size={22} className="animate-spin" /></div>
      ) : !account ? (
        <div key="noaccount" className="page-in rounded-[20px] px-5 py-6 text-center" style={card}>
          <KeyRound size={22} className="mx-auto mb-2" style={{ color: 'var(--accent)' }} />
          <div className="text-[1rem] font-extrabold" style={strong}>Connect your uni portal</div>
          <p className="mt-1 mb-4 text-[0.82rem] leading-snug" style={muted}>Add your GIU portal username and password in Settings. The app then reads this page for you.</p>
          <button onClick={onOpenSettings} className="rounded-[14px] border-0 px-5 py-2.5 text-[0.85rem] font-bold" style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}>
            Open Settings
          </button>
        </div>
      ) : (
        <div key="content" className="stagger-in">
          {account.last_status === 'error' && account.last_error && (
            <div className="mb-3 rounded-[16px] px-3.5 py-2.5 text-[0.8rem] font-semibold" style={{ ...card, color: '#fbbf24' }}>
              {account.last_error} Showing the last saved data.
            </div>
          )}
          {empty ? (
            <div className="rounded-[18px] px-4 py-5 text-center text-[0.85rem]" style={{ ...card, ...muted }}>{emptyText}</div>
          ) : children}
        </div>
      )}
    </div>
  </div>
);

/** Auto-check the portal when the saved data is older than this. */
const STALE_MS = 10 * 60 * 1000;

/**
 * Shows the copy saved on this phone straight away, then quietly reloads from the
 * server, and asks the portal itself for updates if the last check is old.
 */
function usePortalScreen<T extends { account: PortalAccount | null }>(
  name: string,
  fetchAll: () => Promise<T>,
  opts: { onLoaded?: (d: T) => void; onSynced?: (res: PortalSyncResult) => void } = {},
) {
  const [data, setData] = useState<T | null>(() => readPortalCache<T>(name));
  const [checking, setChecking] = useState<'saved' | 'portal' | null>('saved');
  const [syncing, setSyncing] = useState(false);
  const alive = useRef(true);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const load = async (): Promise<T | null> => {
    try {
      const d = await fetchAll();
      if (!alive.current) return d;
      setData(d);
      writePortalCache(name, d);
      optsRef.current.onLoaded?.(d);
      return d;
    } catch {
      return null; // offline or server hiccup: keep showing the saved copy
    }
  };

  const askPortal = async (manual: boolean) => {
    if (manual) setSyncing(true); else setChecking('portal');
    const res = await syncPortal();
    await load();
    if (!alive.current) return;
    if (manual) setSyncing(false); else setChecking(null);
    if (res.ok) optsRef.current.onSynced?.(res);
    if (manual) {
      if (res.ok) toast.success(res.newGrades ? `${res.newGrades} new grade${res.newGrades === 1 ? '' : 's'}` : 'Up to date');
      else toast.error(res.message || 'Could not check the portal.');
    }
  };

  useEffect(() => {
    alive.current = true;
    (async () => {
      const d = await load();
      if (!alive.current) return;
      const last = d?.account?.last_sync_at ? new Date(d.account.last_sync_at).getTime() : 0;
      if (d?.account && Date.now() - last > STALE_MS) await askPortal(false);
      else setChecking(null);
    })();
    return () => { alive.current = false; };
  }, []);

  return { data, ready: data !== null, checking, syncing, sync: () => askPortal(true) };
}

const pct = (score: number | null, total: number | null): number | null =>
  score !== null && total ? Math.max(0, Math.min(100, (score / total) * 100)) : null;

// ───────────────────────── Portal grades ─────────────────────────

export const PortalGrades: React.FC<ScreenProps> = ({ onBack, onOpenSettings }) => {
  const [selectedCourseKey, setSelectedCourseKey] = useState<string>('');
  const screen = usePortalScreen('grades', async () => {
    const [account, grades] = await Promise.all([getPortalAccount(true), getPortalGrades(true)]);
    return { account, grades };
  }, {
    // keep the "New" tags on screen for this visit, but clear them for next time
    onLoaded: d => markPortalGradesSeen(d.grades.filter(x => x.is_new).map(x => x.id)),
  });
  const account = screen.data?.account ?? null;
  const grades = screen.data?.grades ?? [];
  const { syncing, sync, checking } = screen;
  const loading = !screen.ready;

  // midterms get their own card; the course tabs hold everything else
  const midterms = useMemo(() => grades.filter(g => g.kind === 'midterm').sort((a, b) => a.course_key.localeCompare(b.course_key)), [grades]);
  const courses = useMemo(() => {
    const map = new Map<string, { key: string; name: string; items: PortalGrade[] }>();
    for (const g of grades) {
      if (g.kind === 'midterm') continue;
      if (!map.has(g.course_key)) map.set(g.course_key, { key: g.course_key, name: g.course_name, items: [] });
      map.get(g.course_key)!.items.push(g);
    }
    return [...map.values()].sort((a, b) => Number(b.items.some(i => i.is_new)) - Number(a.items.some(i => i.is_new)) || a.key.localeCompare(b.key));
  }, [grades]);

  useEffect(() => {
    if (courses.length > 0 && (!selectedCourseKey || !courses.some(c => c.key === selectedCourseKey))) {
      setSelectedCourseKey(courses[0].key);
    }
  }, [courses, selectedCourseKey]);

  const activeCourse = useMemo(() => {
    return courses.find(c => c.key === selectedCourseKey) || courses[0] || null;
  }, [courses, selectedCourseKey]);

  const courseSections = useMemo(() => {
    if (!activeCourse) return [];
    const map = new Map<string, PortalGrade[]>();
    for (const item of activeCourse.items) {
      const cat = item.category?.trim() || 'Assignments & Quizzes';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    return [...map.entries()].map(([category, items]) => {
      const scored = items.filter(i => i.score !== null && i.total);
      const catGot = scored.reduce((n, i) => n + (i.score as number), 0);
      const catTotal = scored.reduce((n, i) => n + (i.total as number), 0);
      return { category, items, catGot, catTotal, hasScored: catTotal > 0 };
    });
  }, [activeCourse]);

  return (
    <Shell
      title="Portal grades" account={account} loading={loading} syncing={syncing} checking={checking} onSync={sync}
      onBack={onBack} onOpenSettings={onOpenSettings}
      empty={grades.length === 0} emptyText="No grades are on the portal yet. New ones appear here as soon as they are released."
    >
      <div className="flex flex-col gap-3">
        {/* Mid-term results: one table for all courses, always shown (like the portal's own table) */}
        <section className="overflow-hidden rounded-[18px]" style={card}>
          <div className="flex items-center justify-between px-3.5 py-2.5 text-[0.7rem] font-extrabold uppercase tracking-[0.07em]" style={{ ...muted, borderBottom: '1px solid var(--line)' }}>
            <span>Mid-term · Course</span>
            <span>%</span>
          </div>
          {midterms.length === 0 ? (
            <div className="px-3.5 py-3 text-[0.82rem]" style={muted}>No midterm results are announced yet.</div>
          ) : midterms.map((g, i) => {
            const p = pct(g.score, g.total);
            const name = g.course_name.replace(/\s*\([^)]*\)\s*$/, '').trim() || g.course_name;
            const tone = p === null ? 'var(--text-primary)' : p >= 85 ? '#34d399' : p >= 65 ? 'var(--accent-text)' : p >= 50 ? '#fbbf24' : 'var(--danger)';
            return (
              <div key={g.id} className="flex items-center gap-3 px-3.5 py-2" style={i % 2 ? { background: 'var(--sheet-field)' } : undefined}>
                <div className="min-w-0 flex-1 truncate text-[0.86rem] font-semibold" style={strong}>
                  {name}{' '}
                  <span className="text-[0.7rem] font-semibold" style={{ ...muted, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{g.course_key}</span>
                  {g.is_new && <span className="ml-1.5 rounded-full px-1.5 py-[1px] align-middle text-[0.6rem] font-extrabold uppercase" style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}>New</span>}
                </div>
                <div className="shrink-0 text-[0.9rem] font-extrabold" style={{ color: tone, fontVariantNumeric: 'tabular-nums', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                  {p !== null ? +p.toFixed(2) : g.grade_text}
                </div>
              </div>
            );
          })}
        </section>

        {/* Course selector matching portal */}
        {courses.length > 1 && (
          <div className="rounded-[18px] p-3" style={card}>
            <div className="text-[0.72rem] font-bold uppercase tracking-[0.08em] mb-1.5" style={muted}>
              Course
            </div>
            <div className="relative">
              <select
                value={selectedCourseKey}
                onChange={e => setSelectedCourseKey(e.target.value)}
                className="w-full appearance-none rounded-[14px] px-3.5 py-2.5 pr-9 text-[0.88rem] font-bold outline-none cursor-pointer"
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--line)',
                  color: 'var(--text-primary)',
                }}
              >
                {courses.map(c => (
                  <option key={c.key} value={c.key} className="bg-[#16181f] text-white">
                    {c.key} - {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={17} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={muted} />
            </div>

            {/* Quick-switch course pills */}
            <div className="flex gap-1.5 overflow-x-auto pt-2.5 pb-0.5 no-scrollbar custom-scrollbar">
              {courses.map(c => {
                const active = c.key === selectedCourseKey;
                return (
                  <button
                    key={c.key}
                    onClick={() => setSelectedCourseKey(c.key)}
                    className="shrink-0 rounded-full px-3 py-1 text-[0.74rem] font-bold transition-all border-0 cursor-pointer"
                    style={active
                      ? { background: 'var(--accent)', color: 'var(--on-accent)' }
                      : { background: 'var(--surface-2)', color: 'var(--text-muted)' }}
                  >
                    {c.key}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Selected course card with structured sections */}
        {activeCourse && (() => {
          const scored = activeCourse.items.filter(i => i.score !== null && i.total);
          const got = scored.reduce((n, i) => n + (i.score as number), 0);
          const outOf = scored.reduce((n, i) => n + (i.total as number), 0);

          return (
            <section className="rounded-[18px] p-4 flex flex-col gap-3" style={card}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[0.74rem] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--accent)' }}>
                    {activeCourse.key}
                  </div>
                  <h2 className="m-0 text-[1.08rem] font-extrabold leading-tight" style={strong}>
                    {activeCourse.name}
                  </h2>
                </div>
                {outOf > 0 && (
                  <div className="text-right shrink-0" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    <div className="text-[1.1rem] font-extrabold" style={{ color: 'var(--accent-text)' }}>
                      {Math.round((got / outOf) * 100)}%
                    </div>
                    <div className="text-[0.72rem]" style={muted}>
                      {+got.toFixed(2)} / {+outOf.toFixed(2)} pts
                    </div>
                  </div>
                )}
              </div>

              {/* Categorized Sections (e.g. RPW Assignments, RPW Quiz 1, RPW Quiz 2) */}
              {courseSections.map(sec => (
                <div
                  key={sec.category}
                  className="rounded-[14px] p-3"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}
                >
                  <div className="flex items-center justify-between gap-2 mb-2 pb-1.5" style={{ borderBottom: '1px solid var(--line)' }}>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-1.5 h-3.5 rounded-full shrink-0" style={{ background: 'var(--accent)' }} />
                      <span className="text-[0.8rem] font-extrabold tracking-wide uppercase truncate" style={strong}>
                        {sec.category}
                      </span>
                    </div>
                    {sec.hasScored && (
                      <span className="text-[0.72rem] font-bold shrink-0" style={muted}>
                        {+sec.catGot.toFixed(2)} / {+sec.catTotal.toFixed(2)} pts
                      </span>
                    )}
                  </div>
                  <div>
                    {sec.items.map((g, i) => {
                      const cleanLabel = g.element.replace(new RegExp(`^${g.category}\\s*[-:]\\s*`, 'i'), '').trim() || g.element;
                      return <GradeRow key={g.id} g={g} label={cleanLabel} first={i === 0} />;
                    })}
                  </div>
                </div>
              ))}

              {courseSections.length === 0 && (
                <div className="py-4 text-center text-[0.82rem]" style={muted}>
                  No grades released for this course yet.
                </div>
              )}
            </section>
          );
        })()}

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
  const [open, setOpen] = useState<string | null>(null);
  const screen = usePortalScreen('attendance', async () => {
    const [account, rows, levels] = await Promise.all([getPortalAccount(true), getPortalAttendance(true), getPortalAbsenceLevels(true)]);
    return { account, rows, levels };
  });
  const account = screen.data?.account ?? null;
  const rows = screen.data?.rows ?? [];
  const levels = screen.data?.levels ?? [];
  const { syncing, sync, checking } = screen;
  const loading = !screen.ready;

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
      title="Attendance" account={account} loading={loading} syncing={syncing} checking={checking} onSync={sync}
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
                  <ChevronDown size={16} style={{ ...muted, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)' }} />
                </div>
              </button>

              <Collapse open={expanded}>
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
                          ? { background: 'rgba(251,191,36,0.14)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.5)' }
                          : { background: 'rgba(25,184,166,0.12)', color: 'var(--accent)', border: '1px solid var(--accent)' }}
                      >
                        {r.status || '–'}
                      </span>
                    </div>
                  ))}
                </div>
              </Collapse>
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

export const PortalExamSeats: React.FC<ScreenProps & { onSyncCompleted?: (seats: PortalExamSeat[]) => void }> = ({ onBack, onOpenSettings, onSyncCompleted }) => {
  const screen = usePortalScreen('exam_seats', async () => {
    const [account, seats] = await Promise.all([getPortalAccount(true), getPortalExamSeats(true)]);
    return { account, seats };
  }, {
    onSynced: res => { if (res.examSeats && onSyncCompleted) onSyncCompleted(res.examSeats); },
  });
  const account = screen.data?.account ?? null;
  const seats = screen.data?.seats ?? [];
  const { syncing, checking } = screen;
  const loading = !screen.ready;
  const handleSync = screen.sync;

  const fmtTime12 = (t: string) => {
    if (!t) return '';
    const [hStr, mStr] = t.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  };

  return (
    <Shell
      title="Exam seats"
      account={account}
      loading={loading}
      syncing={syncing}
      checking={checking}
      onSync={handleSync}
      onBack={onBack}
      onOpenSettings={onOpenSettings}
      empty={!seats.length}
      emptyText="No exam seats posted yet. When exams are announced on the portal, they will appear here and sync to your schedule automatically."
    >
      <div className="flex flex-col gap-3">
        {seats.map((s, idx) => (
          <section key={s.id ?? `${s.course_key}-${s.exam_date}-${idx}`} className="rounded-[18px] p-4" style={card}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[0.72rem] font-bold uppercase tracking-[0.08em] px-2 py-0.5 rounded-full" style={{ background: 'rgba(25,184,166,0.12)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
                    {s.course_key}
                  </span>
                  {s.exam_type && (
                    <span className="text-[0.68rem] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-muted, rgba(255,255,255,0.06))', ...muted }}>
                      {s.exam_type}
                    </span>
                  )}
                </div>
                <h3 className="text-[1.05rem] font-extrabold mt-1.5 leading-tight" style={strong}>
                  {s.course_name}
                </h3>
              </div>
            </div>

            <div className="mt-3.5 pt-3 grid grid-cols-2 sm:grid-cols-3 gap-2.5" style={{ borderTop: '1px solid var(--line)' }}>
              <div className="flex items-center gap-2">
                <Calendar size={15} style={{ color: 'var(--accent)' }} />
                <div className="min-w-0">
                  <div className="text-[0.66rem] uppercase tracking-wider font-bold" style={muted}>Date & Day</div>
                  <div className="text-[0.82rem] font-bold truncate" style={strong}>
                    {s.exam_date ? new Date(s.exam_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : s.exam_day}
                    {s.exam_day && s.exam_date ? ` (${s.exam_day.slice(0, 3)})` : ''}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock size={15} style={{ color: 'var(--accent)' }} />
                <div className="min-w-0">
                  <div className="text-[0.66rem] uppercase tracking-wider font-bold" style={muted}>Time</div>
                  <div className="text-[0.82rem] font-bold truncate" style={strong}>
                    {fmtTime12(s.start_time)} – {fmtTime12(s.end_time)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <MapPin size={15} style={{ color: 'var(--accent)' }} />
                <div className="min-w-0">
                  <div className="text-[0.66rem] uppercase tracking-wider font-bold" style={muted}>Hall</div>
                  <div className="text-[0.82rem] font-bold truncate" style={strong}>
                    {s.hall || 'TBA'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
                <Armchair size={15} style={{ color: 'var(--accent)' }} />
                <div className="min-w-0">
                  <div className="text-[0.66rem] uppercase tracking-wider font-bold" style={muted}>Seat</div>
                  <div className="text-[0.82rem] font-extrabold truncate" style={{ color: 'var(--accent)' }}>
                    {s.seat || 'TBA'}
                  </div>
                </div>
              </div>
            </div>
          </section>
        ))}

        <p className="px-1 text-[0.72rem] leading-snug" style={muted}>
          Exam seats sync straight from the GIU student portal. Newly detected exam seats are automatically scheduled into your calendar.
        </p>
      </div>
    </Shell>
  );
};
