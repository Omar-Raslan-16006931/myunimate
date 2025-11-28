
import React, { useState, useEffect } from 'react';
import { MapPin, ClipboardList, ArrowRight, Dumbbell, Calculator, Sparkles, Megaphone, X } from 'lucide-react';
import { ScheduleEvent, EventColorMap, PeriodDefinition, Announcement } from '../types';
import { getLocalISOString } from '../constants';
import { theme, styles } from '../theme';

interface DashboardProps {
  events: ScheduleEvent[];
  eventColors: EventColorMap;
  onNavigate: (view: any) => void;
  onEventClick: (event: ScheduleEvent) => void;
  onAddEventClick: () => void;
  periods: PeriodDefinition[];
  announcement: Announcement | null;
  username?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ events, eventColors, onNavigate, onEventClick, onAddEventClick, periods, announcement, username }) => {
  const [greeting, setGreeting] = useState("Good Morning");
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [dismissedAnnouncementId, setDismissedAnnouncementId] = useState(() => localStorage.getItem('dismissed_announcement_id'));

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
    const timer = setInterval(tick, 60000); 
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
    const strictMatch = periods.find(p => p.startTime === startTime);
    if (strictMatch) return `${strictMatch.label}`;
    
    // Fuzzy matching
    const [h, m] = startTime.split(':').map(Number);
    const val = h + m/60;
    const found = periods.find(p => {
        if (p.isBreak || !p.startVal) return false;
        return Math.abs(val - p.startVal) < 0.01;
    });
    return found ? `${found.label}` : "";
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
    .filter(e => e.dayOfWeek === todayName || e.date === todayStr)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const currentEvent = todayEvents.find(e => {
    const [h, m] = e.startTime.split(':').map(Number);
    const startVal = h + m / 60;
    const endVal = startVal + (e.durationMinutes / 60);
    return currentTimeVal >= startVal && currentTimeVal < endVal;
  });

  const nextEvent = todayEvents.find(e => {
    const [h, m] = e.startTime.split(':').map(Number);
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
        minHeight: '140px', 
        padding: '16px',
        background: event ? `linear-gradient(135deg, ${color}99 0%, ${color}44 100%)` : "rgba(30,30,40,0.6)", 
        border: event ? `1px solid ${color}66` : theme.glassBorder,
        boxShadow: event ? `0 15px 40px ${color}33` : "none", 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden'
    }} onClick={() => event && onEventClick(event)}>
        {isNow && (
            <div className="absolute top-0 right-0 p-3">
                <span className="flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                </span>
            </div>
        )}

        <div>
            <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px'}}>
                <h3 style={{margin: 0, color: "rgba(255,255,255,0.9)", textTransform: "uppercase", fontSize: "0.65rem", letterSpacing: "1.5px", fontWeight: 800}}>{title}</h3>
            </div>
            {event ? (
                <>
                    <h2 style={{fontSize: "1.4rem", margin: "0 0 4px 0", fontWeight: 800, lineHeight: 1.1, textShadow: "0 2px 10px rgba(0,0,0,0.3)"}}>{event.title}</h2>
                    <div style={{fontSize: '0.85rem', color: "rgba(255,255,255,0.9)", marginBottom: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px'}}>
                        <span style={{background: 'rgba(255,255,255,0.15)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem'}}>{event.code || 'No Code'}</span>
                        {event.group && <span style={{background: 'rgba(255,255,255,0.15)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem'}}>Grp {event.group}</span>}
                    </div>
                </>
            ) : (
                <div style={{color: "rgba(255,255,255,0.5)", padding: "10px 0", fontSize: "0.95rem", fontWeight: 500}}>Nothing scheduled. Enjoy your free time!</div>
            )}
        </div>
        
        {event && (
            <div style={{display: "flex", gap: "8px", alignItems: "center", color: "#fff", flexWrap: 'wrap'}}>
                <div style={{display: "flex", flexDirection: "column", background: "rgba(0,0,0,0.4)", padding: "6px 10px", borderRadius: "10px", backdropFilter: "blur(10px)", border: '1px solid rgba(255,255,255,0.1)'}}>
                    <div style={{fontSize: "0.75rem", fontWeight: 800, color: '#fff', display: "flex", alignItems: 'center', gap: '6px', marginBottom: '1px'}}>
                            {slotName || "Event"}
                    </div>
                    <div style={{fontSize: "0.65rem", color: "rgba(255,255,255,0.8)", fontWeight: 600}}>
                        {to12h(event.startTime)} - {to12h(getEndTime(event.startTime, event.durationMinutes))}
                    </div>
                </div>

                {event.location && (
                    <div style={{display: "flex", alignItems: "center", gap: "4px", background: "rgba(0,0,0,0.4)", padding: "6px 8px", borderRadius: "10px", fontSize: "0.75rem", fontWeight: 600, backdropFilter: "blur(10px)", height: 'fit-content', alignSelf: 'center', border: '1px solid rgba(255,255,255,0.1)'}}>
                        <MapPin size={12} className="text-white/90" /> {event.location}
                    </div>
                )}
            </div>
        )}
    </div>
  )};

  return (
    <div style={styles.scrollableContent}>
        {/* Global Announcement Banner */}
        {showAnnouncement && (
            <div style={{
                marginBottom: "16px", 
                background: "linear-gradient(135deg, #a855f7 0%, #d946ef 100%)", 
                borderRadius: "14px", 
                padding: "12px", 
                display: "flex", 
                alignItems: "start", 
                justifyContent: "space-between",
                boxShadow: "0 8px 30px rgba(168, 85, 247, 0.4)",
                animation: "scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                color: '#fff',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{position: 'absolute', top: '-10%', left: '-5%', width: '100px', height: '100px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(20px)'}}></div>
                <div style={{display: 'flex', gap: '10px', position: 'relative', zIndex: 1}}>
                    <div style={{background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '50%', height: 'fit-content'}}>
                        <Megaphone size={16} className="text-white" fill="white" />
                    </div>
                    <div>
                        <h4 style={{margin: '0 0 2px 0', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.9}}>Announcement</h4>
                        <p style={{margin: 0, fontSize: '0.85rem', fontWeight: 600, lineHeight: '1.4'}}>{announcement.message}</p>
                    </div>
                </div>
                <button 
                    onClick={handleDismissAnnouncement} 
                    style={{background: 'rgba(0,0,0,0.1)', border: 'none', borderRadius: '50%', padding: '4px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '24px', minHeight: '24px'}}
                >
                    <X size={14} />
                </button>
            </div>
        )}

        <div style={{marginBottom: "16px", paddingTop: '6px', position: 'relative'}}>
             <div style={{fontSize: '2rem', fontWeight: 800, lineHeight: 1, letterSpacing: '-1.5px', background: `linear-gradient(to right, #fff, ${theme.textMuted})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>
                 {currentTime}
             </div>
             <div style={{fontSize: '0.85rem', fontWeight: 600, color: theme.accent, marginTop: '2px'}}>
                 {currentDate}
             </div>
             <p style={{...styles.subtitle, marginTop: '2px', fontSize: '0.8rem'}}>
                {greeting}, <span style={{color: '#fff'}}>{username || 'Student'}</span>
             </p>

             {/* AI Button - Replaced floating bar item with this button */}
             <button 
                onClick={() => onNavigate('ai')}
                style={{
                    position: 'absolute',
                    top: '6px',
                    right: '0',
                    background: 'linear-gradient(135deg, #8b5cf6, #d946ef)',
                    border: 'none',
                    borderRadius: '12px',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)',
                    cursor: 'pointer',
                    zIndex: 10
                }}
             >
                <Sparkles size={18} color="#fff" />
             </button>
        </div>

        <div style={{display: "flex", flexDirection: "column", gap: "16px"}}>
            
            {renderEventCard(mainCardEvent, isHappeningNow ? "Happening Now" : "Up Next", isHappeningNow)}

            {showNextUpTab && nextEvent && (
                <div 
                    onClick={() => onEventClick(nextEvent)}
                    style={{
                        ...styles.card, 
                        margin: 0, 
                        padding: '12px', 
                        minHeight: 'auto', 
                        background: 'rgba(255,255,255,0.05)', 
                        border: '1px solid rgba(255,255,255,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer'
                    }}
                >
                    <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                        <div style={{background: 'rgba(255,255,255,0.1)', padding: '8px', borderRadius: '10px'}}>
                            <ArrowRight size={16} color={theme.accent} />
                        </div>
                        <div>
                            <div style={{fontSize: '0.65rem', textTransform: 'uppercase', color: theme.textMuted, fontWeight: 700, letterSpacing: '0.5px'}}>Then</div>
                            <div style={{fontSize: '0.9rem', fontWeight: 700, color: '#fff'}}>{nextEvent.title}</div>
                        </div>
                    </div>
                    <div style={{textAlign: 'right'}}>
                         <div style={{fontSize: '0.8rem', fontWeight: 600}}>{to12h(nextEvent.startTime)}</div>
                         <div style={{fontSize: '0.7rem', color: theme.textMuted}}>{nextEvent.location}</div>
                    </div>
                </div>
            )}

            {/* Apps Grid - Redesigned Visuals */}
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                {/* Gym Entry Card */}
                <div 
                    onClick={() => onNavigate('gym')}
                    style={{
                        ...styles.card,
                        margin: 0,
                        padding: '16px',
                        minHeight: '110px',
                        background: 'linear-gradient(135deg, rgba(30, 64, 175, 0.5), rgba(30, 58, 138, 0.3))',
                        border: '1px solid rgba(96, 165, 250, 0.2)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        boxShadow: '0 8px 20px rgba(30, 58, 138, 0.3)'
                    }}
                >
                    <div style={{background: 'rgba(255,255,255,0.15)', padding: '10px', borderRadius: '12px', marginBottom: '8px'}}>
                        <Dumbbell size={24} color="#fff" />
                    </div>
                    <div>
                        <h3 style={{margin: 0, fontSize: '1rem', fontWeight: 800, color: '#fff'}}>Gym</h3>
                        <p style={{margin: '2px 0 0 0', fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)'}}>Fitness Tracker</p>
                    </div>
                </div>

                {/* Grade Calculator Entry Card */}
                <div 
                    onClick={() => onNavigate('grades')}
                    style={{
                        ...styles.card,
                        margin: 0,
                        padding: '16px',
                        minHeight: '110px',
                        background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.5), rgba(17, 94, 89, 0.3))',
                        border: '1px solid rgba(45, 212, 191, 0.2)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        boxShadow: '0 8px 20px rgba(13, 148, 136, 0.3)'
                    }}
                >
                    <div style={{background: 'rgba(255,255,255,0.15)', padding: '10px', borderRadius: '12px', marginBottom: '8px'}}>
                        <Calculator size={24} color="#fff" />
                    </div>
                    <div>
                        <h3 style={{margin: 0, fontSize: '1rem', fontWeight: 800, color: '#fff'}}>Grades</h3>
                        <p style={{margin: '2px 0 0 0', fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)'}}>GPA Calculator</p>
                    </div>
                </div>
            </div>

            <div>
                <div style={{display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', paddingLeft: '4px'}}>
                    <ClipboardList size={16} color={theme.accent} />
                    <h3 style={{margin: 0, fontSize: '0.9rem', fontWeight: 700}}>Upcoming Tests</h3>
                </div>
                {upcomingDeadlines.length > 0 ? (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                        {upcomingDeadlines.map(task => {
                            const color = eventColors[task.type] || '#64748b';
                            const slotName = getSlotName(task.startTime);
                            return (
                                <div key={task.id} 
                                    onClick={() => onEventClick(task)}
                                    style={{...styles.card, marginBottom: 0, minHeight: 'auto', padding: '12px', borderLeft: `3px solid ${color}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: 'rgba(30,30,40,0.6)'}}
                                >
                                    <div>
                                        <div style={{fontSize: '0.65rem', fontWeight: 700, color: color, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px'}}>{task.type}</div>
                                        <div style={{fontSize: '0.9rem', fontWeight: 700, color: '#fff', marginBottom: '2px'}}>{task.title}</div>
                                        <div style={{fontSize: '0.75rem', color: theme.textMuted}}>{task.code}</div>
                                    </div>
                                    <div style={{textAlign: 'right'}}>
                                        <div style={{fontSize: '0.8rem', fontWeight: 700, color: '#fff'}}>{new Date(task.date || "").toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}</div>
                                        <div style={{fontSize: '0.7rem', color: theme.textMuted, marginTop: '2px'}}>{to12h(task.startTime)}</div>
                                        {slotName && <div style={{fontSize: '0.6rem', color: theme.accent, marginTop: '1px', fontWeight: 600}}>{slotName}</div>}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div style={{padding: '16px', textAlign: 'center', color: theme.textMuted, background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: theme.glassBorder, fontSize: '0.85rem'}}>
                        No upcoming quizzes or exams.
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default Dashboard;
