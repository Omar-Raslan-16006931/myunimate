// portal-sync: signs into the GIU portal with the student's own portal login,
// reads grades and attendance, and saves them for the app to show.
//
// Deploy with "Verify JWT" turned OFF: the function checks the caller itself
// (a signed-in app user, or the hourly timer with its secret).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkLogin, type Connector, fetchPortal, fetchSchedule, type PortalData } from "./portal.ts";
import { openCmsSession } from "./cms-session.ts";
import { runCmsSync } from "./cms-sync.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
  PORTAL_LOGIN_FAILED: "Wrong username or password. Check it and try again.",
  PORTAL_PAGE_CHANGED_SCHEDULE: "The schedule page looks different from what the app expects.",
  PORTAL_UNSUPPORTED_LOGIN: "The portal asked for a kind of login this app does not support.",
  PORTAL_CONNECTION_CLOSED: "The portal closed the connection. Try again in a minute.",
  PORTAL_BAD_CHALLENGE: "The portal sent an unexpected login reply.",
  PORTAL_UNEXPECTED_REDIRECT: "The portal redirected somewhere unexpected.",
  PORTAL_PAGE_CHANGED_GRADES: "The grades page looks different from what the app expects.",
  PORTAL_PAGE_CHANGED_ATTENDANCE: "The attendance page looks different from what the app expects.",
  PORTAL_TIMEOUT: "The portal took too long to answer.",
  NO_CREDENTIALS: "No portal login is saved yet.",
  CMS_FILE_NOT_FOUND: "That file is not in your CMS list. Refresh and try again.",
  CMS_BAD_PATH: "That file link is not allowed.",
  PORTAL_PAGE_CHANGED_CMS: "The CMS page looks different from what the app expects.",
};

const describe = (e: unknown): { code: string; message: string } => {
  // the message starts with the code (e.g. "PORTAL_LOGIN_FAILED"); the stack starts with "Error:" and hides it
  const raw = e instanceof Error ? (e.message || e.stack || "") : String(e);
  const code = raw.match(/^[A-Z][A-Z0-9_]+/)?.[0] ?? "PORTAL_UNREACHABLE";
  const http = code.match(/^PORTAL_HTTP_(\d+)/);
  const detail = raw.replace(/^[A-Z][A-Z0-9_]+:?\s*/, "").trim();
  const base = MESSAGES[code] ?? (http ? `The portal answered with error ${http[1]}.` : `Could not reach the portal (${raw.slice(0, 150)}).`);
  return {
    code,
    message: detail && detail !== code && base !== detail ? `${base} (${detail})` : base,
  };
};

const closeCms = (s: unknown) => { try { (s as { close?: () => void }).close?.(); } catch { /* already closed */ } };

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
  alertsFound?: number;
  alertTitles?: string[];
  examDbg?: string;
  ntfy?: string;
  topic?: string | null;
}

// one phone alert
interface Alert { title: string; body: string; tag: string }

// Sends alerts to the student's phone through Bark (a free iPhone push app; the key is stored as "bark:<key>"
// in notify_topic). Apple delivers them, so they arrive even when UniMate is closed.
// Never throws: a failed alert must not fail the sync.
let examDbg = ""; // numbers about the last exam-seat comparison, shown in the timer report
let lastNtfy = ""; // what Bark answered last (status or error), shown in the timer's report
const sendAlerts = async (topic: string, alerts: Alert[]): Promise<number> => {
  const list = alerts.length > 5
    ? [{
      title: `${alerts.length} portal updates`,
      body: alerts.slice(0, 5).map((a) => a.body).join("\n") + `\n+${alerts.length - 5} more`,
      tag: "bell",
    }]
    : alerts;
  if (!topic.startsWith("bark:")) { lastNtfy = "no Bark key yet"; return 0; }
  let sent = 0;
  for (const a of list) {
    try {
      const res = await fetch("https://api.day.app/push", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ device_key: topic.slice(5), title: a.title, body: a.body, group: "UniMate", level: "timeSensitive" }),
        signal: AbortSignal.timeout(8000),
      });
      lastNtfy = "bark " + res.status;
      if (res.ok) sent++; else { console.error("bark answered", res.status); lastNtfy += " " + (await res.text().catch(() => "")).slice(0, 80); }
    } catch (e) {
      lastNtfy = "bark failed: " + (e instanceof Error ? e.message : String(e)).slice(0, 80);
      console.error("bark request failed");
    }
  }
  console.log(`alerts: ${alerts.length} found, ${sent}/${list.length} sent`);
  return sent;
};

