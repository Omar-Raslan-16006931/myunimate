// Signs into the GIU CMS (cms.giu-uni.de). It uses the same login box as the portal
// (NTLM), so the portal's own sign-in code is reused with the CMS address.
//
// Signing in takes a few round trips, so a signed-in connection is kept for a short time
// and reused by the next request of the same student (a file tap right after opening a course).

import { type Connector, PortalHttp } from "./portal.ts";
import type { CmsSession } from "./cms-sync.ts";

export interface CmsAuth {
  username: string;
  password: string;
}

export const CMS_HOST = "cms.giu-uni.de";

/** How long an idle signed-in connection is kept. The CMS server closes idle ones sooner or later; that is handled. */
const KEEP_MS = 45_000;
const MAX_KEPT = 10;
// kept in memory only, never logged: the key contains the login so one student can never get another's connection
const kept = new Map<string, { http: PortalHttp; at: number }>();

const take = (key: string): PortalHttp | null => {
  const k = kept.get(key);
  kept.delete(key);
  if (!k) return null;
  if (Date.now() - k.at > KEEP_MS) { k.http.close(); return null; }
  return k.http;
};
const keep = (key: string, http: PortalHttp) => {
  const old = kept.get(key);
  if (old) old.http.close();
  kept.set(key, { http, at: Date.now() });
  for (const [k, v] of kept) { // drop the stale and anything over the limit
    if (Date.now() - v.at > KEEP_MS || kept.size > MAX_KEPT) { v.http.close(); kept.delete(k); }
  }
};

const okPage = (status: number, what: string) => {
  if (status === 401 || status === 403) throw new Error("PORTAL_LOGIN_FAILED");
  if (status !== 200) throw new Error(`PORTAL_HTTP_${status}_${what}`);
};

export type CmsSessionHandle = CmsSession & {
  /** Done: keep the connection for the next request. */
  close(): void;
  /** Something went wrong: throw the connection away. */
  destroy(): void;
};

export const openCmsSession = (auth: CmsAuth, connector: Connector): Promise<CmsSessionHandle> => {
  const key = `${auth.username}\n${auth.password}`;
  const http = take(key) ?? new PortalHttp(CMS_HOST, connector, auth);
  let bad = false; // a failed request can leave the connection in an unknown state
  const session: CmsSessionHandle = {
    async get(path) {
      try {
        http.accept = "text/html,application/xhtml+xml";
        http.referer = null;
        const res = await http.request("GET", path);
        okPage(res.status, "CMS");
        return res.body;
      } catch (e) { bad = true; throw e; }
    },
    async getFile(path) {
      try {
        http.accept = "application/pdf,application/octet-stream,*/*;q=0.8";
        http.referer = `https://${CMS_HOST}/apps/student/ViewAllCourseStn.aspx`;
        const res = await http.requestStream(path);
        if (res.status !== 200) {
          // a short piece of the answer helps to see why the site refused
          const hint = res.body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 100);
          if (res.status === 401 || res.status === 403) throw new Error("PORTAL_LOGIN_FAILED");
          throw new Error(`PORTAL_HTTP_${res.status}_CMS_FILE${hint ? ": " + hint : ""}`);
        }
        const contentType = res.headers.get("content-type")?.[0] ?? "application/octet-stream";
        if (!res.stream) return { body: res.bytes, contentType, length: res.bytes.length };
        // pass the file on while it is still arriving; keep the connection once it is all through
        const reader = res.stream.getReader();
        const body = new ReadableStream<Uint8Array>({
          async pull(ctrl) {
            try {
              const { done, value } = await reader.read();
              if (done) { ctrl.close(); if (res.keepAlive && !bad) keep(key, http); else http.close(); }
              else ctrl.enqueue(value);
            } catch (e) { bad = true; http.close(); ctrl.error(e); }
          },
          cancel() { bad = true; http.close(); },
        });
        return { body, contentType, length: Number(res.headers.get("content-length")?.[0]) || undefined };
      } catch (e) { bad = true; http.close(); throw e; }
    },
    close: () => { if (bad) http.close(); else keep(key, http); },
    destroy: () => http.close(),
  };
  return Promise.resolve(session);
};
