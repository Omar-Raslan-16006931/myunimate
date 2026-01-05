
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabase';
import { 
  Plus, Trash2, Pencil, Ban, 
  FileText, FolderOpen, GraduationCap
} from 'lucide-react';
import { 
  ViewState, ThemeMode, ScheduleEvent, MaterialFile, ScheduleProfile, 
  CourseGrade, PeriodDefinition, EventColorMap, FoodItem, WaterLog, 
  WorkoutSession, WorkoutRoutine, ExerciseDefinition, GymSettings, 
  Announcement, ExtractedScheduleItem, EventType, GradeCategory, ActiveGymState
} from './types';
import { 
  INITIAL_EVENTS, INITIAL_FILES, INITIAL_PROFILES, INITIAL_PERIODS, 
  INITIAL_COLORS, DEFAULT_ROUTINES, DEFAULT_GYM_SETTINGS 
} from './constants';
import { styles, theme } from './theme';

import Auth from './components/Auth';
import LandingPage from './components/LandingPage';
import CompleteProfile from './components/CompleteProfile';
import Dashboard from './components/Dashboard';
import Schedule from './components/Schedule';
import AIChat from './components/AIChat';
import Settings from './components/Settings';
import GymView from './components/GymView';
import Navigation from './components/Navigation';
import AddEventModal from './components/AddEventModal';
import UniversalGradeCalculator from './components/UniversalGradeCalculator';
import SubscriptionPage from './components/SubscriptionPage';
import ImageImportModal from './components/ImageImportModal';

// --- HELPER FUNCTIONS ---

const createDefaultCourseGrade = (title: string, code?: string): CourseGrade => ({
  id: Math.random().toString(36).substr(2, 9),
  title,
  code,
  targetGrade: '90',
  categories: [
    { id: 'c1', name: 'Assignments', weight: '30', dropLowest: '0', items: [] },
    { id: 'c2', name: 'Quizzes', weight: '20', dropLowest: '1', items: [] },
    { id: 'c3', name: 'Midterm', weight: '20', dropLowest: '0', items: [] },
    { id: 'c4', name: 'Final Exam', weight: '30', dropLowest: '0', items: [] },
  ]
});

// --- SUBCOMPONENTS ---

