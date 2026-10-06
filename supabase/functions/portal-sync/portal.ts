// GIU portal client: logs in (NTLM or Basic), reads the grades and attendance
// pages, and returns plain data. No Supabase or Deno-specific code in here, so
// it can be tested on its own.

import { createHmac, randomBytes } from "node:crypto";

// ───────────────────────── small byte helpers ─────────────────────────

const enc = new TextEncoder();
const dec = new TextDecoder();

export const concat = (...parts: Uint8Array[]): Uint8Array => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
};

export const utf16le = (s: string): Uint8Array => {
  const out = new Uint8Array(s.length * 2);
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    out[i * 2] = c & 0xff;
    out[i * 2 + 1] = c >> 8;
  }
  return out;
};

export const decodeUtf16le = (b: Uint8Array): string => {
  let s = "";
  for (let i = 0; i < b.length - 1; i += 2) {
    s += String.fromCharCode(b[i] | (b[i + 1] << 8));
  }
  return s;
};

const b64encode = (b: Uint8Array): string => {
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s);
};

const b64decode = (s: string): Uint8Array => {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

const hmacMd5 = (key: Uint8Array, data: Uint8Array): Uint8Array =>
  new Uint8Array(createHmac("md5", key).update(data).digest());

// ───────────────────────── MD4 (needed for NTLM) ─────────────────────────

export const md4 = (msg: Uint8Array): Uint8Array => {
  const len = msg.length;
  const padLen = ((len + 8) >> 6 << 6) + 64;
  const buf = new Uint8Array(padLen);
  buf.set(msg);
  buf[len] = 0x80;
  const view = new DataView(buf.buffer);
  view.setUint32(padLen - 8, (len * 8) >>> 0, true);
  view.setUint32(padLen - 4, Math.floor((len * 8) / 0x100000000), true);

  let a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476;
  const rol = (x: number, n: number) => (x << n) | (x >>> (32 - n));
  const X = new Uint32Array(16);

  for (let off = 0; off < padLen; off += 64) {
    for (let i = 0; i < 16; i++) X[i] = view.getUint32(off + i * 4, true);
    const aa = a, bb = b, cc = c, dd = d;

    const F = (x: number, y: number, z: number) => (x & y) | (~x & z);
    const G = (x: number, y: number, z: number) => (x & y) | (x & z) | (y & z);
    const H = (x: number, y: number, z: number) => x ^ y ^ z;

    for (const i of [0, 4, 8, 12]) {
      a = rol((a + F(b, c, d) + X[i]) | 0, 3);
      d = rol((d + F(a, b, c) + X[i + 1]) | 0, 7);
      c = rol((c + F(d, a, b) + X[i + 2]) | 0, 11);
      b = rol((b + F(c, d, a) + X[i + 3]) | 0, 19);
    }
    for (const i of [0, 1, 2, 3]) {
      a = rol((a + G(b, c, d) + X[i] + 0x5a827999) | 0, 3);
      d = rol((d + G(a, b, c) + X[i + 4] + 0x5a827999) | 0, 5);
      c = rol((c + G(d, a, b) + X[i + 8] + 0x5a827999) | 0, 9);
      b = rol((b + G(c, d, a) + X[i + 12] + 0x5a827999) | 0, 13);
    }
    for (const i of [0, 2, 1, 3]) {
      a = rol((a + H(b, c, d) + X[i] + 0x6ed9eba1) | 0, 3);
      d = rol((d + H(a, b, c) + X[i + 8] + 0x6ed9eba1) | 0, 9);
      c = rol((c + H(d, a, b) + X[i + 4] + 0x6ed9eba1) | 0, 11);
      b = rol((b + H(c, d, a) + X[i + 12] + 0x6ed9eba1) | 0, 15);
    }
    a = (a + aa) | 0; b = (b + bb) | 0; c = (c + cc) | 0; d = (d + dd) | 0;
  }
  const out = new Uint8Array(16);
  const ov = new DataView(out.buffer);
  ov.setUint32(0, a, true); ov.setUint32(4, b, true); ov.setUint32(8, c, true); ov.setUint32(12, d, true);
  return out;
};

// ───────────────────────── NTLM messages ─────────────────────────

const NTLM_SIG = enc.encode("NTLMSSP\0");
const NTLM_FLAGS = 0xa0088207; // unicode, request target, NTLM, always sign, extended security, 128-bit, 56-bit

export const ntlmType1 = (): string => {
  const m = new Uint8Array(32);
  m.set(NTLM_SIG);
  const v = new DataView(m.buffer);
  v.setUint32(8, 1, true);
  v.setUint32(12, NTLM_FLAGS, true);
  // empty domain + workstation buffers pointing at the end of the message
  v.setUint32(20, 32, true);
  v.setUint32(28, 32, true);
  return b64encode(m);
};

export interface NtlmChallenge {
  challenge: Uint8Array;
  targetName: string;
  targetInfo: Uint8Array;
  timestamp: Uint8Array | null;
}

export const parseNtlmType2 = (b64: string): NtlmChallenge => {
  const m = b64decode(b64);
  const v = new DataView(m.buffer, m.byteOffset, m.byteLength);
  if (dec.decode(m.subarray(0, 7)) !== "NTLMSSP" || v.getUint32(8, true) !== 2) {
    throw new Error("PORTAL_BAD_CHALLENGE");
  }
  let targetName = "";
  if (m.length >= 20) {
    const tnLen = v.getUint16(12, true);
    const tnOff = v.getUint32(16, true);
    if (tnLen > 0 && tnOff + tnLen <= m.length) {
      targetName = decodeUtf16le(m.slice(tnOff, tnOff + tnLen));
    }
  }
  const challenge = m.slice(24, 32);
  let targetInfo: Uint8Array = new Uint8Array(0);
  let timestamp: Uint8Array | null = null;
  if (m.length >= 48) {
    const tiLen = v.getUint16(40, true);
    const tiOff = v.getUint32(44, true);
    if (tiLen > 0 && tiOff + tiLen <= m.length) {
      targetInfo = m.slice(tiOff, tiOff + tiLen);
      // look for the server timestamp (AV pair id 7)
      let p = 0;
      const tv = new DataView(targetInfo.buffer, targetInfo.byteOffset, targetInfo.byteLength);
      while (p + 4 <= targetInfo.length) {
        const id = tv.getUint16(p, true);
        const l = tv.getUint16(p + 2, true);
        if (id === 0) break;
        if (id === 7 && l === 8) timestamp = targetInfo.slice(p + 4, p + 12);
        p += 4 + l;
      }
    }
  }
  return { challenge, targetName, targetInfo, timestamp };
};

const fileTimeNow = (): Uint8Array => {
  const t = (BigInt(Date.now()) + 11644473600000n) * 10000n;
  const out = new Uint8Array(8);
  new DataView(out.buffer).setBigUint64(0, t, true);
  return out;
};

export interface NtlmV2Parts { ntProof: Uint8Array; ntResponse: Uint8Array; lmResponse: Uint8Array }

export const ntlmV2Responses = (
  user: string, domain: string, password: string, ch: NtlmChallenge,
  clientNonce: Uint8Array = new Uint8Array(randomBytes(8)),
  time: Uint8Array = ch.timestamp ?? fileTimeNow(),
): NtlmV2Parts => {
  const v2hash = hmacMd5(md4(utf16le(password)), utf16le(user.toUpperCase() + domain));
  // AvPairs in ch.targetInfo already terminates with MsvAvEOL (4 zero bytes).
  // If targetInfo was empty, provide a 4-byte MsvAvEOL.
  const avPairs = ch.targetInfo.length >= 4 ? ch.targetInfo : new Uint8Array(4);
  const blob = concat(
    new Uint8Array([1, 1, 0, 0, 0, 0, 0, 0]), // RespType (1), HiRespType (1), Reserved1 (2), Reserved2 (4)
    time,                                     // TimeStamp (8)
    clientNonce,                              // ChallengeFromClient (8)
    new Uint8Array(4),                        // Reserved3 (4)
    avPairs,                                  // AvPairs (variable, ending with AvEOL)
  );
  const ntProof = hmacMd5(v2hash, concat(ch.challenge, blob));
  const lmResponse = ch.timestamp
    ? new Uint8Array(24)
    : concat(hmacMd5(v2hash, concat(ch.challenge, clientNonce)), clientNonce);
  return { ntProof, ntResponse: concat(ntProof, blob), lmResponse };
};

export const ntlmType3 = (user: string, domain: string, password: string, ch: NtlmChallenge): string => {
  const { ntResponse, lmResponse } = ntlmV2Responses(user, domain, password, ch);
  const dom = utf16le(domain), usr = utf16le(user), ws = utf16le("UNIMATE");
  const headerLen = 64;
  const m = new Uint8Array(headerLen + dom.length + usr.length + ws.length + lmResponse.length + ntResponse.length);
  const v = new DataView(m.buffer);
  m.set(NTLM_SIG);
  v.setUint32(8, 3, true);
  let off = headerLen;
  const put = (pos: number, data: Uint8Array) => {
    v.setUint16(pos, data.length, true);
    v.setUint16(pos + 2, data.length, true);
    v.setUint32(pos + 4, off, true);
    m.set(data, off);
    off += data.length;
  };
  // payload order: domain, user, workstation, LM, NT
  const fields: [number, Uint8Array][] = [[28, dom], [36, usr], [44, ws], [12, lmResponse], [20, ntResponse]];
  for (const [pos, data] of fields) put(pos, data);
  v.setUint16(52, 0, true); v.setUint16(54, 0, true); v.setUint32(56, off, true); // no session key
  v.setUint32(60, NTLM_FLAGS, true);
  return b64encode(m);
};

// ───────────────────────── tiny HTTP/1.1 client ─────────────────────────
// NTLM signs in a *connection*, not a request, so every step has to travel on
// the same socket. fetch() does not promise that, so this talks HTTP directly.

export interface Conn {
  read(buf: Uint8Array): Promise<number | null>;
  write(data: Uint8Array): Promise<number>;
  close(): void;
}
export type Connector = (host: string, port: number) => Promise<Conn>;

export interface HttpResponse {
  status: number;
  headers: Map<string, string[]>;
  body: string;
  keepAlive: boolean;
}

const indexOf = (hay: Uint8Array, needle: Uint8Array, from = 0): number => {
  outer: for (let i = from; i <= hay.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) if (hay[i + j] !== needle[j]) continue outer;
    return i;
  }
  return -1;
};
const CRLF2 = enc.encode("\r\n\r\n");
const CRLF = enc.encode("\r\n");

