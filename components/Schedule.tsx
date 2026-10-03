
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Plus, Brain, ChevronDown, X, RotateCcw, Trash2, Download, MoreHorizontal } from 'lucide-react';
import { ScheduleEvent, EventColorMap, ScheduleProfile, PeriodDefinition } from '../types';
import { getLocalISOString } from '../constants';
import { theme, styles } from '../theme';
import SyncCalendarModal from './SyncCalendarModal';

// ─── Design tokens ────────────────────────────────────────────────────────────
const INK        = '#1A1730';
const PAPER_BG   = '#C7B2DB';
const CARD_BG    = '#FAFAF6';
const HL_YELLOW  = '#F6DF63';
const HL_GREEN   = '#8CE3B7';
const HL_BLUE    = '#9ECFFF';
const HL_RED     = '#E56A5A';
// ──────────────────────────────────────────────────────────────────────────────

interface ScheduleProps {
  events: ScheduleEvent[];
  profiles: ScheduleProfile[];
  activeProfileId: string;
  eventColors: EventColorMap;
  onProfileChange: (id: string) => void;
  onAddEventClick: () => void;
  onSmartImportClick: () => void;
  onClearScheduleClick: () => void;
  onEventClick: (event: ScheduleEvent) => void;
  onUpdateEvent?: (event: Partial<ScheduleEvent>) => void;
  periods: PeriodDefinition[];
}

