// portal-sync: signs into the GIU portal with the student's own portal login,
// reads grades and attendance, and saves them for the app to show.
//
// Deploy with "Verify JWT" turned OFF: the function checks the caller itself
// (a signed-in app user, or the hourly timer with its secret).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { type Connector, fetchPortal, type PortalData } from "./portal.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// HTTP/1.1 only: NTLM does not work over HTTP/2.
const connector: Connector = async (hostname, port) => {
  const conn = await Deno.connectTls({ hostname, port, alpnProtocols: ["http/1.1"] });
  return { read: (b) => conn.read(b), write: (d) => conn.write(d), close: () => conn.close() };
};

const MESSAGES: Record<string, string> = {
  PORTAL_LOGIN_FAILED: "The portal rejected this username or password.",
  PORTAL_UNSUPPORTED_LOGIN: "The portal asked for a kind of login this app does not support.",
  PORTAL_CONNECTION_CLOSED: "The portal closed the connection. Try again in a minute.",
  PORTAL_BAD_CHALLENGE: "The portal sent an unexpected login reply.",
  PORTAL_UNEXPECTED_REDIRECT: "The portal redirected somewhere unexpected.",
  PORTAL_PAGE_CHANGED_GRADES: "The grades page looks different from what the app expects.",
  PORTAL_PAGE_CHANGED_ATTENDANCE: "The attendance page looks different from what the app expects.",
  PORTAL_TIMEOUT: "The portal took too long to answer.",
  NO_CREDENTIALS: "No portal login is saved yet.",
};

const describe = (e: unknown): { code: string; message: string } => {
  const raw = e instanceof Error ? e.message : String(e);
  const code = raw.match(/^[A-Z][A-Z0-9_]+/)?.[0] ?? "PORTAL_UNREACHABLE";
  const http = code.match(/^PORTAL_HTTP_(\d+)/);
  return {
    code,
    message: MESSAGES[code] ?? (http ? `The portal answered with error ${http[1]}.` : "Could not reach the portal."),
  };
};

const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T> =>
  Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error("PORTAL_TIMEOUT")), ms))]);

interface SyncResult {
  ok: boolean;
  code?: string;
  message?: string;
  newGrades?: number;
  grades?: number;
  attendance?: number;
}

const save = async (userId: string, data: PortalData, firstSync: boolean): Promise<number> => {
  const now = new Date().toISOString();

  // grades: anything not seen before, or whose grade changed, is flagged as new
  const { data: existing, error: readErr } = await supabase
    .from("portal_grades").select("id, kind, course_key, element, grade_text").eq("user_id", userId);
  if (readErr) throw new Error("DB_READ_FAILED");
  const byKey = new Map((existing ?? []).map((r) => [`${r.kind}|${r.course_key}|${r.element}`, r]));

  let newCount = 0;
  const seen = new Set<string>();
  for (const g of data.grades) {
    const key = `${g.kind}|${g.courseKey}|${g.element}`;
    if (seen.has(key)) continue; // the portal listed the same element twice
    seen.add(key);
    const row = {
      user_id: userId, kind: g.kind, course_key: g.courseKey, course_name: g.courseName,
      category: g.category, element: g.element, grade_text: g.gradeText,
      score: g.score, total: g.total, lecturer: g.lecturer, updated_at: now,
    };
    const old = byKey.get(key);
    if (!old) {
      const { error } = await supabase.from("portal_grades").insert({ ...row, is_new: !firstSync, first_seen_at: now });
      if (error) throw new Error("DB_WRITE_FAILED");
      if (!firstSync) newCount++;
    } else if (old.grade_text !== g.gradeText) {
      const { error } = await supabase.from("portal_grades").update({ ...row, is_new: true }).eq("id", old.id);
      if (error) throw new Error("DB_WRITE_FAILED");
      newCount++;
    }
  }

  // attendance: one row per session, updated in place if the teacher changes it
  if (data.attendance.length) {
    const rows = data.attendance.map((a) => ({
      user_id: userId, course_key: a.courseKey, course_name: a.courseName, row_number: a.rowNumber,
      status: a.status, session_desc: a.sessionDesc, session_date: a.sessionDate, session_type: a.sessionType,
      updated_at: now,
    }));
    const { error } = await supabase.from("portal_attendance").upsert(rows, { onConflict: "user_id,course_key,row_number" });
    if (error) throw new Error("DB_WRITE_FAILED");
  }

  // warning levels: the portal list is the whole truth, so replace it
  const { error: delErr } = await supabase.from("portal_absence_levels").delete().eq("user_id", userId);
  if (delErr) throw new Error("DB_WRITE_FAILED");
  if (data.absenceLevels.length) {
    const { error } = await supabase.from("portal_absence_levels").insert(
      data.absenceLevels.map((l) => ({ user_id: userId, code: l.code, name: l.name, level: l.level, title: l.title })),
    );
    if (error) throw new Error("DB_WRITE_FAILED");
  }
  return newCount;
};

