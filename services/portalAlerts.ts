import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { getPortalGrades, getPortalAttendance, getPortalExamSeats } from './portal';

/**
 * Portal alerts: a phone notification when a new grade, attendance entry or
 * exam seat shows up.
 *
 * The app remembers what it last saw (on this phone) and compares it with the
 * portal data saved on the server. Nothing leaves the phone.
 *
 * Limit: iOS pauses a sideloaded app when it is closed, so the check runs when
 * the app is opened or brought back to the front, and every 30 minutes while
 * it stays open.
 */

const SOURCE = 'unimate-portal-alert';
const MAX_SEPARATE = 5;
const MIN_GAP_MS = 60 * 1000;

export interface PortalAlert {
  title: string;
  body: string;
}

type Seen = Record<string, string>;
interface Snapshot {
  grades?: Seen;
  attendance?: Seen;
  seats?: Seen;
}

const storageKey = (userId: string) => `portal_seen_v1_${userId}`;

const readSnapshot = (userId: string): Snapshot => {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(userId)) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeSnapshot = (userId: string, snap: Snapshot) => {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(snap));
  } catch { /* storage full or blocked: alerts just repeat next time */ }
};

const to12h = (time24: string): string => {
  const m = /^(\d{1,2}):(\d{2})/.exec(time24 || '');
  if (!m) return time24 || '';
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h >= 12 ? 'PM' : 'AM'}`;
};

/**
 * Compares one kind of data with what was seen before.
 * - Nothing seen before for this kind: remember it silently (no flood on first run).
 * - Nothing came back now: keep the old memory (an empty answer is usually a failed read).
 */
const diff = <T>(
  rows: T[],
  before: Seen | undefined,
  keyOf: (r: T) => string,
  valueOf: (r: T) => string,
  describe: (r: T, old: string | undefined) => PortalAlert,
): { seen: Seen | undefined; alerts: PortalAlert[] } => {
  if (!rows.length) return { seen: before, alerts: [] };
  const seen: Seen = {};
  const alerts: PortalAlert[] = [];
  for (const r of rows) {
    const key = keyOf(r);
    const value = valueOf(r);
    seen[key] = value;
    if (before && before[key] !== value) alerts.push(describe(r, before[key]));
  }
  return { seen, alerts };
};

/** Pure comparison, exported so it can be tested. */
export const findPortalChanges = (
  snap: Snapshot,
  data: {
    grades: Awaited<ReturnType<typeof getPortalGrades>>;
    attendance: Awaited<ReturnType<typeof getPortalAttendance>>;
    seats: Awaited<ReturnType<typeof getPortalExamSeats>>;
  },
): { next: Snapshot; alerts: PortalAlert[] } => {
  const grades = diff(
    data.grades, snap.grades,
    g => `${g.kind}|${g.course_key}|${g.element}`,
    g => g.grade_text || '',
    (g, old) => ({
      title: old === undefined ? (g.kind === 'midterm' ? 'New midterm grade' : 'New grade') : 'Grade updated',
      body: `${g.course_name}: ${g.element} ${g.grade_text}`.trim(),
    }),
  );
  const attendance = diff(
    data.attendance, snap.attendance,
    a => `${a.course_key}|${a.row_number}`,
    a => a.status || '',
    (a, old) => {
      const when = [a.session_type, a.session_date].filter(Boolean).join(' ');
      return {
        title: old === undefined ? 'Attendance posted' : 'Attendance changed',
        body: `${a.course_name}: ${a.status}${when ? ` (${when})` : ''}`,
      };
    },
  );
  const seats = diff(
    data.seats, snap.seats,
    s => `${s.course_key}|${s.exam_type}|${s.exam_date ?? ''}`,
    s => `${s.start_time}|${s.hall}|${s.seat}`,
    (s, old) => {
      const where = [s.hall ? `Hall ${s.hall}` : '', s.seat ? `Seat ${s.seat}` : ''].filter(Boolean).join(', ');
      const when = [s.exam_date, to12h(s.start_time)].filter(Boolean).join(' ');
      return {
        title: old === undefined ? 'Exam seat posted' : 'Exam seat changed',
        body: [`${s.course_name}${s.exam_type ? ` ${s.exam_type}` : ''}`, where, when].filter(Boolean).join(' · '),
      };
    },
  );
  return {
    next: { grades: grades.seen, attendance: attendance.seen, seats: seats.seen },
    alerts: [...grades.alerts, ...seats.alerts, ...attendance.alerts],
  };
};

/** Many changes at once become one notification, so the phone is not flooded. */
const compact = (alerts: PortalAlert[]): PortalAlert[] =>
  alerts.length <= MAX_SEPARATE
    ? alerts
    : [{
      title: `${alerts.length} portal updates`,
      body: alerts.slice(0, MAX_SEPARATE).map(a => a.body).join('\n') + `\n+${alerts.length - MAX_SEPARATE} more`,
    }];

/** Returns false when the phone would not show them (no permission, unsupported). */
const deliver = async (alerts: PortalAlert[]): Promise<boolean> => {
  try {
    if (Capacitor.isNativePlatform()) {
      let perm = await LocalNotifications.checkPermissions();
      if (perm.display === 'prompt' || perm.display === 'prompt-with-rationale') {
        perm = await LocalNotifications.requestPermissions();
      }
      if (perm.display !== 'granted') return false;
      const base = Math.floor(Date.now() / 1000) % 2_000_000_000;
      await LocalNotifications.schedule({
        notifications: alerts.map((a, i) => ({
          id: base + i,
          title: a.title,
          body: a.body,
          schedule: { at: new Date(Date.now() + 1000 + i * 300) },
          extra: { source: SOURCE },
        })),
      });
      return true;
    }
    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return false;
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    for (const a of alerts) {
      if (reg) await reg.showNotification(a.title, { body: a.body });
      else new Notification(a.title, { body: a.body });
    }
    return true;
  } catch (err) {
    console.warn('Could not show portal alert', err);
    return false;
  }
};

let running = false;
let lastRun = 0;

/**
 * Looks for portal changes since this phone last checked and notifies about them.
 * Safe to call often. Returns the alerts and whether a notification was shown,
 * so the caller can fall back to an in-app message.
 */
export const checkPortalChanges = async (
  userId: string,
  opts: { force?: boolean; silent?: boolean } = {},
): Promise<{ alerts: PortalAlert[]; shown: boolean }> => {
  const none = { alerts: [], shown: false };
  if (!userId || running) return none;
  if (!opts.force && Date.now() - lastRun < MIN_GAP_MS) return none;
  running = true;
  lastRun = Date.now();
  try {
    const [grades, attendance, seats] = await Promise.all([
      getPortalGrades(), getPortalAttendance(), getPortalExamSeats(),
    ]);
    const { next, alerts } = findPortalChanges(readSnapshot(userId), { grades, attendance, seats });
    writeSnapshot(userId, next);
    // silent: the server already pushed these through ntfy, so only remember them
    if (!alerts.length || opts.silent) return none;
    const shown = await deliver(compact(alerts));
    return { alerts, shown };
  } catch (err) {
    console.warn('Portal change check failed', err);
    return none;
  } finally {
    running = false;
  }
};