class Reader {
  private buf: Uint8Array = new Uint8Array(0);
  private conn: Conn;
  constructor(conn: Conn) { this.conn = conn; }
  private async fill(): Promise<boolean> {
    const chunk = new Uint8Array(16384);
    const n = await this.conn.read(chunk);
    if (n === null || n === 0) return false;
    this.buf = concat(this.buf, chunk.subarray(0, n));
    return true;
  }
  async until(marker: Uint8Array): Promise<Uint8Array> {
    for (;;) {
      const i = indexOf(this.buf, marker);
      if (i >= 0) {
        const out = this.buf.slice(0, i);
        this.buf = this.buf.slice(i + marker.length);
        return out;
      }
      if (!(await this.fill())) throw new Error("PORTAL_CONNECTION_CLOSED");
    }
  }
  async exactly(n: number): Promise<Uint8Array> {
    while (this.buf.length < n) if (!(await this.fill())) throw new Error("PORTAL_CONNECTION_CLOSED");
    const out = this.buf.slice(0, n);
    this.buf = this.buf.slice(n);
    return out;
  }
  async rest(): Promise<Uint8Array> {
    while (await this.fill()) { /* read to end */ }
    const out = this.buf;
    this.buf = new Uint8Array(0);
    return out;
  }
}

export interface PortalAuth { username: string; password: string }

