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

export interface PortalExamSeat {
  id?: number;
  course_key: string;
  course_name: string;
  exam_day: string;
  exam_date: string | null;  // YYYY-MM-DD
  start_time: string;        // HH:MM 24h
  end_time: string;          // HH:MM 24h
  duration_minutes: number;
  hall: string;
  seat: string;
  exam_type: string;
}

export interface PortalClass {
  day: string;
  period_number: number;
  time_start: string;
  time_end: string;
  course_name: string;
  room: string;
  group: string;
  type: 'lecture' | 'lab' | 'tutorial' | 'other';
}

/** Pulls a course code like "CSEN 301" out of a portal course name. Empty when there is none. */
export const courseCodeOf = (name: string): string => {
  const m = (name || '').match(/\b([A-Za-z]{2,6})[\s-]?(\d{3,4}[A-Za-z]?)\b/);
  return m ? `${m[1].toUpperCase()} ${m[2].toUpperCase()}` : '';
};

export interface PortalSyncResult {
  ok: boolean;
  code?: string;
  message?: string;
  newGrades?: number;
  grades?: number;
  attendance?: number;
  examSeatsCount?: number;
  examSeats?: any[];
  topic?: string | null;
  classes?: PortalClass[];
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

// One portal check at a time: if one is already running (from Home, a portal screen
// or the timer), everyone waits for that same result instead of starting another.
let syncInFlight: Promise<PortalSyncResult> | null = null;
export const syncPortal = (): Promise<PortalSyncResult> => {
  if (!syncInFlight) syncInFlight = call({ action: 'sync' }).finally(() => { syncInFlight = null; });
  return syncInFlight;
};

/** Turns phone alerts on or off. Alerts reach the phone once a Bark key is saved (setBarkKey). */
export const setPortalAlerts = (enabled: boolean) => call({ action: 'set_notify', enabled });

/** iPhone alerts through the Bark app: sends the key (or the link Bark shows). */
export const setBarkKey = (key: string) => call({ action: 'set_bark', key });
export const isBarkTopic = (t: string | null | undefined) => !!t && t.startsWith('bark:');
export const testPortalAlert = () => call({ action: 'test_notify' });

/** Your weekly classes from the portal's schedule page (all seven periods). */
export const getPortalSchedule = () => call({ action: 'get_schedule' });

/** Alerts for new grades, absences and exam seats (one of the three alert choices). */
export const setPortalNotify = (enabled: boolean) => call({ action: 'set_portal_notify', enabled });
export const getPortalNotifyOn = async (): Promise<boolean> => {
  const { data, error } = await supabase.from('portal_accounts').select('portal_notify').maybeSingle();
  // not set up yet (or no row): behave as before, grade alerts on
  return error || !data ? true : (data as { portal_notify: boolean | null }).portal_notify !== false;
};

/** The saved alert target ("bark:<key>"), or null when phone alerts are off (or not set up on the server yet). */
export const getPortalAlertTopic = async (): Promise<string | null> => {
  const { data, error } = await supabase.from('portal_accounts').select('notify_topic').maybeSingle();
  const t = error || !data ? null : ((data as { notify_topic: string | null }).notify_topic ?? null);
  // "off:<topic>" means alerts are paused (the topic is kept for when they are turned back on)
  return t && !t.startsWith('off:') ? t : null;
};

export const removePortalLogin = async () => {
  const res = await call({ action: 'remove' });
  if (res.ok) clearPortalCache();
  return res;
};

// ── Saved copy on the phone, so portal screens open instantly ──
const CACHE_PREFIX = 'portal_cache_v1_';

export const readPortalCache = <T,>(name: string): T | null => {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + name);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

export const writePortalCache = (name: string, value: unknown) => {
  try { localStorage.setItem(CACHE_PREFIX + name, JSON.stringify(value)); } catch { /* storage full: just no cache */ }
};

const USER_KEY = 'portal_user_v1';

/**
 * Portal data saved on this phone (login name, setup progress, reminder choice) belongs to one account.
 * When a different account signs in on the same phone, start clean so nothing of the last person shows up.
 */
export const bindPortalUser = (uid: string | undefined | null) => {
  if (!uid) return;
  try {
    const prev = localStorage.getItem(USER_KEY);
    if (prev && prev !== uid) {
      clearPortalCache();
      ['class_reminders_enabled'].forEach(k => localStorage.removeItem(k));
    }
    if (prev !== uid) localStorage.setItem(USER_KEY, uid);
  } catch { /* ignore */ }
};

export const clearPortalCache = () => {
  try {
    Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX)).forEach(k => localStorage.removeItem(k));
    localStorage.removeItem('portal_setup_v1'); // setup-guide ticks belong to the signed-in user
  } catch { /* ignore */ }
};

