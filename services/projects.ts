import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { supabase } from '../lib/supabase';

// Projects from college: an admin posts the project, its milestones (deadlines), requirement files and
// the submission link. Everyone sees them; each student keeps their own checklist and "submitted" tick.
// Bark alerts (new project, new milestone, delayed deadline, reminders) are sent by the database itself.

export interface Project {
  id: string;
  title: string;
  course_code: string | null;
  course_name: string | null;
  note: string | null;
  archived: boolean;
  created_at: string;
}

export interface Milestone {
  id: string;
  project_id: string;
  title: string;
  due_at: string;
  team_size: number | null;
  submit_link: string | null;
  details: string | null;
  hidden: boolean;
  cancelled: boolean;
  notify: boolean;
  position: number;
}

export interface ProjectFile {
  id: string;
  milestone_id: string;
  name: string;
  path: string;
  size: number | null;
  mime: string | null;
}

export interface Task { t: string; done: boolean }

export interface Progress {
  milestone_id: string;
  submitted: boolean;
  tasks: Task[];
  viewed_at: string | null;
}

export interface ProjectsData {
  projects: Project[];
  milestones: Milestone[];
  files: ProjectFile[];
  progress: Record<string, Progress>;
}

const CACHE_KEY = 'projects_cache_v1';

