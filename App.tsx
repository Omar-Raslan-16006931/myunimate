

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './lib/supabase';
import { 
  LayoutDashboard, Calendar as CalendarIcon, BookOpen, Folder, Settings as SettingsIcon, 
  Plus, Trash2, Pencil, Check, X, Cloud, CloudOff, Eye, Loader2, Ban, 
  ExternalLink, FileText, Image as ImageIcon, Link as LinkIcon, RefreshCw, FolderOpen,
  GraduationCap
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
import { parseScheduleImage } from './services/geminiService';

import Auth from './components/Auth';
import CompleteProfile from './components/CompleteProfile';
import Dashboard from './components/Dashboard';
import Schedule from './components/Schedule';
import AIChat from './components/AIChat';
import Settings from './components/Settings';
import GymView from './components/GymView';
import Navigation from './components/Navigation';
import AddEventModal from './components/AddEventModal';
import UniversalGradeCalculator from './components/UniversalGradeCalculator';

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
                                <div style={{fontSize: '0.8rem', color: theme.textMuted, display: 'flex', alignItems: 'center', gap: '6px'}}>
                                    <div style={{width: '8px', height: '8px', borderRadius: '50%', backgroundColor: eventColors[course.type] || theme.accent}} />
                                    {course.type.charAt(0).toUpperCase() + course.type.slice(1)}
                                </div>
                            </div>
                            <div style={{display: 'flex', gap: '8px'}}>
                                {/* Edit logic handled via AddEventModal pre-filled, simplification here */}
                                <button onClick={() => onDeleteCourse(course.title)} style={{padding: '8px', background: 'rgba(239, 68, 68, 0.1)', color: theme.danger, borderRadius: '8px', border: 'none'}}><Trash2 size={16} /></button>
                            </div>
                        </div>
                    </div>
                ))}
                {courses.length === 0 && (
                    <div style={{textAlign: 'center', padding: '40px', color: theme.textMuted}}>
                        No courses found. Add events to your schedule to see them here.
                    </div>
                )}
            </div>
        </div>
    );
};