// Alerts off keeps the topic as "off:<topic>", so turning them back on gives the
// same Bark key.
const OFF = "off:";
const activeTopic = (t: string | null | undefined) => (t && !t.startsWith(OFF) ? t : null);

// Long random topic: "unimate_" + 40 letters/digits (about 238 bits). Nobody can guess it,
// and the database refuses duplicates.
const TOPIC_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const newTopic = () => {
  let out = "";
  while (out.length < 40) {
    for (const b of crypto.getRandomValues(new Uint8Array(64))) {
      if (b < 248 && out.length < 40) out += TOPIC_CHARS[b % 62]; // 248 = 4*62, keeps every char equally likely
    }
  }
  return "unimate_" + out;
};

// ── Portal password encryption ──
// The key lives only in the Edge Function secret PORTAL_KEY, never in the database,
// so the database (dashboard, SQL editor, backups) only ever holds scrambled text.
// Without the secret set, the function keeps using Supabase Vault like before.
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
let keyPromise: Promise<CryptoKey | null> | null = null;
const portalKey = (): Promise<CryptoKey | null> => {
  if (!keyPromise) {
    const raw = Deno.env.get("PORTAL_KEY") ?? "";
    keyPromise = (async () => {
      if (!raw) return null;
      const bytes = unb64(raw.trim());
      if (bytes.length !== 32) { console.error("PORTAL_KEY must be 32 bytes (base64)"); return null; }
      return await crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["encrypt", "decrypt"]);
    })();
  }
  return keyPromise;
};
const enc = new TextEncoder(), dec = new TextDecoder();
const encryptPassword = async (key: CryptoKey, userId: string, password: string) => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: enc.encode(userId) }, key, enc.encode(password)));
  return `v1:${b64(iv)}:${b64(ct)}`;
};
const decryptPassword = async (key: CryptoKey, userId: string, stored: string) => {
  const [v, iv, ct] = stored.split(":");
  if (v !== "v1" || !iv || !ct) throw new Error("NO_CREDENTIALS");
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv), additionalData: enc.encode(userId) }, key, unb64(ct));
  return dec.decode(pt);
};