export class PortalHttp {
  private conn: Conn | null = null;
  private reader: Reader | null = null;
  private cookies = new Map<string, string>();
  private basicHeader: string | null = null;

  private host: string;
  private connector: Connector;
  private auth: PortalAuth;
  private port: number;

  constructor(host: string, connector: Connector, auth: PortalAuth, port = 443) {
    this.host = host;
    this.connector = connector;
    this.auth = auth;
    this.port = port;
  }

  close() {
    try { this.conn?.close(); } catch { /* already closed */ }
    this.conn = null;
    this.reader = null;
  }

  private async open() {
    this.close();
    this.conn = await this.connector(this.host, this.port);
    this.reader = new Reader(this.conn);
  }

  private async send(method: string, path: string, body: string | null, authHeader: string | null): Promise<HttpResponse> {
    if (!this.conn) await this.open();
    const bodyBytes = body === null ? new Uint8Array(0) : enc.encode(body);
    const lines = [
      `${method} ${path} HTTP/1.1`,
      `Host: ${this.host}`,
      "User-Agent: Mozilla/5.0 (UniMate portal sync)",
      "Accept: text/html,application/xhtml+xml",
      "Accept-Encoding: identity",
      "Connection: keep-alive",
    ];
    if (this.cookies.size) lines.push("Cookie: " + [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; "));
    if (authHeader) lines.push(`Authorization: ${authHeader}`);
    if (method === "POST") {
      lines.push("Content-Type: application/x-www-form-urlencoded");
      lines.push(`Content-Length: ${bodyBytes.length}`);
    }
    await this.writeAll(concat(enc.encode(lines.join("\r\n") + "\r\n\r\n"), bodyBytes));
    return await this.readResponse(method);
  }

  private async writeAll(data: Uint8Array) {
    let off = 0;
    while (off < data.length) off += await this.conn!.write(data.subarray(off));
  }

  private async readResponse(method: string): Promise<HttpResponse> {
    const r = this.reader!;
    const head = dec.decode(await r.until(CRLF2));
    const [statusLine, ...headerLines] = head.split("\r\n");
    const status = parseInt(statusLine.split(" ")[1] ?? "0", 10);
    const headers = new Map<string, string[]>();
    for (const line of headerLines) {
      const i = line.indexOf(":");
      if (i < 0) continue;
      const k = line.slice(0, i).trim().toLowerCase();
      headers.set(k, [...(headers.get(k) ?? []), line.slice(i + 1).trim()]);
    }
    for (const sc of headers.get("set-cookie") ?? []) {
      const pair = sc.split(";")[0];
      const i = pair.indexOf("=");
      if (i > 0) this.cookies.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
    }
    const one = (k: string) => headers.get(k)?.[0] ?? "";
    let bodyBytes: Uint8Array = new Uint8Array(0);
    let closeAfter = /close/i.test(one("connection"));
    if (method === "HEAD" || status === 204 || status === 304) {
      // no body
    } else if (/chunked/i.test(one("transfer-encoding"))) {
      const parts: Uint8Array[] = [];
      for (;;) {
        const size = parseInt(dec.decode(await r.until(CRLF)).split(";")[0].trim(), 16);
        if (!size) { await r.until(CRLF); break; }
        parts.push(await r.exactly(size));
        await r.exactly(2);
      }
      bodyBytes = concat(...parts);
    } else if (one("content-length") !== "") {
      bodyBytes = await r.exactly(parseInt(one("content-length"), 10));
    } else {
      bodyBytes = await r.rest();
      closeAfter = true;
    }
    if (closeAfter) this.close();
    return { status, headers, body: dec.decode(bodyBytes), keepAlive: !closeAfter };
  }

  /** One request, signing in when the portal asks for it. */
  async request(method: "GET" | "POST", path: string, body: string | null = null, redirects = 0): Promise<HttpResponse> {
    let res: HttpResponse;
    try {
      res = await this.send(method, path, body, this.basicHeader);
    } catch (_e) {
      // a kept-alive socket may have been dropped by the server: retry once on a new one
      await this.open();
      res = await this.send(method, path, body, this.basicHeader);
    }

    if (res.status === 401) {
      const offers = (res.headers.get("www-authenticate") ?? []).join(", ");
      if (/\b(NTLM|Negotiate)\b/i.test(offers)) {
        res = await this.ntlm(method, path, body, /\bNTLM\b/i.test(offers) ? "NTLM" : "Negotiate");
      } else if (/\bBasic\b/i.test(offers)) {
        this.basicHeader = "Basic " + b64encode(enc.encode(`${this.auth.username}:${this.auth.password}`));
        res = await this.send(method, path, body, this.basicHeader);
      } else {
        throw new Error("PORTAL_UNSUPPORTED_LOGIN");
      }
      if (res.status === 401) throw new Error("PORTAL_LOGIN_FAILED");
    }

    if (res.status >= 300 && res.status < 400 && res.headers.get("location") && redirects < 5) {
      const next = new URL(res.headers.get("location")![0], `https://${this.host}${path}`);
      if (next.host !== this.host) throw new Error("PORTAL_UNEXPECTED_REDIRECT");
      return await this.request("GET", next.pathname + next.search, null, redirects + 1);
    }
    return res;
  }

  private async ntlm(method: "GET" | "POST", path: string, body: string | null, scheme: string): Promise<HttpResponse> {
    await this.open(); // the whole handshake must stay on one socket
    const first = await this.send(method, path, method === "POST" ? "" : null, `${scheme} ${ntlmType1()}`);
    const header = (first.headers.get("www-authenticate") ?? []).find(h => new RegExp(`^${scheme}\\s+\\S`, "i").test(h));
    if (first.status !== 401 || !header) {
      if (first.status !== 401) return first;
      throw new Error("PORTAL_LOGIN_FAILED");
    }
    if (!first.keepAlive) throw new Error("PORTAL_CONNECTION_CLOSED");
    const challenge = parseNtlmType2(header.replace(/^\S+\s+/, "").trim());
    let user = this.auth.username, domain = "";
    if (user.includes("\\")) [domain, user] = user.split("\\", 2);
    else if (user.includes("@")) { /* user@domain form is sent as-is with no domain */ }
    else domain = challenge.targetName || "GIUAS";
    return await this.send(method, path, body, `${scheme} ${ntlmType3(user, domain, this.auth.password, challenge)}`);
  }
}

// ───────────────────────── page reading ─────────────────────────

const decodeEntities = (s: string): string =>
  s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));

