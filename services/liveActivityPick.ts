import type { ScheduleEvent } from '../types';
import type { ProjectsData } from './projects';
import { courseNameOf } from './notifications';

// Decides what the Dynamic Island / lock screen countdown should show right now (or nothing).
//  - class: from 60 min before it starts, then until it ends
//  - exam: from 3 hours before it starts, then until it ends
//  - project deadline: only in the last 24 hours before it is due, unless it is already submitted

export interface LivePayload {
  key: string;            // changes whenever the card should be replaced (event + phase)
  kind: 'class' | 'exam' | 'project';
  title: string;
  short: string;
  subtitle: string;
  label: string;          // "starts in" | "left" | "due in"
  done: string;           // shown after the countdown hits zero
  beginMs: number;        // countdown range, stable between calls so nothing needs re-sending
  targetMs: number;
}

const MIN = 60_000;
const HOUR = 3_600_000;
const CLASS_LEAD = 60 * MIN;
const EXAM_LEAD = 3 * HOUR;
const PROJECT_WINDOW = 24 * HOUR;
const CLASS_TYPES = new Set(['lecture', 'tutorial', 'lab', 'quiz']);
const PRIORITY = { exam: 0, project: 1, class: 2 } as const;

const to12h = (d: Date): string => {
  const h = d.getHours();
  return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

const dayISO = (d: Date): string => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const eventCandidate = (e: ScheduleEvent, now: Date): LivePayload | null => {
  const isExam = e.type === 'exam';
  if (!isExam && !CLASS_TYPES.has(e.type)) return null;
  if (!e.startTime || !/^\d{1,2}:\d{2}$/.test(e.startTime)) return null;

  const today = dayISO(now);
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });
  const happensToday = e.isRecurring ? e.dayOfWeek === weekday : e.date === today;
  if (!happensToday) return null;

  const [h, m] = e.startTime.split(':').map(Number);
  const start = new Date(now);
  start.setHours(h, m, 0, 0);
  const minutes = e.durationMinutes > 0 ? e.durationMinutes : 60;
  const end = new Date(start.getTime() + minutes * MIN);
  const lead = isExam ? EXAM_LEAD : CLASS_LEAD;

  const t = now.getTime();
  if (t < start.getTime() - lead || t >= end.getTime()) return null;

  const before = t < start.getTime();
  const kind = isExam ? 'exam' : 'class';
  const name = courseNameOf(e.title);
  const code = (e.code || '').trim();
  const typeWord = isExam ? 'Exam' : cap(e.type);
  const where = (e.location || '').trim();

  return {
    key: `${kind}:${e.id}:${today}:${before ? 'pre' : 'run'}`,
    kind,
    title: name,
    short: `${code || name} · ${typeWord}`,
    subtitle: [isExam ? '' : typeWord, where, before ? to12h(start) : `ends ${to12h(end)}`].filter(Boolean).join(' · '),
    label: before ? 'starts in' : 'left',
    done: before ? 'started' : 'ended',
    beginMs: before ? start.getTime() - lead : start.getTime(),
    targetMs: before ? start.getTime() : end.getTime(),
  };
};

const projectCandidates = (data: ProjectsData | null, now: Date): LivePayload[] => {
  if (!data) return [];
  const t = now.getTime();
  const out: LivePayload[] = [];
  for (const ms of data.milestones) {
    if (ms.hidden || ms.cancelled) continue;
    const project = data.projects.find(p => p.id === ms.project_id);
    if (!project || project.archived) continue;
    const progress = data.progress[ms.id];
    if (progress?.submitted) continue;
    const due = new Date(ms.due_at);
    const left = due.getTime() - t;
    if (!(left > 0 && left <= PROJECT_WINDOW)) continue;

    const tasks = progress?.tasks ?? [];
    const doneCount = tasks.filter(x => x.done).length;
    const when = dayISO(due) === dayISO(now) ? '' : ' tomorrow';
    out.push({
      key: `project:${ms.id}`,
      kind: 'project',
      title: `${project.title} · ${ms.title}`,
      short: `${project.course_code || project.title} · ${ms.title}`,
      subtitle: `Due${when} ${to12h(due)}${tasks.length ? ` · ${doneCount} of ${tasks.length} tasks` : ''}`,
      label: 'due in',
      done: 'overdue',
      beginMs: due.getTime() - PROJECT_WINDOW,
      targetMs: due.getTime(),
    });
  }
  return out;
};

/** The one thing worth showing right now: whichever runs out first (exam wins a tie). */
export const pickLive = (events: ScheduleEvent[], projects: ProjectsData | null, now: Date = new Date()): LivePayload | null => {
  const all: LivePayload[] = [];
  for (const e of events) {
    const c = eventCandidate(e, now);
    if (c) all.push(c);
  }
  all.push(...projectCandidates(projects, now));
  if (!all.length) return null;
  all.sort((a, b) => a.targetMs - b.targetMs || PRIORITY[a.kind] - PRIORITY[b.kind]);
  return all[0];
};
