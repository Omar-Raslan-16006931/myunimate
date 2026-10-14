import { startAuthentication, startRegistration, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { supabase } from '../lib/supabase';

// Passkeys: sign in with Face ID, Touch ID or a security key.
// The "passkey" Edge Function checks everything; the app only shows the prompts.

export interface Passkey { id: string; device_name: string; created_at: string; last_used_at: string | null }
export type PasskeyResult = { ok: true } | { ok: false; message: string; cancelled?: boolean };

/** Inside the iPhone app (sideloaded): iOS blocks passkeys there, so we use an in-app Safari sheet instead. */
export const inNativeApp = (): boolean => {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
};

/** The Safari sheet needs a plugin that older installs of the app do not have. */
const sheetAvailable = (): boolean => {
  try { return inNativeApp() && Capacitor.isPluginAvailable('Browser'); } catch { return false; }
};

export const passkeysSupported = (): boolean => {
  if (inNativeApp()) return sheetAvailable();
  try { return typeof window !== 'undefined' && browserSupportsWebAuthn(); } catch { return false; }
};

/** Why passkeys are missing, in one sentence (for the Settings card). */
export const passkeysUnsupportedReason = (): string =>
  inNativeApp() ? 'Install the newest version of the app to use passkeys here. Safari works too.' : "This browser doesn't support passkeys.";

export const callFn = async (body: Record<string, unknown>): Promise<any> => {
  const { data, error } = await supabase.functions.invoke('passkey', { body });
  if (error) {
    try { return await (error as any).context.json(); } catch { return { ok: false, message: 'Could not reach the server. Check your connection.' }; }
  }
  return data;
};

/** Turns a browser/device error into one plain sentence. */
const friendly = (e: any): { message: string; cancelled?: boolean } => {
  const name = e?.name || '';
  if (name === 'NotAllowedError' || name === 'AbortError') return { message: 'Cancelled.', cancelled: true };
  if (name === 'InvalidStateError') return { message: 'This device already has a passkey for your account.' };
  if (name === 'NotSupportedError' || name === 'SecurityError') return { message: "Passkeys don't work in this app or browser yet." };
  return { message: "Couldn't use a passkey right now. Try again." };
};

// ── iPhone app: the Face ID step happens in an in-app Safari sheet ──

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Opens the sheet and resolves when the person closes it (or we close it). */
const openSheet = async (url: string): Promise<{ closed: Promise<void>; close: () => Promise<void> }> => {
  let finish: () => void = () => {};
  const closed = new Promise<void>(r => { finish = r; });
  const handle = await Browser.addListener('browserFinished', () => { finish(); });
  await Browser.open({ url, presentationStyle: 'popover' });
  return {
    closed: closed.finally(() => { handle.remove(); }),
    close: async () => { try { await Browser.close(); } catch { /* already closed */ } finish(); },
  };
};

const SHEET_MAX_MS = 5 * 60 * 1000;

const addViaSheet = async (): Promise<PasskeyResult> => {
  const start = await callFn({ action: 'handoff_start', kind: 'register' });
  if (!start?.ok) return { ok: false, message: start?.message || "Couldn't start. Try again." };
  const before = await listPasskeys().then(l => l.length).catch(() => -1);
  try {
    const sheet = await openSheet(`${window.location.origin}/?pk=add&h=${encodeURIComponent(start.id)}`);
    await sheet.closed;
  } catch { return { ok: false, message: "Couldn't open Safari. Try again." }; }
  const after = await listPasskeys().then(l => l.length).catch(() => -1);
  if (before >= 0 && after > before) return { ok: true };
  return { ok: false, message: 'No passkey was added.', cancelled: true };
};

const signInViaSheet = async (onCode?: (code: string) => void): Promise<PasskeyResult> => {
  const start = await callFn({ action: 'handoff_start', kind: 'login' });
  if (!start?.ok) return { ok: false, message: start?.message || "Couldn't start. Try again." };
  onCode?.(start.code);
  let sheet: Awaited<ReturnType<typeof openSheet>>;
  try { sheet = await openSheet(`${window.location.origin}/?pk=login&h=${encodeURIComponent(start.id)}`); }
  catch { return { ok: false, message: "Couldn't open Safari. Try again." }; }

  let sheetClosed = false;
  sheet.closed.then(() => { sheetClosed = true; });
  const until = Date.now() + SHEET_MAX_MS;
  let lastTry = false;
  while (Date.now() < until) {
    const res = await callFn({ action: 'handoff_claim', id: start.id, claim: start.claim });
    if (res?.ok && res.access_token && res.refresh_token) {
      await sheet.close();
      const { error } = await supabase.auth.setSession({ access_token: res.access_token, refresh_token: res.refresh_token });
      return error ? { ok: false, message: "Couldn't sign you in." } : { ok: true };
    }
    if (res && res.ok === false && /expired/i.test(res.message || '')) { await sheet.close(); return { ok: false, message: res.message || "Couldn't sign you in." }; }
    if (lastTry) break;
    if (sheetClosed) lastTry = true; // one more look after the sheet closes, then stop
    await sleep(sheetClosed ? 300 : 1500);
  }
  await sheet.close();
  return { ok: false, message: 'Cancelled.', cancelled: true };
};

// ── Safari side of the handoff (the page the in-app Safari sheet shows) ──

export const handoffInfo = async (id: string, kind: 'login' | 'register'): Promise<{ ok: true; code: string } | { ok: false; message: string }> => {
  const res = await callFn({ action: 'handoff_info', id, kind });
  return res?.ok ? { ok: true, code: String(res.code) } : { ok: false, message: res?.message || 'This link expired. Start again in the app.' };
};

/** Runs the Face ID step for a passkey the app asked for. */
export const finishHandoffAdd = async (id: string): Promise<PasskeyResult> => {
  const start = await callFn({ action: 'register_options', handoffId: id });
  if (!start?.ok) return { ok: false, message: start?.message || "Couldn't start. Try again." };
  let response;
  try { response = await startRegistration(start.options); }
  catch (e) { return { ok: false, ...friendly(e) }; }
  const done = await callFn({ action: 'register_verify', handoffId: id, challengeId: start.challengeId, response });
  return done?.ok ? { ok: true } : { ok: false, message: done?.message || "Couldn't save the passkey." };
};

/** Runs the Face ID step for a sign-in the app asked for. The app picks the session up itself. */
export const finishHandoffLogin = async (id: string): Promise<PasskeyResult> => {
  const start = await callFn({ action: 'login_options' });
  if (!start?.ok) return { ok: false, message: start?.message || "Couldn't start. Try again." };
  let response;
  try { response = await startAuthentication(start.options); }
  catch (e) { return { ok: false, ...friendly(e) }; }
  const done = await callFn({ action: 'login_verify', handoffId: id, challengeId: start.challengeId, response });
  return done?.ok ? { ok: true } : { ok: false, message: done?.message || "Couldn't sign you in." };
};

/** Creates a passkey for the signed-in user. */
export const addPasskey = async (): Promise<PasskeyResult> => {
  if (inNativeApp()) return sheetAvailable() ? addViaSheet() : { ok: false, message: passkeysUnsupportedReason() };
  const start = await callFn({ action: 'register_options' });
  if (!start?.ok) return { ok: false, message: start?.message || "Couldn't start. Try again." };
  let response;
  try { response = await startRegistration(start.options); }
  catch (e) { return { ok: false, ...friendly(e) }; }
  const done = await callFn({ action: 'register_verify', challengeId: start.challengeId, response });
  return done?.ok ? { ok: true } : { ok: false, message: done?.message || "Couldn't save the passkey." };
};

/** Signs in with a passkey (no username needed: the device shows the passkeys it has). */
export const signInWithPasskey = async (onCode?: (code: string) => void): Promise<PasskeyResult> => {
  if (inNativeApp()) return sheetAvailable() ? signInViaSheet(onCode) : { ok: false, message: passkeysUnsupportedReason() };
  const start = await callFn({ action: 'login_options' });
  if (!start?.ok) return { ok: false, message: start?.message || "Couldn't start. Try again." };
  let response;
  try { response = await startAuthentication(start.options); }
  catch (e) { return { ok: false, ...friendly(e) }; }
  const done = await callFn({ action: 'login_verify', challengeId: start.challengeId, response });
  if (!done?.ok) return { ok: false, message: done?.message || "Couldn't sign you in." };
  const { error } = await supabase.auth.setSession({ access_token: done.access_token, refresh_token: done.refresh_token });
  return error ? { ok: false, message: "Couldn't sign you in." } : { ok: true };
};

export const listPasskeys = async (): Promise<Passkey[]> => {
  const { data, error } = await supabase.from('passkeys').select('id, device_name, created_at, last_used_at').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Passkey[];
};

export const removePasskey = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from('passkeys').delete().eq('id', id);
  return !error;
};
