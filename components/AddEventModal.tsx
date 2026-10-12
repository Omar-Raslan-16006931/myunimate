import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, ChevronDown } from 'lucide-react';
import { ScheduleEvent, EventColorMap, EventType, PeriodDefinition, CourseGrade } from '../types';
import { getLocalISOString } from '../constants';
import Sheet, { riseItem, riseParent } from './Sheet';

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: Partial<ScheduleEvent>, addToGrades?: boolean) => void;
  eventColors: EventColorMap;
  initialData: Partial<ScheduleEvent> | null;
  periods: PeriodDefinition[];
  courses?: CourseGrade[];
}

const WEEK = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const JS_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DEFAULTS: Partial<ScheduleEvent> = {
  isRecurring: false,
  type: 'lecture',
  durationMinutes: 90,
  startTime: '08:30',
  dayOfWeek: 'Saturday',
};

const to12h = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')}`;
};
const minsOf = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

// ── small building blocks ──
const field: React.CSSProperties = { background: 'var(--sheet-field)', border: '1px solid var(--line)' };
const sectionLabel = 'mb-1.5 mt-5 px-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em]';
// 16px+ text so iOS does not zoom in when a field is tapped
const inputBase = 'w-full min-w-0 bg-transparent border-0 outline-none text-[16px] font-semibold';

const Row: React.FC<{ label: string; children: React.ReactNode; first?: boolean }> = ({ label, children, first }) => (
  <div className="flex items-center gap-3 px-3.5 min-h-[50px]" style={first ? undefined : { borderTop: '1px solid var(--line)' }}>
    <span className="shrink-0 text-[15px] font-semibold" style={{ color: 'var(--text-muted)' }}>{label}</span>
    <div className="flex-1 min-w-0 flex justify-end">{children}</div>
  </div>
);

const Switch: React.FC<{ on: boolean; onChange: (v: boolean) => void; label: string }> = ({ on, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    onClick={() => onChange(!on)}
    className="relative h-[30px] w-[50px] shrink-0 rounded-full border-0 p-0 transition-colors duration-200"
    style={{ background: on ? 'var(--cta-bg)' : 'var(--surface-2)' }}
  >
    <motion.span
      className="absolute top-[3px] left-[3px] h-6 w-6 rounded-full bg-white"
      style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.25)' }}
      animate={{ x: on ? 20 : 0 }}
      transition={{ type: 'spring', stiffness: 520, damping: 32 }}
    />
  </button>
);

