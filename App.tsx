
import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import { remindersEnabled, syncReminders } from './services/notifications';
import PortalSettings from './components/PortalSettings';
import { getPortalAccount, getPortalSummary, getPortalExamSeats, getPortalAlertTopic, isBarkTopic, syncPortal, clearPortalCache, bindPortalUser, courseCodeOf, PortalExamSeat, PortalClass } from './services/portal';
import { checkPortalChanges } from './services/portalAlerts';
import { supabase } from './lib/supabase';
import { ViewState, ScheduleEvent, ScheduleProfile, EventColorMap, EventType, PeriodDefinition, Announcement, ThemeMode, FoodItem, WaterLog, WorkoutSession, WorkoutRoutine, ExerciseDefinition, GymSettings, ActiveGymState, CourseGrade, ToDoItem, MaterialFile, BodyLog } from './types';
import { INITIAL_EVENTS, INITIAL_PROFILES, INITIAL_COLORS, INITIAL_PERIODS, DEFAULT_GYM_SETTINGS, DEFAULT_ROUTINES, INITIAL_FILES, generateId } from './constants';
import { styles } from './theme';
import { isCachedData, isScheduleEvent, isCourseGrade, isToDoItem } from './utils/schemas';
import { logError, logInfo, logWarn } from './utils/logger';

import Auth from './components/Auth';
import LandingPage from './components/LandingPage';
import { Capacitor } from '@capacitor/core';
import CompleteProfile from './components/CompleteProfile';
import Navigation from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import Schedule from './components/Schedule';

import AddEventModal from './components/AddEventModal';
import EventDetailsModal from './components/EventDetailsModal';
import PasskeyPrompt from './components/PasskeyPrompt';
import WhatsNew, { markWhatsNewSeen } from './components/WhatsNew';
import ReplyNotifier from './components/ReplyNotifier';

// Screens that are not needed to open the app load on demand, so the first screen shows much sooner.
const AIChat = lazy(() => import('./components/AIChat'));
const Settings = lazy(() => import('./components/Settings'));
const GymView = lazy(() => import('./components/GymView'));
const ToDoList = lazy(() => import('./components/ToDoList'));
const ImageImportModal = lazy(() => import('./components/ImageImportModal'));
const SmartImportModal = lazy(() => import('./components/SmartImportModal'));
const SubscriptionPage = lazy(() => import('./components/SubscriptionPage'));
const UniversalGradeCalculator = lazy(() => import('./components/UniversalGradeCalculator'));
const PaymentPage = lazy(() => import('./components/PaymentPage'));
const CoursesView = lazy(() => import('./components/CoursesView'));
const MaterialsView = lazy(() => import('./components/MaterialsView'));
const MaterialsHub = lazy(() => import('./components/CmsScreens'));
const PortalGrades = lazy(() => import('./components/PortalScreens').then(m => ({ default: m.PortalGrades })));
const PortalAttendance = lazy(() => import('./components/PortalScreens').then(m => ({ default: m.PortalAttendance })));
const PortalExamSeats = lazy(() => import('./components/PortalScreens').then(m => ({ default: m.PortalExamSeats })));
// after the first screen is up, quietly fetch the rest in the background so opening them feels instant
const prefetchScreens = () => {
  const go = () => {
    [() => import('./components/Settings'), () => import('./components/CoursesView'), () => import('./components/ToDoList'),
      () => import('./components/CmsScreens'), () => import('./components/PortalScreens'), () => import('./components/AIChat'),
      () => import('./components/GymView'), () => import('./components/MaterialsView')]
      .forEach((load, i) => setTimeout(() => { load().catch(() => {}); }, 400 * i));
  };
  const idle = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback;
  if (idle) idle(go, { timeout: 4000 }); else setTimeout(go, 2500);
};

