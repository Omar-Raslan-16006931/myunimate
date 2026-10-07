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
  const raw = e instanceof Error ? (e.stack || e.message) : String(e);
  const code = raw.match(/^[A-Z][A-Z0-9_]+/)?.[0] ?? "PORTAL_UNREACHABLE";
  const http = code.match(/^PORTAL_HTTP_(\d+)/);
  const detail = raw.replace(/^[A-Z][A-Z0-9_]+:?\s*/, "").trim();
  const base = MESSAGES[code] ?? (http ? `The portal answered with error ${http[1]}.` : `Could not reach the portal (${raw.slice(0, 150)}).`);
  return {
    code,
    message: detail && detail !== code && base !== detail ? `${base} (${detail})` : base,
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
  examSeatsCount?: number;
  examSeats?: any[];
  notified?: number;
  topic?: string | null;
}

// one phone alert
interface Alert { title: string; body: string; tag: string }

// Sends alerts through ntfy.sh, a free push app, so they arrive even when
// UniMate is closed. Never throws: a failed alert must not fail the sync.
const sendAlerts = async (topic: string, alerts: Alert[]): Promise<number> => {
  const list = alerts.length > 5
    ? [{
      title: `${alerts.length} portal updates`,
      body: alerts.slice(0, 5).map((a) => a.body).join("\n") + `\n+${alerts.length - 5} more`,
      tag: "bell",
    }]
    : alerts;
  let sent = 0;
  for (const a of list) {
    try {
      const res = await fetch("https://ntfy.sh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, title: a.title, message: a.body, tags: [a.tag], priority: 4 }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) sent++; else console.error("ntfy answered", res.status);
    } catch {
      console.error("ntfy request failed");
    }
  }
  return sent;
};

const newTopic = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return "unimate-" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
};

const to12h = (t: string) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(t || "");
  if (!m) return t || "";
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h >= 12 ? "PM" : "AM"}`;
};

const save = async (userId: string, data: PortalData, firstSync: boolean): Promise<{ newCount: number; alerts: Alert[] }> => {
  const alerts: Alert[] = [];
  const now = new Date().toISOString();

  // grades: anything not seen before, or whose grade changed, is flagged as new
  const { data: existing, error: readErr } = await supabase
    .from("portal_grades").select("id, kind, course_key, category, element, grade_text").eq("user_id", userId);
  if (readErr) throw new Error(`DB_READ_FAILED: ${readErr.message}`);
  // Database table has unique (user_id, kind, course_key, element)
  const byKey = new Map((existing ?? []).map((r) => [`${r.kind}|${r.course_key}|${r.element}`, r]));

  let newCount = 0;
  const seen = new Set<string>();
  for (const g of data.grades) {
    // Dedup against unique constraint key
    const key = `${g.kind}|${g.courseKey}|${g.element}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const row = {
      user_id: userId, kind: g.kind, course_key: g.courseKey, course_name: g.courseName,
      category: g.category, element: g.element, grade_text: g.gradeText,
      score: g.score, total: g.total, lecturer: g.lecturer, updated_at: now,
    };
    const old = byKey.get(key);
    const what = `${g.courseName}: ${g.element} ${g.gradeText}`.trim();
    if (!old) {
      const { error } = await supabase.from("portal_grades").insert({ ...row, is_new: !firstSync, first_seen_at: now });
      if (error) {
        console.error("portal_grades insert error:", error);
        throw new Error(`DB_WRITE_FAILED (portal_grades insert: ${error.message || JSON.stringify(error)})`);
      }
      if (!firstSync) {
        newCount++;
        alerts.push({ title: g.kind === "midterm" ? "New midterm grade" : "New grade", body: what, tag: "memo" });
      }
    } else if (old.grade_text !== g.gradeText) {
      const { error } = await supabase.from("portal_grades").update({ ...row, is_new: true }).eq("id", old.id);
      if (error) {
        console.error("portal_grades update error:", error);
        throw new Error(`DB_WRITE_FAILED (portal_grades update: ${error.message || JSON.stringify(error)})`);
      }
      newCount++;
      alerts.push({ title: "Grade updated", body: what, tag: "memo" });
    }
  }

  // attendance: one row per session, updated in place if the teacher changes it
  if (data.attendance.length) {
    if (!firstSync) {
      const { data: oldAtt, error: attErr } = await supabase
        .from("portal_attendance").select("course_key, row_number, status").eq("user_id", userId);
      // if the old rows cannot be read, skip the alerts rather than alert for every row
      if (!attErr) {
        const oldStatus = new Map((oldAtt ?? []).map((r) => [`${r.course_key}|${r.row_number}`, r.status]));
        for (const a of data.attendance) {
          const before = oldStatus.get(`${a.courseKey}|${a.rowNumber}`);
          if (before === a.status) continue;
          const when = [a.sessionType, a.sessionDate].filter(Boolean).join(" ");
          alerts.push({
            title: before === undefined ? "Attendance posted" : "Attendance changed",
            body: `${a.courseName}: ${a.status}${when ? " (" + when + ")" : ""}`,
            tag: /absent/i.test(a.status) ? "warning" : "white_check_mark",
          });
        }
      }
    }
    const rows = data.attendance.map((a) => ({
      user_id: userId, course_key: a.courseKey, course_name: a.courseName, row_number: a.rowNumber,
      status: a.status, session_desc: a.sessionDesc, session_date: a.sessionDate, session_type: a.sessionType,
      updated_at: now,
    }));
    const { error } = await supabase.from("portal_attendance").upsert(rows, { onConflict: "user_id,course_key,row_number" });
    if (error) {
      console.error("portal_attendance upsert error:", error);
      throw new Error(`DB_WRITE_FAILED (portal_attendance: ${error.message || JSON.stringify(error)})`);
    }
  }

  // warning levels: the portal list is the whole truth, so replace it
  const { error: delErr } = await supabase.from("portal_absence_levels").delete().eq("user_id", userId);
  if (delErr) {
    console.error("portal_absence_levels delete error:", delErr);
    throw new Error(`DB_WRITE_FAILED (portal_absence_levels delete: ${delErr.message || JSON.stringify(delErr)})`);
  }
  if (data.absenceLevels.length) {
    const { error } = await supabase.from("portal_absence_levels").insert(
      data.absenceLevels.map((l) => ({ user_id: userId, code: l.code, name: l.name, level: l.level, title: l.title })),
    );
    if (error) {
      console.error("portal_absence_levels insert error:", error);
      throw new Error(`DB_WRITE_FAILED (portal_absence_levels insert: ${error.message || JSON.stringify(error)})`);
    }
  }

  // exam seats: replace with current active exam seats from portal
  if (data.examSeats.length) {
    try {
      if (!firstSync) {
        const { data: oldSeats, error: seatErr } = await supabase
          .from("portal_exam_seats").select("course_key, exam_type, exam_date, start_time, hall, seat").eq("user_id", userId);
        if (!seatErr) {
          const before = new Map((oldSeats ?? []).map((s) => [
            `${s.course_key}|${s.exam_type}|${s.exam_date ?? ""}`, `${s.start_time}|${s.hall}|${s.seat}`,
          ]));
          for (const s of data.examSeats) {
            const old = before.get(`${s.courseKey}|${s.examType}|${s.examDate ?? ""}`);
            if (old === `${s.startTime}|${s.hall}|${s.seat}`) continue;
            const where = [s.hall ? `Hall ${s.hall}` : "", s.seat ? `Seat ${s.seat}` : ""].filter(Boolean).join(", ");
            const when = [s.examDate, to12h(s.startTime)].filter(Boolean).join(" ");
            alerts.push({
              title: old === undefined ? "Exam seat posted" : "Exam seat changed",
              body: [`${s.courseName}${s.examType ? " " + s.examType : ""}`, where, when].filter(Boolean).join(" · "),
              tag: "round_pushpin",
            });
          }
        }
      }
      await supabase.from("portal_exam_seats").delete().eq("user_id", userId);
      await supabase.from("portal_exam_seats").insert(
        data.examSeats.map((s) => ({
          user_id: userId,
          course_key: s.courseKey,
          course_name: s.courseName,
          exam_day: s.examDay,
          exam_date: s.examDate,
          start_time: s.startTime,
          end_time: s.endTime,
          duration_minutes: s.durationMinutes,
          hall: s.hall,
          seat: s.seat,
          exam_type: s.examType,
          updated_at: now,
        }))
      );
    } catch {
      // table might not exist yet if migration hasn't run; graceful fallback
    }
  }

  return { newCount, alerts };
};