const text = (html: string): string =>
  decodeEntities(html.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();

const attr = (tag: string, name: string): string | null => {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return m ? decodeEntities(m[2] ?? m[3] ?? m[4] ?? "") : null;
};

export const hiddenFields = (html: string): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const m of html.matchAll(/<input\b[^>]*>/gi)) {
    if ((attr(m[0], "type") ?? "").toLowerCase() !== "hidden") continue;
    const name = attr(m[0], "name");
    if (name) out[name] = attr(m[0], "value") ?? "";
  }
  return out;
};

export interface SelectOption { value: string; label: string }

export const findSelect = (html: string, pattern: RegExp): { name: string; id: string } | null => {
  for (const m of html.matchAll(/<select\b([^>]*)>/gi)) {
    const name = attr(m[1], "name") ?? "";
    const id = attr(m[1], "id") ?? "";
    if (pattern.test(name) || pattern.test(id)) return { name: name || id, id };
  }
  return null;
};

export const selectOptions = (html: string, selectName: string): SelectOption[] => {
  for (const m of html.matchAll(/<select\b([^>]*)>([\s\S]*?)<\/select>/gi)) {
    const name = attr(m[1], "name") ?? "";
    const id = attr(m[1], "id") ?? "";
    const match = name === selectName || id === selectName || name.endsWith("$" + selectName) || id.endsWith("_" + selectName);
    if (!match) continue;
    return [...m[2].matchAll(/<option\b([^>]*)>([\s\S]*?)(?:<\/option>|(?=<option\b)|$)/gi)]
      .map(o => ({ value: attr(o[1], "value") ?? "", label: text(o[2]) }));
  }
  return [];
};

