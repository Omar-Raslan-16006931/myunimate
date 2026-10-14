// username-login: lets people sign in with their username.
// The app sends { username, password }. This function finds the email on the SERVER,
// signs in, and hands back only the session. The email is never sent to the app,
// so nobody can use this to find out someone's email.
//
// Deploy with "Verify JWT" turned OFF (people are not signed in yet):
//   supabase functions deploy username-login --no-verify-jwt

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const URL_ = Deno.env.get("SUPABASE_URL") ?? "";
const admin = createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// the same answer for "no such username" and "wrong password"
const WRONG = { ok: false, message: "Wrong username or password." };

// slow down guessing: 8 tries per 10 minutes per IP and per username
const hits = new Map<string, number[]>();
const tooMany = (key: string, limit = 8, windowMs = 600_000) => {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  return list.length > limit;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, message: "Not allowed." }, 405);

  let body: { username?: unknown; password?: unknown };
  try { body = await req.json(); } catch { return json({ ok: false, message: "Bad request." }, 400); }

  const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (username.length < 4 || username.length > 30 || !password || password.length > 200) return json(WRONG, 401);

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (tooMany("ip:" + ip) || tooMany("user:" + username)) {
    return json({ ok: false, message: "Too many tries. Wait a few minutes and try again." }, 429);
  }

  // exact, case-insensitive match (wildcard characters are escaped)
  const { data: profile } = await admin
    .from("profiles")
    .select("id, email")
    .ilike("username", username.replace(/[\\%_]/g, (c) => "\\" + c))
    .maybeSingle();

  let email = profile?.email as string | undefined;
  if (!email && profile?.id) {
    const { data } = await admin.auth.admin.getUserById(profile.id);
    email = data?.user?.email ?? undefined;
  }
  if (!email) return json(WRONG, 401);

  const user = createClient(URL_, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await user.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    const msg = /confirm/i.test(error?.message ?? "") ? "Confirm your email first, then sign in." : WRONG.message;
    return json({ ok: false, message: msg }, 401);
  }
  return json({ ok: true, access_token: data.session.access_token, refresh_token: data.session.refresh_token });
});