/** The portal password for one account, moving old Vault passwords to the new encryption on the way. */
const getPassword = async (userId: string, account: { password_enc?: string | null }): Promise<string> => {
  const key = await portalKey();
  if (key && account.password_enc) return await decryptPassword(key, userId, account.password_enc);
  const { data: password, error } = await supabase.rpc("portal_get_password", { p_user: userId });
  if (error || !password) throw new Error("NO_CREDENTIALS");
  if (key) {
    const password_enc = await encryptPassword(key, userId, password);
    const { error: upErr } = await supabase.from("portal_accounts").update({ password_enc }).eq("user_id", userId);
    if (!upErr) await supabase.rpc("portal_clear_vault", { p_user: userId });
  }
  return password;
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
    .from("portal_grades").select("id, kind, course_key, category, element, grade_text, score").eq("user_id", userId);
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
    const what = `${g.courseName} · ${g.element}: ${g.gradeText}`.trim();
    // The portal often adds an empty slot first ("/ 14") and fills the mark in later.
    // An empty slot is saved quietly; the alert goes out when the real mark appears.
    const hasMark = g.score !== null;
    if (!old) {
      const { error } = await supabase.from("portal_grades").insert({ ...row, is_new: !firstSync && hasMark, first_seen_at: now });
      if (error) {
        console.error("portal_grades insert error:", error);
        throw new Error(`DB_WRITE_FAILED (portal_grades insert: ${error.message || JSON.stringify(error)})`);
      }
      if (!firstSync && hasMark) {
        newCount++;
        alerts.push({ title: g.kind === "midterm" ? "New midterm grade" : "New grade", body: what, tag: "memo" });
      }
    } else if (old.grade_text !== g.gradeText) {
      const { error } = await supabase.from("portal_grades").update({ ...row, is_new: hasMark }).eq("id", old.id);
      if (error) {
        console.error("portal_grades update error:", error);
        throw new Error(`DB_WRITE_FAILED (portal_grades update: ${error.message || JSON.stringify(error)})`);
      }
      if (hasMark) {
        newCount++;
        const hadMark = old.score !== null && old.score !== undefined;
        alerts.push(hadMark
          ? { title: "Grade updated", body: `${what} (was ${old.grade_text})`, tag: "memo" }
          : { title: g.kind === "midterm" ? "New midterm grade" : "New grade", body: what, tag: "memo" });
      }
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
        examDbg = seatErr ? `read error: ${seatErr.message}`.slice(0, 80) : `read ${oldSeats?.length ?? 0} old, portal ${data.examSeats.length}`;
        if (!seatErr) {
          const before = new Map((oldSeats ?? []).map((s) => [
            `${s.course_key}|${s.exam_type}|${s.exam_date ?? ""}`, `${s.start_time}|${s.hall}|${s.seat}`,
          ]));
          const fresh: string[] = [];
          const freshDates: string[] = []; // exam dates of the new seats, for the grouped alert
          for (const s of data.examSeats) {
            const old = before.get(`${s.courseKey}|${s.examType}|${s.examDate ?? ""}`);
            if (old === `${s.startTime}|${s.hall}|${s.seat}`) continue;
            const where = [s.hall ? `Hall ${s.hall}` : "", s.seat ? `Seat ${s.seat}` : ""].filter(Boolean).join(", ");
            const when = [s.examDate, to12h(s.startTime)].filter(Boolean).join(" ");
            const body = [`${s.courseName}${s.examType ? " " + s.examType : ""}`, where, when].filter(Boolean).join(" · ");
            if (old === undefined) { fresh.push(body); if (s.examDate) freshDates.push(s.examDate); continue; }
            alerts.push({ title: "Exam seat changed", body, tag: "round_pushpin" });
          }
          examDbg += `, new ${fresh.length}, sample key ${JSON.stringify([data.examSeats[0]?.courseKey, data.examSeats[0]?.examType, data.examSeats[0]?.examDate])} vs ${JSON.stringify([...before.keys()][0] ?? null)}`.slice(0, 200);
          // new seats: one alert for the lot ("5 new exam seats added"), details when it is just one
          if (fresh.length === 1) alerts.push({ title: "Exam seat posted", body: fresh[0], tag: "round_pushpin" });
          else if (fresh.length > 1) {
            // the grouped alert lists the dates only ("28 Oct · 30 Oct")
            const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const dates = [...new Set(freshDates)].sort().map((d) => { const m = d.match(/^\d{4}-(\d{2})-(\d{2})/); return m ? `${Number(m[2])} ${MON[Number(m[1]) - 1] ?? ""}`.trim() : d; });
            alerts.push({ title: `${fresh.length} new exam seats added`, body: dates.join(" · ") || "Open UniMate for the details", tag: "round_pushpin" });
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
    const password = await getPassword(userId, account);

    const data = await withTimeout(fetchPortal({ username: account.username, password }, connector), 110_000);
    const { newCount: newGrades, alerts } = await save(userId, data, !account.last_ok_at);
    const topicNow = activeTopic(account.notify_topic);
    const notified = topicNow && account.portal_notify !== false && alerts.length ? await sendAlerts(topicNow, alerts) : 0;
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
      alertsFound: alerts.length,
      alertTitles: alerts.map((a) => a.title),
      examDbg,
      ntfy: !topicNow ? "no topic" : account.portal_notify === false ? "portal alerts off" : lastNtfy,
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

// ── CMS file links ──
// A file is opened by the phone's own browser, which cannot send the app login. So the app asks
// for a link that works for 5 minutes, signed so it cannot be guessed or changed.
const b64url = (u: Uint8Array) => b64(u).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64url = (s: string) => unb64(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4));
const hmacKey = () => crypto.subtle.importKey(
  "raw", enc.encode("cms-link:" + (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "")), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"],
);
const signLink = async (userId: string, contentId: number): Promise<string> => {
  const payload = b64url(enc.encode(JSON.stringify({ u: userId, c: contentId, e: Date.now() + 5 * 60_000 })));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(), enc.encode(payload)));
  return `${payload}.${b64url(sig)}`;
};
const readLink = async (token: string): Promise<{ u: string; c: number } | null> => {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", await hmacKey(), unb64url(sig), enc.encode(payload));
    if (!ok) return null;
    const p = JSON.parse(dec.decode(unb64url(payload)));
    return typeof p.u === "string" && typeof p.c === "number" && p.e > Date.now() ? { u: p.u, c: p.c } : null;
  } catch { return null; }
};

