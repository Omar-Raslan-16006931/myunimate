import { useEffect, useState } from 'react';

// Is the server reachable? navigator.onLine only says whether Wi-Fi or mobile data is switched on, so a failed
// request (reported by the Supabase client in lib/supabase.ts) also counts as "offline". While offline we test the
// connection every few seconds so the app notices as soon as it is back.

const url = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const key = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

let reachable = true;
let probeTimer: number | undefined;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

const browserOnline = () => typeof navigator === 'undefined' || navigator.onLine !== false;

export const isOffline = (): boolean => !browserOnline() || !reachable;

const probe = async () => {
  if (!url) return;
  const ctrl = new AbortController();
  const stop = window.setTimeout(() => ctrl.abort(), 6000);
  try {
    await fetch(`${url}/auth/v1/health`, { headers: { apikey: key }, cache: 'no-store', signal: ctrl.signal });
    markReachable(true); // any answer at all means the server can be reached
  } catch {
    markReachable(false);
  } finally {
    window.clearTimeout(stop);
  }
};

export const markReachable = (ok: boolean) => {
  if (ok) {
    if (probeTimer !== undefined) { window.clearInterval(probeTimer); probeTimer = undefined; }
    if (!reachable) { reachable = true; emit(); }
    return;
  }
  if (reachable) { reachable = false; emit(); }
  if (probeTimer === undefined && typeof window !== 'undefined') probeTimer = window.setInterval(probe, 12000);
};

/** Called when a change (add / edit / delete) was refused because the app is offline. */
export const notifyBlockedWrite = () => {
  try { window.dispatchEvent(new Event('unimate-offline-write')); } catch { /* ignore */ }
};

/** True while the phone has no connection to the server. */
export const useOffline = (): boolean => {
  const [off, setOff] = useState<boolean>(() => isOffline());
  useEffect(() => {
    const update = () => setOff(isOffline());
    const onBackOnline = () => { probe(); update(); };
    listeners.add(update);
    window.addEventListener('online', onBackOnline);
    window.addEventListener('offline', update);
    update();
    return () => {
      listeners.delete(update);
      window.removeEventListener('online', onBackOnline);
      window.removeEventListener('offline', update);
    };
  }, []);
  return off;
};

export const LAST_OK_KEY = 'unimate_last_ok_sync';

/** When the schedule was last refreshed from the server (ms), or 0. */
export const lastOkSync = (): number => {
  try { return Number(localStorage.getItem(LAST_OK_KEY)) || 0; } catch { return 0; }
};
export const markSynced = () => { try { localStorage.setItem(LAST_OK_KEY, String(Date.now())); } catch { /* ignore */ } };
