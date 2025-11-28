import React, { useState, useEffect } from 'react';
import { WorkoutSession, WorkoutExercise, MuscleGroup, WorkoutRoutine, ExerciseDefinition, Equipment, GymSettings } from '../../types';
import { 
  Plus, Check, Clock, Trash2, ChevronRight, 
  Dumbbell, Edit2, Timer, AlertCircle, ArrowLeft, Search
} from 'lucide-react';

// --- ANATOMICAL ICONS ---
const MuscleSVGs: Record<MuscleGroup, React.ReactNode> = {
    [MuscleGroup.CHEST]: (
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="currentColor">
            <path d="M20,30 Q50,25 80,30 Q90,40 85,60 Q70,75 50,80 Q30,75 15,60 Q10,40 20,30 M50,30 L50,80" stroke="currentColor" strokeWidth="3" fillOpacity="0.4" />
        </svg>
    ),
    [MuscleGroup.BACK]: (
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="currentColor">
            <path d="M25,20 L75,20 L90,40 L80,80 L50,90 L20,80 L10,40 Z" stroke="currentColor" strokeWidth="3" fillOpacity="0.4" />
            <path d="M50,20 L50,90 M25,20 L50,50 L75,20" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
    ),
    [MuscleGroup.LEGS]: (
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="currentColor">
            <path d="M30,20 Q10,50 35,90 L45,90 L45,40 L55,40 L55,90 L65,90 Q90,50 70,20 Z" stroke="currentColor" strokeWidth="3" fillOpacity="0.4" />
            <path d="M50,20 L50,40" stroke="currentColor" strokeWidth="2" />
        </svg>
    ),
    [MuscleGroup.SHOULDERS]: (
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="currentColor">
            <path d="M10,40 Q25,10 50,10 Q75,10 90,40 L80,50 Q65,30 50,30 Q35,30 20,50 Z" stroke="currentColor" strokeWidth="3" fillOpacity="0.4" />
        </svg>
    ),
    [MuscleGroup.ARMS]: (
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="currentColor">
            <path d="M30,30 Q10,50 30,80 L40,80 Q20,50 40,30 Z M70,30 Q90,50 70,80 L60,80 Q80,50 60,30 Z" stroke="currentColor" strokeWidth="3" fillOpacity="0.4" />
        </svg>
    ),
    [MuscleGroup.CORE]: (
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="currentColor">
            <rect x="35" y="30" width="30" height="50" rx="5" stroke="currentColor" strokeWidth="3" fillOpacity="0.4" />
            <line x1="35" y1="45" x2="65" y2="45" stroke="currentColor" strokeWidth="2" />
            <line x1="35" y1="60" x2="65" y2="60" stroke="currentColor" strokeWidth="2" />
            <line x1="50" y1="30" x2="50" y2="80" stroke="currentColor" strokeWidth="2" />
        </svg>
    ),
    [MuscleGroup.CARDIO]: (
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="currentColor">
            <path d="M20,50 L30,30 L40,50 L50,20 L60,50 L70,30 L80,50" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
};

const MuscleColors: Record<MuscleGroup, string> = {
  [MuscleGroup.CHEST]: "text-blue-500",
  [MuscleGroup.BACK]: "text-indigo-500",
  [MuscleGroup.LEGS]: "text-orange-500",
  [MuscleGroup.SHOULDERS]: "text-yellow-500",
  [MuscleGroup.ARMS]: "text-red-500",
  [MuscleGroup.CORE]: "text-emerald-500",
  [MuscleGroup.CARDIO]: "text-pink-500"
};

const EquipmentBadge: React.FC<{ type: Equipment }> = ({ type }) => {
    const labels: Record<Equipment, string> = {
        'Barbell': 'BB',
        'Dumbbell': 'DB',
        'Machine': 'M',
        'Cable': 'C',
        'Bodyweight': 'BW',
        'Other': 'O'
    };
    return (
        <span className="w-5 h-5 flex items-center justify-center rounded bg-slate-700 text-[9px] font-bold text-slate-300 border border-slate-600 shadow-sm">
            {labels[type] || 'O'}
        </span>
    );
};

const REST_OPTIONS = [0, 15, 30, 45, 60, 90, 120, 150, 180, 240, 300];

interface WorkoutLoggerProps {
  history: WorkoutSession[];
  routines: WorkoutRoutine[];
  exercises: ExerciseDefinition[];
  saveWorkout: (session: WorkoutSession) => void;
  saveRoutine: (routine: WorkoutRoutine) => void;
  deleteRoutine: (id: string) => void;
  addCustomExercise: (ex: ExerciseDefinition) => void;
  settings: GymSettings;
}

export const GymWorkoutLogger: React.FC<WorkoutLoggerProps> = ({ 
    history, routines, exercises, saveWorkout, saveRoutine, deleteRoutine, addCustomExercise, settings 
}) => {
  const [activeTab, setActiveTab] = useState<'routines' | 'history'>('routines');
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [duration, setDuration] = useState(0);
  
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isCreatingExercise, setIsCreatingExercise] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseEquipment, setNewExerciseEquipment] = useState<Equipment>('Barbell');
  const [newExerciseRest, setNewExerciseRest] = useState<number>(settings.defaultRestTimer);

  const [editingRoutine, setEditingRoutine] = useState<WorkoutRoutine | null>(null);

  const [restTimer, setRestTimer] = useState(0);
  const [isResting, setIsResting] = useState(false);
  
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    let interval: number;
    if (activeSession) {
      interval = window.setInterval(() => setDuration(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [activeSession]);

  useEffect(() => {
    let interval: number;
    if (isResting && restTimer > 0) {
        interval = window.setInterval(() => setRestTimer(prev => prev - 1), 1000);
    } else if (restTimer <= 0) {
        setIsResting(false);
    }
    return () => clearInterval(interval);
  }, [isResting, restTimer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startSession = (routine?: WorkoutRoutine) => {
    const initialExercises: WorkoutExercise[] = routine 
        ? routine.exercises.map(ex => ({
            id: Date.now().toString() + Math.random(),
            name: ex.name,
            muscleGroup: ex.muscleGroup,
            sets: [{ id: Date.now().toString() + Math.random(), weight: 0, reps: 0, completed: false }],
            restTime: ex.restTime 
        }))
        : [];

    setActiveSession({
      id: Date.now().toString(),
      name: routine ? routine.name : "Workout",
      startTime: Date.now(),
      endTime: 0,
      exercises: initialExercises,
      routineId: routine?.id
    });
    setDuration(0);
    setRestTimer(0);
    setIsResting(false);
  };

  const finishWorkout = () => {
    if (!activeSession) return;
    saveWorkout({ ...activeSession, endTime: Date.now() });
    setActiveSession(null);
    setDuration(0);
    setRestTimer(0);
    setIsResting(false);
  };

  const confirmCancelWorkout = () => {
      setActiveSession(null);
      setDuration(0);
      setRestTimer(0);
      setIsResting(false);
      setIsAddingExercise(false);
      setShowCancelConfirm(false);
  };

  const addExerciseToSession = (exDef: ExerciseDefinition) => {
      if (!activeSession && !editingRoutine) return;
      
      if (activeSession) {
          const newExercise: WorkoutExercise = {
            id: Date.now().toString(),
            name: exDef.name,
            muscleGroup: exDef.muscleGroup,
            sets: [{ id: Date.now().toString() + '1', weight: 0, reps: 0, completed: false }],
            restTime: exDef.restTime
          };
          setActiveSession(prev => prev ? ({ ...prev, exercises: [...prev.exercises, newExercise] }) : null);
      } else if (editingRoutine) {
          setEditingRoutine(prev => prev ? ({ ...prev, exercises: [...prev.exercises, exDef] }) : null);
      }
      
      setIsAddingExercise(false);
      setSelectedMuscle(null);
      setSearchQuery('');
  };

  const handleCreateCustomExercise = () => {
      if (!newExerciseName.trim() || !selectedMuscle) return;
      
      const newEx: ExerciseDefinition = {
          id: Date.now().toString(),
          name: newExerciseName,
          muscleGroup: selectedMuscle,
          equipment: newExerciseEquipment,
          isCustom: true,
          restTime: newExerciseRest
      };
      
      addCustomExercise(newEx);
      addExerciseToSession(newEx); 
      setIsCreatingExercise(false);
      setNewExerciseName('');
      setNewExerciseRest(settings.defaultRestTimer);
  };

  const toggleSetComplete = (exIndex: number, setIndex: number, currentCompleted: boolean) => {
    if (!activeSession) return;
    const newExs = [...activeSession.exercises];
    newExs[exIndex].sets[setIndex].completed = !currentCompleted;
    setActiveSession({...activeSession, exercises: newExs});

    if (!currentCompleted) {
        const customSessionRest = newExs[exIndex].restTime;
        const def = exercises.find(e => e.name === newExs[exIndex].name);
        const timeToRest = customSessionRest !== undefined ? customSessionRest : (def?.restTime || settings.defaultRestTimer);
        
        setRestTimer(timeToRest);
        setIsResting(true);
    }
  };

  const RestTimerOverlay = () => {
      if (!isResting && restTimer <= 0) return null;
      
      return (
          <div className="fixed bottom-24 left-4 right-4 bg-indigo-600 shadow-2xl shadow-indigo-900/50 rounded-2xl p-4 z-50 animate-in slide-in-from-bottom-5 border border-indigo-400/30">
             <div className="flex justify-between items-center mb-2">
                 <div className="flex items-center gap-2">
                     <Timer className="text-white animate-pulse" size={20} />
                     <span className="text-indigo-100 font-bold uppercase text-[10px] tracking-wider">Rest Timer</span>
                 </div>
                 <button onClick={() => { setIsResting(false); setRestTimer(0); }} className="text-indigo-100 hover:text-white text-[10px] font-bold px-2 py-0.5 bg-indigo-700/50 rounded">
                     SKIP
                 </button>
             </div>
             
             <div className="flex items-end justify-between">
                 <div className="text-4xl font-mono font-bold text-white tracking-tighter tabular-nums leading-none">
                     {formatTime(restTimer)}
                 </div>
                 <div className="flex gap-2">
                     <button onClick={() => setRestTimer(t => Math.max(0, t - 10))} className="w-10 h-10 flex items-center justify-center bg-indigo-700 hover:bg-indigo-500 rounded-xl text-white font-bold transition border border-indigo-500 text-xs">-10</button>
                     <button onClick={() => setRestTimer(t => t + 30)} className="w-10 h-10 flex items-center justify-center bg-indigo-700 hover:bg-indigo-500 rounded-xl text-white font-bold transition border border-indigo-500 text-xs">+30</button>
                 </div>
             </div>
          </div>
      );
  };

  const ExerciseSelector = () => {
      if (!isAddingExercise) return null;

      const filteredExercises = exercises.filter(e => {
         const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase());
         const matchesMuscle = selectedMuscle ? e.muscleGroup === selectedMuscle : true;
         return matchesSearch && matchesMuscle;
      });
      
      return (
        <div className="fixed inset-0 bg-[#0f172a] z-50 flex flex-col animate-in slide-in-from-bottom-10 duration-200">
            <div className="bg-slate-900 z-10 p-4 border-b border-slate-800">
                <div className="flex items-center gap-2 mb-4">
                    <button 
                        onClick={() => {
                            if (isCreatingExercise) setIsCreatingExercise(false);
                            else if (selectedMuscle || searchQuery) { setSelectedMuscle(null); setSearchQuery(''); }
                            else setIsAddingExercise(false);
                        }} 
                        className="p-2 -ml-2 text-slate-400 hover:text-white transition"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="text-lg font-bold text-white">
                        {isCreatingExercise ? 'New Exercise' : (selectedMuscle || 'All Exercises')}
                    </h2>
                </div>

                {!isCreatingExercise && (
                    <div className="relative">
                        <Search className="absolute left-3 top-3 text-slate-500" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search exercises..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-800 text-white pl-10 pr-4 py-2.5 rounded-xl border border-slate-700 focus:border-indigo-500 outline-none placeholder-slate-500 text-sm"
                        />
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {isCreatingExercise ? (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-slate-400 text-xs mb-1">Exercise Name</label>
                            <input 
                                type="text" 
                                autoFocus
                                value={newExerciseName}
                                onChange={e => setNewExerciseName(e.target.value)}
                                placeholder="e.g. Bulgarian Split Squat"
                                className="w-full bg-slate-800 text-white p-3 rounded-xl border border-slate-700 focus:border-indigo-500 outline-none text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-xs mb-1">Equipment</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight', 'Other'].map(eq => (
                                    <button
                                        key={eq}
                                        onClick={() => setNewExerciseEquipment(eq as Equipment)}
                                        className={`p-2 rounded-lg text-[10px] font-medium border ${newExerciseEquipment === eq ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                                    >
                                        {eq}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                             <label className="block text-slate-400 text-xs mb-1">Default Rest</label>
                             <div className="relative">
                                 <select
                                    value={newExerciseRest}
                                    onChange={e => setNewExerciseRest(Number(e.target.value))}
                                    className="w-full bg-slate-800 text-white p-3 rounded-xl border border-slate-700 focus:border-indigo-500 outline-none appearance-none text-sm"
                                 >
                                    {REST_OPTIONS.map(sec => (
                                        <option key={sec} value={sec}>{sec}s</option>
                                    ))}
                                 </select>
                                 <ChevronRight className="absolute right-4 top-3.5 rotate-90 text-slate-500 pointer-events-none" size={16} />
                             </div>
                        </div>
                        <button 
                            onClick={handleCreateCustomExercise}
                            disabled={!newExerciseName}
                            className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl disabled:opacity-50 text-sm"
                        >
                            Create & Add
                        </button>
                    </div>
                ) : 
                (searchQuery || selectedMuscle) ? (
                    <div className="space-y-2">
                        {selectedMuscle && (
                            <button 
                                onClick={() => setIsCreatingExercise(true)}
                                className="w-full p-3 mb-4 rounded-xl border border-dashed border-indigo-500/50 text-indigo-400 flex items-center justify-center gap-2 hover:bg-indigo-500/10 text-sm"
                            >
                                <Plus size={18} /> Create "{selectedMuscle}" Exercise
                            </button>
                        )}

                        {filteredExercises.map((ex) => (
                            <button
                                key={ex.id}
                                onClick={() => addExerciseToSession(ex)}
                                className="w-full bg-slate-800 p-2 rounded-xl text-left border border-slate-700 flex justify-between items-center hover:bg-slate-700 active:scale-[0.98] transition group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white rounded-lg overflow-hidden flex-shrink-0 relative p-1">
                                        {ex.imageUrl ? (
                                            <img src={ex.imageUrl} alt={ex.name} className="w-full h-full object-contain" />
                                        ) : (
                                            <div className={`w-full h-full p-1 opacity-50 ${MuscleColors[ex.muscleGroup]}`}>{MuscleSVGs[ex.muscleGroup]}</div>
                                        )}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-white text-xs">{ex.name}</div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <EquipmentBadge type={ex.equipment} />
                                            <span className={`text-[8px] px-1.5 py-0.5 rounded border ${MuscleColors[ex.muscleGroup].replace('text-', 'bg-').replace('500', '500/10')} ${MuscleColors[ex.muscleGroup].replace('500', '400')} border-${MuscleColors[ex.muscleGroup].split('-')[1]}-500/20`}>
                                                {ex.muscleGroup}
                                            </span>
                                            {ex.isCustom && <span className="text-[8px] bg-slate-700 px-1.5 py-0.5 rounded text-slate-400">Custom</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="w-6 h-6 rounded-full bg-slate-700/50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-500 group-hover:text-white transition">
                                    <Plus size={14} />
                                </div>
                            </button>
                        ))}
                        {filteredExercises.length === 0 && (
                             <div className="text-center py-10 text-slate-500 text-sm">
                                 <p>No exercises found.</p>
                             </div>
                        )}
                    </div>
                ) : 
                (
                    <div className="grid grid-cols-2 gap-3">
                        {Object.values(MuscleGroup).map((group) => (
                            <button
                                key={group}
                                onClick={() => setSelectedMuscle(group)}
                                className="bg-slate-800 p-3 rounded-2xl flex flex-col items-center gap-2 hover:bg-slate-700 border border-slate-700 transition active:scale-95 group relative overflow-hidden"
                            >
                                 <div className={`w-12 h-12 ${MuscleColors[group]} opacity-90 group-hover:scale-110 transition-transform duration-300`}>
                                     {MuscleSVGs[group]}
                                 </div>
                                <span className="font-bold text-slate-200 text-xs tracking-wide z-10">{group}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
      );
  };

  if (editingRoutine) {
      return (
          <div className="fixed inset-0 bg-slate-900 z-40 p-6 overflow-y-auto flex flex-col">
              {isAddingExercise && <ExerciseSelector />}
              <header className="flex justify-between items-center mb-6 flex-shrink-0">
                  <button onClick={() => setEditingRoutine(null)} className="text-slate-400 hover:text-white"><ArrowLeft /></button>
                  <h2 className="text-lg font-bold text-white">Edit Routine</h2>
                  <button onClick={() => { saveRoutine(editingRoutine); setEditingRoutine(null); }} className="text-emerald-400 hover:text-emerald-300"><Check /></button>
              </header>
              
              <div className="space-y-4 flex-1">
                  <div>
                      <label className="block text-xs uppercase text-slate-500 font-bold mb-1">Routine Name</label>
                      <input 
                          value={editingRoutine.name}
                          onChange={(e) => setEditingRoutine({...editingRoutine, name: e.target.value})}
                          className="w-full bg-slate-800 text-white text-base font-bold p-3 rounded-xl border border-slate-700 focus:border-indigo-500 outline-none"
                      />
                  </div>

                  <div>
                      <label className="block text-xs uppercase text-slate-500 font-bold mb-2">Exercises</label>
                      <div className="space-y-2">
                          {editingRoutine.exercises.map((ex, idx) => {
                              const currentVal = ex.restTime !== undefined ? ex.restTime : (exercises.find(e => e.name === ex.name)?.restTime || settings.defaultRestTimer);
                              return (
                              <div key={idx} className="bg-slate-800 p-2 rounded-xl border border-slate-700 flex justify-between items-center">
                                  <div className="flex items-center gap-3 overflow-hidden">
                                      <div className="w-8 h-8 bg-white rounded-lg overflow-hidden flex-shrink-0 relative p-0.5">
                                        {ex.imageUrl ? (
                                            <img src={ex.imageUrl} alt={ex.name} className="w-full h-full object-contain" />
                                        ) : (
                                            <div className={`w-full h-full p-0.5 opacity-50 ${MuscleColors[ex.muscleGroup]}`}>{MuscleSVGs[ex.muscleGroup]}</div>
                                        )}
                                      </div>
                                      <div className="flex flex-col overflow-hidden">
                                          <span className="font-medium text-white text-xs truncate">{ex.name}</span>
                                          <div className="flex gap-1">
                                              <span className={`text-[8px] px-1 py-0.5 rounded bg-slate-700/50 text-slate-400`}>{ex.muscleGroup}</span>
                                          </div>
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                      <div className="flex items-center gap-1.5 bg-slate-700/50 p-1 rounded-lg border border-slate-600/50 relative group">
                                          <Timer size={10} className="text-indigo-400" />
                                          <span className="text-[10px] text-white w-5 text-center">{currentVal}</span>
                                          <span className="text-[8px] text-slate-500">s</span>
                                          <select 
                                              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                              value={currentVal}
                                              onChange={(e) => {
                                                  const val = parseInt(e.target.value) || 0;
                                                  const updatedExercises = [...editingRoutine.exercises];
                                                  updatedExercises[idx] = { ...updatedExercises[idx], restTime: val };
                                                  setEditingRoutine({ ...editingRoutine, exercises: updatedExercises });
                                              }}
                                          >
                                              {REST_OPTIONS.map(opt => (
                                                  <option key={opt} value={opt}>{opt}s</option>
                                              ))}
                                          </select>
                                      </div>
                                      <button 
                                        onClick={() => {
                                            const newExs = [...editingRoutine.exercises];
                                            newExs.splice(idx, 1);
                                            setEditingRoutine({...editingRoutine, exercises: newExs});
                                        }}
                                        className="p-1.5 text-slate-500 hover:text-red-400"
                                      >
                                          <Trash2 size={14} />
                                      </button>
                                  </div>
                              </div>
                            );
                          })}
                          <button 
                            onClick={() => setIsAddingExercise(true)}
                            className="w-full py-2.5 border border-dashed border-slate-700 rounded-xl text-slate-400 hover:text-indigo-400 hover:border-indigo-500/50 transition flex items-center justify-center gap-2 text-sm"
                          >
                              <Plus size={16} /> Add Exercise
                          </button>
                      </div>
                  </div>
                  
                  <button 
                      onClick={() => { deleteRoutine(editingRoutine.id); setEditingRoutine(null); }}
                      className="w-full py-3 text-red-400 bg-red-900/10 rounded-xl hover:bg-red-900/20 transition font-medium text-sm"
                  >
                      Delete Routine
                  </button>
              </div>
          </div>
      );
  }

  if (activeSession) {
      return (
          <div className="pb-24">
              {isAddingExercise && <ExerciseSelector />}
              <RestTimerOverlay />
              
              {showCancelConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center mb-6">
                            <div className="w-10 h-10 bg-red-900/30 rounded-full flex items-center justify-center mb-3 text-red-500">
                                <AlertCircle size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Discard Workout?</h3>
                            <p className="text-slate-400 text-xs">Are you sure you want to cancel? All progress for this session will be lost permanently.</p>
                        </div>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setShowCancelConfirm(false)}
                                className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition text-sm"
                            >
                                Resume
                            </button>
                            <button 
                                type="button"
                                onClick={confirmCancelWorkout}
                                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl transition text-sm"
                            >
                                Discard
                            </button>
                        </div>
                    </div>
                </div>
              )}

              <div className="sticky top-0 bg-slate-900/95 backdrop-blur-md z-10 py-2 mb-4 border-b border-slate-800 flex justify-between items-center">
                   <div className="flex flex-col">
                       <span className="text-[9px] text-slate-500 font-bold tracking-wider uppercase">Current Session</span>
                       <div className="flex items-center gap-1.5 text-indigo-400 font-mono text-lg font-bold">
                           <Clock size={16} className="animate-pulse" /> {formatTime(duration)}
                       </div>
                   </div>
                   <button onClick={finishWorkout} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 px-4 rounded-lg shadow-lg shadow-emerald-900/20 text-xs">
                       Finish
                   </button>
              </div>

              <div className="space-y-4">
                  {activeSession.exercises.map((exercise, exIndex) => {
                      const def = exercises.find(e => e.name === exercise.name);
                      const eq = def?.equipment || 'Barbell';
                      const mGroup = Object.values(MuscleGroup).find(m => m === exercise.muscleGroup) as MuscleGroup || MuscleGroup.CHEST;
                      const img = def?.imageUrl;
                      const currentRestTime = exercise.restTime !== undefined ? exercise.restTime : (def?.restTime || settings.defaultRestTimer);

                      return (
                        <div key={exercise.id} className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-sm">
                            <div className="p-2 flex justify-between items-center bg-slate-800 border-b border-slate-700/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-white rounded-md overflow-hidden flex-shrink-0 relative p-0.5">
                                        {img ? (
                                            <img src={img} alt={exercise.name} className="w-full h-full object-contain" />
                                        ) : (
                                            <div className={`w-full h-full p-0.5 opacity-50 ${MuscleColors[mGroup]}`}>{MuscleSVGs[mGroup]}</div>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-xs md:text-sm">{exercise.name}</h3>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <EquipmentBadge type={eq} />
                                            <span className={`text-[8px] px-1.5 py-0.5 rounded border ${MuscleColors[mGroup].replace('text-', 'bg-').replace('500', '500/10')} ${MuscleColors[mGroup].replace('500', '400')} border-${MuscleColors[mGroup].split('-')[1]}-500/20`}>
                                                {mGroup}
                                            </span>
                                            <span className="text-[8px] font-bold text-slate-400 bg-slate-700 px-1.5 py-0.5 rounded border border-slate-600">
                                                {exercise.sets.length} Sets
                                            </span>
                                            <div className="relative flex items-center gap-1 text-[8px] text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded transition">
                                                <Timer size={8} />
                                                <span>{currentRestTime}s</span>
                                                <select
                                                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                                    value={currentRestTime}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value);
                                                        const newExs = [...activeSession.exercises];
                                                        newExs[exIndex].restTime = val;
                                                        setActiveSession({...activeSession, exercises: newExs});
                                                    }}
                                                >
                                                    {REST_OPTIONS.map(opt => (
                                                        <option key={opt} value={opt}>{opt}s</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => {
                                    const updated = [...activeSession.exercises];
                                    updated.splice(exIndex, 1);
                                    setActiveSession({...activeSession, exercises: updated});
                                }} className="p-1.5 text-slate-600 hover:text-red-400"><Trash2 size={14} /></button>
                            </div>
                            
                            <div className="p-2">
                                <div className="grid grid-cols-10 gap-1 mb-1 px-1 text-[8px] uppercase text-slate-500 font-bold text-center">
                                    <div className="col-span-1">Set</div>
                                    <div className="col-span-3">lbs</div>
                                    <div className="col-span-3">Reps</div>
                                    <div className="col-span-3">Check</div>
                                </div>
                                {exercise.sets.map((set, sIndex) => (
                                    <div key={set.id} className={`grid grid-cols-10 gap-2 mb-1.5 items-center px-1.5 py-1 rounded-lg transition-colors ${set.completed ? 'bg-emerald-900/10 border border-emerald-500/20' : 'bg-slate-900/50 border border-transparent'}`}>
                                        <div className="col-span-1 text-center text-[10px] font-bold text-slate-500">{sIndex + 1}</div>
                                        <div className="col-span-3"><input type="number" placeholder="0" value={set.weight || ''} onChange={(e) => {
                                            const newExs = [...activeSession.exercises];
                                            newExs[exIndex].sets[sIndex].weight = Number(e.target.value);
                                            setActiveSession({...activeSession, exercises: newExs});
                                        }} className="w-full bg-slate-900 border border-slate-700 rounded p-0.5 text-center text-white text-xs font-semibold focus:border-indigo-500 outline-none" /></div>
                                        <div className="col-span-3"><input type="number" placeholder="0" value={set.reps || ''} onChange={(e) => {
                                            const newExs = [...activeSession.exercises];
                                            newExs[exIndex].sets[sIndex].reps = Number(e.target.value);
                                            setActiveSession({...activeSession, exercises: newExs});
                                        }} className="w-full bg-slate-900 border border-slate-700 rounded p-0.5 text-center text-white text-xs font-semibold focus:border-indigo-500 outline-none" /></div>
                                        <div className="col-span-3"><button onClick={() => toggleSetComplete(exIndex, sIndex, set.completed)} className={`w-full h-6 rounded flex items-center justify-center transition ${set.completed ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-500'}`}><Check size={12} /></button></div>
                                    </div>
                                ))}
                                <button onClick={() => {
                                    const newExs = [...activeSession.exercises];
                                    const prev = newExs[exIndex].sets[newExs[exIndex].sets.length - 1];
                                    newExs[exIndex].sets.push({ id: Date.now().toString(), weight: prev ? prev.weight : 0, reps: prev ? prev.reps : 0, completed: false });
                                    setActiveSession({...activeSession, exercises: newExs});
                                }} className="w-full py-1.5 bg-slate-700/30 hover:bg-slate-700/50 text-indigo-400 text-[10px] font-bold uppercase rounded-lg mt-1">+ Add Set</button>
                            </div>
                        </div>
                      );
                  })}
                  
                  <button onClick={() => setIsAddingExercise(true)} className="w-full py-3 border-2 border-dashed border-slate-700 rounded-xl text-slate-400 hover:text-indigo-400 hover:bg-slate-800/50 transition flex items-center justify-center gap-2 font-semibold text-sm">
                      <Plus size={18} /> Add Exercise
                  </button>
                  <button type="button" onClick={() => setShowCancelConfirm(true)} className="w-full py-2 text-red-400 text-xs hover:text-red-300 transition">Cancel Workout</button>
              </div>
          </div>
      );
  }

  return (
    <div className="pb-24">
       <header className="mb-4">
         <h1 className="text-2xl font-bold text-white mb-2">Workout</h1>
         <div className="flex p-1 bg-slate-800 rounded-lg inline-flex">
             <button onClick={() => setActiveTab('routines')} className={`px-3 py-1 rounded-md text-xs font-medium transition ${activeTab === 'routines' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Routines</button>
             <button onClick={() => setActiveTab('history')} className={`px-3 py-1 rounded-md text-xs font-medium transition ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>History</button>
         </div>
       </header>

       {activeTab === 'routines' ? (
           <div className="space-y-3 animate-in slide-in-from-left-4 duration-200">
               <button onClick={() => startSession()} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-xl shadow-lg shadow-indigo-900/30 flex items-center justify-between group transition">
                   <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center"><Plus size={20} /></div>
                       <div className="text-left">
                           <h3 className="font-bold text-sm">Start Empty Workout</h3>
                           <p className="text-indigo-200 text-[10px]">Log as you go</p>
                       </div>
                   </div>
                   <ChevronRight size={16} className="opacity-50 group-hover:translate-x-1 transition" />
               </button>

               <div className="flex items-center justify-between mt-6 mb-2">
                   <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">My Routines</h3>
                   <button onClick={() => setEditingRoutine({ id: Date.now().toString(), name: 'New Routine', exercises: [] })} className="text-[10px] bg-slate-800 hover:bg-slate-700 text-indigo-400 px-2 py-0.5 rounded-full border border-slate-700 transition">+ Create</button>
               </div>

               {routines.map(routine => (
                   <div key={routine.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition group relative">
                       <div className="flex justify-between items-start mb-2">
                           <h3 className="text-base font-bold text-white">{routine.name}</h3>
                           <button onClick={(e) => { e.stopPropagation(); setEditingRoutine(routine); }} className="p-1.5 text-slate-500 hover:text-white bg-slate-900 rounded-lg opacity-0 group-hover:opacity-100 transition"><Edit2 size={14} /></button>
                       </div>
                       <p className="text-xs text-slate-400 mb-3 line-clamp-1">{routine.exercises.map(e => e.name).join(', ')}</p>
                       <button onClick={() => startSession(routine)} className="w-full py-2 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white font-semibold rounded-lg transition border border-indigo-600/20 text-xs">
                           Start Routine
                       </button>
                   </div>
               ))}
           </div>
       ) : (
           <div className="space-y-3 animate-in slide-in-from-right-4 duration-200">
               {history.length === 0 ? (
                   <div className="text-center py-10 text-slate-500 text-xs"><p>No workouts yet.</p></div>
               ) : (
                   history.map(session => (
                       <div key={session.id} className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                           <div className="flex justify-between items-start mb-1.5">
                               <h4 className="font-bold text-white text-sm">{session.name}</h4>
                               <span className="text-[10px] text-slate-500">{new Date(session.startTime).toLocaleDateString()}</span>
                           </div>
                           <div className="flex flex-wrap gap-1">
                               {session.exercises.map((ex, i) => {
                                   const mGroup = Object.values(MuscleGroup).find(m => m === ex.muscleGroup) as MuscleGroup || MuscleGroup.CHEST;
                                   return (
                                     <div key={i} className={`w-1.5 h-1.5 rounded-full ${MuscleColors[mGroup].replace('text-', 'bg-')}`}></div>
                                   );
                               })}
                               <span className="text-[10px] text-slate-500 ml-1">{session.exercises.length} Exercises</span>
                           </div>
                           <div className="mt-2 text-[10px] text-slate-400">
                               Duration: {Math.round((session.endTime - session.startTime)/60000)} mins
                           </div>
                       </div>
                   ))
               )}
           </div>
       )}
    </div>
  );
};