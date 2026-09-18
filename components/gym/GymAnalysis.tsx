import React, { useMemo, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Radar, RadarChart, PolarGrid, PolarAngleAxis
} from 'recharts';
import {
  Trophy, Scale, Ruler, TrendingUp, TrendingDown, Flame, Clock,
  Dumbbell, Plus, X, Trash2, Calculator, ChevronDown, Activity, Minus
} from 'lucide-react';
import { WorkoutSession, BodyLog, GymSettings, MuscleGroup } from '../../types';
import { generateId } from '../../constants';

interface GymAnalysisProps {
  workoutSessions: WorkoutSession[];
  bodyLogs: BodyLog[];
  settings: GymSettings;
  addBodyLog: (log: BodyLog) => void;
  deleteBodyLog: (id: string) => void;
}

// Epley formula — the standard estimate for a one-rep max
const est1RM = (weight: number, reps: number) => reps <= 1 ? weight : weight * (1 + reps / 30);

const fmtK = (n: number) => n >= 10000 ? `${(n / 1000).toFixed(1)}k` : Math.round(n).toLocaleString();

const ChartTooltip = ({ active, payload, label, unit }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1c1c1e] border border-white/10 p-2 rounded-lg shadow-xl text-xs">
        <p className="text-white/50 mb-1">{label}</p>
        <p className="text-white font-bold">{payload[0].value.toLocaleString()} {unit}</p>
      </div>
    );
  }
  return null;
};

