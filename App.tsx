

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import Schedule from './components/Schedule';
import AIChat from './components/AIChat';
import Settings from './components/Settings';
import AddEventModal from './components/AddEventModal';
import GymView from './components/GymView';
import UniversalGradeCalculator from './components/UniversalGradeCalculator';
import CompleteProfile from './components/CompleteProfile';
import { ScheduleEvent, ViewState, MaterialFile, ScheduleProfile, EventColorMap, ExtractedScheduleItem, EventType, CourseGrade, GradeCategory, PeriodDefinition, FoodItem, WaterLog, WorkoutSession, WorkoutRoutine, ExerciseDefinition, GymSettings, ThemeMode, Announcement } from './types';
import { INITIAL_EVENTS, INITIAL_FILES, INITIAL_PROFILES, INITIAL_COLORS, INITIAL_PERIODS, DEFAULT_GYM_SETTINGS, DEFAULT_ROUTINES } from './constants';
import { theme, styles } from './theme';
import { GraduationCap, Folder, BookOpen, Trash2, FileText, File, Upload, Check, X, Brain, Calendar, Clock, MapPin, AlignLeft, Pencil, Send, Plus, ChevronDown, ChevronUp, Sparkles, Loader2, LogOut, RotateCcw, Calculator, ArrowRight, PieChart, AlertTriangle, Cloud, CloudOff, FileImage, Sheet, Link as LinkIcon, RefreshCcw, Ban, Eye, Database, Terminal, Copy } from 'lucide-react';
import { parseScheduleImage, getChatResponse } from './services/geminiService';

// --- HELPER: Default Grade Structure ---
const createDefaultCourseGrade = (title: string): CourseGrade => ({
    id: Math.random().toString(36).slice(2, 9),
    title: title,
    targetGrade: '90',
    categories: [
        {
            id: Math.random().toString(36).slice(2, 9),
            name: 'Final Exam',
            weight: '40',
            dropLowest: '0',
            items: [
                { id: crypto.randomUUID(), name: 'Final', score: '', total: '100', active: true }
            ]
        },
        {
            id: Math.random().toString(36).slice(2, 9),
            name: 'Midterm',
            weight: '30',
            dropLowest: '0',
            items: [
                { id: crypto.randomUUID(), name: 'Midterm', score: '', total: '100', active: true }
            ]
        },
        {
            id: Math.random().toString(36).slice(2, 9),
            name: 'Quizzes',
            weight: '30',
            dropLowest: '0',
            items: [
                { id: crypto.randomUUID(), name: 'Quiz 1', score: '', total: '100', active: true },
                { id: crypto.randomUUID(), name: 'Quiz 2', score: '', total: '100', active: true }
            ]
        }
    ]
});

// --- Subcomponents for other views ---

