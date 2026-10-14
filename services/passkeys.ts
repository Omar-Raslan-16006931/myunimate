import { startAuthentication, startRegistration, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { supabase } from '../lib/supabase';

// Passkeys: sign in with Face ID, Touch ID or a security key.
// The "passkey" Edge Function checks everything; the app only shows the prompts.

export interface Passkey { id: string; device_name: string; created_at: string; last_used_at: string | null }
export type PasskeyResult = { ok: true } | { ok: false; message: string; cancelled?: boolean };

export const passkeysSupported = (): boolean => {
  try { return typeof window !== 'undefined' && browserSupportsWebAuthn(); } catch { return false; }
};

const callFn = async (body: Record<string, unknown>): Promise<any> => {
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

/** Creates a passkey for the signed-in user. */
export const addPasskey = async (): Promise<PasskeyResult> => {
  const start = await callFn({ action: 'register_options' });
  if (!start?.ok) return { ok: false, message: start?.message || "Couldn't start. Try again." };
  let response;
  try { response = await startRegistration(start.options); }
  catch (e) { return { ok: false, ...friendly(e) }; }
  const done = await callFn({ action: 'register_verify', challengeId: start.challengeId, response });
  return done?.ok ? { ok: true } : { ok: false, message: done?.message || "Couldn't save the passkey." };
};

/** Signs in with a passkey (no username needed: the device shows the passkeys it has). */
export const signInWithPasskey = async (): Promise<PasskeyResult> => {
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
