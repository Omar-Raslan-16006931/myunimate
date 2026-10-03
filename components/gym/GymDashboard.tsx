import React, { useMemo, useState, useEffect } from 'react';
import { FoodItem, WorkoutSession, GymSettings, WaterLog, GymViewType, MuscleGroup, BodyLog } from '../../types';
import {
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid
} from 'recharts';
import { Activity, Flame, Droplets, TrendingUp, BarChart3, ChevronDown, ChevronRight, AlertCircle, Plus, Dumbbell, Apple, LineChart, Play, Scale } from 'lucide-react';

interface GymDashboardProps {
  foodLogs: FoodItem[];
  waterLogs: WaterLog[];
  workoutSessions: WorkoutSession[];
  bodyLogs: BodyLog[];
  settings: GymSettings;
  setView: (view: GymViewType) => void;
  activeSession: WorkoutSession | null;
}

// Animated SVG progress ring
const Ring = ({ size, stroke, pct, color, track = 'rgba(255,255,255,0.07)', children }: {
  size: number; stroke: number; pct: number; color: string; track?: string; children?: React.ReactNode;
}) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(Math.max(pct, 0), 100);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (clamped / 100) * c}
          className="animate-ring transition-all duration-1000 ease-out"
          style={{ ['--ring-circumference' as any]: c }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
};

