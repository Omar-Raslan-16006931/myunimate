
import React, { useMemo, useState, useEffect } from 'react';
import { FoodItem, WorkoutSession, GymSettings, WaterLog, GymViewType, MuscleGroup } from '../../types';
import { 
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid, Radar, RadarChart, PolarGrid, PolarAngleAxis
} from 'recharts';
import { Activity, Flame, Trophy, Droplets, TrendingUp, BarChart3, ChevronDown, Calendar, Utensils, AlertCircle, Plus, Radar as RadarIcon } from 'lucide-react';
import { theme } from '../../theme';

interface GymDashboardProps {
  foodLogs: FoodItem[];
  waterLogs: WaterLog[];
  workoutSessions: WorkoutSession[];
  settings: GymSettings;
  setView: (view: GymViewType) => void;
}

export const GymDashboard: React.FC<GymDashboardProps> = ({ foodLogs, waterLogs, workoutSessions, settings, setView }) => {
  // --- NUTRITION LOGIC ---
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
  const waterPercentage = Math.min((totalWater / settings.waterTarget) * 100, 100);
  
  const caloriePercentage = (totalMacros.calories / settings.targets.calories) * 100;
  
  const remainingCalories = settings.targets.calories - totalMacros.calories;
  const remainingProtein = settings.targets.protein - totalMacros.protein;
  const remainingCarbs = settings.targets.carbs - totalMacros.carbs;
  const remainingFat = settings.targets.fat - totalMacros.fat;

  const proteinPct = (totalMacros.protein / settings.targets.protein) * 100;
  const carbsPct = (totalMacros.carbs / settings.targets.carbs) * 100;
  const fatPct = (totalMacros.fat / settings.targets.fat) * 100;

  // --- WORKOUT LOGIC ---
  const recentWorkouts = [...workoutSessions].sort((a, b) => b.startTime - a.startTime).slice(0, 3);

  // Weekly Consistency Logic
  const weeklyData = useMemo(() => {
      const data = [];
      const today = new Date();
      today.setHours(0,0,0,0);
      
      const currentWeekStart = new Date(today);
      currentWeekStart.setDate(today.getDate() - today.getDay());
      
      for (let i = 3; i >= 0; i--) {
          const start = new Date(currentWeekStart);
          start.setDate(start.getDate() - (i * 7));
          const end = new Date(start);
          end.setDate(end.getDate() + 6);
          end.setHours(23,59,59,999);
          
          const count = workoutSessions.filter(s => s.startTime >= start.getTime() && s.startTime <= end.getTime()).length;
          data.push({
              name: i === 0 ? 'This Week' : `${i}w Ago`,
              short: i === 0 ? 'Now' : `${i}w`,
              workouts: count
          });
      }
      return data;
  }, [workoutSessions]);

  // Muscle Breakdown Logic (Radar Chart)
  const muscleSplitData = useMemo(() => {
      const counts: Record<string, number> = {};
      Object.values(MuscleGroup).forEach(m => counts[m] = 0);

      workoutSessions.forEach(session => {
          session.exercises.forEach(ex => {
               if (counts[ex.muscleGroup] !== undefined) {
                   counts[ex.muscleGroup] += ex.sets.length; 
               }
          });
      });

      return Object.keys(counts).map(key => ({
          subject: key,
          A: counts[key],
          fullMark: 100 
      }));
  }, [workoutSessions]);

  // Exercise Volume Logic
  const uniqueExercises = useMemo(() => {
      const names = new Set<string>();
      workoutSessions.forEach(s => s.exercises.forEach(e => names.add(e.name)));
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
      
      const relevantSessions = workoutSessions
          .filter(s => s.exercises.some(e => e.name === selectedExercise))
          .sort((a, b) => a.startTime - b.startTime);

      return relevantSessions.map(s => {
          const ex = s.exercises.find(e => e.name === selectedExercise);
          const volume = ex ? ex.sets.reduce((acc, set) => acc + (set.weight * set.reps), 0) : 0;
          return {
              date: new Date(s.startTime).toLocaleDateString(undefined, {month:'short', day:'numeric'}),
              volume
          };
      });
  }, [workoutSessions, selectedExercise]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-2 rounded-lg shadow-xl text-xs">
          <p className="text-slate-300 mb-1">{label}</p>
          <p className="text-white font-bold">
            {payload[0].value} {payload[0].dataKey === 'volume' ? 'lbs/kg' : 'Workouts'}
          </p>
        </div>
      );
    }
    return null;
  };

  const isOverCalories = remainingCalories < 0;

  return (
    <div className="pb-24 space-y-6">
      
      <header className="flex justify-between items-center mb-6">
        <div>
           <h1 className="text-2xl font-bold text-white">Hi, {settings.name}</h1>
           <p className="text-slate-400 text-sm">Today is {new Date().toLocaleDateString(undefined, {weekday: 'long', month: 'long', day: 'numeric'})}</p>
        </div>
        <div className="h-10 w-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-900/50">
           {settings.name.charAt(0)}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3">
         {/* Calories Card */}
         <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-4 border border-white/10 relative overflow-hidden group">
            <button 
                onClick={() => setView(GymViewType.NUTRITION)}
                className="absolute top-2 right-2 p-1 bg-white/10 hover:bg-white/20 rounded-full text-slate-300 z-20 transition"
            >
                <Plus size={14} />
            </button>
            <div className="flex justify-between items-start mb-2 relative z-10">
               <div className={`p-2 rounded-lg ${isOverCalories ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'}`}>
                   {isOverCalories ? <AlertCircle size={18} /> : <Flame size={18} />}
               </div>
               <span className={`text-xs font-bold ${isOverCalories ? 'text-red-400' : 'text-slate-500'} mr-4`}>{Math.round(caloriePercentage)}%</span>
            </div>
            <div className="relative z-10">
               <span className="text-2xl font-bold text-white block">{totalMacros.calories}</span>
               <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                  <span>Target: {settings.targets.calories}</span>
                  {isOverCalories ? (
                      <span className="text-red-400 font-bold">({Math.abs(remainingCalories)} over)</span>
                  ) : (
                      <span className="text-orange-400">({remainingCalories} left)</span>
                  )}
               </div>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-700">
               <div 
                   className={`h-full transition-all duration-1000 ${isOverCalories ? 'bg-red-500' : 'bg-orange-500'}`} 
                   style={{ width: `${Math.min(caloriePercentage, 100)}%` }}
               ></div>
            </div>
         </div>

         {/* Water Card */}
         <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-4 border border-white/10 relative overflow-hidden group">
            <button 
                onClick={() => setView(GymViewType.NUTRITION)}
                className="absolute top-2 right-2 p-1 bg-white/10 hover:bg-white/20 rounded-full text-slate-300 z-20 transition"
            >
                <Plus size={14} />
            </button>
            <div className="flex justify-between items-start mb-2 relative z-10">
               <div className="p-2 bg-sky-500/10 rounded-lg text-sky-400"><Droplets size={18} /></div>
               <span className="text-xs font-bold text-slate-500 mr-4">{Math.round(waterPercentage)}%</span>
            </div>
            <div className="relative z-10">
               <span className="text-2xl font-bold text-white block">{Math.round(totalWater / 100) / 10}L</span>
               <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                  <span>Target: {settings.waterTarget / 1000}L</span>
               </div>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-700">
               <div className="h-full bg-sky-500 transition-all duration-1000" style={{ width: `${waterPercentage}%` }}></div>
            </div>
         </div>
      </div>
      
      {/* Detailed Macro Breakdown */}
      <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-5 border border-white/10 relative">
        <button 
            onClick={() => setView(GymViewType.NUTRITION)}
            className="absolute top-4 right-4 p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-slate-300 transition"
        >
            <Plus size={16} />
        </button>
        <div className="flex items-center gap-2 mb-4">
             <Utensils className="text-slate-400" size={18} />
             <h3 className="font-bold text-white text-sm">Macro Targets</h3>
        </div>

        <div className="space-y-4">
            {/* Protein */}
            <div>
                <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-bold text-indigo-300">Protein</span>
                    <span className="text-slate-400">
                        {totalMacros.protein} / {settings.targets.protein}g 
                        {remainingProtein < 0 ? (
                            <span className="text-red-400 ml-1 font-bold flex items-center inline-flex gap-1">
                                <AlertCircle size={10} /> {Math.abs(remainingProtein)}g over
                            </span>
                        ) : (
                            <span className="text-slate-500 ml-1 font-medium">({remainingProtein}g left)</span>
                        )}
                    </span>
                </div>
                <div className="h-2.5 w-full bg-slate-900/50 rounded-full overflow-hidden border border-white/5">
                    <div 
                        className={`h-full rounded-full transition-all duration-1000 ${remainingProtein < 0 ? 'bg-red-500' : 'bg-indigo-500'}`} 
                        style={{ width: `${Math.min(proteinPct, 100)}%` }}
                    ></div>
                </div>
            </div>

            {/* Carbs */}
            <div>
                <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-bold text-emerald-300">Carbs</span>
                    <span className="text-slate-400">
                        {totalMacros.carbs} / {settings.targets.carbs}g 
                        {remainingCarbs < 0 ? (
                            <span className="text-red-400 ml-1 font-bold flex items-center inline-flex gap-1">
                                <AlertCircle size={10} /> {Math.abs(remainingCarbs)}g over
                            </span>
                        ) : (
                            <span className="text-slate-500 ml-1 font-medium">({remainingCarbs}g left)</span>
                        )}
                    </span>
                </div>
                <div className="h-2.5 w-full bg-slate-900/50 rounded-full overflow-hidden border border-white/5">
                    <div 
                        className={`h-full rounded-full transition-all duration-1000 ${remainingCarbs < 0 ? 'bg-red-500' : 'bg-emerald-500'}`} 
                        style={{ width: `${Math.min(carbsPct, 100)}%` }}
                    ></div>
                </div>
            </div>

            {/* Fat */}
            <div>
                <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-bold text-pink-300">Fat</span>
                    <span className="text-slate-400">
                        {totalMacros.fat} / {settings.targets.fat}g 
                        {remainingFat < 0 ? (
                            <span className="text-red-400 ml-1 font-bold flex items-center inline-flex gap-1">
                                <AlertCircle size={10} /> {Math.abs(remainingFat)}g over
                            </span>
                        ) : (
                            <span className="text-slate-500 ml-1 font-medium">({remainingFat}g left)</span>
                        )}
                    </span>
                </div>
                <div className="h-2.5 w-full bg-slate-900/50 rounded-full overflow-hidden border border-white/5">
                    <div 
                        className={`h-full rounded-full transition-all duration-1000 ${remainingFat < 0 ? 'bg-red-500' : 'bg-pink-500'}`} 
                        style={{ width: `${Math.min(fatPct, 100)}%` }}
                    ></div>
                </div>
            </div>
        </div>
      </div>

      {/* Workout Stats Group */}
      <div className="space-y-4">
         {/* Muscle Breakdown Radar Chart */}
         <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-4 border border-white/10">
             <div className="flex items-center gap-2 mb-4">
                 <RadarIcon className="text-indigo-400" size={20} />
                 <h3 className="text-sm font-bold text-white">Muscle Breakdown</h3>
             </div>
             <div className="h-48 w-full">
                 <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                     <RadarChart cx="50%" cy="50%" outerRadius="70%" data={muscleSplitData}>
                         <PolarGrid stroke="#334155" />
                         <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                         <Radar
                             name="Sets"
                             dataKey="A"
                             stroke="#818cf8"
                             strokeWidth={2}
                             fill="#6366f1"
                             fillOpacity={0.4}
                         />
                     </RadarChart>
                 </ResponsiveContainer>
             </div>
         </div>

         {/* Weekly Consistency */}
         <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase">Workout Consistency</h3>
                    <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
                        <TrendingUp size={12} /> 
                        {weeklyData[0]?.workouts || 0} Sessions
                    </div>
                </div>
                <div className="h-32 w-full">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <BarChart data={weeklyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <XAxis dataKey="short" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
                            <Bar dataKey="workouts" fill="#6366f1" radius={[4, 4, 4, 4