import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import type { ScheduleEvent } from '../types';
import { lastOkSync } from '../lib/network';

// The iPhone app opens public/offline.html when it starts with no internet. That page lives in the app itself, so it
// cannot see this website's saved data. Instead we keep a small copy of the schedule in the phone's own storage
// (Capacitor Preferences), which both sides can read. Does nothing on the web or in an older app build.

export const SNAPSHOT_KEY = 'unimate_offline_snapshot_v1'; // public/offline.html reads this same key

const usable = (): boolean => {
  try { return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Preferences'); } catch { return false; }
};

let timer: number | undefined;
let lastJson = '';

export const saveOfflineSnapshot = (events: ScheduleEvent[], active: { scheduleId: string; scheduleName: string }): void => {
  if (!usable() || events.length === 0) return;
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    // this schedule's classes, plus every exam (exams can belong to another schedule)
    const mine = events.filter(e => e.scheduleId === active.scheduleId || e.type === 'exam');
    const body = {
      v: 1,
      schedule: active.scheduleName,
      events: mine.map(e => ({
        title: e.title,
        code: e.code || '',
        type: e.type,
        recurring: !!e.isRecurring,
        day: e.dayOfWeek || '',
        date: e.date || '',
        time: e.startTime,
        mins: e.durationMinutes,
        where: e.location || '',
      })),
    };
    const json = JSON.stringify(body);
    if (json === lastJson) return;
    lastJson = json;
    Preferences.set({ key: SNAPSHOT_KEY, value: JSON.stringify({ ...body, savedAt: lastOkSync() || Date.now() }) }).catch(() => { /* storage refused: skip */ });
  }, 1500);
};
