import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Trash2, Pencil } from 'lucide-react';
import { ScheduleEvent, EventColorMap, PeriodDefinition } from '../types';
import Sheet, { riseItem, riseParent } from './Sheet';

interface EventDetailsModalProps {
  event: ScheduleEvent | null;
  onClose: () => void;
  /** Kept so existing callers still compile; the Study button was removed. */
  onStudyNow?: (event: ScheduleEvent) => void;
  onDelete: (id: string) => void;
  onEdit: (event: ScheduleEvent) => void;
  eventColors: EventColorMap;
  periods?: PeriodDefinition[];
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const to12h = (t?: string) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

const addMinutes = (t: string, mins: number) => {
  const [h, m] = t.split(':').map(Number);
  const total = (h * 60 + m + mins) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

/** "8:30 – 10:00 AM", or "11:30 AM – 1:00 PM" when the half of day changes. */
const timeRange = (start: string, mins: number) => {
  const a = to12h(start), b = to12h(addMinutes(start, mins));
  return a.slice(-2) === b.slice(-2) ? `${a.slice(0, -3)} – ${b}` : `${a} – ${b}`;
};

const fmtDuration = (mins: number) =>
  mins >= 60 ? `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ''}` : `${mins} min`;

/** When this class next happens, relative to now: { text, live }. */
const whenNext = (e: ScheduleEvent, now = new Date()): { text: string; live: boolean; past: boolean } => {
  if (!e.startTime) return { text: '', live: false, past: false };
  const [h, m] = e.startTime.split(':').map(Number);
  let start: Date;
  if (e.isRecurring) {
    const target = DAYS.indexOf(e.dayOfWeek || '');
    if (target < 0) return { text: '', live: false, past: false };
    start = new Date(now);
    start.setHours(h, m, 0, 0);
    let diff = (target - now.getDay() + 7) % 7;
    const end = new Date(start.getTime() + e.durationMinutes * 60000);
    if (diff === 0 && now >= end) diff = 7;
    start.setDate(start.getDate() + diff);
  } else {
    if (!e.date) return { text: '', live: false, past: false };
    const [y, mo, d] = e.date.split('-').map(Number);
    start = new Date(y, mo - 1, d, h, m);
  }
  const end = new Date(start.getTime() + e.durationMinutes * 60000);
  if (now >= start && now < end) return { text: 'Happening now', live: true, past: false };
  if (now >= end) {
    const days = Math.floor((now.getTime() - end.getTime()) / 86400000);
    return { text: days < 1 ? 'Earlier today' : days === 1 ? 'Yesterday' : `${days} days ago`, live: false, past: true };
  }
  const mins = Math.round((start.getTime() - now.getTime()) / 60000);
  const startDay = new Date(start); startDay.setHours(0, 0, 0, 0);
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const dayDiff = Math.round((startDay.getTime() - today.getTime()) / 86400000);
  let text: string;
  if (mins < 60) text = `in ${mins} min`;
  else if (dayDiff === 0) text = `in ${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ''}`;
  else if (dayDiff === 1) text = 'Tomorrow';
  else text = `in ${dayDiff} days`;
  return { text, live: false, past: false };
};

const fmtDate = (iso?: string) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
};

const tileStyle: React.CSSProperties = { background: 'var(--sheet-field)', border: '1px solid var(--line)' };
const label = 'text-[10.5px] font-extrabold uppercase tracking-[0.08em]';

const EventDetailsModal: React.FC<EventDetailsModalProps> = ({ event, onClose, onDelete, onEdit, eventColors, periods = [] }) => {
  // keep the last event while the sheet slides away
  const [shown, setShown] = useState<ScheduleEvent | null>(event);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    if (event) setShown(event);
    setConfirmDelete(false);
  }, [event]);

  const e = event ?? shown;
  const color = e ? eventColors[e.type] || '#71717a' : '#71717a';
  const slot = e ? periods.find(p => !p.isBreak && p.startTime === e.startTime)?.label : undefined;
  const when = e ? whenNext(e) : null;

  return (
    <Sheet open={!!event} onClose={onClose}>
      {e && (
        <motion.div
          className="overflow-y-auto px-5 pb-6"
          variants={riseParent}
          initial="hidden"
          animate="show"
          key={e.id}
        >
          <motion.div variants={riseItem} className="flex items-center justify-between">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-extrabold uppercase tracking-[0.08em]"
              style={{ background: `color-mix(in srgb, ${color} 18%, transparent)`, color: `color-mix(in srgb, ${color} 70%, var(--text-primary))` }}
            >
              <span className="h-[7px] w-[7px] rounded-full" style={{ background: color }} />
              {e.type}
            </span>
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={onClose}
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-full border-0"
              style={{ ...tileStyle, color: 'var(--text-primary)' }}
            >
              <X size={17} strokeWidth={2.6} />
            </motion.button>
          </motion.div>

          <motion.h2 variants={riseItem} className="mt-3 mb-0 font-extrabold" style={{ fontSize: '1.7rem', lineHeight: 1.12, letterSpacing: '-0.02em' }}>
            {e.title}
          </motion.h2>
          {(e.code || e.group) && (
            <motion.div variants={riseItem} className="mt-1.5 text-[0.88rem] font-bold" style={{ color: 'var(--text-muted)' }}>
              {[e.code, e.group && `Group ${e.group}`].filter(Boolean).join(' · ')}
            </motion.div>
          )}

          <motion.div variants={riseItem} className="mt-5">
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <span className="font-extrabold" style={{ fontSize: '1.4rem', letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums' }}>
                {timeRange(e.startTime, e.durationMinutes)}
              </span>
              {when?.text && (
                <span className="text-[0.82rem] font-extrabold" style={{ color: when.live ? 'var(--hero-live)' : when.past ? 'var(--text-muted)' : 'var(--hero-progress)' }}>
                  {when.text}
                </span>
              )}
            </div>
            <div className="mt-0.5 text-[0.88rem] font-bold" style={{ color: 'var(--text-muted)' }}>
              {e.isRecurring ? `Every ${e.dayOfWeek}` : fmtDate(e.date)}
            </div>
          </motion.div>

          <motion.div variants={riseItem} className="mt-4 grid gap-2" style={{ gridTemplateColumns: slot ? '1.35fr 1fr 1fr' : '1.35fr 1fr' }}>
            <div
              className="rounded-2xl px-3 py-2.5 min-w-0"
              style={e.location
                ? { background: 'color-mix(in srgb, var(--hero-progress) 11%, transparent)', border: '1px solid color-mix(in srgb, var(--hero-progress) 38%, transparent)' }
                : tileStyle}
            >
              <div className={label} style={{ color: e.location ? 'var(--hero-progress)' : 'var(--text-muted)' }}>Room</div>
              <div className="mt-0.5 truncate font-extrabold" style={{ fontSize: e.location ? '1.3rem' : '1rem', color: e.location ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {e.location || 'Not set'}
              </div>
            </div>
            <div className="rounded-2xl px-3 py-2.5" style={tileStyle}>
              <div className={label} style={{ color: 'var(--text-muted)' }}>Length</div>
              <div className="mt-0.5 text-[1.05rem] font-extrabold">{fmtDuration(e.durationMinutes)}</div>
            </div>
            {slot && (
              <div className="rounded-2xl px-3 py-2.5" style={tileStyle}>
                <div className={label} style={{ color: 'var(--text-muted)' }}>Slot</div>
                <div className="mt-0.5 text-[1.05rem] font-extrabold">{slot}</div>
              </div>
            )}
          </motion.div>

          <motion.button
            variants={riseItem}
            whileTap={{ scale: 0.98 }}
            onClick={() => onEdit(e)}
            className="mt-2 block w-full rounded-2xl px-3.5 py-3 text-left"
            style={{ ...tileStyle, color: 'var(--text-primary)' }}
          >
            <div className={label} style={{ color: 'var(--text-muted)' }}>Notes</div>
            <div className="mt-1 whitespace-pre-wrap text-[0.92rem] font-semibold leading-snug" style={{ color: e.description ? 'var(--text-primary)' : 'var(--text-muted)', opacity: e.description ? 1 : 0.75 }}>
              {e.description || 'Tap to add a note'}
            </div>
          </motion.button>

          <motion.div variants={riseItem} className="mt-5">
            <AnimatePresence mode="wait" initial={false}>
              {confirmDelete ? (
                <motion.div
                  key="confirm"
                  className="flex gap-2.5"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.16 }}
                >
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setConfirmDelete(false)}
                    className="h-[52px] flex-1 rounded-2xl text-[1rem] font-extrabold"
                    style={{ ...tileStyle, color: 'var(--text-primary)' }}
                  >
                    Keep it
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { onDelete(e.id); onClose(); }}
                    className="h-[52px] flex-1 rounded-2xl border-0 text-[1rem] font-extrabold text-white"
                    style={{ background: 'var(--danger)' }}
                  >
                    Delete class
                  </motion.button>
                </motion.div>
              ) : (
                <motion.div
                  key="actions"
                  className="flex gap-2.5"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.16 }}
                >
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setConfirmDelete(true)}
                    aria-label="Delete class"
                    className="flex h-[52px] w-[56px] shrink-0 items-center justify-center rounded-2xl"
                    style={{ background: 'color-mix(in srgb, var(--danger) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 32%, transparent)', color: 'var(--danger)' }}
                  >
                    <Trash2 size={19} />
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onEdit(e)}
                    className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl border-0 text-[1rem] font-extrabold"
                    style={{ background: 'var(--cta-bg)', color: 'var(--cta-ink)' }}
                  >
                    <Pencil size={17} strokeWidth={2.5} /> Edit class
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </Sheet>
  );
};

export default EventDetailsModal;
