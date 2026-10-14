import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Copy, Check, X, ClipboardPaste, ChevronLeft, Download } from 'lucide-react';
import { ExtractedScheduleItem, ScheduleEvent, EventType, ScheduleProfile } from '../types';
import Sheet from './Sheet';
import { getPortalSchedule } from '../services/portal';

interface SmartImportModalProps {
  onClose: () => void;
  onImport: (events: (Partial<ScheduleEvent> & { period_number?: number })[], importMode: 'full' | 'slots-only', targetProfileId: string, addToCourses: boolean) => void;
  profiles: ScheduleProfile[];
  activeProfileId: string;
}

const WEEKLY_PROMPT = `I am sending you an image of my university schedule. Please extract all the courses and their details into a valid JSON array. Each object in the array should follow this structure:
[
  {
    "day": "Monday",
    "period_number": 1,
    "time_start": "08:30",
    "time_end": "10:00",
    "course_name": "Course Name",
    "course_code": "CODE123",
    "room": "Room 101",
    "type": "lecture"
  }
]
Valid types: lecture, tutorial, lab, quiz, assignment, exam, study, other.
Return ONLY the JSON array.`;

const EXAM_PROMPT = `I am sending you an image of my exam schedule. Please extract all the exams and their details into a valid JSON array. Each object in the array should follow this structure:
[
  {
    "date": "2026-05-15",
    "day": "Friday",
    "time_start": "09:00",
    "time_end": "12:00",
    "course_name": "Information Security",
    "course_code": "INCS407",
    "room": "A3.228",
    "type": "exam"
  }
]
Return ONLY the JSON array. Ensure the date is in YYYY-MM-DD format.`;

const DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const field: React.CSSProperties = { background: 'var(--sheet-field)', border: '1px solid var(--line)' };
const muted: React.CSSProperties = { color: 'var(--text-muted)' };
const cta: React.CSSProperties = { background: 'var(--cta-bg)', color: 'var(--cta-ink)' };

const to24 = (t: string) => {
  const m = (t || '').match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!m) return t || '';
  let h = parseInt(m[1], 10);
  const ap = m[3]?.toUpperCase();
  if (ap === 'PM' && h < 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
};
const minutesBetween = (a: string, b: string) => {
  const [ah, am] = a.split(':').map(Number);
  const [bh, bm] = b.split(':').map(Number);
  const d = bh * 60 + bm - (ah * 60 + am);
  return isNaN(d) || d <= 0 ? 60 : d;
};
/** Accepts the whole AI reply: pulls out the [ ... ] part even with text or ``` around it. */
const parseReply = (text: string): ExtractedScheduleItem[] => {
  const a = text.indexOf('['), b = text.lastIndexOf(']');
  if (a === -1 || b <= a) throw new Error('no array');
  const arr = JSON.parse(text.slice(a, b + 1));
  if (!Array.isArray(arr) || !arr.length) throw new Error('empty');
  return arr.map((it: ExtractedScheduleItem) => ({ ...it, time_start: to24(it.time_start), time_end: to24(it.time_end) }));
};

const Step: React.FC<{ n: number; title: string; children?: React.ReactNode }> = ({ n, title, children }) => (
  <div className="flex gap-3">
    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-extrabold" style={cta}>{n}</span>
    <div className="min-w-0 flex-1">
      <div className="text-[15px] font-bold">{title}</div>
      {children}
    </div>
  </div>
);

