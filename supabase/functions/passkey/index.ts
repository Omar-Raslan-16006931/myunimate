// passkey: sign in with Face ID / Touch ID / a security key (WebAuthn).
//
// Actions (POST JSON { action, ... }):
//   register_options  (signed in)  -> options for creating a passkey
//   register_verify   (signed in)  -> checks the new passkey and saves it
//   login_options     (anyone)     -> options for signing in (no username needed)
//   login_verify      (anyone)     -> checks the sign-in and returns a session
//
// Handoff (the sideloaded iPhone app opens Safari for the Face ID step):
//   handoff_start     (anyone for login, signed in for register) -> { id, claim, code }
//   handoff_info      (anyone, needs the id)  -> { kind, code } shown on the Safari page
//   handoff_claim     (the app, needs id + claim) -> the session once Safari finished
//   register_options / register_verify / login_verify also accept { handoffId }
//
// Deploy with "Verify JWT" turned OFF (sign-in happens before there is a session):
//   supabase functions deploy passkey --no-verify-jwt
//
// Optional secrets (defaults are for the live site):
//   PASSKEY_RP_ID    = omar-unimate.vercel.app
//   PASSKEY_ORIGINS  = https://omar-unimate.vercel.app   (comma separated)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "npm:@simplewebauthn/server@10.0.1";

const URL_ = Deno.env.get("SUPABASE_URL") ?? "";
const admin = createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const RP_ID = Deno.env.get("PASSKEY_RP_ID") ?? "omar-unimate.vercel.app";
const ORIGINS = (Deno.env.get("PASSKEY_ORIGINS") ?? "https://omar-unimate.vercel.app").split(",").map((s) => s.trim()).filter(Boolean);
const RP_NAME = "UniMate";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const fail = (message: string, status = 400) => json({ ok: false, message }, status);

// ── helpers ──
const b64u = {
  enc: (u: Uint8Array) => btoa(String.fromCharCode(...u)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
  dec: (s: string) => {
    const p = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4);
    return Uint8Array.from(atob(p), (c) => c.charCodeAt(0));
  },
};

const sha256 = async (text: string) =>
  b64u.enc(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))));
const randomSecret = () => b64u.enc(crypto.getRandomValues(new Uint8Array(32)));
const randomCode = () => String(100 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900)); // 100-999
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A live handoff row, or null (wrong id, wrong kind, expired). */
const liveHandoff = async (id: unknown, kind: "login" | "register") => {
  if (typeof id !== "string" || !UUID.test(id)) return null;
  const { data } = await admin.from("passkey_handoffs")
    .select("id, kind, user_id, claim_hash, code, access_token, refresh_token")
    .eq("id", id).eq("kind", kind).gt("expires_at", new Date().toISOString()).maybeSingle();
  return data as { id: string; kind: string; user_id: string | null; claim_hash: string | null; code: string; access_token: string | null; refresh_token: string | null } | null;
};

// slow down abuse: per IP, in memory
const hits = new Map<string, number[]>();
const tooMany = (key: string, limit: number, windowMs = 600_000) => {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  return list.length > limit;
};

const saveChallenge = async (challenge: string, kind: "register" | "login", userId?: string) => {
  const { data, error } = await admin.from("passkey_challenges").insert({ challenge, kind, user_id: userId ?? null }).select("id").single();
  if (error || !data) throw new Error("CHALLENGE_SAVE_FAILED");
  return data.id as string;
};

/** Reads a challenge once and deletes it, so it can never be replayed. */
const takeChallenge = async (id: string, kind: "register" | "login") => {
  const { data } = await admin.from("passkey_challenges").delete().eq("id", id).eq("kind", kind).gt("expires_at", new Date().toISOString()).select("challenge, user_id").maybeSingle();
  return data as { challenge: string; user_id: string | null } | null;
};

const userFromRequest = async (req: Request) => {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  return error || !data.user ? null : data.user;
};

