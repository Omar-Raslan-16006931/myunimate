import React, { useState } from 'react';
import { GymSettings, ActivityLevel, FitnessGoal } from '../../types';
import { Save, Calculator, Droplets, Flame, User, Clock, TrendingDown, TrendingUp, Scale, Sparkles, Check } from 'lucide-react';

interface SettingsProps {
  settings: GymSettings;
  updateSettings: (newSettings: GymSettings) => void;
}

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9
};

const GOALS: { id: FitnessGoal; label: string; sub: string; icon: React.ElementType; adjust: number; color: string }[] = [
  { id: 'cut', label: 'Cut', sub: '-20% kcal', icon: TrendingDown, adjust: 0.8, color: 'rose' },
  { id: 'maintain', label: 'Maintain', sub: 'TDEE', icon: Scale, adjust: 1, color: 'indigo' },
  { id: 'bulk', label: 'Bulk', sub: '+10% kcal', icon: TrendingUp, adjust: 1.1, color: 'emerald' },
];

export const GymSettingsComponent: React.FC<SettingsProps> = ({ settings, updateSettings }) => {
  const [formData, setFormData] = useState<GymSettings>({ goal: 'maintain', ...settings });
  const [saved, setSaved] = useState(false);
  const [justCalculated, setJustCalculated] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, field: string, isTarget = false) => {
    const value = e.target.value;
    if (isTarget) {
      setFormData({ ...formData, targets: { ...formData.targets, [field]: Number(value) } });
    } else {
      setFormData({
        ...formData,
        [field]: (field === 'name' || field === 'gender' || field === 'activityLevel') ? value : Number(value)
      });
    }
  };

  // --- LIVE COMPUTED METRICS ---
  const { weight, height, age, gender, activityLevel } = formData;
  const goal = formData.goal || 'maintain';

  const bmi = weight > 0 && height > 0 ? weight / Math.pow(height / 100, 2) : 0;
  const bmiInfo = bmi <= 0 ? { label: '—', color: 'text-white/40' }
    : bmi < 18.5 ? { label: 'Underweight', color: 'text-sky-400' }
    : bmi < 25 ? { label: 'Healthy', color: 'text-emerald-400' }
    : bmi < 30 ? { label: 'Overweight', color: 'text-amber-400' }
    : { label: 'Obese', color: 'text-rose-400' };

  // Mifflin-St Jeor
  const bmr = Math.max(0, Math.round((10 * weight) + (6.25 * height) - (5 * age) + (gender === 'male' ? 5 : -161)));
  const tdee = Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
  const goalAdjust = GOALS.find(g => g.id === goal)?.adjust ?? 1;
  const goalCalories = Math.round(tdee * goalAdjust);

  // Macro split: protein 2.2g/kg on a cut (muscle retention), 1.8 bulk, 2.0 maintain; fat 0.8g/kg; carbs fill the rest
  const proteinPerKg = goal === 'cut' ? 2.2 : goal === 'bulk' ? 1.8 : 2.0;
  const calcProtein = Math.round(weight * proteinPerKg);
  const calcFat = Math.round(weight * 0.8);
  const calcCarbs = Math.max(0, Math.round((goalCalories - calcProtein * 4 - calcFat * 9) / 4));
  const suggestedWater = Math.round(weight * 35 / 50) * 50; // 35 ml/kg rounded to 50ml

  const applyCalculation = () => {
    setFormData({
      ...formData,
      waterTarget: suggestedWater,
      targets: { calories: goalCalories, protein: calcProtein, fat: calcFat, carbs: calcCarbs }
    });
    setJustCalculated(true);
    setTimeout(() => setJustCalculated(false), 1500);
  };

  const handleSave = () => {
    updateSettings(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inputCls = "w-full bg-black/30 border border-white/10 rounded-xl p-2.5 text-sm text-white font-bold outline-none focus:border-indigo-500/60 transition placeholder:text-white/20";
  const labelCls = "block text-white/40 text-[9px] uppercase font-bold mb-1 tracking-wider";

  return (
    <div className="pb-24 space-y-4">
      <header className="pt-2">
        <h1 className="text-2xl font-black text-white tracking-tight">Settings</h1>
        <p className="text-white/40 text-xs mt-0.5">Profile, goals & targets</p>
      </header>

      {/* --- PROFILE CARD --- */}
      <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-3xl p-4 space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400"><User size={15} /></div>
          <h3 className="text-xs font-bold text-white">Your Profile</h3>
          {bmi > 0 && (
            <div className="ml-auto flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
              <span className="text-[9px] text-white/40 font-bold uppercase">BMI</span>
              <span className="text-xs font-black text-white">{bmi.toFixed(1)}</span>
              <span className={`text-[9px] font-bold ${bmiInfo.color}`}>{bmiInfo.label}</span>
            </div>
          )}
        </div>

        <div>
          <label className={labelCls}>Display Name</label>
          <input type="text" value={formData.name} onChange={(e) => handleChange(e, 'name')} className={inputCls} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Gender</label>
            <select value={formData.gender} onChange={(e) => handleChange(e, 'gender')} className={inputCls + " appearance-none"}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Age</label>
            <input type="number" value={formData.age || ''} onChange={(e) => handleChange(e, 'age')} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Height (cm)</label>
            <input type="number" value={formData.height || ''} onChange={(e) => handleChange(e, 'height')} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Weight (kg)</label>
            <input type="number" value={formData.weight || ''} onChange={(e) => handleChange(e, 'weight')} className={inputCls} />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Activity Level</label>
            <select value={formData.activityLevel} onChange={(e) => handleChange(e, 'activityLevel')} className={inputCls + " appearance-none"}>
              <option value="sedentary">Sedentary — desk job, little exercise</option>
              <option value="light">Lightly Active — 1-3 sessions / week</option>
              <option value="moderate">Moderately Active — 3-5 sessions / week</option>
              <option value="active">Active — 6-7 sessions / week</option>
              <option value="very_active">Very Active — athlete / physical job</option>
            </select>
          </div>
        </div>
      </div>

      {/* --- MACRO CALCULATOR --- */}
      <div className="bg-gradient-to-br from-indigo-950/60 to-teal-950/40 backdrop-blur-md border border-indigo-500/20 rounded-3xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-indigo-500/20 rounded-lg text-indigo-300"><Calculator size={15} /></div>
          <h3 className="text-xs font-bold text-white">Macro Calculator</h3>
          <span className="text-[9px] text-white/40 ml-auto">Mifflin-St Jeor</span>
        </div>

        {/* Goal selector */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {GOALS.map(g => {
            const active = goal === g.id;
            const activeCls = g.color === 'rose' ? 'bg-rose-500/15 border-rose-500/50 text-rose-300'
              : g.color === 'emerald' ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
              : 'bg-indigo-500/15 border-indigo-500/50 text-indigo-300';
            return (
              <button key={g.id} onClick={() => setFormData({ ...formData, goal: g.id })}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-2xl border transition-all active:scale-95 ${active ? activeCls + ' shadow-lg' : 'bg-white/[0.03] border-white/5 text-white/40 hover:text-white/70'}`}>
                <g.icon size={16} />
                <span className="text-[11px] font-black">{g.label}</span>
                <span className="text-[8px] font-bold opacity-60">{g.sub}</span>
              </button>
            );
          })}
        </div>

        {/* Live metabolic readout */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-black/20 rounded-2xl p-2.5 text-center">
            <div className="text-sm font-black text-white">{bmr || '—'}</div>
            <div className="text-[8px] text-white/40 uppercase font-bold tracking-wider">BMR kcal</div>
          </div>
          <div className="bg-black/20 rounded-2xl p-2.5 text-center">
            <div className="text-sm font-black text-white">{tdee || '—'}</div>
            <div className="text-[8px] text-white/40 uppercase font-bold tracking-wider">TDEE kcal</div>
          </div>
          <div className="bg-black/20 rounded-2xl p-2.5 text-center border border-indigo-500/30">
            <div className="text-sm font-black text-indigo-300">{goalCalories || '—'}</div>
            <div className="text-[8px] text-indigo-300/60 uppercase font-bold tracking-wider">Goal kcal</div>
          </div>
        </div>

        {/* Suggested macros preview */}
        <div className="flex items-center justify-between bg-black/20 rounded-2xl px-3 py-2.5 mb-3 text-center">
          <div><div className="text-xs font-black text-sky-300">{calcProtein}g</div><div className="text-[8px] text-white/40 uppercase font-bold">Protein</div></div>
          <div className="w-px h-6 bg-white/10" />
          <div><div className="text-xs font-black text-emerald-300">{calcCarbs}g</div><div className="text-[8px] text-white/40 uppercase font-bold">Carbs</div></div>
          <div className="w-px h-6 bg-white/10" />
          <div><div className="text-xs font-black text-pink-300">{calcFat}g</div><div className="text-[8px] text-white/40 uppercase font-bold">Fat</div></div>
          <div className="w-px h-6 bg-white/10" />
          <div><div className="text-xs font-black text-cyan-300">{(suggestedWater / 1000).toFixed(1)}L</div><div className="text-[8px] text-white/40 uppercase font-bold">Water</div></div>
        </div>

        <button onClick={applyCalculation}
          className={`w-full py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-[0.98] ${
            justCalculated
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/30'
          }`}>
          {justCalculated ? <><Check size={14} /> Targets Applied</> : <><Sparkles size={14} /> Apply These Targets</>}
        </button>
      </div>

      {/* --- DAILY TARGETS (manual override) --- */}
      <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-3xl p-4 space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-orange-500/10 rounded-lg text-orange-400"><Flame size={15} /></div>
          <h3 className="text-xs font-bold text-white">Daily Targets</h3>
          <span className="text-[9px] text-white/30 ml-auto">fine-tune manually</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="flex items-center gap-1.5 text-orange-400 text-[9px] font-bold mb-1 uppercase tracking-wider">
              <Flame size={11} /> Calories
            </label>
            <input type="number" value={formData.targets.calories || ''} onChange={(e) => handleChange(e, 'calories', true)} className={inputCls} />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-cyan-400 text-[9px] font-bold mb-1 uppercase tracking-wider">
              <Droplets size={11} /> Water (ml)
            </label>
            <input type="number" value={formData.waterTarget || ''} onChange={(e) => handleChange(e, 'waterTarget')} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-sky-400 text-[9px] font-bold mb-1 uppercase tracking-wider">Protein (g)</label>
            <input type="number" value={formData.targets.protein || ''} onChange={(e) => handleChange(e, 'protein', true)} className={inputCls + " text-center"} />
          </div>
          <div>
            <label className="block text-emerald-400 text-[9px] font-bold mb-1 uppercase tracking-wider">Carbs (g)</label>
            <input type="number" value={formData.targets.carbs || ''} onChange={(e) => handleChange(e, 'carbs', true)} className={inputCls + " text-center"} />
          </div>
          <div>
            <label className="block text-pink-400 text-[9px] font-bold mb-1 uppercase tracking-wider">Fat (g)</label>
            <input type="number" value={formData.targets.fat || ''} onChange={(e) => handleChange(e, 'fat', true)} className={inputCls + " text-center"} />
          </div>
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-teal-400 text-[9px] font-bold mb-1 uppercase tracking-wider">
            <Clock size={11} /> Default Rest Timer (seconds)
          </label>
          <div className="grid grid-cols-5 gap-2">
            {[30, 60, 90, 120, 180].map(s => (
              <button key={s} onClick={() => setFormData({ ...formData, defaultRestTimer: s })}
                className={`py-2 rounded-xl text-xs font-bold transition-all active:scale-95 border ${
                  formData.defaultRestTimer === s
                    ? 'bg-teal-500/20 border-teal-500/50 text-teal-300'
                    : 'bg-white/[0.03] border-white/5 text-white/40 hover:text-white/70'
                }`}>{s}s</button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        className={`w-full py-3.5 rounded-2xl font-bold flex justify-center items-center gap-2 transition-all shadow-lg text-sm active:scale-[0.98] ${
          saved ? 'bg-emerald-600 text-white shadow-emerald-900/20' : 'bg-gradient-to-r from-teal-600 to-indigo-600 hover:brightness-110 text-white shadow-indigo-900/30'
        }`}
      >
        <Save size={16} />
        {saved ? 'Saved Successfully' : 'Save All Changes'}
      </button>
    </div>
  );
};
