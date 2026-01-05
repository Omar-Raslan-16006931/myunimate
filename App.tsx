
import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { ViewState, ScheduleEvent, ScheduleProfile, EventColorMap, EventType, PeriodDefinition, Announcement, ThemeMode, FoodItem, WaterLog, WorkoutSession, WorkoutRoutine, ExerciseDefinition, GymSettings, ActiveGymState, CourseGrade, ToDoItem, MaterialFile } from './types';
import { INITIAL_EVENTS, INITIAL_PROFILES, INITIAL_COLORS, INITIAL_PERIODS, DEFAULT_GYM_SETTINGS, DEFAULT_ROUTINES, DEFAULT_EXERCISES, INITIAL_FILES } from './constants';
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
import SubscriptionPage from './components/SubscriptionPage';
import UniversalGradeCalculator from './components/UniversalGradeCalculator';
import PaymentPage from './components/PaymentPage';

export const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [view, setView] = useState<ViewState>('dashboard');
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');

  // Onboarding State
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPlanPrice, setSelectedPlanPrice] = useState(0);

  // Schedule Data
  const [events, setEvents] = useState<ScheduleEvent[]>(INITIAL_EVENTS);
  const [profiles, setProfiles] = useState<ScheduleProfile[]>(INITIAL_PROFILES);
  const [activeProfileId, setActiveProfileId] = useState<string>(INITIAL_PROFILES[0].id);
  const [eventColors, setEventColors] = useState<EventColorMap>(INITIAL_COLORS);
  const [periods, setPeriods] = useState<PeriodDefinition[]>(INITIAL_PERIODS);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [viewingEvent, setViewingEvent] = useState<ScheduleEvent | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) {
      setProfile(data);
      // Load saved settings if any
      if (data.settings) {
        if (data.settings.theme) setThemeMode(data.settings.theme);
        // Load other settings...
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
          
          if (!showOnboarding) alert("Upgrade Successful! Welcome to Pro.");
      } catch (err) {
          console.error("Upgrade failed", err);
          alert("Upgrade failed. Please try again.");
      }
  };

  const handleDowngrade = async () => {
      if (!session?.user?.id) return;
      await supabase.from('profiles').update({ subscription_tier: 0 }).eq('id', session.user.id);
      setProfile({...profile, subscription_tier: 0});
      alert("Plan cancelled.");
  };

  const onAddEvent = (eventData: Partial<ScheduleEvent>) => {
    const newEvent: ScheduleEvent = {
        id: eventData.id || crypto.randomUUID(),
        scheduleId: activeProfileId,
        title: eventData.title || 'New Event',
        type: eventData.type || 'study',
        startTime: eventData.startTime || '09:00',
        durationMinutes: eventData.durationMinutes || 60,
        isRecurring: eventData.isRecurring || false,
        dayOfWeek: eventData.dayOfWeek,
        date: eventData.date,
        location: eventData.location,
        description: eventData.description,
        code: eventData.code,
        group: eventData.group
    };
    setEvents([...events, newEvent]);
    setIsAddModalOpen(false);
    setEditingEvent(null);
  };

  const onUpdateEvent = (updatedEvent: ScheduleEvent) => {
    setEvents(events.map(e => e.id === updatedEvent.id ? updatedEvent : e));
    setViewingEvent(null);
  };

  const onDeleteEvent = (id: string) => {
    setEvents(events.filter(e => e.id !== id));
    setViewingEvent(null);
  };

  const handleGymUpdate = (updates: Partial<ActiveGymState>) => setActiveGymState({ ...activeGymState, ...updates });

  if (loading) return <div style={{...styles.container, justifyContent: 'center', alignItems: 'center'}}>Loading...</div>;

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
            periods={periods}
            announcement={announcement}
            username={profile?.username}
        />;
      case 'schedule':
        return <Schedule 
            events={events}
            profiles={profiles}
            activeProfileId={activeProfileId}
            eventColors={eventColors}
            onProfileChange={setActiveProfileId}
            onAddEventClick={() => { setEditingEvent(null); setIsAddModalOpen(true); }}
            onEventClick={setViewingEvent}
            onUpdateEvent={(updates) => {
               if (updates.id) {
                   const ev = events.find(e => e.id === updates.id);
                   if (ev) onUpdateEvent({ ...ev, ...updates } as ScheduleEvent);
               }
            }}
            periods={periods}
        />;
      case 'ai':
        return <AIChat onAddEvent={onAddEvent} periods={periods} />;
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
      case 'materials':
        return (
            <div style={{...styles.scrollableContent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column'}}>
                <h2 style={styles.title}>Coming Soon</h2>
                <p style={styles.subtitle}>This module is under construction.</p>
                <button onClick={() => setView('dashboard')} style={{...styles.button, marginTop: '20px'}}>Back Home</button>
            </div>
        );
      case 'grades':
        if (selectedCourseId) {
            const course = courses.find(c => c.id === selectedCourseId);
            if (!course) return <div>Course not found</div>;
            return <UniversalGradeCalculator 
                course={course}
                onUpdate={(updated) => setCourses(courses.map(c => c.id === updated.id ? updated : c))}
                onBack={() => setSelectedCourseId(null)}
            />;
        }
        // Fallback
        return (
            <div style={{...styles.scrollableContent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column'}}>
                <h2 style={styles.title}>Grades</h2>
                <p style={styles.subtitle}>Select a course to view grades</p>
                <button onClick={() => setView('dashboard')} style={{...styles.button, marginTop: '20px'}}>Back Home</button>
            </div>
        );
      case 'todo':
        return <ToDoList 
            items={toDoItems}
            onAdd={(text) => setToDoItems([...toDoItems, { id: crypto.randomUUID(), text, completed: false, createdAt: Date.now() }])}
            onToggle={(id) => setToDoItems(toDoItems.map(i => i.id === id ? { ...i, completed: !i.completed } : i))}
            onDelete={(id) => setToDoItems(toDoItems.filter(i => i.id !== id))}
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
            onAddProfile={(name) => setProfiles([...profiles, { id: crypto.randomUUID(), name }])}
            onSwitchProfile={setActiveProfileId}
            onDeleteProfile={(id) => {
                if (profiles.length > 1) {
                    setProfiles(profiles.filter(p => p.id !== id));
                    if (activeProfileId === id) setActiveProfileId(profiles[0].id);
                }
            }}
            onUpdateColor={(type, color) => setEventColors({ ...eventColors, [type]: color })}
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
            periods={periods}
            setPeriods={setPeriods}
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
      {renderContent()}
      
      {view !== 'gym' && (
          <Navigation currentView={view} onNavigate={setView} />
      )}

      <AddEventModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSave={(data) => {
            if (editingEvent) onUpdateEvent({ ...editingEvent, ...data } as ScheduleEvent);
            else onAddEvent(data);
            setIsAddModalOpen(false);
        }}
        eventColors={eventColors}
        initialData={editingEvent}
        periods={periods}
      />

      <EventDetailsModal 
        event={viewingEvent}
        onClose={() => setViewingEvent(null)}
        onStudyNow={() => {}}
        onDelete={onDeleteEvent}
        onUpdate={onUpdateEvent}
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
    </div>
  );
};
