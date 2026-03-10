
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Plus, Brain, ChevronDown, X, RotateCcw, Trash2, GripVertical } from 'lucide-react';
import { ScheduleEvent, EventColorMap, ScheduleProfile, PeriodDefinition } from '../types';
import { getLocalISOString } from '../constants';
import { theme, styles } from '../theme';

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
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
    if (!time24) return "";
    const [h, m] = time24.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getEventPeriodIndex = (timeStr: string): number => {
    const [h, m] = timeStr.split(':').map(Number);
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
    if (e.dataTransfer.setDragImage && e.currentTarget instanceof HTMLElement) {
        // Optional: customize drag image
    }
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
           ...styles.eventCard, 
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
           boxShadow: isDragging ? '0 10px 25px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.15)',
           zIndex: isDragging ? 50 : 1
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
             width: '95%' 
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
             backgroundColor: 'rgba(0,0,0,0.2)', 
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
    <div style={{height: "100%", display: "flex", flexDirection: "column", padding: "10px 10px 100px 10px", overflowY: "auto"}}>
        <div style={{...styles.header, marginBottom: '10px'}}>
          <div>
             <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                <h1 style={styles.title}>Schedule</h1>
                <div style={{position: 'relative'}}>
                   <select value={activeProfileId} onChange={(e) => onProfileChange(e.target.value)} style={{appearance: 'none', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)', color: theme.text, fontSize: '0.8rem', padding: '6px 24px 6px 10px', borderRadius: '12px', outline: 'none', fontWeight: 600, cursor: 'pointer', backdropFilter: 'blur(10px)'}}>
                     {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                   </select>
                   <ChevronDown size={14} style={{position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', color: theme.textMuted, pointerEvents: 'none'}} />
                </div>
             </div>
             <div style={{display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px'}}>
                 <button onClick={() => handleNavWeek('prev')} style={{background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '4px', border: 'none', color: theme.text, cursor: 'pointer'}}><ChevronLeft size={18}/></button>
                 <span style={{fontSize: '0.85rem', color: theme.textMuted, fontWeight: 600, letterSpacing: '0.5px'}}>
                   {formatDate(currentWeekStart)} - {formatDate(weekEnd)}
                 </span>
                 <button onClick={() => handleNavWeek('next')} style={{background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '4px', border: 'none', color: theme.text, cursor: 'pointer'}}><ChevronRight size={18}/></button>
                 
                 {!isCurrentWeek && (
                    <button 
                        onClick={handleReturnToCurrentWeek}
                        style={{
                            background: 'rgba(139, 92, 246, 0.2)', 
                            border: '1px solid rgba(139, 92, 246, 0.4)', 
                            borderRadius: '8px', 
                            padding: '4px 8px', 
                            color: theme.accent, 
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginLeft: '8px',
                            animation: 'fadeIn 0.2s'
                        }}
                    >
                        <RotateCcw size={12} /> Current Week
                    </button>
                 )}
             </div>
          </div>
           <div style={{display: 'flex', gap: '8px'}}>
               <button 
                onClick={onClearScheduleClick}
                style={{
                    background: 'rgba(239, 68, 68, 0.15)', 
                    border: '1px solid rgba(239, 68, 68, 0.3)', 
                    borderRadius: '50%', 
                    width: '36px', 
                    height: '36px', 
                    padding: 0, 
                    justifyContent: 'center', 
                    display: 'flex',
                    alignItems: 'center',
                    color: theme.danger,
                    cursor: 'pointer',
                    boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
                    transition: 'all 0.2s'
                }}
                title="Clear Schedule"
               >
                <Trash2 size={16} />
               </button>
               <button 
                onClick={onSmartImportClick}
                style={{
                    background: 'rgba(139, 92, 246, 0.15)', 
                    border: '1px solid rgba(139, 92, 246, 0.3)', 
                    borderRadius: '50%', 
                    width: '36px', 
                    height: '36px', 
                    padding: 0, 
                    justifyContent: 'center', 
                    display: 'flex',
                    alignItems: 'center',
                    color: theme.accent,
                    cursor: 'pointer',
                    boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
                    transition: 'all 0.2s'
                }}
                title="Smart Import"
               >
                <Brain size={16} />
               </button>
               <button style={{...styles.button, borderRadius: '50%', width: '36px', height: '36px', padding: 0, justifyContent: 'center', boxShadow: '0 5px 15px rgba(0,0,0,0.3)'}} onClick={onAddEventClick}>
                <Plus size={16} />
               </button>
           </div>
        </div>

        <div ref={scrollContainerRef} style={{...styles.scheduleWrapper, maxHeight: 'calc(100vh - 150px)', borderRadius: '16px'}}>
            <div style={{...styles.scheduleContainer, gridTemplateColumns: gridTemplateColumns, minWidth: periods.length * 80 + 'px'}}>
             <div style={styles.scheduleHeaderCell}></div>
             {periods.map((p, i) => (
               p.isBreak ? <div key={p.id} style={styles.scheduleBreakHeader}>{p.label}</div> : 
                 <div key={p.id} style={styles.scheduleHeaderCell}>
                   <span style={{color: theme.accent, fontSize: "0.7rem", fontWeight: 800, textTransform: 'uppercase', marginBottom: '2px'}}>{p.label}</span>
                   <span style={{color: "rgba(255,255,255,0.7)", fontSize: "0.6rem", fontWeight: 600}}>
                     {to12h(p.startTime || "")} - {to12h(p.endTime || "")}
                   </span>
                 </div>
             ))}

             {days.map((dayName, dayIndex) => {
               const rowDate = addDays(currentWeekStart, dayIndex);
               const rowDateStr = getLocalISOString(rowDate);
               const isToday = getLocalISOString() === rowDateStr;
               const rowStyle = isToday ? { backgroundColor: `${theme.accent}1a` } : {};

               return (
                 <React.Fragment key={dayName}>
                   <div style={{...styles.scheduleDayCell, ...rowStyle, borderLeft: isToday ? `4px solid ${theme.accent}` : "none", color: isToday ? theme.accent : theme.text}}>
                     <span style={{fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: '0.5px'}}>{dayName.slice(0, 3)}</span>
                     <span style={styles.dateBadge}>{formatDate(rowDate)}</span>
                   </div>
                   {periods.map((p, pIdx) => {
                      if (p.isBreak) return <div key={`${dayName}-${p.id}`} style={{...styles.scheduleBreakCell, ...rowStyle}}></div>;
                      
                      const cellEvents = events.filter(e => {
                         if (e.scheduleId !== activeProfileId) return false;
                         const isCorrectPeriod = getEventPeriodIndex(e.startTime) === pIdx;
                         if (!isCorrectPeriod) return false;
                         if (e.isRecurring && e.dayOfWeek === dayName) return true;
                         if (!e.isRecurring && e.date === rowDateStr) return true;
                         return false;
                      });

                      const isDraggedOver = draggedOverCell?.day === dayName && draggedOverCell?.periodIdx === pIdx;
                      const cellHighlightStyle = isDraggedOver ? { 
                          backgroundColor: 'rgba(139, 92, 246, 0.2)',
                          boxShadow: 'inset 0 0 0 2px rgba(139, 92, 246, 0.5)',
                          zIndex: 10
                      } : {};

                      return (
                        <div 
                            key={`${dayName}-${p.id}`} 
                            style={{...styles.scheduleContentCell, ...rowStyle, ...cellHighlightStyle, transition: 'all 0.2s'}}
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
                                       <div 
                                           onClick={(e) => { e.stopPropagation(); setExpandedSlot(cellEvents); }}
                                           style={{
                                               width: '24px', 
                                               borderRadius: '7px', 
                                               backgroundColor: 'rgba(255,255,255,0.1)', 
                                               border: '1px solid rgba(255,255,255,0.1)', 
                                               display: 'flex', 
                                               alignItems: 'center', 
                                               justifyContent: 'center', 
                                               cursor: 'pointer', 
                                               color: '#fff', 
                                               fontWeight: 800, 
                                               fontSize: '0.65rem',
                                               flexShrink: 0,
                                               transition: 'background 0.2s',
                                               boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                                           }}
                                           onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'}
                                           onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
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

        {expandedSlot && (
            <div style={styles.modalOverlay} onClick={() => setExpandedSlot(null)}>
                <div style={{...styles.modalContent, width: '90%', maxWidth: '320px'}} onClick={e => e.stopPropagation()}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
                        <h3 style={{margin: 0, fontSize: '1rem', fontWeight: 800}}>Time Slot Events</h3>
                        <button onClick={() => setExpandedSlot(null)} style={{background: 'none', border: 'none', color: theme.textMuted, cursor: 'pointer'}}><X size={18}/></button>
                    </div>
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
                                        borderRadius: '10px', 
                                        padding: '10px', 
                                        cursor: 'pointer',
                                        display: 'flex', 
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                                    }}
                                 >
                                     <div>
                                         <div style={{fontSize: '0.65rem', fontWeight: 800, opacity: 0.8, textTransform: 'uppercase', color: txtColor}}>{ev.type}</div>
                                         <div style={{fontSize: '0.9rem', fontWeight: 700, color: txtColor}}>{ev.title}</div>
                                         <div style={{fontSize: '0.75rem', opacity: 0.9, marginTop: '2px', color: txtColor}}>{ev.location}</div>
                                     </div>
                                     <div style={{background: 'rgba(0,0,0,0.2)', padding: '5px 8px', borderRadius: '7px', fontSize: '0.75rem', fontWeight: 600, color: txtColor}}>
                                         {to12h(ev.startTime)}
                                     </div>
                                 </div>
                             )
                        })}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Schedule;
