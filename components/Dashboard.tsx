import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, ClipboardList, ArrowRight, Dumbbell, Calculator, Sparkles, Megaphone, X,
  CheckSquare, Plus, Brain, StickyNote, Save, Check, Clock, ChevronRight
} from 'lucide-react';
import { ScheduleEvent, EventColorMap, PeriodDefinition, Announcement } from '../types';
import { getLocalISOString } from '../constants';
import { theme, styles } from '../theme';

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

export const Dashboard: React.FC<DashboardProps> = ({ events, eventColors, onNavigate, onEventClick, onAddEventClick, onSmartImportClick, periods, announcement, username, onSync }) => {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [greeting, setGreeting] = useState('Good Morning');
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
  const showNextUpTab = isHappeningNow && nextEvent;

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
    hidden: { opacity: 0, y: 22, filter: 'blur(5px)' },
    show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.55, ease: EASE } },
  };

  const renderEventCard = (event: ScheduleEvent | undefined, title: string, isNow: boolean) => {
    const slotName = event ? getSlotName(event.startTime) : '';
    const color = event ? (eventColors[event.type] || theme.accent) : theme.cardBg;

    return (
      <motion.div
        variants={fadeUp}
        whileHover={event ? { scale: 1.012, y: -2 } : {}}
        whileTap={event ? { scale: 0.99 } : {}}
        onClick={() => event && onEventClick(event)}
        className="relative overflow-hidden rounded-[24px] p-[14px] cursor-pointer"
        style={{
          minHeight: '108px',
          background: event ? `linear-gradient(135deg, ${color}E6 0%, ${color}55 100%)` : 'var(--card-bg)',
          border: event ? `1px solid ${color}66` : 'var(--glass-border)',
          boxShadow: event ? `0 18px 46px ${color}40` : 'none',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* sheen sweep */}
        {event && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[24px]">
            <div className="absolute top-0 -left-1/2 h-full w-1/2 bg-white/10 blur-md" style={{ animation: 'fx-shine 4.5s ease-in-out infinite' }} />
          </div>
        )}

        {isNow && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/30 backdrop-blur-md rounded-full pl-1.5 pr-2.5 py-1 border border-white/15">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            <span className="text-[8px] font-black uppercase tracking-wider text-white/90">Live</span>
          </div>
        )}

        <div className="relative z-10">
          <h3 className="m-0 uppercase font-black" style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.6rem', letterSpacing: '1.4px' }}>{title}</h3>
          {event ? (
            <>
              <h2 className="font-black leading-tight mt-1" style={{ fontSize: '1.3rem', textShadow: '0 2px 12px rgba(0,0,0,0.35)' }}>{event.title}</h2>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span className="bg-white/15 rounded-md px-1.5 py-0.5 text-[0.65rem] font-semibold text-white/90">{event.code || 'No Code'}</span>
                {event.group && <span className="bg-white/15 rounded-md px-1.5 py-0.5 text-[0.65rem] font-semibold text-white/90">Grp {event.group}</span>}
              </div>
            </>
          ) : (
            <div className="py-2 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Nothing scheduled. Enjoy! 🎉</div>
          )}
        </div>

        {event && (
          <div className="relative z-10 flex gap-1.5 items-center text-white flex-wrap mt-2">
            <div className="flex flex-col bg-black/40 backdrop-blur-md rounded-lg px-2 py-1 border border-white/10">
              <div className="text-[0.7rem] font-black text-white flex items-center gap-1.5">{slotName || 'Event'}</div>
              <div className="text-[0.6rem] text-white/80 font-semibold">{to12h(event.startTime)} – {to12h(getEndTime(event.startTime, event.durationMinutes))}</div>
            </div>
            {event.location && (
              <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md rounded-lg px-1.5 py-1 text-[0.7rem] font-semibold border border-white/10 self-center">
                <MapPin size={10} className="text-white/90" /> {event.location}
              </div>
            )}
          </div>
        )}
      </motion.div>
    );
  };

  const AppTile = ({
    onClick, icon, label, sub, gradient, glow,
  }: {
    onClick: () => void; icon: React.ReactNode; label: string; sub: string;
    gradient: string; glow: string;
  }) => (
    <motion.button
      variants={fadeUp}
      whileHover={{ scale: 1.04, y: -3 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className="relative overflow-hidden rounded-[18px] p-[11px] text-left group"
      style={{
        minHeight: '82px', background: gradient, border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: `0 8px 22px ${glow}`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      }}
    >
      <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full bg-white/10 blur-xl opacity-60 group-hover:opacity-100 transition-opacity" />
      <div className="relative z-10 w-fit p-1.5 rounded-[10px] bg-white/15 backdrop-blur-sm">
        {icon}
      </div>
      <div className="relative z-10">
        <h3 className="m-0 font-black text-white" style={{ fontSize: '0.8rem' }}>{label}</h3>
        <p className="m-0 text-white/70" style={{ fontSize: '0.6rem' }}>{sub}</p>
      </div>
    </motion.button>
  );

  return (
    <div style={styles.scrollableContent} className="custom-scrollbar">
      <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.06 } } }} className="max-w-3xl mx-auto w-full">

        {/* Announcement */}
        <AnimatePresence>
          {showAnnouncement && (
            <motion.div
              initial={{ opacity: 0, y: -16, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -16, height: 0 }}
              className="mb-3.5 rounded-xl p-2.5 flex items-start justify-between relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #a855f7 0%, #d946ef 100%)', boxShadow: '0 8px 30px rgba(168,85,247,0.4)', color: '#fff' }}
            >
              <div className="absolute -top-3 -left-2 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
              <div className="flex gap-2 relative z-10">
                <div className="bg-white/20 p-1.5 rounded-full h-fit"><Megaphone size={14} className="text-white" fill="white" /></div>
                <div>
                  <h4 className="m-0 mb-0.5 text-[0.75rem] font-black uppercase opacity-90">Announcement</h4>
                  <p className="m-0 text-[0.8rem] font-semibold leading-snug">{announcement!.message}</p>
                </div>
              </div>
              <button onClick={handleDismissAnnouncement} className="bg-black/15 hover:bg-black/30 transition rounded-full p-1 text-white flex items-center justify-center min-w-[22px] min-h-[22px]"><X size={12} /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <motion.div variants={fadeUp} className="mb-4 pt-1 relative">
          <div
            className="font-black leading-none tracking-tight"
            style={{
              fontSize: '2rem',
              backgroundImage: 'linear-gradient(110deg, var(--text-primary), var(--text-muted))',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}
          >
            {currentTime}
          </div>
          <div className="text-[0.8rem] font-bold mt-0.5" style={{ color: theme.accent }}>{currentDate}</div>
          <p className="mt-0.5 text-[0.78rem] font-medium" style={{ color: 'var(--text-muted)' }}>
            {greeting}, <span style={{ color: 'var(--text-primary)' }} className="font-bold">{username || 'Student'}</span>
          </p>

          <div className="absolute top-1 right-0 flex items-center gap-2 z-20">
            {onSync && (
              <motion.button
                onClick={async () => {
                  if (syncStatus !== 'idle') return;
                  setSyncStatus('loading');
                  const success = await onSync();
                  if (success) { setSyncStatus('success'); setTimeout(() => setSyncStatus('idle'), 2500); }
                  else setSyncStatus('idle');
                }}
                className={`relative flex items-center justify-center w-9 h-9 rounded-full transition-all duration-500 border border-white/10 overflow-hidden ${
                  syncStatus === 'success' ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.45)]'
                  : syncStatus === 'loading' ? 'bg-white/10 ring-2 ring-white/10' : 'bg-white/5 hover:bg-white/10'
                }`}
                whileTap={{ scale: 0.9 }}
                whileHover={syncStatus === 'idle' ? { scale: 1.08 } : {}}
                disabled={syncStatus !== 'idle'}
                title="Sync"
              >
                <AnimatePresence mode="wait">
                  {syncStatus === 'loading' ? (
                    <motion.div key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : syncStatus === 'success' ? (
                    <motion.div key="s" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} transition={{ type: 'spring', damping: 14 }}>
                      <Check size={15} color="#fff" strokeWidth={3} />
                    </motion.div>
                  ) : (
                    <motion.div key="i" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><Save size={15} color="#fff" /></motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            )}
            <motion.button
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.08, rotate: 8 }}
              onClick={() => onNavigate('ai')}
              className="w-9 h-9 rounded-full flex items-center justify-center shadow-lg cursor-pointer relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #d946ef)', boxShadow: '0 4px 14px rgba(139,92,246,0.45)' }}
              title="AI Assistant"
            >
              <motion.span className="absolute inset-0 opacity-60" style={{ background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.5), transparent 60%)' }} animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 2.5, repeat: Infinity }} />
              <Sparkles size={15} color="#fff" className="relative z-10" />
            </motion.button>
          </div>
        </motion.div>

        <div className="flex flex-col gap-3">
          {renderEventCard(mainCardEvent, isHappeningNow ? 'Happening Now' : 'Up Next', isHappeningNow)}

          {showNextUpTab && nextEvent && (
            <motion.div
              variants={fadeUp}
              whileHover={{ x: 3 }}
              onClick={() => onEventClick(nextEvent)}
              className="rounded-2xl p-2.5 flex items-center justify-between cursor-pointer"
              style={{ background: 'var(--card-bg)', border: 'var(--glass-border)' }}
            >
              <div className="flex items-center gap-2">
                <div className="bg-white/10 p-1.5 rounded-lg"><ArrowRight size={14} color={theme.accent} /></div>
                <div>
                  <div className="text-[0.6rem] uppercase font-bold tracking-wide" style={{ color: 'var(--text-muted)' }}>Then</div>
                  <div className="text-[0.85rem] font-bold" style={{ color: 'var(--text-primary)' }}>{nextEvent.title}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[0.75rem] font-semibold flex items-center gap-1 justify-end" style={{ color: 'var(--text-primary)' }}><Clock size={10} /> {to12h(nextEvent.startTime)}</div>
                <div className="text-[0.65rem]" style={{ color: 'var(--text-muted)' }}>{nextEvent.location}</div>
              </div>
            </motion.div>
          )}

          {/* App grid */}
          <div className="grid grid-cols-2 gap-2">
            {/* GYM — now unlocked */}
            <AppTile
              onClick={() => onNavigate('gym')}
              icon={<Dumbbell size={16} color="#fff" />}
              label="Gym"
              sub="Train & Track"
              gradient="linear-gradient(135deg, rgba(37,99,235,0.6), rgba(29,78,216,0.35))"
              glow="rgba(37,99,235,0.3)"
            />
            <AppTile
              onClick={() => onNavigate('grades')}
              icon={<Calculator size={16} color="#fff" />}
              label="Grades"
              sub="GPA Calculator"
              gradient="linear-gradient(135deg, rgba(13,148,136,0.6), rgba(17,94,89,0.35))"
              glow="rgba(13,148,136,0.3)"
            />
            <AppTile
              onClick={() => onNavigate('todo')}
              icon={<CheckSquare size={16} color="#fff" />}
              label="To-Do"
              sub="Task Manager"
              gradient="linear-gradient(135deg, rgba(236,72,153,0.6), rgba(219,39,119,0.35))"
              glow="rgba(236,72,153,0.3)"
            />

            <div className="flex gap-2">
              <motion.button
                variants={fadeUp}
                whileHover={{ scale: 1.04, y: -3 }}
                whileTap={{ scale: 0.96 }}
                onClick={onAddEventClick}
                className="flex-1 rounded-[18px] p-[11px] flex flex-col items-center justify-center text-center"
                style={{ minHeight: '82px', background: 'var(--card-bg)', border: '1px dashed rgba(139,92,246,0.35)' }}
              >
                <div className="bg-violet-500/15 p-2 rounded-full mb-1"><Plus size={16} color={theme.accent} /></div>
                <span className="text-[0.68rem] font-bold" style={{ color: 'var(--text-muted)' }}>Add Event</span>
              </motion.button>

              <motion.button
                variants={fadeUp}
                whileHover={{ scale: 1.04, y: -3 }}
                whileTap={{ scale: 0.96 }}
                onClick={onSmartImportClick}
                className="flex-1 rounded-[18px] p-[11px] flex flex-col items-center justify-center text-center relative overflow-hidden"
                style={{ minHeight: '82px', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.22)' }}
              >
                <div className="bg-violet-500/20 p-2 rounded-full mb-1"><Brain size={16} color={theme.accent} /></div>
                <span className="text-[0.68rem] font-bold" style={{ color: theme.accent }}>Smart Import</span>
              </motion.button>
            </div>
          </div>

          {/* Quick notes */}
          <motion.div variants={fadeUp}>
            <div className="flex items-center gap-1.5 mb-2 pl-1">
              <StickyNote size={14} color={theme.accent} />
              <h3 className="m-0 text-[0.85rem] font-bold" style={{ color: 'var(--text-primary)' }}>Quick Notes</h3>
            </div>
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card-bg)', border: 'var(--glass-border)' }}>
              <textarea
                value={quickNotes}
                onChange={handleNotesChange}
                placeholder="Jot down quick reminders here..."
                className="w-full min-h-[80px] bg-transparent border-none p-3 text-[0.8rem] resize-y outline-none"
                style={{ color: 'var(--text-primary)', fontFamily: 'inherit' }}
              />
            </div>
          </motion.div>

          {/* Upcoming tests */}
          <motion.div variants={fadeUp}>
            <div className="flex items-center gap-1.5 mb-2 pl-1">
              <ClipboardList size={14} color={theme.accent} />
              <h3 className="m-0 text-[0.85rem] font-bold" style={{ color: 'var(--text-primary)' }}>Upcoming Tests</h3>
            </div>
            {upcomingDeadlines.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {upcomingDeadlines.map((task, i) => {
                  const color = eventColors[task.type] || '#64748b';
                  const slotName = getSlotName(task.startTime);
                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05, ease: EASE }}
                      whileHover={{ x: 3 }}
                      onClick={() => onEventClick(task)}
                      className="rounded-2xl p-2.5 flex justify-between items-center cursor-pointer"
                      style={{ background: 'var(--card-bg)', borderLeft: `3px solid ${color}`, border: 'var(--glass-border)', borderLeftWidth: '3px', borderLeftColor: color }}
                    >
                      <div>
                        <div className="text-[0.6rem] font-bold uppercase tracking-wide mb-0.5" style={{ color }}>{task.type}</div>
                        <div className="text-[0.85rem] font-bold" style={{ color: 'var(--text-primary)' }}>{task.title}</div>
                        <div className="text-[0.7rem]" style={{ color: 'var(--text-muted)' }}>{task.code}</div>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <div>
                          <div className="text-[0.75rem] font-bold" style={{ color: 'var(--text-primary)' }}>{new Date(task.date || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                          <div className="text-[0.65rem] mt-0.5" style={{ color: 'var(--text-muted)' }}>{to12h(task.startTime)}</div>
                          {slotName && <div className="text-[0.55rem] mt-0.5 font-semibold" style={{ color: theme.accent }}>{slotName}</div>}
                        </div>
                        <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="p-3.5 text-center rounded-xl text-[0.8rem]" style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', border: 'var(--glass-border)' }}>
                No upcoming quizzes or exams. 🎯
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