const SmartImportModal: React.FC<SmartImportModalProps> = ({ onClose, onImport, profiles, activeProfileId }) => {
  const [kind, setKind] = useState<'weekly' | 'exam'>('weekly');
  const [reply, setReply] = useState('');
  const [items, setItems] = useState<ExtractedScheduleItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [profileId, setProfileId] = useState(activeProfileId);
  const [addToCourses, setAddToCourses] = useState(true);
  const [usePeriods, setUsePeriods] = useState(false);
  const [saving, setSaving] = useState(false);
  const [useAi, setUseAi] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  const prompt = kind === 'weekly' ? WEEKLY_PROMPT : EXAM_PROMPT;
  const noun = kind === 'weekly' ? 'class' : 'exam';

  const copyPrompt = async () => {
    try { await navigator.clipboard.writeText(prompt); } catch { setShowPrompt(true); return; }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const check = (text: string) => {
    setError(null);
    try { setItems(parseReply(text)); }
    catch { setError("That doesn't look right. Copy the AI's whole answer and paste it again."); }
  };

  const pasteFromClipboard = async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (t) { setReply(t); check(t); }
    } catch { /* clipboard blocked: they can paste in the box */ }
  };

  const fromPortal = async () => {
    setLoadingPortal(true);
    setPortalError(null);
    const res = await getPortalSchedule();
    setLoadingPortal(false);
    if (!res.ok) {
      setPortalError(res.code === 'NO_CREDENTIALS' ? 'Connect your portal in Settings first.' : (res.message || 'Could not read the portal.'));
    } else if (!res.classes?.length) {
      setPortalError('No classes found on your portal schedule.');
    } else {
      setKind('weekly');
      setItems(res.classes.map(c => ({ ...c, course_code: '' })));
    }
  };

  const update = (i: number, patch: Partial<ExtractedScheduleItem>) =>
    setItems(prev => prev && prev.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const removeItem = (i: number) => { setItems(prev => prev && prev.filter((_, j) => j !== i)); setEditing(null); };

  const finish = async () => {
    if (!items?.length) return;
    setSaving(true);
    setError(null);
    try {
      const events = items.map(it => ({
        title: it.course_name,
        code: it.course_code,
        location: it.room,
        type: (it.type?.toLowerCase() as EventType) || (kind === 'exam' ? 'exam' : 'lecture'),
        group: it.group,
        dayOfWeek: it.day,
        date: it.date,
        startTime: it.time_start,
        durationMinutes: minutesBetween(it.time_start, it.time_end),
        isRecurring: kind === 'weekly',
        period_number: it.period_number,
      }));
      await onImport(events, kind === 'weekly' && usePeriods ? 'slots-only' : 'full', profileId, addToCourses);
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Something went wrong. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const shortDay = (d?: string) => (d || '').slice(0, 3);

  return (
    <Sheet open onClose={onClose} size="tall">
      {/* top bar */}
      <div className="flex shrink-0 items-center justify-between px-4 pb-2.5">
        <button onClick={items ? () => { setItems(null); setEditing(null); } : onClose}
          className="flex min-w-[64px] items-center border-0 bg-transparent p-1 text-[16px] font-semibold" style={muted}>
          {items ? <><ChevronLeft size={18} /> Back</> : 'Cancel'}
        </button>
        <span className="text-[17px] font-extrabold">Import classes</span>
        <span className="min-w-[64px]" />
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-10">
        <AnimatePresence mode="wait" initial={false}>
          {!items ? (
            <motion.div key="steps" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
              {/* from the portal: one tap */}
              <div className="mt-2 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}>
                  <Download size={26} />
                </div>
                <div className="mt-4 text-[22px] font-extrabold">Import from portal</div>
                <p className="mt-1 text-[14px]" style={muted}>Reads your weekly schedule. Periods 6 and 7 are skipped.</p>
                <button onClick={fromPortal} disabled={loadingPortal}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border-0 py-3.5 text-[16px] font-extrabold disabled:opacity-60" style={cta}>
                  {loadingPortal ? <><Loader2 size={18} className="animate-spin" /> Reading…</> : 'Import my classes'}
                </button>
                {portalError && <p className="mt-2 text-[13px] font-semibold" style={{ color: 'var(--danger)' }}>{portalError}</p>}
                <button onClick={() => setUseAi(v => !v)} className="mt-3 border-0 bg-transparent p-1 text-[13px] font-semibold" style={muted}>
                  {useAi ? 'Hide AI import' : 'Use AI instead (photo or exams)'}
                </button>
              </div>

              {useAi && (
                <div className="mt-4 border-t pt-2" style={{ borderColor: 'var(--line)' }}>
              <div className="mt-1 flex rounded-2xl p-1" style={field}>
                {(['weekly', 'exam'] as const).map(k => (
                  <button key={k} onClick={() => { setKind(k); setError(null); }}
                    className="flex-1 rounded-xl border-0 py-2.5 text-[14px] font-bold transition-colors"
                    style={kind === k ? cta : { background: 'transparent', color: 'var(--text-muted)' }}>
                    {k === 'weekly' ? 'Weekly classes' : 'Exams'}
                  </button>
                ))}
              </div>

              <div className="mt-6 space-y-6">
                <Step n={1} title="Copy the prompt">
                  <button onClick={copyPrompt} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border-0 py-3 text-[15px] font-bold" style={cta}>
                    {copied ? <><Check size={17} /> Copied</> : <><Copy size={17} /> Copy prompt</>}
                  </button>
                  <button onClick={() => setShowPrompt(v => !v)} className="mt-1.5 border-0 bg-transparent p-0 text-[12px] font-semibold" style={muted}>
                    {showPrompt ? 'Hide prompt' : 'See prompt'}
                  </button>
                  {showPrompt && (
                    <pre className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-xl p-3 text-[11px] select-all" style={{ ...field, ...muted }}>{prompt}</pre>
                  )}
                </Step>

                <Step n={2} title="Send it to an AI">
                  <p className="mt-0.5 text-[13px] leading-snug" style={muted}>
                    Open ChatGPT, Gemini or Claude. Paste the prompt and add a screenshot of your {kind === 'weekly' ? 'schedule' : 'exam schedule'}.
                  </p>
                </Step>

                <Step n={3} title="Paste the answer here">
                  <button onClick={pasteFromClipboard} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[15px] font-bold" style={{ ...field, color: 'var(--text-primary)' }}>
                    <ClipboardPaste size={17} /> Paste answer
                  </button>
                  <textarea
                    value={reply}
                    onChange={e => { setReply(e.target.value); setError(null); }}
                    placeholder="…or paste it in here"
                    className="mt-2 h-24 w-full resize-none rounded-xl p-3 font-mono text-[12px] outline-none"
                    style={{ ...field, color: 'var(--text-primary)' }}
                  />
                  {error && <p className="mt-1.5 text-[13px] font-semibold" style={{ color: 'var(--danger)' }}>{error}</p>}
                  {reply.trim() && (
                    <button onClick={() => check(reply)} className="mt-2 w-full rounded-xl border-0 py-3 text-[15px] font-bold" style={cta}>Next</button>
                  )}
                </Step>
              </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="review" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.2 }}>
              <div className="mt-1 text-[22px] font-extrabold">Found {items.length} {items.length === 1 ? noun : noun === 'class' ? 'classes' : 'exams'}</div>
              <p className="text-[13px]" style={muted}>Tap one to fix it. Tap ✕ to remove it.</p>

              <div className="mt-3 overflow-hidden rounded-2xl" style={field}>
                {items.map((it, i) => (
                  <div key={i} style={{ borderTop: i ? '1px solid var(--line)' : undefined }}>
                    <div className="flex items-center gap-2 px-3.5 py-3">
                      <button onClick={() => setEditing(editing === i ? null : i)} className="min-w-0 flex-1 border-0 bg-transparent p-0 text-left" style={{ color: 'var(--text-primary)' }}>
                        <div className="truncate text-[15px] font-bold">{it.course_name || 'Untitled'}</div>
                        <div className="truncate text-[12px]" style={muted}>
                          {kind === 'exam' ? it.date : shortDay(it.day)} · {it.time_start}–{it.time_end}{it.room ? ` · ${it.room}` : ''}
                        </div>
                      </button>
                      <button onClick={() => removeItem(i)} aria-label="Remove" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-0" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                        <X size={15} />
                      </button>
                    </div>
                    <AnimatePresence initial={false}>
                      {editing === i && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="grid grid-cols-2 gap-2 px-3.5 pb-3 text-[14px]">
                            <input className="col-span-2 rounded-lg px-3 py-2 outline-none" style={{ ...field, color: 'var(--text-primary)' }} value={it.course_name || ''} placeholder="Name" onChange={e => update(i, { course_name: e.target.value })} />
                            {kind === 'exam'
                              ? <input type="date" className="rounded-lg px-3 py-2 outline-none" style={{ ...field, color: 'var(--text-primary)' }} value={it.date || ''} onChange={e => update(i, { date: e.target.value })} />
                              : <select className="rounded-lg px-3 py-2 outline-none" style={{ ...field, color: 'var(--text-primary)' }} value={it.day} onChange={e => update(i, { day: e.target.value })}>
                                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>}
                            <input className="rounded-lg px-3 py-2 outline-none" style={{ ...field, color: 'var(--text-primary)' }} value={it.room || ''} placeholder="Room" onChange={e => update(i, { room: e.target.value })} />
                            <input type="time" className="rounded-lg px-3 py-2 outline-none" style={{ ...field, color: 'var(--text-primary)' }} value={it.time_start} onChange={e => update(i, { time_start: e.target.value })} />
                            <input type="time" className="rounded-lg px-3 py-2 outline-none" style={{ ...field, color: 'var(--text-primary)' }} value={it.time_end} onChange={e => update(i, { time_end: e.target.value })} />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>

              {/* options */}
              <div className="mt-4 overflow-hidden rounded-2xl text-[14px] font-semibold" style={field}>
                {profiles.length > 1 && (
                  <label className="flex items-center justify-between gap-3 px-3.5 py-3">
                    Add to
                    <select value={profileId} onChange={e => setProfileId(e.target.value)} className="border-0 bg-transparent text-right outline-none" style={{ color: 'var(--text-primary)' }}>
                      {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </label>
                )}
                <Toggle label="Also add courses to Grades" on={addToCourses} onChange={setAddToCourses} top={profiles.length > 1} />
                {kind === 'weekly' && <Toggle label="Use my slot times" on={usePeriods} onChange={setUsePeriods} top />}
              </div>

              {error && <p className="mt-3 text-center text-[13px] font-semibold" style={{ color: 'var(--danger)' }}>{error}</p>}

              <button onClick={finish} disabled={saving || !items.length}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-0 py-3.5 text-[16px] font-extrabold disabled:opacity-40" style={cta}>
                {saving ? <Loader2 size={18} className="animate-spin" /> : `Add ${items.length} to my ${kind === 'weekly' ? 'schedule' : 'exams'}`}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Sheet>
  );
};

const Toggle: React.FC<{ label: string; on: boolean; onChange: (v: boolean) => void; top?: boolean }> = ({ label, on, onChange, top }) => (
  <div className="flex items-center justify-between gap-3 px-3.5 py-3" style={{ borderTop: top ? '1px solid var(--line)' : undefined }}>
    <span>{label}</span>
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className="relative h-[30px] w-[50px] shrink-0 rounded-full border-0 p-0 transition-colors duration-200"
      style={{ background: on ? 'var(--cta-bg)' : 'var(--surface-2)' }}>
      <motion.span className="absolute top-[3px] left-[3px] h-6 w-6 rounded-full bg-white" style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.25)' }}
        animate={{ x: on ? 20 : 0 }} transition={{ type: 'spring', stiffness: 520, damping: 32 }} />
    </button>
  </div>
);

export default SmartImportModal;