export const readProjectsCache = (): ProjectsData | null => {
  try { const raw = localStorage.getItem(CACHE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
};

export const loadProjects = async (): Promise<ProjectsData> => {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  const [p, m, f, g] = await Promise.all([
    supabase.from('projects').select('id, title, course_code, course_name, note, archived, created_at').order('created_at', { ascending: false }),
    supabase.from('project_milestones').select('id, project_id, title, due_at, team_size, submit_link, details, hidden, cancelled, notify, position').order('due_at'),
    supabase.from('project_files').select('id, milestone_id, name, path, size, mime').order('created_at'),
    uid ? supabase.from('project_progress').select('milestone_id, submitted, tasks, viewed_at').eq('user_id', uid) : Promise.resolve({ data: [], error: null }),
  ]);
  const err = p.error || m.error || f.error || g.error;
  if (err) throw err;
  const progress: Record<string, Progress> = {};
  ((g.data ?? []) as Progress[]).forEach(r => { progress[r.milestone_id] = { ...r, tasks: Array.isArray(r.tasks) ? r.tasks : [] }; });
  const data: ProjectsData = {
    projects: (p.data ?? []) as Project[],
    milestones: (m.data ?? []) as Milestone[],
    files: (f.data ?? []) as ProjectFile[],
    progress,
  };
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch { /* full: no cache */ }
  return data;
};

export const clearProjectsCache = () => { try { localStorage.removeItem(CACHE_KEY); } catch { /* ignore */ } };

// ── student side ──
export const saveProgress = async (milestoneId: string, patch: Partial<Omit<Progress, 'milestone_id'>>) => {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return false;
  const { error } = await supabase.from('project_progress')
    .upsert({ user_id: auth.user.id, milestone_id: milestoneId, ...patch }, { onConflict: 'user_id,milestone_id' });
  return !error;
};

export const setProjectAlerts = async (enabled: boolean) => {
  const { error } = await supabase.rpc('set_project_notify', { p_enabled: enabled });
  return !error;
};

export const getProjectAlertsOn = async (): Promise<boolean> => {
  const { data, error } = await supabase.from('portal_accounts').select('project_notify').maybeSingle();
  return error || !data ? true : (data as { project_notify: boolean | null }).project_notify !== false;
};

/** Opens a link in the phone's in-app browser (a new tab on the web). */
export const openLink = async (url: string) => {
  const native = (() => { try { return Capacitor.isNativePlatform(); } catch { return false; } })();
  if (native) await Browser.open({ url, presentationStyle: 'fullscreen' });
  else if (!window.open(url, '_blank')) window.location.href = url;
};

export const fileUrl = async (f: ProjectFile): Promise<string | null> => {
  const { data } = await supabase.storage.from('project-files').createSignedUrl(f.path, 60 * 60);
  return data?.signedUrl ?? null;
};

// ── admin side (the database refuses these for everyone else) ──
export const saveProject = async (p: Partial<Project> & { title: string }) => {
  const row = { title: p.title.trim(), course_code: p.course_code?.trim() || null, course_name: p.course_name?.trim() || null, note: p.note?.trim() || null, archived: !!p.archived };
  const res = p.id
    ? await supabase.from('projects').update(row).eq('id', p.id).select('id').single()
    : await supabase.from('projects').insert(row).select('id').single();
  if (res.error) throw res.error;
  return (res.data as { id: string }).id;
};

export const deleteProject = async (id: string) => {
  const { data: files } = await supabase.from('project_files')
    .select('path, project_milestones!inner(project_id)').eq('project_milestones.project_id', id);
  const paths = ((files ?? []) as { path: string }[]).map(f => f.path);
  if (paths.length) await supabase.storage.from('project-files').remove(paths);
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
};

export const saveMilestone = async (m: Partial<Milestone> & { project_id: string; title: string; due_at: string }) => {
  const row = {
    project_id: m.project_id,
    title: m.title.trim(),
    due_at: m.due_at,
    team_size: m.team_size || null,
    submit_link: m.submit_link?.trim() || null,
    details: m.details?.trim() || null,
    hidden: !!m.hidden,
    cancelled: !!m.cancelled,
    notify: m.notify !== false,
    position: m.position ?? 0,
  };
  const res = m.id
    ? await supabase.from('project_milestones').update(row).eq('id', m.id).select('id').single()
    : await supabase.from('project_milestones').insert(row).select('id').single();
  if (res.error) throw res.error;
  return (res.data as { id: string }).id;
};

export const deleteMilestone = async (id: string, files: ProjectFile[]) => {
  const paths = files.filter(f => f.milestone_id === id).map(f => f.path);
  if (paths.length) await supabase.storage.from('project-files').remove(paths);
  const { error } = await supabase.from('project_milestones').delete().eq('id', id);
  if (error) throw error;
};

export const uploadProjectFile = async (milestoneId: string, file: File) => {
  const safe = file.name.replace(/[^A-Za-z0-9._-]+/g, '_').slice(-80) || 'file';
  const path = `${milestoneId}/${Date.now()}-${safe}`;
  const up = await supabase.storage.from('project-files').upload(path, file, { contentType: file.type || undefined });
  if (up.error) throw up.error;
  const { error } = await supabase.from('project_files').insert({
    milestone_id: milestoneId, name: file.name.replace(/\.[A-Za-z0-9]{1,5}$/, '') || file.name, path, size: file.size, mime: file.type || null,
  });
  if (error) { await supabase.storage.from('project-files').remove([path]); throw error; }
};

export const removeProjectFile = async (f: ProjectFile) => {
  await supabase.storage.from('project-files').remove([f.path]);
  const { error } = await supabase.from('project_files').delete().eq('id', f.id);
  if (error) throw error;
};

export const getMilestoneStats = async (milestoneId: string) => {
  const { data, error } = await supabase.rpc('project_stats', { p_milestone: milestoneId });
  if (error || !data) return null;
  const r = (Array.isArray(data) ? data[0] : data) as { viewed: number; submitted: number; total: number };
  return r ?? null;
};

// ── formatting ──
export const timeLeft = (iso: string, now = Date.now()): string => {
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return 'past';
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return `${Math.max(1, Math.floor(ms / 60_000))}m`;
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return d < 3 ? `${d}d ${String(h % 24).padStart(2, '0')}h` : `${d}d`;
};

/** red under a day, amber under 4 days, plain after that */
export const urgency = (iso: string, now = Date.now()): 'red' | 'amber' | 'plain' => {
  const h = (new Date(iso).getTime() - now) / 3_600_000;
  return h < 24 ? 'red' : h < 96 ? 'amber' : 'plain';
};

export const dueText = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });

export const sizeText = (n: number | null) =>
  !n ? '' : n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;

export const fileKind = (f: Pick<ProjectFile, 'path' | 'mime'>) => {
  const ext = (f.path.match(/\.([A-Za-z0-9]{1,5})$/)?.[1] ?? '').toUpperCase();
  return ext || (f.mime?.split('/')[1] ?? 'FILE').toUpperCase().slice(0, 4);
};