const DatabaseErrorScreen = ({ onRetry }: { onRetry: () => void }) => (
  <div style={{...styles.container, alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px'}}>
      <div style={{marginBottom: '20px', color: theme.danger}}>
          <Ban size={48} />
      </div>
      <h2 style={{color: '#fff', marginBottom: '10px'}}>Connection Issue</h2>
      <p style={{color: theme.textMuted, marginBottom: '20px'}}>
          We couldn't connect to the database. This might be due to network issues or restricted access.
      </p>
      <button onClick={onRetry} style={styles.button}>Retry Connection</button>
  </div>
);

const CoursesView = ({ events, eventColors, onDeleteCourse, onEditCourse, onAddCourse }: any) => {
    const courses = Array.from(new Set(events.map((e: ScheduleEvent) => e.title))).map(title => {
        const ev = events.find((e: ScheduleEvent) => e.title === title);
        return { title, code: ev?.code, location: ev?.location, type: ev?.type as EventType };
    });

    return (
        <div style={styles.scrollableContent}>
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>Classes</h1>
                    <p style={styles.subtitle}>Manage your subjects</p>
                </div>
                <button onClick={onAddCourse} style={{...styles.button, borderRadius: '50%', width: '40px', height: '40px', padding: 0, justifyContent: 'center'}}><Plus size={20} /></button>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                {courses.map((course: any) => (
                    <div key={course.title} style={styles.card}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                            <div>
                                <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px'}}>
                                    <h3 style={{margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#fff'}}>{course.title}</h3>
                                    {course.code && <span style={{fontSize: '0.7rem', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', color: theme.textMuted}}>{course.code}</span>}
                                </div>
                                <div style={{fontSize: '0.8rem', color: theme.textMuted}}>{course.location || 'No location'}</div>
                            </div>
                            <div style={{width: '10px', height: '10px', borderRadius: '50%', background: eventColors[course.type] || theme.accent}}></div>
                        </div>
                    </div>
                ))}
                {courses.length === 0 && <div style={{textAlign: 'center', color: theme.textMuted, padding: '20px'}}>No classes found. Add events to your schedule to see them here.</div>}
            </div>
        </div>
    );
};

const MaterialsView = ({ files }: { files: MaterialFile[] }) => {
    return (
        <div style={styles.scrollableContent}>
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>Materials</h1>
                    <p style={styles.subtitle}>Notes & Resources</p>
                </div>
                <button style={{...styles.button, borderRadius: '50%', width: '40px', height: '40px', padding: 0, justifyContent: 'center'}}><Plus size={20} /></button>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                {files.map(f => (
                    <div key={f.id} style={styles.fileItem}>
                        {f.type === 'folder' ? <FolderOpen size={20} color={theme.accent} /> : <FileText size={20} color={theme.textMuted} />}
                        <div style={{flex: 1}}>
                            <div style={{fontSize: '0.9rem', fontWeight: 600, color: '#fff'}}>{f.name}</div>
                            {f.size && <div style={{fontSize: '0.7rem', color: theme.textMuted}}>{f.size} • {f.dateAdded}</div>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const App = () => {
  // --- AUTH STATE ---
  const [session, setSession] = useState<any>(null);
  const [authView, setAuthView] = useState<'landing' | 'auth'>('landing');
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(false);
  
  // --- APP VIEW STATE ---
  const [view, setView] = useState<ViewState>('dashboard');
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');

  // --- DATA STATE ---
  const [events, setEvents] = useState<ScheduleEvent[]>(INITIAL_EVENTS);
  const [baseEvents, setBaseEvents] = useState<ScheduleEvent[]>(INITIAL_EVENTS.filter(e => e.isRecurring));
  const [files, setFiles] = useState<MaterialFile[]>(INITIAL_FILES);
  const [profiles, setProfiles] = useState<ScheduleProfile[]>(INITIAL_PROFILES);
  const [activeProfileId, setActiveProfileId] = useState<string>(INITIAL_PROFILES[0].id);
  const [periods, setPeriods] = useState<PeriodDefinition[]>(INITIAL_PERIODS);
  const [eventColors, setEventColors] = useState<EventColorMap>(INITIAL_COLORS);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  // --- GYM STATE ---
  const [foodLogs, setFoodLogs] = useState<FoodItem[]>([]);
  const [waterLogs, setWaterLogs] = useState<WaterLog[]>([]);
  const [workoutSessions, setWorkoutSessions] = useState<WorkoutSession[]>([]);
  const [routines, setRoutines] = useState<WorkoutRoutine[]>(DEFAULT_ROUTINES);
  const [customExercises, setCustomExercises] = useState<ExerciseDefinition[]>([]);
  const [gymSettings, setGymSettings] = useState<GymSettings>(DEFAULT_GYM_SETTINGS);
  const [activeGymState, setActiveGymState] = useState<ActiveGymState>({
      session: null, activeTimers: {}, restExpiry: null, lastValues: {}
  });

  // --- GRADES STATE ---
  const [courseGrades, setCourseGrades] = useState<CourseGrade[]>([]);
  const [selectedGradeCourseId, setSelectedGradeCourseId] = useState<string | null>(null);

  // --- MODALS ---
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Partial<ScheduleEvent> | null>(null);
  const [isImageImportOpen, setIsImageImportOpen] = useState(false);
  
  // --- EFFECTS ---

  useEffect(() => {
    const initAuth = async () => {
        setDbError(false);
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) throw error;
            setSession(session);
            if (session) await fetchProfile(session.user.id);
            else setLoading(false);
        } catch (err: any) {
            console.error("Auth init error:", err);
            // Handle network or fetch errors specifically
            if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('Network request failed'))) {
                setDbError(true);
            }
            setLoading(false);
        }
    };
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
          setProfile(null);
          setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
      try {
          const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
          if (error) throw error;
          if (data) {
              setProfile(data);
              // In a real app, we would fetch events, settings etc here from Supabase
              // For now we use local state initialized with constants, 
              // assuming data syncing is handled elsewhere or unimplemented for this demo scope
          }
      } catch (e: any) {
          console.error("Profile fetch error", e);
          if (e.message && (e.message.includes('Failed to fetch') || e.message.includes('Network request failed'))) {
              setDbError(true);
          }
      } finally {
          setLoading(false);
      }
  };

  const handleUpdateProfile = async (data: any) => {
      if (!session?.user?.id) return;
      try {
          await supabase.from('profiles').update(data).eq('id', session.user.id);
          setProfile({ ...profile, ...data });
      } catch (e) {
          console.error("Error updating profile", e);
      }
  };

  const handleSignOut = async () => {
      await supabase.auth.signOut();
      setAuthView('landing');
      setView('dashboard');
  };

  // --- HANDLERS ---

  const handleAddEvent = (eventData: Partial<ScheduleEvent>) => {
      const newEvent: ScheduleEvent = {
          id: eventData.id || crypto.randomUUID(),
          scheduleId: activeProfileId,
          title: eventData.title || 'New Event',
          type: eventData.type || 'study',
          isRecurring: eventData.isRecurring || false,
          startTime: eventData.startTime || '08:00',
          durationMinutes: eventData.durationMinutes || 60,
          ...eventData
      };

      if (eventData.id) {
          setEvents(events.map(e => e.id === eventData.id ? newEvent : e));
      } else {
          setEvents([...events, newEvent]);
      }
      setIsAddEventOpen(false);
      setEditingEvent(null);
  };

  const handleDeleteEvent = (id: string) => {
      setEvents(events.filter(e => e.id !== id));
  };

  const handleImportSchedule = (items: ExtractedScheduleItem[]) => {
      const newEvents: ScheduleEvent[] = items.map(item => ({
          id: crypto.randomUUID(),
          scheduleId: activeProfileId,
          title: item.course_name,
          code: item.course_code,
          type: 'lecture',
          isRecurring: true,
          dayOfWeek: item.day,
          startTime: item.time_start,
          durationMinutes: 90, // Approximation or calc from start/end
          location: item.room
      }));
      setEvents([...events, ...newEvents]);
  };

  // --- GYM HANDLERS ---
  // (Simplified state updaters for gym view)
  const addFoodLog = (item: FoodItem) => setFoodLogs([...foodLogs, item]);
  const updateFoodLog = (item: FoodItem) => setFoodLogs(foodLogs.map(l => l.id === item.id ? item : l));
  const deleteFoodLog = (id: string) => setFoodLogs(foodLogs.filter(l => l.id !== id));
  const addWaterLog = (amount: number) => setWaterLogs([...waterLogs, { id: crypto.randomUUID(), amount, timestamp: Date.now() }]);
  const addWorkoutSession = (s: WorkoutSession) => setWorkoutSessions([s, ...workoutSessions]);
  const deleteWorkoutSession = (id: string) => setWorkoutSessions(workoutSessions.filter(s => s.id !== id));
  const saveRoutine = (r: WorkoutRoutine) => {
      if (routines.find(ro => ro.id === r.id)) {
          setRoutines(routines.map(ro => ro.id === r.id ? r : ro));
      } else {
          setRoutines([...routines, r]);
      }
  };
  const deleteRoutine = (id: string) => setRoutines(routines.filter(r => r.id !== id));
  const addCustomExercise = (ex: ExerciseDefinition) => setCustomExercises([...customExercises, ex]);

  // --- RENDER ---

  if (dbError) {
      return <DatabaseErrorScreen onRetry={() => window.location.reload()} />;
  }

  if (!session && authView === 'landing') {
      return <LandingPage onGetStarted={() => setAuthView('auth')} />;
  }

  if (!session && authView === 'auth') {
      return <Auth />;
  }

  if (loading || (session && !profile)) {
      return (
          <div style={{...styles.container, justifyContent: 'center', alignItems: 'center'}}>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
      );
  }

  if (profile && !profile.username) {
      return <CompleteProfile loading={false} onComplete={handleUpdateProfile} onSignOut={handleSignOut} />;
  }

  const uniqueCourses = Array.from(new Set(events.map(e => e.title))).map(title => {
      const ev = events.find(e => e.title === title);
      return { title, code: ev?.code || '', type: ev?.type || 'lecture' };
  });

  return (
    <div style={styles.container}>
       <div style={styles.main}>
          
          {view === 'dashboard' && (
              <Dashboard 
                  events={events} 
                  eventColors={eventColors}
                  onNavigate={setView}
                  onEventClick={(e) => { setEditingEvent(e); setIsAddEventOpen(true); }}
                  onAddEventClick={() => { setEditingEvent(null); setIsAddEventOpen(true); }}
                  periods={periods}
                  announcement={announcement}
                  username={profile?.username}
              />
          )}

          {view === 'schedule' && (
              <Schedule 
                  events={events}
                  profiles={profiles}
                  activeProfileId={activeProfileId}
                  eventColors={eventColors}
                  onProfileChange={setActiveProfileId}
                  onAddEventClick={() => { setEditingEvent(null); setIsAddEventOpen(true); }}
                  onEventClick={(e) => { setEditingEvent(e); setIsAddEventOpen(true); }}
                  onUpdateEvent={(e) => handleAddEvent({ ...e })}
                  periods={periods}
              />
          )}

          {view === 'courses' && (
              <CoursesView 
                  events={events}
                  eventColors={eventColors}
                  onAddCourse={() => { setEditingEvent(null); setIsAddEventOpen(true); }}
              />
          )}

          {view === 'materials' && (
              <MaterialsView files={files} />
          )}

          {view === 'ai' && (
              <AIChat 
                  onAddEvent={handleAddEvent}
                  periods={periods}
              />
          )}

          {view === 'gym' && (
              <GymView 
                  onBack={() => setView('dashboard')}
                  foodLogs={foodLogs}
                  waterLogs={waterLogs}
                  workoutSessions={workoutSessions}
                  routines={routines}
                  customExercises={customExercises}
                  settings={gymSettings}
                  activeGymState={activeGymState}
                  onUpdateActiveGymState={setActiveGymState}
                  addFoodLog={addFoodLog}
                  updateFoodLog={updateFoodLog}
                  deleteFoodLog={deleteFoodLog}
                  addWaterLog={addWaterLog}
                  addWorkoutSession={addWorkoutSession}
                  deleteWorkoutSession={deleteWorkoutSession}
                  saveRoutine={saveRoutine}
                  deleteRoutine={deleteRoutine}
                  addCustomExercise={addCustomExercise}
                  updateSettings={setGymSettings}
              />
          )}

          {view === 'grades' && (
              selectedGradeCourseId ? (
                  <UniversalGradeCalculator 
                      course={courseGrades.find(c => c.id === selectedGradeCourseId) || createDefaultCourseGrade('New Course')}
                      onUpdate={(c) => setCourseGrades(courseGrades.map(cg => cg.id === c.id ? c : cg))}
                      onBack={() => setSelectedGradeCourseId(null)}
                  />
              ) : (
                  <div style={styles.scrollableContent}>
                      <div style={styles.header}>
                          <h1 style={styles.title}>Grades</h1>
                          <button onClick={() => {
                              const newC = createDefaultCourseGrade('New Course');
                              setCourseGrades([...courseGrades, newC]);
                              setSelectedGradeCourseId(newC.id);
                          }} style={{...styles.button, borderRadius: '50%', width: '40px', height: '40px', padding: 0, justifyContent: 'center'}}><Plus size={20}/></button>
                      </div>
                      <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                          {courseGrades.map(c => (
                              <div key={c.id} onClick={() => setSelectedGradeCourseId(c.id)} style={styles.card}>
                                  <div style={{display: 'flex', justifyContent: 'space-between'}}>
                                      <h3 style={{margin: 0, fontWeight: 700}}>{c.title}</h3>
                                      <span style={{fontSize: '0.8rem', opacity: 0.7}}>Target: {c.targetGrade}%</span>
                                  </div>
                              </div>
                          ))}
                          {courseGrades.length === 0 && <div style={{textAlign: 'center', color: theme.textMuted, padding: '20px'}}>No courses tracked. Add one!</div>}
                      </div>
                  </div>
              )
          )}

          {view === 'settings' && (
              <Settings 
                  profiles={profiles}
                  activeProfileId={activeProfileId}
                  eventColors={eventColors}
                  baseEvents={baseEvents}
                  onAddProfile={(name) => setProfiles([...profiles, { id: crypto.randomUUID(), name }])}
                  onSwitchProfile={setActiveProfileId}
                  onDeleteProfile={(id) => setProfiles(profiles.filter(p => p.id !== id))}
                  onUpdateColor={(t, c) => setEventColors({ ...eventColors, [t]: c })}
                  onDeleteEvent={handleDeleteEvent}
                  onEditEvent={(e) => { setEditingEvent(e); setIsAddEventOpen(true); }}
                  onAddBaseEventClick={() => { setEditingEvent({ isRecurring: true }); setIsAddEventOpen(true); }}
                  onImageUpload={() => setIsImageImportOpen(true)}
                  isAnalyzing={false}
                  onResetApp={() => window.location.reload()}
                  onSignOut={handleSignOut}
                  periods={periods}
                  setPeriods={setPeriods}
                  accountInfo={profile}
                  onUpdateAccount={handleUpdateProfile}
                  themeMode={themeMode}
                  setThemeMode={setThemeMode}
                  onImpersonate={() => {}}
                  onNavigate={setView}
              />
          )}

          {view === 'subscription' && (
              <SubscriptionPage 
                  subscriptionTier={profile?.subscription_tier || 0}
                  onUpgrade={async () => { /* Handle upgrade */ }}
                  onCancel={async () => { /* Handle cancel */ }}
                  onBack={() => setView('settings')}
              />
          )}

       </div>

       {view !== 'gym' && view !== 'landing' && (
           <Navigation currentView={view} onNavigate={setView} />
       )}

       <AddEventModal 
           isOpen={isAddEventOpen}
           onClose={() => setIsAddEventOpen(false)}
           onSave={handleAddEvent}
           eventColors={eventColors}
           initialData={editingEvent}
           periods={periods}
           existingCourses={uniqueCourses as any}
       />

       <ImageImportModal 
           isOpen={isImageImportOpen}
           onClose={() => setIsImageImportOpen(false)}
           onImport={handleImportSchedule}
       />
    </div>
  );
};

export default App;
