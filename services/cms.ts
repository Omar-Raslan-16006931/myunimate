import { supabase } from '../lib/supabase';

// GIU CMS (course files). The server function "portal-sync" signs into the CMS with
// the same login as the portal and fills the cms_* tables; the app only reads them.

export interface CmsCourse {
  course_id: number;
  season_id: number;
  season_title: string;
  is_current: boolean;
  code: string;
  name: string;
}

export interface CmsFile {
  id: number;
  course_id: number;
  content_id: number;
  week_date: string | null;
  week_desc: string;
  position: number;
  title: string;
  file_type: string;
  path: string;
  is_new: boolean;
}

export interface CmsSeason {
  id: number;
  title: string;
  current: boolean;
  courses: CmsCourse[];
  newCount: number;
}

export interface CmsWeek {
  date: string | null;
  description: string;
  files: CmsFile[];
}

export interface CmsResult {
  ok: boolean;
  code?: string;
  message?: string;
  files?: number;
  newFiles?: number;
}

const call = async (body: Record<string, unknown>): Promise<CmsResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('portal-sync', { body });
    if (error) {
      const res = (error as any)?.context;
      if (res && typeof res.json === 'function') {
        try {
          const parsed = await res.json();
          if (parsed && typeof parsed === 'object') return { ok: false, ...parsed };
        } catch { /* not JSON */ }
      }
      return { ok: false, message: 'Could not reach the sync server.' };
    }
    return data as CmsResult;
  } catch {
    return { ok: false, message: 'Could not reach the sync server.' };
  }
};

// one CMS check at a time
let syncInFlight: Promise<CmsResult> | null = null;
export const syncCms = (): Promise<CmsResult> => {
  if (!syncInFlight) syncInFlight = call({ action: 'cms_sync' }).finally(() => { syncInFlight = null; });
  return syncInFlight;
};

/** Phone alerts for new CMS files, separate from the grade alerts. */
export const setCmsAlerts = (enabled: boolean) => call({ action: 'set_cms_notify', enabled });

export const getCmsAlertsOn = async (): Promise<boolean> => {
  const { data, error } = await supabase.from('portal_accounts').select('cms_notify').maybeSingle();
  return !error && !!data && !!(data as { cms_notify: boolean }).cms_notify;
};

export const getCmsCourses = async (strict = false): Promise<CmsCourse[]> => {
  const { data, error } = await supabase
    .from('cms_courses')
    .select('course_id, season_id, season_title, is_current, code, name');
  if (error && strict) throw error;
  return error || !data ? [] : (data as CmsCourse[]);
};

export const getCmsFiles = async (courseId?: number, strict = false): Promise<CmsFile[]> => {
  let q = supabase
    .from('cms_files')
    .select('id, course_id, content_id, week_date, week_desc, position, title, file_type, path, is_new');
  if (courseId !== undefined) q = q.eq('course_id', courseId);
  const { data, error } = await q;
  if (error && strict) throw error;
  return error || !data ? [] : (data as CmsFile[]);
};

export const markCmsFilesSeen = async (ids: number[]): Promise<void> => {
  if (!ids.length) return;
  await supabase.from('cms_files').update({ is_new: false }).in('id', ids);
};

/** Seasons with the highest number first, courses inside each, and how many new files each has. */
export const groupSeasons = (courses: CmsCourse[], files: CmsFile[]): CmsSeason[] => {
  const newByCourse = new Map<number, number>();
  files.forEach(f => { if (f.is_new) newByCourse.set(f.course_id, (newByCourse.get(f.course_id) ?? 0) + 1); });
  const map = new Map<number, CmsSeason>();
  for (const c of courses) {
    let s = map.get(c.season_id);
    if (!s) {
      s = { id: c.season_id, title: c.season_title, current: c.is_current, courses: [], newCount: 0 };
      map.set(c.season_id, s);
    }
    s.courses.push(c);
    s.newCount += newByCourse.get(c.course_id) ?? 0;
  }
  return [...map.values()].sort((a, b) => b.id - a.id);
};

/** Weeks newest first, files in the order the CMS lists them. */
export const groupWeeks = (files: CmsFile[]): CmsWeek[] => {
  const map = new Map<string, CmsWeek>();
  for (const f of files) {
    const key = f.week_date ?? '';
    let w = map.get(key);
    if (!w) { w = { date: f.week_date, description: f.week_desc, files: [] }; map.set(key, w); }
    w.files.push(f);
  }
  const weeks = [...map.values()];
  weeks.forEach(w => w.files.sort((a, b) => a.position - b.position));
  return weeks.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
};

/** Downloads one file through the server (the CMS needs your login). */
export const downloadCmsFile = async (file: Pick<CmsFile, 'content_id' | 'title' | 'path'>): Promise<{ ok: boolean; message?: string }> => {
  try {
    const { data, error } = await supabase.functions.invoke('portal-sync', { body: { action: 'cms_download', contentId: file.content_id } });
    if (error || !(data instanceof Blob)) {
      let message = 'Could not download the file.';
      const res = (error as any)?.context;
      if (res && typeof res.json === 'function') {
        try { const p = await res.json(); if (p?.message) message = p.message; } catch { /* keep default */ }
      }
      return { ok: false, message };
    }
    const ext = file.path.match(/\.[A-Za-z0-9]{1,5}$/)?.[0] ?? '';
    const name = /\.[A-Za-z0-9]{1,5}$/.test(file.title) ? file.title : file.title + ext;
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    return { ok: true };
  } catch {
    return { ok: false, message: 'Could not download the file.' };
  }
};

/** "2026-10-12" → "12 Oct" */
export const shortDate = (iso: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};
