// Reads the CMS for one student and saves courses and files.
// How to sign in to the CMS lives in cms-session.ts; this file only needs a session
// that can fetch a page and a file.

import { type CmsSeason, parseCourseList, parseCourseView } from "./cms.ts";

export interface CmsSession {
  /** Page HTML for a path like "/apps/student/ViewAllCourseStn.aspx". */
  get(path: string): Promise<string>;
  /** A file under /Uploads/ for the student. */
  getFile(path: string): Promise<{ body: ReadableStream<Uint8Array> | Uint8Array; contentType: string }>;
}

export const COURSE_LIST_PATH = "/apps/student/ViewAllCourseStn.aspx";
export const courseViewPath = (id: number, sid: number) => `/apps/student/CourseViewStn.aspx?id=${id}&sid=${sid}`;

export interface CmsAlert { title: string; body: string; tag: string }

export interface CmsSyncResult {
  files: number;
  newFiles: number;
  alerts: CmsAlert[];
}

// deno-lint-ignore no-explicit-any
type Db = any;

/** Only the current season is read (the app shows nothing older). */
const currentSeasons = (seasons: CmsSeason[]): CmsSeason[] => {
  const current = seasons.filter((s) => s.current);
  return current.length ? current : seasons.slice(0, 1);
};

export const runCmsSync = async (db: Db, userId: string, session: CmsSession): Promise<CmsSyncResult> => {
  const now = new Date().toISOString();
  const seasons = parseCourseList(await session.get(COURSE_LIST_PATH));
  if (!seasons.length) throw new Error("PORTAL_PAGE_CHANGED_CMS");

  // courses of every season (the list is the whole truth for what exists)
  const courseRows = seasons.flatMap((s) =>
    s.courses.map((c) => ({
      user_id: userId, course_id: c.id, season_id: s.id, season_title: s.title,
      is_current: s.current, code: c.code, name: c.name, updated_at: now,
    }))
  );
  if (courseRows.length) {
    const { error } = await db.from("cms_courses").upsert(courseRows, { onConflict: "user_id,course_id,season_id" });
    if (error) throw new Error(`DB_WRITE_FAILED (cms_courses: ${error.message})`);
  }

  // files already saved: tells us what is new, and which seasons were already read
  const { data: existing, error: readErr } = await db.from("cms_files").select("content_id").eq("user_id", userId);
  if (readErr) throw new Error(`DB_READ_FAILED: ${readErr.message}`);
  const known = new Set<number>((existing ?? []).map((r: { content_id: number }) => r.content_id));
  const firstSync = known.size === 0;

  const alerts: CmsAlert[] = [];
  let total = 0;
  let newFiles = 0;

  const readCourse = async (season: CmsSeason, course: CmsSeason["courses"][number], isCurrent: boolean) => {
    const weeks = parseCourseView(await session.get(courseViewPath(course.id, season.id)));
    const freshRows = [];  // files never seen before
    const oldRows = [];    // files already saved: refreshed, never re-flagged as new
    for (const w of weeks) {
      for (const f of w.files) {
        const isNew = !known.has(f.contentId);
        const base = {
          user_id: userId, course_id: course.id, season_id: season.id, content_id: f.contentId,
          week_date: w.date, week_desc: w.description, position: f.position,
          title: f.title, file_type: f.type, path: f.path, updated_at: now,
        };
        if (isNew) {
          // files found on the very first read, and files of older seasons, are old news
          const flag = isCurrent && !firstSync;
          freshRows.push({ ...base, is_new: flag, first_seen_at: now });
          if (flag) {
            newFiles++;
            alerts.push({ title: "New on the CMS", body: `${course.name} · ${f.title}`, tag: "page_facing_up" });
          }
        } else {
          oldRows.push(base);
        }
        total++;
      }
    }
    for (const rows of [freshRows, oldRows]) {
      if (!rows.length) continue;
      const { error } = await db.from("cms_files").upsert(rows, { onConflict: "user_id,content_id" });
      if (error) throw new Error(`DB_WRITE_FAILED (cms_files: ${error.message})`);
    }
  };

  const current = currentSeasons(seasons);
  for (const season of current) {
    for (const course of season.courses) await readCourse(season, course, true);
  }

  return { files: total, newFiles, alerts };
};