export const GymDashboard: React.FC<GymDashboardProps> = ({ foodLogs, waterLogs, workoutSessions, bodyLogs, settings, setView, activeSession }) => {
  // --- NUTRITION ---
  const totalMacros = foodLogs.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const totalWater = waterLogs.reduce((acc, log) => acc + log.amount, 0);
  const waterPct = Math.min((totalWater / settings.waterTarget) * 100, 100);
  const caloriePct = (totalMacros.calories / settings.targets.calories) * 100;
  const remainingCalories = settings.targets.calories - totalMacros.calories;
  const isOverCalories = remainingCalories < 0;

  const macroRows = [
    { label: 'Protein', value: totalMacros.protein, target: settings.targets.protein, color: 'bg-sky-500', text: 'text-sky-300' },
    { label: 'Carbs', value: totalMacros.carbs, target: settings.targets.carbs, color: 'bg-emerald-500', text: 'text-emerald-300' },
    { label: 'Fat', value: totalMacros.fat, target: settings.targets.fat, color: 'bg-pink-500', text: 'text-pink-300' },
  ];

  // --- GREETING ---
  const hour = new Date().getHours();
  const greeting = hour < 5 ? 'Late night' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  // --- WORKOUT STATS ---
  const thisWeekCount = useMemo(() => {
    const start = new Date(); start.setHours(0,0,0,0);
    start.setDate(start.getDate() - start.getDay());
    return workoutSessions.filter(s => s.startTime >= start.getTime()).length;
  }, [workoutSessions]);

  const lastWorkout = workoutSessions[0];
  const latestWeight = useMemo(() => {
    if (bodyLogs.length === 0) return null;
    return [...bodyLogs].sort((a, b) => b.timestamp - a.timestamp)[0];
  }, [bodyLogs]);

  const weeklyData = useMemo(() => {
    const data = [];
    const today = new Date(); today.setHours(0,0,0,0);
    const currentWeekStart = new Date(today);
    currentWeekStart.setDate(today.getDate() - today.getDay());
    for (let i = 3; i >= 0; i--) {
      const start = new Date(currentWeekStart);
      start.setDate(start.getDate() - (i * 7));
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23,59,59,999);
      const count = workoutSessions.filter(s => s.startTime >= start.getTime() && s.startTime <= end.getTime()).length;
      data.push({ short: i === 0 ? 'Now' : `${i}w`, workouts: count });
    }
    return data;
  }, [workoutSessions]);

  // --- VOLUME PROGRESS ---
  const uniqueExercises = useMemo(() => {
    const names = new Set<string>();
    workoutSessions.forEach(s => s.exercises.forEach(e => {
      if (e.muscleGroup !== MuscleGroup.CARDIO) names.add(e.name);
    }));
    return Array.from(names).sort();
  }, [workoutSessions]);

  const [selectedExercise, setSelectedExercise] = useState<string>('');

  useEffect(() => {
    if (uniqueExercises.length > 0 && !selectedExercise) {
      setSelectedExercise(uniqueExercises[0]);
    }
  }, [uniqueExercises]);

  const exerciseProgressData = useMemo(() => {
    if (!selectedExercise) return [];
    return workoutSessions
      .filter(s => s.exercises.some(e => e.name === selectedExercise))
      .sort((a, b) => a.startTime - b.startTime)
      .map(s => {
        const ex = s.exercises.find(e => e.name === selectedExercise);
        const volume = ex ? ex.sets.reduce((acc, set) => set.completed ? acc + set.weight * set.reps : acc, 0) : 0;
        return {
          date: new Date(s.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          volume
        };
      });
  }, [workoutSessions, selectedExercise]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1c1c1e] border border-white/10 p-2 rounded-lg shadow-xl text-xs">
          <p className="text-white/50 mb-1">{label}</p>
          <p className="text-white font-bold">
            {payload[0].value} {payload[0].dataKey === 'volume' ? 'kg' : 'Workouts'}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="pb-24 space-y-4">

      <header className="flex justify-between items-center mb-2 pt-2">
        <div>
          <p className="text-white/40 text-xs font-medium">{greeting},</p>
          <h1 className="text-2xl font-black text-white tracking-tight leading-tight">{settings.name} <span className="inline-block animate-float">💪</span></h1>
        </div>
        <div className="relative">
          <div className="h-11 w-11 bg-gradient-to-br from-teal-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-base shadow-lg shadow-indigo-900/40 animate-glow">
            {settings.name.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      {/* Resume active workout banner */}
      {activeSession && (
        <button onClick={() => setView(GymViewType.WORKOUT)}
          className="w-full bg-gradient-to-r from-emerald-600/30 to-teal-600/20 border border-emerald-500/40 rounded-3xl p-4 flex items-center gap-3 transition active:scale-[0.98] animate-in fade-in slide-in-from-top-2">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-900/40">
            <Play size={18} fill="currentColor" />
          </div>
          <div className="flex-1 text-left">
            <div className="text-white font-bold text-sm flex items-center gap-2">
              {activeSession.name}
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <div className="text-emerald-200/60 text-[10px] font-bold uppercase tracking-wider">Workout in progress — tap to resume</div>
          </div>
          <ChevronRight size={18} className="text-emerald-300" />
        </button>
      )}

      {/* HERO: Calories ring + water */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/[0.03] backdrop-blur-md rounded-3xl p-4 border border-white/5 relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />
          <button onClick={() => setView(GymViewType.NUTRITION)}
            className="absolute top-3 right-3 p-1.5 bg-white/5 hover:bg-white/15 rounded-full text-white/50 z-20 transition active:scale-90">
            <Plus size={13} />
          </button>
          <div className="flex flex-col items-center">
            <Ring size={110} stroke={9} pct={caloriePct} color={isOverCalories ? '#f43f5e' : '#fb923c'}>
              {isOverCalories
                ? <AlertCircle size={14} className="text-rose-400 mb-0.5" />
                : <Flame size={14} className="text-orange-400 mb-0.5" />}
              <span className="text-lg font-black text-white leading-none animate-count">{Math.round(totalMacros.calories)}</span>
              <span className="text-[8px] text-white/40 font-bold uppercase tracking-wider mt-0.5">/ {settings.targets.calories}</span>
            </Ring>
            <div className={`mt-2 text-[10px] font-bold ${isOverCalories ? 'text-rose-400' : 'text-white/50'}`}>
              {isOverCalories ? `${Math.abs(Math.round(remainingCalories))} kcal over` : `${Math.round(remainingCalories)} kcal left`}
            </div>
          </div>
        </div>

        <div className="bg-white/[0.03] backdrop-blur-md rounded-3xl p-4 border border-white/5 relative overflow-hidden group">
          <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />
          <button onClick={() => setView(GymViewType.NUTRITION)}
            className="absolute top-3 right-3 p-1.5 bg-white/5 hover:bg-white/15 rounded-full text-white/50 z-20 transition active:scale-90">
            <Plus size={13} />
          </button>
          <div className="flex flex-col items-center">
            <Ring size={110} stroke={9} pct={waterPct} color="#38bdf8">
              <Droplets size={14} className="text-sky-400 mb-0.5" />
              <span className="text-lg font-black text-white leading-none animate-count">{(totalWater / 1000).toFixed(1)}L</span>
              <span className="text-[8px] text-white/40 font-bold uppercase tracking-wider mt-0.5">/ {(settings.waterTarget / 1000).toFixed(1)}L</span>
            </Ring>
            <div className="mt-2 text-[10px] font-bold text-white/50">{Math.round(waterPct)}% hydrated</div>
          </div>
        </div>
      </div>

      {/* Macro bars */}
      <div className="bg-white/[0.03] backdrop-blur-md rounded-3xl p-4 border border-white/5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-white text-xs flex items-center gap-2">
            <Apple size={14} className="text-white/40" /> Macros Today
          </h3>
          <button onClick={() => setView(GymViewType.NUTRITION)} className="text-[10px] font-bold text-indigo-300 hover:text-indigo-200 transition flex items-center gap-0.5">
            Log food <ChevronRight size={11} />
          </button>
        </div>
        <div className="space-y-3">
          {macroRows.map(m => {
            const pct = m.target > 0 ? (m.value / m.target) * 100 : 0;
            const left = m.target - m.value;
            return (
              <div key={m.label}>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className={`font-bold ${m.text}`}>{m.label}</span>
                  <span className="text-white/40">
                    {Math.round(m.value)} / {m.target}g
                    {left < 0
                      ? <span className="text-rose-400 ml-1 font-bold">{Math.abs(Math.round(left))}g over</span>
                      : <span className="text-white/30 ml-1">({Math.round(left)}g left)</span>}
                  </span>
                </div>
                <div className="h-2 w-full bg-black/30 rounded-full overflow-hidden border border-white/5">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${left < 0 ? 'bg-rose-500' : m.color}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-3 gap-2 stagger-children">
        <button onClick={() => setView(GymViewType.WORKOUT)} className="bg-white/[0.03] border border-white/5 hover:border-indigo-500/30 rounded-2xl p-3 text-center transition active:scale-95">
          <Dumbbell size={15} className="mx-auto text-indigo-400 mb-1.5" />
          <div className="text-white font-black text-sm leading-none">{thisWeekCount}</div>
          <div className="text-[8px] text-white/30 uppercase font-bold tracking-wider mt-1">This week</div>
        </button>
        <button onClick={() => setView(GymViewType.ANALYSIS)} className="bg-white/[0.03] border border-white/5 hover:border-teal-500/30 rounded-2xl p-3 text-center transition active:scale-95">
          <Scale size={15} className="mx-auto text-teal-400 mb-1.5" />
          <div className="text-white font-black text-sm leading-none">{latestWeight ? `${latestWeight.weight}kg` : '—'}</div>
          <div className="text-[8px] text-white/30 uppercase font-bold tracking-wider mt-1">Weight</div>
        </button>
        <button onClick={() => setView(GymViewType.ANALYSIS)} className="bg-white/[0.03] border border-white/5 hover:border-cyan-500/30 rounded-2xl p-3 text-center transition active:scale-95">
          <LineChart size={15} className="mx-auto text-cyan-400 mb-1.5" />
          <div className="text-white font-black text-sm leading-none">{workoutSessions.length}</div>
          <div className="text-[8px] text-white/30 uppercase font-bold tracking-wider mt-1">Total logs</div>
        </button>
      </div>

      {/* Last workout */}
      {lastWorkout && !activeSession && (
        <button onClick={() => setView(GymViewType.WORKOUT)}
          className="w-full bg-white/[0.03] border border-white/5 hover:border-white/10 rounded-3xl p-4 flex items-center gap-3 transition active:scale-[0.98] text-left">
          <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center text-white shrink-0">
            <span className="text-[8px] font-bold uppercase opacity-50">{new Date(lastWorkout.startTime).toLocaleDateString(undefined, { month: 'short' })}</span>
            <span className="text-base font-black leading-none">{new Date(lastWorkout.startTime).getDate()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[9px] text-white/30 uppercase font-bold tracking-wider">Last workout</div>
            <div className="text-white font-bold text-sm truncate">{lastWorkout.name}</div>
          </div>
          <ChevronRight size={16} className="text-white/30" />
        </button>
      )}

      {/* Charts: side by side on desktop */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Weekly Consistency */}
        <div className="bg-white/[0.03] backdrop-blur-md rounded-3xl p-4 border border-white/5">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Consistency</h3>
            <div className="flex items-center gap-1 text-emerald-400 text-[10px] font-bold">
              <TrendingUp size={10} />
              {weeklyData[3]?.workouts || 0} this week
            </div>
          </div>
          <div className="h-24 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272f" vertical={false} />
                <XAxis dataKey="short" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                <Bar dataKey="workouts" fill="#6366f1" radius={[4, 4, 4, 4]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Volume Progress */}
        <div className="bg-white/[0.03] backdrop-blur-md rounded-3xl p-4 border border-white/5">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <Activity className="text-pink-400" size={14} />
              <h3 className="text-xs font-bold text-white">Volume Progress</h3>
            </div>
            {uniqueExercises.length > 0 && (
              <div className="relative">
                <select
                  value={selectedExercise}
                  onChange={(e) => setSelectedExercise(e.target.value)}
                  className="bg-black/30 border border-white/10 text-white text-[10px] rounded-lg pl-2 pr-6 py-1 appearance-none focus:outline-none focus:border-indigo-500 max-w-[130px]"
                >
                  {uniqueExercises.map(ex => (
                    <option key={ex} value={ex}>{ex}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1.5 text-white/40 pointer-events-none" size={10} />
              </div>
            )}
          </div>
          <div className="h-32 w-full">
            {exerciseProgressData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={exerciseProgressData}>
                  <defs>
                    <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272f" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#ec4899', strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <Area type="monotone" dataKey="volume" stroke="#ec4899" strokeWidth={2} fillOpacity={1} fill="url(#colorVolume)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-white/30 text-xs">
                <BarChart3 size={20} className="mb-2 opacity-50" />
                <p>Complete workouts to track volume</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