const AddEventModal: React.FC<AddEventModalProps> = ({ isOpen, onClose, onSave, eventColors, initialData, periods, courses = [] }) => {
  const [formData, setFormData] = useState<Partial<ScheduleEvent>>({ ...DEFAULTS, date: getLocalISOString() });
  const [timeMode, setTimeMode] = useState<'time' | 'slot'>('slot');
  const [showCoursePicker, setShowCoursePicker] = useState(false);
  const [addToGrades, setAddToGrades] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const slots = periods.filter(p => !p.isBreak);

  useEffect(() => {
    if (!isOpen) return;
    const next = initialData
      ? { ...DEFAULTS, ...initialData, dayOfWeek: initialData.dayOfWeek || 'Saturday', date: initialData.date || getLocalISOString() }
      : { ...DEFAULTS, date: getLocalISOString() };
    setFormData(next);
    const onSlot = slots.some(p => p.startTime === next.startTime);
    setTimeMode(onSlot || !initialData ? 'slot' : 'time');
    setAddToGrades(false);
    setShowCoursePicker(false);
    setSaveError(null);
  }, [initialData, isOpen]);

  const set = (patch: Partial<ScheduleEvent>) => setFormData(prev => ({ ...prev, ...patch }));
  const isEdit = !!formData.id;
  const canSave = !!formData.title?.trim() && !isSaving;

  const pickSlot = (p: PeriodDefinition) => set({ startTime: p.startTime, durationMinutes: minsOf(p.endTime) - minsOf(p.startTime) });

  const setDate = (iso: string) => {
    let day = formData.dayOfWeek;
    if (iso) {
      const [y, m, d] = iso.split('-').map(Number);
      day = JS_DAYS[new Date(y, m - 1, d).getDay()];
    }
    set({ date: iso, dayOfWeek: day });
  };

  const setTitle = (val: string) => {
    const match = courses.find(c => c.title === val);
    set({ title: val, ...(match ? { code: match.code } : {}) });
  };

  const save = async () => {
    if (!canSave) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await onSave(formData, addToGrades);
    } catch (err: any) {
      setSaveError(err?.message || 'Could not save. Try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const types = Object.keys(eventColors) as EventType[];

  return (
    <Sheet open={isOpen} onClose={onClose} size="tall">
      {/* top bar */}
      <div className="flex shrink-0 items-center justify-between px-4 pb-2.5">
        <button onClick={onClose} className="min-w-[64px] border-0 bg-transparent p-1 text-left text-[16px] font-semibold" style={{ color: 'var(--text-muted)' }}>
          Cancel
        </button>
        <span className="text-[17px] font-extrabold">{isEdit ? 'Edit class' : 'New class'}</span>
        <motion.button
          whileTap={canSave ? { scale: 0.92 } : undefined}
          onClick={save}
          disabled={!canSave}
          className="flex min-w-[64px] justify-end border-0 bg-transparent p-1 text-[16px] font-extrabold disabled:opacity-35"
          style={{ color: 'var(--hero-progress)' }}
        >
          {isSaving ? <Loader2 size={19} className="animate-spin" /> : 'Save'}
        </motion.button>
      </div>

      <motion.div
        className="flex-1 overflow-y-auto overscroll-contain px-4 pb-10"
        variants={riseParent}
        initial="hidden"
        animate="show"
      >
        {/* name */}
        <motion.div variants={riseItem}>
          <div className={`${sectionLabel} flex items-center justify-between`} style={{ color: 'var(--text-muted)' }}>
            <span>Class</span>
            {courses.length > 0 && (
              <button
                onClick={() => setShowCoursePicker(v => !v)}
                className="flex items-center gap-1 border-0 bg-transparent p-0 text-[11px] font-extrabold uppercase tracking-[0.06em]"
                style={{ color: 'var(--hero-progress)' }}
              >
                My courses
                <motion.span animate={{ rotate: showCoursePicker ? 180 : 0 }} className="flex"><ChevronDown size={13} /></motion.span>
              </button>
            )}
          </div>
          <AnimatePresence initial={false}>
            {showCoursePicker && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <div className="mb-2 max-h-[200px] overflow-y-auto rounded-2xl" style={field}>
                  {courses.map((c, i) => (
                    <button
                      key={c.id ?? i}
                      onClick={() => { set({ title: c.title, code: c.code }); setShowCoursePicker(false); }}
                      className="flex w-full items-center justify-between gap-3 border-0 bg-transparent px-3.5 py-3 text-left"
                      style={{ borderTop: i ? '1px solid var(--line)' : undefined, color: 'var(--text-primary)' }}
                    >
                      <span className="truncate text-[15px] font-bold">{c.title}</span>
                      {c.code && <span className="shrink-0 text-[13px] font-bold" style={{ color: 'var(--text-muted)' }}>{c.code}</span>}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="overflow-hidden rounded-2xl" style={field}>
            <div className="px-3.5 py-3">
              <input
                list="course-suggestions"
                className={`${inputBase} text-[19px] font-extrabold`}
                style={{ color: 'var(--text-primary)' }}
                placeholder="Class name"
                maxLength={60}
                value={formData.title || ''}
                onChange={e => setTitle(e.target.value)}
              />
              <datalist id="course-suggestions">
                {courses.map((c, i) => <option key={i} value={c.title} />)}
              </datalist>
            </div>
            <Row label="Code">
              <input className={`${inputBase} text-right`} style={{ color: 'var(--text-primary)' }} maxLength={15} placeholder="CS101"
                value={formData.code || ''} onChange={e => set({ code: e.target.value })} />
            </Row>
            <Row label="Group">
              <input className={`${inputBase} text-right`} style={{ color: 'var(--text-primary)' }} maxLength={15} placeholder="A1"
                value={formData.group || ''} onChange={e => set({ group: e.target.value })} />
            </Row>
            {!isEdit && (
              <Row label="Add to my courses">
                <Switch on={addToGrades} onChange={setAddToGrades} label="Add to my courses" />
              </Row>
            )}
          </div>
        </motion.div>

        {/* type */}
        <motion.div variants={riseItem}>
          <div className={sectionLabel} style={{ color: 'var(--text-muted)' }}>Type</div>
          <div className="flex flex-wrap gap-2">
            {types.map(t => {
              const on = formData.type === t;
              const c = eventColors[t];
              return (
                <motion.button
                  key={t}
                  whileTap={{ scale: 0.93 }}
                  onClick={() => set({ type: t })}
                  className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[14px] font-bold capitalize transition-colors duration-150"
                  style={on
                    ? { background: `color-mix(in srgb, ${c} 22%, transparent)`, border: `1.5px solid ${c}`, color: 'var(--text-primary)' }
                    : { ...field, color: 'var(--text-muted)' }}
                >
                  <span className="h-[7px] w-[7px] rounded-full" style={{ background: c }} />
                  {t}
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* when */}
        <motion.div variants={riseItem}>
          <div className={sectionLabel} style={{ color: 'var(--text-muted)' }}>When</div>
          <div className="overflow-hidden rounded-2xl" style={field}>
            <Row label="Repeats weekly" first>
              <Switch on={!!formData.isRecurring} onChange={v => set({ isRecurring: v })} label="Repeats weekly" />
            </Row>
            <AnimatePresence initial={false} mode="wait">
              {formData.isRecurring ? (
                <motion.div key="days" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                  className="grid grid-cols-7 gap-1 px-2.5 py-2.5" style={{ borderTop: '1px solid var(--line)' }}>
                  {WEEK.map(d => {
                    const on = formData.dayOfWeek === d;
                    return (
                      <motion.button
                        key={d}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => set({ dayOfWeek: d })}
                        className="h-10 rounded-xl border-0 text-[13px] font-extrabold"
                        style={on ? { background: 'var(--cta-bg)', color: 'var(--cta-ink)' } : { background: 'transparent', color: 'var(--text-muted)' }}
                      >
                        {d.slice(0, 2)}
                      </motion.button>
                    );
                  })}
                </motion.div>
              ) : (
                <motion.div key="date" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  <Row label="Date">
                    <input type="date" className={`${inputBase} text-right`} style={{ color: 'var(--text-primary)', colorScheme: 'dark light' }}
                      value={formData.date || ''} onChange={e => setDate(e.target.value)} />
                  </Row>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* time */}
        <motion.div variants={riseItem}>
          <div className={`${sectionLabel} flex items-center justify-between`} style={{ color: 'var(--text-muted)' }}>
            <span>Time</span>
            {slots.length > 0 && (
              <button
                onClick={() => setTimeMode(m => (m === 'slot' ? 'time' : 'slot'))}
                className="border-0 bg-transparent p-0 text-[11px] font-extrabold uppercase tracking-[0.06em]"
                style={{ color: 'var(--hero-progress)' }}
              >
                {timeMode === 'slot' ? 'Custom time' : 'Use slots'}
              </button>
            )}
          </div>
          <AnimatePresence initial={false} mode="wait">
            {timeMode === 'slot' && slots.length > 0 ? (
              <motion.div key="slots" className="grid grid-cols-3 gap-2"
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.16 }}>
                {slots.map(p => {
                  const on = formData.startTime === p.startTime && formData.durationMinutes === minsOf(p.endTime) - minsOf(p.startTime);
                  return (
                    <motion.button
                      key={p.id}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => pickSlot(p)}
                      className="rounded-2xl px-3 py-2.5 text-left transition-colors duration-150"
                      style={on
                        ? { background: 'color-mix(in srgb, var(--hero-progress) 14%, transparent)', border: '1.5px solid var(--hero-progress)' }
                        : field}
                    >
                      <div className="text-[15px] font-extrabold" style={{ color: on ? 'var(--hero-progress)' : 'var(--text-primary)' }}>{p.label}</div>
                      <div className="text-[12px] font-semibold" style={{ color: 'var(--text-muted)' }}>{to12h(p.startTime)} – {to12h(p.endTime)}</div>
                    </motion.button>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div key="custom" className="overflow-hidden rounded-2xl" style={field}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.16 }}>
                <Row label="Starts" first>
                  <input type="time" className={`${inputBase} text-right`} style={{ color: 'var(--text-primary)', colorScheme: 'dark light' }}
                    value={formData.startTime || ''} onChange={e => set({ startTime: e.target.value })} />
                </Row>
                <Row label="Length (min)">
                  <input type="number" inputMode="numeric" min={5} step={5} className={`${inputBase} text-right`} style={{ color: 'var(--text-primary)' }}
                    value={formData.durationMinutes ?? ''} onChange={e => set({ durationMinutes: parseInt(e.target.value) || 0 })} />
                </Row>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* room + notes */}
        <motion.div variants={riseItem}>
          <div className={sectionLabel} style={{ color: 'var(--text-muted)' }}>Room & notes</div>
          <div className="overflow-hidden rounded-2xl" style={field}>
            <Row label="Room" first>
              <input className={`${inputBase} text-right`} style={{ color: 'var(--text-primary)' }} placeholder="e.g. C.309"
                value={formData.location || ''} onChange={e => set({ location: e.target.value })} />
            </Row>
            <div style={{ borderTop: '1px solid var(--line)' }}>
              <textarea
                className={`${inputBase} block resize-none px-3.5 py-3 leading-snug`}
                style={{ color: 'var(--text-primary)', minHeight: 96 }}
                placeholder="Notes"
                value={formData.description || ''}
                onChange={e => set({ description: e.target.value })}
              />
            </div>
          </div>
        </motion.div>

        <AnimatePresence>
          {saveError && (
            <motion.div
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mt-4 rounded-2xl px-3.5 py-2.5 text-center text-[14px] font-semibold"
              style={{ background: 'color-mix(in srgb, var(--danger) 12%, transparent)', color: 'var(--danger)' }}
            >
              {saveError}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </Sheet>
  );
};

export default AddEventModal;