const FilesView = ({ materials, setMaterials, onConnectDrive, driveFiles, isDriveLoading, onFetchDrive }: any) => {
    const [activeTab, setActiveTab] = useState<'local' | 'drive'>('local');

    const handleDelete = (id: string) => {
        if (confirm('Delete file?')) setMaterials(materials.filter((m: MaterialFile) => m.id !== id));
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const newFile: MaterialFile = {
                id: Math.random().toString(36).substr(2, 9),
                name: file.name,
                type: file.type.includes('pdf') ? 'pdf' : file.type.includes('image') ? 'image' : 'other',
                size: `${(file.size / (1024*1024)).toFixed(2)} MB`,
                dateAdded: new Date().toLocaleDateString(),
                source: 'local'
            };
            setMaterials([...materials, newFile]);
        }
    };

    const getIcon = (type: string) => {
        if (type === 'folder') return <Folder size={20} className="text-yellow-400" />;
        if (type === 'pdf') return <FileText size={20} className="text-red-400" />;
        if (type === 'image') return <ImageIcon size={20} className="text-blue-400" />;
        return <FileText size={20} className="text-gray-400" />;
    };

    return (
        <div style={styles.scrollableContent}>
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>Materials</h1>
                    <p style={styles.subtitle}>Documents & Resources</p>
                </div>
                <div style={{display: 'flex', gap: '8px'}}>
                    <button 
                        onClick={() => setActiveTab('local')}
                        style={{...styles.button, backgroundColor: activeTab === 'local' ? theme.accent : 'transparent', border: activeTab === 'local' ? 'none' : '1px solid rgba(255,255,255,0.1)'}}
                    >
                        Local
                    </button>
                    <button 
                        onClick={() => setActiveTab('drive')}
                        style={{...styles.button, backgroundColor: activeTab === 'drive' ? theme.accent : 'transparent', border: activeTab === 'drive' ? 'none' : '1px solid rgba(255,255,255,0.1)'}}
                    >
                        Drive
                    </button>
                </div>
            </div>

            {activeTab === 'local' ? (
                <div>
                    <label style={{...styles.dropZone, display: 'block', marginBottom: '20px'}}>
                        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'}}>
                            <Cloud size={24} color={theme.accent} />
                            <span style={{fontSize: '0.9rem', fontWeight: 600}}>Tap to upload file</span>
                        </div>
                        <input type="file" style={{display: 'none'}} onChange={handleFileUpload} />
                    </label>
                    <div style={{display: 'flex', flexDirection: 'column'}}>
                        {materials.map((file: MaterialFile) => (
                            <div key={file.id} style={styles.fileItem}>
                                {getIcon(file.type)}
                                <div style={{flex: 1, minWidth: 0}}>
                                    <div style={{fontWeight: 600, fontSize: '0.9rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{file.name}</div>
                                    <div style={{fontSize: '0.7rem', color: theme.textMuted}}>{file.size} • {file.dateAdded}</div>
                                </div>
                                <button onClick={() => handleDelete(file.id)} style={{padding: '8px', color: theme.textMuted}}><Trash2 size={16} /></button>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div>
                    <div style={{marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <h3 style={{fontSize: '1rem', fontWeight: 700, color: '#fff', margin: 0}}>Google Drive</h3>
                        <button onClick={onFetchDrive} disabled={isDriveLoading} style={{background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer'}}>
                            <RefreshCw size={16} className={isDriveLoading ? 'animate-spin' : ''} color="#fff" />
                        </button>
                    </div>
                    {driveFiles.length === 0 ? (
                        <div style={{textAlign: 'center', padding: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px'}}>
                            <p style={{color: theme.textMuted, marginBottom: '16px'}}>Connect Google Drive to access files.</p>
                            <button onClick={onConnectDrive} style={styles.button}>Connect Drive</button>
                        </div>
                    ) : (
                        <div style={{display: 'flex', flexDirection: 'column'}}>
                            {driveFiles.map((file: MaterialFile) => (
                                <a key={file.id} href={file.webViewLink} target="_blank" rel="noreferrer" style={{textDecoration: 'none'}}>
                                    <div style={styles.fileItem}>
                                        <img src={file.iconLink} alt="" style={{width: '20px', height: '20px'}} />
                                        <div style={{flex: 1, minWidth: 0}}>
                                            <div style={{fontWeight: 600, fontSize: '0.9rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{file.name}</div>
                                            <div style={{fontSize: '0.7rem', color: theme.textMuted}}>{file.dateAdded}</div>
                                        </div>
                                        <ExternalLink size={16} color={theme.textMuted} />
                                    </div>
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const GradesView = ({ grades, setGrades }: { grades: CourseGrade[], setGrades: React.Dispatch<React.SetStateAction<CourseGrade[]>> }) => {
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

    const handleUpdateCourse = (updated: CourseGrade) => {
        setGrades(prev => prev.map(g => g.id === updated.id ? updated : g));
    };

    const getGrade = (course: CourseGrade) => {
        let totalWeighted = 0;
        let totalWeight = 0;
        course.categories.forEach(cat => {
            const w = parseFloat(cat.weight) || 0;
            const items = cat.items.filter(i => i.score !== '' && i.active !== false);
            if (items.length > 0) {
                const sum = items.reduce((acc, i) => acc + (parseFloat(i.score)/parseFloat(i.total))*100, 0);
                const avg = sum / items.length;
                totalWeighted += avg * (w/100);
                totalWeight += w;
            }
        });
        return totalWeight > 0 ? (totalWeighted / (totalWeight/100)).toFixed(1) : '0.0';
    };

    if (selectedCourseId) {
        const course = grades.find(g => g.id === selectedCourseId);
        if (!course) return null;
        return <UniversalGradeCalculator course={course} onUpdate={handleUpdateCourse} onBack={() => setSelectedCourseId(null)} />;
    }

    return (
        <div style={styles.scrollableContent}>
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>Grades</h1>
                    <p style={styles.subtitle}>GPA Calculator</p>
                </div>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                {grades.map(course => (
                    <div key={course.id} onClick={() => setSelectedCourseId(course.id)} style={{...styles.card, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <div>
                            <h3 style={{margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#fff'}}>{course.title}</h3>
                            <div style={{fontSize: '0.8rem', color: theme.textMuted}}>Target: {course.targetGrade}%</div>
                        </div>
                        <div style={{textAlign: 'right'}}>
                            <div style={{fontSize: '1.5rem', fontWeight: 900, color: theme.accent}}>{getGrade(course)}%</div>
                        </div>
                    </div>
                ))}
                {grades.length === 0 && (
                    <div style={{textAlign: 'center', padding: '40px', color: theme.textMuted}}>
                        No grade profiles found. Add courses to start tracking grades.
                    </div>
                )}
            </div>
        </div>
    );
};

const App: React.FC = () => {
  // ... (State definitions)
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
  const [activeGymState, setActiveGymState] = useState<ActiveGymState>({ session: null, activeTimers: {}, restExpiry: null, lastValues: {} });
  
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

  // ... (useEffect hooks)

  const handleResetApp = (fullClear = false) => {
    // ... (rest of reset logic)
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
    setActiveGymState({ session: null, activeTimers: {}, restExpiry: null, lastValues: {} });
    setDriveFiles([]);
    setCurrentView('dashboard');
    setDbError(false);
  };

  // ... (Other handlers like handleSignOut, handleUpdateAccount, etc.)
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

  // ... (useEffects for auth state and data loading)
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
        // ... (data loading logic)
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

  // ... (fetchDriveFiles, handleConnectDrive, handleCompleteOnboarding, debouncedSave, handleEnterTestMode, fileToBase64)
  const fetchDriveFiles = async (token: string) => {
      // ... existing code
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

  // ... (handleAddEvent, handleDeleteEvent, etc.)
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
  const deleteWorkoutSession = (id: string) => {
      setWorkoutSessions(prev => prev.filter(s => s.id !== id));
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

  // ... (useEffect for ban check)
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

  // ... (Render logic)
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
             onDeleteProfile={handleDeleteProfile}
             onUpdateColor={handleUpdateColor}
             onDeleteEvent={handleDeleteEvent}
             onEditEvent={(e) => { setEditingEvent(e); setIsEventModalOpen(true); }}
             onAddBaseEventClick={() => { setEditingEvent({isRecurring: true}); setIsEventModalOpen(true); }}
             onImageUpload={handleImageUpload}
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

  // ... (Return JSX)
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