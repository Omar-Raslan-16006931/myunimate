// Readers for the two GIU CMS pages the app needs. Pure functions (no network),
// so they can be tested against saved copies of the pages.
//
//  - ViewAllCourseStn   → every season and the courses in it
//  - CourseViewStn      → the weeks of one course and the files in each week

export interface CmsCourse {
  id: number;          // the number in the course link (?id=2620)
  seasonId: number;    // ?sid=70
  code: string;        // ICS504
  name: string;        // Machine Learning
}

export interface CmsSeason {
  id: number;
  title: string;       // Winter 2026
  current: boolean;
  courses: CmsCourse[];
}

export interface CmsFile {
  contentId: number;
  position: number;    // the "1 -" in front of the title
  title: string;
  type: string;        // Lecture slides, Assignment, ...
  path: string;        // /Uploads/70/2620/35780/GIU_....pdf
  seen: boolean;       // already opened on the CMS site
}

export interface CmsWeek {
  date: string;        // 2026-10-12
  description: string; // Week 6
  files: CmsFile[];
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export const decodeEntities = (s: string): string =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);

const text = (s: string): string => decodeEntities(s.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();

/** "2026-10-3" → "2026-10-03" */
export const padDate = (raw: string): string => {
  const m = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  return m ? `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}` : raw;
};

/** Seasons from the "all courses" page, highest season number first. */
export const parseCourseList = (html: string): CmsSeason[] => {
  const heads = [...html.matchAll(/Season\s*:\s*(\d+)\s*,\s*Title\s*:\s*([^<]*?)\s*<\/div>/gi)];
  const seasons: CmsSeason[] = [];
  heads.forEach((h, i) => {
    const start = h.index ?? 0;
    const end = i + 1 < heads.length ? (heads[i + 1].index ?? html.length) : html.length;
    const chunk = html.slice(start, end);
    const id = Number(h[1]);
    const courses: CmsCourse[] = [];
    const row = /<td>\s*\(\|([^|]*)\|\)\s*([\s\S]*?)\s*\((\d+)\)\s*<\/td>\s*<td>[^<]*<\/td>\s*<td>\s*(\d+)\s*<\/td>\s*<td>\s*(\d+)\s*<\/td>/g;
    for (const m of chunk.matchAll(row)) {
      courses.push({
        id: Number(m[4]),
        seasonId: Number(m[5]),
        code: decodeEntities(m[1]).trim(),
        name: text(m[2]),
      });
    }
    seasons.push({ id, title: text(h[2]), current: /Current Season/i.test(chunk), courses });
  });
  return seasons.sort((a, b) => b.id - a.id);
};

/** Weeks (newest first, as the site lists them) with their files. */
export const parseCourseView = (html: string): CmsWeek[] => {
  const parts = html.split(/<div class="card mb-5 weeksdata"/).slice(1);
  const weeks: CmsWeek[] = [];
  for (const part of parts) {
    const date = part.match(/Week\s*:\s*([\d-]+)/i)?.[1];
    if (!date) continue;
    const desc = part.match(/<strong>Description<\/strong>\s*<\/div>\s*<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? "";
    const files: CmsFile[] = [];
    const blocks = part.split(/<div id="content(?=\d)/).slice(1);
    for (const b of blocks) {
      const head = b.match(/^(\d+)">\s*<strong>\s*(\d+)\s*-\s*([\s\S]*?)<\/strong>\s*(?:\(([\s\S]*?)\))?\s*<\/div>/);
      if (!head) continue;
      const link = b.match(/<a\s+href=['"]([^'"]+)['"][^>]*id="download"[^>]*data-seen="(yes|no)"/i);
      if (!link) continue;
      files.push({
        contentId: Number(head[1]),
        position: Number(head[2]),
        title: text(head[3]),
        type: text(head[4] ?? ""),
        path: decodeEntities(link[1]),
        seen: link[2].toLowerCase() === "yes",
      });
    }
    weeks.push({ date: padDate(date), description: text(desc), files });
  }
  return weeks;
};
