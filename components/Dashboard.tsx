import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, ClipboardList, ArrowRight, Dumbbell, Calculator, Sparkles, Megaphone, X,
  CheckSquare, Plus, Brain, StickyNote, Save, Check, Clock, ChevronRight
} from 'lucide-react';
import { ScheduleEvent, EventColorMap, PeriodDefinition, Announcement } from '../types';
import { getLocalISOString } from '../constants';
import { theme, styles } from '../theme';

// ─── Design tokens ────────────────────────────────────────────────────────────
const INK        = '#1A1730';
const CARD_BG    = '#FAFAF6';
const HL_YELLOW  = '#F6DF63';
const HL_PINK    = '#eea8f2';
const HL_GREEN   = '#8CE3B7';
const HL_BLUE    = '#9ECFFF';
const HL_ORANGE  = '#F4BE8A';
const HL_RED     = '#E56A5A';
const MUTED      = 'rgba(26,23,48,0.55)';

const card = {
  background: CARD_BG,
  border: `1.5px solid ${INK}`,
  borderRadius: 10,
  boxShadow: `4px 5px 0 ${INK}`,
} as const;

// ─── Props ────────────────────────────────────────────────────────────────────
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

export const Dashboard: React.FC<DashboardProps> = ({
  events, eventColors, onNavigate, onEventClick,
  onAddEventClick, onSmartImportClick, periods,
  announcement, username, onSync,
}) => {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [greeting, setGreeting] = useState('Good Morning');
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [dismissedAnnouncementId, setDismissedAnnouncementId] = useState(
    () => localStorage.getItem('dismissed_announcement_id'),
  );
  const [quickNotes, setQuickNotes] = useState(
    () => localStorage.getItem('quick_notes') || '',
  );

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

  const showAnnouncement =
    announcement && announcement.is_active && announcement.id !== dismissedAnnouncementId;

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
    const endVal = startVal + (e.durationMinutes || 0) / 60;
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
      if (
        eventDate === todayStr &&
        e.startTime > now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      )
        return true;
      return false;
    })
    .sort((a, b) => {
      const dateA = a.date || todayStr;
      const dateB = b.date || todayStr;
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return a.startTime.localeCompare(b.startTime);
    });

  // ── Framer variants ──────────────────────────────────────────────────────
  const fadeUp = {
    hidden: { opacity: 0, y: 22, filter: 'blur(5px)' },
    show: {
      opacity: 1, y: 0, filter: 'blur(0px)',
      transition: { duration: 0.55, ease: EASE },
    },
  };

  // ── Highlighter tints mapped to event types ──────────────────────────────
  const eventTypeTints: Record<string, string> = {
    lecture: `${HL_BLUE}55`,
    lab: `${HL_GREEN}55`,
    tutorial: `${HL_YELLOW}55`,
    quiz: `${HL_ORANGE}55`,
    exam: `${HL_RED}55`,
    assignment: `${HL_PINK}55`,
    class: `${HL_YELLOW}55`,
  };

  const eventTypeBorders: Record<string, string> = {
    lecture: HL_BLUE,
    lab: HL_GREEN,
    tutorial: HL_YELLOW,
    quiz: HL_ORANGE,
    exam: HL_RED,
    assignment: HL_PINK,
    class: HL_YELLOW,
  };

  // ── Main event card ──────────────────────────────────────────────────────
  const renderEventCard = (event: ScheduleEvent | undefined, title: string, isNow: boolean) => {
    const slotName = event ? getSlotName(event.startTime) : '';
    const tint = event ? (eventTypeTints[event.type] || `${HL_YELLOW}55`) : `${HL_YELLOW}40`;
    const accentBorder = event ? (eventTypeBorders[event.type] || HL_YELLOW) : INK;

    return (
      <motion.div
        variants={fadeUp}
        whileHover={event ? { y: -3, boxShadow: `6px 8px 0 ${INK}` } : {}}
        whileTap={event ? { y: 1, boxShadow: `2px 3px 0 ${INK}` } : {}}
        onClick={() => event && onEventClick(event)}
        style={{
          ...card,
          background: tint,
          borderLeft: `4px solid ${accentBorder}`,
          minHeight: 108,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          cursor: event ? 'pointer' : 'default',
          padding: 14,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* LIVE badge */}
        {isNow && (
          <div
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              background: `${HL_RED}22`,
              border: `1.5px solid ${HL_RED}`,
              borderRadius: 30,
              padding: '2px 8px 2px 5px',
            }}
          >
            <span style={{ position: 'relative', width: 8, height: 8, display: 'inline-flex' }}>
              <span
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  background: HL_RED,
                  opacity: 0.5,
                  animation: 'ping 1.2s cubic-bezier(0,0,.2,1) infinite',
                }}
              />
              <span
                style={{
                  position: 'relative',
                  display: 'inline-flex',
                  borderRadius: '50%',
                  width: 8,
                  height: 8,
                  background: HL_RED,
                }}
              />
            </span>
            <span
              style={{
                fontSize: '0.6rem',
                fontWeight: 900,
                letterSpacing: '1.2px',
                textTransform: 'uppercase',
                color: HL_RED,
                fontFamily: "'Instrument Sans', sans-serif",
              }}
            >
              Live
            </span>
          </div>
        )}

        <div>
          <div
            style={{
              fontSize: '0.6rem',
              fontWeight: 700,
              letterSpacing: '1.2px',
              textTransform: 'uppercase',
              color: MUTED,
              fontFamily: "'Instrument Sans', sans-serif",
              marginBottom: 4,
            }}
          >
            {title}
          </div>
          {event ? (
            <>
              <h2
                style={{
                  margin: 0,
                  fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif",
                  fontWeight: 800,
                  fontSize: '1.25rem',
                  color: INK,
                  lineHeight: 1.2,
                }}
              >
                {event.title}
              </h2>
              <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                <span
                  style={{
                    background: `${INK}12`,
                    border: `1px solid ${INK}33`,
                    borderRadius: 6,
                    padding: '2px 7px',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: INK,
                    fontFamily: "'Instrument Sans', sans-serif",
                  }}
                >
                  {event.code || 'No Code'}
                </span>
                {event.group && (
                  <span
                    style={{
                      background: `${INK}12`,
                      border: `1px solid ${INK}33`,
                      borderRadius: 6,
                      padding: '2px 7px',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      color: INK,
                      fontFamily: "'Instrument Sans', sans-serif",
                    }}
                  >
                    Grp {event.group}
                  </span>
                )}
              </div>
            </>
          ) : (
            <div
              style={{
                padding: '8px 0',
                fontSize: '0.85rem',
                fontWeight: 500,
                color: MUTED,
                fontFamily: "'Instrument Sans', sans-serif",
              }}
            >
              Nothing scheduled. Enjoy! 🎉
            </div>
          )}
        </div>

        {event && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 10 }}>
            <div
              style={{
                background: `${INK}10`,
                border: `1px solid ${INK}25`,
                borderRadius: 8,
                padding: '4px 8px',
              }}
            >
              <div
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  color: INK,
                  fontFamily: "'Instrument Sans', sans-serif",
                }}
              >
                {slotName || 'Event'}
              </div>
              <div style={{ fontSize: '0.6rem', color: MUTED, fontFamily: "'Space Mono', monospace" }}>
                {to12h(event.startTime)} – {to12h(getEndTime(event.startTime, event.durationMinutes))}
              </div>
            </div>
            {event.location && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  background: `${INK}10`,
                  border: `1px solid ${INK}25`,
                  borderRadius: 8,
                  padding: '4px 8px',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  color: INK,
                  fontFamily: "'Instrument Sans', sans-serif",
                }}
              >
                <MapPin size={10} color={INK} />
                {event.location}
              </div>
            )}
          </div>
        )}
      </motion.div>
    );
  };

  // ── Quick-action tile (paper card style) ──────────────────────────────────
  const AppTile = ({
    onClick, icon, label, sub, tintColor,
  }: {
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    sub: string;
    tintColor: string;
  }) => (
    <motion.button
      variants={fadeUp}
      whileHover={{ y: -3, boxShadow: `6px 8px 0 ${INK}` }}
      whileTap={{ y: 2, boxShadow: `2px 3px 0 ${INK}` }}
      onClick={onClick}
      style={{
        ...card,
        background: `${tintColor}50`,
        minHeight: 82,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: 11,
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
      }}
    >
      <div
        style={{
          background: `${tintColor}90`,
          border: `1.5px solid ${INK}`,
          borderRadius: 8,
          padding: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </div>
      <div>
        <h3
          style={{
            margin: 0,
            fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif",
            fontWeight: 800,
            fontSize: '0.8rem',
            color: INK,
          }}
        >
          {label}
        </h3>
        <p style={{ margin: 0, fontSize: '0.6rem', color: MUTED, fontFamily: "'Instrument Sans', sans-serif" }}>
          {sub}
        </p>
      </div>
    </motion.button>
  );

  // ── Ink primary button style ──────────────────────────────────────────────
  const inkBtn: React.CSSProperties = {
    background: INK,
    color: '#fff',
    border: `1.5px solid ${INK}`,
    borderRadius: 10,
    fontWeight: 700,
    boxShadow: `4px 4px 0 ${HL_YELLOW}`,
    cursor: 'pointer',
    padding: '10px 18px',
    fontFamily: "'Bricolage Grotesque', sans-serif",
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    fontSize: '0.78rem',
  };

  return (
    <div style={styles.scrollableContent} className="custom-scrollbar">
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.07 } } }}
        className="max-w-3xl mx-auto w-full"
        style={{ paddingBottom: 100 }}
      >
        {/* ── Announcement banner ── */}
        <AnimatePresence>
          {showAnnouncement && (
            <motion.div
              initial={{ opacity: 0, y: -16, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -16, height: 0 }}
              style={{
                ...card,
                background: `${HL_ORANGE}55`,
                borderLeft: `4px solid ${HL_ORANGE}`,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 10,
                padding: '10px 12px',
                marginBottom: 14,
                boxShadow: `3px 4px 0 ${INK}`,
              }}
            >
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div
                  style={{
                    background: `${HL_ORANGE}`,
                    border: `1.5px solid ${INK}`,
                    borderRadius: 8,
                    padding: '5px 6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Megaphone size={13} color={INK} fill={INK} />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      letterSpacing: '0.8px',
                      textTransform: 'uppercase',
                      color: MUTED,
                      fontFamily: "'Instrument Sans', sans-serif",
                      marginBottom: 2,
                    }}
                  >
                    Announcement
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: INK,
                      lineHeight: 1.4,
                      fontFamily: "'Instrument Sans', sans-serif",
                    }}
                  >
                    {announcement!.message}
                  </p>
                </div>
              </div>
              <button
                onClick={handleDismissAnnouncement}
                style={{
                  background: `${INK}15`,
                  border: `1px solid ${INK}30`,
                  borderRadius: '50%',
                  width: 22,
                  height: 22,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: INK,
                  flexShrink: 0,
                }}
              >
                <X size={11} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Header ── */}
        <motion.div variants={fadeUp} style={{ marginBottom: 20, paddingTop: 4, position: 'relative' }}>
          <div
            style={{
              fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif",
              fontWeight: 800,
              fontSize: '2.4rem',
              color: INK,
              lineHeight: 1,
              letterSpacing: '-1px',
            }}
          >
            {currentTime}
          </div>
          <div
            style={{
              fontSize: '0.78rem',
              fontWeight: 700,
              marginTop: 3,
              color: MUTED,
              fontFamily: "'Instrument Sans', sans-serif",
              letterSpacing: '0.2px',
            }}
          >
            {currentDate}
          </div>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: '0.82rem',
              fontWeight: 500,
              color: MUTED,
              fontFamily: "'Instrument Sans', sans-serif",
            }}
          >
            {greeting},{' '}
            <span style={{ color: INK, fontWeight: 800 }}>{username || 'Student'}</span> 👋
          </p>

          {/* Sync + AI buttons */}
          <div
            style={{
              position: 'absolute',
              top: 4,
              right: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              zIndex: 20,
            }}
          >
            {onSync && (
              <motion.button
                onClick={async () => {
                  if (syncStatus !== 'idle') return;
                  setSyncStatus('loading');
                  const success = await onSync();
                  if (success) {
                    setSyncStatus('success');
                    setTimeout(() => setSyncStatus('idle'), 2500);
                  } else {
                    setSyncStatus('idle');
                  }
                }}
                whileTap={{ scale: 0.9 }}
                whileHover={syncStatus === 'idle' ? { scale: 1.08 } : {}}
                disabled={syncStatus !== 'idle'}
                title="Sync"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  border: `1.5px solid ${INK}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: syncStatus !== 'idle' ? 'default' : 'pointer',
                  background:
                    syncStatus === 'success'
                      ? HL_GREEN
                      : syncStatus === 'loading'
                      ? `${INK}15`
                      : CARD_BG,
                  boxShadow: `2px 3px 0 ${INK}`,
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <AnimatePresence mode="wait">
                  {syncStatus === 'loading' ? (
                    <motion.div
                      key="l"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{
                        width: 14,
                        height: 14,
                        border: `2px solid ${INK}30`,
                        borderTopColor: INK,
                        borderRadius: '50%',
                        animation: 'spin 0.7s linear infinite',
                      }}
                    />
                  ) : syncStatus === 'success' ? (
                    <motion.div
                      key="s"
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.4, opacity: 0 }}
                      transition={{ type: 'spring', damping: 14 }}
                    >
                      <Check size={15} color={INK} strokeWidth={3} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="i"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <Save size={15} color={INK} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            )}

            {/* AI button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.08, rotate: 8 }}
              onClick={() => onNavigate('ai')}
              title="AI Assistant"
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: `1.5px solid ${INK}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                background: HL_YELLOW,
                boxShadow: `2px 3px 0 ${INK}`,
              }}
            >
              <Sparkles size={15} color={INK} />
            </motion.button>
          </div>
        </motion.div>

        <div className="flex flex-col gap-3">
          {/* ── Main event card ── */}
          {renderEventCard(mainCardEvent, isHappeningNow ? 'Happening Now' : 'Up Next', isHappeningNow)}

          {/* ── Next-up strip ── */}
          {showNextUpTab && nextEvent && (
            <motion.div
              variants={fadeUp}
              whileHover={{ x: 3, boxShadow: `6px 7px 0 ${INK}` }}
              whileTap={{ x: 1 }}
              onClick={() => onEventClick(nextEvent)}
              style={{
                ...card,
                background: `${HL_BLUE}35`,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    background: HL_BLUE,
                    border: `1.5px solid ${INK}`,
                    borderRadius: 8,
                    padding: '5px 6px',
                    display: 'flex',
                  }}
                >
                  <ArrowRight size={13} color={INK} />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '0.58rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.8px',
                      color: MUTED,
                      fontFamily: "'Instrument Sans', sans-serif",
                    }}
                  >
                    Then
                  </div>
                  <div
                    style={{
                      fontSize: '0.87rem',
                      fontWeight: 700,
                      color: INK,
                      fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif",
                    }}
                  >
                    {nextEvent.title}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: INK,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontFamily: "'Space Mono', monospace",
                  }}
                >
                  <Clock size={10} color={INK} /> {to12h(nextEvent.startTime)}
                </div>
                {nextEvent.location && (
                  <div
                    style={{
                      fontSize: '0.65rem',
                      color: MUTED,
                      fontFamily: "'Instrument Sans', sans-serif",
                    }}
                  >
                    {nextEvent.location}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── App tiles grid ── */}
          <div className="grid grid-cols-2 gap-2">
            <AppTile
              onClick={() => onNavigate('gym')}
              icon={<Dumbbell size={16} color={INK} />}
              label="Gym"
              sub="Train & Track"
              tintColor={HL_BLUE}
            />
            <AppTile
              onClick={() => onNavigate('grades')}
              icon={<Calculator size={16} color={INK} />}
              label="Grades"
              sub="GPA Calculator"
              tintColor={HL_GREEN}
            />
            <AppTile
              onClick={() => onNavigate('todo')}
              icon={<CheckSquare size={16} color={INK} />}
              label="To-Do"
              sub="Task Manager"
              tintColor={HL_PINK}
            />

            {/* Add Event + Smart Import */}
            <div className="flex gap-2">
              <motion.button
                variants={fadeUp}
                whileHover={{ y: -3, boxShadow: `6px 8px 0 ${INK}` }}
                whileTap={{ y: 2, boxShadow: `2px 3px 0 ${INK}` }}
                onClick={onAddEventClick}
                style={{
                  ...card,
                  flex: 1,
                  minHeight: 82,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  cursor: 'pointer',
                  background: `${HL_YELLOW}40`,
                  padding: 10,
                }}
              >
                <div
                  style={{
                    background: HL_YELLOW,
                    border: `1.5px solid ${INK}`,
                    borderRadius: 8,
                    padding: '5px 6px',
                    display: 'flex',
                  }}
                >
                  <Plus size={14} color={INK} />
                </div>
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: INK,
                    fontFamily: "'Instrument Sans', sans-serif",
                    textAlign: 'center',
                  }}
                >
                  Add Event
                </span>
              </motion.button>

              <motion.button
                variants={fadeUp}
                whileHover={{ y: -3, boxShadow: `6px 8px 0 ${INK}` }}
                whileTap={{ y: 2, boxShadow: `2px 3px 0 ${INK}` }}
                onClick={onSmartImportClick}
                style={{
                  ...card,
                  flex: 1,
                  minHeight: 82,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  cursor: 'pointer',
                  background: `${HL_PINK}40`,
                  padding: 10,
                }}
              >
                <div
                  style={{
                    background: HL_PINK,
                    border: `1.5px solid ${INK}`,
                    borderRadius: 8,
                    padding: '5px 6px',
                    display: 'flex',
                  }}
                >
                  <Brain size={14} color={INK} />
                </div>
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: INK,
                    fontFamily: "'Instrument Sans', sans-serif",
                    textAlign: 'center',
                  }}
                >
                  Smart Import
                </span>
              </motion.button>
            </div>
          </div>

          {/* ── Quick Notes ── */}
          <motion.div variants={fadeUp}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 8,
                paddingLeft: 2,
              }}
            >
              <StickyNote size={14} color={INK} />
              <h3
                style={{
                  margin: 0,
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  color: INK,
                  fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif",
                }}
              >
                Quick Notes
              </h3>
            </div>
            <div
              style={{
                ...card,
                overflow: 'hidden',
                background: CARD_BG,
              }}
            >
              <textarea
                value={quickNotes}
                onChange={handleNotesChange}
                placeholder="Jot down quick reminders here…"
                style={{
                  width: '100%',
                  minHeight: 90,
                  background: 'transparent',
                  /* lined paper effect */
                  backgroundImage: `repeating-linear-gradient(
                    to bottom,
                    transparent,
                    transparent 27px,
                    rgba(26,23,48,0.12) 27px,
                    rgba(26,23,48,0.12) 28px
                  )`,
                  border: 'none',
                  outline: 'none',
                  padding: '8px 12px',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                  fontSize: '0.82rem',
                  lineHeight: '28px',
                  color: INK,
                  fontFamily: "'Instrument Sans', 'Inter', sans-serif",
                  fontWeight: 500,
                }}
              />
            </div>
          </motion.div>

          {/* ── Upcoming Tests ── */}
          <motion.div variants={fadeUp}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 8,
                paddingLeft: 2,
              }}
            >
              <ClipboardList size={14} color={INK} />
              <h3
                style={{
                  margin: 0,
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  color: INK,
                  fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif",
                }}
              >
                Upcoming Tests
              </h3>
            </div>

            {upcomingDeadlines.length > 0 ? (
              <div className="flex flex-col gap-2">
                {upcomingDeadlines.map((task, i) => {
                  const accentColor =
                    eventTypeBorders[task.type] || HL_ORANGE;
                  const slotName = getSlotName(task.startTime);
                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05, ease: EASE }}
                      whileHover={{ x: 3, boxShadow: `6px 7px 0 ${INK}` }}
                      whileTap={{ x: 1 }}
                      onClick={() => onEventClick(task)}
                      style={{
                        ...card,
                        borderLeft: `4px solid ${accentColor}`,
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        background: `${accentColor}22`,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: '0.58rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.8px',
                            color: accentColor,
                            marginBottom: 2,
                            fontFamily: "'Instrument Sans', sans-serif",
                          }}
                        >
                          {task.type}
                        </div>
                        <div
                          style={{
                            fontSize: '0.87rem',
                            fontWeight: 700,
                            color: INK,
                            fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif",
                          }}
                        >
                          {task.title}
                        </div>
                        <div
                          style={{
                            fontSize: '0.7rem',
                            color: MUTED,
                            fontFamily: "'Instrument Sans', sans-serif",
                          }}
                        >
                          {task.code}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div>
                          <div
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: INK,
                              fontFamily: "'Space Mono', monospace",
                            }}
                          >
                            {new Date(task.date || '').toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </div>
                          <div
                            style={{
                              fontSize: '0.65rem',
                              color: MUTED,
                              marginTop: 2,
                              fontFamily: "'Space Mono', monospace",
                            }}
                          >
                            {to12h(task.startTime)}
                          </div>
                          {slotName && (
                            <div
                              style={{
                                fontSize: '0.55rem',
                                marginTop: 2,
                                fontWeight: 700,
                                color: accentColor,
                                fontFamily: "'Instrument Sans', sans-serif",
                              }}
                            >
                              {slotName}
                            </div>
                          )}
                        </div>
                        <ChevronRight size={14} color={MUTED} />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div
                style={{
                  ...card,
                  background: `${HL_GREEN}30`,
                  padding: '14px',
                  textAlign: 'center',
                  fontSize: '0.82rem',
                  color: MUTED,
                  fontFamily: "'Instrument Sans', sans-serif",
                  fontWeight: 500,
                }}
              >
                No upcoming quizzes or exams. 🎯
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
