import { supabase } from '../lib/supabase';

// Uni portal data (grades + attendance). The server function "portal-sync"
// signs into the portal and fills these tables; the app only reads them.

export interface PortalAccount {
  username: string;
  last_sync_at: string | null;
  last_ok_at: string | null;
  last_status: 'ok' | 'error' | null;
  last_error: string | null;
}

export interface PortalGrade {
  id: number;
  kind: 'item' | 'midterm';
  course_key: string;
  course_name: string;
  category: string;
  element: string;
  grade_text: string;
  score: number | null;
  total: number | null;
  lecturer: string;
  is_new: boolean;
  first_seen_at: string;
}

export interface PortalAttendanceRow {
  id: number;
  course_key: string;
  course_name: string;
  row_number: number;
  status: string;
  session_desc: string;
  session_date: string | null;
  session_type: string;
}

export interface PortalAbsenceLevel {
  code: string;
  name: string;
  level: string;
  title: string;
}

export interface PortalSyncResult {
  ok: boolean;
  code?: string;
  message?: string;
  newGrades?: number;
  grades?: number;
  attendance?: number;
}

const call = async (body: Record<string, unknown>): Promise<PortalSyncResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('portal-sync', { body });
    if (error) {
      // the function answers errors with a JSON body that carries the reason
      const res = (error as any)?.context;
      if (res && typeof res.json === 'function') {
        try {
          const parsed = await res.json();
          if (parsed && typeof parsed === 'object') return { ok: false, ...parsed };
        } catch { /* not JSON */ }
      }
      return { ok: false, message: 'Could not reach the sync server.' };
    }
    return data as PortalSyncResult;
  } catch {
    return { ok: false, message: 'Could not reach the sync server.' };
  }
};

export const savePortalLogin = (username: string, password: string) =>
  call({ action: 'save_credentials', username, password });

export const syncPortal = () => call({ action: 'sync' });

export const removePortalLogin = () => call({ action: 'remove' });

export const getPortalAccount = async (): Promise<PortalAccount | null> => {
  const { data, error } = await supabase
    .from('portal_accounts')
    .select('username, last_sync_at, last_ok_at, last_status, last_error')
    .maybeSingle();
  if (error) return null;
  return data as PortalAccount | null;
};

export const getPortalGrades = async (): Promise<PortalGrade[]> => {
  const { data, error } = await supabase
    .from('portal_grades')
    .select('id, kind, course_key, course_name, category, element, grade_text, score, total, lecturer, is_new, first_seen_at')
    .order('course_key')
    .order('first_seen_at');
  return error || !data ? [] : (data as PortalGrade[]);
};

export const markPortalGradesSeen = async (ids: number[]): Promise<void> => {
  if (!ids.length) return;
  await supabase.from('portal_grades').update({ is_new: false }).in('id', ids);
};

export const getPortalAttendance = async (): Promise<PortalAttendanceRow[]> => {
  const { data, error } = await supabase
    .from('portal_attendance')
    .select('id, course_key, course_name, row_number, status, session_desc, session_date, session_type')
    .order('course_key')
    .order('row_number');
  return error || !data ? [] : (data as PortalAttendanceRow[]);
};

export const getPortalAbsenceLevels = async (): Promise<PortalAbsenceLevel[]> => {
  const { data, error } = await supabase.from('portal_absence_levels').select('code, name, level, title');
  return error || !data ? [] : (data as PortalAbsenceLevel[]);
};

export interface PortalSummary {
  connected: boolean;
  newGrades: number;
  absences: number;
  lastSyncAt: string | null;
  lastStatus: PortalAccount['last_status'];
}

export const isAbsent = (status: string) => /absent/i.test(status);

export const getPortalSummary = async (): Promise<PortalSummary> => {
  const account = await getPortalAccount();
  if (!account) return { connected: false, newGrades: 0, absences: 0, lastSyncAt: null, lastStatus: null };
  const [grades, attendance] = await Promise.all([
    supabase.from('portal_grades').select('id', { count: 'exact', head: true }).eq('is_new', true),
    supabase.from('portal_attendance').select('id', { count: 'exact', head: true }).ilike('status', '%absent%'),
  ]);
  return {
    connected: true,
    newGrades: grades.count ?? 0,
    absences: attendance.count ?? 0,
    lastSyncAt: account.last_sync_at,
    lastStatus: account.last_status,
  };
};

export const timeAgo = (iso: string | null): string => {
  if (!iso) return 'never';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
};
