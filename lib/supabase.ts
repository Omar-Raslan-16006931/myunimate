import { createClient } from '@supabase/supabase-js';
import { isOffline, markReachable, notifyBlockedWrite } from './network';

// Access environment variables - these MUST be set in .env.local
// We cast import.meta to any to avoid TypeScript errors if types aren't perfectly set up
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

// Sits between the app and Supabase:
//  - tells the rest of the app whether the server can be reached (offline indicator)
//  - while offline, refuses changes to your data (view-only) instead of letting them fail half way
const guardedFetch: typeof fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
  const method = (init?.method || (typeof input === 'object' && 'method' in input ? (input as Request).method : '') || 'GET').toUpperCase();
  const changesData = /\/(rest|functions|storage)\/v1\//.test(url) && method !== 'GET' && method !== 'HEAD';

  if (changesData && isOffline()) {
    notifyBlockedWrite();
    return new Response(
      JSON.stringify({ message: "You're offline, so this is view-only until you are back online.", code: 'offline' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }

  try {
    const res = await fetch(input, init);
    markReachable(true);
    return res;
  } catch (err) {
    if ((err as { name?: string })?.name !== 'AbortError') markReachable(false);
    throw err;
  }
};

// Ensure the client is created with valid strings
// Casting to any to avoid type errors with mismatched supabase-js versions
export const supabase: any = createClient(supabaseUrl, supabaseAnonKey, { global: { fetch: guardedFetch } });