/** The signed-in user, or (from Safari) the user a one-time "add passkey" link was made for. */
const userForRegister = async (req: Request, handoffId: unknown) => {
  const user = await userFromRequest(req);
  if (user) return user;
  if (handoffId === undefined || handoffId === null) return null;
  const h = await liveHandoff(handoffId, "register");
  if (!h?.user_id) return null;
  const { data } = await admin.auth.admin.getUserById(h.user_id);
  return data?.user ?? null;
};

const deviceName = (ua: string) => {
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua)) return "Android phone";
  if (/Macintosh/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Windows PC";
  return "Passkey";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail("Not allowed.", 405);

  let body: any;
  try { body = await req.json(); } catch { return fail("Bad request."); }
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (body.action === "handoff_claim") {
    if (tooMany("claim:" + ip, 400)) return fail("Too many tries. Wait a few minutes.", 429); // the app asks every ~1.5 s
  } else if (tooMany("ip:" + ip, 40)) return fail("Too many tries. Wait a few minutes.", 429);

  try {
    // ───────────── create a passkey ─────────────
    if (body.action === "register_options") {
      const user = await userForRegister(req, body.handoffId);
      if (!user) return fail("Please sign in again.", 401);

      const { data: existing } = await admin.from("passkeys").select("credential_id, transports").eq("user_id", user.id);
      const options = await generateRegistrationOptions({
        rpName: RP_NAME,
        rpID: RP_ID,
        userName: user.email ?? user.id,
        userDisplayName: (user.user_metadata?.username as string) || user.email || "UniMate user",
        userID: new TextEncoder().encode(user.id),
        attestationType: "none",
        excludeCredentials: (existing ?? []).map((c) => ({ id: c.credential_id, transports: c.transports })),
        authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
      });
      const challengeId = await saveChallenge(options.challenge, "register", user.id);
      return json({ ok: true, options, challengeId });
    }

    if (body.action === "register_verify") {
      const user = await userForRegister(req, body.handoffId);
      if (!user) return fail("Please sign in again.", 401);
      const saved = await takeChallenge(String(body.challengeId ?? ""), "register");
      if (!saved || saved.user_id !== user.id) return fail("That took too long. Try again.");

      const result = await verifyRegistrationResponse({
        response: body.response,
        expectedChallenge: saved.challenge,
        expectedOrigin: ORIGINS,
        expectedRPID: RP_ID,
        requireUserVerification: false,
      });
      if (!result.verified || !result.registrationInfo) return fail("Could not verify the passkey.");
      const info = result.registrationInfo;

      const { count } = await admin.from("passkeys").select("id", { count: "exact", head: true }).eq("user_id", user.id);
      if ((count ?? 0) >= 10) return fail("You already have 10 passkeys. Remove one first.");

      const { error } = await admin.from("passkeys").insert({
        user_id: user.id,
        credential_id: info.credentialID,
        public_key: b64u.enc(info.credentialPublicKey),
        counter: info.counter,
        transports: body.response?.response?.transports ?? [],
        device_name: deviceName(req.headers.get("user-agent") ?? ""),
      });
      if (error) return fail(/duplicate|unique/i.test(error.message) ? "This passkey is already saved." : "Could not save the passkey.", 500);
      if (body.handoffId) await admin.from("passkey_handoffs").delete().eq("id", String(body.handoffId)); // one use only
      return json({ ok: true });
    }

    // ───────────── sign in ─────────────
    if (body.action === "login_options") {
      const options = await generateAuthenticationOptions({ rpID: RP_ID, userVerification: "preferred" }); // no allowCredentials: the device shows its passkeys
      const challengeId = await saveChallenge(options.challenge, "login");
      return json({ ok: true, options, challengeId });
    }

    if (body.action === "login_verify") {
      if (tooMany("login:" + ip, 12)) return fail("Too many tries. Wait a few minutes.", 429);
      const handoff = body.handoffId === undefined || body.handoffId === null ? null : await liveHandoff(body.handoffId, "login");
      if (body.handoffId !== undefined && body.handoffId !== null && (!handoff || handoff.access_token)) return fail("This link expired. Start again in the app.");
      const saved = await takeChallenge(String(body.challengeId ?? ""), "login");
      if (!saved) return fail("That took too long. Try again.");

      const credId = String(body.response?.id ?? "");
      const { data: pk } = await admin.from("passkeys").select("id, user_id, credential_id, public_key, counter, transports").eq("credential_id", credId).maybeSingle();
      if (!pk) return fail("This passkey isn't saved on any account.", 401);

      const result = await verifyAuthenticationResponse({
        response: body.response,
        expectedChallenge: saved.challenge,
        expectedOrigin: ORIGINS,
        expectedRPID: RP_ID,
        requireUserVerification: false,
        authenticator: {
          credentialID: pk.credential_id,
          credentialPublicKey: b64u.dec(pk.public_key),
          counter: Number(pk.counter),
          transports: pk.transports,
        },
      });
      if (!result.verified) return fail("Could not verify the passkey.", 401);

      await admin.from("passkeys").update({ counter: result.authenticationInfo.newCounter, last_used_at: new Date().toISOString() }).eq("id", pk.id);

      const { data: u } = await admin.auth.admin.getUserById(pk.user_id);
      const email = u?.user?.email;
      if (!email || !u.user?.email_confirmed_at) return fail("Confirm your email first, then sign in.", 401);
      // banned accounts never get a session
      const { data: prof } = await admin.from("profiles").select("is_banned, banned_until").eq("id", pk.user_id).maybeSingle();
      if (prof?.is_banned && (!prof.banned_until || new Date(prof.banned_until) > new Date())) return fail("This account is suspended.", 403);

      // turn the verified passkey into a normal session
      const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
      const tokenHash = link.data?.properties?.hashed_token;
      if (link.error || !tokenHash) return fail("Could not sign you in.", 500);
      const anon = createClient(URL_, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data: s, error: vErr } = await anon.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash });
      if (vErr || !s.session) return fail("Could not sign you in.", 500);
      if (handoff) {
        // Safari never sees the session: it waits here until the app picks it up (once)
        const { error: hErr } = await admin.from("passkey_handoffs").update({ access_token: s.session.access_token, refresh_token: s.session.refresh_token, user_id: pk.user_id }).eq("id", handoff.id);
        if (hErr) return fail("Could not sign you in.", 500);
        return json({ ok: true, handoff: true });
      }
      return json({ ok: true, access_token: s.session.access_token, refresh_token: s.session.refresh_token });
    }

    // ───────────── handoff (app <-> Safari sheet) ─────────────
    if (body.action === "handoff_start") {
      const kind = body.kind === "register" ? "register" : "login";
      let userId: string | null = null;
      if (kind === "register") {
        const user = await userFromRequest(req);
        if (!user) return fail("Please sign in again.", 401);
        userId = user.id;
      }
      if (tooMany("handoff:" + ip, 20)) return fail("Too many tries. Wait a few minutes.", 429);
      const claim = randomSecret();
      const code = randomCode();
      const { data, error } = await admin.from("passkey_handoffs").insert({
        kind, user_id: userId, claim_hash: kind === "login" ? await sha256(claim) : null, code,
      }).select("id").single();
      if (error || !data) return fail("Couldn't start. Try again.", 500);
      return json({ ok: true, id: data.id, claim, code });
    }

    if (body.action === "handoff_info") {
      const kind = body.kind === "register" ? "register" : "login";
      const h = await liveHandoff(body.id, kind);
      if (!h || h.access_token) return fail("This link expired. Start again in the app.", 404);
      return json({ ok: true, kind: h.kind, code: h.code });
    }

    if (body.action === "handoff_claim") {
      const h = await liveHandoff(body.id, "login");
      if (!h || !h.claim_hash || typeof body.claim !== "string" || (await sha256(body.claim)) !== h.claim_hash) return fail("This sign-in expired. Try again.", 404);
      if (!h.access_token || !h.refresh_token) return json({ ok: true, pending: true });
      await admin.from("passkey_handoffs").delete().eq("id", h.id); // the session can be picked up only once
      return json({ ok: true, access_token: h.access_token, refresh_token: h.refresh_token });
    }

    return fail("Unknown action.");
  } catch (e) {
    console.error("passkey error:", e instanceof Error ? e.message : e);
    return fail("Something went wrong. Try again.", 500);
  }
});
