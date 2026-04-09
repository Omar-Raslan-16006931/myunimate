
import React, { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from './lib/supabase';
import { ViewState, ScheduleEvent, ScheduleProfile, EventColorMap, EventType, PeriodDefinition, Announcement, ThemeMode, FoodItem, WaterLog, WorkoutSession, WorkoutRoutine, ExerciseDefinition, GymSettings, ActiveGymState, CourseGrade, ToDoItem, MaterialFile } from './types';
import { INITIAL_EVENTS, INITIAL_PROFILES, INITIAL_COLORS, INITIAL_PERIODS, DEFAULT_GYM_SETTINGS, DEFAULT_ROUTINES, DEFAULT_EXERCISES, INITIAL_FILES, generateId } from './constants';
import { styles, theme } from './theme';

import Auth from './components/Auth';
import LandingPage from './components/LandingPage';
import CompleteProfile from './components/CompleteProfile';
import Navigation from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import Schedule from './components/Schedule';
import AIChat from './components/AIChat';
import Settings from './components/Settings';
import GymView from './components/GymView';
import ToDoList from './components/ToDoList';
import ReferralProgram from './components/ReferralProgram';
import AddEventModal from './components/AddEventModal';
import EventDetailsModal from './components/EventDetailsModal';
import ImageImportModal from './components/ImageImportModal';
import SmartImportModal from './components/SmartImportModal';
import SubscriptionPage from './components/SubscriptionPage';
import UniversalGradeCalculator from './components/UniversalGradeCalculator';
import PaymentPage from './components/PaymentPage';
import CoursesView from './components/CoursesView';
import MaterialsView from './components/MaterialsView';
import { StudyGroupsView } from './components/StudyGroupsView';

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

export const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [view, setView] = useState<ViewState>('dashboard');
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');
  const [isViewingFile, setIsViewingFile] = useState(false);

  // Onboarding State
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPlanPrice, setSelectedPlanPrice] = useState(0);

  // Schedule Data
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [profiles, setProfiles] = useState<ScheduleProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>('');
  const [eventColors, setEventColors] = useState<EventColorMap>(INITIAL_COLORS);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

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
  const [activeGymState, setActiveGymState] = useState<ActiveGymState>({
    session: null, activeTimers: {}, restExpiry: null, lastValues: {}
  });

  // Grades, Courses & ToDo
  const [courses, setCourses] = useState<CourseGrade[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [toDoItems, setToDoItems] = useState<ToDoItem[]>([]);
  const [files, setFiles] = useState<MaterialFile[]>(INITIAL_FILES);

  useEffect(() => {
    const initialize = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        if (session) {
            await Promise.all([
                fetchProfile(session.user.id),
                fetchUserData(session.user.id)
            ]);
        } else {
            setEvents(INITIAL_EVENTS);
            setProfiles(INITIAL_PROFILES);
            setActiveProfileId(INITIAL_PROFILES[0].id);
        }
      } catch (error) {
        console.error("Initialization error:", error);
      } finally {
        setLoading(false);
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      setSession(currentSession);
      if (_event === 'SIGNED_IN' && currentSession) {
          try {
            await Promise.all([
                fetchProfile(currentSession.user.id),
                fetchUserData(currentSession.user.id)
            ]);
          } catch (error) {
            console.error("Auth change error:", error);
          }
      }
      else if (_event === 'SIGNED_OUT') {
          setProfile(null);
          setEvents(INITIAL_EVENTS);
          setProfiles(INITIAL_PROFILES);
          setActiveProfileId(INITIAL_PROFILES[0].id);
          setCourses([]);
          setToDoItems([]);
          setFiles(INITIAL_FILES);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string) => {
      // Fetch Events
      const { data: eventsData } = await supabase.from('events').select('*').eq('user_id', userId);
      if (eventsData && eventsData.length > 0) {
          setEvents(eventsData.map((e: any) => ({
              ...e,
              scheduleId: e.schedule_id,
              startTime: e.start_time,
              durationMinutes: e.duration_minutes,
              isRecurring: e.is_recurring,
              dayOfWeek: e.day_of_week,
              date: e.date
          })));
      } else {
          setEvents([]);
      }

      // Fetch Profiles
      const { data: profilesData } = await supabase.from('schedule_profiles').select('*').eq('user_id', userId);
      if (profilesData && profilesData.length > 0) {
          setProfiles(profilesData);
          const active = profilesData.find((p: any) => p.is_active);
          if (active) setActiveProfileId(active.id);
          else setActiveProfileId(profilesData[0].id);
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
              setProfiles(defaultProfiles);
              setActiveProfileId(defaultProfiles[0].id);
          }
      }

      // Fetch Courses
      const { data: coursesData } = await supabase.from('courses').select('*').eq('user_id', userId);
      if (coursesData) setCourses(coursesData.map((c: any) => ({ ...c, targetGrade: c.target_grade })));

      // Fetch Todos
      const { data: todosData } = await supabase.from('todos').select('*').eq('user_id', userId);
      if (todosData) setToDoItems(todosData.map((t: any) => ({...t, createdAt: t.created_at})));

      // Fetch Materials
      const { data: materialsData } = await supabase.from('materials').select('*').eq('user_id', userId);
      if (materialsData) setFiles(materialsData.map((m: any) => ({...m, dateAdded: m.date_added, fileData: m.file_data, mimeType: m.mime_type, parentId: m.parent_id})));
  };

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) {
      setProfile(data);
      // Load saved settings if any
      if (data.settings) {
        if (data.settings.theme) setThemeMode(data.settings.theme);
        if (data.settings.eventColors) setEventColors(data.settings.eventColors);
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

  const handleUpgrade = async (price: number) => {
      if (!session?.user?.id || !profile) return;
      
      try {
          // Upgrade User
          const { error: upgradeError } = await supabase.from('profiles').update({ subscription_tier: 1 }).eq('id', session.user.id);
          if (upgradeError) throw upgradeError;

          setProfile({...profile, subscription_tier: 1});

          // Process Referral Reward
          if (profile.referred_by) {
              const { data: referralData } = await supabase
                  .from('referral_codes')
                  .select('user_id')
                  .eq('code', profile.referred_by)
                  .single();

              if (referralData && referralData.user_id) {
                  const referrerId = referralData.user_id;
                  const commission = price * 0.20; 

                  const { data: referrerProfile } = await supabase
                      .from('profiles')
                      .select('wallet_balance')
                      .eq('id', referrerId)
                      .single();
                  
                  if (referrerProfile) {
                      const newBalance = (referrerProfile.wallet_balance || 0) + commission;
                      await supabase.from('profiles').update({ wallet_balance: newBalance }).eq('id', referrerId);
                      await supabase.from('wallet_ledger').insert({
                          user_id: referrerId,
                          amount: commission,
                          balance_after: newBalance,
                          transaction_type: 'referral_bonus',
                          status: 'completed',
                          description: `Commission from ${profile.username}`,
                          related_user_id: session.user.id
                      });
                  }
              }
          }
          
          if (!showOnboarding) console.log("Upgrade Successful! Welcome to Pro.");
      } catch (err) {
          console.error("Upgrade failed", err);
          console.error("Upgrade failed. Please try again.");
      }
  };

  const handleDowngrade = async () => {
      if (!session?.user?.id) return;
      await supabase.from('profiles').update({ subscription_tier: 0 }).eq('id', session.user.id);
      setProfile({...profile, subscription_tier: 0});
      console.log("Plan cancelled.");
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
        dayOfWeek: eventData.dayOfWeek || null,
        date: eventData.isRecurring ? null : (eventData.date || null),
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

    if (!error) {
        setEvents(prev => [...prev, newEvent]);
        setIsAddModalOpen(false);
        setEditingEvent(null);
    } else {
        console.error('Error adding event:', error);
        throw new Error(error.message);
    }
  };

  const onAddEvents = async (eventsData: Partial<ScheduleEvent>[], targetProfileId: string, addToCourses: boolean) => {
    if (!session?.user?.id) return;
    
    const newEvents: ScheduleEvent[] = eventsData.map(eventData => {
        const isRecurring = eventData.isRecurring || false;
        const date = isRecurring ? null : (eventData.date || null);
        let dayOfWeek = eventData.dayOfWeek || null;
        
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
        dayOfWeek: updatedEvent.dayOfWeek || null,
        date: updatedEvent.isRecurring ? null : (updatedEvent.date || null)
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
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (!error) {
        setEvents(events.filter(e => e.id !== id));
        setViewingEvent(null);
    }
  };

  const handleGymUpdate = (updates: Partial<ActiveGymState>) => setActiveGymState({ ...activeGymState, ...updates });

  if (loading) return (
    <div style={{...styles.container, justifyContent: 'center', alignItems: 'center', background: 'var(--bg-gradient)'}}>
      <div className="flex flex-col items-center gap-6 animate-pulse">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-violet-500/20 rounded-full animate-ping absolute inset-0"></div>
          <div className="w-20 h-20 border-4 border-t-violet-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl">🎓</span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-white font-bold text-xl tracking-wider">UNIMATE</h2>
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce"></div>
          </div>
        </div>
      </div>
    </div>
  );

  if (!session) {
    if (showAuth) return <Auth />;
    return <LandingPage onGetStarted={() => setShowAuth(true)} onShowReferral={() => setShowAuth(true)} />;
  }

  if (profile && !profile.username) {
    return <CompleteProfile 
        loading={false} 
        onComplete={async (data) => {
            await handleUpdateProfile(data);
            setShowOnboarding(true);
        }} 
        onSignOut={() => supabase.auth.signOut()}
    />;
  }

  // --- Onboarding Flow ---
  if (showPayment) {
      return (
          <div style={styles.container} className={themeMode}>
              <PaymentPage 
                  price={selectedPlanPrice} 
                  onSuccess={async () => {
                      await handleUpgrade(selectedPlanPrice);
                      setShowPayment(false);
                      setShowOnboarding(false);
                  }}
                  onCancel={() => setShowPayment(false)}
              />
          </div>
      )
  }

  if (showOnboarding) {
      return (
          <div style={styles.container} className={themeMode}>
              <SubscriptionPage 
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
              />
          </div>
      )
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
            settings={gymSettings}
            activeGymState={activeGymState}
            onUpdateActiveGymState={handleGymUpdate}
            addFoodLog={(item) => setFoodLogs([...foodLogs, item])}
            updateFoodLog={(item) => setFoodLogs(foodLogs.map(l => l.id === item.id ? item : l))}
            deleteFoodLog={(id) => setFoodLogs(foodLogs.filter(l => l.id !== id))}
            addWaterLog={(amount) => setWaterLogs([...waterLogs, { id: Date.now().toString(), amount, timestamp: Date.now() }])}
            addWorkoutSession={(s) => setWorkoutSessions([s, ...workoutSessions])}
            deleteWorkoutSession={(id) => setWorkoutSessions(workoutSessions.filter(s => s.id !== id))}
            saveRoutine={(r) => {
                const exists = gymRoutines.find(rout => rout.id === r.id);
                if (exists) setGymRoutines(gymRoutines.map(rout => rout.id === r.id ? r : rout));
                else setGymRoutines([...gymRoutines, r]);
            }}
            deleteRoutine={(id) => setGymRoutines(gymRoutines.filter(r => r.id !== id))}
            addCustomExercise={(ex) => setCustomExercises([...customExercises, ex])}
            updateSettings={setGymSettings}
        />;
      case 'courses':
        return <CoursesView 
            courses={courses}
            onSelectCourse={setSelectedCourseId}
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
                const { error } = await supabase.from('courses').insert(newCourse);
                if (!error) {
                    setCourses([...courses, { ...newCourse, targetGrade: newCourse.target_grade }]);
                    setSelectedCourseId(newCourse.id);
                }
            }}
            onDeleteCourse={async (id) => {
                const { error } = await supabase.from('courses').delete().eq('id', id);
                if (!error) setCourses(courses.filter(c => c.id !== id));
            }}
        />;
      case 'materials':
        return <MaterialsView 
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
                // Optimistic update
                setFiles(prev => prev.filter(f => f.id !== id && f.parentId !== id));
                await supabase.from('materials').delete().eq('id', id);
                await supabase.from('materials').delete().eq('parent_id', id);
            }}
            onBack={() => setView('dashboard')}
            onFileViewChange={setIsViewingFile}
        />;
      case 'study_groups':
        return <StudyGroupsView 
            onBack={() => setView('dashboard')}
            userId={session?.user?.id}
            username={profile?.username || 'Student'}
        />;
      case 'grades':
        if (selectedCourseId) {
            const course = courses.find(c => c.id === selectedCourseId);
            if (!course) return <div>Course not found</div>;
            return <UniversalGradeCalculator 
                course={course}
                onUpdate={async (updated) => {
                    setCourses(courses.map(c => c.id === updated.id ? updated : c));
                    const { error } = await supabase.from('courses').update({
                        title: updated.title,
                        code: updated.code,
                        target_grade: updated.targetGrade,
                        categories: updated.categories
                    }).eq('id', updated.id);
                    if (error) console.error("Error updating course:", error);
                }}
                onBack={() => setSelectedCourseId(null)}
                onDelete={async () => {
                    const { error } = await supabase.from('courses').delete().eq('id', selectedCourseId);
                    if (!error) {
                        setCourses(courses.filter(c => c.id !== selectedCourseId));
                        setSelectedCourseId(null);
                    }
                }}
            />;
        }
        return <CoursesView 
            courses={courses}
            onSelectCourse={setSelectedCourseId}
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
                const { error } = await supabase.from('courses').insert(newCourse);
                if (!error) {
                    setCourses([...courses, { ...newCourse, targetGrade: newCourse.target_grade }]);
                    setSelectedCourseId(newCourse.id);
                }
            }}
            onDeleteCourse={async (id) => {
                const { error } = await supabase.from('courses').delete().eq('id', id);
                if (!error) setCourses(courses.filter(c => c.id !== id));
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
                const { error } = await supabase.from('todos').insert(newItem);
                if (!error) setToDoItems([...toDoItems, { ...newItem, createdAt: newItem.created_at }]);
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
      case 'referral':
        return <ReferralProgram 
            onBack={() => setView('settings')} 
            isLoggedIn={true} 
            userId={session?.user?.id}
            username={profile?.username} 
            balance={profile?.wallet_balance || 0.00}
            subscriptionTier={profile?.subscription_tier || 0}
            onRefreshProfile={() => session?.user?.id && fetchProfile(session.user.id)}
        />;
      case 'settings':
        return <Settings 
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
            onSignOut={() => supabase.auth.signOut()}
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
    <div style={styles.container} className={themeMode}>
      <ErrorBoundary>
        {renderContent()}
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
                const exists = courses.some(c => c.title.toLowerCase() === data.title.toLowerCase());
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
      />

      <ImageImportModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={(extracted) => {
            // Logic to convert extracted items to ScheduleEvents
            // Simplified for demo
            console.log("Imported", extracted);
        }}
      />

      {isSmartImportModalOpen && (
        <SmartImportModal 
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
            
            await onAddEvents(eventsToAdd, targetProfileId, addToCourses);
          }}
        />
      )}
    </div>
  );
};