const Schedule: React.FC<ScheduleProps> = ({ 
  events, 
  profiles, 
  activeProfileId, 
  eventColors,
  onProfileChange, 
  onAddEventClick,
  onSmartImportClick,
  onClearScheduleClick,
  onEventClick,
  onUpdateEvent,
  periods
}) => {
  const [expandedSlot, setExpandedSlot] = useState<ScheduleEvent[] | null>(null);
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  const [draggedOverCell, setDraggedOverCell] = useState<{ day: string, periodIdx: number } | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scheduleRef = useRef<HTMLDivElement>(null);

  const handleExportImage = async () => {
    if (!scheduleRef.current) return;
    try {
        const { toPng } = await import('html-to-image');
        const dataUrl = await toPng(scheduleRef.current, { 
            backgroundColor: CARD_BG,
            pixelRatio: 2,
            style: { overflow: 'visible' }
        });
        const link = document.createElement('a');
        link.download = 'unimate-schedule.png';
        link.href = dataUrl;
        link.click();
    } catch (err) {
        console.error("Export to image failed:", err);
    }
  };

  // Helper to get the Saturday of the current week (Start of academic week)
  const getSaturdayOfWeek = (d: Date) => {
    const date = new Date(d);
    date.setHours(0, 0, 0, 0); // Normalize time to midnight for accurate comparison
    const day = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    
    // We want Sat (6) to be our "0 index" or start of week logic for the grid.
    // If today is Sat (6), diff is 0.
    // If today is Sun (0), diff is 1.
    // If today is Fri (5), diff is 6.
    
    const diff = (day + 1) % 7;
    date.setDate(date.getDate() - diff);
    return date;
  };

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    return getSaturdayOfWeek(new Date());
  });

  useEffect(() => {
    // Scroll to current time slot on mount
    if (scrollContainerRef.current) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTimeVal = currentHour + currentMinute / 60;

      // Find the period that encompasses the current time, or the closest one
      let targetPeriodIndex = 0;
      for (let i = 0; i < periods.length; i++) {
        const p = periods[i];
        const [startH, startM] = p.startTime.split(':').map(Number);
        const [endH, endM] = p.endTime.split(':').map(Number);
        const startVal = startH + startM / 60;
        const endVal = endH + endM / 60;

        if (currentTimeVal >= startVal && currentTimeVal <= endVal) {
          targetPeriodIndex = i;
          break;
        } else if (currentTimeVal < startVal) {
          targetPeriodIndex = i;
          break;
        }
      }

      // Find current day index
      // days = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
      const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
      const dayMap: Record<number, number> = { 6: 0, 0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6 };
      const targetDayIndex = dayMap[dayOfWeek];

      // Calculate scroll position
      const slotWidth = 90; // Approximate width of a period column
      const slotHeight = 72; // Approximate height of a day row
      const containerWidth = scrollContainerRef.current.clientWidth;
      const containerHeight = scrollContainerRef.current.clientHeight;

      // 54px is the width of the day column, 45px is the height of the header row
      const scrollLeft = Math.max(0, (targetPeriodIndex * slotWidth) + 54 - (containerWidth / 2) + (slotWidth / 2));
      const scrollTop = Math.max(0, (targetDayIndex * slotHeight) + 45 - (containerHeight / 2) + (slotHeight / 2));

      scrollContainerRef.current.scrollTo({
        left: scrollLeft,
        top: scrollTop,
        behavior: 'smooth'
      });
    }
  }, [periods]);

  const actualCurrentWeekStart = getSaturdayOfWeek(new Date());
  const isCurrentWeek = currentWeekStart.getTime() === actualCurrentWeekStart.getTime();

  const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  const handleNavWeek = (direction: 'prev' | 'next') => {
    setCurrentWeekStart(prev => addDays(prev, direction === 'next' ? 7 : -7));
  };

  const handleReturnToCurrentWeek = () => {
    if (navigator.vibrate) navigator.vibrate(10);
    setCurrentWeekStart(actualCurrentWeekStart);
  };

  const to12h = (time24: string) => {
    if (!time24 || typeof time24 !== 'string' || !time24.includes(':')) return "";
    try {
        const [h, m] = time24.split(":").map(Number);
        if (isNaN(h) || isNaN(m)) return "";
        const period = h >= 12 ? "PM" : "AM";
        const h12 = h % 12 || 12;
        return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
    } catch (e) {
        return "";
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getEventPeriodIndex = (timeStr: string): number => {
    if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) return -1;
    try {
        const [h, m] = timeStr.split(':').map(Number);
        if (isNaN(h) || isNaN(m)) return -1;
        const val = h + m/60;
        let closestIdx = -1;
        let minDiff = 100;
        periods.forEach((p, idx) => {
          if (p.isBreak) return;
          // Default to 0 if startVal is undefined (fallback)
          const pVal = p.startVal || 0;
          const diff = Math.abs(val - pVal);
          if (diff < minDiff) { minDiff = diff; closestIdx = idx; }
        });
        return closestIdx;
    } catch (e) {
        return -1;
    }
  };

  const getContrastColor = (hex: string) => {
    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return yiq >= 128 ? '#000000' : '#ffffff';
  };

  // --- DRAG AND DROP HANDLERS ---

  const handleDragStart = (e: React.DragEvent, event: ScheduleEvent) => {
    setDraggedEventId(event.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', event.id);
    
    // Set a drag image or just let it be
  };

  const handleDragEnd = () => {
    setDraggedEventId(null);
    setDraggedOverCell(null);
  };

  const handleDragOver = (e: React.DragEvent, day: string, periodIdx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedOverCell?.day !== day || draggedOverCell?.periodIdx !== periodIdx) {
        setDraggedOverCell({ day, periodIdx });
    }
  };

  const handleDrop = (e: React.DragEvent, dayName: string, dateStr: string, periodIndex: number) => {
    e.preventDefault();
    setDraggedEventId(null);
    setDraggedOverCell(null);
    const eventId = e.dataTransfer.getData('text/plain');
    
    // Find valid period time
    const targetPeriod = periods[periodIndex];
    if (!targetPeriod || !onUpdateEvent) return;

    // Call update
    onUpdateEvent({
      id: eventId,
      dayOfWeek: dayName,
      date: dateStr, // Update specific date too if it's a non-recurring event being moved
      startTime: targetPeriod.startTime
    });
  };

  // Helper to render a single event card
  const renderEventCard = (ev: ScheduleEvent, isSmall: boolean = false) => {
       const bg = eventColors[ev.type] || '#64748b';
       const txtColor = getContrastColor(bg);
       const isDragging = draggedEventId === ev.id;
       const titleSize = isSmall ? '0.7rem' : '0.8rem';
       const padding = isSmall ? '6px' : '8px';
       
       return (
       <div 
         key={ev.id} 
         draggable={true}
         onDragStart={(e) => handleDragStart(e, ev)}
         onDragEnd={handleDragEnd}
         onClick={() => onEventClick(ev)} 
         style={{
           backgroundColor: bg,
           color: txtColor,
           marginBottom: 0,
           height: '100%',
           width: '100%',
           padding: padding,
           display: 'flex',
           flexDirection: 'column',
           position: 'relative',
           justifyContent: 'flex-start',
           opacity: isDragging ? 0.4 : 1,
           cursor: isDragging ? 'grabbing' : (isSmall ? 'pointer' : 'grab'),
           transform: isDragging ? 'scale(0.95)' : 'scale(1)',
           transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
           /* Paper & Highlighter depth — keep event's own color, add INK border + shadow */
           border: `1.5px solid ${INK}`,
           borderRadius: '8px',
           boxShadow: isDragging
             ? `4px 5px 0 ${INK}`
             : `2px 3px 0 ${INK}`,
           zIndex: isDragging ? 50 : 1,
           fontFamily: "'Instrument Sans', 'Inter', sans-serif",
         }}
       >
         {/* Title (Course Name) */}
         <div style={{
             fontWeight: 800, 
             fontSize: titleSize, 
             lineHeight: '1.2', 
             marginBottom: '2px',
             whiteSpace: 'nowrap', 
             overflow: 'hidden', 
             textOverflow: 'ellipsis', 
             width: '95%',
             fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif",
         }}>
            {ev.title}
         </div>
         
         {/* Course Code */}
         {ev.code && (
             <div style={{
                 fontSize: isSmall ? '0.6rem' : '0.65rem', 
                 fontWeight: 600, 
                 opacity: 0.85,
                 whiteSpace: 'nowrap', 
                 overflow: 'hidden', 
                 textOverflow: 'ellipsis'
             }}>
                 {ev.code}
             </div>
         )}
         
         {/* Location - Pushed to bottom left */}
         {ev.location && (
             <div style={{
                 fontSize: isSmall ? '0.6rem' : '0.65rem', 
                 fontWeight: 600, 
                 display: 'flex', 
                 alignItems: 'center', 
                 gap: '4px',
                 marginTop: 'auto',
                 paddingTop: '6px',
                 opacity: 0.95,
                 maxWidth: '60%' // Prevent overlap with badge
             }}>
                 <MapPin size={isSmall ? 9 : 11} style={{flexShrink: 0}} /> 
                 <span style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{ev.location}</span>
             </div>
         )}

         {/* Event Type - Bottom Right */}
         <div style={{
             position: 'absolute',
             bottom: padding,
             right: padding,
             padding: '2px 6px', 
             borderRadius: '5px', 
             backgroundColor: 'rgba(0,0,0,0.18)', 
             fontSize: '0.45rem', 
             fontWeight: 800, 
             textTransform: 'uppercase',
             letterSpacing: '0.5px',
             maxWidth: '35%',
             whiteSpace: 'nowrap',
             overflow: 'hidden',
             textOverflow: 'ellipsis',
             zIndex: 2
         }}>
            {ev.type}
         </div>
       </div>
     );
  };

  const days = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const weekEnd = addDays(currentWeekStart, 6);

  // Reduced size grid calculation: 54px header, 13px breaks
  const gridTemplateColumns = `54px ${periods.map(p => p.isBreak ? '13px' : '1fr').join(' ')}`;

  return (
    <div style={{height: "100%", display: "flex", flexDirection: "column", padding: "10px 10px 100px 10px", overflow: "hidden", background: 'transparent'}}>

      {/* ── Toolbar card ──────────────────────────────────────────────────── */}
      <div style={{
        background: CARD_BG,
        border: `1.5px solid ${INK}`,
        borderRadius: '12px',
        boxShadow: `3px 4px 0 ${INK}`,
        padding: '12px 14px',
        marginBottom: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '8px',
      }}>
        {/* Left: title + profile selector + week nav */}
        <div style={{display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: 0}}>
          {/* Row 1: Title + profile */}
          <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
            <h1 style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: 800,
              color: INK,
              fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif",
              letterSpacing: '-0.3px',
            }}>Schedule</h1>

            {/* Profile selector */}
            <div style={{position: 'relative'}}>
              <select
                value={activeProfileId}
                onChange={(e) => onProfileChange(e.target.value)}
                style={{
                  appearance: 'none',
                  background: `rgba(26,23,48,0.06)`,
                  border: `1.5px solid ${INK}`,
                  color: INK,
                  fontSize: '0.78rem',
                  padding: '5px 24px 5px 10px',
                  borderRadius: '8px',
                  outline: 'none',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: "'Instrument Sans', 'Inter', sans-serif",
                }}
              >
                {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <ChevronDown size={13} style={{position: 'absolute', right: '7px', top: '50%', transform: 'translateY(-50%)', color: INK, pointerEvents: 'none'}} />
            </div>
          </div>

          {/* Row 2: Week navigation */}
          <div style={{display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap'}}>
            {/* Prev week */}
            <button
              onClick={() => handleNavWeek('prev')}
              style={{
                background: `rgba(26,23,48,0.07)`,
                border: `1.5px solid ${INK}`,
                borderRadius: '8px',
                padding: '4px 6px',
                color: INK,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
              }}
            >
              <ChevronLeft size={16}/>
            </button>

            {/* Date range label */}
            <span style={{
              fontSize: '0.82rem',
              color: `rgba(26,23,48,0.65)`,
              fontWeight: 600,
              letterSpacing: '0.3px',
              fontFamily: "'Instrument Sans', 'Inter', sans-serif",
            }}>
              {formatDate(currentWeekStart)} – {formatDate(weekEnd)}
            </span>

            {/* Next week */}
            <button
              onClick={() => handleNavWeek('next')}
              style={{
                background: `rgba(26,23,48,0.07)`,
                border: `1.5px solid ${INK}`,
                borderRadius: '8px',
                padding: '4px 6px',
                color: INK,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
              }}
            >
              <ChevronRight size={16}/>
            </button>

            {/* Return to current week */}
            {!isCurrentWeek && (
              <button
                onClick={handleReturnToCurrentWeek}
                style={{
                  background: `${HL_YELLOW}55`,
                  border: `1.5px solid ${INK}`,
                  borderRadius: '8px',
                  padding: '4px 9px',
                  color: INK,
                  cursor: 'pointer',
                  fontSize: '0.73rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontFamily: "'Instrument Sans', 'Inter', sans-serif",
                  animation: 'fadeIn 0.2s',
                }}
              >
                <RotateCcw size={12} /> Current Week
              </button>
            )}
          </div>
        </div>

        {/* Right: actions menu button */}
        <div style={{position: 'relative', flexShrink: 0}}>
          <button
            onClick={() => setIsActionsMenuOpen(!isActionsMenuOpen)}
            style={{
              background: isActionsMenuOpen ? INK : `rgba(26,23,48,0.07)`,
              border: `1.5px solid ${INK}`,
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isActionsMenuOpen ? CARD_BG : INK,
              cursor: 'pointer',
              boxShadow: isActionsMenuOpen ? `2px 2px 0 ${INK}` : `3px 3px 0 ${INK}`,
              transition: 'all 0.15s',
            }}
            title="Actions"
          >
            <MoreHorizontal size={18} />
          </button>

          {isActionsMenuOpen && (
            <>
              <div className="fixed inset-0 z-[1999]" onClick={() => setIsActionsMenuOpen(false)} />
              <div style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 6px)',
                width: '192px',
                background: CARD_BG,
                border: `1.5px solid ${INK}`,
                borderRadius: '12px',
                boxShadow: `5px 6px 0 ${INK}`,
                zIndex: 2000,
                overflow: 'hidden',
                paddingTop: '4px',
                paddingBottom: '4px',
              }}>
                {/* Add Event */}
                <button
                  onClick={() => { onAddEventClick(); setIsActionsMenuOpen(false); }}
                  style={menuItemStyle}
                  onMouseEnter={e => (e.currentTarget.style.background = `${HL_YELLOW}55`)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <Plus size={15} style={{color: INK, flexShrink: 0}} /> Add Event
                </button>

                {/* Smart Import */}
                <button
                  onClick={() => { onSmartImportClick(); setIsActionsMenuOpen(false); }}
                  style={menuItemStyle}
                  onMouseEnter={e => (e.currentTarget.style.background = `${HL_YELLOW}55`)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <Brain size={15} style={{color: INK, flexShrink: 0}} /> Smart Import
                </button>

                {/* Export ICS */}
                <button
                  onClick={() => { setIsSyncModalOpen(true); setIsActionsMenuOpen(false); }}
                  style={menuItemStyle}
                  onMouseEnter={e => (e.currentTarget.style.background = `${HL_YELLOW}55`)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <Download size={15} style={{color: INK, flexShrink: 0}} /> Export (ICS)
                </button>

                {/* Export Image */}
                <button
                  onClick={() => { handleExportImage(); setIsActionsMenuOpen(false); }}
                  style={menuItemStyle}
                  onMouseEnter={e => (e.currentTarget.style.background = `${HL_YELLOW}55`)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <Download size={15} style={{color: INK, flexShrink: 0}} /> Export (Image)
                </button>

                {/* Divider */}
                <div style={{height: '1px', background: `rgba(26,23,48,0.12)`, margin: '4px 0'}} />

                {/* Clear Schedule */}
                <button
                  onClick={() => { onClearScheduleClick(); setIsActionsMenuOpen(false); }}
                  style={{...menuItemStyle, color: HL_RED}}
                  onMouseEnter={e => (e.currentTarget.style.background = `${HL_RED}22`)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <Trash2 size={15} style={{color: HL_RED, flexShrink: 0}} /> Clear Schedule
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Schedule grid wrapper ──────────────────────────────────────────── */}
      <div
        ref={scrollContainerRef}
        style={{
          flex: 1,
          overflow: 'auto',
          background: CARD_BG,
          border: `1.5px solid ${INK}`,
          borderRadius: '10px',
          boxShadow: `4px 6px 0 ${INK}`,
          /* Ruled lines on scroll area */
          backgroundImage: `repeating-linear-gradient(
            to bottom,
            transparent,
            transparent 71px,
            rgba(26,23,48,0.08) 71px,
            rgba(26,23,48,0.08) 72px
          )`,
        }}
      >
        <div
          ref={scheduleRef}
          style={{
            display: 'grid',
            gridTemplateColumns: gridTemplateColumns,
            minWidth: periods.length * 80 + 'px',
          }}
        >
          {/* ── Period header row ── */}
          {/* Top-left corner cell */}
          <div style={cornerCellStyle} />

          {periods.map((p, _i) =>
            p.isBreak ? (
              <div key={p.id} style={breakHeaderStyle}>{p.label}</div>
            ) : (
              <div key={p.id} style={periodHeaderCellStyle}>
                <span style={{
                  color: INK,
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                  fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif",
                  marginBottom: '2px',
                }}>
                  {p.label}
                </span>
                <span style={{
                  color: `rgba(26,23,48,0.6)`,
                  fontSize: '0.58rem',
                  fontWeight: 600,
                  fontFamily: "'Instrument Sans', 'Inter', sans-serif",
                }}>
                  {to12h(p.startTime || "")} – {to12h(p.endTime || "")}
                </span>
              </div>
            )
          )}

          {/* ── Day rows ── */}
          {days.map((dayName, dayIndex) => {
            const rowDate = addDays(currentWeekStart, dayIndex);
            const rowDateStr = getLocalISOString(rowDate);
            const isToday = getLocalISOString() === rowDateStr;

            const todayRowBg = isToday ? `${HL_YELLOW}30` : 'transparent';

            return (
              <React.Fragment key={dayName}>
                {/* Day label cell */}
                <div style={{
                  ...dayCellStyle,
                  background: isToday ? `${HL_YELLOW}55` : CARD_BG,
                  borderLeft: isToday ? `3px solid ${INK}` : `1px solid rgba(26,23,48,0.12)`,
                  color: INK,
                }}>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif",
                    color: isToday ? INK : `rgba(26,23,48,0.75)`,
                  }}>
                    {dayName.slice(0, 3)}
                  </span>
                  <span style={{
                    fontSize: '0.58rem',
                    fontWeight: 600,
                    color: `rgba(26,23,48,0.5)`,
                    fontFamily: "'Instrument Sans', 'Inter', sans-serif",
                    marginTop: '2px',
                  }}>
                    {formatDate(rowDate)}
                  </span>
                </div>

                {/* Period cells in this row */}
                {periods.map((p, pIdx) => {
                  if (p.isBreak) return (
                    <div key={`${dayName}-${p.id}`} style={{
                      ...breakCellStyle,
                      background: isToday ? `${HL_YELLOW}22` : 'transparent',
                    }} />
                  );

                  const cellEvents = events.filter(e => {
                    if (e.scheduleId !== activeProfileId) return false;
                    const isCorrectPeriod = getEventPeriodIndex(e.startTime) === pIdx;
                    if (!isCorrectPeriod) return false;
                    if (e.isRecurring && e.dayOfWeek === dayName) return true;
                    if (!e.isRecurring && e.date === rowDateStr) return true;
                    return false;
                  });

                  const isDraggedOver = draggedOverCell?.day === dayName && draggedOverCell?.periodIdx === pIdx;

                  return (
                    <div
                      key={`${dayName}-${p.id}`}
                      style={{
                        padding: '3px',
                        minHeight: '72px',
                        background: isDraggedOver
                          ? `${HL_BLUE}55`
                          : isToday
                            ? `${HL_YELLOW}22`
                            : CARD_BG,
                        borderTop: `1px solid rgba(26,23,48,0.08)`,
                        borderLeft: `1px solid rgba(26,23,48,0.08)`,
                        boxShadow: isDraggedOver
                          ? `inset 0 0 0 2px ${INK}`
                          : 'none',
                        transition: 'all 0.15s',
                        zIndex: isDraggedOver ? 10 : undefined,
                      }}
                      onDragOver={(e) => handleDragOver(e, dayName, pIdx)}
                      onDrop={(e) => handleDrop(e, dayName, rowDateStr, pIdx)}
                    >
                      {cellEvents.length > 0 && (
                        cellEvents.length === 1 ? (
                          renderEventCard(cellEvents[0])
                        ) : (
                          <div style={{display: 'flex', gap: '3px', width: '100%', height: '100%'}}>
                            <div style={{flex: 1, minWidth: 0}}>
                              {renderEventCard(cellEvents[0], true)}
                            </div>
                            {/* Overflow badge */}
                            <div
                              onClick={(e) => { e.stopPropagation(); setExpandedSlot(cellEvents); }}
                              style={{
                                width: '22px',
                                borderRadius: '7px',
                                background: `rgba(26,23,48,0.08)`,
                                border: `1.5px solid ${INK}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: INK,
                                fontWeight: 800,
                                fontSize: '0.62rem',
                                flexShrink: 0,
                                transition: 'background 0.15s',
                                fontFamily: "'Space Mono', monospace",
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = `${HL_YELLOW}88`}
                              onMouseLeave={e => e.currentTarget.style.background = `rgba(26,23,48,0.08)`}
                            >
                              +{cellEvents.length - 1}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ── Expanded slot modal ───────────────────────────────────────────── */}
      {expandedSlot && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(26,23,48,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
          }}
          onClick={() => setExpandedSlot(null)}
        >
          <div
            style={{
              background: CARD_BG,
              border: `1.5px solid ${INK}`,
              borderRadius: '14px',
              boxShadow: `8px 10px 0 ${INK}`,
              padding: '20px',
              width: '90%',
              maxWidth: '320px',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px'}}>
              <h3 style={{
                margin: 0,
                fontSize: '1rem',
                fontWeight: 800,
                color: INK,
                fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif",
              }}>
                Time Slot Events
              </h3>
              <button
                onClick={() => setExpandedSlot(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: `rgba(26,23,48,0.5)`,
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={18}/>
              </button>
            </div>

            {/* Event list */}
            <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
              {expandedSlot.map(ev => {
                const bg = eventColors[ev.type] || '#64748b';
                const txtColor = getContrastColor(bg);
                return (
                  <div
                    key={ev.id}
                    onClick={() => { setExpandedSlot(null); onEventClick(ev); }}
                    style={{
                      backgroundColor: bg,
                      border: `1.5px solid ${INK}`,
                      borderRadius: '10px',
                      padding: '10px 12px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      boxShadow: `2px 3px 0 ${INK}`,
                      transition: 'transform 0.1s, box-shadow 0.1s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.transform = 'translate(-1px,-1px)';
                      (e.currentTarget as HTMLDivElement).style.boxShadow = `3px 4px 0 ${INK}`;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.transform = '';
                      (e.currentTarget as HTMLDivElement).style.boxShadow = `2px 3px 0 ${INK}`;
                    }}
                  >
                    <div>
                      <div style={{
                        fontSize: '0.6rem',
                        fontWeight: 800,
                        opacity: 0.8,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        color: txtColor,
                        fontFamily: "'Instrument Sans', 'Inter', sans-serif",
                      }}>
                        {ev.type}
                      </div>
                      <div style={{
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        color: txtColor,
                        fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif",
                      }}>
                        {ev.title}
                      </div>
                      <div style={{fontSize: '0.75rem', opacity: 0.9, marginTop: '2px', color: txtColor}}>
                        {ev.location}
                      </div>
                    </div>
                    <div style={{
                      background: 'rgba(0,0,0,0.15)',
                      border: `1px solid rgba(0,0,0,0.2)`,
                      padding: '5px 8px',
                      borderRadius: '7px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: txtColor,
                      fontFamily: "'Space Mono', monospace",
                      whiteSpace: 'nowrap',
                    }}>
                      {to12h(ev.startTime)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <SyncCalendarModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        events={events}
      />
    </div>
  );
};

// ─── Shared style objects (defined outside component to avoid recreating) ────

const menuItemStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  textAlign: 'left',
  fontSize: '0.84rem',
  fontWeight: 600,
  color: '#1A1730',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  transition: 'background 0.12s',
  fontFamily: "'Instrument Sans', 'Inter', sans-serif",
};

/** Top-left corner empty cell */
const cornerCellStyle: React.CSSProperties = {
  background: '#C7B2DB',
  borderBottom: '1.5px solid #1A1730',
  borderRight: '1px solid rgba(26,23,48,0.15)',
  position: 'sticky',
  left: 0,
  top: 0,
  zIndex: 30,
};

/** Period header cells (top row, non-break) */
const periodHeaderCellStyle: React.CSSProperties = {
  background: '#C7B2DB',
  borderBottom: '1.5px solid #1A1730',
  borderLeft: '1px solid rgba(26,23,48,0.15)',
  padding: '6px 4px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'sticky',
  top: 0,
  zIndex: 20,
  textAlign: 'center',
};

/** Break header cell (narrow column in header row) */
const breakHeaderStyle: React.CSSProperties = {
  background: '#C7B2DB',
  borderBottom: '1.5px solid #1A1730',
  borderLeft: '1px solid rgba(26,23,48,0.12)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  writingMode: 'vertical-rl',
  fontSize: '0.5rem',
  fontWeight: 700,
  color: 'rgba(26,23,48,0.5)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  position: 'sticky',
  top: 0,
  zIndex: 20,
};

/** Day label cell (left-most column per row) */
const dayCellStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '6px 4px',
  minHeight: '72px',
  borderTop: '1px solid rgba(26,23,48,0.08)',
  position: 'sticky',
  left: 0,
  zIndex: 10,
};

/** Break cell body (per day row) */
const breakCellStyle: React.CSSProperties = {
  minHeight: '72px',
  borderTop: '1px solid rgba(26,23,48,0.08)',
  borderLeft: '1px solid rgba(26,23,48,0.08)',
};

export default Schedule;