const syncUser = async (userId: string): Promise<SyncResult> => {
  const { data: account } = await supabase
    .from("portal_accounts").select("*").eq("user_id", userId).maybeSingle();
  if (!account) return { ok: false, code: "NO_CREDENTIALS", message: MESSAGES.NO_CREDENTIALS };

  try {
    const { data: password, error: pwErr } = await supabase.rpc("portal_get_password", { p_user: userId });
    if (pwErr || !password) throw new Error("NO_CREDENTIALS");

    const data = await withTimeout(fetchPortal({ username: account.username, password }, connector), 110_000);
    const { newCount: newGrades, alerts } = await save(userId, data, !account.last_ok_at);
    const notified = account.notify_topic && alerts.length ? await sendAlerts(account.notify_topic, alerts) : 0;
    const now = new Date().toISOString();
    await supabase.from("portal_accounts").update({
      last_sync_at: now, last_ok_at: now, last_status: "ok", last_error: null,
    }).eq("user_id", userId);
    return {
      ok: true,
      newGrades,
      grades: data.grades.length,
      attendance: data.attendance.length,
      examSeatsCount: data.examSeats.length,
      examSeats: data.examSeats,
      notified,
    };
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

  let body: { action?: string; username?: string; password?: string; enabled?: boolean } = {};
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
    return json(await syncUser(userId));
  }

  if (body.action === "set_notify") {
    const topic = body.enabled ? newTopic() : null;
    const { data: row, error } = await supabase
      .from("portal_accounts").update({ notify_topic: topic }).eq("user_id", userId).select("user_id");
    if (error) return json({ ok: false, message: "Run the phone alerts SQL in Supabase first." }, 500);
    if (!row?.length) return json({ ok: false, message: "Save your portal login first." }, 400);
    return json({ ok: true, topic });
  }

  if (body.action === "test_notify") {
    const { data: account } = await supabase.from("portal_accounts").select("notify_topic").eq("user_id", userId).maybeSingle();
    if (!account?.notify_topic) return json({ ok: false, message: "Turn on phone alerts first." }, 400);
    const sent = await sendAlerts(account.notify_topic, [{
      title: "UniMate", body: "Alerts are working. You will get one for new grades, attendance and exam seats.", tag: "tada",
    }]);
    return sent ? json({ ok: true }) : json({ ok: false, message: "Could not reach ntfy. Try again." }, 502);
  }

  if (body.action === "remove") {
    const { error } = await supabase.rpc("portal_delete_account", { p_user: userId });
    if (error) return json({ ok: false, message: "Could not remove the portal login." }, 500);
    return json({ ok: true });
  }

  return json({ ok: false, message: "Unknown action" }, 400);
});
