import React, { useState, useEffect } from 'react';
import { MapPin, Play, Pause, RotateCcw, Zap, ClipboardList, Clock, Calendar, ArrowRight } from 'lucide-react';
import { ScheduleEvent, EventColorMap } from '../types';
import { PERIODS, getLocalISOString } from '../constants';
import { theme, styles } from '../theme';

interface DashboardProps {
  events: ScheduleEvent[];
  eventColors: EventColorMap;
  onNavigate: (view: any) => void;
  onEventClick: (event: ScheduleEvent) => void;
  onAddEventClick: () => void;
}

const FocusTimer = () => {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft => timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(mode === 'focus' ? 25 * 60 : 5 * 60);
  };
  const switchMode = () => {
    setIsActive(false);
    const newMode = mode === 'focus' ? 'break' : 'focus';
    setMode(newMode);
    setTimeLeft(newMode === 'focus' ? 25 * 60 : 5 * 60);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div style={{...styles.card, background: "linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(99, 102, 241, 0.08))", border: "1px solid rgba(139, 92, 246, 0.15)"}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          <Zap size={18} color={mode === 'focus' ? theme.accent : '#34d399'} fill={mode === 'focus' ? theme.accent : '#34d399'} />
          <h3 style={{margin: 0, fontSize: '1rem'}}>{mode === 'focus' ? 'Focus Session' : 'Short Break'}</h3>
        </div>
        <button onClick={switchMode} style={{background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: theme.textMuted, borderRadius: '20px', padding: '4px 10px', fontSize: '0.7rem', cursor: 'pointer'}}>
          Switch
        </button>
      </div>
      
      <div style={{fontSize: '3.5rem', fontWeight: 800, textAlign: 'center', fontFamily: 'SF Pro Display, monospace', letterSpacing: '-2px', marginBottom: '16px', color: '#fff', textShadow: `0 0 30px ${theme.accent}3d`}}>
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </div>
      
      <div style={{display: 'flex', gap: '16px', justifyContent: 'center'}}>
        <button onClick={toggleTimer} style={{...styles.button, borderRadius: '50%', width: '54px', height: '54px', padding: 0, justifyContent: 'center', boxShadow: `0 10px 30px ${theme.accent}4d`}}>
          {isActive ? <Pause size={24} fill="white" /> : <Play size={24} fill="white" style={{marginLeft: '4px'}} />}
        </button>
        <button onClick={resetTimer} style={{...styles.secondaryButton, borderRadius: '50%', width: '54px', height: '54px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <RotateCcw size={20} />
        </button>
      </div>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ events, eventColors, onNavigate, onEventClick, onAddEventClick }) => {
  const [greeting, setGreeting] = useState("Good Morning");
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  
  useEffect(() => {
    const tick = () => {
        const now = new Date();
        const hours = now.getHours();
        
        if (hours >= 12) setGreeting("Good Afternoon");
        if (hours >= 18) setGreeting("Good Evening");
        else setGreeting("Good Morning");

        setCurrentTime(now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
        setCurrentDate(now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }));
    };
    tick();
    const timer = setInterval(tick, 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const to12h = (time24: string) => {
    if (!time24) return "";
    const [h, m] = time24.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
  };

  const getEndTime = (start: string, duration: number) => {
    const [h, m] = start.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    d.setMinutes(d.getMinutes() + duration);
    return d.toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit'});
  };

  const getSlotName = (startTime: string) => {
    if (!startTime) return "";
    const strictMatch = PERIODS.find(p => p.startTime === startTime);
    if (strictMatch) return `${strictMatch.label} Slot`;
    const [h, m] = startTime.split(':').map(Number);
    const val = h + m/60;
    const found = PERIODS.find(p => {
        if (p.isBreak || !p.startVal) return false;
        return Math.abs(val - p.startVal) < 0.01;
    });
    return found ? `${found.label} Slot` : "";
  };

  // Logic to determine "Current" and "Next" events using local time
  const now = new Date();
  const todayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const todayStr = getLocalISOString();
  const currentTimeVal = now.getHours() + now.getMinutes() / 60;

  const todayEvents = events
    .filter(e => e.dayOfWeek === todayName || e.date === todayStr)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Find event happening right now
  const currentEvent = todayEvents.find(e => {
    const [h, m] = e.startTime.split(':').map(Number);
    const startVal = h + m / 60;
    const endVal = startVal + (e.durationMinutes / 60);
    return currentTimeVal >= startVal && currentTimeVal < endVal;
  });

  // Find next event starting after now
  const nextEvent = todayEvents.find(e => {
    const [h, m] = e.startTime.split(':').map(Number);
    const startVal = h + m / 60;
    return startVal > currentTimeVal;
  });

  // If a class is happening now, it's the main card. 
  // If not, the upcoming class is the main card.
  const mainCardEvent = currentEvent || nextEvent;
  const isHappeningNow = !!currentEvent;
  
  // The small "Next Up" tab shows ONLY if we are currently busy (showing a current event)
  // AND there is another event after it.
  const showNextUpTab = isHappeningNow && nextEvent;

  const upcomingDeadlines = events
      .filter(e => e.type === 'quiz' || e.type === 'assignment' || e.type === 'exam')
      .filter(e => {
          const eventDate = e.date || todayStr; 
          if (eventDate > todayStr) return true;
          if (eventDate === todayStr && e.startTime > now.toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit'})) return true;
          return false;
      })
      .sort((a, b) => {
            const dateA = a.date || todayStr;
            const dateB = b.date || todayStr;
            if (dateA !== dateB) return dateA.localeCompare(dateB);
            return a.startTime.localeCompare(b.startTime);
      });

  const renderEventCard = (event: ScheduleEvent | undefined, title: string, isNow: boolean) => {
    const slotName = event ? getSlotName(event.startTime) : "";
    const color = event ? (eventColors[event.type] || theme.accent) : theme.cardBg;
    
    return (
    <div style={{
        ...styles.card, 
        flex: 1, 
        minHeight: '180px', 
        background: event ? `linear-gradient(135deg, ${color}99 0%, ${color}44 100%)` : "rgba(30,30,40,0.6)", // Solid background
        border: event ? `1px solid ${color}66` : theme.glassBorder,
        boxShadow: event ? `0 15px 40px ${color}33` : "none", 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden'
    }} onClick={() => event && onEventClick(event)}>
        {/* Animated Glow for "Happening Now" */}
        {isNow && (
            <div className="absolute top-0 right-0 p-3">
                <span className="flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                </span>
            </div>
        )}

        <div>
            <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px'}}>
                <h3 style={{margin: 0, color: "rgba(255,255,255,0.9)", textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "1.5px", fontWeight: 800}}>{title}</h3>
            </div>
            {event ? (
                <>
                    <h2 style={{fontSize: "1.8rem", margin: "0 0 8px 0", fontWeight: 800, lineHeight: 1.1, textShadow: "0 2px 10px rgba(0,0,0,0.3)"}}>{event.title}</h2>
                    <div style={{fontSize: '1rem', color: "rgba(255,255,255,0.9)", marginBottom: '10px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px'}}>
                        <span style={{background: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.8rem'}}>{event.code || 'No Code'}</span>
                        {event.group && <span style={{background: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.8rem'}}>Grp {event.group}</span>}
                    </div>
                </>
            ) : (
                <div style={{color: "rgba(255,255,255,0.5)", padding: "12px 0", fontSize: "1.1rem", fontWeight: 500}}>Nothing scheduled. Enjoy your free time!</div>
            )}
        </div>
        
        {event && (
            <div style={{display: "flex", gap: "8px", alignItems: "center", color: "#fff", flexWrap: 'wrap'}}>
                <div style={{display: "flex", flexDirection: "column", background: "rgba(0,0,0,0.4)", padding: "8px 14px", borderRadius: "14px", backdropFilter: "blur(10px)", border: '1px solid rgba(255,255,255,0.1)'}}>
                    <div style={{fontSize: "0.85rem", fontWeight: 800, color: '#fff', display: "flex", alignItems: 'center', gap: '6px', marginBottom: '2px'}}>
                            {slotName || "Event"}
                    </div>
                    <div style={{fontSize: "0.75rem", color: "rgba(255,255,255,0.8)", fontWeight: 600}}>
                        {to12h(event.startTime)} - {to12h(getEndTime(event.startTime, event.durationMinutes))}
                    </div>
                </div>

                {event.location && (
                    <div style={{display: "flex", alignItems: "center", gap: "6px", background: "rgba(0,0,0,0.4)", padding: "8px 12px", borderRadius: "14px", fontSize: "0.85rem", fontWeight: 600, backdropFilter: "blur(10px)", height: 'fit-content', alignSelf: 'center', border: '1px solid rgba(255,255,255,0.1)'}}>
                        <MapPin size={14} className="text-white/90" /> {event.location}
                    </div>
                )}
            </div>
        )}
    </div>
  )};

  return (
    <div style={styles.scrollableContent}>
        <div style={{marginBottom: "30px", paddingTop: '20px'}}>
             <div style={{fontSize: '3.5rem', fontWeight: 800, lineHeight: 1, letterSpacing: '-2px', background: `linear-gradient(to right, #fff, ${theme.textMuted})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>
                 {currentTime}
             </div>
             <div style={{fontSize: '1.2rem', fontWeight: 600, color: theme.accent, marginTop: '4px'}}>
                 {currentDate}
             </div>
             <p style={{...styles.subtitle, marginTop: '8px'}}>{greeting}</p>
        </div>

        <div style={{display: "flex", flexDirection: "column", gap: "20px"}}>
            
            {/* Main Card */}
            {renderEventCard(mainCardEvent, isHappeningNow ? "Happening Now" : "Up Next", isHappeningNow)}

            {/* Happening Next Small Tab - Only shown if busy now */}
            {showNextUpTab && nextEvent && (
                <div 
                    onClick={() => onEventClick(nextEvent)}
                    style={{
                        ...styles.card, 
                        margin: 0, 
                        padding: '16px', 
                        minHeight: 'auto', 
                        background: 'rgba(255,255,255,0.05)', 
                        border: '1px solid rgba(255,255,255,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer'
                    }}
                >
                    <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                        <div style={{background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '12px'}}>
                            <ArrowRight size={20} color={theme.accent} />
                        </div>
                        <div>
                            <div style={{fontSize: '0.7rem', textTransform: 'uppercase', color: theme.textMuted, fontWeight: 700, letterSpacing: '0.5px'}}>Then</div>
                            <div style={{fontSize: '1rem', fontWeight: 700, color: '#fff'}}>{nextEvent.title}</div>
                        </div>
                    </div>
                    <div style={{textAlign: 'right'}}>
                         <div style={{fontSize: '0.9rem', fontWeight: 600}}>{to12h(nextEvent.startTime)}</div>
                         <div style={{fontSize: '0.75rem', color: theme.textMuted}}>{nextEvent.location}</div>
                    </div>
                </div>
            )}

            <div>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', paddingLeft: '4px'}}>
                    <ClipboardList size={18} color={theme.accent} />
                    <h3 style={{margin: 0, fontSize: '1rem', fontWeight: 700}}>Upcoming Tests</h3>
                </div>
                {upcomingDeadlines.length > 0 ? (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                        {upcomingDeadlines.map(task => {
                            const color = eventColors[task.type] || '#64748b';
                            const slotName = getSlotName(task.startTime);
                            return (
                                <div key={task.id} 
                                    onClick={() => onEventClick(task)}
                                    style={{...styles.card, marginBottom: 0, minHeight: 'auto', padding: '16px', borderLeft: `4px solid ${color}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: 'rgba(30,30,40,0.6)'}}
                                >
                                    <div>
                                        <div style={{fontSize: '0.7rem', fontWeight: 700, color: color, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px'}}>{task.type}</div>
                                        <div style={{fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '4px'}}>{task.title}</div>
                                        <div style={{fontSize: '0.8rem', color: theme.textMuted}}>{task.code}</div>
                                    </div>
                                    <div style={{textAlign: 'right'}}>
                                        <div style={{fontSize: '0.9rem', fontWeight: 700, color: '#fff'}}>{new Date(task.date || "").toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}</div>
                                        <div style={{fontSize: '0.75rem', color: theme.textMuted, marginTop: '4px'}}>{to12h(task.startTime)}</div>
                                        {slotName && <div style={{fontSize: '0.65rem', color: theme.accent, marginTop: '2px', fontWeight: 600}}>{slotName}</div>}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div style={{padding: '20px', textAlign: 'center', color: theme.textMuted, background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: theme.glassBorder}}>
                        No upcoming quizzes or exams.
                    </div>
                )}
            </div>

            <FocusTimer />
        </div>
    </div>
  );
};

export default Dashboard;