const MIME: Record<string, string> = {
  pdf: "application/pdf", ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pps: "application/vnd.ms-powerpoint", ppsx: "application/vnd.openxmlformats-officedocument.presentationml.slideshow",
  odp: "application/vnd.oasis.opendocument.presentation", key: "application/x-iwork-keynote-sffkey",
  zip: "application/zip", txt: "text/plain; charset=utf-8", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
};

/** The signed link for one file; it ends in the real file name so phones know how to preview it. */
const fileLink = async (userId: string, row: { content_id: number; title: string; path: string }): Promise<string> => {
  const base = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/$/, "");
  const ext = (row.path.match(/\.([A-Za-z0-9]{1,5})$/)?.[1] ?? "").toLowerCase();
  const stem = row.title.replace(/\.[A-Za-z0-9]{1,5}$/, "").replace(/[^A-Za-z0-9 ._-]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80) || "file";
  const name = ext ? `${stem}.${ext}` : stem;
  return `${base}/functions/v1/portal-sync/${encodeURIComponent(name)}?t=${encodeURIComponent(await signLink(userId, row.content_id))}`;
};

/** Serves one CMS file inline so the browser shows it instead of saving it. */
const serveCmsFile = async (token: string): Promise<Response> => {
  const fail = (status: number, message: string) =>
    new Response(message, { status, headers: { ...CORS, "Content-Type": "text/plain; charset=utf-8" } });
  const link = await readLink(token);
  if (!link) return fail(403, "This link expired. Go back to UniMate and tap the file again.");
  const [{ data: file }, { data: account }] = await Promise.all([
    supabase.from("cms_files").select("path, title").eq("user_id", link.u).eq("content_id", link.c).maybeSingle(),
    supabase.from("portal_accounts").select("*").eq("user_id", link.u).maybeSingle(),
  ]);
  if (!file) return fail(404, MESSAGES.CMS_FILE_NOT_FOUND);
  // only files the CMS keeps under /Uploads/, never anything else on the site
  if (!/^\/Uploads\/[^?#]+$/.test(file.path) || file.path.includes("..")) return fail(400, MESSAGES.CMS_BAD_PATH);
  if (!account) return fail(400, MESSAGES.NO_CREDENTIALS);
  let session: Awaited<ReturnType<typeof openCmsSession>> | null = null;
  try {
    const password = await getPassword(link.u, account);
    session = await openCmsSession({ username: account.username, password }, connector);
    const f = await withTimeout(session.getFile(file.path), 100_000);
    const ext = (file.path.match(/\.([A-Za-z0-9]{1,5})$/)?.[1] ?? "").toLowerCase();
    const name = /\.[A-Za-z0-9]{1,5}$/.test(file.title) ? file.title : file.title + (ext ? "." + ext : "");
    // the CMS often answers "octet-stream", which makes browsers save the file; use the real type
    const type = MIME[ext] ?? (f.contentType && !/octet-stream/i.test(f.contentType) ? f.contentType : "application/octet-stream");
    // the file is passed on while it is still arriving; the connection is kept (or dropped) by the stream itself
    return new Response(f.body as BodyInit, {
      headers: {
        ...CORS,
        "Content-Type": type,
        ...(f.length ? { "Content-Length": String(f.length) } : {}),
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(name)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    session?.destroy();
    const { code, message } = describe(e);
    console.error("cms file failed:", code);
    return fail(502, message);
  }
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method === "GET") {
    const t = new URL(req.url).searchParams.get("t");
    return t ? await serveCmsFile(t) : new Response("Not found", { status: 404, headers: CORS });
  }
  if (req.method !== "POST") return json({ ok: false, message: "Method not allowed" }, 405);

  let body: { action?: string; username?: string; password?: string; enabled?: boolean; contentId?: number; courseId?: number } = {};
  try { body = await req.json(); } catch { /* empty body */ }

  // the hourly timer
  if (body.action === "cron") {
    const { data: valid } = await supabase.rpc("portal_cron_secret_ok", { p_secret: req.headers.get("x-cron-secret") ?? "" });
    if (!valid) return json({ ok: false, message: "Unauthorized" }, 401);
    const { data: accounts } = await supabase.from("portal_accounts").select("user_id");
    // check up to 5 accounts at the same time
    const queue = [...(accounts ?? [])];
    const results: SyncResult[] = [];
    const worker = async () => {
      for (let a = queue.shift(); a; a = queue.shift()) results.push(await syncUser(a.user_id));
    };
    await Promise.all(Array.from({ length: Math.min(5, queue.length) }, worker));
    // numbers only (no names or codes): how many alerts each account found and sent, and what Bark said
    const report = results.map((r) => ({ ok: r.ok, found: r.alertsFound ?? 0, titles: r.alertTitles ?? [], exam: r.examDbg ?? "", sent: r.notified ?? 0, ntfy: r.ntfy ?? "" }));
    return json({ ok: true, synced: results.length, failed: results.filter((r) => !r.ok).length, report });
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
    // check the login with the portal first: a wrong password is never saved
    try {
      await withTimeout(checkLogin({ username, password }, connector), 40_000);
    } catch (e) {
      const { code, message } = describe(e);
      console.error("save_credentials check failed:", code, message);
      // technical details stay in the logs; the student only sees a plain sentence
      return json({
        ok: false, code,
        message: code === "PORTAL_LOGIN_FAILED" ? MESSAGES.PORTAL_LOGIN_FAILED : "Couldn't reach the portal right now. Try again in a minute.",
      });
    }
    const key = await portalKey();
    if (key) {
      const password_enc = await encryptPassword(key, userId, password);
      const { error } = await supabase.from("portal_accounts").upsert(
        { user_id: userId, username, password_enc, last_status: null, last_error: null, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
      if (error) return json({ ok: false, message: "Could not save the portal login." }, 500);
      await supabase.rpc("portal_clear_vault", { p_user: userId }); // drop any older Vault copy
    } else {
      const { error } = await supabase.rpc("portal_store_password", { p_user: userId, p_username: username, p_password: password });
      if (error) return json({ ok: false, message: "Could not save the portal login." }, 500);
    }
    // the login is checked and saved: that is a success. Reading grades is a bonus
    // that must never turn a good login into an error.
    try { await syncUser(userId); } catch (e) { console.error("first sync failed:", e); }
    return json({ ok: true });
  }

  if (body.action === "sync") {
    return json(await syncUser(userId));
  }

  if (body.action === "get_schedule") {
    const { data: account } = await supabase.from("portal_accounts").select("*").eq("user_id", userId).maybeSingle();
    if (!account) return json({ ok: false, code: "NO_CREDENTIALS", message: MESSAGES.NO_CREDENTIALS });
    try {
      const password = await getPassword(userId, account);
      const classes = await withTimeout(fetchSchedule({ username: account.username, password }, connector), 60_000);
      return json({ ok: true, classes });
    } catch (e) {
      const { code, message } = describe(e);
      return json({ ok: false, code, message });
    }
  }

  if (body.action === "set_notify") {
    const { data: current } = await supabase.from("portal_accounts").select("notify_topic").eq("user_id", userId).maybeSingle();
    const saved: string | null = current?.notify_topic ?? null;
    const base = saved ? (saved.startsWith(OFF) ? saved.slice(OFF.length) : saved) : null;
    const stored = body.enabled ? (base ?? newTopic()) : (base ? OFF + base : null);
    const topic = activeTopic(stored);
    let { data: row, error } = await supabase
      .from("portal_accounts").update({ notify_topic: stored }).eq("user_id", userId).select("user_id");
    if (error?.code === "23505" && body.enabled && !base) { // astronomically unlikely duplicate: pick another
      const again = newTopic();
      ({ data: row, error } = await supabase.from("portal_accounts").update({ notify_topic: again }).eq("user_id", userId).select("user_id"));
      if (!error) return json({ ok: true, topic: again });
    }
    if (error) return json({ ok: false, message: "Run the phone alerts SQL in Supabase first." }, 500);
    if (!row?.length) return json({ ok: false, message: "Save your portal login first." }, 400);
    return json({ ok: true, topic });
  }

  // iPhone alerts through Bark: the student pastes their Bark key (or the link Bark shows). Stored as "bark:<key>".
  if (body.action === "set_bark") {
    const raw = String(body.key ?? "").trim();
    const key = raw.match(/api\.day\.app\/([A-Za-z0-9]{10,40})/)?.[1] ?? (/^[A-Za-z0-9]{10,40}$/.test(raw) ? raw : null);
    if (!key) return json({ ok: false, message: "That does not look like a Bark key. Copy it from the Bark app." }, 400);
    const stored = "bark:" + key;
    const { data: row, error } = await supabase
      .from("portal_accounts").update({ notify_topic: stored }).eq("user_id", userId).select("user_id");
    if (error?.code === "23505") return json({ ok: false, message: "That Bark key is already used by another account." }, 400);
    if (error) return json({ ok: false, message: "Could not save the Bark key." }, 500);
    if (!row?.length) return json({ ok: false, message: "Save your portal login first." }, 400);
    return json({ ok: true, topic: stored });
  }

  if (body.action === "test_notify") {
    const { data: account } = await supabase.from("portal_accounts").select("notify_topic").eq("user_id", userId).maybeSingle();
    const testTopic = activeTopic(account?.notify_topic);
    if (!testTopic) return json({ ok: false, message: "Turn on phone alerts first." }, 400);
    const sent = await sendAlerts(testTopic, [{
      title: "UniMate", body: "Alerts are working. You will get one for new grades, attendance and exam seats.", tag: "tada",
    }]);
    // what Bark said, so a failed test explains itself
    const where = lastNtfy;
    return sent ? json({ ok: true, where }) : json({ ok: false, message: `Could not send the alert (${where.slice(0, 120)})` }, 502);
  }

  if (body.action === "set_portal_notify") {
    const { data: row, error } = await supabase
      .from("portal_accounts").update({ portal_notify: !!body.enabled }).eq("user_id", userId).select("user_id");
    if (error) return json({ ok: false, message: "Run the alerts SQL in Supabase first." }, 500);
    if (!row?.length) return json({ ok: false, message: "Save your portal login first." }, 400);
    return json({ ok: true });
  }

  if (body.action === "set_cms_notify") {
    const { data: row, error } = await supabase
      .from("portal_accounts").update({ cms_notify: !!body.enabled }).eq("user_id", userId).select("user_id");
    if (error) return json({ ok: false, message: "Run the CMS SQL in Supabase first." }, 500);
    if (!row?.length) return json({ ok: false, message: "Save your portal login first." }, 400);
    return json({ ok: true });
  }

  if (body.action === "cms_sync") {
    const { data: account } = await supabase.from("portal_accounts").select("*").eq("user_id", userId).maybeSingle();
    if (!account) return json({ ok: false, code: "NO_CREDENTIALS", message: MESSAGES.NO_CREDENTIALS });
    try {
      const password = await getPassword(userId, account);
      const result = await withTimeout((async () => {
        const session = await openCmsSession({ username: account.username, password }, connector);
        try { return await runCmsSync(supabase, userId, session); } finally { closeCms(session); }
      })(), 110_000);
      const topicNow = activeTopic(account.notify_topic);
      if (account.cms_notify && topicNow && result.alerts.length) await sendAlerts(topicNow, result.alerts);
      return json({ ok: true, files: result.files, newFiles: result.newFiles });
    } catch (e) {
      const { code, message } = describe(e);
      console.error("cms sync failed:", code);
      return json({ ok: false, code, message });
    }
  }

  if (body.action === "cms_link") {
    const { data: file } = await supabase
      .from("cms_files").select("content_id, title, path").eq("user_id", userId).eq("content_id", Number(body.contentId)).maybeSingle();
    if (!file) return json({ ok: false, code: "CMS_FILE_NOT_FOUND", message: MESSAGES.CMS_FILE_NOT_FOUND }, 404);
    return json({ ok: true, url: await fileLink(userId, file) });
  }

  // all links of one course at once, so a tap in the app opens the file without waiting for a link
  if (body.action === "cms_links") {
    const { data: rows } = await supabase
      .from("cms_files").select("content_id, title, path").eq("user_id", userId).eq("course_id", Number(body.courseId));
    const links: Record<string, string> = {};
    for (const r of rows ?? []) links[String(r.content_id)] = await fileLink(userId, r);
    // sign in to the CMS now, in the background, so the next file tap finds the connection ready
    const warm = (async () => {
      const { data: account } = await supabase.from("portal_accounts").select("*").eq("user_id", userId).maybeSingle();
      if (!account) return;
      const session = await openCmsSession({ username: account.username, password: await getPassword(userId, account) }, connector);
      try { await withTimeout(session.get("/apps/student/ViewAllCourseStn.aspx"), 20_000); session.close(); } catch { session.destroy(); }
    })().catch(() => { /* warming is only a speed-up */ });
    // deno-lint-ignore no-explicit-any
    (globalThis as any).EdgeRuntime?.waitUntil?.(warm);
    return json({ ok: true, links });
  }

  if (body.action === "remove") {
    const { error } = await supabase.rpc("portal_delete_account", { p_user: userId });
    if (error) return json({ ok: false, message: "Could not remove the portal login." }, 500);
    return json({ ok: true });
  }

  return json({ ok: false, message: "Unknown action" }, 400);
});
