import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dumbbell, Calculator, Sparkles, Megaphone, X,
  CheckSquare, Plus, Brain, Save, Check, ChevronRight, Bell, BellOff, GraduationCap, UserCheck
} from 'lucide-react';
import { ScheduleEvent, EventColorMap, PeriodDefinition, Announcement } from '../types';
import { getLocalISOString } from '../constants';
import { styles } from '../theme';
import { toast } from 'react-hot-toast';
import { remindersEnabled, enableReminders, disableReminders, syncReminders, reminderSupport } from '../services/notifications';
import { getPortalSummary, PortalSummary } from '../services/portal';

interface DashboardProps {
  events: ScheduleEvent[];
  eventColors: EventColorMap;
  onNavigate: (view: any) => void;
  onEventClick: (event: ScheduleEvent) => void;
  onAddEventClick: () => void;
  onSmartImportClick: () => void;
  periods: PeriodDefinition[];
  announcement: Announcement | null;
  username?: string;
  onSync?: () => Promise<boolean>;
}

const EASE = [0.16, 1, 0.3, 1] as const;

export const Dashboard: React.FC<DashboardProps> = ({ events, onNavigate, onEventClick, onAddEventClick, onSmartImportClick, periods, announcement, username, onSync }) => {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [greeting, setGreeting] = useState('Good Morning');
  const [remindersOn, setRemindersOn] = useState(() => remindersEnabled());
  const [portal, setPortal] = useState<PortalSummary | null>(null);

  useEffect(() => {
    let alive = true;
    getPortalSummary().then(p => { if (alive) setPortal(p); });
    return () => { alive = false; };
  }, []);

  const toggleReminders = async () => {
    if (remindersOn) {
      await disableReminders();
      setRemindersOn(false);
      toast('Class reminders off');
      return;
    }
    const result = await enableReminders();
    if (result === 'granted') {
      setRemindersOn(true);
      await syncReminders(events);
      toast.success(reminderSupport() === 'native'
        ? 'Reminders on: 15 min before each class'
        : 'Reminders on while the app is open');
    } else if (result === 'denied') {
      toast.error('Notifications are blocked. Allow them in iOS Settings.');
    } else {
      toast.error('Notifications are not available here.');
    }
  };
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [dismissedAnnouncementId, setDismissedAnnouncementId] = useState(() => localStorage.getItem('dismissed_announcement_id'));
  const [quickNotes, setQuickNotes] = useState(() => localStorage.getItem('quick_notes') || '');

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setQuickNotes(val);
    localStorage.setItem('quick_notes', val);
  };

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const hours = now.getHours();
      if (hours >= 18) setGreeting('Good Evening');
      else if (hours >= 12) setGreeting('Good Afternoon');
      else setGreeting('Good Morning');
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
      setCurrentDate(now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }));
    };
    tick();
    const timer = setInterval(tick, 60000);
    return () => clearInterval(timer);
  }, []);

  const to12h = (time24: string) => {
    if (!time24) return '';
    const [h, m] = time24.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
  };

  const getEndTime = (start: string, duration: number) => {
    if (!start || typeof start !== 'string' || !start.includes(':')) return '00:00';
    try {
      const [h, m] = start.split(':').map(Number);
      if (isNaN(h) || isNaN(m)) return '00:00';
      const d = new Date();
      d.setHours(h, m, 0, 0);
      d.setMinutes(d.getMinutes() + (duration || 0));
      return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '00:00';
    }
  };

  const getSlotName = (startTime: string) => {
    if (!startTime || typeof startTime !== 'string' || !startTime.includes(':')) return '';
    const strictMatch = periods.find(p => p.startTime === startTime);
    if (strictMatch) return `${strictMatch.label}`;
    try {
      const [h, m] = startTime.split(':').map(Number);
      if (isNaN(h) || isNaN(m)) return '';
      const val = h + m / 60;
      const found = periods.find(p => {
        if (p.isBreak || !p.startVal) return false;
        return Math.abs(val - p.startVal) < 0.01;
      });
      return found ? `${found.label}` : '';
    } catch (e) {
      return '';
    }
  };

  const handleDismissAnnouncement = () => {
    if (announcement) {
      localStorage.setItem('dismissed_announcement_id', announcement.id);
      setDismissedAnnouncementId(announcement.id);
    }
  };

  const showAnnouncement = announcement && announcement.is_active && announcement.id !== dismissedAnnouncementId;

  const now = new Date();
  const todayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const todayStr = getLocalISOString();
  const currentTimeVal = now.getHours() + now.getMinutes() / 60;

  const todayEvents = events
    .filter(e => (e.isRecurring ? e.dayOfWeek === todayName : e.date === todayStr))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const currentEvent = todayEvents.find(e => {
    if (!e.startTime || typeof e.startTime !== 'string' || !e.startTime.includes(':')) return false;
    const [h, m] = e.startTime.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return false;
    const startVal = h + m / 60;
    const endVal = startVal + ((e.durationMinutes || 0) / 60);
    return currentTimeVal >= startVal && currentTimeVal < endVal;
  });

  const nextEvent = todayEvents.find(e => {
    if (!e.startTime || typeof e.startTime !== 'string' || !e.startTime.includes(':')) return false;
    const [h, m] = e.startTime.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return false;
    const startVal = h + m / 60;
    return startVal > currentTimeVal;
  });

  const mainCardEvent = currentEvent || nextEvent;
  const isHappeningNow = !!currentEvent;

  const upcomingDeadlines = events
    .filter(e => e.type === 'quiz' || e.type === 'assignment' || e.type === 'exam')
    .filter(e => {
      const eventDate = e.date || todayStr;
      if (eventDate > todayStr) return true;
      if (eventDate === todayStr && e.startTime > now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })) return true;
      return false;
    })
    .sort((a, b) => {
      const dateA = a.date || todayStr;
      const dateB = b.date || todayStr;
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return a.startTime.localeCompare(b.startTime);
    });

  const fadeUp = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE } },
  };

  // ── helpers for the redesigned home ──────────────────────────────────────
  const toVal = (t: string) => {
    const [h, m] = (t || '0:0').split(':').map(Number);
    return (h || 0) + (m || 0) / 60;
  };
  const fmtMins = (mins: number) => {
    const m = Math.max(1, Math.round(mins));
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60), r = m % 60;
    return r ? `${h} h ${r} min` : `${h} h`;
  };
  const eventStatus = (e: ScheduleEvent): 'done' | 'now' | 'next' | 'later' => {
    const start = toVal(e.startTime), end = start + (e.durationMinutes || 0) / 60;
    if (currentTimeVal >= end) return 'done';
    if (currentTimeVal >= start) return 'now';
    return nextEvent && e.id === nextEvent.id ? 'next' : 'later';
  };

  // Week strip (Sat → Fri, same order as the Schedule screen)
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 1) % 7));
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const name = d.toLocaleDateString('en-US', { weekday: 'long' });
    const iso = getLocalISOString(d);
    const count = events.filter(e => (e.isRecurring ? e.dayOfWeek === name : e.date === iso)).length;
    return { key: iso, short: name.slice(0, 3), num: d.getDate(), count, isToday: iso === todayStr };
  });

  const sectionTitle = 'm-0 text-[0.72rem] font-bold uppercase tracking-[0.08em]';
  const glassFx: React.CSSProperties = { backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)', boxShadow: 'var(--glass-shadow)' };
  const cardStyle: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--line)', ...glassFx };

  // ── Hero: the current / next class ───────────────────────────────────────
  const renderHero = () => {
    const event = mainCardEvent;
    if (!event) {
      return (
        <motion.div variants={fadeUp} className="rounded-[22px] px-4 py-4" style={cardStyle}>
          <div className={sectionTitle} style={{ color: 'var(--text-muted)' }}>Today</div>
          <div className="mt-1 text-[1.05rem] font-extrabold" style={{ color: 'var(--text-primary)' }}>You're free for the rest of the day</div>
        </motion.div>
      );
    }
    const start = toVal(event.startTime);
    const dur = (event.durationMinutes || 0) / 60;
    const progress = isHappeningNow && dur > 0 ? Math.min(1, Math.max(0, (currentTimeVal - start) / dur)) : 0;
    const timing = isHappeningNow
      ? `${fmtMins((start + dur - currentTimeVal) * 60)} left`
      : `in ${fmtMins((start - currentTimeVal) * 60)}`;
    const slotName = getSlotName(event.startTime);

    return (
      <motion.div
        variants={fadeUp}
        whileTap={{ scale: 0.985 }}
        onClick={() => onEventClick(event)}
        className="rounded-[22px] px-4 pt-3.5 pb-4 cursor-pointer"
        style={{ background: 'var(--hero-bg)', color: 'var(--hero-ink, var(--on-accent))', border: '1px solid var(--line)', ...glassFx }}
      >
        <div className="flex items-center justify-between text-[0.72rem] font-extrabold uppercase tracking-[0.08em]">
          <span className="flex items-center gap-1.5">
            {isHappeningNow && <span className="inline-block h-2 w-2 rounded-full" style={{ background: 'currentColor' }} />}
            {isHappeningNow ? 'Happening now' : 'Up next'}
          </span>
          <span>{timing}</span>
        </div>
        <h2 className="mt-2 mb-0 font-extrabold" style={{ fontSize: '1.45rem', lineHeight: 1.12, letterSpacing: '-0.02em', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {event.title}
        </h2>
        <div className="mt-2 text-[0.82rem] font-bold" style={{ opacity: 0.85 }}>
          {[slotName, `${to12h(event.startTime)} – ${to12h(getEndTime(event.startTime, event.durationMinutes))}`, event.location].filter(Boolean).join('  ·  ')}
        </div>
        {isHappeningNow && (
          <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: 'color-mix(in srgb, currentColor 22%, transparent)' }}>
            <div className="h-full rounded-full" style={{ width: `${progress * 100}%`, background: 'currentColor' }} />
          </div>
        )}
      </motion.div>
    );
  };

  const Shortcut = ({ onClick, icon, label, tint }: { onClick: () => void; icon: React.ReactNode; label: string; tint?: string }) => (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1.5 bg-transparent border-0 p-0 h-[60px]"
      style={{ color: tint || 'var(--text-primary)' }}
    >
      {icon}
      <span className="text-[0.68rem] font-semibold whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{label}</span>
    </motion.button>
  );

  const headerBtn = 'flex items-center justify-center w-10 h-10 rounded-[14px]';

  return (
    <div style={styles.scrollableContent} className="custom-scrollbar">
      <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.03 } } }} className="max-w-3xl mx-auto w-full">

        {/* Announcement */}
        <AnimatePresence>
          {showAnnouncement && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3 rounded-[16px] px-3 py-2.5 flex items-start justify-between gap-2"
              style={cardStyle}
            >
              <div className="flex gap-2.5">
                <Megaphone size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--accent)' }} />
                <p className="m-0 text-[0.82rem] font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>{announcement!.message}</p>
              </div>
              <button onClick={handleDismissAnnouncement} aria-label="Dismiss" className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full border-0" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}><X size={13} /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <motion.div variants={fadeUp} className="mb-3.5">
          <div className="flex items-baseline justify-between gap-3 text-[0.8rem] font-semibold">
            <span className="truncate" style={{ color: 'var(--text-muted)' }}>
              {greeting}, <span style={{ color: 'var(--text-primary)' }} className="font-bold">{username || 'Student'}</span>
            </span>
            <span className="shrink-0" style={{ color: 'var(--accent-text)' }}>{currentDate}</span>
          </div>
          <div className="mt-1 flex items-center justify-between gap-3">
            <span className="font-extrabold leading-none whitespace-nowrap" style={{ fontSize: '1.9rem', letterSpacing: '-0.03em', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{currentTime}</span>
          <div className="flex items-center gap-2 shrink-0">
            {onSync && (
              <motion.button
                onClick={async () => {
                  if (syncStatus !== 'idle') return;
                  setSyncStatus('loading');
                  const success = await onSync();
                  if (success) { setSyncStatus('success'); setTimeout(() => setSyncStatus('idle'), 2500); }
                  else setSyncStatus('idle');
                }}
                whileTap={{ scale: 0.92 }}
                disabled={syncStatus !== 'idle'}
                aria-label="Sync"
                className={headerBtn}
                style={{ ...cardStyle, color: 'var(--text-primary)' }}
              >
                {syncStatus === 'loading' ? (
                  <div className="w-4 h-4 border-2 rounded-full animate-spin spin-ring" />
                ) : syncStatus === 'success' ? (
                  <Check size={17} strokeWidth={3} style={{ color: 'var(--accent)' }} />
                ) : (
                  <Save size={17} />
                )}
              </motion.button>
            )}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={toggleReminders}
              aria-label={remindersOn ? 'Turn class reminders off' : 'Turn class reminders on'}
              aria-pressed={remindersOn}
              className={headerBtn}
              style={{ ...cardStyle, color: remindersOn ? 'var(--accent)' : 'var(--text-muted)' }}
            >
              {remindersOn ? <Bell size={17} /> : <BellOff size={17} />}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => onNavigate('ai')}
              aria-label="AI Assistant"
              className={headerBtn}
              style={{ background: 'var(--surface-2)', color: 'var(--accent)', border: '1px solid var(--line)', ...glassFx }}
            >
              <Sparkles size={17} />
            </motion.button>
          </div>
          </div>
        </motion.div>

        <div className="flex flex-col gap-3">
          {renderHero()}

          {/* Week strip */}
          <motion.div variants={fadeUp} className="grid grid-cols-7 rounded-[18px] py-2 px-1" style={cardStyle}>
            {week.map(d => (
              <button
                key={d.key}
                onClick={() => onNavigate('schedule')}
                className="flex flex-col items-center gap-1 bg-transparent border-0 p-0"
              >
                <span className="text-[0.62rem] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>{d.short}</span>
                <span
                  className="flex items-center justify-center w-8 h-8 rounded-full text-[0.92rem] font-extrabold"
                  style={d.isToday ? { background: 'var(--accent)', color: 'var(--on-accent)' } : { color: d.count ? 'var(--text-primary)' : 'var(--text-muted)' }}
                >
                  {d.num}
                </span>
              </button>
            ))}
          </motion.div>

          {/* Today's classes */}
          <motion.div variants={fadeUp}>
            <div className="flex items-center justify-between mb-1.5 px-1">
              <h3 className={sectionTitle} style={{ color: 'var(--text-muted)' }}>Today</h3>
              <button onClick={() => onNavigate('schedule')} className="flex items-center gap-0.5 bg-transparent border-0 p-0 text-[0.75rem] font-bold" style={{ color: 'var(--accent-text)' }}>
                Week <ChevronRight size={14} />
              </button>
            </div>
            <div className="rounded-[18px] px-3.5" style={cardStyle}>
              {todayEvents.length === 0 && (
                <div className="py-4 text-center text-[0.82rem]" style={{ color: 'var(--text-muted)' }}>No classes today.</div>
              )}
              {todayEvents.map((e, i) => {
                const st = eventStatus(e);
                return (
                  <div
                    key={e.id}
                    onClick={() => onEventClick(e)}
                    className="flex items-center gap-3 py-2.5 cursor-pointer"
                    style={{ borderTop: i ? '1px solid var(--line)' : 'none', opacity: st === 'done' ? 0.5 : 1 }}
                  >
                    <div className="w-[62px] shrink-0 whitespace-nowrap text-[0.8rem] font-bold" style={{ color: st === 'now' || st === 'next' ? 'var(--accent-text)' : 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                      {to12h(e.startTime)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[0.88rem] font-bold leading-tight truncate" style={{ color: 'var(--text-primary)' }}>{e.title}</div>
                      <div className="text-[0.72rem] mt-0.5 capitalize" style={{ color: 'var(--text-muted)' }}>
                        {[e.type, e.location].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    {(st === 'now' || st === 'next') && (
                      <span className="shrink-0 rounded-full px-2 py-0.5 text-[0.66rem] font-extrabold uppercase tracking-wide" style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}>
                        {st === 'now' ? 'Now' : 'Next'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Shortcuts */}
          <motion.div variants={fadeUp} className="grid grid-cols-5 rounded-[18px] px-1" style={cardStyle}>
            <Shortcut onClick={() => onNavigate('gym')} icon={<Dumbbell size={20} />} label="Gym" tint="var(--tile-1)" />
            <Shortcut onClick={() => onNavigate('grades')} icon={<Calculator size={20} />} label="Grades" tint="var(--tile-2)" />
            <Shortcut onClick={() => onNavigate('todo')} icon={<CheckSquare size={20} />} label="To-Do" tint="var(--tile-3)" />
            <Shortcut onClick={onAddEventClick} icon={<Plus size={20} />} label="Add" />
            <Shortcut onClick={onSmartImportClick} icon={<Brain size={20} />} label="Import" />
          </motion.div>

          {/* Uni portal */}
          <motion.div variants={fadeUp} className="grid grid-cols-2 gap-2">
            <button onClick={() => onNavigate('portal_grades')} className="flex items-center gap-2.5 rounded-[18px] px-3 py-2.5 text-left" style={cardStyle}>
              <GraduationCap size={20} className="shrink-0" style={{ color: 'var(--accent)' }} />
              <span className="min-w-0">
                <span className="block text-[0.86rem] font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>Portal grades</span>
                <span className="block text-[0.7rem] truncate" style={{ color: portal?.newGrades ? 'var(--accent-text)' : 'var(--text-muted)' }}>
                  {!portal ? ' ' : !portal.connected ? 'Not connected' : portal.newGrades ? `${portal.newGrades} new` : 'No new grades'}
                </span>
              </span>
            </button>
            <button onClick={() => onNavigate('attendance')} className="flex items-center gap-2.5 rounded-[18px] px-3 py-2.5 text-left" style={cardStyle}>
              <UserCheck size={20} className="shrink-0" style={{ color: 'var(--accent)' }} />
              <span className="min-w-0">
                <span className="block text-[0.86rem] font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>Attendance</span>
                <span className="block text-[0.7rem] truncate" style={{ color: 'var(--text-muted)' }}>
                  {!portal ? ' ' : !portal.connected ? 'Not connected' : portal.absences ? `${portal.absences} absence${portal.absences === 1 ? '' : 's'}` : 'No absences'}
                </span>
              </span>
            </button>
          </motion.div>

          {/* Upcoming tests (only shown when there are any) */}
          {upcomingDeadlines.length > 0 && (
          <motion.div variants={fadeUp}>
            <h3 className={`${sectionTitle} mb-1.5 px-1`} style={{ color: 'var(--text-muted)' }}>Upcoming tests</h3>
              <div className="rounded-[18px] px-3.5" style={cardStyle}>
                {upcomingDeadlines.map((task, i) => {
                  const slotName = getSlotName(task.startTime);
                  return (
                    <div
                      key={task.id}
                      onClick={() => onEventClick(task)}
                      className="flex justify-between items-center gap-3 py-2.5 cursor-pointer"
                      style={{ borderTop: i ? '1px solid var(--line)' : 'none' }}
                    >
                      <div className="min-w-0">
                        <div className="text-[0.88rem] font-bold truncate" style={{ color: 'var(--text-primary)' }}>{task.title}</div>
                        <div className="text-[0.72rem] mt-0.5 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                          <span className="capitalize">{task.type}</span>
                          {task.code && <><span>·</span><span>{task.code}</span></>}
                        </div>
                      </div>
                      <div className="text-right shrink-0" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        <div className="text-[0.8rem] font-bold" style={{ color: 'var(--text-primary)' }}>{new Date(task.date || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                        <div className="text-[0.7rem]" style={{ color: 'var(--text-muted)' }}>{slotName ? `${slotName} · ` : ''}{to12h(task.startTime)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
          </motion.div>
          )}

          {/* Quick notes */}
          <motion.div variants={fadeUp}>
            <h3 className={`${sectionTitle} mb-1.5 px-1`} style={{ color: 'var(--text-muted)' }}>Quick notes</h3>
            <textarea
              value={quickNotes}
              onChange={handleNotesChange}
              placeholder="Jot down quick reminders here..."
              aria-label="Quick notes"
              className="block w-full h-[76px] rounded-[18px] px-3.5 py-3 text-[0.85rem] leading-snug resize-none outline-none"
              style={{ ...cardStyle, color: 'var(--text-primary)', fontFamily: 'inherit' }}
            />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
