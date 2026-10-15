import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, X, ChevronRight, ExternalLink, FileText, Folder, GraduationCap, KeyRound, Loader2, RefreshCw, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { styles } from '../theme';
import { getPortalAccount, readPortalCache, writePortalCache } from '../services/portal';
import {
  CmsCourse, CmsFile, openCmsFile, getCmsCourses, getCmsFiles, groupSeasons, groupWeeks,
  markCmsFilesSeen, shortDate, syncCms, cmsViewKind, loadCmsBlob,
} from '../services/cms';

const PdfViewer = lazy(() => import('./PdfViewer').then(m => ({ default: m.PdfViewer })));

const card: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  backdropFilter: 'var(--glass-blur)',
  WebkitBackdropFilter: 'var(--glass-blur)',
  boxShadow: 'var(--glass-shadow)',
};
const muted: React.CSSProperties = { color: 'var(--text-muted)' };
const strong: React.CSSProperties = { color: 'var(--text-primary)' };

const STALE_MS = 10 * 60 * 1000;
const LAST_SYNC_KEY = 'cms_last_sync_v1';
let triedThisSession = false; // a failing CMS is not asked again on every screen change

interface CmsData { connected: boolean; courses: CmsCourse[]; files: CmsFile[] }

/** Shows the copy saved on this phone first, reloads from the server, and asks the CMS when the data is old. */
function useCms() {
  const [data, setData] = useState<CmsData | null>(() => readPortalCache<CmsData>('cms'));
  const [syncing, setSyncing] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const alive = useRef(true);

  const load = async () => {
    try {
      const account = await getPortalAccount();
      const [courses, files] = await Promise.all([getCmsCourses(true), getCmsFiles(undefined, true)]);
      const d: CmsData = { connected: !!account, courses, files };
      if (!alive.current) return d;
      setData(d);
      writePortalCache('cms', d);
      return d;
    } catch {
      return null; // offline: keep the saved copy
    }
  };

  const check = async (manual: boolean) => {
    setSyncing(true);
    setProblem(null);
    const res = await syncCms();
    if (alive.current) {
      if (res.ok) {
        try { localStorage.setItem(LAST_SYNC_KEY, String(Date.now())); } catch { /* ignore */ }
        await load();
        if (manual) toast.success(res.newFiles ? `${res.newFiles} new file${res.newFiles === 1 ? '' : 's'}` : 'Up to date');
      } else {
        setProblem(res.message || 'Could not check the CMS.');
        if (manual) toast.error(res.message || 'Could not check the CMS.');
      }
      setSyncing(false);
    }
  };

  useEffect(() => {
    alive.current = true;
    (async () => {
      const d = await load();
      if (!alive.current || !d?.connected) return;
      let last = 0;
      try { last = Number(localStorage.getItem(LAST_SYNC_KEY)) || 0; } catch { /* ignore */ }
      if (!triedThisSession && (Date.now() - last > STALE_MS || d.courses.length === 0)) {
        triedThisSession = true;
        await check(false);
      }
    })();
    return () => { alive.current = false; };
  }, []);

  const patchFiles = (ids: number[]) =>
    setData(d => (d ? { ...d, files: d.files.map(f => (ids.includes(f.id) ? { ...f, is_new: false } : f)) } : d));

  return { data, syncing, problem, sync: () => check(true), patchFiles };
}

const iconBtn = 'flex items-center justify-center w-10 h-10 rounded-[14px] shrink-0';

const Header: React.FC<{
  title: string; sub?: string; onBack: () => void; onSync?: () => void; syncing?: boolean;
}> = ({ title, sub, onBack, onSync, syncing }) => (
  <div className="mb-4 flex items-center gap-3">
    <button onClick={onBack} aria-label="Back" className={iconBtn} style={{ ...card, ...strong }}>
      <ArrowLeft size={18} />
    </button>
    <div className="min-w-0 flex-1">
      <h1 className="m-0 truncate font-extrabold leading-tight" style={{ fontSize: '1.45rem', letterSpacing: '-0.02em', ...strong }}>{title}</h1>
      {sub && <div className="truncate text-[0.78rem] font-semibold" style={muted}>{sub}</div>}
    </div>
    {onSync && (
      <button onClick={onSync} disabled={syncing} aria-label="Check the CMS now" className={iconBtn} style={{ ...card, color: 'var(--accent)' }}>
        {syncing ? <Loader2 size={17} className="animate-spin" /> : <RefreshCw size={17} />}
      </button>
    )}
  </div>
);

