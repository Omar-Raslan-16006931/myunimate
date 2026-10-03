import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { ScheduleEvent } from '../types';

/**
 * Class reminders: "Next in 15 min: <title>" with the time and room.
 *
 * Two delivery paths:
 *  - Native (the iOS app built by the GitHub workflow, via Capacitor):
 *    reminders are scheduled with iOS itself, so they fire even when the
 *    app is closed.
 *  - Web / installed PWA: iOS cannot schedule a web notification for later,
 *    so reminders only fire while the app is open or still in memory.
 */

const ENABLED_KEY = 'class_reminders_enabled';
const LEAD_MINUTES = 15;
const DAYS_AHEAD = 7;
const MAX_PENDING = 60; // iOS keeps at most 64 pending local notifications
const SOURCE = 'unimate-class-reminder';

interface Reminder {
  id: number;
  at: Date;
  title: string;
  body: string;
}

let webTimers: number[] = [];

const nativePlugin = (): typeof LocalNotifications | null =>
  Capacitor.isNativePlatform() ? LocalNotifications : null;

export type ReminderSupport = 'native' | 'web' | 'none';

export const reminderSupport = (): ReminderSupport => {
  if (nativePlugin()) return 'native';
  if (typeof window !== 'undefined' && 'Notification' in window) return 'web';
  return 'none';
};

export const remindersEnabled = (): boolean => {
  try {
    return localStorage.getItem(ENABLED_KEY) === '1';
  } catch {
    return false;
  }
};

const to12h = (time24: string): string => {
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${period}`;
};

const localISO = (d: Date): string => {
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().split('T')[0];
};

/** Stable positive 31-bit id for one event on one date. */
const reminderId = (eventId: string, dateISO: string): number => {
  const key = `${eventId}|${dateISO}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return Math.abs(hash) || 1;
};

/** Every class start in the next week, turned into a reminder 15 minutes before. */
export const buildReminders = (events: ScheduleEvent[], now: Date = new Date()): Reminder[] => {
  const reminders: Reminder[] = [];
  for (let offset = 0; offset < DAYS_AHEAD; offset++) {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() + offset);
    const dayName = day.toLocaleDateString('en-US', { weekday: 'long' });
    const dayISO = localISO(day);

    for (const e of events) {
      if (!e.startTime || !/^\d{1,2}:\d{2}$/.test(e.startTime)) continue;
      const happensToday = e.isRecurring ? e.dayOfWeek === dayName : e.date === dayISO;
      if (!happensToday) continue;

      const [h, m] = e.startTime.split(':').map(Number);
      const start = new Date(day);
      start.setHours(h, m, 0, 0);
      const at = new Date(start.getTime() - LEAD_MINUTES * 60000);
      if (at.getTime() <= now.getTime()) continue;

      const details = [to12h(e.startTime), e.location, e.code].filter(Boolean).join(' · ');
      reminders.push({
        id: reminderId(e.id, dayISO),
        at,
        title: `Next in ${LEAD_MINUTES} min: ${e.title}`,
        body: details,
      });
    }
  }
  return reminders.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, MAX_PENDING);
};

const showWebNotification = async (r: Reminder) => {
  try {
    if (Notification.permission !== 'granted') return;
    const options: NotificationOptions = { body: r.body, tag: `${SOURCE}-${r.id}` };
    // iOS home-screen web apps only allow notifications through the service worker.
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (reg) await reg.showNotification(r.title, options);
    else new Notification(r.title, options);
  } catch (err) {
    console.warn('Could not show class reminder', err);
  }
};

const clearWebTimers = () => {
  webTimers.forEach(id => window.clearTimeout(id));
  webTimers = [];
};

const clearNative = async (plugin: typeof LocalNotifications) => {
  const pending = await plugin.getPending();
  const ours = (pending?.notifications || []).filter((n: any) => n.extra?.source === SOURCE);
  if (ours.length) await plugin.cancel({ notifications: ours.map((n: any) => ({ id: n.id })) });
};

/** Re-plan all reminders for the given events. Safe to call often. */
export const syncReminders = async (events: ScheduleEvent[]): Promise<void> => {
  const plugin = nativePlugin();
  try {
    if (!remindersEnabled()) {
      clearWebTimers();
      if (plugin) await clearNative(plugin);
      return;
    }
    const reminders = buildReminders(events);

    if (plugin) {
      await clearNative(plugin);
      if (reminders.length) {
        await plugin.schedule({
          notifications: reminders.map(r => ({
            id: r.id,
            title: r.title,
            body: r.body,
            schedule: { at: r.at },
            extra: { source: SOURCE },
          })),
        });
      }
      return;
    }

    // Web fallback: timers only live as long as the app stays in memory.
    clearWebTimers();
    const dayMs = 24 * 60 * 60 * 1000;
    for (const r of reminders) {
      const delay = r.at.getTime() - Date.now();
      if (delay > 0 && delay < dayMs) {
        webTimers.push(window.setTimeout(() => showWebNotification(r), delay));
      }
    }
  } catch (err) {
    console.warn('Could not schedule class reminders', err);
  }
};

/** Must be called from a tap (iOS only shows the permission prompt on a user gesture). */
export const enableReminders = async (): Promise<'granted' | 'denied' | 'unsupported'> => {
  const plugin = nativePlugin();
  try {
    if (plugin) {
      const res = await plugin.requestPermissions();
      if (res?.display !== 'granted') return 'denied';
    } else if ('Notification' in window) {
      const res = await Notification.requestPermission();
      if (res !== 'granted') return 'denied';
    } else {
      return 'unsupported';
    }
    localStorage.setItem(ENABLED_KEY, '1');
    return 'granted';
  } catch (err) {
    console.warn('Notification permission failed', err);
    return 'unsupported';
  }
};

export const disableReminders = async (): Promise<void> => {
  try {
    localStorage.setItem(ENABLED_KEY, '0');
  } catch { /* ignore */ }
  await syncReminders([]);
};
