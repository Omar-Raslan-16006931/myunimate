import { ScheduleEvent } from '../types';
import { getPortalAlertTopic } from './portal';
import { buildReminders } from './notifications';

/**
 * Class reminders through ntfy: "Next in 15 min: <class>" on your phone.
 *
 * The app hands each upcoming reminder to ntfy with a delivery time, and ntfy
 * sends it at that moment, even if UniMate is closed. ntfy only accepts
 * delivery times up to 3 days ahead, so the app plans the next ~2.5 days
 * every time it opens (or the schedule changes) and skips what it already sent.
 *
 * Limit: a reminder already handed to ntfy cannot be taken back. If you move
 * or delete a class afterwards, that one old reminder still arrives.
 */

const ENABLED_KEY = 'ntfy_class_reminders';
const SENT_KEY = 'ntfy_class_reminders_sent_v1';
const AHEAD_MS = 2.5 * 24 * 60 * 60 * 1000;
export const NTFY_REMINDERS_EVENT = 'ntfy-reminders-changed';

export const ntfyRemindersEnabled = (): boolean => {
  try { return localStorage.getItem(ENABLED_KEY) === '1'; } catch { return false; }
};

export const setNtfyReminders = (on: boolean) => {
  try { localStorage.setItem(ENABLED_KEY, on ? '1' : '0'); } catch { /* ignore */ }
  window.dispatchEvent(new Event(NTFY_REMINDERS_EVENT));
};

type Sent = Record<string, number>; // reminder key -> when it fires (ms)

const readSent = (): Sent => {
  try {
    const v = JSON.parse(localStorage.getItem(SENT_KEY) || '{}');
    return v && typeof v === 'object' ? v : {};
  } catch { return {}; }
};
const writeSent = (s: Sent) => { try { localStorage.setItem(SENT_KEY, JSON.stringify(s)); } catch { /* ignore */ } };

let running = false;

/** Hands the next reminders to ntfy. Safe to call often. Returns how many were handed over. */
export const syncNtfyReminders = async (events: ScheduleEvent[]): Promise<number> => {
  if (!ntfyRemindersEnabled() || running) return 0;
  running = true;
  try {
    const topic = await getPortalAlertTopic();
    if (!topic) return 0;

    const now = Date.now();
    const sent = readSent();
    for (const k of Object.keys(sent)) if (sent[k] < now - 60 * 60 * 1000) delete sent[k];

    let count = 0;
    for (const r of buildReminders(events)) {
      const at = r.at.getTime();
      if (at > now + AHEAD_MS) break; // list is sorted by time
      const key = `${r.id}|${at}|${r.title}|${r.body}`;
      if (sent[key]) continue;
      try {
        const res = await fetch('https://ntfy.sh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic,
            title: r.title,
            message: r.body || 'Starting soon',
            tags: ['alarm_clock'],
            delay: String(Math.floor(at / 1000)),
          }),
        });
        if (!res.ok) break;
        sent[key] = at;
        count++;
      } catch { break; } // offline: try again next time
    }
    writeSent(sent);
    return count;
  } finally {
    running = false;
  }
};