// Error Boundary Component
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("App Crash:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-3xl p-8 text-center backdrop-blur-xl">
            <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="text-red-500" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
            <p className="text-white/60 mb-8 text-sm">
              The application encountered an unexpected error. This usually happens when data is malformed.
            </p>
            <div className="bg-black/20 rounded-xl p-4 mb-8 text-left overflow-auto max-h-32">
              <code className="text-xs text-red-400 font-mono">
                {this.state.error?.message || "Unknown error"}
              </code>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-white text-black py-4 rounded-2xl font-bold hover:bg-white/90 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw size={20} />
              Restart Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// the old default tutorial color (light cyan) became a darker blue; accounts still on the old default move with it
const refreshColors = (c: EventColorMap): EventColorMap =>
  String(c.tutorial).toLowerCase() === '#6ff1f1' ? { ...c, tutorial: INITIAL_COLORS.tutorial } : c;

export const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const imageModalSeen = useRef(false); // the import modals load only once they have been opened
  const smartModalSeen = useRef(false);
  const [showAuth, setShowAuth] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [view, setView] = useState<ViewState>('dashboard');
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');
  const [isViewingFile, setIsViewingFile] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncingPhase2, setIsSyncingPhase2] = useState(false);
  const isInitializingRef = useRef(false);
  const hasHydratedRef = useRef(false);

  // Onboarding State
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [profileFetched, setProfileFetched] = useState(false); // false until the profile lookup has answered, so nothing flashes
  const [setupChecked, setSetupChecked] = useState(false);     // false until we know if the setup flow is needed
  const [showSetup, setShowSetup] = useState(false); // full-screen portal + alerts setup for new users
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPlanPrice, setSelectedPlanPrice] = useState(0);

  // Schedule Data
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [profiles, setProfiles] = useState<ScheduleProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>('');
  const [eventColors, setEventColors] = useState<EventColorMap>(INITIAL_COLORS);
  const announcement: Announcement | null = null;

  const currentPeriods = profiles.find(p => p.id === activeProfileId)?.periods || INITIAL_PERIODS;

  const handleUpdateProfilePeriods = async (newPeriods: PeriodDefinition[]) => {
      if (!session?.user?.id) return;
      setProfiles(profiles.map(p => p.id === activeProfileId ? { ...p, periods: newPeriods } : p));
      const { error } = await supabase.from('schedule_profiles').update({ periods: newPeriods }).eq('id', activeProfileId);
      if (error) console.error("Error updating periods:", error);
  };

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [viewingEvent, setViewingEvent] = useState<ScheduleEvent | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSmartImportModalOpen, setIsSmartImportModalOpen] = useState(false);

  // Gym Data
  const [gymSettings, setGymSettings] = useState<GymSettings>(DEFAULT_GYM_SETTINGS);
  const [foodLogs, setFoodLogs] = useState<FoodItem[]>([]);
  const [waterLogs, setWaterLogs] = useState<WaterLog[]>([]);
  const [workoutSessions, setWorkoutSessions] = useState<WorkoutSession[]>([]);
  const [gymRoutines, setGymRoutines] = useState<WorkoutRoutine[]>(DEFAULT_ROUTINES);
  const [customExercises, setCustomExercises] = useState<ExerciseDefinition[]>([]);
  const [bodyLogs, setBodyLogs] = useState<BodyLog[]>([]);
  const [activeGymState, setActiveGymState] = useState<ActiveGymState>({
    session: null, activeTimers: {}, restExpiry: null, lastValues: {}
  });
  const gymHydratedRef = useRef(false);

  // Gym data lives in localStorage (it is device-local, not synced to Supabase).
  // Without this, every refresh wiped all workouts, meals and settings.
  useEffect(() => {
    try {
      const raw = localStorage.getItem('unimate_gym_v1');
      if (raw) {
        const g = JSON.parse(raw);
        if (g.settings) setGymSettings({ ...DEFAULT_GYM_SETTINGS, ...g.settings, targets: { ...DEFAULT_GYM_SETTINGS.targets, ...(g.settings.targets || {}) } });
        if (Array.isArray(g.foodLogs)) setFoodLogs(g.foodLogs);
        if (Array.isArray(g.waterLogs)) setWaterLogs(g.waterLogs);
        if (Array.isArray(g.workoutSessions)) setWorkoutSessions(g.workoutSessions);
        if (Array.isArray(g.routines)) setGymRoutines(g.routines);
        if (Array.isArray(g.customExercises)) setCustomExercises(g.customExercises);
        if (Array.isArray(g.bodyLogs)) setBodyLogs(g.bodyLogs);
        if (g.activeGymState && typeof g.activeGymState === 'object') {
          setActiveGymState({ session: null, activeTimers: {}, restExpiry: null, lastValues: {}, ...g.activeGymState });
        }
      }
    } catch (e) {
      logError("GYM_CACHE", e);
    }
    gymHydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!gymHydratedRef.current) return;
    try {
      localStorage.setItem('unimate_gym_v1', JSON.stringify({
        settings: gymSettings,
        foodLogs,
        waterLogs,
        workoutSessions,
        routines: gymRoutines,
        customExercises,
        bodyLogs,
        activeGymState: { ...activeGymState, activeTimers: {} } // running set-timers don't survive reloads
      }));
    } catch (e) {
      logError("GYM_CACHE", e);
    }
  }, [gymSettings, foodLogs, waterLogs, workoutSessions, gymRoutines, customExercises, bodyLogs, activeGymState]);

  // Grades, Courses & ToDo
  const [courses, setCourses] = useState<CourseGrade[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const courseUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCourseUpdatesRef = useRef<Map<string, CourseGrade>>(new Map());

  const forceSaveCourse = async (course: CourseGrade) => {
      const { error } = await supabase.from('courses').update({
          title: course.title,
          code: course.code,
          target_grade: course.targetGrade,
          categories: course.categories
      }).eq('id', course.id);
      
      if (!error) {
          pendingCourseUpdatesRef.current.delete(course.id);
      } else {
          console.error("Error updating course:", error);
      }
  };

  const handleUpdateCourse = (updated: CourseGrade) => {
      setCourses(prev => prev.map(c => c.id === updated.id ? updated : c));
      pendingCourseUpdatesRef.current.set(updated.id, updated);
      
      if (courseUpdateTimeoutRef.current) {
          clearTimeout(courseUpdateTimeoutRef.current);
      }
      
      courseUpdateTimeoutRef.current = setTimeout(async () => {
          await forceSaveCourse(updated);
      }, 500);
  };

  const [toDoItems, setToDoItems] = useState<ToDoItem[]>([]);
  const [files, setFiles] = useState<MaterialFile[]>([]);

  // Persist State to LocalStorage for instant subsequent loads
  useEffect(() => {
    if (!session?.user?.id || !hasHydratedRef.current) return;
    
    const cacheData = {
        events,
        profiles,
        courses,
        todos: toDoItems,
        // CRITICAL FIX: Strip the large file_data (base64) strings from the cached files
        // otherwise localStorage crashes instantly with QuotaExceededError (5MB limit)
        files: files.map(f => ({ ...f, fileData: undefined })),
        profile,
        lastSynced: Date.now()
    };
    
    try {
        localStorage.setItem('unimate_v1_cache', JSON.stringify(cacheData));
    } catch (e) {
        console.error("Local storage quota exceeded or failed:", e);
    }
  }, [events, profiles, courses, toDoItems, files, profile, session?.user?.id]);

  // Local Storage Hydration
  useEffect(() => {
    if (hasHydratedRef.current) return;

    const cachedData = localStorage.getItem('unimate_v1_cache');
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);

        // Validate cache structure
        if (!isCachedData(parsed)) {
          logWarn("CACHE", "Invalid cache structure detected, skipping hydration");
          localStorage.removeItem('unimate_v1_cache');
          hasHydratedRef.current = true;
          return;
        }

        // Safely load validated data
        if (parsed.events && Array.isArray(parsed.events)) {
          const validEvents = parsed.events.filter((e: any) => isScheduleEvent(e));
          if (validEvents.length > 0) setEvents(validEvents);
        }

        if (parsed.profiles && Array.isArray(parsed.profiles)) {
          setProfiles(parsed.profiles);
          const active = parsed.profiles.find((p: any) => p.is_active);
          if (active) setActiveProfileId(active.id);
        }

        if (parsed.courses && Array.isArray(parsed.courses)) {
          const validCourses = parsed.courses.filter((c: any) => isCourseGrade(c));
          if (validCourses.length > 0) setCourses(validCourses);
        }

        if (parsed.todos && Array.isArray(parsed.todos)) {
          const validTodos = parsed.todos.filter((t: any) => isToDoItem(t));
          if (validTodos.length > 0) setToDoItems(validTodos);
        }

        if (parsed.files && Array.isArray(parsed.files)) {
          setFiles(parsed.files.map((f: any) => ({ ...f, fileData: undefined })));
        }

        if (parsed.profile && typeof parsed.profile === 'object') {
          setProfile(parsed.profile);
          if (parsed.profile.settings?.theme) setThemeMode(parsed.profile.settings.theme);
          if (parsed.profile.settings?.eventColors) setEventColors(refreshColors(parsed.profile.settings.eventColors));
        }

        hasHydratedRef.current = true;
        logInfo("CACHE", "Successfully hydrated from cache");
      } catch (e) {
        logError("CACHE", e);
        localStorage.removeItem('unimate_v1_cache');
        hasHydratedRef.current = true;
      }
    } else {
      hasHydratedRef.current = true;
    }
  }, []);

  useEffect(() => {
    // Fallback: If EVERYTHING hangs for 8 seconds, force it to stop
    const loadingTimeout = setTimeout(() => {
       setLoading(false);
    }, 8000);

    const initialize = async () => {
      if (isInitializingRef.current) return;
      isInitializingRef.current = true;
      
      try {
        // Step 1: Check session immediately (most important for "logged in" state)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
            console.error("Session error:", sessionError);
        }
        
        bindPortalUser(session?.user?.id);
        setSession(session);
        
        if (session) {
            // Wait for initial data to be loaded before showing the app
            // This prevents the "stuff is gone" flash
            const refresh = Promise.all([
                fetchProfile(session.user.id),
                fetchUserData(session.user.id)
            ]);
            // A returning user already has a saved copy on this phone (shown a moment ago from the cache),
            // so open straight away and let the fresh data arrive behind it. First-ever launch still waits.
            let warm = false;
            try {
                const c = JSON.parse(localStorage.getItem('unimate_v1_cache') || 'null');
                warm = !!(c && c.profile && Array.isArray(c.events) && Array.isArray(c.profiles) && c.profiles.length);
            } catch { /* no usable copy: wait for the network */ }
            if (warm) {
                setProfileFetched(true);
                setLoading(false);
                clearTimeout(loadingTimeout);
                await refresh.catch(() => undefined);
            } else {
                await refresh;
            }
            hasHydratedRef.current = true;
        } else {
            // Default states for non-logged in users
            if (!hasHydratedRef.current) {
                setEvents(INITIAL_EVENTS);
                setProfiles(INITIAL_PROFILES);
                setActiveProfileId(INITIAL_PROFILES[0].id);
                setFiles(INITIAL_FILES);
                hasHydratedRef.current = true;
            }
        }

        setLoading(false);
        clearTimeout(loadingTimeout);
      } catch (error) {
        console.error("Initialization error:", error);
        setLoading(false);
        clearTimeout(loadingTimeout);
      } finally {
          isInitializingRef.current = false;
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: string, currentSession: any) => {
      bindPortalUser(currentSession?.user?.id);
      setSession(currentSession);
      if ((_event === 'SIGNED_IN' || _event === 'INITIAL_SESSION') && currentSession && !isInitializingRef.current) {
          fetchProfile(currentSession.user.id);
          fetchUserData(currentSession.user.id);
      }
      else if (_event === 'SIGNED_OUT') {
          setProfile(null);
          setProfileFetched(false);
          setEvents(INITIAL_EVENTS);
          setProfiles(INITIAL_PROFILES);
          setActiveProfileId(INITIAL_PROFILES[0].id);
          setCourses([]);
          setToDoItems([]);
          setFiles(INITIAL_FILES);
          localStorage.removeItem('unimate_v1_cache');
      }
    });

    // Subscriptions for Live Syncing
    let channels: any[] = [];
    if (session?.user?.id) {
        const userId = session.user.id;
        const channelNames = ['events', 'schedule_profiles', 'courses', 'todos', 'materials'];
        
        channels = channelNames.map(name => {
            return supabase.channel(`public:${name}:${userId}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: name, filter: `user_id=eq.${userId}` }, () => {
                    // When remote changes occur, we could fetch specifically for that table.
                    // For "faster syncing", we'll just trigger a background fetch of that specific data.
                    // But to keep it simple, we'll just trigger the sync of that specific slice.
                    switch(name) {
                        case 'events': supabase.from('events').select('*').eq('user_id', userId).then((res: any) => res.data && setEvents(res.data.map((e: any) => ({ ...e, scheduleId: e.schedule_id, startTime: e.start_time, durationMinutes: e.duration_minutes, isRecurring: e.is_recurring, dayOfWeek: e.day_of_week, date: e.date })))); break;
                        case 'todos': supabase.from('todos').select('*').eq('user_id', userId).then((res: any) => res.data && setToDoItems(res.data.map((t: any) => ({...t, createdAt: t.created_at})))); break;
                        case 'courses': supabase.from('courses').select('*').eq('user_id', userId).then((res: any) => res.data && setCourses(res.data.map((c: any) => ({ ...c, targetGrade: c.target_grade })))); break;
                        case 'materials': 
                            supabase.from('materials').select('id, name, type, size, date_added, mime_type, parent_id, created_at').eq('user_id', userId).then((res: any) => {
                                if (res.data) {
                                    const updatedFiles = res.data.map((m: any) => ({...m, dateAdded: m.date_added, mimeType: m.mime_type, parentId: m.parent_id}));
                                    setFiles(updatedFiles);
                                    // Trigger background load for any new files detected
                                    setTimeout(() => backgroundLoadFileContents(userId, updatedFiles), 500);
                                }
                            }); 
                            break;
                    }
                })
                .subscribe();
        });
    }

    // Auto-update portal data every 10 minutes while the app is open
    const portalSyncInterval = setInterval(async () => {
      if (!session?.user?.id) return;
      try {
        const res = await syncPortal();
        if (res.ok && res.examSeats) {
          syncSeatsRef.current(res.examSeats, events); // the newest copy, not the one from when the timer started
        }
        if (res.ok) alertPortalChanges(session.user.id, true);
      } catch (e) {
        console.error("Auto portal sync error:", e);
      }
    }, 10 * 60 * 1000);

    return () => {
        subscription.unsubscribe();
        channels.forEach(ch => supabase.removeChannel(ch));
        clearInterval(portalSyncInterval);
    };
  }, [session?.user?.id]);


  // First sign-in: open the full-screen setup and keep it open until it is finished or skipped.
  // Progress is saved (portal login on the server, the rest on this device), so it picks up where it stopped.
  // People who connected the portal before this setup existed are never shown it.
  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) { setShowSetup(false); setSetupChecked(false); return; }
    const doneKey = `unimate_setup_done_${uid}`;
    const startedKey = `unimate_setup_started_${uid}`;
    const has = (k: string) => { try { return !!localStorage.getItem(k); } catch { return false; } };
    const put = (k: string) => { try { localStorage.setItem(k, '1'); } catch { /* storage blocked */ } };
    if (has(doneKey)) { setSetupChecked(true); return; }
    if (has(startedKey)) { setShowSetup(true); setSetupChecked(true); return; } // resume, no network needed
    let cancelled = false;
    getPortalAccount(true)
      .then(a => {
        if (cancelled) return;
        if (a) put(doneKey); // an older user who already connected: nothing to set up
        else { put(startedKey); setShowSetup(true); }
        setSetupChecked(true);
      })
      .catch(() => { if (!cancelled) setSetupChecked(true); /* offline: try again next launch */ });
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  const [whatsNewOpen, setWhatsNewOpen] = useState(false);
  const [openSupportKey, setOpenSupportKey] = useState(0); // bumped when a support banner is tapped

  const finishSetup = () => {
    const uid = session?.user?.id;
    if (uid) { try { localStorage.setItem(`unimate_setup_done_${uid}`, '1'); } catch { /* ignore */ } }
    markWhatsNewSeen(); // a brand-new user has nothing to catch up on
    setView('dashboard'); // always land on the home screen
    setShowSetup(false);
  };

  // Several sign-in events can fire at once. Only one load per user may run, otherwise each one
  // sees "no schedules yet" and adds its own default schedule.
  const userDataLoadRef = useRef<Promise<void> | null>(null);
  const fetchUserData = (userId: string): Promise<void> => {
      if (userDataLoadRef.current) return userDataLoadRef.current;
      const run = loadUserData(userId).finally(() => { userDataLoadRef.current = null; });
      userDataLoadRef.current = run;
      return run;
  };

  const loadUserData = async (userId: string) => {
      setIsSyncing(true);
      try {
          const [eventsRes, profilesRes, coursesRes, todosRes, materialsRes] = await Promise.all([
              supabase.from('events').select('*').eq('user_id', userId),
              supabase.from('schedule_profiles').select('*').eq('user_id', userId),
              supabase.from('courses').select('*').eq('user_id', userId),
              supabase.from('todos').select('*').eq('user_id', userId),
              // CRITICAL OPTIMIZATION: Do not fetch file_data on initial load. 
              // This field can be massive and slows down everything.
              supabase.from('materials').select('id, name, type, size, date_added, mime_type, parent_id, created_at').eq('user_id', userId)
          ]);

          let finalEvents: ScheduleEvent[] = [];
          let finalProfiles: ScheduleProfile[] = [];
          let finalCourses: CourseGrade[] = [];
          let finalTodos: ToDoItem[] = [];
          let finalFiles: MaterialFile[] = [];

          // Process Events
          if (eventsRes.data && eventsRes.data.length > 0) {
              finalEvents = eventsRes.data.map((e: any) => ({
                  ...e,
                  scheduleId: e.schedule_id,
                  startTime: e.start_time,
                  durationMinutes: e.duration_minutes,
                  isRecurring: e.is_recurring,
                  dayOfWeek: e.day_of_week,
                  date: e.date
              }));
              setEvents(finalEvents);
          } else {
              setEvents([]);
          }

          // Process Profiles
          if (profilesRes.data && profilesRes.data.length > 0) {
              // Older accounts only saved 5 periods: add the 6th and 7th
              finalProfiles = profilesRes.data.map((p: any) => {
                  const ps = Array.isArray(p.periods) ? p.periods : [];
                  if (ps.length > 0 && ps[ps.length - 1]?.id === 'p5' && !ps.some((x: any) => x.id === 'p6')) {
                      const extra = INITIAL_PERIODS.filter(x => ['b5', 'p6', 'b6', 'p7'].includes(x.id));
                      const merged = [...ps, ...extra];
                      supabase.from('schedule_profiles').update({ periods: merged }).eq('id', p.id).then(() => {});
                      return { ...p, periods: merged };
                  }
                  return p;
              });
              setProfiles(finalProfiles);
              const active = finalProfiles.find((p: any) => p.is_active);
              if (active) setActiveProfileId(active.id);
              else setActiveProfileId(profilesRes.data[0].id);
          } else {
              // Insert default profiles
              const defaultProfiles = INITIAL_PROFILES.map((p, index) => ({
                  id: generateId(),
                  user_id: userId,
                  name: p.name,
                  is_active: index === 0,
                  periods: p.periods
              }));
              
              const { error } = await supabase.from('schedule_profiles').insert(defaultProfiles);
              if (!error) {
                  finalProfiles = defaultProfiles;
                  setProfiles(defaultProfiles);
                  setActiveProfileId(defaultProfiles[0].id);
              }
          }

          // Process Courses
          if (coursesRes.data) {
              finalCourses = coursesRes.data.map((c: any) => ({ ...c, targetGrade: c.target_grade }));
              setCourses(finalCourses);
          }

          // Process Todos
          if (todosRes.data) {
              finalTodos = todosRes.data.map((t: any) => ({...t, createdAt: t.created_at}));
              setToDoItems(finalTodos);
          }

          // Process Materials
          if (materialsRes.data) {
              finalFiles = materialsRes.data.map((m: any) => ({
                  ...m, 
                  dateAdded: m.date_added, 
                  mimeType: m.mime_type, 
                  parentId: m.parent_id,
                  fileData: undefined // Not loaded yet in Phase 1
              }));
              setFiles(finalFiles);
          }

          // Cache for next load
          try {
              localStorage.setItem('unimate_v1_cache', JSON.stringify({
                  events: finalEvents,
                  profiles: finalProfiles,
                  courses: finalCourses,
                  todos: finalTodos,
                  files: finalFiles,
                  lastSynced: Date.now()
              }));
          } catch (e) {
              console.error("Local storage quota exceeded or failed:", e);
          }

          // PHASE 2: Background Loading of File Contents
          setTimeout(() => {
              backgroundLoadFileContents(userId, finalFiles);
          }, 1000);

          // Check portal exam seats and auto-populate schedule events if not present
          getPortalExamSeats().then(examSeats => {
            if (examSeats && examSeats.length > 0) {
              syncExamSeatsToSchedule(examSeats, finalEvents);
            }
          }).catch(e => console.error("Error auto-syncing exam seats:", e));

      } catch (err) {
          console.error("Error fetching user data:", err);
      } finally {
          setIsSyncing(false);
      }
  };

  const backgroundLoadFileContents = async (_userId: string, targetFiles?: MaterialFile[]) => {
      // If targetFiles is provided, use it, otherwise use current state
      const filesToFilter = targetFiles || files;
      // Only load content for files that don't have it yet
      const filesToLoad = filesToFilter.filter(f => f.type !== 'folder' && f.fileData === undefined);
      
      if (filesToLoad.length === 0) {
          setIsSyncingPhase2(false);
          return;
      }

      setIsSyncingPhase2(true);
      console.log(`Starting Phase 2: Loading ${filesToLoad.length} file contents via optimized batches...`);
      
      // OPTIMIZATION: Use .in() to fetch multiple documents in a single request
      // and update state once per batch to reduce re-renders.
      const batchSize = 10;
      for (let i = 0; i < filesToLoad.length; i += batchSize) {
          const batch = filesToLoad.slice(i, i + batchSize);
          const batchIds = batch.map(f => f.id);
          
          try {
              const { data, error } = await supabase
                .from('materials')
                .select('id, file_data')
                .in('id', batchIds);
              
              if (!error && data && data.length > 0) {
                  setFiles(prev => prev.map(f => {
                      const match = data.find((d: any) => d.id === f.id);
                      if (match) return { ...f, fileData: match.file_data || '' };
                      return f;
                  }));
              }
          } catch (e) {
              console.error(`Background load batch error at skip ${i}:`, e);
          }
      }
      
      console.log("Phase 2 background loading complete.");
      setIsSyncingPhase2(false);
  };

  const handleLoadFileContent = async (fileId: string): Promise<string> => {
    try {
        const { data, error } = await supabase.from('materials').select('file_data').eq('id', fileId).single();
        if (error) throw error;
        
        const content = data.file_data || '';
        
        // Optimistically update the file in state with the fetched content
        setFiles(prev => prev.map(f => f.id === fileId ? { ...f, fileData: content } : f));
        
        return content;
    } catch (err) {
        console.error("Error loading file content:", err);
        // toast.error("Failed to load file content."); // Suppress to avoid double toast if background fails
        return '';
    }
  };

  // Phone notification for new grades, attendance and exam seats.
  // If the phone will not show notifications, say it inside the app instead.
  const alertPortalChanges = async (userId: string, force = false) => {
    // with Bark on, the server sends the alert itself; do not show it twice
    const silent = isBarkTopic(await getPortalAlertTopic());
    const { alerts, shown } = await checkPortalChanges(userId, { force, silent });
    if (!alerts.length || shown) return;
    toast(alerts.length === 1 ? `${alerts[0].title}: ${alerts[0].body}` : `${alerts.length} portal updates`, { icon: '🔔' });
  };

  // One exam event per seat, forever: the event id is made from the seat itself, so editing the
  // event later never makes a second one, and two checks at the same time can't both add it.
  const examBusy = useRef(false);
  const seatEventId = async (userId: string, seat: PortalExamSeat) => {
    const raw = `${userId}|${(seat.course_key || '').replace(/\s+/g, '').toLowerCase()}|${(seat.exam_type || '').toLowerCase()}`;
    const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw)));
    const x = Array.from(h.slice(0, 16), b => b.toString(16).padStart(2, '0')).join('');
    return `${x.slice(0, 8)}-${x.slice(8, 12)}-4${x.slice(13, 16)}-a${x.slice(17, 20)}-${x.slice(20, 32)}`;
  };

  // Seats come in two shapes: straight from the server check (camelCase) or read from the table (snake_case)
  const asSeat = (s: any): PortalExamSeat => ({
    course_key: s.course_key ?? s.courseKey ?? '',
    course_name: s.course_name ?? s.courseName ?? '',
    exam_day: s.exam_day ?? s.examDay ?? '',
    exam_date: s.exam_date ?? s.examDate ?? null,
    start_time: s.start_time ?? s.startTime ?? '',
    end_time: s.end_time ?? s.endTime ?? '',
    duration_minutes: s.duration_minutes ?? s.durationMinutes ?? 0,
    hall: s.hall ?? '',
    seat: s.seat ?? '',
    exam_type: s.exam_type ?? s.examType ?? '',
  });
  const SEAT_FP_KEY = 'exam_seat_fp_v1'; // what each exam event was last matched to, so a changed seat updates it once
  const readFps = (): Record<string, string> => { try { return JSON.parse(localStorage.getItem(SEAT_FP_KEY) || '{}'); } catch { return {}; } };

  const syncExamSeatsToSchedule = async (rawSeats: any[], currentEvents: ScheduleEvent[]) => {
    const incomingSeats = (rawSeats ?? []).map(asSeat);
    if (!session?.user?.id || !incomingSeats.length) return;
    const scheduleId = activeProfileId || profiles[0]?.id;
    if (!scheduleId) return;
    if (examBusy.current) return;
    examBusy.current = true;
    try {
    // always look at what is really saved, not at a copy that may be old
    const { data: saved } = await supabase.from('events').select('id, code, title, date, type, schedule_id, start_time, duration_minutes, location, description, day_of_week').eq('user_id', session.user.id).eq('type', 'exam');
    const have: any[] = saved ?? [];
    const haveIds = new Set(have.map(e => e.id));

    // clean up copies made by the old bug: same course, same day, same title -> keep one
    const seen = new Set<string>();
    const extra: string[] = [];
    for (const e of have) {
      const k = `${e.schedule_id}|${(e.code || '').replace(/\s+/g, '').toLowerCase()}|${e.date}|${(e.title || '').toLowerCase()}`;
      if (seen.has(k)) extra.push(e.id); else seen.add(k);
    }
    if (extra.length) {
      await supabase.from('events').delete().in('id', extra);
      setEvents(prev => prev.filter(e => !extra.includes(e.id)));
      extra.forEach(id => haveIds.delete(id));
    }
    const live = have.filter(e => !extra.includes(e.id));

    let addedCount = 0;
    const newEventsToAdd: ScheduleEvent[] = [];

    const fps = readFps();
    let updatedCount = 0;
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    for (const seat of incomingSeats) {
      if (!seat.exam_date) continue;
      const eventId = await seatEventId(session.user.id, seat);

      const location = [seat.hall ? `Hall ${seat.hall}` : '', seat.seat ? `Seat ${seat.seat}` : ''].filter(Boolean).join(' · ');
      const descParts = [
        seat.exam_type ? `Type: ${seat.exam_type}` : '',
        seat.hall ? `Hall: ${seat.hall}` : '',
        seat.seat ? `Seat: ${seat.seat}` : ''
      ].filter(Boolean);
      const [y, m, d] = seat.exam_date.split('-').map(Number);
      const dayOfWeek = days[new Date(y, m - 1, d).getDay()];
      const fp = `${seat.exam_date}|${seat.start_time}|${seat.duration_minutes}|${seat.hall}|${seat.seat}`;

      if (haveIds.has(eventId)) {
        // the exam event exists: when the portal's seat changed, the event follows it (date, time, hall, seat).
        // Name and code are never touched, and an unchanged seat never overwrites your own edits.
        const ev: any = have.find(e => e.id === eventId);
        const stored = fps[eventId];
        const startNow = (seat.start_time || '09:00').slice(0, 5);
        const differs = !ev || ev.date !== seat.exam_date || String(ev.start_time || '').slice(0, 5) !== startNow || (ev.location || '') !== (location || 'TBA');
        const changed = stored === undefined ? differs : stored !== fp;
        fps[eventId] = fp;
        if (!changed || !ev) continue;
        const patch = {
          date: seat.exam_date,
          day_of_week: dayOfWeek,
          start_time: startNow,
          duration_minutes: seat.duration_minutes || ev.duration_minutes || 60,
          location: location || 'TBA',
          description: descParts.join(' | ') || 'Exam from Student Portal',
        };
        const { error: upErr } = await supabase.from('events').update(patch).eq('id', eventId).eq('user_id', session.user.id);
        if (!upErr) {
          updatedCount++;
          setEvents(prev => prev.map(e => e.id === eventId ? {
            ...e, date: patch.date, dayOfWeek: patch.day_of_week, startTime: patch.start_time,
            durationMinutes: patch.duration_minutes, location: patch.location, description: patch.description,
          } : e));
        }
        continue;
      }
      // an older event for this exam (made before ids were fixed) counts too
      const keyNorm = (seat.course_key || '').replace(/\s+/g, '').toLowerCase();
      const nameNorm = (seat.course_name || '').toLowerCase();
      const exists = live.some(e => {
        if (e.date !== seat.exam_date) return false;
        const eCodeNorm = (e.code || '').replace(/\s+/g, '').toLowerCase();
        const eTitleNorm = (e.title || '').toLowerCase();
        return (keyNorm && eCodeNorm && eCodeNorm === keyNorm) ||
               (keyNorm && eTitleNorm.includes(keyNorm)) ||
               (nameNorm && eTitleNorm.includes(nameNorm));
      });
      if (exists) continue;

      const dayName = seat.exam_day || dayOfWeek;

      const newExamEvent: ScheduleEvent = {
        id: eventId,
        scheduleId,
        title: `${(seat.course_name || '').replace(/^[A-Za-z]{2,4}\s?\d{3,4}[A-Za-z]?\s+/, '').trim() || seat.course_name} Exam`, // no course code in the name
        code: seat.course_key,
        type: 'exam',
        isRecurring: false,
        dayOfWeek: dayName,
        date: seat.exam_date,
        startTime: seat.start_time || '09:00',
        durationMinutes: seat.duration_minutes || 60,
        location: location || 'TBA',
        description: descParts.join(' | ') || 'Exam from Student Portal',
      };

      const insertPayload = {
        id: newExamEvent.id,
        user_id: session.user.id,
        schedule_id: newExamEvent.scheduleId,
        title: newExamEvent.title,
        type: newExamEvent.type,
        start_time: newExamEvent.startTime,
        duration_minutes: newExamEvent.durationMinutes,
        is_recurring: false,
        day_of_week: newExamEvent.dayOfWeek,
        date: newExamEvent.date,
        location: newExamEvent.location,
        description: newExamEvent.description,
        code: newExamEvent.code,
      };

      const { error } = await supabase.from('events').upsert(insertPayload, { onConflict: 'id', ignoreDuplicates: true });
      if (!error) {
        haveIds.add(eventId);
        fps[eventId] = fp;
        newEventsToAdd.push(newExamEvent);
        addedCount++;
      }
    }
    try { localStorage.setItem(SEAT_FP_KEY, JSON.stringify(fps)); } catch { /* ignore */ }
    if (updatedCount > 0) toast.success(updatedCount === 1 ? 'Updated 1 exam on your schedule' : `Updated ${updatedCount} exams on your schedule`);

    if (newEventsToAdd.length > 0) {
      setEvents(prev => [...prev, ...newEventsToAdd]);
      toast.success(
        addedCount === 1
          ? `Added 1 exam to your schedule!`
          : `Added ${addedCount} exams to your schedule!`
      );
    }
    } finally { examBusy.current = false; }
  };

  const syncSeatsRef = useRef(syncExamSeatsToSchedule);
  syncSeatsRef.current = syncExamSeatsToSchedule;

  const handleSyncAll = async () => {
      if (!session?.user?.id) {
          toast.error("Please log in to sync.");
          return false;
      }
      const toastId = toast.loading("Syncing all data...");
      try {
          // Force save any pending course updates
          if (courseUpdateTimeoutRef.current) {
              clearTimeout(courseUpdateTimeoutRef.current);
          }
          
          const pendingPromises = Array.from(pendingCourseUpdatesRef.current.values()).map(c => forceSaveCourse(c));
          await Promise.all(pendingPromises);
          
          await Promise.all([
              fetchProfile(session.user.id),
              fetchUserData(session.user.id)
          ]);
          
          toast.success("All data synchronized!", { id: toastId });
          return true;
      } catch (err) {
          console.error("Sync error:", err);
          toast.error("Sync failed. Check connection.", { id: toastId });
          return false;
      }
  };

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfileFetched(true);
    if (data) {
      setProfile(data);
      // Update cache
      const cachedData = localStorage.getItem('unimate_v1_cache');
      if (cachedData) {
          const parsed = JSON.parse(cachedData);
          try {
              localStorage.setItem('unimate_v1_cache', JSON.stringify({ ...parsed, profile: data }));
          } catch (e) {
              console.error("Local storage quota exceeded or failed:", e);
          }
      }
      
      // Load saved settings if any
      if (data.settings) {
        if (data.settings.theme) setThemeMode(data.settings.theme);
        if (data.settings.eventColors) setEventColors(refreshColors(data.settings.eventColors));
      }
    }
  };

  const handleUpdateProfile = async (updates: any) => {
    if (!session?.user?.id) return;
    const { error } = await supabase.from('profiles').update(updates).eq('id', session.user.id);
    if (!error) {
      setProfile({ ...profile, ...updates });
    }
  };

  const handleUpdateColor = async (type: EventType, color: string) => {
      const newColors = { ...eventColors, [type]: color };
      setEventColors(newColors);
      if (session?.user?.id) {
          const currentSettings = profile?.settings || {};
          const newSettings = { ...currentSettings, eventColors: newColors };
          await supabase.from('profiles').update({ settings: newSettings }).eq('id', session.user.id);
          setProfile({ ...profile, settings: newSettings });
      }
  };

  // Plans can only be changed by the server (after a real payment), never from the app.
  // Until payments are live, upgrading just tells the person and changes nothing.
  const handleUpgrade = async (_price: number) => {
      toast('Payments aren’t live yet. Everything is free for now.', { icon: '💳' });
  };

  const handleDowngrade = async () => {
      toast('You’re on the free plan.', { icon: '✅' });
  };

  const onAddEvent = async (eventData: Partial<ScheduleEvent>) => {
    if (!session?.user?.id) return;
    const newEvent: ScheduleEvent = {
        id: eventData.id || generateId(),
        scheduleId: activeProfileId,
        title: eventData.title || 'New Event',
        type: eventData.type || 'study',
        startTime: eventData.startTime || '09:00',
        durationMinutes: eventData.durationMinutes || 60,
        isRecurring: eventData.isRecurring || false,
        dayOfWeek: eventData.dayOfWeek,
        date: eventData.isRecurring ? undefined : eventData.date,
        location: eventData.location,
        description: eventData.description,
        code: eventData.code,
        group: eventData.group
    };
    
    // Ensure dayOfWeek is set for non-recurring events if date is provided
    if (!newEvent.isRecurring && newEvent.date && !newEvent.dayOfWeek) {
        const [y, m, d] = newEvent.date.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        newEvent.dayOfWeek = days[dateObj.getDay()];
    }

    // Optimistic UI update
    setEvents(prev => [...prev, newEvent]);
    setIsAddModalOpen(false);
    setEditingEvent(null);

    const insertPayload = {
        id: newEvent.id,
        user_id: session.user.id,
        schedule_id: newEvent.scheduleId,
        title: newEvent.title,
        type: newEvent.type,
        start_time: newEvent.startTime,
        duration_minutes: newEvent.durationMinutes,
        is_recurring: newEvent.isRecurring,
        day_of_week: newEvent.dayOfWeek,
        date: newEvent.date,
        location: newEvent.location || null,
        description: newEvent.description || null,
        code: newEvent.code || null,
        "group": newEvent.group || null
    };
    
    console.log("Adding event to DB:", insertPayload);
    
    const { error } = await supabase.from('events').insert(insertPayload);

    if (error) {
        console.error('Error adding event:', error);
        // Rollback on error
        setEvents(prev => prev.filter(e => e.id !== newEvent.id));
        toast.error("Failed to add event.");
    } else {
        toast.success("Event created successfully!");
    }
  };

  const onAddEvents = async (eventsData: Partial<ScheduleEvent>[], targetProfileId: string, addToCourses: boolean) => {
    if (!session?.user?.id) return;
    
    const newEvents: ScheduleEvent[] = eventsData.map(eventData => {
        const isRecurring = eventData.isRecurring || false;
        const date = isRecurring ? undefined : eventData.date;
        let dayOfWeek = eventData.dayOfWeek;
        
        // Ensure dayOfWeek is set for non-recurring events if date is provided
        if (!isRecurring && date && !dayOfWeek) {
            const [y, m, d] = date.split('-').map(Number);
            const dateObj = new Date(y, m - 1, d);
            const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            dayOfWeek = days[dateObj.getDay()];
        }

        return {
            id: eventData.id || generateId(),
            scheduleId: targetProfileId,
            title: eventData.title || 'New Event',
            type: eventData.type || 'study',
            startTime: eventData.startTime || '09:00',
            durationMinutes: eventData.durationMinutes || 60,
            isRecurring,
            dayOfWeek,
            date,
            location: eventData.location,
            description: eventData.description,
            code: eventData.code,
            group: eventData.group
        };
    });

    const dbEvents = newEvents.map(newEvent => ({
        id: newEvent.id,
        user_id: session.user.id,
        schedule_id: newEvent.scheduleId,
        title: newEvent.title,
        type: newEvent.type,
        start_time: newEvent.startTime,
        duration_minutes: newEvent.durationMinutes,
        is_recurring: newEvent.isRecurring,
        day_of_week: newEvent.dayOfWeek,
        date: newEvent.date,
        location: newEvent.location || null,
        description: newEvent.description || null,
        code: newEvent.code || null,
        "group": newEvent.group || null
    }));

    const { error } = await supabase.from('events').insert(dbEvents);

    if (!error) {
        setEvents(prev => [...prev, ...newEvents]);
        
        if (addToCourses) {
            const distinctCourses = new Map();
            newEvents.forEach(ev => {
                if (ev.title && !distinctCourses.has(ev.title)) {
                    const exists = courses.some(c => c.title?.toLowerCase() === ev.title?.toLowerCase());
                    if (!exists) {
                        distinctCourses.set(ev.title, ev.code);
                    }
                }
            });
            
            const newCourses = Array.from(distinctCourses.entries()).map(([title, code]) => ({
                id: generateId(),
                user_id: session.user.id,
                title: title,
                code: code,
                target_grade: "95",
                categories: []
            }));
            
            if (newCourses.length > 0) {
                const { error: coursesError } = await supabase.from('courses').insert(newCourses);
                if (!coursesError) {
                    setCourses(prev => [...prev, ...newCourses.map(c => ({ ...c, targetGrade: c.target_grade }))]);
                }
            }
        }
    } else {
        console.error('Error adding events:', error);
    }
  };


  /** Drops classes that are already in the schedule (same name, day and start time). */
  const withoutDuplicates = <T extends Partial<ScheduleEvent>>(list: T[], profileId: string): T[] => {
    const key = (t?: string, d?: string, s?: string) => `${t}|${d}|${s}`.toLowerCase();
    const have = new Set(events.filter(e => e.scheduleId === profileId && e.isRecurring).map(e => key(e.title, e.dayOfWeek, e.startTime)));
    return list.filter(e => !(e.isRecurring && have.has(key(e.title, e.dayOfWeek, e.startTime))));
  };

  /** Adds the classes read from the portal to the current schedule. Returns how many were new. */
  const importPortalClasses = async (classes: PortalClass[]): Promise<number> => {
    const minutes = (a: string, b: string) => {
      const [ah, am] = a.split(':').map(Number); const [bh, bm] = b.split(':').map(Number);
      const d = bh * 60 + bm - (ah * 60 + am);
      return d > 0 ? d : 90;
    };
    const fresh = withoutDuplicates(classes.map(c => ({
      title: c.course_name, code: courseCodeOf(c.course_name), location: c.room, group: c.group, type: c.type as EventType,
      dayOfWeek: c.day, startTime: c.time_start, durationMinutes: minutes(c.time_start, c.time_end), isRecurring: true,
    })), activeProfileId);
    if (fresh.length) await onAddEvents(fresh, activeProfileId, true);
    return fresh.length;
  };

  const onClearSchedule = async (profileId: string) => {
      if (!session?.user?.id) return;
      if (!confirm("Are you sure you want to delete all events in this schedule? This cannot be undone.")) return;
      
      const { error } = await supabase.from('events').delete().eq('schedule_id', profileId);
      if (!error) {
          setEvents(prev => prev.filter(e => e.scheduleId !== profileId));
      } else {
          console.error("Error clearing schedule:", error);
      }
  };

  const onUpdateEvent = async (updatedEvent: ScheduleEvent) => {
    if (!session?.user?.id) return;
    
    const finalEvent = {
        ...updatedEvent,
        startTime: updatedEvent.startTime || '09:00',
        durationMinutes: updatedEvent.durationMinutes || 60,
        dayOfWeek: updatedEvent.dayOfWeek,
        date: updatedEvent.isRecurring ? undefined : updatedEvent.date
    };

    // Ensure dayOfWeek is set for non-recurring events if date is provided
    if (!finalEvent.isRecurring && finalEvent.date && !finalEvent.dayOfWeek) {
        const [y, m, d] = finalEvent.date.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        finalEvent.dayOfWeek = days[dateObj.getDay()];
    }

    setEvents(events.map(e => e.id === finalEvent.id ? finalEvent : e));
    setViewingEvent(null);
    
    const updatePayload = {
        title: finalEvent.title,
        type: finalEvent.type,
        start_time: finalEvent.startTime,
        duration_minutes: finalEvent.durationMinutes,
        is_recurring: finalEvent.isRecurring,
        day_of_week: finalEvent.dayOfWeek,
        date: finalEvent.date,
        location: finalEvent.location || null,
        description: finalEvent.description || null,
        code: finalEvent.code || null,
        "group": finalEvent.group || null
    };
    
    console.log("Updating event in DB:", finalEvent.id, updatePayload);
    
    const { error } = await supabase.from('events').update(updatePayload).eq('id', finalEvent.id);

    if (error) {
        console.error("Error updating event:", error);
        console.error("Error updating event: " + error.message);
        throw new Error(error.message);
    }
  };

  const onDeleteEvent = async (id: string) => {
    if (!session?.user?.id) return;
    const backup = events.find(e => e.id === id);
    setEvents(prev => prev.filter(e => e.id !== id));
    setViewingEvent(null);
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) {
        console.error("Error deleting event:", error);
        toast.error("Failed to delete event. Please check your connection.");
        if (backup) setEvents(prev => [...prev, backup]);
    } else {
        toast.success("Event deleted");
    }
  };

  const handleGymUpdate = (updates: Partial<ActiveGymState>) => setActiveGymState(prev => ({ ...prev, ...updates }));

  const isAppReady = !loading || (!session && !loading); // If loading is done, ready. If not logged in and loading checked, ready.

  // Uni portal: when the app opens, refresh if the last check is old, and say so if new grades arrived.
  useEffect(() => {
    if (!session?.user?.id) return;
    const userId = session.user.id;
    let cancelled = false;
    (async () => {
      let summary = await getPortalSummary();
      if (!summary.connected || cancelled) return;
      const age = summary.lastSyncAt ? Date.now() - new Date(summary.lastSyncAt).getTime() : Infinity;
      if (age > 8 * 60 * 1000) {
        await syncPortal();
        if (cancelled) return;
        summary = await getPortalSummary();
      }
      if (!cancelled && summary.newGrades > 0) {
        toast.success(`${summary.newGrades} new grade${summary.newGrades === 1 ? '' : 's'} on the portal`);
      }
      if (!cancelled) alertPortalChanges(userId, true);
    })();
    // the server checks the portal on its own, so look again whenever the app comes back to the front
    const onVisible = () => { if (document.visibilityState === 'visible') alertPortalChanges(userId); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { cancelled = true; document.removeEventListener('visibilitychange', onVisible); };
  }, [session?.user?.id]);

  // once the first screen is up, fetch the other screens quietly in the background
  const prefetched = useRef(false);
  useEffect(() => { if (!loading && !prefetched.current) { prefetched.current = true; prefetchScreens(); } }, [loading]);

  // Class reminders: re-plan whenever the schedule changes or the app comes back to the front.
  useEffect(() => {
    const plan = () => {
      // class reminders are scheduled on the phone itself (Bark cannot hold a reminder for later)
      if (remindersEnabled()) syncReminders(events.filter(e => e.scheduleId === activeProfileId));
    };
    plan();
    const onVisible = () => { if (document.visibilityState === 'visible') plan(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('class-reminders-changed', plan);
    return () => { document.removeEventListener('visibilitychange', onVisible); window.removeEventListener('class-reminders-changed', plan); };
  }, [events, activeProfileId]);

  // signed in but still waiting to learn who this is: keep the loader so no wrong screen flashes by
  const settling = !!session && ((!profile && !profileFetched) || !setupChecked);
  useEffect(() => {
    if (!settling) return;
    const t = setTimeout(() => { setProfileFetched(true); setSetupChecked(true); }, 6000); // never get stuck
    return () => clearTimeout(t);
  }, [settling]);

  if (!isAppReady || settling) return (
    <div style={{...styles.container, justifyContent: 'center', alignItems: 'center', background: 'var(--bg-gradient)'}} className="transition-opacity duration-500 ease-in-out">
      <div className="flex flex-col items-center gap-6 animate-pulse">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-teal-500/20 rounded-full animate-ping absolute inset-0"></div>
          <div className="w-20 h-20 border-4 border-t-teal-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl">🎓</span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-white font-bold text-xl tracking-wider">UNIMATE</h2>
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce"></div>
          </div>
        </div>
      </div>
    </div>
  );

  if (!session) {
    if (showAuth) return <div key="auth" className="page-in-fade"><Auth /></div>;
    // the iPhone app goes straight to sign-in; the website shows the landing page first
    if (Capacitor.isNativePlatform()) return <div key="auth" className="page-in-fade"><Auth /></div>;
    return <div key="landing" className="page-in-fade"><LandingPage onGetStarted={() => setShowAuth(true)} /></div>;
  }

  // suspended accounts can't use the app until the suspension ends
  if (profile?.is_banned && (!profile.banned_until || new Date(profile.banned_until) > new Date())) {
    return (
      <div style={{ ...styles.container, justifyContent: 'center', alignItems: 'center' }} className={themeMode}>
        <div className="w-full max-w-[360px] px-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-3xl">⛔</div>
          <h1 className="mt-5 text-[24px] font-extrabold text-white">Account suspended</h1>
          <p className="mt-2 text-[15px] text-white/55">
            {profile.banned_until
              ? `You can use UniMate again on ${new Date(profile.banned_until).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}.`
              : 'This account can no longer use UniMate.'}
          </p>
          {profile.ban_reason && (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-white/40">Reason</div>
              <p className="mt-1 text-[15px] leading-snug text-white/85">{profile.ban_reason}</p>
            </div>
          )}
          <button onClick={() => { clearPortalCache(); supabase.auth.signOut(); }}
            className="mt-7 w-full rounded-2xl border-0 py-3.5 text-[16px] font-extrabold" style={{ background: 'var(--cta-bg)', color: 'var(--cta-ink)' }}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (profile && !profile.username) {
    return <CompleteProfile 
        loading={false} 
        onComplete={async (data) => {
            await handleUpdateProfile(data);
            toast.success('Profile saved');
            setShowOnboarding(true);
        }} 
        onSignOut={() => { clearPortalCache(); return supabase.auth.signOut(); }}
    />;
  }

  // --- Onboarding Flow ---
  if (showPayment) {
      return (
          <div style={{ ...styles.container, paddingTop: 'calc(env(safe-area-inset-top) + 16px)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }} className={themeMode}>
              <Suspense fallback={null}><PaymentPage 
                  price={selectedPlanPrice} 
                  onSuccess={async () => {
                      await handleUpgrade(selectedPlanPrice);
                      setShowPayment(false);
                      setShowOnboarding(false);
                  }}
                  onCancel={() => setShowPayment(false)}
              /></Suspense>
          </div>
      )
  }

  if (showOnboarding) {
      return (
          <div style={{ ...styles.container, paddingTop: 'calc(env(safe-area-inset-top) + 16px)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }} className={themeMode}>
              <Suspense fallback={null}><SubscriptionPage 
                  subscriptionTier={0} 
                  nextRenewalDate={new Date().toISOString()} 
                  pendingDowngrade={false}
                  isOnboarding={true}
                  onUpgrade={async (price) => {
                      setSelectedPlanPrice(price);
                      setShowPayment(true);
                  }}
                  onDowngrade={async () => {
                      setShowOnboarding(false);
                  }}
                  onBack={() => setShowOnboarding(false)}
              /></Suspense>
          </div>
      )
  }

  if (showSetup) {
    return <div key="setup" className="page-in-fade"><PortalSettings fullscreen onFinish={finishSetup} onImportClasses={importPortalClasses} /></div>;
  }

  const renderContent = () => {
    switch (view) {
      case 'dashboard':
        return <Dashboard 
            events={events.filter(e => e.scheduleId === activeProfileId)}
            eventColors={eventColors}
            onNavigate={setView}
            onEventClick={setViewingEvent}
            onAddEventClick={() => { setEditingEvent(null); setIsAddModalOpen(true); }}
            onSmartImportClick={() => setIsSmartImportModalOpen(true)}
            periods={currentPeriods}
            announcement={announcement}
            username={profile?.username}
            onSync={handleSyncAll}
        />;
      case 'schedule':
        return <Schedule 
            events={events}
            profiles={profiles}
            activeProfileId={activeProfileId}
            eventColors={eventColors}
            onProfileChange={async (id) => {
                setActiveProfileId(id);
                if (session?.user?.id) {
                    // Set all profiles to inactive
                    await supabase.from('schedule_profiles').update({ is_active: false }).eq('user_id', session.user.id);
                    // Set the selected profile to active
                    await supabase.from('schedule_profiles').update({ is_active: true }).eq('id', id);
                }
            }}
            onAddEventClick={() => { setEditingEvent(null); setIsAddModalOpen(true); }}
            onSmartImportClick={() => setIsSmartImportModalOpen(true)}
            onClearScheduleClick={() => onClearSchedule(activeProfileId)}
            onEventClick={setViewingEvent}
            onUpdateEvent={(updates) => {
               if (updates.id) {
                   const ev = events.find(e => e.id === updates.id);
                   if (ev) onUpdateEvent({ ...ev, ...updates } as ScheduleEvent);
               }
            }}
            periods={currentPeriods}
        />;
      case 'ai':
        return <AIChat onAddEvent={onAddEvent} periods={currentPeriods} />;
      case 'gym':
        return <GymView 
            onBack={() => setView('dashboard')}
            foodLogs={foodLogs}
            waterLogs={waterLogs}
            workoutSessions={workoutSessions}
            routines={gymRoutines}
            customExercises={customExercises}
            bodyLogs={bodyLogs}
            settings={gymSettings}
            activeGymState={activeGymState}
            onUpdateActiveGymState={handleGymUpdate}
            addFoodLog={(item) => setFoodLogs(prev => [...prev, item])}
            updateFoodLog={(item) => setFoodLogs(prev => prev.map(l => l.id === item.id ? item : l))}
            deleteFoodLog={(id) => setFoodLogs(prev => prev.filter(l => l.id !== id))}
            addWaterLog={(amount) => setWaterLogs(prev => [...prev, { id: Date.now().toString(), amount, timestamp: Date.now() }])}
            addWorkoutSession={(s) => setWorkoutSessions(prev => [s, ...prev])}
            deleteWorkoutSession={(id) => setWorkoutSessions(prev => prev.filter(s => s.id !== id))}
            saveRoutine={(r) => {
                setGymRoutines(prev => prev.find(rout => rout.id === r.id)
                    ? prev.map(rout => rout.id === r.id ? r : rout)
                    : [...prev, r]);
            }}
            deleteRoutine={(id) => setGymRoutines(prev => prev.filter(r => r.id !== id))}
            addCustomExercise={(ex) => setCustomExercises(prev => [...prev, ex])}
            addBodyLog={(log) => setBodyLogs(prev => [...prev, log])}
            deleteBodyLog={(id) => setBodyLogs(prev => prev.filter(l => l.id !== id))}
            updateSettings={setGymSettings}
        />;
      case 'courses':
        return <CoursesView 
            courses={courses}
            onSelectCourse={setSelectedCourseId}
            onUpdateCourse={handleUpdateCourse}
            onAddCourse={async () => {
                if (!session?.user?.id) return;
                
                let baseTitle = "New Course";
                let title = baseTitle;
                let counter = 1;
                while (courses.some(c => c.title.toLowerCase() === title.toLowerCase())) {
                    title = `${baseTitle} (${counter})`;
                    counter++;
                }

                const newCourse = {
                    id: generateId(),
                    user_id: session.user.id,
                    title: title,
                    target_grade: "95",
                    categories: []
                };
                const optimisticCourse = { ...newCourse, targetGrade: newCourse.target_grade };
                setCourses(prev => [...prev, optimisticCourse]);
                setSelectedCourseId(newCourse.id);
                
                const { error } = await supabase.from('courses').insert(newCourse);
                if (error) {
                    console.error("Error adding course:", error);
                    toast.error("Failed to add course.");
                    setCourses(prev => prev.filter(c => c.id !== newCourse.id));
                    setSelectedCourseId(null);
                } else {
                    toast.success("Course added");
                }
            }}
            onDeleteCourse={async (id) => {
                const backup = courses.find(c => c.id === id);
                setCourses(prev => prev.filter(c => c.id !== id));
                const { error } = await supabase.from('courses').delete().eq('id', id);
                if (error) {
                    console.error("Error deleting course:", error);
                    toast.error("Failed to delete course.");
                    if(backup) setCourses(prev=>[...prev, backup]);
                } else {
                    toast.success("Course deleted");
                }
            }}
        />;
      case 'materials':
        return <MaterialsHub onOpenSettings={() => setView('settings')} filesView={(goBack) => <MaterialsView 
            files={files}
            onAddFile={async (file) => {
                if (!session?.user?.id) return;
                const newFile = {
                    id: file.id,
                    user_id: session.user.id,
                    name: file.name,
                    type: file.type,
                    size: file.size || '0 KB',
                    date_added: file.dateAdded,
                    file_data: file.fileData || null,
                    mime_type: file.mimeType || null,
                    parent_id: file.parentId || null
                };
                
                // Optimistic update
                setFiles(prev => [...prev, file]);
                
                const { error } = await supabase.from('materials').insert(newFile);
                if (error) {
                    console.error("Error adding file:", error);
                    console.error("Failed to save file. It might be too large.");
                    // Rollback on error
                    setFiles(prev => prev.filter(f => f.id !== file.id));
                }
            }}
            onUpdateFile={async (id, updates) => {
                const dbUpdates: any = {};
                if (updates.name !== undefined) dbUpdates.name = updates.name;
                if ('parentId' in updates) dbUpdates.parent_id = updates.parentId;
                if (updates.fileData !== undefined) dbUpdates.file_data = updates.fileData;
                
                console.log("Updating file", id, "with", dbUpdates);
                
                // Optimistic update
                setFiles(prevFiles => prevFiles.map(f => f.id === id ? { ...f, ...updates } : f));
                
                const { error } = await supabase.from('materials').update(dbUpdates).eq('id', id);
                if (error) {
                    console.error("Error updating file:", error);
                    // Rollback if needed, but usually we just log it for now
                }
            }}
            onDeleteFile={async (id) => {
                if (!confirm("Are you sure you want to delete this file?")) return;
                
                const backup = files.find(f => f.id === id);
                // Optimistic update
                setFiles(prev => prev.filter(f => f.id !== id && f.parentId !== id));
                
                const { error } = await supabase.from('materials').delete().eq('id', id);
                if (error) {
                    console.error("Error deleting file:", error);
                    toast.error("Failed to delete file.");
                    if (backup) setFiles(prev => [...prev, backup]);
                } else {
                    toast.success("File deleted.");
                }
            }}
            onLoadFileContent={handleLoadFileContent}
            onBack={goBack}
            onFileViewChange={setIsViewingFile}
        />} />;
      case 'study_groups':
        return <div style={{ padding: '20px' }}><p>Study Groups View - Coming Soon</p></div>;
      case 'grades':
        if (selectedCourseId) {
            const course = courses.find(c => c.id === selectedCourseId);
            if (!course) return <div>Course not found</div>;
            return <UniversalGradeCalculator 
                course={course}
                onUpdate={handleUpdateCourse}
                onBack={() => setSelectedCourseId(null)}
                onDelete={async () => {
                    const idToDelete = selectedCourseId;
                    setCourses(courses.filter(c => c.id !== idToDelete));
                    setSelectedCourseId(null);
                    const { error } = await supabase.from('courses').delete().eq('id', idToDelete);
                    if (error) {
                        console.error("Error deleting course:", error);
                        // Rollback could be implemented here, but for now just log
                    }
                }}
            />;
        }
        return <CoursesView 
            courses={courses}
            onSelectCourse={setSelectedCourseId}
            onUpdateCourse={handleUpdateCourse}
            onAddCourse={async () => {
                if (!session?.user?.id) return;
                
                let baseTitle = "New Course";
                let title = baseTitle;
                let counter = 1;
                while (courses.some(c => c.title.toLowerCase() === title.toLowerCase())) {
                    title = `${baseTitle} (${counter})`;
                    counter++;
                }

                const newCourse = {
                    id: generateId(),
                    user_id: session.user.id,
                    title: title,
                    target_grade: "95",
                    categories: []
                };
                const optimisticCourse = { ...newCourse, targetGrade: newCourse.target_grade };
                setCourses(prev => [...prev, optimisticCourse]);
                setSelectedCourseId(newCourse.id);
                
                const { error } = await supabase.from('courses').insert(newCourse);
                if (error) {
                    console.error("Error adding course:", error);
                    toast.error("Failed to add course.");
                    setCourses(prev => prev.filter(c => c.id !== newCourse.id));
                    setSelectedCourseId(null);
                } else {
                    toast.success("Course added");
                }
            }}
            onDeleteCourse={async (id) => {
                const backup = courses.find(c => c.id === id);
                setCourses(prev => prev.filter(c => c.id !== id));
                const { error } = await supabase.from('courses').delete().eq('id', id);
                if (error) {
                    console.error("Error deleting course:", error);
                    toast.error("Failed to delete course.");
                    if(backup) setCourses(prev=>[...prev, backup]);
                } else {
                    toast.success("Course deleted");
                }
            }}
        />;
      case 'todo':
        return <ToDoList 
            items={toDoItems}
            onAdd={async (text, priority) => {
                if (!session?.user?.id) return;
                const newItem = {
                    id: generateId(),
                    user_id: session.user.id,
                    text,
                    completed: false,
                    priority,
                    created_at: Date.now()
                };
                const optimisticItem = { ...newItem, createdAt: newItem.created_at };
                setToDoItems(prev => [...prev, optimisticItem]);
                const { error } = await supabase.from('todos').insert(newItem);
                if (error) {
                    console.error("Error adding todo:", error);
                    toast.error("Failed to add task. Please check your connection.");
                    setToDoItems(prev => prev.filter(i => i.id !== newItem.id));
                }
            }}
            onToggle={async (id) => {
                const item = toDoItems.find(i => i.id === id);
                if (item) {
                    setToDoItems(toDoItems.map(i => i.id === id ? { ...i, completed: !i.completed } : i));
                    const { error } = await supabase.from('todos').update({ completed: !item.completed }).eq('id', id);
                    if (error) console.error("Error toggling todo:", error);
                }
            }}
            onDelete={async (id) => {
                setToDoItems(toDoItems.filter(i => i.id !== id));
                const { error } = await supabase.from('todos').delete().eq('id', id);
                if (error) console.error("Error deleting todo:", error);
            }}
            onBack={() => setView('dashboard')}
        />;
      case 'subscription':
        return <SubscriptionPage 
            subscriptionTier={profile?.subscription_tier || 0}
            nextRenewalDate={new Date().toISOString()} // Mock
            pendingDowngrade={false}
            onUpgrade={handleUpgrade}
            onDowngrade={handleDowngrade}
            onBack={() => setView('settings')}
        />;
      
      case 'portal_grades':
        return <PortalGrades onBack={() => setView('dashboard')} onOpenSettings={() => setView('settings')} />;
      case 'attendance':
        return <PortalAttendance onBack={() => setView('dashboard')} onOpenSettings={() => setView('settings')} />;
      case 'exam_seats':
        return (
          <PortalExamSeats
            onBack={() => setView('dashboard')}
            onOpenSettings={() => setView('settings')}
            onSyncCompleted={(seats) => syncExamSeatsToSchedule(seats, events)}
          />
        );
      case 'settings':
        return <Settings 
            openSupportKey={openSupportKey}
            onSupportOpened={() => setOpenSupportKey(0)}
            profiles={profiles}
            activeProfileId={activeProfileId}
            eventColors={eventColors}
            baseEvents={events} 
            onAddProfile={async (name) => {
                if (!session?.user?.id) return;
                const newProfile = { 
                    id: generateId(), 
                    name, 
                    periods: INITIAL_PERIODS,
                    user_id: session.user.id,
                    is_active: false
                };
                const { error } = await supabase.from('schedule_profiles').insert(newProfile);
                if (!error) setProfiles([...profiles, newProfile]);
            }}
            onSwitchProfile={async (id) => {
                setActiveProfileId(id);
                if (session?.user?.id) {
                    await supabase.from('schedule_profiles').update({ is_active: false }).eq('user_id', session.user.id);
                    await supabase.from('schedule_profiles').update({ is_active: true }).eq('id', id);
                }
            }}
            onDeleteProfile={async (id) => {
                if (profiles.length > 1) {
                    const { error } = await supabase.from('schedule_profiles').delete().eq('id', id);
                    if (!error) {
                        setProfiles(profiles.filter(p => p.id !== id));
                        if (activeProfileId === id) {
                            const nextProfileId = profiles.find(p => p.id !== id)?.id;
                            if (nextProfileId) {
                                setActiveProfileId(nextProfileId);
                                if (session?.user?.id) {
                                    await supabase.from('schedule_profiles').update({ is_active: true }).eq('id', nextProfileId);
                                }
                            }
                        }
                    }
                }
            }}
            onUpdateColor={handleUpdateColor}
            onDeleteEvent={onDeleteEvent}
            onEditEvent={(e) => { setEditingEvent(e); setIsAddModalOpen(true); }}
            onAddBaseEventClick={() => { setEditingEvent(null); setIsAddModalOpen(true); }}
            onImageUpload={() => setIsImportModalOpen(true)}
            isAnalyzing={false}
            onResetApp={() => { 
                setEvents(INITIAL_EVENTS);
                setProfiles(INITIAL_PROFILES);
                // etc...
            }}
            onSignOut={() => { clearPortalCache(); return supabase.auth.signOut(); }}
            periods={currentPeriods}
            setPeriods={handleUpdateProfilePeriods}
            accountInfo={profile}
            onUpdateAccount={handleUpdateProfile}
            themeMode={themeMode}
            setThemeMode={setThemeMode}
            onImpersonate={() => {}}
            onNavigate={setView}
        />;
      default:
        // Fallback
        return (
            <div style={{...styles.scrollableContent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column'}}>
                <h2 style={styles.title}>404</h2>
                <button onClick={() => setView('dashboard')} style={{...styles.button, marginTop: '20px'}}>Back Home</button>
            </div>
        );
    }
  };

  return (
    <div style={styles.container} className={`${themeMode} app-shell`}>
      {((isSyncing) || (isSyncingPhase2 && view === 'materials')) && !loading && (
        <div className="fixed top-20 right-4 z-[2000] flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300">
           <div className={`w-1.5 h-1.5 ${isSyncing ? 'bg-emerald-500' : 'bg-teal-500'} rounded-full animate-pulse`}></div>
           <span className="text-[9px] font-bold text-white/70 uppercase tracking-widest">
               {isSyncing ? 'Syncing Meta' : 'Background Sync'}
           </span>
        </div>
      )}
      <ErrorBoundary>
        {/* keyed by page, so every page switch fades in */}
        <div key={view} className="page-in" style={{ flex: '1 1 0%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Suspense fallback={null}>{renderContent()}</Suspense>
        </div>
      </ErrorBoundary>
      
      {view !== 'gym' && !isViewingFile && (
          <Navigation currentView={view} onNavigate={setView} />
      )}

      <AddEventModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSave={async (data, addToGrades) => {
            if (editingEvent) await onUpdateEvent({ ...editingEvent, ...data } as ScheduleEvent);
            else await onAddEvent(data);

            if (addToGrades && data.title && session?.user?.id) {
                const exists = courses.some(c => c.title?.toLowerCase() === data.title?.toLowerCase());
                if (!exists) {
                    const newCourse = {
                        id: generateId(),
                        user_id: session.user.id,
                        title: data.title,
                        code: data.code,
                        target_grade: "95",
                        categories: []
                    };
                    const { error } = await supabase.from('courses').insert(newCourse);
                    if (!error) setCourses([...courses, { ...newCourse, targetGrade: newCourse.target_grade }]);
                }
            }
            setIsAddModalOpen(false);
        }}
        eventColors={eventColors}
        initialData={editingEvent}
        periods={currentPeriods}
        courses={courses}
      />

      <EventDetailsModal 
        event={viewingEvent}
        onClose={() => setViewingEvent(null)}
        onStudyNow={() => {}}
        onDelete={onDeleteEvent}
        onEdit={(event) => {
          setViewingEvent(null);
          setEditingEvent(event);
          setIsAddModalOpen(true);
        }}
        eventColors={eventColors}
        periods={currentPeriods}
      />

      {(imageModalSeen.current = imageModalSeen.current || isImportModalOpen) && <Suspense fallback={null}><ImageImportModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={(extracted) => {
            // Logic to convert extracted items to ScheduleEvents
            // Simplified for demo
            console.log("Imported", extracted);
        }}
      /></Suspense>}

      {(smartModalSeen.current = smartModalSeen.current || isSmartImportModalOpen) && (
        <Suspense fallback={null}><SmartImportModal
          open={isSmartImportModalOpen}
          onClose={() => setIsSmartImportModalOpen(false)}
          profiles={profiles}
          activeProfileId={activeProfileId}
          onImport={async (importedEvents, mode, targetProfileId, addToCourses) => {
            const eventsToAdd = importedEvents.map(evData => {
              let finalEvent = { ...evData };
              
              if (mode === 'slots-only' && evData.period_number !== undefined) {
                const targetProfile = profiles.find(p => p.id === targetProfileId);
                const periods = targetProfile?.periods || INITIAL_PERIODS;
                const nonBreakPeriods = periods.filter(p => !p.isBreak);
                const period = nonBreakPeriods[evData.period_number - 1];
                if (period) {
                  finalEvent.startTime = period.startTime;
                  const [sH, sM] = period.startTime.split(':').map(Number);
                  const [eH, eM] = period.endTime.split(':').map(Number);
                  finalEvent.durationMinutes = (eH * 60 + eM) - (sH * 60 + sM);
                }
              }
              return finalEvent;
            });
            
            await onAddEvents(withoutDuplicates(eventsToAdd, targetProfileId), targetProfileId, addToCourses);
          }}
        /></Suspense>
      )}
      <ReplyNotifier userId={session?.user?.id} onOpen={() => { setView('settings'); setOpenSupportKey(k => k + 1); }} />
      <WhatsNew ready={!loading && !isSmartImportModalOpen} onOpenChange={setWhatsNewOpen} />
      <PasskeyPrompt userId={session?.user?.id} ready={!loading && !isSmartImportModalOpen && !whatsNewOpen} />
      <Toaster 
        position="top-center" 
        containerStyle={{
          top: 'max(64px, calc(env(safe-area-inset-top, 0px) + 20px))',
        }}
        toastOptions={{ 
            style: { 
                background: 'rgba(30, 41, 59, 0.85)',
                backdropFilter: 'blur(16px)',
                color: '#fff', 
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '9999px',
                padding: '10px 20px',
                fontSize: '13px',
                fontWeight: '600',
                boxShadow: '0 12px 36px rgba(0,0,0,0.4)',
                maxWidth: 'fit-content'
            },
            success: {
                iconTheme: {
                    primary: '#10b981',
                    secondary: '#fff',
                },
            },
            error: {
                iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                },
            }
        }} 
      />
    </div>
  );
};
