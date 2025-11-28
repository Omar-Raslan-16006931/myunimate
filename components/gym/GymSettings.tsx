import React, { useState } from 'react';
import { GymSettings, ActivityLevel } from '../../types';
import { Save, Calculator, Droplets, Flame, User } from 'lucide-react';

interface SettingsProps {
  settings: GymSettings;
  updateSettings: (newSettings: GymSettings) => void;
}

export const GymSettingsComponent: React.FC<SettingsProps> = ({ settings, updateSettings }) => {
  const [formData, setFormData] = useState(settings);
  const [saved, setSaved] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, field: string, isTarget = false) => {
    const value = e.target.value;
    
    if (isTarget) {
        setFormData({
            ...formData,
            targets: {
                ...formData.targets,
                [field]: Number(value)
            }
        });
    } else {
        setFormData({
            ...formData,
            [field]: (field === 'name' || field === 'gender' || field === 'activityLevel') ? value : Number(value)
        });
    }
  };

  const calculateMacros = () => {
    // Mifflin-St Jeor Equation
    const { weight, height, age, gender, activityLevel } = formData;
    
    let bmr = (10 * weight) + (6.25 * height) - (5 * age);
    bmr += gender === 'male' ? 5 : -161;

    const activityMultipliers: Record<ActivityLevel, number> = {
        'sedentary': 1.2,
        'light': 1.375,
        'moderate': 1.55,
        'active': 1.725,
        'very_active': 1.9
    };

    const tdee = Math.round(bmr * activityMultipliers[activityLevel]);

    // Standard Gym Split (approx)
    const protein = Math.round(weight * 2);
    const fat = Math.round(weight * 0.8);
    const proteinCals = protein * 4;
    const fatCals = fat * 9;
    const remainingCals = tdee - (proteinCals + fatCals);
    const carbs = Math.max(0, Math.round(remainingCals / 4));

    setFormData({
        ...formData,
        targets: {
            calories: tdee,
            protein,
            fat,
            carbs
        }
    });
  };

  const handleSave = () => {
    updateSettings(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="pb-24 space-y-4">
      <header>
          <h2 className="text-xl font-bold text-white mb-0.5">Settings</h2>
          <p className="text-slate-400 text-xs">Manage your goals and profile</p>
      </header>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        
        <div className="p-4 border-b border-slate-700/50">
            <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">Display Name</label>
            <div className="relative">
                <User className="absolute left-3 top-2.5 text-slate-500" size={16} />
                <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => handleChange(e, 'name')}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
            </div>
        </div>

        <div className="p-4">
            <h3 className="text-base font-bold text-white mb-4">Daily Targets</h3>
            
            <div className="space-y-4">
                <div>
                    <label className="flex items-center gap-2 text-sky-400 text-xs font-bold mb-1.5">
                        <Droplets size={14} className="fill-sky-400/20" /> 
                        Water Target (ml)
                    </label>
                    <input 
                        type="number" 
                        value={formData.waterTarget}
                        onChange={(e) => handleChange(e, 'waterTarget')}
                        className="w-full bg-slate-900 border border-sky-900/50 rounded-lg p-3 text-base font-bold text-white focus:ring-2 focus:ring-sky-500 outline-none"
                    />
                </div>

                <div>
                    <label className="flex items-center gap-2 text-orange-400 text-xs font-bold mb-1.5">
                        <Flame size={14} className="fill-orange-400/20" /> 
                        Calorie Goal (kcal)
                    </label>
                    <input 
                        type="number" 
                        value={formData.targets.calories}
                        onChange={(e) => handleChange(e, 'calories', true)}
                        className="w-full bg-slate-900 border border-orange-900/50 rounded-lg p-3 text-base font-bold text-white focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <div>
                        <label className="block text-indigo-400 text-[10px] font-bold mb-1">Protein (g)</label>
                        <input 
                            type="number" 
                            value={formData.targets.protein}
                            onChange={(e) => handleChange(e, 'protein', true)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:ring-1 focus:ring-indigo-500 outline-none text-center text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-emerald-400 text-[10px] font-bold mb-1">Carbs (g)</label>
                        <input 
                            type="number" 
                            value={formData.targets.carbs}
                            onChange={(e) => handleChange(e, 'carbs', true)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:ring-1 focus:ring-emerald-500 outline-none text-center text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-pink-400 text-[10px] font-bold mb-1">Fat (g)</label>
                        <input 
                            type="number" 
                            value={formData.targets.fat}
                            onChange={(e) => handleChange(e, 'fat', true)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:ring-1 focus:ring-pink-500 outline-none text-center text-sm"
                        />
                    </div>
                </div>
            </div>

            <div className="mt-6 bg-slate-900/60 rounded-xl p-3 border border-dashed border-slate-700">
                <div className="flex items-center gap-2 mb-3 text-slate-300">
                    <div className="p-1 bg-indigo-500/20 rounded-md text-indigo-400">
                        <Calculator size={14} />
                    </div>
                    <span className="font-bold text-xs">Macro Calculator</span>
                    <span className="text-[10px] text-slate-500 ml-auto font-normal">Auto-fill targets</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                        <label className="block text-slate-500 text-[9px] uppercase font-bold mb-1">Gender</label>
                        <select 
                            value={formData.gender}
                            onChange={(e) => handleChange(e, 'gender')}
                            className="w-full bg-slate-800 border border-slate-700 rounded-md p-1.5 text-xs text-white focus:outline-none"
                        >
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-slate-500 text-[9px] uppercase font-bold mb-1">Age</label>
                        <input 
                            type="number" 
                            value={formData.age}
                            onChange={(e) => handleChange(e, 'age')}
                            className="w-full bg-slate-800 border border-slate-700 rounded-md p-1.5 text-xs text-white focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-slate-500 text-[9px] uppercase font-bold mb-1">Height (cm)</label>
                        <input 
                            type="number" 
                            value={formData.height}
                            onChange={(e) => handleChange(e, 'height')}
                            className="w-full bg-slate-800 border border-slate-700 rounded-md p-1.5 text-xs text-white focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-slate-500 text-[9px] uppercase font-bold mb-1">Weight (kg)</label>
                        <input 
                            type="number" 
                            value={formData.weight}
                            onChange={(e) => handleChange(e, 'weight')}
                            className="w-full bg-slate-800 border border-slate-700 rounded-md p-1.5 text-xs text-white focus:outline-none"
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-slate-500 text-[9px] uppercase font-bold mb-1">Activity</label>
                        <select 
                            value={formData.activityLevel}
                            onChange={(e) => handleChange(e, 'activityLevel')}
                            className="w-full bg-slate-800 border border-slate-700 rounded-md p-1.5 text-xs text-white focus:outline-none"
                        >
                            <option value="sedentary">Sedentary</option>
                            <option value="light">Lightly Active</option>
                            <option value="moderate">Moderately Active</option>
                            <option value="active">Active</option>
                            <option value="very_active">Very Active</option>
                        </select>
                    </div>
                </div>
                
                <button
                    onClick={calculateMacros}
                    className="w-full py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-2"
                >
                    Calculate & Set Targets
                </button>
            </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        className={`w-full py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-all shadow-lg text-sm ${
            saved ? 'bg-emerald-600 text-white shadow-emerald-900/20' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/20'
        }`}
      >
        <Save size={18} />
        {saved ? 'Saved Successfully' : 'Save All Changes'}
      </button>
    </div>
  );
};