
import React, { useState, useEffect } from 'react';
import { MapPin, ClipboardList, ArrowRight, Dumbbell, Calculator, Sparkles, Megaphone, X, CheckSquare, Plus, Lock, Users } from 'lucide-react';
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
}

export const Dashboard: React.FC<DashboardProps> = ({ events, eventColors, onNavigate, onEventClick, onAddEventClick, onSmartImportClick, periods, announcement, username }) => {
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
        minHeight: '100px', 
        padding: '14px',
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
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </span>
            </div>
        )}

        <div>
            <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px'}}>
                <h3 style={{margin: 0, color: "rgba(255,255,255,0.9)", textTransform: "uppercase", fontSize: "0.6rem", letterSpacing: "1.2px", fontWeight: 800}}>{title}</h3>
            </div>
            {event ? (
                <>
                    <h2 style={{fontSize: "1.2rem", margin: "0 0 2px 0", fontWeight: 800, lineHeight: 1.1, textShadow: "0 2px 10px rgba(0,0,0,0.3)"}}>{event.title}</h2>
                    <div style={{fontSize: '0.75rem', color: "rgba(255,255,255,0.9)", marginBottom: '6px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px'}}>
                        <span style={{background: 'rgba(255,255,255,0.15)', padding: '1px 5px', borderRadius: '4px', fontSize: '0.65rem'}}>{event.code || 'No Code'}</span>
                        {event.group && <span style={{background: 'rgba(255,255,255,0.15)', padding: '1px 5px', borderRadius: '4px', fontSize: '0.65rem'}}>Grp {event.group}</span>}
                    </div>
                </>
            ) : (
                <div style={{color: "rgba(255,255,255,0.5)", padding: "8px 0", fontSize: "0.85rem", fontWeight: 500}}>Nothing scheduled. Enjoy!</div>
            )}
        </div>
        
        {event && (
            <div style={{display: "flex", gap: "6px", alignItems: "center", color: "#fff", flexWrap: 'wrap'}}>
                <div style={{display: "flex", flexDirection: "column", background: "rgba(0,0,0,0.4)", padding: "4px 8px", borderRadius: "8px", backdropFilter: "blur(10px)", border: '1px solid rgba(255,255,255,0.1)'}}>
                    <div style={{fontSize: "0.7rem", fontWeight: 800, color: '#fff', display: "flex", alignItems: 'center', gap: '6px', marginBottom: '0px'}}>
                            {slotName || "Event"}
                    </div>
                    <div style={{fontSize: "0.6rem", color: "rgba(255,255,255,0.8)", fontWeight: 600}}>
                        {to12h(event.startTime)} - {to12h(getEndTime(event.startTime, event.durationMinutes))}
                    </div>
                </div>

                {event.location && (
                    <div style={{display: "flex", alignItems: "center", gap: "4px", background: "rgba(0,0,0,0.4)", padding: "4px 6px", borderRadius: "8px", fontSize: "0.7rem", fontWeight: 600, backdropFilter: "blur(10px)", height: 'fit-content', alignSelf: 'center', border: '1px solid rgba(255,255,255,0.1)'}}>
                        <MapPin size={10} className="text-white/90" /> {event.location}
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
                marginBottom: "14px", 
                background: "linear-gradient(135deg, #a855f7 0%, #d946ef 100%)", 
                borderRadius: "12px", 
                padding: "10px", 
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
                <div style={{display: 'flex', gap: '8px', position: 'relative', zIndex: 1}}>
                    <div style={{background: 'rgba(255,255,255,0.2)', padding: '6px', borderRadius: '50%', height: 'fit-content'}}>
                        <Megaphone size={14} className="text-white" fill="white" />
                    </div>
                    <div>
                        <h4 style={{margin: '0 0 2px 0', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.9}}>Announcement</h4>
                        <p style={{margin: 0, fontSize: '0.8rem', fontWeight: 600, lineHeight: '1.3'}}>{announcement.message}</p>
                    </div>
                </div>
                <button 
                    onClick={handleDismissAnnouncement} 
                    style={{background: 'rgba(0,0,0,0.1)', border: 'none', borderRadius: '50%', padding: '4px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '22px', minHeight: '22px'}}
                >
                    <X size={12} />
                </button>
            </div>
        )}

        <div style={{marginBottom: "14px", paddingTop: '4px', position: 'relative'}}>
             <div style={{fontSize: '1.8rem', fontWeight: 800, lineHeight: 1, letterSpacing: '-1.2px', background: `linear-gradient(to right, #fff, ${theme.textMuted})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>
                 {currentTime}
             </div>
             <div style={{fontSize: '0.8rem', fontWeight: 600, color: theme.accent, marginTop: '2px'}}>
                 {currentDate}
             </div>
             <p style={{...styles.subtitle, marginTop: '2px', fontSize: '0.75rem'}}>
                {greeting}, <span style={{color: '#fff'}}>{username || 'Student'}</span>
             </p>

             {/* AI Button */}
             <button 
                onClick={() => onNavigate('ai')}
                style={{
                    position: 'absolute',
                    top: '4px',
                    right: '0',
                    background: 'linear-gradient(135deg, #8b5cf6, #d946ef)',
                    border: 'none',
                    borderRadius: '10px',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)',
                    cursor: 'pointer',
                    zIndex: 10
                }}
             >
                <Sparkles size={16} color="#fff" />
             </button>
        </div>

        <div style={{display: "flex", flexDirection: "column", gap: "12px"}}>
            
            {renderEventCard(mainCardEvent, isHappeningNow ? "Happening Now" : "Up Next", isHappeningNow)}

            {showNextUpTab && nextEvent && (
                <div 
                    onClick={() => onEventClick(nextEvent)}
                    style={{
                        ...styles.card, 
                        margin: 0, 
                        padding: '10px', 
                        minHeight: 'auto', 
                        background: 'rgba(255,255,255,0.05)', 
                        border: '1px solid rgba(255,255,255,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer'
                    }}
                >
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                        <div style={{background: 'rgba(255,255,255,0.1)', padding: '6px', borderRadius: '8px'}}>
                            <ArrowRight size={14} color={theme.accent} />
                        </div>
                        <div>
                            <div style={{fontSize: '0.6rem', textTransform: 'uppercase', color: theme.textMuted, fontWeight: 700, letterSpacing: '0.5px'}}>Then</div>
                            <div style={{fontSize: '0.85rem', fontWeight: 700, color: '#fff'}}>{nextEvent.title}</div>
                        </div>
                    </div>
                    <div style={{textAlign: 'right'}}>
                         <div style={{fontSize: '0.75rem', fontWeight: 600}}>{to12h(nextEvent.startTime)}</div>
                         <div style={{fontSize: '0.65rem', color: theme.textMuted}}>{nextEvent.location}</div>
                    </div>
                </div>
            )}

            {/* Apps Grid - Even Smaller and Compact */}
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px'}}>
                {/* Gym Entry Card - UPDATED TO COMING SOON */}
                <div 
                    style={{
                        ...styles.card,
                        margin: 0,
                        padding: '10px',
                        minHeight: '75px',
                        background: 'linear-gradient(135deg, rgba(30, 64, 175, 0.25), rgba(30, 58, 138, 0.15))',
                        border: '1px solid rgba(96, 165, 250, 0.1)',
                        cursor: 'default',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        opacity: 0.7,
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                >
                    <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/40 px-1.5 py-0.5 rounded-full border border-white/10">
                        <Lock size={8} className="text-white/60" />
                        <span style={{fontSize: '0.5rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Soon</span>
                    </div>
                    <div style={{background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '8px', marginBottom: '4px'}}>
                        <Dumbbell size={16} color="rgba(255,255,255,0.4)" />
                    </div>
                    <div>
                        <h3 style={{margin: 0, fontSize: '0.8rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)'}}>Gym</h3>
                        <p style={{margin: 0, fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)'}}>Coming Soon</p>
                    </div>
                </div>

                {/* Grade Calculator Entry Card */}
                <div 
                    onClick={() => onNavigate('grades')}
                    style={{
                        ...styles.card,
                        margin: 0,
                        padding: '10px',
                        minHeight: '75px',
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
                    <div style={{background: 'rgba(255,255,255,0.15)', padding: '6px', borderRadius: '8px', marginBottom: '4px'}}>
                        <Calculator size={16} color="#fff" />
                    </div>
                    <div>
                        <h3 style={{margin: 0, fontSize: '0.8rem', fontWeight: 800, color: '#fff'}}>Grades</h3>
                        <p style={{margin: 0, fontSize: '0.6rem', color: 'rgba(255,255,255,0.7)'}}>GPA Calculator</p>
                    </div>
                </div>

                {/* To-Do List Entry Card */}
                <div 
                    onClick={() => onNavigate('todo')}
                    style={{
                        ...styles.card,
                        margin: 0,
                        padding: '10px',
                        minHeight: '75px',
                        background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.5), rgba(219, 39, 119, 0.3))',
                        border: '1px solid rgba(244, 114, 182, 0.2)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        boxShadow: '0 8px 20px rgba(236, 72, 153, 0.3)'
                    }}
                >
                    <div style={{background: 'rgba(255,255,255,0.15)', padding: '6px', borderRadius: '8px', marginBottom: '4px'}}>
                        <CheckSquare size={16} color="#fff" />
                    </div>
                    <div>
                        <h3 style={{margin: 0, fontSize: '0.8rem', fontWeight: 800, color: '#fff'}}>To-Do</h3>
                        <p style={{margin: 0, fontSize: '0.6rem', color: 'rgba(255,255,255,0.7)'}}>Task Manager</p>
                    </div>
                </div>

                {/* Study Groups Entry Card */}
                <div 
                    onClick={() => onNavigate('study_groups')}
                    style={{
                        ...styles.card,
                        margin: 0,
                        padding: '10px',
                        minHeight: '75px',
                        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.5), rgba(217, 119, 6, 0.3))',
                        border: '1px solid rgba(251, 191, 36, 0.2)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        boxShadow: '0 8px 20px rgba(245, 158, 11, 0.3)'
                    }}
                >
                    <div style={{background: 'rgba(255,255,255,0.15)', padding: '6px', borderRadius: '8px', marginBottom: '4px'}}>
                        <Users size={16} color="#fff" />
                    </div>
                    <div>
                        <h3 style={{margin: 0, fontSize: '0.8rem', fontWeight: 800, color: '#fff'}}>Groups</h3>
                        <p style={{margin: 0, fontSize: '0.6rem', color: 'rgba(255,255,255,0.7)'}}>Study Together</p>
                    </div>
                </div>

                {/* Add Event Card */}
                <div style={{display: 'flex', gap: '8px'}}>
                    <div 
                        onClick={onAddEventClick}
                        style={{
                            ...styles.card,
                            flex: 1,
                            margin: 0,
                            padding: '10px',
                            minHeight: '75px',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px dashed rgba(255,255,255,0.1)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            textAlign: 'center'
                        }}
                    >
                        <div style={{background: 'rgba(139, 92, 246, 0.1)', padding: '8px', borderRadius: '50%', marginBottom: '4px'}}>
                            <Plus size={16} color={theme.accent} />
                        </div>
                        <span style={{fontSize: '0.7rem', fontWeight: 700, color: theme.textMuted}}>Add Event</span>
                    </div>

                    <div 
                        onClick={onSmartImportClick}
                        style={{
                            ...styles.card,
                            flex: 1,
                            margin: 0,
                            padding: '10px',
                            minHeight: '75px',
                            background: 'rgba(139, 92, 246, 0.05)',
                            border: '1px solid rgba(139, 92, 246, 0.1)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            textAlign: 'center'
                        }}
                    >
                        <div style={{background: 'rgba(139, 92, 246, 0.2)', padding: '8px', borderRadius: '50%', marginBottom: '4px'}}>
                            <Brain size={16} color={theme.accent} />
                        </div>
                        <span style={{fontSize: '0.7rem', fontWeight: 700, color: theme.accent}}>Smart Import</span>
                    </div>
                </div>
            </div>

            <div>
                <div style={{display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', paddingLeft: '4px'}}>
                    <ClipboardList size={14} color={theme.accent} />
                    <h3 style={{margin: 0, fontSize: '0.85rem', fontWeight: 700}}>Upcoming Tests</h3>
                </div>
                {upcomingDeadlines.length > 0 ? (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
                        {upcomingDeadlines.map(task => {
                            const color = eventColors[task.type] || '#64748b';
                            const slotName = getSlotName(task.startTime);
                            return (
                                <div key={task.id} 
                                    onClick={() => onEventClick(task)}
                                    style={{...styles.card, marginBottom: 0, minHeight: 'auto', padding: '10px', borderLeft: `3px solid ${color}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: 'rgba(30,30,40,0.6)'}}
                                >
                                    <div>
                                        <div style={{fontSize: '0.6rem', fontWeight: 700, color: color, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1px'}}>{task.type}</div>
                                        <div style={{fontSize: '0.85rem', fontWeight: 700, color: '#fff', marginBottom: '1px'}}>{task.title}</div>
                                        <div style={{fontSize: '0.7rem', color: theme.textMuted}}>{task.code}</div>
                                    </div>
                                    <div style={{textAlign: 'right'}}>
                                        <div style={{fontSize: '0.75rem', fontWeight: 700, color: '#fff'}}>{new Date(task.date || "").toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}</div>
                                        <div style={{fontSize: '0.65rem', color: theme.textMuted, marginTop: '1px'}}>{to12h(task.startTime)}</div>
                                        {slotName && <div style={{fontSize: '0.55rem', color: theme.accent, marginTop: '1px', fontWeight: 600}}>{slotName}</div>}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div style={{padding: '14px', textAlign: 'center', color: theme.textMuted, background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: theme.glassBorder, fontSize: '0.8rem'}}>
                        No upcoming quizzes or exams.
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
