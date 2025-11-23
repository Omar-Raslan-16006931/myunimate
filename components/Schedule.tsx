import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Plus, Brain, ChevronDown } from 'lucide-react';
import { ScheduleEvent, EventColorMap, ScheduleProfile } from '../types';
import { PERIODS, getLocalISOString } from '../constants';
import { theme, styles } from '../theme';

interface ScheduleProps {
  events: ScheduleEvent[];
  profiles: ScheduleProfile[];
  activeProfileId: string;
  eventColors: EventColorMap;
  onProfileChange: (id: string) => void;
  onAddEventClick: () => void;
  onEventClick: (event: ScheduleEvent) => void;
}

const Schedule: React.FC<ScheduleProps> = ({ 
  events, 
  profiles, 
  activeProfileId, 
  eventColors,
  onProfileChange, 
  onAddEventClick,
  onEventClick
}) => {
  // Helper to get the Saturday of the current week (Start of academic week)
  const getSaturdayOfWeek = (d: Date) => {
    const date = new Date(d);
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

  const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  const handleNavWeek = (direction: 'prev' | 'next') => {
    setCurrentWeekStart(prev => addDays(prev, direction === 'next' ? 7 : -7));
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
    PERIODS.forEach((p, idx) => {
      if (p.isBreak) return;
      const diff = Math.abs(val - (p.startVal || 0));
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

  const days = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
  const weekEnd = addDays(currentWeekStart, 5);

  return (
    <div style={{height: "100%", display: "flex", flexDirection: "column", padding: "20px 20px 100px 20px"}}>
        <div style={styles.header}>
          <div>
             <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                <h1 style={styles.title}>Schedule</h1>
                <div style={{position: 'relative'}}>
                   <select value={activeProfileId} onChange={(e) => onProfileChange(e.target.value)} style={{appearance: 'none', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)', color: theme.text, fontSize: '0.85rem', padding: '6px 24px 6px 10px', borderRadius: '12px', outline: 'none', fontWeight: 600, cursor: 'pointer', backdropFilter: 'blur(10px)'}}>
                     {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                   </select>
                   <ChevronDown size={14} style={{position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', color: theme.textMuted, pointerEvents: 'none'}} />
                </div>
             </div>
             <div style={{display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px'}}>
                 <button onClick={() => handleNavWeek('prev')} style={{background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '4px', border: 'none', color: theme.text, cursor: 'pointer'}}><ChevronLeft size={18}/></button>
                 <span style={{fontSize: '0.9rem', color: theme.textMuted, fontWeight: 600, letterSpacing: '0.5px'}}>
                   {formatDate(currentWeekStart)} - {formatDate(weekEnd)}
                 </span>
                 <button onClick={() => handleNavWeek('next')} style={{background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '4px', border: 'none', color: theme.text, cursor: 'pointer'}}><ChevronRight size={18}/></button>
             </div>
          </div>
           <button style={{...styles.button, borderRadius: '50%', width: '48px', height: '48px', padding: 0, justifyContent: 'center', boxShadow: '0 5px 15px rgba(0,0,0,0.3)'}} onClick={onAddEventClick}>
            <Plus size={24} />
           </button>
        </div>

        <div style={styles.scheduleWrapper}>
            <div style={styles.scheduleContainer}>
             <div style={styles.scheduleHeaderCell}></div>
             {PERIODS.map((p, i) => (
               p.isBreak ? <div key={i} style={styles.scheduleBreakHeader}>BREAK</div> : 
                 <div key={i} style={styles.scheduleHeaderCell}>
                   <span style={{color: theme.accent, fontSize: "0.75rem", fontWeight: 800, textTransform: 'uppercase', marginBottom: '2px'}}>{p.label} Slot</span>
                   <span style={{color: "rgba(255,255,255,0.7)", fontSize: "0.65rem", fontWeight: 600}}>
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
                     <span style={{fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: '0.5px'}}>{dayName.slice(0, 3)}</span>
                     <span style={styles.dateBadge}>{formatDate(rowDate)}</span>
                   </div>
                   {PERIODS.map((p, pIdx) => {
                      if (p.isBreak) return <div key={`${dayName}-${pIdx}`} style={{...styles.scheduleBreakCell, ...rowStyle}}></div>;
                      const cellEvents = events.filter(e => {
                         if (e.scheduleId !== activeProfileId) return false;
                         const isCorrectPeriod = getEventPeriodIndex(e.startTime) === pIdx;
                         if (!isCorrectPeriod) return false;
                         if (e.isRecurring && e.dayOfWeek === dayName) return true;
                         if (!e.isRecurring && e.date === rowDateStr) return true;
                         return false;
                      });

                      return (
                        <div key={`${dayName}-${pIdx}`} style={{...styles.scheduleContentCell, ...rowStyle}}>
                           {cellEvents.map(ev => {
                               const bg = eventColors[ev.type] || '#64748b';
                               const txtColor = getContrastColor(bg);
                               return (
                               <div 
                                 key={ev.id} 
                                 onClick={() => onEventClick(ev)} 
                                 style={{
                                   ...styles.eventCard, 
                                   backgroundColor: bg, 
                                   color: txtColor,
                                   marginBottom: cellEvents.length > 1 ? '4px' : '0' 
                                 }}
                               >
                                 {/* Flex layout for clearer content structure */}
                                 <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px'}}>
                                     <div style={{padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(0,0,0,0.25)', fontSize: '0.55rem', fontWeight: 800, textTransform: 'uppercase'}}>{ev.type}</div>
                                     {(ev.type === 'quiz' || ev.type === 'assignment' || ev.type === 'exam') && (
                                        <div style={{background: 'rgba(255,255,255,0.3)', borderRadius: '50%', padding: '2px', display: 'flex'}}>
                                            <Brain size={10} color={txtColor} />
                                        </div>
                                     )}
                                 </div>

                                 <div style={{fontWeight: 700, fontSize: '0.8rem', lineHeight: '1.1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '2px'}}>
                                    {ev.title}
                                 </div>
                                 
                                 <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.9}}>
                                     {ev.location && <div style={{fontSize: '0.65rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px'}}><MapPin size={9} /> {ev.location}</div>}
                                     {ev.code && <div style={{fontSize: '0.65rem', fontWeight: 500}}>{ev.code}</div>}
                                 </div>
                               </div>
                             )
                           })}
                        </div>
                      );
                   })}
                 </React.Fragment>
               );
             })}
          </div>
        </div>
    </div>
  );
};

export default Schedule;