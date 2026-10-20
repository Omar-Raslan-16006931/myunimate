import { Capacitor, registerPlugin } from '@capacitor/core';
import type { ScheduleEvent } from '../types';
import { loadProjects, readProjectsCache } from './projects';
import { pickLive } from './liveActivityPick';
import type { LivePayload } from './liveActivityPick';

// Dynamic Island + lock screen countdown (iPhone app only). The native part lives in native/unimate-live.
// On the web, or in an older app build without it, every call here quietly does nothing.

interface UnimateLivePlugin {
  sync(options: LivePayload & { lastKey: string }): Promise<{ ok: boolean; action?: string; reason?: string }>;
  end(): Promise<void>;
}

const Live = registerPlugin<UnimateLivePlugin>('UnimateLive');
const LAST_KEY = 'live_last_key_v1';

let busy = false;
let lastSig = '';
let projectsAt = 0;

const supported = (): boolean => {
  try { return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('UnimateLive'); } catch { return false; }
};

const readLastKey = (): string => { try { return localStorage.getItem(LAST_KEY) || ''; } catch { return ''; } };
const writeLastKey = (k: string) => { try { if (k) localStorage.setItem(LAST_KEY, k); else localStorage.removeItem(LAST_KEY); } catch { /* ignore */ } };

// deadlines come from the saved Projects data; refresh it quietly now and then
const refreshProjects = () => {
  if (Date.now() - projectsAt < 10 * 60_000) return;
  projectsAt = Date.now();
  loadProjects().catch(() => { /* offline or signed out: the saved copy is used */ });
};

/** Shows, updates or removes the countdown. Safe to call as often as you like. */
export const syncLiveActivity = async (events: ScheduleEvent[]): Promise<void> => {
  if (busy || !supported()) return;
  busy = true;
  try {
    refreshProjects();
    const pick = pickLive(events, readProjectsCache(), new Date());
    const lastKey = readLastKey();
    if (!pick) {
      if (lastKey) { await Live.end(); writeLastKey(''); lastSig = ''; }
      return;
    }
    const sig = JSON.stringify(pick);
    if (sig === lastSig) return;
    const res = await Live.sync({ ...pick, lastKey });
    if (res?.ok) { lastSig = sig; writeLastKey(pick.key); }
  } catch {
    // no plugin in this build, or iOS refused: nothing to do
  } finally {
    busy = false;
  }
};

export const endLiveActivity = async (): Promise<void> => {
  if (!supported()) return;
  try { await Live.end(); } catch { /* ignore */ }
  writeLastKey('');
  lastSig = '';
};
