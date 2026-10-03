import React, { useMemo, useState, useEffect } from 'react';
import { FoodItem, WorkoutSession, GymSettings, WaterLog, GymViewType, MuscleGroup, BodyLog } from '../../types';
import {
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid
} from 'recharts';
import { Activity, Flame, Droplets, TrendingUp, BarChart3, ChevronDown, ChevronRight, AlertCircle, Plus, Dumbbell, Apple, LineChart, Play, Scale } from 'lucide-react';

const INK = '#1A1730';
const CARD_BG = '#FAFAF6';
const HL_YELLOW = '#F6DF63';
const HL_GREEN = '#8CE3B7';
const HL_BLUE = '#9ECFFF';
const HL_ORANGE = '#F4BE8A';
const HL_PINK = '#eea8f2';
const HL_RED = '#E56A5A';

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
const Ring = ({ size, stroke, pct, color, track = `${INK}18`, children }: {
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

const card: React.CSSProperties = {
  background: CARD_BG,
  border: `1.5px solid ${INK}`,
  borderRadius: 10,
  boxShadow: `4px 5px 0 ${INK}`,
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
    { label: 'Protein', value: totalMacros.protein, target: settings.targets.protein, color: HL_BLUE },
    { label: 'Carbs', value: totalMacros.carbs, target: settings.targets.carbs, color: HL_GREEN },
    { label: 'Fat', value: totalMacros.fat, target: settings.targets.fat, color: HL_PINK },
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
        <div style={{ background: CARD_BG, border: `1.5px solid ${INK}`, borderRadius: 8, padding: '6px 10px', fontSize: 11, boxShadow: `2px 3px 0 ${INK}` }}>
          <p style={{ color: `${INK}80`, marginBottom: 2 }}>{label}</p>
          <p style={{ color: INK, fontWeight: 700 }}>
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
          <p style={{ color: `${INK}60`, fontSize: 12, fontWeight: 500, fontFamily: "'Instrument Sans', sans-serif" }}>{greeting},</p>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: INK, fontFamily: "'Bricolage Grotesque', sans-serif", lineHeight: 1.1 }}>
            {settings.name} <span className="inline-block animate-float">💪</span>
          </h1>
        </div>
        <div
          style={{
            width: 44, height: 44,
            background: HL_YELLOW,
            border: `1.5px solid ${INK}`,
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 900,
            fontSize: 18,
            color: INK,
            boxShadow: `3px 3px 0 ${INK}`,
            fontFamily: "'Bricolage Grotesque', sans-serif",
          }}
        >
          {settings.name.charAt(0).toUpperCase()}
        </div>
      </header>

      {/* Resume active workout banner */}
      {activeSession && (
        <button onClick={() => setView(GymViewType.WORKOUT)}
          style={{
            width: '100%',
            background: `${HL_GREEN}40`,
            border: `1.5px solid ${INK}`,
            borderRadius: 14,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            cursor: 'pointer',
            boxShadow: `3px 3px 0 ${INK}`,
          }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: HL_GREEN, border: `1.5px solid ${INK}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: INK, boxShadow: `2px 2px 0 ${INK}` }}>
            <Play size={18} fill="currentColor" />
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ color: INK, fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              {activeSession.name}
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} className="animate-ping" />
            </div>
            <div style={{ color: `${INK}80`, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: "'Instrument Sans', sans-serif" }}>Workout in progress — tap to resume</div>
          </div>
          <ChevronRight size={18} style={{ color: INK }} />
        </button>
      )}

      {/* HERO: Calories ring + water */}
      <div className="grid grid-cols-2 gap-3">
        <div style={{ ...card, padding: 16, position: 'relative', overflow: 'hidden' }}>
          <button onClick={() => setView(GymViewType.NUTRITION)}
            style={{ position: 'absolute', top: 8, right: 8, padding: 6, background: `${INK}10`, border: `1px solid ${INK}20`, borderRadius: '50%', cursor: 'pointer', color: INK, zIndex: 2, display: 'flex' }}>
            <Plus size={13} />
          </button>
          <div className="flex flex-col items-center">
            <Ring size={110} stroke={9} pct={caloriePct} color={isOverCalories ? HL_RED : HL_ORANGE}>
              {isOverCalories
                ? <AlertCircle size={14} style={{ color: HL_RED, marginBottom: 2 }} />
                : <Flame size={14} style={{ color: HL_ORANGE, marginBottom: 2 }} />}
              <span style={{ fontSize: 20, fontWeight: 900, color: INK, lineHeight: 1, fontFamily: "'Bricolage Grotesque', sans-serif" }}>{Math.round(totalMacros.calories)}</span>
              <span style={{ fontSize: 9, color: `${INK}50`, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>/ {settings.targets.calories}</span>
            </Ring>
            <div style={{ marginTop: 8, fontSize: 10, fontWeight: 700, color: isOverCalories ? HL_RED : `${INK}60`, fontFamily: "'Instrument Sans', sans-serif" }}>
              {isOverCalories ? `${Math.abs(Math.round(remainingCalories))} kcal over` : `${Math.round(remainingCalories)} kcal left`}
            </div>
          </div>
        </div>

        <div style={{ ...card, padding: 16, position: 'relative', overflow: 'hidden' }}>
          <button onClick={() => setView(GymViewType.NUTRITION)}
            style={{ position: 'absolute', top: 8, right: 8, padding: 6, background: `${INK}10`, border: `1px solid ${INK}20`, borderRadius: '50%', cursor: 'pointer', color: INK, zIndex: 2, display: 'flex' }}>
            <Plus size={13} />
          </button>
          <div className="flex flex-col items-center">
            <Ring size={110} stroke={9} pct={waterPct} color={HL_BLUE}>
              <Droplets size={14} style={{ color: HL_BLUE, marginBottom: 2 }} />
              <span style={{ fontSize: 20, fontWeight: 900, color: INK, lineHeight: 1, fontFamily: "'Bricolage Grotesque', sans-serif" }}>{(totalWater / 1000).toFixed(1)}L</span>
              <span style={{ fontSize: 9, color: `${INK}50`, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>/ {(settings.waterTarget / 1000).toFixed(1)}L</span>
            </Ring>
            <div style={{ marginTop: 8, fontSize: 10, fontWeight: 700, color: `${INK}60`, fontFamily: "'Instrument Sans', sans-serif" }}>{Math.round(waterPct)}% hydrated</div>
          </div>
        </div>
      </div>

      {/* Macro bars */}
      <div style={{ ...card, padding: 16 }}>
        <div className="flex items-center justify-between mb-3">
          <h3 style={{ fontWeight: 700, color: INK, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'Bricolage Grotesque', sans-serif" }}>
            <Apple size={14} style={{ color: `${INK}60` }} /> Macros Today
          </h3>
          <button onClick={() => setView(GymViewType.NUTRITION)} style={{ fontSize: 10, fontWeight: 700, color: INK, background: `${HL_YELLOW}60`, border: `1px solid ${INK}30`, borderRadius: 6, padding: '2px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}>
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
                  <span style={{ fontWeight: 700, color: INK, fontFamily: "'Instrument Sans', sans-serif" }}>{m.label}</span>
                  <span style={{ color: `${INK}60`, fontFamily: "'Instrument Sans', sans-serif" }}>
                    {Math.round(m.value)} / {m.target}g
                    {left < 0
                      ? <span style={{ color: HL_RED, marginLeft: 4, fontWeight: 700 }}>{Math.abs(Math.round(left))}g over</span>
                      : <span style={{ color: `${INK}40`, marginLeft: 4 }}>({Math.round(left)}g left)</span>}
                  </span>
                </div>
                <div style={{ height: 8, width: '100%', background: `${INK}12`, borderRadius: 99, overflow: 'hidden', border: `1px solid ${INK}20` }}>
                  <div
                    style={{ height: '100%', borderRadius: 99, background: left < 0 ? HL_RED : m.color, width: `${Math.min(pct, 100)}%`, transition: 'width 1s ease-out' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => setView(GymViewType.WORKOUT)} style={{ ...card, padding: 12, textAlign: 'center', cursor: 'pointer', background: `${HL_YELLOW}50` }}>
          <Dumbbell size={15} style={{ margin: '0 auto', color: INK, marginBottom: 6 }} />
          <div style={{ color: INK, fontWeight: 900, fontSize: 15, lineHeight: 1, fontFamily: "'Bricolage Grotesque', sans-serif" }}>{thisWeekCount}</div>
          <div style={{ fontSize: 8, color: `${INK}60`, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', marginTop: 4, fontFamily: "'Instrument Sans', sans-serif" }}>This week</div>
        </button>
        <button onClick={() => setView(GymViewType.ANALYSIS)} style={{ ...card, padding: 12, textAlign: 'center', cursor: 'pointer', background: `${HL_GREEN}50` }}>
          <Scale size={15} style={{ margin: '0 auto', color: INK, marginBottom: 6 }} />
          <div style={{ color: INK, fontWeight: 900, fontSize: 15, lineHeight: 1, fontFamily: "'Bricolage Grotesque', sans-serif" }}>{latestWeight ? `${latestWeight.weight}kg` : '—'}</div>
          <div style={{ fontSize: 8, color: `${INK}60`, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', marginTop: 4, fontFamily: "'Instrument Sans', sans-serif" }}>Weight</div>
        </button>
        <button onClick={() => setView(GymViewType.ANALYSIS)} style={{ ...card, padding: 12, textAlign: 'center', cursor: 'pointer', background: `${HL_BLUE}50` }}>
          <LineChart size={15} style={{ margin: '0 auto', color: INK, marginBottom: 6 }} />
          <div style={{ color: INK, fontWeight: 900, fontSize: 15, lineHeight: 1, fontFamily: "'Bricolage Grotesque', sans-serif" }}>{workoutSessions.length}</div>
          <div style={{ fontSize: 8, color: `${INK}60`, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', marginTop: 4, fontFamily: "'Instrument Sans', sans-serif" }}>Total logs</div>
        </button>
      </div>

      {/* Last workout */}
      {lastWorkout && !activeSession && (
        <button onClick={() => setView(GymViewType.WORKOUT)}
          style={{ ...card, width: '100%', padding: 16, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: `${INK}08`, border: `1.5px solid ${INK}20`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: INK, flexShrink: 0 }}>
            <span style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', opacity: 0.5 }}>{new Date(lastWorkout.startTime).toLocaleDateString(undefined, { month: 'short' })}</span>
            <span style={{ fontSize: 18, fontWeight: 900, lineHeight: 1 }}>{new Date(lastWorkout.startTime).getDate()}</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9, color: `${INK}50`, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', fontFamily: "'Instrument Sans', sans-serif" }}>Last workout</div>
            <div style={{ color: INK, fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Bricolage Grotesque', sans-serif" }}>{lastWorkout.name}</div>
          </div>
          <ChevronRight size={16} style={{ color: `${INK}40` }} />
        </button>
      )}

      {/* Charts: side by side on desktop */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Weekly Consistency */}
        <div style={{ ...card, padding: 16 }}>
          <div className="flex justify-between items-center mb-2">
            <h3 style={{ fontSize: 10, fontWeight: 700, color: `${INK}60`, textTransform: 'uppercase', letterSpacing: '1px', fontFamily: "'Instrument Sans', sans-serif" }}>Consistency</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: INK, fontSize: 10, fontWeight: 700 }}>
              <TrendingUp size={10} />
              {weeklyData[3]?.workouts || 0} this week
            </div>
          </div>
          <div style={{ height: 96, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={`${INK}15`} vertical={false} />
                <XAxis dataKey="short" stroke={`${INK}50`} fontSize={9} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                <Bar dataKey="workouts" fill={HL_YELLOW} radius={[4, 4, 4, 4]} maxBarSize={32} stroke={INK} strokeWidth={1} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Volume Progress */}
        <div style={{ ...card, padding: 16 }}>
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <Activity style={{ color: HL_PINK }} size={14} />
              <h3 style={{ fontSize: 12, fontWeight: 700, color: INK, fontFamily: "'Bricolage Grotesque', sans-serif" }}>Volume Progress</h3>
            </div>
            {uniqueExercises.length > 0 && (
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedExercise}
                  onChange={(e) => setSelectedExercise(e.target.value)}
                  style={{
                    background: `${INK}08`,
                    border: `1.5px solid ${INK}`,
                    color: INK,
                    fontSize: 10,
                    borderRadius: 8,
                    paddingLeft: 8,
                    paddingRight: 24,
                    paddingTop: 4,
                    paddingBottom: 4,
                    appearance: 'none',
                    outline: 'none',
                    maxWidth: 130,
                    fontFamily: "'Instrument Sans', sans-serif",
                    fontWeight: 600,
                  }}
                >
                  {uniqueExercises.map(ex => (
                    <option key={ex} value={ex}>{ex}</option>
                  ))}
                </select>
                <ChevronDown style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', color: `${INK}60`, pointerEvents: 'none' }} size={10} />
              </div>
            )}
          </div>
          <div style={{ height: 128, width: '100%' }}>
            {exerciseProgressData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={exerciseProgressData}>
                  <defs>
                    <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={HL_PINK} stopOpacity={0.5}/>
                      <stop offset="95%" stopColor={HL_PINK} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={`${INK}15`} vertical={false} />
                  <XAxis dataKey="date" stroke={`${INK}50`} fontSize={9} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: INK, strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <Area type="monotone" dataKey="volume" stroke={INK} strokeWidth={2} fillOpacity={1} fill="url(#colorVolume)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: `${INK}40`, fontSize: 12 }}>
                <BarChart3 size={20} style={{ marginBottom: 8, opacity: 0.5 }} />
                <p>Complete workouts to track volume</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