const NotConnected: React.FC<{ onOpenSettings: () => void }> = ({ onOpenSettings }) => (
  <div className="page-in rounded-[20px] px-5 py-6 text-center" style={card}>
    <KeyRound size={22} className="mx-auto mb-2" style={{ color: 'var(--accent)' }} />
    <div className="text-[1rem] font-extrabold" style={strong}>Connect your uni login</div>
    <p className="mt-1 mb-4 text-[0.82rem] leading-snug" style={muted}>The CMS uses the same username and password as the portal. Add them in Settings and your course files show up here.</p>
    <button onClick={onOpenSettings} className="rounded-[14px] border-0 px-5 py-2.5 text-[0.85rem] font-bold" style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}>
      Open Settings
    </button>
  </div>
);

const Problem: React.FC<{ text: string }> = ({ text }) => (
  <div className="mb-3 rounded-[16px] px-3.5 py-2.5 text-[0.8rem] font-semibold" style={{ ...card, color: '#fbbf24' }}>{text}</div>
);

const NewBadge: React.FC<{ n: number }> = ({ n }) => (
  <span className="shrink-0 rounded-full px-2 py-[1px] text-[0.68rem] font-extrabold" style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}>{n} new</span>
);

// ───────────── course list (current season) ─────────────

const CmsCourses: React.FC<{
  data: CmsData | null; syncing: boolean; problem: string | null;
  onBack: () => void; onSync: () => void; onOpenCourse: (c: CmsCourse) => void; onOpenSettings: () => void;
}> = ({ data, syncing, problem, onBack, onSync, onOpenCourse, onOpenSettings }) => {
  const [query, setQuery] = useState('');

  // only the current season is shown
  const seasons = useMemo(() => {
    const all = groupSeasons(data?.courses ?? [], data?.files ?? []);
    const now = all.find(s => s.current) ?? all[0];
    return now ? [now] : [];
  }, [data]);
  const q = query.trim().toLowerCase();
  const shown = useMemo(
    () => seasons
      .map(s => ({ ...s, courses: q ? s.courses.filter(c => (c.code + ' ' + c.name).toLowerCase().includes(q)) : s.courses }))
      .filter(s => s.courses.length > 0),
    [seasons, q],
  );
  return (
    <div style={styles.scrollableContent} className="custom-scrollbar">
      <div className="mx-auto w-full max-w-3xl page-in">
        <Header title="CMS" sub={syncing ? 'Checking for updates…' : (seasons[0]?.courses.length ? `${seasons[0].courses.length} ${seasons[0].courses.length === 1 ? 'course' : 'courses'} this semester` : undefined)} onBack={onBack} onSync={data?.connected ? onSync : undefined} syncing={syncing} />
        {data && !data.connected ? <NotConnected onOpenSettings={onOpenSettings} /> : (
          <>
            {problem && <Problem text={problem} />}
            {!data ? (
              <div className="flex justify-center py-16" style={muted}><Loader2 size={22} className="animate-spin" /></div>
            ) : data.courses.length === 0 ? (
              <div className="rounded-[18px] px-4 py-5 text-center text-[0.85rem]" style={{ ...card, ...muted }}>
                {syncing ? 'Loading your courses…' : 'No courses yet. Tap the refresh button to check the CMS.'}
              </div>
            ) : (
              <div className="stagger-in flex flex-col gap-3">
                <label className="flex h-11 items-center gap-2.5 rounded-[16px] px-3.5" style={card}>
                  <Search size={17} style={muted} />
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search courses"
                    className="min-w-0 flex-1 border-0 bg-transparent text-[0.9rem] outline-none"
                    style={strong}
                  />
                </label>
                {shown.map(s => (
                  <section key={s.id}>
                    <div className="mb-2 flex items-center gap-2 px-1">
                      <span className="text-[0.8rem] font-bold" style={muted}>{s.title}</span>
                      {s.current && <span className="rounded-full px-2 py-[1px] text-[0.62rem] font-extrabold" style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}>Current</span>}
                      <span className="flex-1" />
                      {s.newCount > 0 && <NewBadge n={s.newCount} />}
                    </div>
                    <div className="overflow-hidden rounded-[20px]" style={card}>
                      {s.courses.map((c, i) => {
                        const n = (data.files ?? []).filter(f => f.course_id === c.course_id && f.is_new).length;
                        return (
                          <button
                            key={c.course_id}
                            onClick={() => onOpenCourse(c)}
                            className="flex w-full items-center gap-3 border-0 bg-transparent px-3.5 py-3.5 text-left"
                            style={i > 0 ? { borderTop: '1px solid var(--line)' } : undefined}
                          >
                            <span className="w-[58px] shrink-0 rounded-[8px] py-1 text-center text-[0.68rem] font-extrabold tracking-wide" style={{ background: 'rgba(25,184,166,0.14)', color: 'var(--accent-text)' }}>{c.code || '—'}</span>
                            <span className="min-w-0 flex-1 text-[0.92rem] font-semibold leading-tight" style={strong}>{c.name}</span>
                            {n > 0 && <NewBadge n={n} />}
                            <ChevronRight size={15} style={muted} />
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
                {shown.length === 0 && <div className="px-1 text-[0.85rem]" style={muted}>No course matches “{query}”.</div>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ───────────── one course: weeks and files ─────────────

const fileGroup = (type: string): 'lectures' | 'assignments' | 'solutions' | 'other' => {
  if (/solution/i.test(type)) return 'solutions';
  if (/lecture|slide/i.test(type)) return 'lectures';
  if (/assign|lab|quiz|practice/i.test(type)) return 'assignments';
  return 'other';
};
const GROUP_LABEL: Record<string, string> = { lectures: 'Lectures', assignments: 'Assignments', solutions: 'Solutions', other: 'Other' };

const CmsCourseView: React.FC<{
  course: CmsCourse; files: CmsFile[]; syncing: boolean; problem: string | null;
  onBack: () => void; onSync: () => void; onSeen: (ids: number[]) => void;
}> = ({ course, files, syncing, problem, onBack, onSync, onSeen }) => {
  const [filter, setFilter] = useState<string>('all');
  const [busy, setBusy] = useState<number | null>(null);

  const mine = useMemo(() => files.filter(f => f.course_id === course.course_id), [files, course.course_id]);
  const groups = useMemo(() => {
    const present = new Set(mine.map(f => fileGroup(f.file_type)));
    return (['lectures', 'assignments', 'solutions', 'other'] as const).filter(g => present.has(g));
  }, [mine]);
  const weeks = useMemo(
    () => groupWeeks(filter === 'all' ? mine : mine.filter(f => fileGroup(f.file_type) === filter)),
    [mine, filter],
  );
  const newCount = mine.filter(f => f.is_new).length;

  const [viewing, setViewing] = useState<{ title: string; kind: 'pdf' | 'image'; url: string } | null>(null);
  const closeViewer = () => { setViewing(v => { if (v) URL.revokeObjectURL(v.url); return null; }); };
  useEffect(() => () => { setViewing(v => { if (v) URL.revokeObjectURL(v.url); return null; }); }, []);

  // a file is downloaded only when tapped, and kept on the phone so opening it again is instant
  const openFile = async (f: CmsFile) => {
    if (busy !== null) return;
    setBusy(f.id);
    const kind = cmsViewKind(f.path);
    let ok = false;
    if (kind) {
      const res = await loadCmsBlob({ content_id: f.content_id, path: f.path });
      if (res.ok && res.blob) {
        ok = true;
        setViewing({ title: f.title, kind, url: URL.createObjectURL(res.blob) });
      } else toast.error(res.message || 'Could not open the file.');
    } else {
      const res = await openCmsFile({ content_id: f.content_id, path: f.path });
      ok = res.ok;
      if (!res.ok) toast.error(res.message || 'Could not open the file.');
    }
    setBusy(null);
    if (ok && f.is_new) { onSeen([f.id]); markCmsFilesSeen([f.id]); }
  };

  return (
    <div style={styles.scrollableContent} className="custom-scrollbar">
      <div className="mx-auto w-full max-w-3xl page-in">
        <Header
          title={course.name}
          sub={syncing ? 'Checking for updates…' : [course.season_title, newCount ? `${newCount} new` : ''].filter(Boolean).join(' · ')}
          onBack={onBack} onSync={onSync} syncing={syncing}
        />
        {problem && <Problem text={problem} />}

        {groups.length > 1 && (
          <div className="mb-4 flex gap-5 overflow-x-auto" style={{ borderBottom: '1px solid var(--line)', scrollbarWidth: 'none' }}>
            {(['all', ...groups] as string[]).map(g => {
              const active = filter === g;
              return (
                <button
                  key={g}
                  onClick={() => setFilter(g)}
                  className="shrink-0 border-0 bg-transparent px-0 pb-2.5 text-[0.88rem] font-bold"
                  style={{ color: active ? 'var(--text-primary)' : 'var(--text-muted)', borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent', marginBottom: -1 }}
                >
                  {g === 'all' ? 'All' : GROUP_LABEL[g]}
                </button>
              );
            })}
          </div>
        )}

        {mine.length === 0 ? (
          <div className="rounded-[18px] px-4 py-5 text-center text-[0.85rem]" style={{ ...card, ...muted }}>
            {syncing ? 'Loading files…' : 'No files in this course yet.'}
          </div>
        ) : (
          <div key={filter} className="stagger-in">
            {weeks.map(w => (
              <section key={w.date ?? 'none'} className="mb-5">
                <div className="mb-2 flex items-baseline justify-between px-1">
                  <div className="text-[0.8rem] font-bold" style={muted}>{w.description || 'Week'}</div>
                  <div className="text-[0.78rem]" style={{ color: 'var(--text-muted)', opacity: 0.75 }}>{shortDate(w.date)}</div>
                </div>
                <div className="rounded-[16px]" style={card}>
                  {w.files.map((f, i) => (
                    <button
                      key={f.id}
                      onClick={() => openFile(f)}
                      className="flex w-full items-center gap-3 border-0 bg-transparent px-3.5 py-3 text-left"
                      style={i > 0 ? { borderTop: '1px solid var(--line)' } : undefined}
                    >
                      <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: f.is_new ? 'var(--accent)' : 'transparent' }} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[0.92rem] font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>{f.title}</span>
                        {f.file_type && <span className="mt-0.5 block text-[0.76rem]" style={{ color: 'var(--text-muted)', opacity: 0.8 }}>{f.file_type}</span>}
                      </span>
                      {busy === f.id ? <Loader2 size={19} className="animate-spin" style={muted} /> : <ExternalLink size={19} style={muted} />}
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
      {viewing && (
        <div className="fixed inset-0 z-[80] flex flex-col" style={{ background: '#09090b' }}>
          <div className="flex items-center gap-3 px-4 pb-3" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)', borderBottom: '1px solid var(--line)' }}>
            <button onClick={closeViewer} className="flex h-9 w-9 shrink-0 items-center justify-center border-0 bg-transparent" style={strong} aria-label="Close"><X size={24} /></button>
            <div className="min-w-0 flex-1 truncate text-[0.95rem] font-bold" style={strong}>{viewing.title}</div>
          </div>
          <div className="min-h-0 flex-1">
            {viewing.kind === 'pdf' ? (
              <Suspense fallback={<div className="flex h-full items-center justify-center"><Loader2 size={26} className="animate-spin" style={muted} /></div>}>
                <PdfViewer file={viewing.url} />
              </Suspense>
            ) : (
              <img src={viewing.url} alt={viewing.title} className="h-full w-full object-contain" />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ───────────── Materials start page ─────────────

type Section = 'hub' | 'files' | 'cms';

const MaterialsHub: React.FC<{
  filesView: (goBack: () => void) => React.ReactNode;
  onOpenSettings: () => void;
}> = ({ filesView, onOpenSettings }) => {
  const [section, setSection] = useState<Section>('hub');
  const [course, setCourse] = useState<CmsCourse | null>(null);
  const cms = useCms();

  if (section === 'files') return <>{filesView(() => setSection('hub'))}</>;

  if (section === 'cms' && course) {
    return (
      <CmsCourseView
        key={course.course_id}
        course={course}
        files={cms.data?.files ?? []}
        syncing={cms.syncing}
        problem={cms.problem}
        onBack={() => setCourse(null)}
        onSync={cms.sync}
        onSeen={cms.patchFiles}
      />
    );
  }

  if (section === 'cms') {
    return (
      <CmsCourses
        data={cms.data}
        syncing={cms.syncing}
        problem={cms.problem}
        onBack={() => setSection('hub')}
        onSync={cms.sync}
        onOpenCourse={setCourse}
        onOpenSettings={onOpenSettings}
      />
    );
  }

  const files = cms.data?.files ?? [];
  const totalNew = files.filter(f => f.is_new).length;
  const nameOf = (id: number) => cms.data?.courses.find(c => c.course_id === id)?.name ?? '';
  const recent = files.length
    ? [...files].sort((a, b) => b.content_id - a.content_id).slice(0, 2)
    : [];

  return (
    <div style={styles.scrollableContent} className="custom-scrollbar">
      <div className="mx-auto w-full max-w-3xl page-in">
        <div className="mb-5">
          <h1 className="m-0 font-extrabold leading-none" style={{ fontSize: '2rem', letterSpacing: '-0.025em', ...strong }}>Materials</h1>
          <div className="mt-1.5 text-[0.82rem] font-semibold" style={muted}>Your files and your courses</div>
        </div>

        <div className="stagger-in">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setSection('files')}
              className="flex h-[158px] flex-col justify-between rounded-[26px] p-4 text-left"
              style={{ background: 'linear-gradient(165deg, rgba(106,165,255,0.24), rgba(106,165,255,0.05))', border: '1px solid rgba(106,165,255,0.38)' }}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-[15px]" style={{ background: 'rgba(106,165,255,0.2)', color: '#9cc2ff' }}><Folder size={24} /></span>
              <span>
                <span className="block text-[1.18rem] font-extrabold" style={strong}>Materials</span>
                <span className="block text-[0.75rem] font-semibold" style={muted}>Files you added</span>
              </span>
            </button>
            <button
              onClick={() => setSection('cms')}
              className="flex h-[158px] flex-col justify-between rounded-[26px] p-4 text-left"
              style={{ background: 'linear-gradient(165deg, rgba(25,184,166,0.3), rgba(25,184,166,0.06))', border: '1px solid rgba(25,184,166,0.55)' }}
            >
              <span className="flex items-start justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-[15px]" style={{ background: 'rgba(25,184,166,0.25)', color: 'var(--accent-text)' }}><GraduationCap size={24} /></span>
                {totalNew > 0 && <NewBadge n={totalNew} />}
              </span>
              <span>
                <span className="block text-[1.18rem] font-extrabold" style={strong}>CMS</span>
                <span className="block text-[0.75rem] font-semibold" style={muted}>GIU course content</span>
              </span>
            </button>
          </div>

          {recent.length > 0 && (
            <div className="mt-5">
              <div className="mb-2 px-0.5 text-[0.68rem] font-extrabold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)', opacity: 0.8 }}>Recent</div>
              <div className="flex flex-col gap-2">
                {recent.map(f => (
                  <button
                    key={f.id}
                    onClick={() => {
                      const c = cms.data?.courses.find(x => x.course_id === f.course_id);
                      if (c) { setCourse(c); setSection('cms'); }
                    }}
                    className="flex items-center gap-3 rounded-[18px] p-3 text-left"
                    style={card}
                  >
                    <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[12px]" style={{ background: 'rgba(25,184,166,0.18)', color: 'var(--accent-text)' }}><FileText size={18} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.88rem] font-bold" style={strong}>{f.title}</span>
                      <span className="block truncate text-[0.75rem]" style={muted}>CMS · {nameOf(f.course_id)}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MaterialsHub;