const syncUser = async (userId: string): Promise<SyncResult> => {
  const { data: account } = await supabase
    .from("portal_accounts").select("username, last_ok_at").eq("user_id", userId).maybeSingle();
  if (!account) return { ok: false, code: "NO_CREDENTIALS", message: MESSAGES.NO_CREDENTIALS };

  try {
    const { data: password, error: pwErr } = await supabase.rpc("portal_get_password", { p_user: userId });
    if (pwErr || !password) throw new Error("NO_CREDENTIALS");

    const data = await withTimeout(fetchPortal({ username: account.username, password }, connector), 110_000);
    const newGrades = await save(userId, data, !account.last_ok_at);
    const now = new Date().toISOString();
    await supabase.from("portal_accounts").update({
      last_sync_at: now, last_ok_at: now, last_status: "ok", last_error: null,
    }).eq("user_id", userId);
    return { ok: true, newGrades, grades: data.grades.length, attendance: data.attendance.length };
  } catch (e) {
    const { code, message } = describe(e);
    console.error("portal sync failed:", code);
    await supabase.from("portal_accounts").update({
      last_sync_at: new Date().toISOString(), last_status: "error", last_error: message,
    }).eq("user_id", userId);
    return { ok: false, code, message };
  }
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, message: "Method not allowed" }, 405);

  let body: { action?: string; username?: string; password?: string } = {};
  try { body = await req.json(); } catch { /* empty body */ }

  // the hourly timer
  if (body.action === "cron") {
    const { data: valid } = await supabase.rpc("portal_cron_secret_ok", { p_secret: req.headers.get("x-cron-secret") ?? "" });
    if (!valid) return json({ ok: false, message: "Unauthorized" }, 401);
    const { data: accounts } = await supabase.from("portal_accounts").select("user_id");
    const results: SyncResult[] = [];
    for (const a of accounts ?? []) results.push(await syncUser(a.user_id));
    return json({ ok: true, synced: results.length, failed: results.filter((r) => !r.ok).length });
  }

  // everything else needs a signed-in app user
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const { data: auth, error: authErr } = token ? await supabase.auth.getUser(token) : { data: null, error: true };
  if (authErr || !auth?.user) return json({ ok: false, message: "Unauthorized" }, 401);
  const userId = auth.user.id;

  if (body.action === "save_credentials") {
    const username = (body.username ?? "").trim();
    const password = body.password ?? "";
    if (!username || !password || username.length > 120 || password.length > 200) {
      return json({ ok: false, message: "Enter your portal username and password." }, 400);
    }
    const { error } = await supabase.rpc("portal_store_password", { p_user: userId, p_username: username, p_password: password });
    if (error) return json({ ok: false, message: "Could not save the portal login." }, 500);
    return json(await syncUser(userId));
  }

  if (body.action === "sync") {
    const { data: account } = await supabase.from("portal_accounts").select("last_sync_at").eq("user_id", userId).maybeSingle();
    if (account?.last_sync_at && Date.now() - new Date(account.last_sync_at).getTime() < 60_000) {
      return json({ ok: false, code: "TOO_SOON", message: "Just synced. Try again in a minute." }, 429);
    }
    return json(await syncUser(userId));
  }

  if (body.action === "remove") {
    const { error } = await supabase.rpc("portal_delete_account", { p_user: userId });
    if (error) return json({ ok: false, message: "Could not remove the portal login." }, 500);
    return json({ ok: true });
  }

  return json({ ok: false, message: "Unknown action" }, 400);
});
