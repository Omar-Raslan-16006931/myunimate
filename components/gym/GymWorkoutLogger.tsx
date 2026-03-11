

import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Check, Clock, Trash2, MoreHorizontal, 
  Dumbbell, Play, ArrowLeft, Search, History, X, 
  Calendar, ChevronRight, Zap, Timer, Flame, Repeat,
  Minimize2, Maximize2, Pencil, AlertTriangle, Book, LayoutGrid, Save, Info, ChevronDown
} from 'lucide-react';
import { WorkoutSession, WorkoutExercise, MuscleGroup, WorkoutRoutine, ExerciseDefinition, Equipment, GymSettings, ExerciseSet, ActiveGymState } from '../../types';
import { theme } from '../../theme';
import { generateId } from '../../constants';

// --- HELPERS ---

const formatSeconds = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// Formats decimal minutes (1.5) to "1:30"
const formatMinutes = (mins: number) => {
  if (!mins && mins !== 0) return "";
  const totalSeconds = Math.round(mins * 60);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// Parses "1:30" or "1.5" to decimal minutes
const parseToMinutes = (str: string) => {
  if (!str) return 0;
  if (str.includes(':')) {
    const parts = str.split(':');
    const m = parseInt(parts[0]) || 0;
    const s = parseInt(parts[1]) || 0;
    return m + s / 60;
  }
  return parseFloat(str) || 0;
};

// --- SUBCOMPONENTS ---

const MuscleIcon = ({ group }: { group: string }) => {
    const colorMap: Record<string, string> = {
        [MuscleGroup.CHEST]: "text-cyan-400",
        [MuscleGroup.BACK]: "text-indigo-400",
        [MuscleGroup.SHOULDERS]: "text-yellow-400",
        [MuscleGroup.BICEPS]: "text-rose-400",
        [MuscleGroup.TRICEPS]: "text-purple-400",
        [MuscleGroup.FOREARMS]: "text-teal-400",
        
        [MuscleGroup.QUADRICEPS]: "text-blue-400",
        [MuscleGroup.HAMSTRINGS]: "text-pink-400",
        [MuscleGroup.GLUTES]: "text-fuchsia-400",
        [MuscleGroup.CALVES]: "text-emerald-400",
        [MuscleGroup.ADDUCTORS]: "text-lime-400",
        
        [MuscleGroup.ABS]: "text-orange-400",
        [MuscleGroup.CORE]: "text-orange-400",
        [MuscleGroup.CARDIO]: "text-red-400"
    };
    const color = colorMap[group] || "text-white";
    
    return (
        <div className={`w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10 ${color}`}>
            <Dumbbell size={14} />
        </div>
    );
};

const RestTimerInput = ({ value, onChange }: { value: number, onChange: (val: number) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);
    const options = [30, 45, 60, 90, 120, 180];

    const toggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            // Calculate position to ensure it fits on screen
            let left = rect.left;
            if (left + 128 > window.innerWidth) { // 128px is approx dropdown width
                left = window.innerWidth - 138;
            }
            setPosition({ top: rect.bottom + 6, left: left });
        }
        setIsOpen(!isOpen);
    };

    return (
        <>
            <button 
                ref={buttonRef}
                onClick={toggle}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${isOpen ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300' : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'}`}
                title="Rest Timer"
            >
                <Clock size={12} />
                <span>{value}s</span>
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-[60]" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} />
                    <div 
                        className="fixed bg-[#1c1c1e] border border-white/10 rounded-xl shadow-2xl z-[70] overflow-hidden flex flex-col py-1 w-32 animate-in fade-in zoom-in-95 duration-100"
                        style={{ top: position.top, left: position.left }}
                    >
                        <div className="px-3 py-1.5 text-[10px] font-bold text-white/40 uppercase tracking-wider">Presets</div>
                        <div className="grid grid-cols-2 gap-1 px-2 mb-2">
                            {options.map(opt => (
                                <button
                                    key={opt}
                                    onClick={(e) => { e.stopPropagation(); onChange(opt); setIsOpen(false); }}
                                    className={`px-2 py-1.5 text-center text-xs font-bold rounded-lg hover:bg-white/10 transition-colors ${value === opt ? 'bg-indigo-500/20 text-indigo-300' : 'text-white/70'}`}
                                >
                                    {opt}s
                                </button>
                            ))}
                        </div>
                        <div className="h-px bg-white/5 my-1" />
                        <div className="px-2 py-1.5" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-2 py-1">
                                <span className="text-[10px] text-white/40 font-bold">CUSTOM</span>
                                <input 
                                    type="number" 
                                    placeholder={value.toString()}
                                    className="w-full bg-transparent text-xs text-white outline-none font-bold text-right"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const val = parseInt((e.target as HTMLInputElement).value);
                                            if (val > 0) {
                                                onChange(val);
                                                setIsOpen(false);
                                            }
                                        }
                                    }}
                                />
                                <span className="text-[10px] text-white/40">s</span>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );
};

const TimeInput = ({ 
    value, 
    onChange, 
    onToggleTimer, 
    isTimerActive, 
    timerStart,
    now,
    completed,
    placeholder
}: any) => {
    const [isFocused, setIsFocused] = useState(false);
    const [localValue, setLocalValue] = useState(formatMinutes(value));

    useEffect(() => {
        if (!isFocused) setLocalValue(formatMinutes(value));
    }, [value, isFocused]);

    const handleBlur = () => {
        setIsFocused(false);
        onChange(parseToMinutes(localValue));
    };

    if (isTimerActive) {
        const diff = Math.floor((now - timerStart) / 1000);
        const m = Math.floor(diff / 60);
        const s = diff % 60;
        const display = `${m}:${s.toString().padStart(2, '0')}`;
        
        return (
            <button 
                onClick={onToggleTimer}
                className="w-full h-9 bg-red-500/20 text-red-400 border border-red-500/50 rounded-xl flex items-center justify-center gap-2 font-mono font-bold text-sm animate-pulse transition-all hover:bg-red-500/30"
            >
                <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                {display}
            </button>
        );
    }

    return (
        <div className="relative w-full h-9 group">
            <input 
                type="text"
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={handleBlur}
                placeholder={placeholder || "0:00"}
                className={`w-full h-full bg-black/20 rounded-xl py-2 text-center text-white font-bold text-sm outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all pr-8 ${completed ? 'text-emerald-300' : ''} placeholder:text-white/20`}
            />
            <button 
                onClick={onToggleTimer}
                className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-white/30 hover:text-cyan-400 transition hover:scale-110 active:scale-95"
            >
                <Timer size={14} />
            </button>
        </div>
    );
};

// --- TYPES ---

interface WorkoutLoggerProps {
  history: WorkoutSession[];
  routines: WorkoutRoutine[];
  exercises: ExerciseDefinition[];
  saveWorkout: (session: WorkoutSession) => void;
  deleteWorkoutSession: (id: string) => void;
  saveRoutine: (routine: WorkoutRoutine) => void;
  deleteRoutine: (id: string) => void;
  addCustomExercise: (ex: ExerciseDefinition) => void;
  settings: GymSettings;
  activeGymState: ActiveGymState;
  onUpdateActiveGymState: (state: ActiveGymState) => void;
}

// --- MAIN COMPONENT ---

export const GymWorkoutLogger: React.FC<WorkoutLoggerProps> = ({ 
    history, routines, exercises, saveWorkout, deleteWorkoutSession, saveRoutine, deleteRoutine, addCustomExercise, settings, activeGymState, onUpdateActiveGymState 
}) => {
  const [view, setView] = useState<'hub' | 'active'>('hub');
  const [showLibrary, setShowLibrary] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  
  const [duration, setDuration] = useState(0);
  
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isRestMinimized, setIsRestMinimized] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0); // Display time for rest timer

  const [now, setNow] = useState(Date.now());

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const [confirmation, setConfirmation] = useState<{
      isOpen: boolean;
      title: string;
      message: string;
      onConfirm: () => void;
  } | null>(null);

  const [finishModalOpen, setFinishModalOpen] = useState(false);
  const [updateRoutineChecked, setUpdateRoutineChecked] = useState(false);

  // New State for History Details Modal
  const [viewingHistorySession, setViewingHistorySession] = useState<WorkoutSession | null>(null);

  // Initialize view based on active session
  useEffect(() => {
      if (activeGymState.session) {
          setView('active');
      }
  }, [activeGymState.session]);

  const activeSession = activeGymState.session;
  const isResting = !!(activeGymState.restExpiry && activeGymState.restExpiry > Date.now());

  // --- LOGIC ---

  useEffect(() => {
    let interval: number;
    if (activeSession) {
      const start = activeSession.startTime;
      const tick = () => setDuration(Math.floor((Date.now() - start) / 1000));
      tick();
      interval = window.setInterval(tick, 1000);
    }
    return () => clearInterval(interval);
  }, [activeSession]);

  // Rest Timer Ticker
  useEffect(() => {
    let interval: number;
    if (isResting) {
      const tick = () => {
          const remaining = activeGymState.restExpiry ? Math.max(0, Math.ceil((activeGymState.restExpiry - Date.now()) / 1000)) : 0;
          setTimeLeft(remaining);
          if (remaining <= 0) {
              onUpdateActiveGymState({ ...activeGymState, restExpiry: null });
              setIsRestMinimized(false);
          }
      };
      tick();
      interval = window.setInterval(tick, 1000);
    } else {
        setIsRestMinimized(false);
    }
    return () => clearInterval(interval);
  }, [isResting, activeGymState.restExpiry, activeGymState, onUpdateActiveGymState]);

  useEffect(() => {
    let interval: number;
    if (Object.keys(activeGymState.activeTimers).length > 0) {
      interval = window.setInterval(() => setNow(Date.now()), 1000);
    }
    return () => clearInterval(interval);
  }, [activeGymState.activeTimers]);

  const findLastSets = (name: string): ExerciseSet[] | null => {
      // History passed from App is ordered new -> old
      for (const s of history) {
          const found = s.exercises.find(e => e.name === name);
          if (found && found.sets.length > 0) return found.sets;
      }
      return null;
  };

  const startSession = (routine?: WorkoutRoutine, previousSession?: WorkoutSession) => {
    let initialExercises: WorkoutExercise[] = [];
    let sessionName = "Freestyle Workout";
    let routineId: string | undefined = undefined;
    const newLastValues: Record<string, ExerciseSet[]> = {};

    if (previousSession) {
        sessionName = previousSession.name;
        // Keep reps/weight/time from previous session as targets (Pre-filled)
        initialExercises = previousSession.exercises.map(ex => ({
            ...ex,
            id: generateId(),
            sets: ex.sets.map(s => ({ ...s, id: generateId(), completed: false }))
        }));
    } else if (routine) {
        sessionName = routine.name;
        routineId = routine.id;
        initialExercises = routine.exercises.map(ex => {
            // Find last stats for placeholder
            const lastSets = findLastSets(ex.name);
            if (lastSets) newLastValues[ex.name] = lastSets;

            return {
                id: generateId(), name: ex.name, muscleGroup: ex.muscleGroup,
                sets: [{ id: generateId(), weight: 0, reps: 0, completed: false }], 
                restTime: ex.restTime 
            };
        });
    }

    const newSession: WorkoutSession = {
      id: generateId(), name: sessionName, 
      startTime: Date.now(), endTime: 0, exercises: initialExercises, routineId: routineId
    };

    onUpdateActiveGymState({
        session: newSession,
        activeTimers: {},
        restExpiry: null,
        lastValues: newLastValues
    });

    setDuration(0);
    setViewingHistorySession(null);
    setView('active');
  };

  const handleFinishClick = () => {
      setFinishModalOpen(true);
      setUpdateRoutineChecked(!!activeSession?.routineId);
  };

  const confirmFinish = () => {
    if (!activeSession) return;
    
    // Save the workout session history
    saveWorkout({ ...activeSession, endTime: Date.now() });

    // Handle Routine Update
    if (updateRoutineChecked && activeSession.routineId) {
        const existingRoutine = routines.find(r => r.id === activeSession.routineId);
        if (existingRoutine) {
            const updatedExercises: ExerciseDefinition[] = activeSession.exercises.map(ex => {
                const originalDef = exercises.find(e => e.name === ex.name);
                return {
                    id: ex.id, 
                    name: ex.name,
                    muscleGroup: ex.muscleGroup as MuscleGroup,
                    equipment: originalDef?.equipment || 'Other',
                    imageUrl: originalDef?.imageUrl,
                    restTime: ex.restTime
                };
            });

            saveRoutine({
                ...existingRoutine,
                exercises: updatedExercises,
                lastPerformed: Date.now()
            });
        }
    } else if (updateRoutineChecked && !activeSession.routineId) {
        // Save as NEW routine
        const newRoutine: WorkoutRoutine = {
            id: generateId(),
            name: activeSession.name,
            exercises: activeSession.exercises.map(ex => {
                const originalDef = exercises.find(e => e.name === ex.name);
                return {
                    id: generateId(),
                    name: ex.name,
                    muscleGroup: ex.muscleGroup as MuscleGroup,
                    equipment: originalDef?.equipment || 'Other',
                    imageUrl: originalDef?.imageUrl,
                    restTime: ex.restTime
                };
            }),
            lastPerformed: Date.now()
        };
        saveRoutine(newRoutine);
    }

    onUpdateActiveGymState({ session: null, activeTimers: {}, restExpiry: null, lastValues: {} });
    setFinishModalOpen(false);
    setView('hub');
  };

  const addExercise = (exDef: ExerciseDefinition) => {
      if (!activeSession) return;
      
      const lastSets = findLastSets(exDef.name);
      let updatedLastValues = activeGymState.lastValues;
      if (lastSets) {
          updatedLastValues = { ...activeGymState.lastValues, [exDef.name]: lastSets };
      }

      const newEx: WorkoutExercise = {
          id: generateId(), name: exDef.name, muscleGroup: exDef.muscleGroup,
          sets: [{ id: generateId(), weight: 0, reps: 0, completed: false }], 
          restTime: exDef.restTime
      };
      
      onUpdateActiveGymState({
          ...activeGymState,
          session: { ...activeSession, exercises: [...activeSession.exercises, newEx] },
          lastValues: updatedLastValues
      });

      setIsExerciseModalOpen(false); 
      setSearchQuery('');
  };

  const updateSet = (exIdx: number, setIdx: number, field: 'weight' | 'reps', value: number) => {
      if (!activeSession) return;
      const newExs = [...activeSession.exercises];
      newExs[exIdx].sets[setIdx][field] = value;
      onUpdateActiveGymState({ ...activeGymState, session: { ...activeSession, exercises: newExs } });
  };

  const updateRestTime = (exIdx: number, newTime: number) => {
      if (!activeSession) return;
      const newExs = [...activeSession.exercises];
      newExs[exIdx].restTime = newTime;
      onUpdateActiveGymState({ ...activeGymState, session: { ...activeSession, exercises: newExs } });
  };

  const toggleSet = (exIdx: number, setIdx: number) => {
    if (!activeSession) return;
    const newExs = [...activeSession.exercises];
    const set = newExs[exIdx].sets[setIdx];
    set.completed = !set.completed;
    
    let newTimers = activeGymState.activeTimers;
    let newRestExpiry = activeGymState.restExpiry;

    if (set.completed) {
        // Stop timer if running
        if (newTimers[set.id]) {
             const startTime = newTimers[set.id];
             const seconds = (Date.now() - startTime) / 1000;
             const totalMin = Number((seconds / 60)); 
             set.reps = totalMin; // store result
             const temp = {...newTimers};
             delete temp[set.id];
             newTimers = temp;
        }
        
        // Start Rest Timer
        const time = newExs[exIdx].restTime || settings?.defaultRestTimer || 60;
        newRestExpiry = Date.now() + (time * 1000);
        setIsRestMinimized(false);
    }

    onUpdateActiveGymState({ 
        ...activeGymState, 
        session: { ...activeSession, exercises: newExs },
        activeTimers: newTimers,
        restExpiry: newRestExpiry
    });
  };

  const toggleCardioTimer = (exIdx: number, setIdx: number) => {
      if (!activeSession) return;
      const set = activeSession.exercises[exIdx].sets[setIdx];
      
      let newTimers = { ...activeGymState.activeTimers };
      if (newTimers[set.id]) {
          // Stop
          const startTime = newTimers[set.id];
          const seconds = (Date.now() - startTime) / 1000;
          const totalMin = Number((seconds / 60)); 
          updateSet(exIdx, setIdx, 'reps', totalMin);
          delete newTimers[set.id];
      } else {
          // Start
          newTimers[set.id] = Date.now();
      }
      onUpdateActiveGymState({ ...activeGymState, activeTimers: newTimers });
  };

  const addSet = (exIdx: number) => {
      if (!activeSession) return;
      const newExs = [...activeSession.exercises];
      const prev = newExs[exIdx].sets[newExs[exIdx].sets.length - 1];
      newExs[exIdx].sets.push({ id: generateId(), weight: prev?.weight || 0, reps: prev?.reps || 0, completed: false });
      onUpdateActiveGymState({ ...activeGymState, session: { ...activeSession, exercises: newExs } });
  };

  const removeSet = (exIdx: number, setIdx: number) => {
      if (!activeSession) return;
      const newExs = [...activeSession.exercises];
      if (newExs[exIdx].sets.length <= 1) return;
      
      const setId = newExs[exIdx].sets[setIdx].id;
      let newTimers = activeGymState.activeTimers;
      if (newTimers[setId]) {
          const temp = {...newTimers};
          delete temp[setId];
          newTimers = temp;
      }

      newExs[exIdx].sets.splice(setIdx, 1);
      onUpdateActiveGymState({ ...activeGymState, session: { ...activeSession, exercises: newExs }, activeTimers: newTimers });
  };

  const deleteExercise = (exIdx: number) => {
      if (!activeSession) return;
      const newExs = [...activeSession.exercises];
      newExs.splice(exIdx, 1);
      onUpdateActiveGymState({ ...activeGymState, session: { ...activeSession, exercises: newExs } });
  };

  const handleStartRename = (routine: WorkoutRoutine) => {
      setRenamingId(routine.id);
      setRenameValue(routine.name);
  };

  const handleSaveRename = (id: string) => {
      if (renameValue.trim()) {
          const routine = routines.find(r => r.id === id);
          if (routine) {
              saveRoutine({ ...routine, name: renameValue.trim() });
          }
      }
      setRenamingId(null);
  };

  const handleDeleteRoutine = (id: string) => {
      setConfirmation({
          isOpen: true,
          title: "Delete Routine?",
          message: "This routine will be removed from your list forever.",
          onConfirm: () => {
              deleteRoutine(id);
              setConfirmation(null);
          }
      });
  };

  const handleDeleteWorkout = (id: string) => {
      setConfirmation({
          isOpen: true,
          title: "Delete Workout?",
          message: "This history log will be permanently deleted.",
          onConfirm: () => {
              deleteWorkoutSession(id);
              setConfirmation(null);
              if (viewingHistorySession?.id === id) {
                  setViewingHistorySession(null);
              }
          }
      });
  };

  const handleDiscardSession = () => {
      onUpdateActiveGymState({ session: null, activeTimers: {}, restExpiry: null, lastValues: {} });
      setView('hub');
      setConfirmation(null);
  }

  if (view === 'active' && activeSession) {
      return (
          <div className="relative flex flex-col w-full">
              {/* --- ACTIVE HEADER --- */}
              <div className="sticky top-2 z-40 px-3 pt-2 mb-4">
                  <div className="bg-[#1c1c1e]/80 backdrop-blur-xl border border-white/10 rounded-[20px] p-2 pl-3 pr-2 shadow-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-10 h-10 rounded-full bg-[#2c2c2e] flex items-center justify-center border border-white/5 relative group">
                              <div className="absolute inset-0 rounded-full border border-indigo-500/30 animate-pulse"></div>
                              <div className="text-[10px] font-mono font-bold text-white">{formatSeconds(duration)}</div>
                          </div>
                          <div className="flex flex-col min-w-0">
                              <h2 className="text-white font-bold text-sm truncate leading-tight">{activeSession.name}</h2>
                              <div className="flex items-center gap-1.5 text-[10px] text-white/50 font-medium uppercase tracking-wide">
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                  Active
                              </div>
                          </div>
                      </div>
                      <div className="flex items-center gap-2">
                          <button onClick={() => setConfirmation({isOpen: true, title: "Discard Workout?", message: "Data will be lost.", onConfirm: handleDiscardSession})} className="w-9 h-9 rounded-full bg-white/5 hover:bg-red-500/10 text-white/30 hover:text-red-400 flex items-center justify-center transition-all"><X size={16} /></button>
                          <button onClick={handleFinishClick} className="h-9 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-full text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"><Check size={14} strokeWidth={3} /> FINISH</button>
                      </div>
                  </div>
              </div>

              {/* --- FINISH MODAL --- */}
              {finishModalOpen && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                      <div className="bg-[#1c1c1e] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95">
                          <h3 className="text-lg font-bold text-white mb-4">Workout Complete!</h3>
                          
                          <div className="bg-white/5 rounded-xl p-4 mb-4 flex items-center gap-3">
                              <div className="p-2 bg-green-500/20 rounded-lg text-green-400"><Check size={20} /></div>
                              <div>
                                  <div className="text-white font-bold text-sm">{activeSession.name}</div>
                                  <div className="text-white/50 text-xs">{activeSession.exercises.length} Exercises • {Math.floor(duration / 60)} mins</div>
                              </div>
                          </div>

                          <div className="flex items-center gap-3 mb-6 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 cursor-pointer" onClick={() => setUpdateRoutineChecked(!updateRoutineChecked)}>
                              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${updateRoutineChecked ? 'bg-indigo-500 border-indigo-500' : 'border-white/30'}`}>
                                  {updateRoutineChecked && <Check size={12} className="text-white" />}
                              </div>
                              <span className="text-xs text-indigo-200 font-medium">
                                  {activeSession.routineId ? "Update original routine structure" : "Save as a new routine"}
                              </span>
                          </div>

                          <div className="flex gap-3">
                              <button onClick={() => setFinishModalOpen(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition">Back</button>
                              <button onClick={confirmFinish} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-500/20">Save Workout</button>
                          </div>
                      </div>
                  </div>
              )}

              {/* --- CONFIRMATION MODAL --- */}
              {confirmation && confirmation.isOpen && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                      <div className="bg-[#1c1c1e] border border-white/10 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                          <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mx-auto mb-4">
                              <AlertTriangle size={24} />
                          </div>
                          <h3 className="text-lg font-bold text-white mb-2">{confirmation.title}</h3>
                          <p className="text-white/50 text-sm mb-6">{confirmation.message}</p>
                          <div className="flex gap-3">
                              <button onClick={() => setConfirmation(null)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition">Cancel</button>
                              <button onClick={confirmation.onConfirm} className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition">Confirm</button>
                          </div>
                      </div>
                  </div>
              )}

              {/* --- REST ORB --- */}
              {isResting && (
                  <div className={`
                      fixed z-50 left-1/2 -translate-x-1/2 transition-all duration-500 ease-out
                      ${isRestMinimized 
                          ? 'bottom-32 w-12 h-12 rounded-full bg-indigo-600 shadow-lg border border-white/20 flex items-center justify-center cursor-pointer' 
                          : 'bottom-32 w-[90%] max-w-sm bg-[#130f1c]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl'}
                  `} style={{zIndex: 2000}}>
                      {isRestMinimized ? (
                          <div onClick={() => setIsRestMinimized(false)} className="relative w-full h-full flex items-center justify-center">
                              <svg className="absolute inset-0 w-full h-full -rotate-90">
                                  <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
                                  <circle cx="24" cy="24" r="20" fill="none" stroke="#fff" strokeWidth="3" strokeDasharray="125" strokeDashoffset={125 - (timeLeft/60)*125} className="transition-all duration-1000" />
                              </svg>
                              <span className="text-[10px] font-bold text-white">{timeLeft}</span>
                          </div>
                      ) : (
                          <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                  <div className="relative w-14 h-14 flex items-center justify-center">
                                      <div className="absolute inset-0 bg-indigo-500/20 rounded-full animate-ping"></div>
                                      <div className="relative z-10 text-2xl font-black text-white font-mono">{formatSeconds(timeLeft)}</div>
                                  </div>
                                  <div>
                                      <div className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest">Resting</div>
                                      <div className="text-white/50 text-xs">Take a breath</div>
                                  </div>
                              </div>
                              <div className="flex gap-2">
                                  <button onClick={() => onUpdateActiveGymState({ ...activeGymState, restExpiry: (activeGymState.restExpiry || Date.now()) + 30000 })} className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white text-xs font-bold transition">+30s</button>
                                  <button onClick={() => setIsRestMinimized(true)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/50 transition"><Minimize2 size={16}/></button>
                                  <button onClick={() => onUpdateActiveGymState({ ...activeGymState, restExpiry: null })} className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs font-bold transition">Skip</button>
                              </div>
                          </div>
                      )}
                  </div>
              )}

              {/* --- EXERCISE STREAM --- */}
              <div className="pb-48 px-1 space-y-6">
                  {activeSession.exercises.map((ex, exIdx) => {
                      const isCardio = ex.muscleGroup === MuscleGroup.CARDIO;
                      const prevSets = activeGymState.lastValues[ex.name] || [];

                      return (
                      <div key={ex.id} className="bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-3xl animate-scale-in relative">
                          <div className="p-4 flex items-center justify-between bg-gradient-to-r from-white/[0.02] to-transparent border-b border-white/5 rounded-t-3xl">
                              <div className="flex items-center gap-3">
                                  <MuscleIcon group={ex.muscleGroup} />
                                  <div>
                                      <h3 className="text-white font-bold text-base leading-none">{ex.name}</h3>
                                      <div className="flex items-center gap-2 mt-1.5">
                                          <p className="text-white/40 text-[10px] uppercase tracking-wider font-bold">{ex.muscleGroup}</p>
                                          <div className="w-0.5 h-0.5 rounded-full bg-white/20"></div>
                                          <RestTimerInput value={ex.restTime || settings.defaultRestTimer || 60} onChange={(val) => updateRestTime(exIdx, val)} />
                                      </div>
                                  </div>
                              </div>
                              <button onClick={() => deleteExercise(exIdx)} className="p-2 text-white/20 hover:text-red-400 transition"><Trash2 size={16} /></button>
                          </div>
                          <div className="p-2 space-y-1">
                              <div className="grid grid-cols-[24px_1fr_1fr_40px] gap-2 px-3 py-1 text-[9px] font-bold text-white/30 uppercase tracking-widest text-center">
                                  <div>#</div>
                                  <div>{isCardio ? 'KM' : 'KG'}</div>
                                  <div>{isCardio ? 'TIME' : 'REPS'}</div>
                                  <div>LOG</div>
                              </div>
                              {ex.sets.map((set, sIdx) => {
                                  // Determine placeholder values from last history
                                  const prevSet = prevSets[sIdx];
                                  const weightPlaceholder = prevSet ? prevSet.weight.toString() : '';
                                  const repsPlaceholder = prevSet ? (isCardio ? formatMinutes(prevSet.reps) : prevSet.reps.toString()) : '';

                                  return (
                                  <div key={set.id} className={`grid grid-cols-[24px_1fr_1fr_40px] gap-2 items-center px-3 py-2 rounded-2xl transition-all duration-300 ${set.completed ? 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20' : 'bg-white/[0.02] border border-transparent'}`}>
                                      <button onClick={() => removeSet(exIdx, sIdx)} className={`text-xs font-bold transition-colors ${set.completed ? 'text-emerald-400' : 'text-white/30 hover:text-red-400'}`}>{sIdx + 1}</button>
                                      <div className="relative">
                                          <input 
                                            type="number" 
                                            value={set.weight || ''} 
                                            onChange={e => updateSet(exIdx, sIdx, 'weight', Number(e.target.value))} 
                                            placeholder={weightPlaceholder || (isCardio ? "0.0" : "0")} 
                                            className={`w-full bg-black/20 rounded-xl py-2 text-center text-white font-bold text-sm outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-white/20 ${set.completed ? 'text-emerald-300' : ''}`} 
                                          />
                                      </div>
                                      <div className="relative h-9">
                                          {isCardio ? (
                                              <TimeInput value={set.reps} onChange={(val: number) => updateSet(exIdx, sIdx, 'reps', val)} onToggleTimer={() => toggleCardioTimer(exIdx, sIdx)} isTimerActive={!!activeGymState.activeTimers[set.id]} timerStart={activeGymState.activeTimers[set.id]} now={now} completed={set.completed} placeholder={repsPlaceholder} />
                                          ) : (
                                              <input 
                                                type="number" 
                                                value={set.reps || ''} 
                                                onChange={e => updateSet(exIdx, sIdx, 'reps', Number(e.target.value))} 
                                                placeholder={repsPlaceholder || "0"} 
                                                className={`w-full h-full bg-black/20 rounded-xl py-2 text-center text-white font-bold text-sm outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-white/20 ${set.completed ? 'text-emerald-300' : ''}`} 
                                              />
                                          )}
                                      </div>
                                      <button onClick={() => toggleSet(exIdx, sIdx)} className={`w-10 h-8 rounded-xl flex items-center justify-center transition-all duration-300 active:scale-90 ${set.completed ? 'bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-white/10 text-white/20 hover:bg-white/20 hover:text-white'}`}><Check size={16} strokeWidth={4} /></button>
                                  </div>
                              )})}
                              <button onClick={() => addSet(exIdx)} className="w-full py-3 mt-2 rounded-2xl border border-dashed border-white/10 text-white/30 text-[10px] font-bold uppercase tracking-widest hover:text-white hover:border-white/30 hover:bg-white/5 transition flex items-center justify-center gap-2"><Plus size={12} /> Add Set</button>
                          </div>
                      </div>
                  )})}
                  <button onClick={() => setIsExerciseModalOpen(true)} className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-3xl shadow-lg shadow-violet-900/20 text-white font-bold text-sm flex items-center justify-center gap-2 transition active:scale-95 hover:brightness-110"><Plus size={18} /> Add Exercise</button>
              </div>

              {isExerciseModalOpen && (
                  <div className="fixed inset-0 z-[60] bg-[#0f172a]/95 backdrop-blur-xl flex flex-col animate-in slide-in-from-bottom-10">
                      <div className="p-4 border-b border-white/10 bg-[#1e0a45]/50 flex items-center gap-4">
                          <button onClick={() => setIsExerciseModalOpen(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white transition"><ArrowLeft size={20} /></button>
                          <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} /><input autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Find exercise..." className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50 transition-all" /></div>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-24">
                          {exercises.filter(e => e.name.toLowerCase().includes(searchQuery.toLowerCase())).map(ex => (
                              <button key={ex.id} onClick={() => addExercise(ex)} className="w-full bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl p-4 flex items-center gap-4 transition group text-left"><MuscleIcon group={ex.muscleGroup} /><div className="flex-1"><div className="font-bold text-white text-sm">{ex.name}</div><div className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">{ex.muscleGroup}</div></div><div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/30 group-hover:bg-cyan-500 group-hover:text-white transition"><Plus size={16} /></div></button>
                          ))}
                      </div>
                  </div>
              )}
          </div>
      );
  }

  // --- HUB VIEW ---
  
  const displayedHistory = showAllHistory ? history : history.slice(0, 3);

  return (
      <div className="flex flex-col px-1 relative">
          
          {/* CONFIRMATION MODAL - Added here to ensure visibility in HUB view if needed, though mostly used in active */}
          {confirmation && confirmation.isOpen && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                  <div className="bg-[#1c1c1e] border border-white/10 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                      <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mx-auto mb-4">
                          <AlertTriangle size={24} />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">{confirmation.title}</h3>
                      <p className="text-white/50 text-sm mb-6">{confirmation.message}</p>
                      <div className="flex gap-3">
                          <button onClick={() => setConfirmation(null)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition">Cancel</button>
                          <button onClick={confirmation.onConfirm} className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition">Confirm</button>
                      </div>
                  </div>
              </div>
          )}

          {/* HISTORY DETAILS MODAL */}
          {viewingHistorySession && (
              <div className="fixed inset-0 z-[100] bg-[#0f172a] overflow-hidden flex flex-col animate-in slide-in-from-right-10">
                  <div className="p-4 border-b border-white/10 bg-[#130f1c] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <button onClick={() => setViewingHistorySession(null)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition"><ArrowLeft size={20} className="text-white" /></button>
                          <div>
                              <h2 className="text-lg font-bold text-white leading-tight">{viewingHistorySession.name}</h2>
                              <p className="text-xs text-white/50">{new Date(viewingHistorySession.startTime).toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'})}</p>
                          </div>
                      </div>
                      <div className="flex items-center gap-2">
                          <button 
                              onClick={() => handleDeleteWorkout(viewingHistorySession.id)}
                              className="p-2 text-white/40 hover:text-red-400 bg-white/5 hover:bg-red-500/10 rounded-xl transition"
                              title="Delete Workout"
                          >
                              <Trash2 size={16} />
                          </button>
                          <button 
                              onClick={() => startSession(undefined, viewingHistorySession)}
                              className="bg-white text-black px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-gray-200 transition"
                          >
                              <Repeat size={14} /> Repeat
                          </button>
                      </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar pb-32 space-y-4">
                      <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                              <div className="text-[10px] text-white/40 uppercase font-bold mb-1">Duration</div>
                              <div className="text-lg font-bold text-white">{Math.round((viewingHistorySession.endTime - viewingHistorySession.startTime)/60000)} mins</div>
                          </div>
                          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                              <div className="text-[10px] text-white/40 uppercase font-bold mb-1">Total Exercises</div>
                              <div className="text-lg font-bold text-white">{viewingHistorySession.exercises.length}</div>
                          </div>
                      </div>

                      {viewingHistorySession.exercises.map((ex, i) => {
                          const isCardio = ex.muscleGroup === MuscleGroup.CARDIO;
                          return (
                              <div key={i} className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                  <div className="flex items-center gap-3 mb-4 border-b border-white/5 pb-3">
                                      <MuscleIcon group={ex.muscleGroup} />
                                      <div>
                                          <h3 className="font-bold text-white text-sm">{ex.name}</h3>
                                          <span className="text-[10px] text-white/40 uppercase tracking-wider">{ex.muscleGroup}</span>
                                      </div>
                                  </div>
                                  <div className="space-y-1">
                                      <div className="grid grid-cols-[20px_1fr_1fr] px-2 text-[9px] font-bold text-white/30 uppercase tracking-widest text-center mb-1">
                                          <div>#</div>
                                          <div>{isCardio ? 'KM' : 'KG'}</div>
                                          <div>{isCardio ? 'TIME' : 'REPS'}</div>
                                      </div>
                                      {ex.sets.map((set, si) => (
                                          <div key={si} className={`grid grid-cols-[20px_1fr_1fr] px-2 py-2 rounded-lg items-center text-center ${set.completed ? 'bg-white/5' : 'opacity-50'}`}>
                                              <div className="text-xs text-white/30 font-bold">{si + 1}</div>
                                              <div className="text-sm font-bold text-white">{set.weight || '-'}</div>
                                              <div className="text-sm font-bold text-white">
                                                  {isCardio ? formatMinutes(set.reps) : (set.reps || '-')}
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </div>
          )}

          {showLibrary && (
              <div className="fixed inset-0 z-[100] bg-[#0f172a] overflow-hidden flex flex-col animate-in slide-in-from-bottom-5">
                  <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#130f1c]">
                      <div className="flex items-center gap-3">
                          <button onClick={() => setShowLibrary(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition"><ArrowLeft size={20} className="text-white" /></button>
                          <h2 className="text-lg font-bold text-white">Exercise Library</h2>
                      </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar pb-40">
                      <div className="mb-6 sticky top-0 z-10">
                          <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} /><input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search exercises..." className="w-full bg-[#1e293b] border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50 shadow-lg" /></div>
                      </div>
                      <div className="space-y-8">
                          {['Upper Body', 'Lower Body', 'Core', 'Cardio'].map(section => {
                              let groups: string[] = [];
                              if (section === 'Upper Body') groups = [MuscleGroup.CHEST, MuscleGroup.BACK, MuscleGroup.SHOULDERS, MuscleGroup.BICEPS, MuscleGroup.TRICEPS, MuscleGroup.FOREARMS];
                              if (section === 'Lower Body') groups = [MuscleGroup.QUADRICEPS, MuscleGroup.HAMSTRINGS, MuscleGroup.GLUTES, MuscleGroup.CALVES, MuscleGroup.ADDUCTORS];
                              if (section === 'Core') groups = [MuscleGroup.CORE, MuscleGroup.ABS];
                              if (section === 'Cardio') groups = [MuscleGroup.CARDIO];

                              const sectionExercises = exercises.filter(e => groups.includes(e.muscleGroup) && e.name.toLowerCase().includes(searchQuery.toLowerCase()));
                              if (sectionExercises.length === 0) return null;

                              return (
                                  <div key={section}>
                                      <div className="flex items-center gap-2 mb-4 px-1"><div className="h-px bg-white/10 flex-1"></div><span className="text-xs font-bold text-white/40 uppercase tracking-widest">{section}</span><div className="h-px bg-white/10 flex-1"></div></div>
                                      <div className="grid gap-3">
                                          {groups.map(group => {
                                              const groupExs = sectionExercises.filter(e => e.muscleGroup === group);
                                              if (groupExs.length === 0) return null;
                                              return (
                                                  <div key={group} className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                                      <div className="flex items-center gap-3 mb-3"><MuscleIcon group={group} /><h3 className="text-sm font-bold text-white uppercase tracking-wide">{group}</h3></div>
                                                      <div className="grid gap-2">
                                                          {groupExs.map(ex => (
                                                              <div key={ex.id} className="text-sm text-white/70 py-1.5 px-2 hover:bg-white/5 rounded-lg transition-colors flex justify-between items-center">
                                                                  <span>{ex.name}</span>
                                                                  <span className="text-[10px] text-white/20 bg-white/5 px-2 py-0.5 rounded">{ex.equipment}</span>
                                                              </div>
                                                          ))}
                                                      </div>
                                                  </div>
                                              )
                                          })}
                                      </div>
                                  </div>
                              )
                          })}
                      </div>
                  </div>
              </div>
          )}

          <div className="mb-8 pt-4">
              <h1 className="text-3xl font-black text-white tracking-tight mb-1">Gym Hub</h1>
              <div className="flex items-center gap-2 text-white/50 text-xs font-medium"><Flame size={12} className="text-orange-500" /><span>{history.length} Workouts completed</span></div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-10">
              <div className="relative group cursor-pointer" onClick={() => startSession()}><div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition duration-500"></div><div className="relative bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 rounded-3xl p-5 flex flex-col justify-between h-32 overflow-hidden"><div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none"></div><div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white mb-2"><Play size={20} fill="currentColor" /></div><div><h2 className="text-base font-bold text-white leading-tight">Quick Start</h2><p className="text-white/50 text-[10px] mt-0.5">Empty Session</p></div></div></div>
              <div className="relative group cursor-pointer" onClick={() => { setShowLibrary(true); setSearchQuery(''); }}><div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-fuchsia-600 rounded-3xl blur-xl opacity-20 group-hover:opacity-40 transition duration-500"></div><div className="relative bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 rounded-3xl p-5 flex flex-col justify-between h-32 overflow-hidden"><div className="absolute bottom-0 left-0 w-24 h-24 bg-violet-500/10 rounded-full blur-2xl -ml-6 -mb-6 pointer-events-none"></div><div className="w-10 h-10 bg-gradient-to-br from-violet-400 to-fuchsia-500 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20 text-white mb-2"><Book size={20} /></div><div><h2 className="text-base font-bold text-white leading-tight">Exercises</h2><p className="text-white/50 text-[10px] mt-0.5">Browse Library</p></div></div></div>
          </div>

          <div className="flex-1">
              <div className="flex justify-between items-center mb-4 px-1"><h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">Your Routines</h3><button onClick={() => startSession()} className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 bg-cyan-400/10 px-3 py-1.5 rounded-lg border border-cyan-400/20 transition">+ NEW</button></div>
              {routines.length === 0 ? <div className="text-center py-12 bg-white/[0.02] border border-dashed border-white/10 rounded-3xl"><LayoutGrid size={32} className="mx-auto text-white/20 mb-3" /><p className="text-white/40 text-sm">No routines yet.</p></div> : (
                  <div className="grid gap-3">
                      {routines.map(routine => (
                          <div key={routine.id} onClick={() => { if(renamingId !== routine.id) startSession(routine); }} className="bg-white/[0.03] backdrop-blur-md border border-white/5 hover:border-white/10 rounded-2xl p-4 group cursor-pointer transition-all active:scale-[0.98] relative overflow-hidden">
                              {renamingId === routine.id ? (
                                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}><input autoFocus className="bg-transparent border-b border-cyan-500 text-white font-bold text-base outline-none w-full pb-1" value={renameValue} onChange={e => setRenameValue(e.target.value)} onKeyDown={e => { if(e.key === 'Enter') handleSaveRename(routine.id); }} onClick={e => e.stopPropagation()} /><button onClick={(e) => { e.stopPropagation(); handleSaveRename(routine.id); }} className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition"><Check size={14} /></button><button onClick={(e) => { e.stopPropagation(); setRenamingId(null); }} className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition"><X size={14} /></button></div>
                              ) : (
                                  <div className="flex justify-between items-center w-full"><div><div className="flex items-center gap-2 mb-1"><h3 className="text-white font-bold text-base truncate max-w-[150px]">{routine.name}</h3><div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-1"><button type="button" onClick={(e) => { e.stopPropagation(); handleStartRename(routine); }} className="text-white/20 hover:text-white transition p-1 bg-white/5 rounded-md" title="Rename"><Pencil size={10} /></button><button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteRoutine(routine.id); }} className="text-white/20 hover:text-red-400 transition p-1 bg-white/5 rounded-md" title="Delete"><Trash2 size={10} /></button></div></div><div className="flex gap-2"><span className="text-[10px] font-bold text-white/40 bg-white/5 px-2 py-0.5 rounded border border-white/5">{routine.exercises.length} Exercises</span></div></div><div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/30 group-hover:bg-indigo-500 group-hover:text-white transition shadow-lg"><Play size={16} fill="currentColor" /></div></div>
                              )}
                          </div>
                      ))}
                  </div>
              )}
          </div>

          {history.length > 0 && (
              <div className="mt-8 mb-20">
                  <div className="flex justify-between items-center mb-4 px-1">
                      <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">Recent Activity</h3>
                      {history.length > 3 && (
                          <button 
                              onClick={() => setShowAllHistory(!showAllHistory)} 
                              className="text-[10px] font-bold text-white/40 hover:text-white transition flex items-center gap-1"
                          >
                              {showAllHistory ? 'Show Less' : 'View All'}
                              {showAllHistory ? <ChevronDown size={12} className="rotate-180" /> : <ChevronDown size={12} />}
                          </button>
                      )}
                  </div>
                  <div className="space-y-3">
                      {displayedHistory.map(session => (
                          <div 
                              key={session.id} 
                              onClick={() => setViewingHistorySession(session)}
                              className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 transition border border-transparent hover:border-white/5 cursor-pointer group"
                          >
                              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center text-white shrink-0 group-hover:bg-white/10 transition">
                                  <span className="text-[9px] font-bold uppercase opacity-50">{new Date(session.startTime).toLocaleDateString(undefined, {month:'short'})}</span>
                                  <span className="text-lg font-black leading-none">{new Date(session.startTime).getDate()}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                  <div className="font-bold text-white text-sm truncate">{session.name}</div>
                                  <div className="text-[10px] text-white/40 mt-0.5 flex gap-2">
                                      <span>{Math.round((session.endTime - session.startTime)/60000)} mins</span>
                                      <span>•</span>
                                      <span>{session.exercises.length} Exercises</span>
                                  </div>
                              </div>
                              <div className="flex items-center gap-2">
                                  <button 
                                      onClick={(e) => { e.stopPropagation(); handleDeleteWorkout(session.id); }} 
                                      className="p-2 text-white/20 hover:text-red-400 hover:bg-white/10 rounded-lg transition"
                                      title="Delete"
                                  >
                                      <Trash2 size={16} />
                                  </button>
                                  <button 
                                      onClick={(e) => { e.stopPropagation(); startSession(undefined, session); }} 
                                      className="p-2 text-white/20 hover:text-white hover:bg-white/10 rounded-lg transition"
                                      title="Repeat Workout"
                                  >
                                      <Repeat size={16} />
                                  </button>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}
      </div>
  );
};