const ConfirmModal = ({ 
    isOpen, 
    title, 
    message, 
    onConfirm, 
    onCancel 
}: { 
    isOpen: boolean, 
    title: string, 
    message: string, 
    onConfirm: () => void, 
    onCancel: () => void 
}) => {
    if (!isOpen) return null;
    return (
        <div style={styles.modalOverlay} onClick={onCancel}>
            <div style={{...styles.modalContent, maxWidth: '320px', padding: '0', overflow: 'hidden'}} onClick={e => e.stopPropagation()}>
                <div style={{padding: '24px', textAlign: 'center'}}>
                    <div style={{width: '60px', height: '60px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'}}>
                        <AlertTriangle size={32} color={theme.danger} />
                    </div>
                    <h3 style={{margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 800}}>{title}</h3>
                    <p style={{margin: 0, fontSize: '0.9rem', color: theme.textMuted, lineHeight: '1.5'}}>
                        {message}
                    </p>
                </div>
                <div style={{display: 'flex', borderTop: '1px solid rgba(255,255,255,0.1)'}}>
                    <button 
                        onClick={onCancel}
                        style={{flex: 1, padding: '16px', background: 'transparent', border: 'none', color: theme.text, fontSize: '1rem', fontWeight: 600, cursor: 'pointer', borderRight: '1px solid rgba(255,255,255,0.1)'}}
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={onConfirm}
                        style={{flex: 1, padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: theme.danger, fontSize: '1rem', fontWeight: 800, cursor: 'pointer'}}
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
};

const DatabaseErrorScreen = ({ onRetry }: { onRetry: () => void }) => {
    return (
        <div style={{...styles.container, alignItems: 'center', justifyContent: 'center', padding: '20px', overflowY: 'auto'}}>
            <div style={{maxWidth: '400px', width: '100%', background: '#0f172a', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', textAlign: 'center'}}>
                <div style={{background: 'rgba(239, 68, 68, 0.2)', padding: '16px', borderRadius: '50%', color: theme.danger, width: 'fit-content', margin: '0 auto 20px'}}>
                    <Database size={40} />
                </div>
                
                <h1 style={{fontSize: '1.5rem', fontWeight: 800, color: '#fff', margin: '0 0 10px 0'}}>Database Error</h1>
                <p style={{color: theme.textMuted, lineHeight: '1.6', fontSize: '0.9rem', marginBottom: '24px'}}>
                    A configuration error (infinite recursion or permission issue) is preventing the app from loading.
                    <br/><br/>
                    <b>Please contact the administrator.</b>
                </p>

                <button 
                    onClick={onRetry}
                    style={{...styles.button, width: '100%', justifyContent: 'center', padding: '14px', fontSize: '1rem'}}
                >
                    <RefreshCcw size={18} /> Retry Connection
                </button>
            </div>
        </div>
    );
};

const CoursesView = ({ 
    events, 
    eventColors,
    onDeleteCourse,
    onEditCourse,
    onAddCourse
}: any) => {
    const uniqueCourses = Array.from(new Set(events.map((e: any) => e.title))).sort();
    const [editingCourse, setEditingCourse] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ name: "", code: "", group: "", location: "" });
    const [courseToDelete, setCourseToDelete] = useState<string | null>(null);

    const startEdit = (name: string, mainEvent: any) => {
        setEditingCourse(name);
        setEditForm({
            name: name,
            code: mainEvent?.code || "",
            group: mainEvent?.group || "",
            location: mainEvent?.location || ""
        });
    };

    const saveEdit = () => {
        if (editingCourse && editForm.name.trim()) {
            onEditCourse(editingCourse, editForm);
        }
        setEditingCourse(null);
    };

    return (
        <div style={styles.scrollableContent}>
            <div style={styles.header}>
                <div>
                    <h1 style={{...styles.title, fontSize: '1.5rem'}}>Classes</h1>
                    <p style={styles.subtitle}>Your academic courses</p>
                </div>
                <button 
                    onClick={onAddCourse}
                    style={{...styles.button, borderRadius: '50%', width: '40px', height: '40px', padding: 0, justifyContent: 'center', boxShadow: '0 5px 15px rgba(0,0,0,0.1)'}}
                >
                    <Plus size={20} />
                </button>
            </div>
            
            <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                {uniqueCourses.map((courseName: any) => {
                    const courseEvents = events.filter((e: any) => e.title === courseName);
                    const mainEvent = courseEvents.find((e: any) => e.type === 'lecture') || courseEvents[0];
                    const typeColor = eventColors[mainEvent?.type || 'other'] || eventColors.other;
                    
                    const isEditing = editingCourse === courseName;

                    if (isEditing) {
                        return (
                            <div key={courseName} style={{...styles.card, padding: '16px', borderLeft: `5px solid ${theme.accent}`, marginBottom: 0}}>
                                <h3 style={{marginTop: 0, marginBottom: '12px', fontSize: '1rem'}}>Edit Course Details</h3>
                                <div style={{display: 'grid', gap: '10px'}}>
                                    <div>
                                        <label style={styles.label}>Course Name</label>
                                        <input 
                                            value={editForm.name} 
                                            onChange={e => setEditForm({...editForm, name: e.target.value})}
                                            style={styles.input}
                                            placeholder="Course Name"
                                        />
                                    </div>
                                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                                        <div>
                                            <label style={styles.label}>Code</label>
                                            <input 
                                                value={editForm.code} 
                                                onChange={e => setEditForm({...editForm, code: e.target.value})}
                                                style={styles.input}
                                                placeholder="Code"
                                            />
                                        </div>
                                        <div>
                                            <label style={styles.label}>Group</label>
                                            <input 
                                                value={editForm.group} 
                                                onChange={e => setEditForm({...editForm, group: e.target.value})}
                                                style={styles.input}
                                                placeholder="Group"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={styles.label}>Default Location</label>
                                        <input 
                                            value={editForm.location} 
                                            onChange={e => setEditForm({...editForm, location: e.target.value})}
                                            style={styles.input}
                                            placeholder="Location"
                                        />
                                    </div>
                                    <div style={{display: 'flex', gap: '8px', marginTop: '6px'}}>
                                        <button onClick={saveEdit} style={{...styles.button, flex: 1, justifyContent: 'center', padding: '8px'}}>
                                            <Check size={16} /> Save
                                        </button>
                                        <button onClick={() => setEditingCourse(null)} style={{...styles.secondaryButton, flex: 1, justifyContent: 'center', padding: '8px'}}>
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    }

                    return (
                        <div key={courseName} style={{...styles.card, padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0, borderLeft: `4px solid ${typeColor}`}}>
                            <div>
                                <h2 style={{margin: 0, fontSize: '0.95rem', fontWeight: 700, marginBottom: '4px'}}>{courseName}</h2>
                                <div style={{display: 'flex', gap: '6px', flexWrap: 'wrap'}}>
                                     {mainEvent.code && (
                                         <div style={{backgroundColor: 'var(--input-bg)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', color: theme.textMuted, fontWeight: 600}}>
                                            {mainEvent.code}
                                         </div>
                                     )}
                                     {mainEvent.group && (
                                         <div style={{backgroundColor: 'var(--input-bg)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', color: theme.textMuted, fontWeight: 600}}>
                                            Grp {mainEvent.group}
                                         </div>
                                     )}
                                     {mainEvent.location && (
                                         <div style={{backgroundColor: 'var(--input-bg)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', color: theme.textMuted, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px'}}>
                                            <MapPin size={10} /> {mainEvent.location}
                                         </div>
                                     )}
                                </div>
                            </div>
                            
                            <div style={{display: 'flex', gap: '6px'}}>
                                <button 
                                    onClick={() => startEdit(courseName, mainEvent)}
                                    style={{background: 'var(--input-bg)', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: theme.text}}
                                >
                                    <Pencil size={16} />
                                </button>
                                <button 
                                    onClick={() => setCourseToDelete(courseName)}
                                    style={{background: 'rgba(239, 68, 68, 0.1)', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: theme.danger}}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    )
                })}
                {uniqueCourses.length === 0 && (
                     <div style={{textAlign: 'center', padding: '40px', color: theme.textMuted}}>
                         <BookOpen size={32} className="mx-auto mb-4 opacity-30" />
                         <p className="text-sm">No courses found in schedule.</p>
                     </div>
                )}
            </div>

            <ConfirmModal 
                isOpen={!!courseToDelete}
                title="Delete Course?"
                message={`Are you sure you want to delete "${courseToDelete}"? This will remove ALL classes and events associated with this course.`}
                onConfirm={() => {
                    if (courseToDelete) onDeleteCourse(courseToDelete);
                    setCourseToDelete(null);
                }}
                onCancel={() => setCourseToDelete(null)}
            />
        </div>
    );
};

const FilesView = ({ materials, setMaterials, onConnectDrive, driveFiles, isDriveLoading, onFetchDrive }: { materials: MaterialFile[], setMaterials: React.Dispatch<React.SetStateAction<MaterialFile[]>>, onConnectDrive: () => void, driveFiles: MaterialFile[], isDriveLoading: boolean, onFetchDrive: () => void }) => {
    // ... (No changes to FilesView logic, keeping existing)
    // For brevity in XML response, I will include the full existing code of FilesView
    const [activeTab, setActiveTab] = useState<'local' | 'drive'>('local');
    const [isConnectedToDrive, setIsConnectedToDrive] = useState(false);

    useEffect(() => {
        if (driveFiles.length > 0) setIsConnectedToDrive(true);
    }, [driveFiles]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
          const newFile: MaterialFile = {
            id: Math.random().toString(36).slice(2, 11),
            name: file.name,
            type: file.type.includes("pdf") ? "pdf" : file.type.includes("image") ? "image" : "other",
            size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
            dateAdded: new Date().toISOString().split('T')[0],
            source: 'local'
          };
          setMaterials(prev => [...prev, newFile]);
        }
    };

    const FileList = ({ items, canDelete }: { items: MaterialFile[], canDelete: boolean }) => (
        <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
              {items.length === 0 ? <div style={{padding: "30px", textAlign: "center", color: theme.textMuted, fontSize: '0.85rem', fontStyle: 'italic'}}>No files found.</div> : 
                items.map(file => (
                  <div key={file.id} style={styles.fileItem} className="hover:bg-white/5 transition-colors cursor-pointer" onClick={() => file.webViewLink && window.open(file.webViewLink, '_blank')}>
                    {file.type === 'pdf' && <FileText color={theme.danger} size={18} />}
                    {file.type === 'folder' && <Folder color={theme.accent} fill={theme.accent} fillOpacity={0.2} size={18} />}
                    {file.type === 'image' && <FileImage color={theme.success} size={18} />}
                    {(file.type === 'google-doc' || file.type === 'google-sheet' || file.type === 'google-slide') && <LinkIcon color="#3b82f6" size={18} />}
                    {file.type === 'other' && <File color={theme.textMuted} size={18} />}
                    <div style={{flex: 1, minWidth: 0}}>
                      <div style={{fontWeight: 600, fontSize: "0.85rem", color: "var(--text-primary)", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{file.name}</div>
                      <div style={{fontSize: "0.7rem", color: theme.textMuted, marginTop: "1px"}}>
                          {file.source === 'drive' ? 'Google Drive' : `${file.size} • ${file.dateAdded}`}
                      </div>
                    </div>
                    {canDelete && (
                        <button onClick={(e) => { e.stopPropagation(); setMaterials(prev => prev.filter(m => m.id !== file.id)); }} style={{padding: "6px", background: "none", border: "none", cursor: "pointer", color: theme.textMuted, opacity: 0.7}}><Trash2 size={16} /></button>
                    )}
                  </div>
                ))
              }
        </div>
    );

    return (
        <div style={styles.scrollableContent}>
           <div style={styles.header}>
              <div><h1 style={{...styles.title, fontSize: '1.5rem'}}>Files</h1><p style={styles.subtitle}>Course materials</p></div>
              <div style={{display: 'flex', gap: '8px'}}>
                <label style={{...styles.button, borderRadius: '50%', width: '40px', height: '40px', padding: 0, justifyContent: 'center'}} htmlFor="file-upload"><Upload size={18} /></label>
                <input id="file-upload" type="file" style={{display: "none"}} onChange={handleFileUpload} />
              </div>
            </div>
            
            <div style={{display: 'flex', gap: '8px', marginBottom: '16px'}}>
                <button 
                    onClick={() => setActiveTab('local')}
                    style={{
                        flex: 1, 
                        padding: '10px', 
                        borderRadius: '12px', 
                        border: 'none', 
                        backgroundColor: activeTab === 'local' ? theme.accent : 'rgba(255,255,255,0.05)', 
                        color: '#fff', 
                        fontWeight: 700, 
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: activeTab === 'local' ? '0 4px 12px rgba(139, 92, 246, 0.3)' : 'none'
                    }}
                >
                    Uploaded
                </button>
                <button 
                    onClick={() => setActiveTab('drive')}
                    style={{
                        flex: 1, 
                        padding: '10px', 
                        borderRadius: '12px', 
                        border: 'none', 
                        backgroundColor: activeTab === 'drive' ? theme.accent : 'rgba(255,255,255,0.05)', 
                        color: '#fff', 
                        fontWeight: 700, 
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: activeTab === 'drive' ? '0 4px 12px rgba(139, 92, 246, 0.3)' : 'none'
                    }}
                >
                    Google Drive
                </button>
            </div>

            <div style={{...styles.card, padding: '12px'}}>
              {activeTab === 'local' ? (
                  <FileList items={materials} canDelete={true} />
              ) : (
                  <div>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
                           <h3 style={{margin: 0, fontSize: '0.9rem', fontWeight: 700}}>Recent Drive Files</h3>
                           <div style={{display: 'flex', gap: '8px'}}>
                               <button onClick={onFetchDrive} disabled={isDriveLoading} style={{background: 'rgba(255,255,255,0.1)', border: 'none', padding: '6px', borderRadius: '50%', cursor: 'pointer', color: theme.text}}>
                                   <RefreshCcw size={14} className={isDriveLoading ? 'animate-spin' : ''} />
                               </button>
                           </div>
                      </div>
                      
                      {!isConnectedToDrive && driveFiles.length === 0 ? (
                          <div style={{textAlign: 'center', padding: '20px 10px'}}>
                               <p style={{marginBottom: '12px', color: theme.textMuted, fontSize: '0.85rem'}}>Connect to access your study materials directly from Google Drive.</p>
                               <button onClick={onConnectDrive} style={{...styles.button, width: '100%', justifyContent: 'center', background: '#fff', color: '#000', padding: '10px'}}>
                                   <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" width="18" height="18" alt="Drive" />
                                   Connect Google Drive
                               </button>
                          </div>
                      ) : (
                          <FileList items={driveFiles} canDelete={false} />
                      )}
                  </div>
              )}
            </div>
        </div>
    );
};

const GradesView = ({ grades, setGrades }: { grades: CourseGrade[], setGrades: React.Dispatch<React.SetStateAction<CourseGrade[]>> }) => {
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

    const selectedCourse = grades.find(g => g.id === selectedCourseId);

    const handleUpdateCourse = (updated: CourseGrade) => {
        setGrades(prev => prev.map(g => g.id === updated.id ? updated : g));
    };

    if (selectedCourse) {
        return (
            <UniversalGradeCalculator 
                course={selectedCourse} 
                onUpdate={handleUpdateCourse} 
                onBack={() => setSelectedCourseId(null)} 
            />
        );
    }

    return (
        <div style={styles.scrollableContent}>
            <div style={styles.header}>
                <div>
                    <h1 style={{...styles.title, fontSize: '1.5rem'}}>Grades</h1>
                    <p style={styles.subtitle}>Track your performance</p>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {grades.map(course => {
                    let totalWeightedScore = 0;
                    let totalWeightUsed = 0;

                    course.categories.forEach(cat => {
                        const weight = parseFloat(cat.weight) || 0;
                        const usableItems = cat.items.filter(i => i.active !== false && i.score !== ''); 
                        
                        if (usableItems.length > 0) {
                            const percentages = usableItems.map(i => {
                                const s = parseFloat(i.score);
                                const t = parseFloat(i.total);
                                const totalVal = (isNaN(t) || t === 0) ? 100 : t; 
                                return (s / totalVal) * 100;
                            }).sort((a, b) => a - b);
                            
                            const dropCount = parseInt(cat.dropLowest) || 0;
                            const kept = percentages.slice(dropCount);
                            
                            if (kept.length > 0) {
                                const catAverage = kept.reduce((a, b) => a + b, 0) / kept.length;
                                const points = catAverage * (weight / 100);
                                totalWeightedScore += points;
                                totalWeightUsed += weight;
                            }
                        }
                    });

                    const currentAverage = totalWeightUsed > 0 ? (totalWeightedScore / (totalWeightUsed / 100)) : 0;
                    const gradeColor = currentAverage >= 90 ? theme.accent : currentAverage >= 80 ? theme.success : currentAverage >= 70 ? theme.warning : theme.danger;

                    return (
                        <div 
                            key={course.id} 
                            onClick={() => setSelectedCourseId(course.id)}
                            style={{ ...styles.card, cursor: 'pointer', marginBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}
                        >
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{course.title}</h3>
                                <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: theme.textMuted }}>Target: {course.targetGrade}%</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: gradeColor }}>
                                    {currentAverage.toFixed(1)}%
                                </div>
                                <div style={{ fontSize: '0.65rem', color: theme.textMuted }}>Current Avg</div>
                            </div>
                        </div>
                    );
                })}

                {grades.length === 0 && (
                     <div style={{ textAlign: 'center', padding: '30px', color: theme.textMuted }}>
                         <p className="text-sm">No courses found. Add courses in the Classes tab or Schedule to start tracking grades.</p>
                     </div>
                )}
            </div>
        </div>
    );
};

const App: React.FC = () => {
  const [session, setSession] = useState<any | null>(null);
  const [isTestMode, setIsTestMode] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'error' | 'offline'>('synced');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dbError, setDbError] = useState(false);
  const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');
  const [events, setEvents] = useState<ScheduleEvent[]>(INITIAL_EVENTS);
  const [materials, setMaterials] = useState<MaterialFile[]>(INITIAL_FILES);
  const [profiles, setProfiles] = useState<ScheduleProfile[]>(INITIAL_PROFILES);
  const [activeProfileId, setActiveProfileId] = useState<string>("main");
  const [grades, setGrades] = useState<CourseGrade[]>([]);
  const [periods, setPeriods] = useState<PeriodDefinition[]>(INITIAL_PERIODS);
  const [eventColors, setEventColors] = useState<EventColorMap>(INITIAL_COLORS);
  const [foodLogs, setFoodLogs] = useState<FoodItem[]>([]);
  const [waterLogs, setWaterLogs] = useState<WaterLog[]>([]);
  const [workoutSessions, setWorkoutSessions] = useState<WorkoutSession[]>([]);
  const [routines, setRoutines] = useState<WorkoutRoutine[]>(DEFAULT_ROUTINES);
  const [customExercises, setCustomExercises] = useState<ExerciseDefinition[]>([]);
  const [gymSettings, setGymSettings] = useState<GymSettings>(DEFAULT_GYM_SETTINGS);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [accountInfo, setAccountInfo] = useState<{
      email: string, 
      username: string, 
      id: string,
      gender?: string,
      major?: string, 
      year?: string, 
      college?: string, 
      subscription_tier?: number, 
      lastUsernameChange?: string, 
      genderChangeCount?: number,
      is_admin?: boolean,
      is_banned?: boolean,
      banned_until?: string | null
  } | null>(null);
  const [globalAnnouncement, setGlobalAnnouncement] = useState<Announcement | null>(null);
  const [driveFiles, setDriveFiles] = useState<MaterialFile[]>([]);
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ScheduleEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<Partial<ScheduleEvent> | null>(null);
  const [extractedEvents, setExtractedEvents] = useState<ExtractedScheduleItem[]>([]);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [remainingBanTime, setRemainingBanTime] = useState('');

  useEffect(() => {
      if (themeMode === 'light') {
          document.body.classList.add('light-mode');
      } else {
          document.body.classList.remove('light-mode');
      }
  }, [themeMode]);

  useEffect(() => {
    const loadAnnouncement = async () => {
        try {
            const { data } = await supabase
                .from('announcements')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            
            if (data) setGlobalAnnouncement(data);
        } catch (e) {
            console.error("Failed to load announcements", e);
        }
    };
    if (session && !dbError) {
        loadAnnouncement();
    }
  }, [session, dbError]);

  const handleResetApp = (fullClear = false) => {
    setEvents(fullClear ? [] : INITIAL_EVENTS);
    setMaterials(fullClear ? [] : INITIAL_FILES);
    setProfiles(INITIAL_PROFILES);
    setActiveProfileId('main');
    setGrades([]);
    setPeriods(INITIAL_PERIODS);
    setEventColors(INITIAL_COLORS);
    setFoodLogs([]);
    setWaterLogs([]);
    setWorkoutSessions([]);
    setRoutines(DEFAULT_ROUTINES);
    setCustomExercises([]);
    setGymSettings(DEFAULT_GYM_SETTINGS);
    setDriveFiles([]);
    setCurrentView('dashboard');
    setDbError(false);
  };

  const handleSignOut = async () => {
      setSession(null); 
      setAccountInfo(null); 
      setShowOnboarding(false);
      setImpersonatedUserId(null);
      handleResetApp(true); 

      if (isTestMode) {
          setIsTestMode(false);
      } else {
          await supabase.auth.signOut();
      }
  };

  const handleUpdateAccount = (newData: any) => {
    setAccountInfo(prev => {
        if (!prev) return null;
        const updates: any = { ...newData };
        const now = new Date().toISOString();
        if (newData.username !== prev.username) {
            updates.lastUsernameChange = now;
        }
        if (newData.gender !== prev.gender) {
            updates.genderChangeCount = (prev.genderChangeCount || 0) + 1;
        }
        return { ...prev, ...updates };
    });
  };

  const handleImpersonate = (userId: string) => {
      if (userId === session?.user?.id) return;
      setImpersonatedUserId(userId);
  };

  const handleExitImpersonation = () => {
      setImpersonatedUserId(null);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session && !isTestMode) {
          handleResetApp(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [isTestMode]);

  const loadUserData = useCallback(async () => {
        if (!session?.user?.id) return;
        
        setIsDataLoaded(false);
        setDbError(false);

        const targetUserId = impersonatedUserId || session.user.id;
        const isImpersonating = !!impersonatedUserId;
        const meta = session.user.user_metadata || {};
        
        let mergedAccountInfo = {
            email: session.user.email,
            username: meta.username,
            id: targetUserId,
            gender: meta.gender,
            major: meta.major,
            year: meta.year,
            college: meta.college,
            subscription_tier: meta.subscription_tier || 0,
            is_admin: false,
            is_banned: false,
            banned_until: null
        };

        if (!isImpersonating && !meta.username) {
            setShowOnboarding(true);
            setIsDataLoaded(true);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('settings, username, gender, major, year, college, is_admin, is_banned, subscription_tier, banned_until')
                .eq('id', targetUserId)
                .single();
            
            if (error) {
                if (error.code === '42P17') {
                    setDbError(true);
                    return;
                }
                
                if (error.message && (error.message.includes("Failed to fetch") || error.message.includes("Network request failed"))) {
                    console.warn("Offline or blocked: Failed to load profile. Using local defaults.");
                    setSyncStatus('offline');
                } else if (error.code !== 'PGRST116') {
                    console.error("Error loading profile:", JSON.stringify(error));
                }
            }

            if (data) {
                const d = data.settings || {};
                
                if (d.events) setEvents(d.events);
                if (d.materials) setMaterials(d.materials);
                if (d.profiles) setProfiles(d.profiles);
                if (d.activeProfileId) setActiveProfileId(d.activeProfileId);
                if (d.grades) setGrades(d.grades);
                if (d.periods) setPeriods(d.periods);
                if (d.eventColors) setEventColors(d.eventColors);
                if (d.themeMode) setThemeMode(d.themeMode);
                
                const baseInfo = isImpersonating ? { email: d.account?.email || 'User' } : mergedAccountInfo;

                mergedAccountInfo = {
                    ...baseInfo,
                    ...(d.account || {}),
                    username: data.username || d.account?.username || mergedAccountInfo.username,
                    gender: data.gender || d.account?.gender || mergedAccountInfo.gender,
                    major: data.major || d.account?.major || mergedAccountInfo.major,
                    college: data.college || d.account?.college || mergedAccountInfo.college,
                    year: data.year ? String(data.year) : (d.account?.year || mergedAccountInfo.year),
                    is_admin: data.is_admin || false,
                    is_banned: data.is_banned || false,
                    subscription_tier: data.subscription_tier ?? (d.account?.subscription_tier ?? mergedAccountInfo.subscription_tier),
                    banned_until: data.banned_until,
                    id: targetUserId
                };
                
                if (d.gym) {
                    if (d.gym.foodLogs) setFoodLogs(d.gym.foodLogs);
                    if (d.gym.waterLogs) setWaterLogs(d.gym.waterLogs);
                    if (d.gym.workoutSessions) setWorkoutSessions(d.gym.workoutSessions);
                    if (d.gym.routines) setRoutines(d.gym.routines);
                    if (d.gym.customExercises) setCustomExercises(d.gym.customExercises);
                    if (d.gym.settings) setGymSettings(d.gym.settings);
                }
            } else {
                setEvents(INITIAL_EVENTS);
                setMaterials(INITIAL_FILES);
                setProfiles(INITIAL_PROFILES);
                setPeriods(INITIAL_PERIODS);
                setEventColors(INITIAL_COLORS);
                setRoutines(DEFAULT_ROUTINES);
                setGymSettings(DEFAULT_GYM_SETTINGS);
            }
            
            setAccountInfo(mergedAccountInfo);

            if (!isImpersonating && session.provider_token) {
                fetchDriveFiles(session.provider_token);
            }

        } catch (e) {
            console.error("Load error", e);
        } finally {
            setIsDataLoaded(true);
        }
  }, [session, impersonatedUserId]);

  useEffect(() => {
    if (session) {
        loadUserData();
    } else if (isTestMode) {
        setIsDataLoaded(true); 
        setEvents(INITIAL_EVENTS);
        setMaterials(INITIAL_FILES);
        setAccountInfo({email: 'demo@unimate.app', username: 'Demo User', id: 'demo', subscription_tier: 1, is_admin: false, is_banned: false, banned_until: null}); 
    }
  }, [session, isTestMode, impersonatedUserId, loadUserData]);

  const fetchDriveFiles = async (token: string) => {
      setIsDriveLoading(true);
      try {
          const response = await fetch(
              'https://www.googleapis.com/drive/v3/files?pageSize=20&fields=nextPageToken,files(id,name,mimeType,size,createdTime,webViewLink,iconLink)&q=trashed=false', 
              {
                  headers: { Authorization: `Bearer ${token}` }
              }
          );
          
          if (!response.ok) {
              throw new Error("Failed to fetch Drive files");
          }

          const data = await response.json();
          const files: MaterialFile[] = data.files.map((f: any) => ({
              id: f.id,
              name: f.name,
              type: mapMimeType(f.mimeType),
              size: f.size ? `${(parseInt(f.size) / (1024 * 1024)).toFixed(2)} MB` : undefined,
              dateAdded: new Date(f.createdTime).toLocaleDateString(),
              source: 'drive',
              webViewLink: f.webViewLink,
              iconLink: f.iconLink,
              mimeType: f.mimeType
          }));

          setDriveFiles(files);
      } catch (e) {
          console.error("Drive Fetch Error", e);
      } finally {
          setIsDriveLoading(false);
      }
  };

  const mapMimeType = (mime: string): MaterialFile['type'] => {
      if (mime.includes('pdf')) return 'pdf';
      if (mime.includes('image')) return 'image';
      if (mime.includes('folder')) return 'folder';
      if (mime.includes('google-apps.document')) return 'google-doc';
      if (mime.includes('google-apps.spreadsheet')) return 'google-sheet';
      if (mime.includes('google-apps.presentation')) return 'google-slide';
      return 'other';
  };

  const handleConnectDrive = async () => {
      if (!session) return;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/drive.readonly',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) console.error(error);
  };

  const handleCompleteOnboarding = async (data: { username: string, gender: string, major: string, year: string, college: string }) => {
      if (!session) return;
      setOnboardingLoading(true);
      try {
          const { error } = await supabase.auth.updateUser({
              data: {
                  username: data.username,
                  full_name: data.username,
                  display_name: data.username,
                  gender: data.gender,
                  major: data.major,
                  year: data.year,
                  college: data.college,
                  subscription_tier: 0 
              }
          });
          if (error) throw error;

          const newAccountInfo = {
              email: session.user.email,
              id: session.user.id,
              subscription_tier: 0,
              is_admin: false,
              is_banned: false,
              banned_until: null,
              ...data
          };
          setAccountInfo(newAccountInfo);
          setShowOnboarding(false);

          await supabase
            .from('profiles')
            .upsert({
                id: session.user.id,
                username: data.username,
                gender: data.gender,
                major: data.major,
                year: parseInt(data.year) || null,
                college: data.college,
                settings: { 
                    account: newAccountInfo,
                    events: INITIAL_EVENTS,
                    materials: INITIAL_FILES,
                    profiles: INITIAL_PROFILES,
                    activeProfileId: 'main', grades: [], periods: INITIAL_PERIODS,
                    eventColors: INITIAL_COLORS, themeMode: 'dark',
                    gym: { foodLogs: [], waterLogs: [], workoutSessions: [], routines: DEFAULT_ROUTINES, customExercises: [], settings: DEFAULT_GYM_SETTINGS }
                },
                updated_at: new Date().toISOString()
            });

      } catch (e) {
          console.error("Onboarding error:", e);
          alert("Failed to save profile. Please try again.");
      } finally {
          setOnboardingLoading(false);
      }
  };

  const debouncedSave = useCallback(() => {
      if (!session?.user?.id || !isDataLoaded || showOnboarding || dbError) return;
      if (impersonatedUserId) return;
      
      setSyncStatus('saving');
      
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

      saveTimeoutRef.current = setTimeout(async () => {
          if (!navigator.onLine) {
              setSyncStatus('offline');
              return;
          }

          const currentAccount = accountInfo || {
              id: session.user.id,
              email: session.user.email,
              subscription_tier: 0,
              username: session.user.user_metadata?.username || '',
              gender: '',
              major: '',
              year: '',
              college: '',
              is_admin: false,
              is_banned: false,
              banned_until: null
          };

          const payload = {
              events,
              materials,
              profiles,
              activeProfileId,
              grades,
              periods,
              eventColors,
              themeMode,
              gym: {
                  foodLogs,
                  waterLogs,
                  workoutSessions,
                  routines,
                  customExercises,
                  settings: gymSettings
              },
              account: currentAccount
          };

          try {
              const usernameToSave = currentAccount.username || session.user.user_metadata?.username || '';
              
              const { error } = await supabase
                  .from('profiles')
                  .upsert({
                      id: session.user.id,
                      username: usernameToSave, 
                      gender: currentAccount.gender || null,
                      major: currentAccount.major || null,
                      year: parseInt(currentAccount.year || '') || null,
                      college: currentAccount.college || null,
                      settings: payload, 
                      updated_at: new Date().toISOString()
                  });

              if (error) throw error;
              setSyncStatus('synced');
          } catch (e: any) {
              if (e.message && e.message.includes("Failed to fetch")) {
                  console.warn("Save skipped due to network issue");
                  setSyncStatus('offline');
                  return;
              }

              console.error("Save error:", JSON.stringify(e));
              if (e.code === '42501') {
                   console.warn("RLS blocking save - ignoring UI error.");
                   setSyncStatus('synced'); 
              } else if (e.code === '42P17') {
                   setDbError(true);
                   setSyncStatus('error');
              } else {
                   setSyncStatus('error');
              }
          }
      }, 2000);
  }, [events, materials, profiles, activeProfileId, grades, periods, eventColors, themeMode, foodLogs, waterLogs, workoutSessions, routines, customExercises, gymSettings, session, isDataLoaded, accountInfo, showOnboarding, impersonatedUserId, dbError]);

  useEffect(() => {
      debouncedSave();
  }, [debouncedSave]);

  const handleEnterTestMode = useCallback(() => setIsTestMode(true), []);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
  };

  const handleAddEvent = (eventData: Partial<ScheduleEvent>) => {
    if (eventData.id) {
        setEvents(prev => prev.map(e => e.id === eventData.id ? { ...e, ...eventData } as ScheduleEvent : e));
        
        if (isEventModalOpen) {
             setIsEventModalOpen(false);
             setEditingEvent(null);
        }
        return;
    }

    if (eventData.title && eventData.startTime) {
           const newEvent: ScheduleEvent = {
             id: Math.random().toString(36).slice(2, 11),
             scheduleId: activeProfileId,
             title: eventData.title || "New Event",
             code: eventData.code,
             group: eventData.group,
             type: (eventData.type as EventType) || 'lecture',
             isRecurring: eventData.isRecurring || false,
             dayOfWeek: eventData.dayOfWeek,
             date: eventData.date,
             startTime: eventData.startTime,
             durationMinutes: eventData.durationMinutes || 90,
             location: eventData.location,
             description: eventData.description
           };
           setEvents(prev => [...prev, newEvent]);

           setIsEventModalOpen(false);
           setEditingEvent(null);
    }
  };

  const handleDeleteEvent = (id: string) => {
      setEvents(prev => prev.filter(e => e.id !== id));
  };

  const handleDeleteCourseByName = (name: string) => {
      setEvents(prev => prev.filter(e => e.title !== name));
      setGrades(prev => prev.filter(g => g.title !== name));
  };

  const handleEditCourseByName = (oldName: string, info: { name: string, code: string, group: string, location: string }) => {
      setEvents(prev => prev.map(e => {
          if (e.title === oldName) {
              return { 
                  ...e, 
                  title: info.name,
                  code: info.code,
                  group: info.group,
                  location: info.location
              };
          }
          return e;
      }));
      setGrades(prev => prev.map(g => g.title === oldName ? { ...g, title: info.name } : g));
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
    
    const newCourseTitles = new Set(newEvents.map(e => e.title));
    const existingGradeTitles = new Set(grades.map(g => g.title));
    
    const coursesToAdd: CourseGrade[] = [];
    newCourseTitles.forEach(title => {
        if (!existingGradeTitles.has(title)) {
            coursesToAdd.push(createDefaultCourseGrade(title));
        }
    });
    
    if (coursesToAdd.length > 0) {
        setGrades(prev => [...prev, ...coursesToAdd]);
    }

    setIsVerifyModalOpen(false);
    setExtractedEvents([]);
  };

  const addFoodLog = (item: FoodItem) => setFoodLogs(prev => [...prev, item]);
  const updateFoodLog = (updatedItem: FoodItem) => setFoodLogs(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
  const deleteFoodLog = (id: string) => setFoodLogs(prev => prev.filter(item => item.id !== id));
  const addWaterLog = (amount: number) => setWaterLogs(prev => [...prev, { id: Date.now().toString(), amount, timestamp: Date.now() }]);
  const addWorkoutSession = (session: WorkoutSession) => {
    setWorkoutSessions(prev => [session, ...prev]); 
    if (session.routineId) {
        setRoutines(prev => prev.map(r => r.id === session.routineId ? { ...r, lastPerformed: Date.now() } : r));
    }
  };
  const saveRoutine = (routine: WorkoutRoutine) => {
      setRoutines(prev => {
          const exists = prev.find(r => r.id === routine.id);
          if (exists) return prev.map(r => r.id === routine.id ? routine : r);
          return [...prev, routine];
      });
  };
  const deleteRoutine = (id: string) => setRoutines(prev => prev.filter(r => r.id !== id));
  const addCustomExercise = (ex: ExerciseDefinition) => setCustomExercises(prev => [...prev, ex]);
  const updateSettings = (newSettings: GymSettings) => setGymSettings(newSettings);

  const existingCourses = Array.from(new Set(events.map(e => e.title)))
        .map(title => {
            const ev = events.find(e => e.title === title);
            return { title, code: ev?.code || '', type: ev?.type || 'lecture' as EventType };
        });

  useEffect(() => {
      if (accountInfo?.banned_until) {
          const interval = setInterval(() => {
              const now = new Date();
              const banEnd = new Date(accountInfo.banned_until!);
              const diff = banEnd.getTime() - now.getTime();

              if (diff <= 0) {
                  // Ban expired
                  setRemainingBanTime('');
                  setAccountInfo(prev => prev ? { ...prev, is_banned: false, banned_until: null } : null);
              } else {
                  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                  
                  if (days > 0) {
                      setRemainingBanTime(`${days}d ${hours}h`);
                  } else if (hours > 0) {
                      setRemainingBanTime(`${hours}h ${minutes}m`);
                  } else {
                      setRemainingBanTime(`${minutes}m`);
                  }
              }
          }, 1000);
          return () => clearInterval(interval);
      }
  }, [accountInfo?.banned_until]);

  if (!session && !isTestMode) {
    return <Auth onEnterTestMode={handleEnterTestMode} />;
  }

  if (dbError) {
      return <DatabaseErrorScreen onRetry={() => loadUserData()} />;
  }

  if (accountInfo?.is_banned) {
      return (
          <div style={{...styles.container, alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px'}}>
              <div style={{width: '80px', height: '80px', background: 'rgba(239, 68, 68, 0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px'}}>
                  <Ban size={40} className="text-red-500" />
              </div>
              <h1 style={{fontSize: '2rem', fontWeight: 800, color: '#fff', marginBottom: '10px'}}>Account Suspended</h1>
              <p style={{color: theme.textMuted, maxWidth: '300px', marginBottom: '30px', lineHeight: '1.5'}}>
                  Your account has been suspended due to a violation of our terms. Please contact support if you believe this is an error.
              </p>
              {remainingBanTime ? (
                  <div style={{background: 'rgba(255,255,255,0.1)', padding: '10px 20px', borderRadius: '10px', marginBottom: '30px'}}>
                      <p style={{margin: 0, fontSize: '0.8rem', color: theme.textMuted, textTransform: 'uppercase', fontWeight: 700}}>Suspension Lifts In</p>
                      <p style={{margin: '4px 0 0 0', fontSize: '1.5rem', fontWeight: 800, color: '#fff'}}>{remainingBanTime}</p>
                  </div>
              ) : (
                  <div style={{marginBottom: '30px', color: theme.danger, fontWeight: 700}}>PERMANENT BAN</div>
              )}
              <button 
                  onClick={handleSignOut}
                  style={{background: 'rgba(255,255,255,0.1)', border: 'none', padding: '12px 24px', borderRadius: '12px', color: '#fff', fontWeight: 600, cursor: 'pointer'}}
              >
                  Sign Out
              </button>
          </div>
      )
  }

  const isMissingUsername = session && isDataLoaded && (!accountInfo?.username || accountInfo.username.trim() === '');

  if (session && (showOnboarding || isMissingUsername)) {
      return (
          <CompleteProfile 
             onComplete={handleCompleteOnboarding} 
             loading={onboardingLoading} 
             onSignOut={handleSignOut}
          />
      );
  }

  if (session && !isDataLoaded) {
      return (
          <div style={{...styles.container, alignItems: 'center', justifyContent: 'center'}}>
              <Loader2 className="animate-spin text-white" size={48} />
              <p style={{marginTop: '20px', color: 'rgba(255,255,255,0.7)'}}>Syncing your world...</p>
          </div>
      );
  }

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
            periods={periods}
            announcement={globalAnnouncement}
            username={accountInfo?.username || 'Student'}
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
            onUpdateEvent={handleAddEvent}
            periods={periods}
          />
        );
      case 'grades':
        return <GradesView grades={grades} setGrades={setGrades} />;
      case 'gym':
        return (
            <GymView 
                onBack={() => setCurrentView('dashboard')} 
                foodLogs={foodLogs}
                waterLogs={waterLogs}
                workoutSessions={workoutSessions}
                routines={routines}
                customExercises={customExercises}
                settings={gymSettings}
                addFoodLog={addFoodLog}
                updateFoodLog={updateFoodLog}
                deleteFoodLog={deleteFoodLog}
                addWaterLog={addWaterLog}
                addWorkoutSession={addWorkoutSession}
                saveRoutine={saveRoutine}
                deleteRoutine={deleteRoutine}
                addCustomExercise={addCustomExercise}
                updateSettings={updateSettings}
            />
        );
      case 'courses':
        return (
            <CoursesView 
                events={events.filter(e => e.scheduleId === activeProfileId)} 
                eventColors={eventColors}
                onDeleteCourse={handleDeleteCourseByName}
                onEditCourse={handleEditCourseByName}
                onAddCourse={() => { setEditingEvent({isRecurring: true, type: 'lecture'}); setIsEventModalOpen(true); }}
            />
        );
      case 'materials':
        return <FilesView 
            materials={materials} 
            setMaterials={setMaterials} 
            onConnectDrive={handleConnectDrive}
            driveFiles={driveFiles}
            isDriveLoading={isDriveLoading}
            onFetchDrive={() => session?.provider_token && fetchDriveFiles(session.provider_token)}
        />;
      case 'ai':
        return <AIChat onAddEvent={handleAddEvent} periods={periods} />;
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
             onResetApp={() => handleResetApp(true)}
             onSignOut={handleSignOut}
             periods={periods}
             setPeriods={setPeriods}
             accountInfo={accountInfo}
             onUpdateAccount={handleUpdateAccount}
             themeMode={themeMode}
             setThemeMode={setThemeMode}
             onImpersonate={handleImpersonate}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div style={styles.container}>
      <div style={{position: 'absolute', top: '10px', left: '10px', zIndex: 50}}>
          {syncStatus === 'saving' && <Cloud className="text-white/50 animate-pulse" size={16} />}
          {syncStatus === 'synced' && <Cloud className="text-emerald-500/50" size={16} />}
          {(syncStatus === 'error' || syncStatus === 'offline') && <CloudOff className="text-red-500" size={16} />}
      </div>

      {impersonatedUserId && (
          <div className="fixed top-0 left-0 right-0 h-8 bg-red-600 z-[9999] flex items-center justify-center gap-4 text-white text-xs font-bold uppercase shadow-xl animate-in slide-in-from-top">
              <div className="flex items-center gap-2">
                  <Eye size={14} className="animate-pulse" />
                  <span>Viewing as {accountInfo?.username || 'User'}</span>
              </div>
              <button 
                  onClick={handleExitImpersonation}
                  className="bg-white text-red-600 px-2 py-0.5 rounded text-[10px] hover:bg-gray-100 transition"
              >
                  Exit View
              </button>
          </div>
      )}

      <main style={styles.main}>
        <div key={currentView} className={`animate-fade-in-up w-full h-full flex flex-col ${impersonatedUserId ? 'pt-8' : ''}`}>
           {renderContent()}
        </div>
      </main>
      
      {currentView !== 'gym' && <Navigation currentView={currentView} onNavigate={setCurrentView} />}
      
      {isEventModalOpen && <AddEventModal isOpen={isEventModalOpen} onClose={() => setIsEventModalOpen(false)} onSave={handleAddEvent} eventColors={eventColors} initialData={editingEvent} periods={periods} existingCourses={existingCourses} />}
      {selectedTask && (
        <div style={styles.modalOverlay} onClick={() => setSelectedTask(null)}>
            <div style={{...styles.modalContent, padding: '24px'}} onClick={e => e.stopPropagation()}>
                <h2 style={{color: 'var(--text-primary)', margin: '0 0 10px 0'}}>{selectedTask.title}</h2>
                <div style={{display: 'flex', gap: '8px', marginBottom: '16px'}}>
                    <button onClick={() => { setEditingEvent(selectedTask); setIsEventModalOpen(true); setSelectedTask(null); }} style={styles.button}><Pencil size={16}/> Edit</button>
                    <button onClick={() => { handleDeleteEvent(selectedTask.id); setSelectedTask(null); }} style={{...styles.button, backgroundColor: theme.danger}}><Trash2 size={16}/> Delete</button>
                </div>
                <button onClick={() => setSelectedTask(null)} style={styles.secondaryButton}>Close</button>
            </div>
        </div>
      )}
      {isVerifyModalOpen && (
         <div style={styles.modalOverlay}>
             <div style={{...styles.modalContent}}>
                 <h2 style={{color: 'var(--text-primary)', marginBottom: '16px'}}>Import Schedule</h2>
                 <p style={{color: theme.textMuted}}>Found {extractedEvents.length} events.</p>
                 <div style={{display: 'flex', gap: '8px', marginTop: '16px'}}>
                     <button onClick={handleConfirmImport} style={styles.button}><Check size={16}/> Confirm</button>
                     <button onClick={() => setIsVerifyModalOpen(false)} style={styles.secondaryButton}>Cancel</button>
                 </div>
             </div>
         </div>
      )}
      
      <style>{`@keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } } @keyframes spin { to { transform: rotate(360deg); } } ::-webkit-scrollbar { width: 0px; background: transparent; }`}</style>
    </div>
  );
};

export default App;