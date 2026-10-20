import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Check, CheckCircle2, EyeOff, Link2, ListChecks, Loader2, MoreHorizontal, Plus, Trash2, Upload, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { styles } from '../theme';
import Sheet from './Sheet';
import {
  Milestone, Project, ProjectFile, ProjectsData, Task,
  loadProjects, readProjectsCache, saveProgress, openLink, fileUrl,
  saveProject, deleteProject, saveMilestone, deleteMilestone, uploadProjectFile, removeProjectFile, getMilestoneStats,
  timeLeft, urgency, dueText, sizeText, fileKind,
} from '../services/projects';

// ── look (the app's own theme colors) ──
const card: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--line)',
  backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)', boxShadow: 'var(--glass-shadow)',
};
const field: React.CSSProperties = { background: 'var(--sheet-field)', border: '1px solid var(--line)' };
const muted: React.CSSProperties = { color: 'var(--text-muted)' };
const strong: React.CSSProperties = { color: 'var(--text-primary)' };
const mono: React.CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' };
const label = 'mb-1.5 px-1 text-[11px] font-extrabold uppercase tracking-[0.08em]';
const inputBase = 'w-full min-w-0 bg-transparent border-0 outline-none text-[16px] font-semibold';

const pillStyle = (iso: string, now: number): React.CSSProperties => {
  const u = urgency(iso, now);
  if (u === 'red') return { background: 'color-mix(in srgb, var(--danger) 16%, transparent)', color: 'var(--danger)' };
  if (u === 'amber') return { background: 'rgba(251,191,36,0.15)', color: '#f59e0b' };
  return { background: 'var(--surface-2)', color: 'var(--text-primary)' };
};

const Pill: React.FC<{ style: React.CSSProperties; children: React.ReactNode }> = ({ style, children }) => (
  <span className="shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-bold" style={{ ...mono, ...style }}>{children}</span>
);

const Toggle: React.FC<{ on: boolean; onChange: (v: boolean) => void; label: string }> = ({ on, onChange, label: l }) => (
  <button type="button" role="switch" aria-checked={on} aria-label={l} onClick={() => onChange(!on)}
    className="relative h-[30px] w-[50px] shrink-0 rounded-full border-0 p-0 transition-colors"
    style={{ background: on ? 'var(--cta-bg)' : 'var(--surface-2)' }}>
    <span className="absolute top-[3px] h-6 w-6 rounded-full bg-white transition-all" style={{ left: on ? 23 : 3, boxShadow: '0 2px 6px rgba(0,0,0,0.25)' }} />
  </button>
);

const tasksDone = (tasks: Task[]) => `${tasks.filter(t => t.done).length}/${tasks.length}`;

// ───────────────────────── main screen ─────────────────────────