export interface HtmlTable { id: string | null; rows: string[][] }

/** Every table that has no table inside it, as rows of cell text. */
export const tables = (html: string): HtmlTable[] => {
  const out: HtmlTable[] = [];
  for (const m of html.matchAll(/<table\b([^>]*)>((?:(?!<table\b)[\s\S])*?)<\/table>/gi)) {
    const rows = [...m[2].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
      .map(r => [...r[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(c => text(c[1])))
      .filter(r => r.length);
    out.push({ id: attr(m[1], "id"), rows });
  }
  return out;
};

const findTable = (all: HtmlTable[], opts: { idEndsWith?: string; headerHas?: string[] }): HtmlTable | null => {
  if (opts.idEndsWith) {
    const t = all.find(t => t.id?.toLowerCase().endsWith(opts.idEndsWith!.toLowerCase()));
    if (t) return t;
  }
  if (opts.headerHas) {
    const want = opts.headerHas.map(h => h.toLowerCase());
    return all.find(t => t.rows.length > 0 && want.every(w => t.rows[0].some(c => c.toLowerCase().replace(/\s+/g, "").includes(w)))) ?? null;
  }
  return null;
};

const postbackBody = (html: string, target: string, value: string): string => {
  const fields: Record<string, string> = { ...hiddenFields(html), __EVENTTARGET: target, __EVENTARGUMENT: "", __LASTFOCUS: "", [target]: value };
  return Object.entries(fields).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
};

// ───────────────────────── grades ─────────────────────────

export interface GradeItem {
  courseKey: string;   // e.g. "ICS504"
  courseName: string;  // e.g. "Machine Learning"
  kind: "item" | "midterm";
  category: string;    // "Quiz 1", "Assignment 2", "Midterm"
  element: string;     // element name, unique inside the course
  gradeText: string;   // exactly what the portal shows
  score: number | null;
  total: number | null;
  lecturer: string;
}

/** "GIU-Cairo.Informatics ... 5th - ICS504 Machine Learning" → code + name */
export const splitGradeCourse = (label: string): { key: string; name: string } => {
  const last = label.split(" - ").pop()!.trim();
  // code first ("ICS504 Machine Learning") or last ("Mathematics II MATH204")
  let m = last.match(/^([A-Z]{2,6}\s?\d{2,4}[A-Z]?)\s+(.+)$/);
  if (m) return { key: m[1].replace(/\s+/g, ""), name: m[2].trim() };
  m = last.match(/^(.+?)\s+([A-Z]{2,6}\s?\d{2,4}[A-Z]?)$/);
  if (m) return { key: m[2].replace(/\s+/g, ""), name: m[1].trim() };
  return { key: last, name: last };
};

export const parseScore = (s: string): { score: number | null; total: number | null } => {
  const m = s.match(/^\s*(-?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*$/);
  if (m) return { score: Number(m[1]), total: Number(m[2]) };
  const n = s.trim().match(/^-?\d+(?:\.\d+)?$/);
  return { score: n ? Number(n[0]) : null, total: null };
};

export const GRADE_SELECT = "ctl00$ContentPlaceHolder1$smCrsLst";

export const parseGradeCourses = (html: string): SelectOption[] => {
  const found = findSelect(html, /smCrsLst/i) ?? findSelect(html, /course/i);
  return selectOptions(html, found ? found.name : GRADE_SELECT).filter(o => o.value !== "" && o.value !== "0");
};

export const parseMidterms = (html: string): GradeItem[] => {
  const t = findTable(tables(html), { idEndsWith: "midDg", headerHas: ["course", "percentage"] });
  if (!t) return [];
  return t.rows.slice(1).filter(r => r.length >= 2 && r[1] !== "").map(r => {
    const { key, name } = splitGradeCourse(r[0]);
    const pct = Number(r[1]);
    return {
      courseKey: key, courseName: name, kind: "midterm" as const, category: "Midterm", element: "Midterm",
      gradeText: `${r[1]}%`, score: Number.isFinite(pct) ? pct : null, total: Number.isFinite(pct) ? 100 : null, lecturer: "",
    };
  });
};

export const parseGradeItems = (html: string, course: SelectOption): GradeItem[] => {
  const t = findTable(tables(html), { headerHas: ["quiz/assignment", "grade"] });
  if (!t) return [];
  const head = t.rows[0].map(c => c.toLowerCase().replace(/\s+/g, ""));
  const col = (name: string) => head.findIndex(h => h.includes(name));
  const cCat = col("quiz/assignment"), cEl = col("elementname"), cGrade = col("grade"), cProf = col("prof");
  const { key, name } = splitGradeCourse(course.label);

  const items: GradeItem[] = [];
  let lastCategory = "";

  for (const r of t.rows.slice(1)) {
    let cat = "";
    let el = "";
    let grade = "";
    let prof = "";

    if (r.length >= head.length) {
      cat = (cCat >= 0 && r[cCat]) ? r[cCat].trim() : "";
      el = (cEl >= 0 && r[cEl]) ? r[cEl].trim() : "";
      grade = (cGrade >= 0 && r[cGrade]) ? r[cGrade].trim() : "";
      prof = (cProf >= 0 && r[cProf]) ? r[cProf].trim() : "";
    } else if (r.length === head.length - 1) {
      el = r[0] ? r[0].trim() : "";
      grade = r[1] ? r[1].trim() : "";
      prof = r[2] ? r[2].trim() : "";
    } else {
      continue;
    }

    if (cat) lastCategory = cat;
    const finalCategory = cat || lastCategory || "Assignments";
    if (!el && !grade) continue;

    const finalElement = (/^question|^q\d/i.test(el) && finalCategory && !el.toLowerCase().includes(finalCategory.toLowerCase()))
      ? `${finalCategory} - ${el}`
      : (el || finalCategory);

    items.push({
      courseKey: key,
      courseName: name,
      kind: "item" as const,
      category: finalCategory,
      element: finalElement,
      gradeText: grade,
      ...parseScore(grade),
      lecturer: prof,
    });
  }

  return items;
};

// ───────────────────────── attendance ─────────────────────────

export interface AttendanceRow {
  courseKey: string;      // e.g. "ICS504"
  courseName: string;     // e.g. "Machine Learning"
  rowNumber: number;
  status: string;         // "Attended" / "Absent" / whatever the portal says
  sessionDesc: string;
  sessionDate: string | null; // YYYY-MM-DD
  sessionType: string;    // "Practical", "Lecture", ...
}

export interface AbsenceLevel { title: string; code: string; name: string; level: string }

export const ATTENDANCE_SELECT = "DDL_Courses";

/** "Winter 2026  - ICS 504 - Machine Learning" → code + name */
export const splitAttendanceCourse = (label: string): { key: string; name: string } => {
  const parts = label.split(" - ").map(p => p.trim());
  if (parts.length >= 3) return { key: parts[1].replace(/\s+/g, ""), name: parts.slice(2).join(" - ") };
  return { key: label.trim(), name: label.trim() };
};

export const parseAttendanceCourses = (html: string): SelectOption[] => {
  const found = findSelect(html, /DDL_Courses/i) ?? findSelect(html, /course/i);
  return selectOptions(html, found ? found.name : ATTENDANCE_SELECT).filter(o => o.value !== "0" && o.value !== "");
};

export const parseAbsenceLevels = (html: string): AbsenceLevel[] => {
  const t = findTable(tables(html), { idEndsWith: "DG_AbsenceReport", headerHas: ["absencelevel"] });
  if (!t) return [];
  return t.rows.slice(1).filter(r => r.length >= 4).map(r => ({ title: r[0], code: r[1].replace(/\s+/g, ""), name: r[2], level: r[3] }));
};

export const parseAttendanceRows = (html: string, course: SelectOption): AttendanceRow[] => {
  const t = findTable(tables(html), { headerHas: ["attendance", "sessiondsc"] });
  if (!t) return [];
  const head = t.rows[0].map(c => c.toLowerCase().replace(/\s+/g, ""));
  const cNum = head.findIndex(h => h.includes("rownumber"));
  const cAtt = head.findIndex(h => h === "attendance");
  const cDesc = head.findIndex(h => h.includes("sessiondsc"));
  const { key, name } = splitAttendanceCourse(course.label);
  return t.rows.slice(1).filter(r => r.length > Math.max(cAtt, cDesc)).map((r, i) => {
    const desc = r[cDesc] ?? "";
    const d = desc.match(/@\s*(\d{4})\.(\d{2})\.(\d{2})/);
    const type = desc.match(/\b(Practical|Lecture|Tutorial|Lab|Seminar|Project)\b/i);
    return {
      courseKey: key, courseName: name,
      rowNumber: cNum >= 0 && /^\d+$/.test(r[cNum] ?? "") ? Number(r[cNum]) : i + 1,
      status: r[cAtt] ?? "", sessionDesc: desc,
      sessionDate: d ? `${d[1]}-${d[2]}-${d[3]}` : null,
      sessionType: type ? type[1][0].toUpperCase() + type[1].slice(1).toLowerCase() : "",
    };
  });
};

// ───────────────────────── exam seats ─────────────────────────

export interface ExamSeat {
  courseName: string;
  courseKey: string;
  examDay: string;
  examDate: string | null;  // YYYY-MM-DD
  startTime: string;        // HH:MM 24h
  endTime: string;          // HH:MM 24h
  durationMinutes: number;
  hall: string;
  seat: string;
  examType: string;
}

const MONTHS_MAP: Record<string, string> = {
  january: "01", february: "02", march: "03", april: "04", may: "05", june: "06",
  july: "07", august: "08", september: "09", october: "10", november: "11", december: "12"
};

export const parseExamDate = (raw: string): string | null => {
  const m = raw.match(/(\d{1,2})\s*[-/]\s*([A-Za-z]+|\d{1,2})\s*[-/]\s*(\d{4})/);
  if (!m) return null;
  const day = m[1].padStart(2, "0");
  const monthStr = m[2].toLowerCase();
  const month = MONTHS_MAP[monthStr] || monthStr.padStart(2, "0");
  const year = m[3];
  return `${year}-${month}-${day}`;
};

export const parseTime24 = (raw: string): string => {
  const m = raw.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i);
  if (!m) return "09:00";
  let h = parseInt(m[1], 10);
  const min = m[2];
  const ampm = m[3]?.toUpperCase();
  if (ampm === "PM" && h < 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${min}`;
};

export const calcDurationMinutes = (start: string, end: string): number => {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  return diff > 0 ? diff : 60;
};

export const splitExamCourse = (raw: string): { key: string; name: string } => {
  // e.g. "GIU-Cairo.General - RPW401 Research Paper Writing (A2) - Winter 2026"
  const parts = raw.split(" - ").map(p => p.trim());
  let target = parts.length >= 2 ? parts[1] : raw;
  const codeMatch = target.match(/\b([A-Z]{2,4}\s*\d{3,4}[A-Z]?)\b/i);
  const key = codeMatch ? codeMatch[1].replace(/\s+/g, "") : target;
  return { key, name: target };
};

export const parseExamSeats = (html: string): ExamSeat[] => {
  const t = findTable(tables(html), { headerHas: ["coursename", "examday"] }) ||
            findTable(tables(html), { headerHas: ["date", "hall", "seat"] });
  if (!t) return [];

  const head = t.rows[0].map(c => c.toLowerCase().replace(/\s+/g, ""));
  const cCourse = head.findIndex(h => h.includes("course"));
  const cDay = head.findIndex(h => h.includes("day"));
  const cDate = head.findIndex(h => h.includes("date"));
  const cStart = head.findIndex(h => h.includes("start"));
  const cEnd = head.findIndex(h => h.includes("end"));
  const cHall = head.findIndex(h => h.includes("hall"));
  const cSeat = head.findIndex(h => h.includes("seat"));
  const cType = head.findIndex(h => h.includes("type"));

  const seats: ExamSeat[] = [];
  for (const r of t.rows.slice(1)) {
    if (!r.length) continue;
    const rawCourse = (cCourse >= 0 ? r[cCourse] : r[0]) || "";
    if (!rawCourse) continue;
    const rawDate = (cDate >= 0 ? r[cDate] : r[2]) || "";
    const rawStart = (cStart >= 0 ? r[cStart] : r[3]) || "";
    const rawEnd = (cEnd >= 0 ? r[cEnd] : r[4]) || "";

    const { key, name } = splitExamCourse(rawCourse);
    const examDate = parseExamDate(rawDate);
    const startTime = parseTime24(rawStart);
    const endTime = parseTime24(rawEnd);
    const durationMinutes = calcDurationMinutes(startTime, endTime);

    seats.push({
      courseName: name,
      courseKey: key,
      examDay: (cDay >= 0 ? r[cDay] : r[1]) || "",
      examDate,
      startTime,
      endTime,
      durationMinutes,
      hall: (cHall >= 0 ? r[cHall] : r[5]) || "",
      seat: (cSeat >= 0 ? r[cSeat] : r[6]) || "",
      examType: (cType >= 0 ? r[cType] : r[7]) || "",
    });
  }
  return seats;
};

// ───────────────────────── the whole sync ─────────────────────────

export const PORTAL_HOST = "portal.giu-uni.de";
export const HOME_PATH = "/GIUb/EXTStudent/Home.aspx";
export const GRADES_PATH = "/GIUb/EXTStudent/CheckGrade_m.aspx";
export const GRADES_DESKTOP_PATH = "/GIUb/EXTStudent/CheckGrade.aspx";
export const ATTENDANCE_PATH = "/GIUb/EXTStudent/ClassAttendance_ViewStudentAttendance_b.aspx";
export const EXAM_SEATS_PATH = "/GIUb/EXTStudent/ViewExamSeat_m.aspx";

export interface PortalData {
  grades: GradeItem[];
  attendance: AttendanceRow[];
  absenceLevels: AbsenceLevel[];
  examSeats: ExamSeat[];
  gradeCourses: number;
  attendanceCourses: number;
  warnings: string[];
}

const mustBeOk = (res: HttpResponse, what: string) => {
  if (res.status === 401 || res.status === 403) throw new Error("PORTAL_LOGIN_FAILED");
  if (res.status !== 200) throw new Error(`PORTAL_HTTP_${res.status}_${what}`);
};

export const fetchPortal = async (auth: PortalAuth, connector: Connector, host = PORTAL_HOST, port = 443): Promise<PortalData> => {
  const http = new PortalHttp(host, connector, auth, port);
  const warnings: string[] = [];
  try {
    // 1. Visit Home.aspx first to establish ASP.NET session and student context
    try {
      await http.request("GET", HOME_PATH);
    } catch {
      // ignore, continue to grades
    }

    // 2. Fetch grades: try mobile first, fallback to desktop
    let gradesPath = GRADES_PATH;
    let res = await http.request("GET", gradesPath);
    mustBeOk(res, "GRADES");
    let page = res.body;

    let gradeSelect = findSelect(page, /smCrsLst/i) ?? findSelect(page, /course/i);
    let gradeCourses = gradeSelect ? selectOptions(page, gradeSelect.name).filter(o => o.value !== "" && o.value !== "0") : [];

    if (!gradeCourses.length && !gradeSelect && !/smCrsLst|midDg/i.test(page)) {
      try {
        const deskRes = await http.request("GET", GRADES_DESKTOP_PATH);
        if (deskRes.status === 200 && (parseGradeCourses(deskRes.body).length || findSelect(deskRes.body, /smCrsLst|course/i))) {
          res = deskRes;
          page = deskRes.body;
          gradesPath = GRADES_DESKTOP_PATH;
          gradeSelect = findSelect(page, /smCrsLst/i) ?? findSelect(page, /course/i);
          gradeCourses = gradeSelect ? selectOptions(page, gradeSelect.name).filter(o => o.value !== "" && o.value !== "0") : [];
        }
      } catch {
        // keep mobile page
      }
    }

    const pageTitle = page.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";
    const isGradesLike = /smCrsLst|midDg|grade|marks/i.test(page) || /grade/i.test(pageTitle);
    if (!gradeCourses.length && !isGradesLike && !gradeSelect) {
      throw new Error(`PORTAL_PAGE_CHANGED_GRADES: "${pageTitle || 'unknown'}"`);
    }

    const grades: GradeItem[] = [...parseMidterms(page)];
    const gradeTarget = gradeSelect?.name ?? GRADE_SELECT;
    for (const course of gradeCourses) {
      res = await http.request("POST", gradesPath, postbackBody(page, gradeTarget, course.value));
      if (res.status !== 200) { warnings.push(`grades:${course.label}:${res.status}`); continue; }
      page = res.body;
      grades.push(...parseGradeItems(page, course));
    }

    // 3. Attendance
    res = await http.request("GET", ATTENDANCE_PATH);
    mustBeOk(res, "ATTENDANCE");
    page = res.body;

    const attSelect = findSelect(page, /DDL_Courses/i) ?? findSelect(page, /course/i);
    const attendanceCourses = attSelect ? selectOptions(page, attSelect.name).filter(o => o.value !== "0" && o.value !== "") : parseAttendanceCourses(page);
    const attTitle = page.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";
    if (!attendanceCourses.length && !/DDL_Courses|attendance/i.test(page) && !attSelect) {
      throw new Error(`PORTAL_PAGE_CHANGED_ATTENDANCE: "${attTitle || 'unknown'}"`);
    }

    let absenceLevels = parseAbsenceLevels(page);
    const attendance: AttendanceRow[] = [];
    const attTarget = attSelect?.name ?? ATTENDANCE_SELECT;
    for (const course of attendanceCourses) {
      res = await http.request("POST", ATTENDANCE_PATH, postbackBody(page, attTarget, course.value));
      if (res.status !== 200) { warnings.push(`attendance:${course.label}:${res.status}`); continue; }
      page = res.body;
      attendance.push(...parseAttendanceRows(page, course));
      const levels = parseAbsenceLevels(page);
      if (levels.length) absenceLevels = levels;
    }

    // 4. Exam seats
    let examSeats: ExamSeat[] = [];
    try {
      const examRes = await http.request("GET", EXAM_SEATS_PATH);
      if (examRes.status === 200) {
        examSeats = parseExamSeats(examRes.body);
      } else {
        warnings.push(`examSeats:${examRes.status}`);
      }
    } catch (e) {
      warnings.push(`examSeats:${e instanceof Error ? e.message : String(e)}`);
    }

    return { grades, attendance, absenceLevels, examSeats, gradeCourses: gradeCourses.length, attendanceCourses: attendanceCourses.length, warnings };
  } finally {
    http.close();
  }
};
