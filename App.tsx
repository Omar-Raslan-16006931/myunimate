
import React, { useState, useEffect } from 'react';
//import { Session } from '@supabase/supabase-js';
//import { supabase } from './lib/supabase';
//import Auth from './components/Auth';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import Schedule from './components/Schedule';
import AIChat from './components/AIChat';
import Settings from './components/Settings';
import AddEventModal from './components/AddEventModal';
import { ScheduleEvent, ViewState, MaterialFile, ScheduleProfile, EventColorMap, ExtractedScheduleItem, EventType, CourseGrade, Assessment } from './types';
import { INITIAL_EVENTS, INITIAL_FILES, INITIAL_PROFILES, INITIAL_COLORS } from './constants';
import { theme, styles } from './theme';
import { GraduationCap, Folder, BookOpen, Trash2, FileText, File, Upload, Check, X, Brain, Calendar, Clock, MapPin, AlignLeft, Pencil, Send, Plus, ChevronDown, ChevronUp, Sparkles, Loader2, LogOut } from 'lucide-react';
import { parseScheduleImage, getChatResponse } from './services/geminiService';

// --- Subcomponents for other views ---

const CoursesView = ({ events, eventColors }: { events: ScheduleEvent[], eventColors: EventColorMap }) => {
    const uniqueCourses = Array.from(new Set(events.map(e => e.title))).sort();
    return (
        <div style={styles.scrollableContent}>
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>Classes</h1>
                    <p style={styles.subtitle}>Your academic courses</p>
                </div>
                <div style={{background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '50%'}}>
                    <GraduationCap size={24} color="#fff" />
                </div>
            </div>
            
            <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                {uniqueCourses.map(courseName => {
                    const courseEvents = events.filter(e => e.title === courseName);
                    const mainEvent = courseEvents.find(e => e.type === 'lecture') || courseEvents[0];
                    const group = mainEvent?.group || "N/A";
                    const typeColor = eventColors[mainEvent?.type || 'other'] || eventColors.other;
                    
                    return (
                        <div key={courseName} style={{...styles.card, padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0, borderLeft: `5px solid ${typeColor}`}}>
                            <div>
                                <h2 style={{margin: 0, fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px'}}>{courseName}</h2>
                                <div style={{display: 'inline-block', backgroundColor: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', color: '#ddd', fontWeight: 600}}>
                                    Group: {group}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
};

const FilesView = ({ materials, setMaterials }: { materials: MaterialFile[], setMaterials: React.Dispatch<React.SetStateAction<MaterialFile[]>> }) => {
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
          const newFile: MaterialFile = {
            id: Math.random().toString(36).slice(2, 11),
            name: file.name,
            type: file.type.includes("pdf") ? "pdf" : file.type.includes("image") ? "image" : "other",
            size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
            dateAdded: new Date().toISOString().split('T')[0]
          };
          setMaterials(prev => [...prev, newFile]);
        }
    };
    return (
        <div style={styles.scrollableContent}>
           <div style={styles.header}>
              <div><h1 style={styles.title}>Files</h1><p style={styles.subtitle}>Course materials</p></div>
              <div style={{display: 'flex', gap: '10px'}}>
                <label style={{...styles.button, borderRadius: '50%', width: '44px', height: '44px', padding: 0, justifyContent: 'center'}} htmlFor="file-upload"><Upload size={20} /></label>
                <input id="file-upload" type="file" style={{display: "none"}} onChange={handleFileUpload} />
              </div>
            </div>
            <div style={styles.card}>
              {materials.length === 0 ? <div style={{padding: "60px", textAlign: "center", color: theme.textMuted, fontSize: '0.95rem'}}>No files yet.</div> : 
                materials.sort((a,b) => (a.type === 'folder' ? -1 : 1)).map(file => (
                  <div key={file.id} style={styles.fileItem}>
                    {file.type === 'pdf' && <FileText color={theme.danger} size={22} />}
                    {file.type === 'folder' && <Folder color={theme.accent} fill={theme.accent} fillOpacity={0.2} size={22} />}
                    {file.type === 'image' && <BookOpen color={theme.success} size={22} />}
                    {file.type === 'other' && <File color={theme.textMuted} size={22} />}
                    <div style={{flex: 1}}>
                      <div style={{fontWeight: 600, fontSize: "0.95rem", color: "#fff"}}>{file.name}</div>
                      <div style={{fontSize: "0.75rem", color: theme.textMuted, marginTop: "2px"}}>{file.type === 'folder' ? 'Folder' : `${file.size} • ${file.dateAdded}`}</div>
                    </div>
                    <button onClick={() => setMaterials(prev => prev.filter(m => m.id !== file.id))} style={{padding: "8px", background: "none", border: "none", cursor: "pointer", color: theme.textMuted, opacity: 0.7}}><Trash2 size={18} /></button>
                  </div>
                ))
              }
            </div>
        </div>
    );
};

const GradesView = ({ grades, setGrades }: { grades: CourseGrade[], setGrades: React.Dispatch<React.SetStateAction<CourseGrade[]>> }) => {
    const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
    const [newCourseName, setNewCourseName] = useState("");
    const [newAssessment, setNewAssessment] = useState<{name: string, weight: string, score: string, total: string}>({ name: "", weight: "", score: "", total: "" });
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [aiQuery, setAiQuery] = useState("");
    const [aiResponse, setAiResponse] = useState<string | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);

    const calculateAverage = (assessments: Assessment[]) => {
        let totalWeight = 0;
        let weightedScore = 0;
        assessments.forEach(a => {
            const pct = (a.score / a.total) * 100;
            weightedScore += (pct * a.weight);
            totalWeight += a.weight;
        });
        if (totalWeight === 0) return "0.0";
        return (weightedScore / totalWeight).toFixed(1);
    };

    const handleAddCourse = () => {
        if (!newCourseName.trim()) return;
        const newGrade: CourseGrade = {
            id: Math.random().toString(36).slice(2, 9),
            title: newCourseName,
            assessments: []
        };
        setGrades([...grades, newGrade]);
        setNewCourseName("");
    };

    const handleAddAssessment = (courseId: string) => {
        if (!newAssessment.name || !newAssessment.weight) return;
        const updatedGrades = grades.map(g => {
            if (g.id === courseId) {
                return {
                    ...g,
                    assessments: [...g.assessments, {
                        id: Math.random().toString(36).slice(2, 9),
                        name: newAssessment.name,
                        weight: parseFloat(newAssessment.weight),
                        score: parseFloat(newAssessment.score) || 0,
                        total: parseFloat(newAssessment.total) || 100
                    }]
                };
            }
            return g;
        });
        setGrades(updatedGrades);
        setNewAssessment({ name: "", weight: "", score: "", total: "" });
    };

    const handleDeleteCourse = (courseId: string) => {
        setGrades(grades.filter(g => g.id !== courseId));
    }

    const handleAskAi = async () => {
        if (!aiQuery.trim()) return;
        setIsAiLoading(true);
        try {
            const context = `My Grades Data: ${JSON.stringify(grades.map(g => ({
                course: g.title,
                currentAverage: calculateAverage(g.assessments),
                assessments: g.assessments.map(a => `${a.name}: ${a.score}/${a.total} (Weight: ${a.weight}%)`)
            })))}`;
            
            const response = await getChatResponse([], aiQuery, context);
            setAiResponse(response);
        } catch (e) {
            setAiResponse("Sorry, failed to analyze grades.");
        } finally {
            setIsAiLoading(false);
        }
    };

    return (
        <div style={styles.scrollableContent}>
             <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>Grades</h1>
                    <p style={styles.subtitle}>Calculator & Tracker</p>
                </div>
                <div 
                    onClick={() => setIsAiModalOpen(true)}
                    style={{background: `linear-gradient(135deg, ${theme.accent}, #c084fc)`, padding: '10px', borderRadius: '50%', cursor: 'pointer', boxShadow: theme.accentGlow}}
                >
                    <Brain size={24} color="#fff" />
                </div>
            </div>

            {/* Add Course */}
            <div style={{...styles.card, padding: '16px', display: 'flex', gap: '10px', alignItems: 'center'}}>
                <input 
                    style={{...styles.input, padding: '12px'}} 
                    placeholder="New Course Name..." 
                    value={newCourseName}
                    onChange={e => setNewCourseName(e.target.value)}
                />
                <button style={{...styles.button, padding: '12px'}} onClick={handleAddCourse}>
                    <Plus size={20} />
                </button>
            </div>

            {/* Course List */}
            <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                {grades.map(course => {
                    const average = calculateAverage(course.assessments);
                    const isExpanded = expandedCourse === course.id;
                    const numAvg = parseFloat(average);
                    
                    return (
                        <div key={course.id} style={{...styles.card, marginBottom: 0, padding: 0, overflow: 'hidden'}}>
                            <div 
                                onClick={() => setExpandedCourse(isExpanded ? null : course.id)}
                                style={{padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: isExpanded ? 'rgba(255,255,255,0.05)' : 'transparent'}}
                            >
                                <div>
                                    <h2 style={{margin: 0, fontSize: '1.1rem', fontWeight: 700}}>{course.title}</h2>
                                    <p style={{margin: 0, fontSize: '0.8rem', color: theme.textMuted}}>{course.assessments.length} Assessments</p>
                                </div>
                                <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                                    <div style={{fontSize: '1.4rem', fontWeight: 800, color: numAvg >= 80 ? theme.success : numAvg >= 60 ? theme.warning : theme.danger}}>
                                        {average}%
                                    </div>
                                    {isExpanded ? <ChevronUp size={20} color={theme.textMuted}/> : <ChevronDown size={20} color={theme.textMuted} />}
                                </div>
                            </div>

                            {isExpanded && (
                                <div style={{padding: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)'}}>
                                    <div style={{display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px'}}>
                                        {course.assessments.map(a => (
                                            <div key={a.id} style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px'}}>
                                                <span style={{color: '#fff'}}>{a.name} <span style={{color: theme.textMuted, fontSize: '0.75rem'}}>({a.weight}%)</span></span>
                                                <span style={{fontWeight: 600}}>{a.score}/{a.total}</span>
                                            </div>
                                        ))}
                                        {course.assessments.length === 0 && <div style={{color: theme.textMuted, fontSize: '0.8rem', fontStyle: 'italic'}}>No assessments added yet.</div>}
                                    </div>
                                    
                                    <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '8px', alignItems: 'center', marginBottom: '16px'}}>
                                        <input placeholder="Name" style={{...styles.input, padding: '10px', fontSize: '0.8rem'}} value={newAssessment.name} onChange={e => setNewAssessment({...newAssessment, name: e.target.value})} />
                                        <input placeholder="Wgt%" type="number" style={{...styles.input, padding: '10px', fontSize: '0.8rem'}} value={newAssessment.weight} onChange={e => setNewAssessment({...newAssessment, weight: e.target.value})} />
                                        <input placeholder="Score" type="number" style={{...styles.input, padding: '10px', fontSize: '0.8rem'}} value={newAssessment.score} onChange={e => setNewAssessment({...newAssessment, score: e.target.value})} />
                                        <input placeholder="Total" type="number" style={{...styles.input, padding: '10px', fontSize: '0.8rem'}} value={newAssessment.total} onChange={e => setNewAssessment({...newAssessment, total: e.target.value})} />
                                        <button style={{...styles.button, padding: '10px', borderRadius: '12px'}} onClick={() => handleAddAssessment(course.id)}><Plus size={16} /></button>
                                    </div>
                                    
                                    <button onClick={() => handleDeleteCourse(course.id)} style={{fontSize: '0.8rem', color: theme.danger, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.7}}>
                                        <Trash2 size={14} /> Delete Course
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* AI Modal */}
            {isAiModalOpen && (
                <div style={styles.modalOverlay} onClick={() => setIsAiModalOpen(false)}>
                    <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
                         <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px"}}>
                            <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                <Sparkles size={20} color={theme.accent} />
                                <h2 style={{margin: 0, fontSize: "1.2rem", fontWeight: 800}}>Grade Intelligence</h2>
                            </div>
                            <button style={{background: "none", border: "none", cursor: "pointer"}} onClick={() => setIsAiModalOpen(false)}><X size={24} color="#fff" /></button>
                        </div>
                        
                        <div style={{minHeight: '100px', maxHeight: '300px', overflowY: 'auto', marginBottom: '20px', whiteSpace: 'pre-wrap', lineHeight: '1.5', fontSize: '0.9rem', color: theme.textMuted}}>
                            {aiResponse || "Ask me anything about your grades. I know your current scores and weights. Try: 'What do I need on the final to get an A?'"}
                        </div>

                        <div style={{display: 'flex', gap: '10px'}}>
                            <input 
                                style={{...styles.input, padding: '12px'}} 
                                placeholder="Ask a question..." 
                                value={aiQuery}
                                onChange={e => setAiQuery(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAskAi()}
                            />
                            <button style={{...styles.button, padding: '12px'}} onClick={handleAskAi} disabled={isAiLoading}>
                                {isAiLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const TaskDetailsModal = ({ event, onClose, onEdit }: { event: ScheduleEvent, onClose: () => void, onEdit: (e: ScheduleEvent) => void }) => {
    const to12h = (time24: string) => {
        if (!time24) return "";
        const [h, m] = time24.split(":").map(Number);
        const period = h >= 12 ? "PM" : "AM";
        const h12 = h % 12 || 12;
        return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
    };
    return (
        <div style={styles.modalOverlay} onClick={onClose}>
            <div style={{...styles.modalContent, width: '100%', maxWidth: '360px', padding: 0}} onClick={e => e.stopPropagation()}>
                <div style={{padding: '24px', background: `linear-gradient(135deg, ${theme.accent}22 0%, rgba(0,0,0,0) 100%)`, borderBottom: '1px solid rgba(255,255,255,0.1)'}}>
                   <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                       <div style={{backgroundColor: theme.accent, padding: '4px 10px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 700, color: '#fff', textTransform: 'uppercase', marginBottom: '12px', display: 'inline-block'}}>
                           {event.type}
                       </div>
                       <div style={{display: 'flex', gap: '8px'}}>
                           <button onClick={() => onEdit(event)} style={{background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '12px', padding: '6px 12px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600}}>
                               <Pencil size={14} /> Edit
                           </button>
                           <button onClick={onClose} style={{background: 'rgba(0,0,0,0.3)', border: 'none', borderRadius: '50%', padding: '6px', cursor: 'pointer', color: '#fff'}}><X size={16} /></button>
                       </div>
                   </div>
                   <h2 style={{margin: '0 0 6px 0', fontSize: '1.4rem', fontWeight: 800, lineHeight: 1.2}}>{event.title}</h2>
                   <div style={{fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', fontWeight: 500}}>{event.code}</div>
                </div>
                
                <div style={{padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px'}}>
                    
                    <div style={{display: 'flex', gap: '16px'}}>
                        <div style={{flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)'}}>
                            <div style={{display: 'flex', alignItems: 'center', gap: '6px', color: theme.textMuted, fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px', textTransform: 'uppercase'}}>
                                <Calendar size={14} /> Date
                            </div>
                            <div style={{fontSize: '0.95rem', fontWeight: 600}}>
                                {new Date(event.date || "").toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric'})}
                            </div>
                        </div>
                        <div style={{flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)'}}>
                             <div style={{display: 'flex', alignItems: 'center', gap: '6px', color: theme.textMuted, fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px', textTransform: 'uppercase'}}>
                                <Clock size={14} /> Time
                            </div>
                            <div style={{fontSize: '0.95rem', fontWeight: 600}}>
                                {to12h(event.startTime)}
                            </div>
                        </div>
                    </div>

                    {event.location && (
                        <div>
                             <div style={styles.label}>Location</div>
                             <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', fontWeight: 500}}>
                                 <MapPin size={18} color={theme.accent} /> {event.location}
                             </div>
                        </div>
                    )}

                    <div>
                        <div style={styles.label}><AlignLeft size={14} style={{display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom'}}/> Description</div>
                        <div style={{fontSize: '0.95rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.8)', backgroundColor: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)'}}>
                            {event.description || "No description provided."}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const VerifyImportModal = ({ items, onConfirm, onCancel }: { items: ExtractedScheduleItem[], onConfirm: () => void, onCancel: () => void }) => {
    const to12h = (time24: string) => {
        if (!time24) return "";
        const [h, m] = time24.split(":").map(Number);
        const period = h >= 12 ? "PM" : "AM";
        const h12 = h % 12 || 12;
        return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
    };
    return (
        <div style={styles.modalOverlay}>
            <div style={{...styles.modalContent, width: '100%', maxWidth: '500px', padding: 0}} onClick={e => e.stopPropagation()}>
                <div style={{padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                    <h2 style={{margin: 0, fontSize: '1.2rem'}}>Verify Schedule</h2>
                    <button onClick={onCancel} style={{background: 'none', border: 'none', cursor: 'pointer', color: '#fff'}}><X size={24} /></button>
                </div>
                <div style={{padding: '20px', maxHeight: '60vh', overflowY: 'auto'}}>
                    <p style={{fontSize: '0.9rem', color: theme.textMuted, marginBottom: '16px'}}>
                        Found {items.length} classes. Please review before importing.
                    </p>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                        {items.map((item, i) => (
                            <div key={i} style={{backgroundColor: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)'}}>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                                    <div>
                                        <div style={{fontWeight: 700, fontSize: '1rem', color: '#fff'}}>{item.course_name || "Unknown Course"}</div>
                                        <div style={{fontSize: '0.8rem', color: theme.textMuted, marginTop: '2px'}}>{item.type} • {item.room}</div>
                                    </div>
                                    <div style={{textAlign: 'right'}}>
                                        <div style={{fontSize: '0.8rem', fontWeight: 600, color: theme.accent}}>{item.day}</div>
                                        <div style={{fontSize: '0.75rem', color: theme.textMuted}}>{to12h(item.time_start)} - {to12h(item.time_end)}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div style={{padding: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '10px'}}>
                    <button style={{...styles.secondaryButton, flex: 1, justifyContent: 'center'}} onClick={onCancel}>Cancel</button>
                    <button style={{...styles.button, flex: 1, justifyContent: 'center'}} onClick={onConfirm}>
                        <Check size={18} /> Confirm Import
                    </button>
                </div>
            </div>
        </div>
    );
}

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);

  //useEffect(() => {
    //supabase.auth.getSession().then(({ data: { session } }) => {
    //  setSession(session);
   // });

    //const {
     // data: { subscription },
    //} = supabase.auth.onAuthStateChange((_event, session) => {
    //  setSession(session);
   // });

    //return () => subscription.unsubscribe();
  //}, []);

  // --- Persistent State Initialization ---
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  
  const [events, setEvents] = useState<ScheduleEvent[]>(() => {
      const saved = localStorage.getItem('college-container-events');
      return saved ? JSON.parse(saved) : INITIAL_EVENTS;
  });
  
  const [materials, setMaterials] = useState<MaterialFile[]>(() => {
      const saved = localStorage.getItem('college-container-materials');
      return saved ? JSON.parse(saved) : INITIAL_FILES;
  });

  const [profiles, setProfiles] = useState<ScheduleProfile[]>(() => {
      const saved = localStorage.getItem('college-container-profiles');
      return saved ? JSON.parse(saved) : INITIAL_PROFILES;
  });

  const [activeProfileId, setActiveProfileId] = useState<string>(() => {
      const saved = localStorage.getItem('college-container-active-profile');
      return saved ? JSON.parse(saved) : "main";
  });

  const [grades, setGrades] = useState<CourseGrade[]>(() => {
      const saved = localStorage.getItem('college-container-grades');
      return saved ? JSON.parse(saved) : [];
  });

  const [eventColors, setEventColors] = useState<EventColorMap>(INITIAL_COLORS);
  
  // --- Effects for Persistence ---
  useEffect(() => localStorage.setItem('college-container-events', JSON.stringify(events)), [events]);
  useEffect(() => localStorage.setItem('college-container-materials', JSON.stringify(materials)), [materials]);
  useEffect(() => localStorage.setItem('college-container-profiles', JSON.stringify(profiles)), [profiles]);
  useEffect(() => localStorage.setItem('college-container-active-profile', JSON.stringify(activeProfileId)), [activeProfileId]);
  useEffect(() => localStorage.setItem('college-container-grades', JSON.stringify(grades)), [grades]);

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ScheduleEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<Partial<ScheduleEvent> | null>(null);

  const [extractedEvents, setExtractedEvents] = useState<ExtractedScheduleItem[]>([]);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // File to Base64 helper
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
  };

  const handleAddEvent = (eventData: Partial<ScheduleEvent>) => {
    if (eventData.title && eventData.startTime) {
       if (eventData.id) {
           // Edit
           setEvents(prev => prev.map(e => e.id === eventData.id ? { ...e, ...eventData } as ScheduleEvent : e));
       } else {
           // Create
           const newEvent: ScheduleEvent = {
             id: Math.random().toString(36).slice(2, 11),
             scheduleId: activeProfileId,
             title: eventData.title,
             code: eventData.code,
             group: eventData.group,
             type: eventData.type || 'lecture',
             isRecurring: eventData.isRecurring || false,
             dayOfWeek: eventData.dayOfWeek,
             date: eventData.date,
             startTime: eventData.startTime,
             durationMinutes: eventData.durationMinutes || 90,
             location: eventData.location,
             description: eventData.description
           };
           setEvents(prev => [...prev, newEvent]);
       }
       setIsEventModalOpen(false);
       setEditingEvent(null);
    }
  };

  const handleDeleteEvent = (id: string) => {
      setEvents(prev => prev.filter(e => e.id !== id));
  };

  const handleAddProfile = (name: string) => {
    const newProfile: ScheduleProfile = { id: Math.random().toString(36).slice(2, 11), name };
    setProfiles([...profiles, newProfile]);
    setActiveProfileId(newProfile.id);
  };

  const handleDeleteProfile = (id: string) => {
    if (profiles.length <= 1) {
      alert("Cannot delete the last profile.");
      return;
    }
    if (confirm("Are you sure? This will delete the profile and all its events.")) {
      setProfiles(prev => prev.filter(p => p.id !== id));
      setEvents(prev => prev.filter(e => e.scheduleId !== id));
      // If deleted active profile, switch to first available
      if (activeProfileId === id) {
        const remaining = profiles.filter(p => p.id !== id);
        if (remaining.length > 0) setActiveProfileId(remaining[0].id);
      }
    }
  };

  const handleUpdateColor = (type: EventType, color: string) => {
    setEventColors({ ...eventColors, [type]: color });
  };

  const handleImageUpload = async (file: File) => {
      setIsAnalyzing(true);
      try {
          const base64 = await fileToBase64(file);
          const items = await parseScheduleImage(base64);
          if (items.length > 0) {
              setExtractedEvents(items);
              setIsVerifyModalOpen(true);
          } else {
              alert("No events found in image.");
          }
      } catch (e) {
          console.error(e);
          alert("Error parsing image.");
      } finally {
          setIsAnalyzing(false);
      }
  };

  const handleConfirmImport = () => {
    const newEvents: ScheduleEvent[] = extractedEvents.map(item => ({
        id: Math.random().toString(36).slice(2, 11),
        scheduleId: activeProfileId,
        title: item.course_name,
        code: item.course_code || "",
        group: "",
        type: (item.type?.toLowerCase() as EventType) || 'lecture',
        isRecurring: true,
        dayOfWeek: item.day,
        startTime: item.time_start,
        durationMinutes: 90, 
        location: item.room,
        description: `Imported Period ${item.period_number}`
    }));

    setEvents(prev => [...prev, ...newEvents]);
    setIsVerifyModalOpen(false);
    setExtractedEvents([]);
  };

  const handleSignOut = async () => {
      await supabase.auth.signOut();
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard 
            events={events.filter(e => e.scheduleId === activeProfileId)} 
            eventColors={eventColors}
            onNavigate={setCurrentView} 
            onEventClick={(e) => setSelectedTask(e)}
            onAddEventClick={() => { setEditingEvent(null); setIsEventModalOpen(true); }}
          />
        );
      case 'schedule':
        return (
          <Schedule 
            events={events}
            profiles={profiles}
            activeProfileId={activeProfileId}
            eventColors={eventColors}
            onProfileChange={setActiveProfileId}
            onAddEventClick={() => { setEditingEvent(null); setIsEventModalOpen(true); }}
            onEventClick={(e) => setSelectedTask(e)}
          />
        );
      case 'grades':
        return <GradesView grades={grades} setGrades={setGrades} />;
      case 'courses':
        return <CoursesView events={events.filter(e => e.scheduleId === activeProfileId)} eventColors={eventColors} />;
      case 'materials':
        return <FilesView materials={materials} setMaterials={setMaterials} />;
      case 'ai':
        return <AIChat />;
      case 'settings':
        return (
          <Settings
             profiles={profiles}
             activeProfileId={activeProfileId}
             eventColors={eventColors}
             baseEvents={events.filter(e => e.scheduleId === activeProfileId && e.isRecurring)}
             onAddProfile={handleAddProfile}
             onSwitchProfile={setActiveProfileId}
             onUpdateColor={handleUpdateColor}
             onDeleteEvent={handleDeleteEvent}
             onEditEvent={(e) => { setEditingEvent(e); setIsEventModalOpen(true); }}
             onAddBaseEventClick={() => { setEditingEvent({isRecurring: true}); setIsEventModalOpen(true); }}
             onImageUpload={handleImageUpload}
             onDeleteProfile={handleDeleteProfile}
             isAnalyzing={isAnalyzing}
             onResetGrades={() => { if(confirm("Reset all grades?")) setGrades([]); }}
          />
        );
      default:
        return null;
    }
  };

  //if (!session) {
    //return <Auth />;
  //}

  return (
    <div style={styles.container}>
      {/* Sign Out Button (Small overlay) */}
      <button 
        onClick={handleSignOut}
        style={{position: 'absolute', top: '15px', right: '15px', zIndex: 1000, background: 'rgba(255,255,255,0.05)', borderRadius: '50%', padding: '8px', border: 'none', cursor: 'pointer', color: theme.textMuted}}
        title="Sign Out"
      >
        <LogOut size={16} />
      </button>

      <main style={styles.main}>
        {renderContent()}
      </main>

      <Navigation currentView={currentView} onNavigate={setCurrentView} />

      {isEventModalOpen && (
        <AddEventModal 
            isOpen={isEventModalOpen}
            onClose={() => setIsEventModalOpen(false)}
            onSave={handleAddEvent}
            eventColors={eventColors}
            initialData={editingEvent}
        />
      )}

      {selectedTask && (
        <TaskDetailsModal 
            event={selectedTask} 
            onClose={() => setSelectedTask(null)} 
            onEdit={(task) => {
                setEditingEvent(task);
                setIsEventModalOpen(true);
                setSelectedTask(null);
            }}
        />
      )}

      {isVerifyModalOpen && (
          <VerifyImportModal 
            items={extractedEvents}
            onConfirm={handleConfirmImport}
            onCancel={() => setIsVerifyModalOpen(false)}
          />
      )}
      
      <style>{`
        @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 0px; background: transparent; }
      `}</style>
    </div>
  );
};

export default App;