const ProjectsScreen: React.FC<{ isAdmin: boolean }> = ({ isAdmin }) => {
  const [data, setData] = useState<ProjectsData | null>(() => readProjectsCache());
  const [problem, setProblem] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);        // project shown
  const [msId, setMsId] = useState<string | null>(null);            // milestone tab shown
  const [projectSheet, setProjectSheet] = useState<Project | 'new' | null>(null);
  const [msSheet, setMsSheet] = useState<{ projectId: string; m?: Milestone } | null>(null);
  const [now, setNow] = useState(Date.now());

  const reload = async () => {
    try { setData(await loadProjects()); setProblem(null); }
    catch { setProblem('Could not load projects. Check your connection.'); }
  };
  useEffect(() => {
    reload();
    const tick = setInterval(() => setNow(Date.now()), 60_000);
    const vis = () => { if (document.visibilityState === 'visible') { setNow(Date.now()); reload(); } };
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(tick); document.removeEventListener('visibilitychange', vis); };
  }, []);

  const projectOf = useMemo(() => new Map((data?.projects ?? []).map(p => [p.id, p])), [data]);
  const live = (m: Milestone) => !m.cancelled && !m.hidden && !projectOf.get(m.project_id)?.archived;

  const upcoming = useMemo(() => (data?.milestones ?? [])
    .filter(m => live(m) && new Date(m.due_at).getTime() > now && !data?.progress[m.id]?.submitted)
    .sort((a, b) => a.due_at.localeCompare(b.due_at)), [data, now]);
  const done = useMemo(() => (data?.milestones ?? [])
    .filter(m => live(m) && (data?.progress[m.id]?.submitted || new Date(m.due_at).getTime() <= now))
    .sort((a, b) => b.due_at.localeCompare(a.due_at)).slice(0, 8), [data, now]);

  const setProgressLocal = (mid: string, patch: Partial<{ submitted: boolean; tasks: Task[]; viewed_at: string | null }>) => {
    setData(d => {
      if (!d) return d;
      const cur = d.progress[mid] ?? { milestone_id: mid, submitted: false, tasks: [], viewed_at: null };
      return { ...d, progress: { ...d.progress, [mid]: { ...cur, ...patch } } };
    });
    saveProgress(mid, patch).then(ok => { if (!ok) toast.error('Could not save. Check your connection.'); });
  };

  const open = (projectId: string, milestoneId?: string) => { setOpenId(projectId); setMsId(milestoneId ?? null); };

  const sheets = (
    <>
      {projectSheet && (
        <ProjectSheet
          project={projectSheet === 'new' ? null : projectSheet}
          onClose={() => setProjectSheet(null)}
          onSaved={(row, deleted) => {
            setProjectSheet(null);
            setData(d => {
              const base = d ?? { projects: [], milestones: [], files: [], progress: {} };
              if (deleted) return { ...base, projects: base.projects.filter(p => p.id !== row.id), milestones: base.milestones.filter(m => m.project_id !== row.id) };
              const others = base.projects.filter(p => p.id !== row.id);
              return { ...base, projects: [row as Project, ...others] };
            });
            if (deleted) setOpenId(null); else open(row.id);
            reload();
          }}
        />
      )}
      {msSheet && (
        <MilestoneSheet
          projectId={msSheet.projectId}
          milestone={msSheet.m ?? null}
          files={(data?.files ?? []).filter(f => f.milestone_id === msSheet.m?.id)}
          allFiles={data?.files ?? []}
          onClose={() => setMsSheet(null)}
          onSaved={(row, uploads) => {
            setMsSheet(null);
            const gone = 'deleted' in row;
            setData(d => {
              if (!d) return d;
              const others = d.milestones.filter(m => m.id !== row.id);
              return { ...d, milestones: gone ? others : [...others, row as Milestone] };
            });
            setMsId(gone ? null : row.id);
            // files go up after the sheet closes; the list refreshes when they are done
            if (uploads) {
              const t = toast.loading('Uploading files…');
              uploads.then(ok => { toast[ok ? 'success' : 'error'](ok ? 'Files uploaded' : 'Some files did not upload', { id: t }); reload(); });
            } else reload();
          }}
        />
      )}
    </>
  );

  if (openId && data) {
    const project = projectOf.get(openId);
    if (project) return (
      <>
        <ProjectView
          project={project} data={data} isAdmin={isAdmin} now={now} msId={msId}
          onPickMs={setMsId} onBack={() => setOpenId(null)}
          onEditProject={() => setProjectSheet(project)}
          onAddMilestone={() => setMsSheet({ projectId: project.id })}
          onEditMilestone={(m) => setMsSheet({ projectId: project.id, m })}
          onProgress={setProgressLocal}
        />
        {sheets}
      </>
    );
  }

  const next = upcoming[0];
  const later = upcoming.slice(1);
  const row = (m: Milestone, i: number, faded = false) => {
    const p = projectOf.get(m.project_id);
    const prog = data?.progress[m.id];
    const submitted = !!prog?.submitted;
    return (
      <button key={m.id} onClick={() => open(m.project_id, m.id)}
        className="flex w-full items-center gap-3 border-0 bg-transparent px-3.5 py-2.5 text-left"
        style={i ? { borderTop: '1px solid var(--line)' } : undefined}>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-bold" style={faded ? muted : strong}>{m.title}</span>
          <span className="mt-0.5 block truncate text-[11.5px] font-semibold" style={{ ...mono, ...muted }}>
            {[p?.course_code || p?.title, prog?.tasks.length ? tasksDone(prog.tasks) : null, submitted ? 'submitted' : null].filter(Boolean).join(' · ')}
          </span>
        </span>
        {submitted
          ? <Pill style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399' }}>done</Pill>
          : new Date(m.due_at).getTime() <= now ? <Pill style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>closed</Pill>
          : <Pill style={pillStyle(m.due_at, now)}>{timeLeft(m.due_at, now)}</Pill>}
      </button>
    );
  };

  return (
    <div style={styles.scrollableContent} className="custom-scrollbar">
      <div className="mx-auto w-full max-w-3xl page-in">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h1 className="m-0 text-[28px] font-extrabold tracking-tight" style={strong}>Projects</h1>
            <div className="text-[13px]" style={muted}>
              {data ? `${upcoming.length} upcoming${upcoming.filter(m => new Date(m.due_at).getTime() - now < 7 * 864e5).length ? ` · ${upcoming.filter(m => new Date(m.due_at).getTime() - now < 7 * 864e5).length} this week` : ''}` : 'Loading…'}
            </div>
          </div>
          {isAdmin && (
            <button onClick={() => setProjectSheet('new')} aria-label="New project"
              className="flex h-10 w-10 items-center justify-center rounded-[13px] border-0" style={{ background: 'var(--cta-bg)', color: 'var(--cta-ink)' }}>
              <Plus size={20} strokeWidth={2.6} />
            </button>
          )}
        </div>

        {problem && <div className="mb-3 rounded-2xl px-3.5 py-2.5 text-[13px] font-semibold" style={{ background: 'color-mix(in srgb, var(--danger) 12%, transparent)', color: 'var(--danger)' }}>{problem}</div>}

        {!data && !problem && <div className="flex justify-center py-16"><Loader2 className="animate-spin" style={muted} /></div>}

        {data && !data.projects.length && (
          <div className="rounded-[20px] px-5 py-8 text-center" style={card}>
            <ListChecks size={30} className="mx-auto mb-2" style={muted} />
            <div className="text-[16px] font-bold" style={strong}>No projects yet</div>
            <div className="mt-1 text-[13px]" style={muted}>{isAdmin ? 'Tap + to post the first project.' : 'When a project is posted, it shows up here with its deadlines.'}</div>
          </div>
        )}

        {next && (() => {
          const p = projectOf.get(next.project_id);
          const prog = data?.progress[next.id];
          const nFiles = (data?.files ?? []).filter(f => f.milestone_id === next.id).length;
          return (
            <>
              <div className={label} style={muted}>Due next</div>
              <div className="mb-4 rounded-[20px] p-3.5" style={card}>
                <div className="flex items-start justify-between gap-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-[11.5px] font-bold" style={{ ...mono, color: 'var(--accent-text)' }}>{[p?.course_code, p?.title].filter(Boolean).join(' · ')}</div>
                    <div className="mt-0.5 text-[17px] font-extrabold" style={strong}>{next.title}</div>
                    <div className="mt-0.5 text-[12.5px]" style={muted}>
                      {[dueText(next.due_at), next.team_size ? `Team of ${next.team_size}` : null, nFiles ? `${nFiles} file${nFiles > 1 ? 's' : ''}` : null].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <Pill style={pillStyle(next.due_at, now)}>{timeLeft(next.due_at, now)}</Pill>
                </div>
                {!!prog?.tasks.length && (
                  <div className="mt-3 flex items-center gap-2.5">
                    <div className="h-[5px] flex-1 overflow-hidden rounded-full" style={{ background: 'var(--surface-2)' }}>
                      <div className="h-full rounded-full" style={{ width: `${(prog.tasks.filter(t => t.done).length / prog.tasks.length) * 100}%`, background: 'var(--cta-bg)' }} />
                    </div>
                    <span className="text-[11.5px] font-bold" style={{ ...mono, ...muted }}>{tasksDone(prog.tasks)}</span>
                  </div>
                )}
                <div className="mt-3 flex gap-2">
                  <button onClick={() => open(next.project_id, next.id)} className="h-[42px] flex-1 rounded-[13px] text-[14.5px] font-bold" style={{ ...card, boxShadow: 'none', ...strong }}>Details</button>
                  <button onClick={() => next.submit_link ? openLink(next.submit_link) : toast('No submission link yet.')}
                    className="flex h-[42px] flex-1 items-center justify-center gap-1.5 rounded-[13px] border-0 text-[14.5px] font-extrabold"
                    style={{ background: 'var(--cta-bg)', color: 'var(--cta-ink)', opacity: next.submit_link ? 1 : 0.55 }}>
                    Submit <ArrowUpRight size={16} strokeWidth={2.6} />
                  </button>
                </div>
              </div>
            </>
          );
        })()}

        {later.length > 0 && (
          <>
            <div className={label} style={muted}>Later</div>
            <div className="mb-4 overflow-hidden rounded-[18px]" style={card}>{later.map((m, i) => row(m, i))}</div>
          </>
        )}

        {done.length > 0 && (
          <>
            <div className={label} style={muted}>Done & closed</div>
            <div className="mb-4 overflow-hidden rounded-[18px]" style={card}>{done.map((m, i) => row(m, i, true))}</div>
          </>
        )}

        {!!data?.projects.length && (
          <>
            <div className={label} style={muted}>All projects</div>
            <div className="mb-4 overflow-hidden rounded-[18px]" style={card}>
              {data.projects.filter(p => isAdmin || !p.archived).map((p, i) => {
                const ms = data.milestones.filter(m => m.project_id === p.id && !m.cancelled);
                return (
                  <button key={p.id} onClick={() => open(p.id)} className="flex w-full items-center gap-3 border-0 bg-transparent px-3.5 py-2.5 text-left"
                    style={i ? { borderTop: '1px solid var(--line)' } : undefined}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-bold" style={p.archived ? muted : strong}>{p.title}</span>
                      <span className="mt-0.5 block truncate text-[11.5px] font-semibold" style={{ ...mono, ...muted }}>
                        {[p.course_code, `${ms.length} milestone${ms.length === 1 ? '' : 's'}`, p.archived ? 'archived' : null].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
      {sheets}
    </div>
  );
};

// ───────────────────────── one project ─────────────────────────

const ProjectView: React.FC<{
  project: Project; data: ProjectsData; isAdmin: boolean; now: number; msId: string | null;
  onPickMs: (id: string) => void; onBack: () => void; onEditProject: () => void;
  onAddMilestone: () => void; onEditMilestone: (m: Milestone) => void;
  onProgress: (mid: string, patch: Partial<{ submitted: boolean; tasks: Task[]; viewed_at: string | null }>) => void;
}> = ({ project, data, isAdmin, now, msId, onPickMs, onBack, onEditProject, onAddMilestone, onEditMilestone, onProgress }) => {
  const ms = data.milestones.filter(m => m.project_id === project.id && (isAdmin || !m.cancelled)).sort((a, b) => a.due_at.localeCompare(b.due_at));
  // default tab: the next open milestone, else the last one
  const auto = ms.find(m => new Date(m.due_at).getTime() > now && !data.progress[m.id]?.submitted && !m.cancelled) ?? ms[ms.length - 1];
  const m = ms.find(x => x.id === msId) ?? auto;
  const prog = m ? data.progress[m.id] : undefined;
  const files = m ? data.files.filter(f => f.milestone_id === m.id) : [];
  const tasks = prog?.tasks ?? [];
  const [newTask, setNewTask] = useState('');
  const [stats, setStats] = useState<{ viewed: number; submitted: number; total: number } | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  // first look counts as "viewed" (for the admin's numbers)
  useEffect(() => {
    if (m && !isAdmin && !prog?.viewed_at) onProgress(m.id, { viewed_at: new Date().toISOString() });
    if (m && isAdmin) { setStats(null); getMilestoneStats(m.id).then(setStats); }
  }, [m?.id]);

  const openFile = async (f: ProjectFile) => {
    setOpening(f.id);
    const url = await fileUrl(f);
    setOpening(null);
    if (url) openLink(url); else toast.error('Could not open the file.');
  };
  const addTask = () => {
    const t = newTask.trim();
    if (!t || !m) return;
    onProgress(m.id, { tasks: [...tasks, { t, done: false }] });
    setNewTask('');
  };
  const past = m ? new Date(m.due_at).getTime() <= now : false;

  return (
    <div style={styles.scrollableContent} className="custom-scrollbar">
      <div className="mx-auto w-full max-w-3xl page-in">
        <div className="mb-3 flex items-center gap-2.5">
          <button onClick={onBack} aria-label="Back" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px]" style={{ ...card, boxShadow: 'none', ...strong }}><ArrowLeft size={18} /></button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              {isAdmin && <span className="rounded-[5px] px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide" style={{ background: 'rgba(167,139,250,0.18)', color: '#a78bfa' }}>ADMIN</span>}
              {project.course_code && <span className="truncate text-[11.5px] font-bold" style={{ ...mono, color: 'var(--accent-text)' }}>{project.course_code}{project.course_name ? ` · ${project.course_name}` : ''}</span>}
            </div>
            <div className="truncate text-[18px] font-extrabold tracking-tight" style={strong}>{project.title}</div>
          </div>
          {isAdmin && <button onClick={onEditProject} aria-label="Edit project" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px]" style={{ ...card, boxShadow: 'none', ...strong }}><MoreHorizontal size={18} /></button>}
        </div>

        {project.note && (
          <div className="mb-3 rounded-[14px] px-3 py-2.5 text-[13px] leading-snug" style={{ background: 'rgba(96,165,250,0.10)', border: '1px solid rgba(96,165,250,0.22)', ...strong }}>
            <span className="font-extrabold">Note: </span>{project.note}
          </div>
        )}

        {(ms.length > 0 || isAdmin) && (
          <div role="tablist" className="mb-3 flex gap-1 overflow-x-auto rounded-[13px] p-1" style={{ ...card, boxShadow: 'none', scrollbarWidth: 'none' }}>
            {ms.map(x => {
              const on = x.id === m?.id;
              const sub = data.progress[x.id]?.submitted;
              return (
                <button key={x.id} role="tab" aria-selected={on} onClick={() => onPickMs(x.id)}
                  className="flex h-8 min-w-[72px] flex-1 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-[9px] border-0 px-2.5 text-[13px] font-bold"
                  style={on ? { background: 'var(--nav-active-bg, rgba(25,184,166,0.2))', color: 'var(--accent-text)' } : { background: 'transparent', ...muted, textDecoration: x.cancelled ? 'line-through' : undefined }}>
                  {sub && <Check size={12} strokeWidth={3.2} color="#34d399" />}
                  {x.hidden && <EyeOff size={12} />}
                  <span className="max-w-[110px] truncate">{x.title.split(/\s*[·:-]\s*/)[0]}</span>
                </button>
              );
            })}
            {isAdmin && (
              <button onClick={onAddMilestone} aria-label="Add milestone" className="flex h-8 w-10 shrink-0 items-center justify-center rounded-[9px] border-0 bg-transparent" style={{ color: 'var(--accent-text)' }}>
                <Plus size={17} strokeWidth={2.6} />
              </button>
            )}
          </div>
        )}

        {!m ? (
          <div className="rounded-[20px] px-5 py-7 text-center text-[13.5px]" style={{ ...card, ...muted }}>
            {isAdmin ? 'No milestones yet. Tap + to add the first deadline.' : 'No deadlines posted yet.'}
          </div>
        ) : (
          <>
            <div className="rounded-[20px] p-3.5" style={card}>
              <div className="flex items-start justify-between gap-2.5">
                <div className="min-w-0">
                  <div className="text-[17px] font-extrabold" style={strong}>{m.title}</div>
                  <div className="mt-0.5 text-[12.5px]" style={muted}>{[dueText(m.due_at), m.team_size ? `Team of ${m.team_size}` : null].filter(Boolean).join(' · ')}</div>
                </div>
                {m.cancelled ? <Pill style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>cancelled</Pill>
                  : past ? <Pill style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>closed</Pill>
                  : <Pill style={pillStyle(m.due_at, now)}>{timeLeft(m.due_at, now)}</Pill>}
              </div>

              {m.details && <p className="mb-0 mt-2.5 whitespace-pre-line text-[13.5px] leading-relaxed" style={strong}>{m.details}</p>}

              {files.length > 0 && (
                <>
                  <div className={`${label} mt-3`} style={muted}>Requirements</div>
                  <div className="overflow-hidden rounded-[13px]" style={{ background: 'var(--sheet-field)' }}>
                    {files.map((f, i) => (
                      <button key={f.id} onClick={() => openFile(f)} className="flex w-full items-center gap-2.5 border-0 bg-transparent px-2.5 py-2 text-left"
                        style={i ? { borderTop: '1px solid var(--line)' } : undefined}>
                        <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg text-[9px] font-bold"
                          style={{ ...mono, background: 'color-mix(in srgb, var(--danger) 15%, transparent)', color: 'var(--danger)' }}>{fileKind(f)}</span>
                        <span className="min-w-0 flex-1 truncate text-[14px] font-bold" style={strong}>{f.name}</span>
                        {opening === f.id ? <Loader2 size={15} className="animate-spin" style={muted} /> : <span className="text-[12px]" style={muted}>{sizeText(f.size)}</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}

              <div className="mt-3 flex items-center justify-between">
                <span className={label.replace('mb-1.5 ', '')} style={muted}>My checklist</span>
                {tasks.length > 0 && <span className="text-[11.5px] font-bold" style={{ ...mono, color: 'var(--accent-text)' }}>{tasksDone(tasks)}</span>}
              </div>
              {tasks.map((t, i) => (
                <div key={i} className="flex min-h-[38px] items-center gap-2.5">
                  <input type="checkbox" checked={t.done} aria-label={t.t}
                    onChange={() => onProgress(m.id, { tasks: tasks.map((x, j) => j === i ? { ...x, done: !x.done } : x) })}
                    style={{ width: 18, height: 18, margin: 0, accentColor: 'var(--accent)' }} />
                  <span className="min-w-0 flex-1 text-[14px]" style={t.done ? { ...muted, textDecoration: 'line-through' } : strong}>{t.t}</span>
                  <button aria-label={`Remove ${t.t}`} onClick={() => onProgress(m.id, { tasks: tasks.filter((_, j) => j !== i) })}
                    className="flex h-8 w-8 items-center justify-center border-0 bg-transparent" style={muted}><X size={14} /></button>
                </div>
              ))}
              <div className="mt-1 flex items-center gap-2 rounded-[12px] px-3" style={field}>
                <Plus size={15} style={muted} />
                <input value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addTask(); }}
                  placeholder="Add a task" maxLength={80} className={`${inputBase} h-10 text-[16px] font-medium`} style={strong} />
                {newTask.trim() && <button onClick={addTask} className="border-0 bg-transparent text-[14px] font-extrabold" style={{ color: 'var(--accent-text)' }}>Add</button>}
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <button onClick={() => onProgress(m.id, { submitted: !prog?.submitted })}
                className="flex h-[46px] flex-1 items-center justify-center gap-1.5 rounded-[15px] text-[14.5px] font-bold"
                style={prog?.submitted ? { background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.35)', color: '#34d399' } : { ...card, boxShadow: 'none', ...strong }}>
                <CheckCircle2 size={17} /> {prog?.submitted ? 'Submitted' : 'Mark done'}
              </button>
              <button onClick={() => m.submit_link ? openLink(m.submit_link) : toast('No submission link yet.')}
                className="flex h-[46px] flex-[1.3] items-center justify-center gap-1.5 rounded-[15px] border-0 text-[14.5px] font-extrabold"
                style={{ background: 'var(--cta-bg)', color: 'var(--cta-ink)', opacity: m.submit_link ? 1 : 0.55 }}>
                Submit <ArrowUpRight size={16} strokeWidth={2.6} />
              </button>
            </div>
            <div className="mt-1.5 text-center text-[11.5px]" style={muted}>{m.submit_link ? 'Submit opens the submission link' : 'The submission link is not posted yet'}</div>

            {isAdmin && (
              <div className="mt-4 rounded-[18px] p-3.5" style={card}>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[['Viewed', stats?.viewed], ['Marked done', stats?.submitted], ['Students', stats?.total]].map(([t, v]) => (
                    <div key={t as string}>
                      <div className="text-[19px] font-bold" style={{ ...mono, ...strong }}>{v ?? '–'}</div>
                      <div className="text-[11.5px]" style={muted}>{t}</div>
                    </div>
                  ))}
                </div>
                <button onClick={() => onEditMilestone(m)} className="mt-3 h-[42px] w-full rounded-[13px] text-[14.5px] font-bold" style={{ ...card, boxShadow: 'none', ...strong }}>Edit milestone</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ───────────────────────── admin sheets ─────────────────────────

const SheetBar: React.FC<{ title: string; onCancel: () => void; onSave: () => void; saving: boolean; canSave: boolean }> = ({ title, onCancel, onSave, saving, canSave }) => (
  <div className="flex shrink-0 items-center justify-between px-4 pb-2.5">
    <button onClick={onCancel} className="min-w-[64px] border-0 bg-transparent p-1 text-left text-[16px] font-semibold" style={muted}>Cancel</button>
    <span className="text-[17px] font-extrabold" style={strong}>{title}</span>
    <button onClick={onSave} disabled={!canSave || saving} className="flex min-w-[64px] justify-end border-0 bg-transparent p-1 text-[16px] font-extrabold disabled:opacity-35" style={{ color: 'var(--hero-progress)' }}>
      {saving ? <Loader2 size={19} className="animate-spin" /> : 'Save'}
    </button>
  </div>
);

const Row: React.FC<{ label: string; first?: boolean; children: React.ReactNode }> = ({ label: l, first, children }) => (
  <div className="flex min-h-[48px] items-center gap-3 px-3.5" style={first ? undefined : { borderTop: '1px solid var(--line)' }}>
    <span className="shrink-0 text-[15px] font-semibold" style={muted}>{l}</span>
    <div className="flex min-w-0 flex-1 justify-end">{children}</div>
  </div>
);

const ProjectSheet: React.FC<{ project: Project | null; onClose: () => void; onSaved: (row: Project | { id: string }, deleted?: boolean) => void }> = ({ project, onClose, onSaved }) => {
  const [f, setF] = useState({ title: project?.title ?? '', course_code: project?.course_code ?? '', course_name: project?.course_name ?? '', note: project?.note ?? '', archived: !!project?.archived });
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const save = async () => {
    setSaving(true);
    try { onSaved(await saveProject({ ...f, id: project?.id })); }
    catch { toast.error('Could not save the project.'); setSaving(false); }
  };
  const del = async () => {
    if (!project) return;
    if (!confirmDel) { setConfirmDel(true); return; }
    setSaving(true);
    try { await deleteProject(project.id); onSaved({ id: project.id }, true); }
    catch { toast.error('Could not delete the project.'); setSaving(false); }
  };
  return (
    <Sheet open onClose={onClose} size="tall">
      <SheetBar title={project ? 'Edit project' : 'New project'} onCancel={onClose} onSave={save} saving={saving} canSave={!!f.title.trim()} />
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-10">
        <div className={`${label} mt-2`} style={muted}>Project</div>
        <div className="overflow-hidden rounded-2xl" style={field}>
          <div className="px-3.5 py-3"><input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="Project name" maxLength={120} className={`${inputBase} text-[18px] font-extrabold`} style={strong} /></div>
          <Row label="Course code"><input value={f.course_code} onChange={e => setF({ ...f, course_code: e.target.value })} placeholder="CSEN704" maxLength={20} className={`${inputBase} text-right`} style={strong} /></Row>
          <Row label="Course"><input value={f.course_name} onChange={e => setF({ ...f, course_name: e.target.value })} placeholder="Software Construction" maxLength={80} className={`${inputBase} text-right`} style={strong} /></Row>
        </div>
        <div className={`${label} mt-4`} style={muted}>Pinned note</div>
        <div className="overflow-hidden rounded-2xl" style={field}>
          <textarea value={f.note} onChange={e => setF({ ...f, note: e.target.value })} placeholder="Shown at the top of the project (changing it alerts everyone)" maxLength={400}
            className={`${inputBase} block min-h-[84px] resize-none px-3.5 py-3 font-medium leading-snug`} style={strong} />
        </div>
        {project && (
          <>
            <div className="mt-4 overflow-hidden rounded-2xl" style={field}>
              <Row label="Archive (hide for students)" first><Toggle on={f.archived} onChange={v => setF({ ...f, archived: v })} label="Archive" /></Row>
            </div>
            <button onClick={del} disabled={saving} className="mt-4 flex h-[48px] w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-extrabold"
              style={{ background: 'color-mix(in srgb, var(--danger) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)', color: 'var(--danger)' }}>
              <Trash2 size={16} /> {confirmDel ? 'Tap again to delete everything' : 'Delete project'}
            </button>
          </>
        )}
      </div>
    </Sheet>
  );
};

const toLocalInput = (iso: string | null) => {
  const d = iso ? new Date(iso) : (() => { const x = new Date(); x.setDate(x.getDate() + 7); x.setHours(23, 59, 0, 0); return x; })();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const MilestoneSheet: React.FC<{
  projectId: string; milestone: Milestone | null; files: ProjectFile[]; allFiles: ProjectFile[];
  onClose: () => void; onSaved: (row: Milestone | { id: string; deleted: true }, uploads?: Promise<boolean>) => void;
}> = ({ projectId, milestone, files, allFiles, onClose, onSaved }) => {
  const [f, setF] = useState({
    title: milestone?.title ?? '', due: toLocalInput(milestone?.due_at ?? null), team_size: milestone?.team_size ? String(milestone.team_size) : '',
    details: milestone?.details ?? '', submit_link: milestone?.submit_link ?? '',
    notify: true, hidden: !!milestone?.hidden, cancelled: !!milestone?.cancelled,
  });
  const [keep, setKeep] = useState<ProjectFile[]>(files);   // files that stay
  const [pending, setPending] = useState<File[]>([]);       // files to upload on Save
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const linkOk = !f.submit_link.trim() || /^https?:\/\/\S+$/i.test(f.submit_link.trim());

  const save = async () => {
    setSaving(true);
    try {
      const row = await saveMilestone({
        id: milestone?.id, project_id: projectId, title: f.title, due_at: new Date(f.due).toISOString(),
        team_size: Number(f.team_size) || null, details: f.details, submit_link: f.submit_link,
        notify: f.notify, hidden: f.hidden, cancelled: f.cancelled,
      });
      const gone = files.filter(x => !keep.some(k => k.id === x.id));
      const work = gone.length || pending.length
        ? (async () => {
            let ok = true;
            for (const g of gone) { try { await removeProjectFile(g); } catch { ok = false; } }
            for (const file of pending) { try { await uploadProjectFile(row.id, file); } catch { ok = false; } }
            return ok;
          })()
        : undefined;
      onSaved(row, work);
    } catch {
      toast.error('Could not save. Check the fields and your connection.');
      setSaving(false);
    }
  };
  const del = async () => {
    if (!milestone) return;
    if (!confirmDel) { setConfirmDel(true); return; }
    setSaving(true);
    try { await deleteMilestone(milestone.id, allFiles); onSaved({ id: milestone.id, deleted: true }); }
    catch { toast.error('Could not delete.'); setSaving(false); }
  };

  return (
    <Sheet open onClose={onClose} size="tall">
      <SheetBar title={milestone ? 'Edit milestone' : 'New milestone'} onCancel={onClose} onSave={save} saving={saving}
        canSave={!!f.title.trim() && !!f.due && linkOk} />
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-10">
        <div className={`${label} mt-2`} style={muted}>Milestone</div>
        <div className="overflow-hidden rounded-2xl" style={field}>
          <div className="px-3.5 py-3"><input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="M2 · Implementation" maxLength={120} className={`${inputBase} text-[18px] font-extrabold`} style={strong} /></div>
          <Row label="Due"><input type="datetime-local" value={f.due} onChange={e => setF({ ...f, due: e.target.value })} className={`${inputBase} text-right`} style={{ ...strong, colorScheme: 'dark light' }} /></Row>
          <Row label="Team size"><input type="number" inputMode="numeric" min={1} max={50} value={f.team_size} onChange={e => setF({ ...f, team_size: e.target.value })} placeholder="—" className={`${inputBase} text-right`} style={strong} /></Row>
        </div>

        <div className={`${label} mt-4`} style={muted}>What to do</div>
        <div className="overflow-hidden rounded-2xl" style={field}>
          <textarea value={f.details} onChange={e => setF({ ...f, details: e.target.value })} placeholder={'Short summary of the requirements\n(optional, the files below have the details)'} maxLength={1000}
            className={`${inputBase} block min-h-[84px] resize-none px-3.5 py-3 font-medium leading-snug`} style={strong} />
        </div>

        <div className={`${label} mt-4`} style={muted}>Requirements files</div>
        <div className="overflow-hidden rounded-2xl" style={field}>
          {keep.map((x, i) => (
            <div key={x.id} className="flex items-center gap-2.5 py-2 pl-3 pr-1.5" style={i ? { borderTop: '1px solid var(--line)' } : undefined}>
              <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg text-[9px] font-bold" style={{ ...mono, background: 'color-mix(in srgb, var(--danger) 15%, transparent)', color: 'var(--danger)' }}>{fileKind(x)}</span>
              <span className="min-w-0 flex-1 truncate text-[14.5px] font-bold" style={strong}>{x.name}</span>
              <span className="text-[12px]" style={muted}>{sizeText(x.size)}</span>
              <button aria-label={`Remove ${x.name}`} onClick={() => setKeep(k => k.filter(y => y.id !== x.id))} className="flex h-9 w-9 items-center justify-center border-0 bg-transparent" style={muted}><X size={15} /></button>
            </div>
          ))}
          {pending.map((x, i) => (
            <div key={`p${i}`} className="flex items-center gap-2.5 py-2 pl-3 pr-1.5" style={keep.length || i ? { borderTop: '1px solid var(--line)' } : undefined}>
              <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg" style={{ background: 'var(--surface-2)', color: 'var(--accent-text)' }}><Upload size={14} /></span>
              <span className="min-w-0 flex-1 truncate text-[14.5px] font-bold" style={strong}>{x.name}</span>
              <span className="text-[12px]" style={muted}>{sizeText(x.size)}</span>
              <button aria-label={`Remove ${x.name}`} onClick={() => setPending(p => p.filter((_, j) => j !== i))} className="flex h-9 w-9 items-center justify-center border-0 bg-transparent" style={muted}><X size={15} /></button>
            </div>
          ))}
          <button onClick={() => picker.current?.click()} className="flex h-[46px] w-full items-center justify-center gap-2 border-0 bg-transparent text-[14.5px] font-extrabold"
            style={{ color: 'var(--accent-text)', borderTop: keep.length || pending.length ? '1px solid var(--line)' : undefined }}>
            <Upload size={16} /> Upload PDF or file
          </button>
          <input ref={picker} type="file" multiple hidden accept=".pdf,.zip,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,image/*"
            onChange={e => {
              const picked = Array.from(e.target.files ?? []);
              const big = picked.filter(x => x.size > 25 * 1024 * 1024);
              if (big.length) toast.error('Files must be under 25 MB.');
              setPending(p => [...p, ...picked.filter(x => x.size <= 25 * 1024 * 1024)]);
              e.target.value = '';
            }} />
        </div>

        <div className={`${label} mt-4`} style={muted}>Submission link</div>
        <div className="flex h-[48px] items-center gap-2.5 rounded-2xl px-3.5" style={{ ...field, borderColor: linkOk ? 'var(--line)' : 'var(--danger)' }}>
          <Link2 size={16} style={{ color: 'var(--accent-text)' }} />
          <input type="url" inputMode="url" value={f.submit_link} onChange={e => setF({ ...f, submit_link: e.target.value })} placeholder="https://… (CMS, Forms, GitHub Classroom)"
            className={`${inputBase} font-medium`} style={strong} />
        </div>

        <div className={`${label} mt-4`} style={muted}>Options</div>
        <div className="overflow-hidden rounded-2xl" style={field}>
          <Row label="Send Bark alert for this save" first><Toggle on={f.notify} onChange={v => setF({ ...f, notify: v })} label="Send alert" /></Row>
          <Row label="Hidden from students"><Toggle on={f.hidden} onChange={v => setF({ ...f, hidden: v })} label="Hidden" /></Row>
          {milestone && <Row label="Cancelled"><Toggle on={f.cancelled} onChange={v => setF({ ...f, cancelled: v })} label="Cancelled" /></Row>}
        </div>

        {milestone && (
          <button onClick={del} disabled={saving} className="mt-4 flex h-[48px] w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-extrabold"
            style={{ background: 'color-mix(in srgb, var(--danger) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)', color: 'var(--danger)' }}>
            <Trash2 size={16} /> {confirmDel ? 'Tap again to delete' : 'Delete milestone'}
          </button>
        )}
      </div>
    </Sheet>
  );
};

export default ProjectsScreen;