export const GymAnalysis: React.FC<GymAnalysisProps> = ({ workoutSessions, bodyLogs, settings, addBodyLog, deleteBodyLog }) => {
  const [showLogModal, setShowLogModal] = useState(false);
  const [showMeasures, setShowMeasures] = useState(false);
  const [form, setForm] = useState({ weight: '', bodyFat: '', chest: '', waist: '', hips: '', arms: '', thighs: '' });
  const [prCount, setPrCount] = useState(6);

  // 1RM calculator widget
  const [calcW, setCalcW] = useState('');
  const [calcR, setCalcR] = useState('');
  const calc1rm = est1RM(parseFloat(calcW) || 0, parseInt(calcR) || 0);

  const sortedBodyLogs = useMemo(() => [...bodyLogs].sort((a, b) => a.timestamp - b.timestamp), [bodyLogs]);

  // --- TOTALS ---
  const totals = useMemo(() => {
    let volume = 0, sets = 0, timeMs = 0;
    workoutSessions.forEach(s => {
      timeMs += Math.max(0, (s.endTime || s.startTime) - s.startTime);
      s.exercises.forEach(ex => {
        if (ex.muscleGroup === MuscleGroup.CARDIO) return;
        ex.sets.forEach(set => {
          if (!set.completed) return;
          sets += 1;
          volume += set.weight * set.reps;
        });
      });
    });
    return { volume, sets, hours: timeMs / 3600000, workouts: workoutSessions.length };
  }, [workoutSessions]);

  // --- STREAK (consecutive weeks with at least one workout) ---
  const { weekStreak, last7 } = useMemo(() => {
    const now = new Date();
    const startOfWeek = (d: Date) => {
      const r = new Date(d); r.setHours(0,0,0,0);
      r.setDate(r.getDate() - r.getDay());
      return r.getTime();
    };
    const weeksWithWork = new Set(workoutSessions.map(s => startOfWeek(new Date(s.startTime))));
    let streak = 0;
    let cursor = startOfWeek(now);
    // Current week counts if trained; otherwise streak continues from last week
    if (!weeksWithWork.has(cursor)) cursor -= 7 * 86400000;
    while (weeksWithWork.has(cursor)) { streak++; cursor -= 7 * 86400000; }

    const days: { label: string; active: boolean; isToday: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - i);
      const next = d.getTime() + 86400000;
      days.push({
        label: d.toLocaleDateString(undefined, { weekday: 'narrow' }),
        active: workoutSessions.some(s => s.startTime >= d.getTime() && s.startTime < next),
        isToday: i === 0
      });
    }
    return { weekStreak: streak, last7: days };
  }, [workoutSessions]);

  // --- WEEKLY VOLUME (last 8 weeks) ---
  const weeklyVolume = useMemo(() => {
    const data = [];
    const today = new Date(); today.setHours(0,0,0,0);
    const weekStart = new Date(today); weekStart.setDate(today.getDate() - today.getDay());
    for (let i = 7; i >= 0; i--) {
      const start = new Date(weekStart); start.setDate(start.getDate() - i * 7);
      const end = start.getTime() + 7 * 86400000;
      let vol = 0;
      workoutSessions.forEach(s => {
        if (s.startTime < start.getTime() || s.startTime >= end) return;
        s.exercises.forEach(ex => {
          if (ex.muscleGroup === MuscleGroup.CARDIO) return;
          ex.sets.forEach(set => { if (set.completed) vol += set.weight * set.reps; });
        });
      });
      data.push({ name: i === 0 ? 'Now' : `${i}w`, volume: Math.round(vol) });
    }
    return data;
  }, [workoutSessions]);

  // --- MUSCLE BREAKDOWN (completed sets, last 30 days) ---
  const muscleSplit = useMemo(() => {
    const cutoff = Date.now() - 30 * 86400000;
    const groups: Record<string, number> = { Chest: 0, Back: 0, Shoulders: 0, Arms: 0, Legs: 0, Core: 0, Cardio: 0 };
    const map: Record<string, string> = {
      [MuscleGroup.CHEST]: 'Chest', [MuscleGroup.BACK]: 'Back', [MuscleGroup.SHOULDERS]: 'Shoulders',
      [MuscleGroup.BICEPS]: 'Arms', [MuscleGroup.TRICEPS]: 'Arms', [MuscleGroup.FOREARMS]: 'Arms',
      [MuscleGroup.QUADRICEPS]: 'Legs', [MuscleGroup.HAMSTRINGS]: 'Legs', [MuscleGroup.GLUTES]: 'Legs',
      [MuscleGroup.CALVES]: 'Legs', [MuscleGroup.ADDUCTORS]: 'Legs',
      [MuscleGroup.ABS]: 'Core', [MuscleGroup.CORE]: 'Core', [MuscleGroup.CARDIO]: 'Cardio'
    };
    workoutSessions.forEach(s => {
      if (s.startTime < cutoff) return;
      s.exercises.forEach(ex => {
        const key = map[ex.muscleGroup];
        if (!key) return;
        groups[key] += ex.sets.filter(st => st.completed).length;
      });
    });
    return Object.keys(groups).map(k => ({ subject: k, A: groups[k] }));
  }, [workoutSessions]);

  // --- PERSONAL RECORDS ---
  const personalRecords = useMemo(() => {
    const best: Record<string, { weight: number; reps: number; oneRM: number; date: number }> = {};
    workoutSessions.forEach(s => {
      s.exercises.forEach(ex => {
        if (ex.muscleGroup === MuscleGroup.CARDIO) return;
        ex.sets.forEach(set => {
          if (!set.completed || set.weight <= 0) return;
          const rm = est1RM(set.weight, set.reps);
          if (!best[ex.name] || rm > best[ex.name].oneRM) {
            best[ex.name] = { weight: set.weight, reps: set.reps, oneRM: rm, date: s.startTime };
          }
        });
      });
    });
    return Object.entries(best)
      .map(([name, r]) => ({ name, ...r }))
      .sort((a, b) => b.oneRM - a.oneRM);
  }, [workoutSessions]);

  // --- BODY WEIGHT ---
  const weightData = sortedBodyLogs.map(l => ({
    date: new Date(l.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    weight: l.weight
  }));
  const latestLog = sortedBodyLogs[sortedBodyLogs.length - 1];
  const prevLog = sortedBodyLogs[sortedBodyLogs.length - 2];
  const weightDelta = latestLog && prevLog ? latestLog.weight - prevLog.weight : 0;
  const latestMeasures = useMemo(() => {
    // most recent non-empty value per measurement
    const fields: (keyof BodyLog)[] = ['chest', 'waist', 'hips', 'arms', 'thighs', 'bodyFat'];
    const out: Record<string, number | undefined> = {};
    fields.forEach(f => {
      for (let i = sortedBodyLogs.length - 1; i >= 0; i--) {
        const v = sortedBodyLogs[i][f];
        if (typeof v === 'number' && v > 0) { out[f] = v; break; }
      }
    });
    return out;
  }, [sortedBodyLogs]);

  const submitBodyLog = (e: React.FormEvent) => {
    e.preventDefault();
    const weight = parseFloat(form.weight);
    if (!weight || weight <= 0) return;
    const num = (v: string) => { const n = parseFloat(v); return n > 0 ? n : undefined; };
    addBodyLog({
      id: generateId(),
      timestamp: Date.now(),
      weight,
      bodyFat: num(form.bodyFat),
      chest: num(form.chest),
      waist: num(form.waist),
      hips: num(form.hips),
      arms: num(form.arms),
      thighs: num(form.thighs)
    });
    setForm({ weight: '', bodyFat: '', chest: '', waist: '', hips: '', arms: '', thighs: '' });
    setShowLogModal(false);
  };

  const statCards = [
    { icon: Dumbbell, label: 'Workouts', value: totals.workouts.toString(), color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { icon: TrendingUp, label: 'Volume (kg)', value: fmtK(totals.volume), color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { icon: Activity, label: 'Sets Done', value: fmtK(totals.sets), color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { icon: Clock, label: 'Hours', value: totals.hours.toFixed(1), color: 'text-amber-400', bg: 'bg-amber-500/10' },
  ];

  return (
    <div className="pb-24 space-y-4">
      <header className="flex justify-between items-center mb-2 pt-2">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Progress</h1>
          <p className="text-white/40 text-xs mt-0.5">Your training, analyzed</p>
        </div>
        <div className="flex items-center gap-2 bg-gradient-to-r from-orange-500/20 to-rose-500/20 border border-orange-500/30 px-3 py-2 rounded-2xl">
          <Flame size={16} className="text-orange-400" />
          <div className="leading-none">
            <div className="text-white font-black text-sm">{weekStreak}</div>
            <div className="text-[8px] text-orange-300/70 uppercase font-bold tracking-wider">wk streak</div>
          </div>
        </div>
      </header>

      {/* 7-day activity strip */}
      <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-3xl p-4">
        <div className="flex justify-between items-center">
          {last7.map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <span className={`text-[9px] font-bold uppercase ${d.isToday ? 'text-white' : 'text-white/30'}`}>{d.label}</span>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${
                d.active
                  ? 'bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-500/30 scale-100'
                  : d.isToday ? 'bg-white/5 border border-dashed border-white/20' : 'bg-white/5'
              }`}>
                {d.active && <Dumbbell size={13} className="text-white" />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lifetime stats */}
      <div className="grid grid-cols-4 gap-2 stagger-children">
        {statCards.map(s => (
          <div key={s.label} className="bg-white/[0.03] border border-white/5 rounded-2xl p-3 text-center">
            <div className={`w-8 h-8 ${s.bg} ${s.color} rounded-xl flex items-center justify-center mx-auto mb-1.5`}>
              <s.icon size={14} />
            </div>
            <div className="text-white font-black text-sm leading-none animate-count">{s.value}</div>
            <div className="text-[8px] text-white/30 uppercase font-bold tracking-wider mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Body weight tracker */}
        <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-3xl p-4 relative overflow-hidden">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-violet-500/10 rounded-lg text-violet-400"><Scale size={15} /></div>
              <h3 className="text-xs font-bold text-white">Body Weight</h3>
            </div>
            <button onClick={() => setShowLogModal(true)} className="flex items-center gap-1 text-[10px] font-bold text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 px-2.5 py-1.5 rounded-lg transition active:scale-95">
              <Plus size={11} /> LOG
            </button>
          </div>

          {latestLog ? (
            <>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-3xl font-black text-white leading-none animate-count">{latestLog.weight}</span>
                <span className="text-white/40 text-xs font-bold mb-0.5">kg</span>
                {weightDelta !== 0 && (
                  <span className={`flex items-center gap-0.5 text-[10px] font-bold mb-0.5 px-1.5 py-0.5 rounded-md ${weightDelta > 0 ? 'text-amber-400 bg-amber-500/10' : 'text-emerald-400 bg-emerald-500/10'}`}>
                    {weightDelta > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {Math.abs(weightDelta).toFixed(1)} kg
                  </span>
                )}
              </div>
              <div className="h-28 w-full -mx-1">
                {weightData.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <AreaChart data={weightData}>
                      <defs>
                        <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} />
                      <YAxis domain={['dataMin - 2', 'dataMax + 2']} hide />
                      <Tooltip content={<ChartTooltip unit="kg" />} cursor={{ stroke: '#8b5cf6', strokeWidth: 1, strokeDasharray: '4 4' }} />
                      <Area type="monotone" dataKey="weight" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#weightGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-white/30 text-xs">Log again to see your trend</div>
                )}
              </div>
              {sortedBodyLogs.length > 0 && (
                <div className="flex justify-between items-center mt-1">
                  <span className="text-[9px] text-white/30">{sortedBodyLogs.length} entries</span>
                  <button onClick={() => deleteBodyLog(latestLog.id)} className="flex items-center gap-1 text-[9px] text-white/30 hover:text-red-400 transition">
                    <Trash2 size={10} /> Remove last
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="py-8 text-center">
              <Scale size={28} className="mx-auto text-white/15 mb-2" />
              <p className="text-white/40 text-xs">Track your weight to see trends here.</p>
            </div>
          )}
        </div>

        {/* Measurements */}
        <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-3xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-cyan-500/10 rounded-lg text-cyan-400"><Ruler size={15} /></div>
            <h3 className="text-xs font-bold text-white">Measurements</h3>
            <span className="text-[9px] text-white/30 ml-auto">latest</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'bodyFat', label: 'Body Fat', unit: '%' },
              { key: 'chest', label: 'Chest', unit: 'cm' },
              { key: 'waist', label: 'Waist', unit: 'cm' },
              { key: 'hips', label: 'Hips', unit: 'cm' },
              { key: 'arms', label: 'Arms', unit: 'cm' },
              { key: 'thighs', label: 'Thighs', unit: 'cm' },
            ].map(m => (
              <div key={m.key} className="bg-white/[0.03] border border-white/5 rounded-2xl p-2.5 text-center">
                <div className="text-white font-black text-sm">
                  {latestMeasures[m.key] !== undefined ? latestMeasures[m.key] : <Minus size={12} className="mx-auto text-white/20" />}
                  {latestMeasures[m.key] !== undefined && <span className="text-[8px] text-white/40 font-bold ml-0.5">{m.unit}</span>}
                </div>
                <div className="text-[8px] text-white/30 uppercase font-bold tracking-wider mt-0.5">{m.label}</div>
              </div>
            ))}
          </div>
          <p className="text-[9px] text-white/25 mt-2.5 text-center">Update these when logging your weight</p>
        </div>
      </div>

      {/* Personal Records */}
      <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-3xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-400"><Trophy size={15} /></div>
          <h3 className="text-xs font-bold text-white">Personal Records</h3>
          <span className="text-[9px] text-white/30 ml-auto">est. 1RM — Epley</span>
        </div>
        {personalRecords.length === 0 ? (
          <div className="py-8 text-center">
            <Trophy size={28} className="mx-auto text-white/15 mb-2" />
            <p className="text-white/40 text-xs">Complete weighted sets to start setting records.</p>
          </div>
        ) : (
          <>
            <div className="space-y-1.5 stagger-children">
              {personalRecords.slice(0, prCount).map((pr, i) => (
                <div key={pr.name} className="flex items-center gap-3 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 rounded-2xl px-3 py-2.5 transition">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                    i === 0 ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40' :
                    i === 1 ? 'bg-slate-300/10 text-slate-300 border border-slate-300/30' :
                    i === 2 ? 'bg-orange-700/20 text-orange-400 border border-orange-600/40' :
                    'bg-white/5 text-white/40'
                  }`}>{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-bold text-xs truncate">{pr.name}</div>
                    <div className="text-[9px] text-white/40">{pr.weight}kg × {pr.reps} • {new Date(pr.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-black text-amber-300">{Math.round(pr.oneRM)}</div>
                    <div className="text-[8px] text-white/30 uppercase font-bold">kg 1RM</div>
                  </div>
                </div>
              ))}
            </div>
            {personalRecords.length > prCount && (
              <button onClick={() => setPrCount(c => c + 6)} className="w-full mt-2 py-2 text-[10px] font-bold text-white/40 hover:text-white transition flex items-center justify-center gap-1">
                Show more <ChevronDown size={12} />
              </button>
            )}
          </>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Weekly volume */}
        <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-3xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-cyan-500/10 rounded-lg text-cyan-400"><TrendingUp size={15} /></div>
            <h3 className="text-xs font-bold text-white">Weekly Volume</h3>
            <span className="text-[9px] text-white/30 ml-auto">kg lifted</span>
          </div>
          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={weeklyVolume}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272f" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip unit="kg" />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="volume" fill="#06b6d4" radius={[4, 4, 4, 4]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Muscle radar */}
        <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-3xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400"><Activity size={15} /></div>
            <h3 className="text-xs font-bold text-white">Muscle Balance</h3>
            <span className="text-[9px] text-white/30 ml-auto">sets, 30 days</span>
          </div>
          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={muscleSplit}>
                <PolarGrid stroke="#27272f" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 9 }} />
                <Radar name="Sets" dataKey="A" stroke="#818cf8" strokeWidth={2} fill="#6366f1" fillOpacity={0.4} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 1RM Calculator */}
      <div className="bg-gradient-to-br from-indigo-950/60 to-violet-950/40 backdrop-blur-md border border-indigo-500/20 rounded-3xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-indigo-500/20 rounded-lg text-indigo-300"><Calculator size={15} /></div>
          <h3 className="text-xs font-bold text-white">1RM Calculator</h3>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex-1">
            <label className="block text-[8px] text-white/40 uppercase font-bold mb-1 tracking-wider">Weight (kg)</label>
            <input type="number" value={calcW} onChange={e => setCalcW(e.target.value)} placeholder="100"
              className="w-full bg-black/30 border border-white/10 rounded-xl py-2.5 text-center text-white font-bold text-sm outline-none focus:border-indigo-500/50 transition placeholder:text-white/20" />
          </div>
          <X size={12} className="text-white/30 mt-4" />
          <div className="flex-1">
            <label className="block text-[8px] text-white/40 uppercase font-bold mb-1 tracking-wider">Reps</label>
            <input type="number" value={calcR} onChange={e => setCalcR(e.target.value)} placeholder="5"
              className="w-full bg-black/30 border border-white/10 rounded-xl py-2.5 text-center text-white font-bold text-sm outline-none focus:border-indigo-500/50 transition placeholder:text-white/20" />
          </div>
          <div className="flex-1 text-center bg-indigo-500/10 border border-indigo-500/20 rounded-xl py-2 mt-4 self-stretch flex flex-col justify-center">
            <div className="text-lg font-black text-indigo-300 leading-none">{calc1rm > 0 ? Math.round(calc1rm) : '—'}</div>
            <div className="text-[8px] text-white/40 uppercase font-bold tracking-wider mt-0.5">est. 1RM</div>
          </div>
        </div>
        {calc1rm > 0 && (
          <div className="grid grid-cols-5 gap-1.5 mt-3 animate-in fade-in slide-in-from-bottom-1">
            {[95, 90, 85, 80, 70].map(p => (
              <div key={p} className="bg-black/20 rounded-lg py-1.5 text-center">
                <div className="text-[10px] font-black text-white">{Math.round(calc1rm * p / 100)}</div>
                <div className="text-[7px] text-white/40 font-bold">{p}%</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- LOG BODY WEIGHT MODAL --- */}
      {showLogModal && (
        <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1c1c1e] border border-white/10 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">Log Check-in</h3>
              <button onClick={() => setShowLogModal(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition"><X size={16} /></button>
            </div>
            <form onSubmit={submitBodyLog} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-violet-300 uppercase tracking-wider mb-1">Weight (kg) *</label>
                  <input type="number" step="0.1" autoFocus required value={form.weight}
                    onChange={e => setForm({ ...form, weight: e.target.value })}
                    placeholder={settings.weight ? settings.weight.toString() : '75'}
                    className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white font-bold text-base outline-none focus:border-violet-500/60 transition placeholder:text-white/20" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-white/40 uppercase tracking-wider mb-1">Body Fat %</label>
                  <input type="number" step="0.1" value={form.bodyFat}
                    onChange={e => setForm({ ...form, bodyFat: e.target.value })}
                    placeholder="Optional"
                    className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white font-bold text-base outline-none focus:border-violet-500/60 transition placeholder:text-white/20" />
                </div>
              </div>

              <button type="button" onClick={() => setShowMeasures(!showMeasures)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-white/[0.03] border border-white/5 rounded-xl text-xs font-bold text-white/60 hover:text-white transition">
                <span className="flex items-center gap-2"><Ruler size={13} /> Body measurements</span>
                <ChevronDown size={14} className={`transition-transform ${showMeasures ? 'rotate-180' : ''}`} />
              </button>

              {showMeasures && (
                <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  {([['chest','Chest'],['waist','Waist'],['hips','Hips'],['arms','Arms'],['thighs','Thighs']] as const).map(([key, label]) => (
                    <div key={key}>
                      <label className="block text-[9px] font-bold text-white/40 uppercase tracking-wider mb-1">{label} (cm)</label>
                      <input type="number" step="0.1" value={form[key]}
                        onChange={e => setForm({ ...form, [key]: e.target.value })}
                        placeholder="—"
                        className="w-full bg-black/30 border border-white/10 rounded-xl p-2.5 text-white text-sm font-bold outline-none focus:border-cyan-500/60 transition placeholder:text-white/20" />
                    </div>
                  ))}
                </div>
              )}

              <button type="submit" className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:brightness-110 text-white font-bold rounded-2xl transition text-sm shadow-lg shadow-violet-900/30 active:scale-[0.98]">
                Save Check-in
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