export const getPortalAccount = async (strict = false): Promise<PortalAccount | null> => {
  const { data, error } = await supabase
    .from('portal_accounts')
    .select('username, last_sync_at, last_ok_at, last_status, last_error')
    .maybeSingle();
  if (error) { if (strict) throw error; return null; }
  return data as PortalAccount | null;
};

export const getPortalGrades = async (strict = false): Promise<PortalGrade[]> => {
  const { data, error } = await supabase
    .from('portal_grades')
    .select('id, kind, course_key, course_name, category, element, grade_text, score, total, lecturer, is_new, first_seen_at')
    .order('course_key')
    .order('first_seen_at');
  if (error && strict) throw error;
  return error || !data ? [] : (data as PortalGrade[]);
};

export const markPortalGradesSeen = async (ids: number[]): Promise<void> => {
  if (!ids.length) return;
  await supabase.from('portal_grades').update({ is_new: false }).in('id', ids);
};

export const getPortalAttendance = async (strict = false): Promise<PortalAttendanceRow[]> => {
  const { data, error } = await supabase
    .from('portal_attendance')
    .select('id, course_key, course_name, row_number, status, session_desc, session_date, session_type')
    .order('course_key')
    .order('row_number');
  if (error && strict) throw error;
  return error || !data ? [] : (data as PortalAttendanceRow[]);
};

export const getPortalAbsenceLevels = async (strict = false): Promise<PortalAbsenceLevel[]> => {
  const { data, error } = await supabase.from('portal_absence_levels').select('code, name, level, title');
  if (error && strict) throw error;
  return error || !data ? [] : (data as PortalAbsenceLevel[]);
};

export const getPortalExamSeats = async (strict = false): Promise<PortalExamSeat[]> => {
  const { data, error } = await supabase
    .from('portal_exam_seats')
    .select('id, course_key, course_name, exam_day, exam_date, start_time, end_time, duration_minutes, hall, seat, exam_type')
    .order('exam_date', { ascending: true })
    .order('start_time', { ascending: true });
  if (error && strict) throw error;
  return error || !data ? [] : (data as PortalExamSeat[]);
};

export interface PortalSummary {
  connected: boolean;
  newGrades: number;
  absences: number;
  examSeats: number;
  lastSyncAt: string | null;
  lastStatus: PortalAccount['last_status'];
}

export const isAbsent = (status: string) => /absent/i.test(status);

export const getPortalSummary = async (): Promise<PortalSummary> => {
  const account = await getPortalAccount();
  if (!account) return { connected: false, newGrades: 0, absences: 0, examSeats: 0, lastSyncAt: null, lastStatus: null };
  const [grades, attendance, examSeats] = await Promise.all([
    supabase.from('portal_grades').select('id', { count: 'exact', head: true }).eq('is_new', true),
    supabase.from('portal_attendance').select('id', { count: 'exact', head: true }).ilike('status', '%absent%'),
    supabase.from('portal_exam_seats').select('id', { count: 'exact', head: true }),
  ]);
  return {
    connected: true,
    newGrades: grades.count ?? 0,
    absences: attendance.count ?? 0,
    examSeats: examSeats.count ?? 0,
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
