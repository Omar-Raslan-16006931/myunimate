import React, { useState, useRef } from 'react';
import { FoodItem, GymSettings, WaterLog } from '../../types';
import { analyzeFoodImage, analyzeFoodText } from '../../services/geminiService';
import { Camera, Send, Loader2, Image as ImageIcon, Droplets, X, Check, PenTool, AlertCircle, Pencil, Trash2, UtensilsCrossed, Apple } from 'lucide-react';

interface NutritionLoggerProps {
  logs: FoodItem[];
  waterLogs: WaterLog[];
  addLog: (item: FoodItem) => void;
  updateLog: (item: FoodItem) => void;
  deleteLog: (id: string) => void;
  addWater: (amount: number) => void;
  settings: GymSettings;
}

export const GymNutritionLogger: React.FC<NutritionLoggerProps> = ({ logs, waterLogs, addLog, updateLog, deleteLog, addWater, settings }) => {
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [showCustomWater, setShowCustomWater] = useState(false);
  const [customAmount, setCustomAmount] = useState('');

  const [showManualEntry, setShowManualEntry] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [manualFood, setManualFood] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '' });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await analyzeFoodText(inputText);
      addLog({
        id: Date.now().toString(),
        timestamp: Date.now(),
        ...result
      });
      setInputText('');
    } catch (err) {
      setError('Failed to analyze text. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setError(null);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          const result = await analyzeFoodImage(base64);
          addLog({
            id: Date.now().toString(),
            timestamp: Date.now(),
            imageUri: base64,
            ...result
          });
        } catch (err) {
          setError('Failed to analyze image.');
          setIsAnalyzing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Error reading file.');
      setIsAnalyzing(false);
    }
  };

  const handleCustomWaterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(customAmount);
    if (amount && amount > 0) {
      addWater(amount);
      setCustomAmount('');
      setShowCustomWater(false);
    }
  };

  const openEditModal = (item: FoodItem) => {
    setEditingId(item.id);
    setManualFood({
      name: item.name,
      calories: item.calories.toString(),
      protein: item.protein.toString(),
      carbs: item.carbs.toString(),
      fat: item.fat.toString()
    });
    setShowManualEntry(true);
  };

  const openAddModal = () => {
    setEditingId(null);
    setManualFood({ name: '', calories: '', protein: '', carbs: '', fat: '' });
    setShowManualEntry(true);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!manualFood.name || !manualFood.calories) return;

      const itemData = {
          name: manualFood.name,
          calories: Number(manualFood.calories),
          protein: Number(manualFood.protein) || 0,
          carbs: Number(manualFood.carbs) || 0,
          fat: Number(manualFood.fat) || 0
      };

      if (editingId) {
          const original = logs.find(l => l.id === editingId);
          if (original) {
              updateLog({
                  ...original,
                  ...itemData
              });
          }
      } else {
          addLog({
              id: Date.now().toString(),
              timestamp: Date.now(),
              ...itemData
          });
      }

      setManualFood({ name: '', calories: '', protein: '', carbs: '', fat: '' });
      setEditingId(null);
      setShowManualEntry(false);
  };

  const totalMacros = logs.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
  
  const currentWater = waterLogs.reduce((acc, log) => acc + log.amount, 0);
  const waterPercentage = Math.min((currentWater / settings.waterTarget) * 100, 100);
  
  const remainingCalories = settings.targets.calories - totalMacros.calories;
  const leftP = settings.targets.protein - totalMacros.protein;
  const leftC = settings.targets.carbs - totalMacros.carbs;
  const leftF = settings.targets.fat - totalMacros.fat;

  return (
    <div className="pb-24 space-y-4 relative">
      {showManualEntry && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-slate-800 w-full max-w-sm rounded-2xl p-6 border border-slate-700 shadow-2xl animate-in slide-in-from-bottom-10">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-white">{editingId ? 'Edit Food' : 'Manual Food Entry'}</h3>
                      <button onClick={() => setShowManualEntry(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
                  </div>
                  <form onSubmit={handleManualSubmit} className="space-y-3">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Food Name</label>
                          <input 
                            type="text" 
                            autoFocus
                            placeholder="e.g. Chicken Rice Bowl"
                            value={manualFood.name}
                            onChange={e => setManualFood({...manualFood, name: e.target.value})}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:border-indigo-500 outline-none text-sm"
                            required
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                           <div>
                              <label className="block text-xs font-bold text-orange-400 uppercase mb-1">Calories</label>
                              <input 
                                type="number" 
                                placeholder="0"
                                value={manualFood.calories}
                                onChange={e => setManualFood({...manualFood, calories: e.target.value})}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:border-orange-500 outline-none text-sm"
                                required
                              />
                           </div>
                           <div>
                              <label className="block text-xs font-bold text-indigo-400 uppercase mb-1">Protein (g)</label>
                              <input 
                                type="number" 
                                placeholder="0"
                                value={manualFood.protein}
                                onChange={e => setManualFood({...manualFood, protein: e.target.value})}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:border-indigo-500 outline-none text-sm"
                              />
                           </div>
                           <div>
                              <label className="block text-xs font-bold text-emerald-400 uppercase mb-1">Carbs (g)</label>
                              <input 
                                type="number" 
                                placeholder="0"
                                value={manualFood.carbs}
                                onChange={e => setManualFood({...manualFood, carbs: e.target.value})}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:border-emerald-500 outline-none text-sm"
                              />
                           </div>
                           <div>
                              <label className="block text-xs font-bold text-pink-400 uppercase mb-1">Fat (g)</label>
                              <input 
                                type="number" 
                                placeholder="0"
                                value={manualFood.fat}
                                onChange={e => setManualFood({...manualFood, fat: e.target.value})}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:border-pink-500 outline-none text-sm"
                              />
                           </div>
                      </div>
                      <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl mt-2 transition text-sm">
                          {editingId ? 'Update Food' : 'Add Food'}
                      </button>
                  </form>
              </div>
          </div>
      )}

      <header className="mb-4">
        <div className="flex justify-between items-start mb-2">
            <div>
              <h2 className="text-xl font-bold text-white">Nutrition</h2>
              <p className="text-slate-400 text-xs">Track your fuel</p>
            </div>
            <div className="text-right">
              <span className={`text-2xl font-bold ${remainingCalories < 0 ? 'text-red-500' : 'text-indigo-400'}`}>{totalMacros.calories}</span>
              <span className="text-[10px] text-slate-500 block"> / {settings.targets.calories} kcal</span>
              <span className={`text-[10px] font-bold block mt-0.5 ${remainingCalories >= 0 ? 'text-emerald-400' : 'text-red-400 flex items-center justify-end gap-1'}`}>
                  {remainingCalories >= 0 ? (
                      `${remainingCalories} Remaining` 
                  ) : (
                      <><AlertCircle size={10} /> {Math.abs(remainingCalories)} Over</>
                  )}
              </span>
            </div>
        </div>
        
        <div className="flex gap-2 mt-3">
            <div className={`flex-1 bg-slate-800 rounded-lg p-1.5 text-center border ${leftP < 0 ? 'border-red-500/50' : 'border-slate-700/50'}`}>
                <div className="text-[9px] text-slate-400 uppercase font-bold">Protein</div>
                <div className={`${leftP < 0 ? 'text-red-400' : 'text-indigo-300'} font-bold text-xs`}>
                    {leftP < 0 ? `${Math.abs(leftP)}g over` : `${leftP}g left`}
                </div>
            </div>
            <div className={`flex-1 bg-slate-800 rounded-lg p-1.5 text-center border ${leftC < 0 ? 'border-red-500/50' : 'border-slate-700/50'}`}>
                <div className="text-[9px] text-slate-400 uppercase font-bold">Carbs</div>
                <div className={`${leftC < 0 ? 'text-red-400' : 'text-emerald-300'} font-bold text-xs`}>
                    {leftC < 0 ? `${Math.abs(leftC)}g over` : `${leftC}g left`}
                </div>
            </div>
            <div className={`flex-1 bg-slate-800 rounded-lg p-1.5 text-center border ${leftF < 0 ? 'border-red-500/50' : 'border-slate-700/50'}`}>
                <div className="text-[9px] text-slate-400 uppercase font-bold">Fat</div>
                <div className={`${leftF < 0 ? 'text-red-400' : 'text-pink-300'} font-bold text-xs`}>
                    {leftF < 0 ? `${Math.abs(leftF)}g over` : `${leftF}g left`}
                </div>
            </div>
        </div>
      </header>

      <div className="bg-sky-900/20 rounded-xl p-4 border border-sky-800/50 relative overflow-hidden">
        <div className="flex justify-between items-center mb-3 relative z-10">
           <div className="flex items-center gap-2">
             <div className="p-1.5 bg-sky-500/20 rounded-lg">
               <Droplets className="text-sky-400" size={16} />
             </div>
             <div>
               <h3 className="text-sky-100 font-bold text-sm">Water Intake</h3>
               <p className="text-sky-300/70 text-[10px]">{currentWater}ml / {settings.waterTarget}ml</p>
             </div>
           </div>
           <span className="text-lg font-bold text-sky-400">{Math.round(waterPercentage)}%</span>
        </div>
        
        <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden mb-3 relative z-10">
          <div 
             className="h-full bg-sky-500 transition-all duration-500" 
             style={{ width: `${waterPercentage}%` }}
          ></div>
        </div>

        {!showCustomWater ? (
          <div className="flex gap-2 relative z-10">
            <button onClick={() => addWater(250)} className="flex-1 py-1.5 bg-sky-800/40 hover:bg-sky-700/50 text-sky-200 text-xs font-medium rounded-lg border border-sky-700/50 transition active:scale-95">
              + 250ml
            </button>
            <button onClick={() => addWater(500)} className="flex-1 py-1.5 bg-sky-800/40 hover:bg-sky-700/50 text-sky-200 text-xs font-medium rounded-lg border border-sky-700/50 transition active:scale-95">
              + 500ml
            </button>
            <button onClick={() => setShowCustomWater(true)} className="px-3 py-1.5 bg-sky-900/40 hover:bg-sky-800/50 text-sky-300 text-xs font-medium rounded-lg border border-sky-800/50 transition active:scale-95">
              Other...
            </button>
          </div>
        ) : (
          <form onSubmit={handleCustomWaterSubmit} className="flex gap-2 relative z-10 animate-in fade-in slide-in-from-bottom-1 duration-200">
             <input 
               type="number" 
               autoFocus
               placeholder="Amount (ml)"
               value={customAmount}
               onChange={(e) => setCustomAmount(e.target.value)}
               className="flex-1 bg-slate-900/80 border border-sky-700/50 rounded-lg px-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 text-sm"
             />
             <button type="submit" className="p-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition">
               <Check size={16} />
             </button>
             <button type="button" onClick={() => setShowCustomWater(false)} className="p-1.5 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg transition">
               <X size={16} />
             </button>
          </form>
        )}
      </div>

      <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 shadow-lg">
        <form onSubmit={handleTextSubmit} className="space-y-3">
          <div className="relative">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="e.g., 2 eggs and toast..."
              className="w-full bg-slate-900 text-white rounded-lg pl-3 pr-10 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-500 text-sm"
              disabled={isAnalyzing}
            />
            <button
              type="submit"
              disabled={!inputText || isAnalyzing}
              className="absolute right-1.5 top-1.5 p-1 bg-indigo-600 rounded-md text-white disabled:opacity-50 hover:bg-indigo-500 transition"
            >
              {isAnalyzing ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[10px] uppercase tracking-wide font-semibold">Or use AI Camera</span>
            <div className="h-px bg-slate-700 flex-1"></div>
          </div>

          <div className="grid grid-cols-3 gap-2">
             <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isAnalyzing}
              className="col-span-1 flex flex-col items-center justify-center gap-1 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-[10px] font-medium transition disabled:opacity-50"
            >
              <Camera size={16} className="text-indigo-400" />
              <span>Snap</span>
            </button>
             <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
             <button
              type="button"
              className="col-span-1 flex flex-col items-center justify-center gap-1 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-[10px] font-medium transition opacity-50 cursor-not-allowed"
            >
              <ImageIcon size={16} className="text-emerald-400" />
              <span>Gallery</span>
            </button>
             <button
              type="button"
              onClick={openAddModal}
              disabled={isAnalyzing}
              className="col-span-1 flex flex-col items-center justify-center gap-1 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-[10px] font-medium transition disabled:opacity-50"
            >
              <PenTool size={16} className="text-pink-400" />
              <span>Manual</span>
            </button>
          </div>
        </form>
        {error && <p className="text-red-400 text-xs mt-2 text-center">{error}</p>}
      </div>

      <div className="space-y-3">
        <h3 className="text-base font-semibold text-slate-200">Today's Meals</h3>
        {logs.length === 0 ? (
          <div className="text-center py-8 text-slate-500 bg-slate-800/50 rounded-xl border border-dashed border-slate-700 text-sm">
            <Apple size={32} className="mx-auto text-slate-600 mb-2" />
            <p className="mt-1">No meals logged yet today.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.slice().reverse().map((item) => (
              <div key={item.id} className="bg-slate-800 rounded-xl p-3 flex gap-3 items-center border border-slate-700 group">
                {item.imageUri ? (
                  <img src={item.imageUri} alt={item.name} className="w-12 h-12 rounded-lg object-cover bg-slate-900" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
                    <UtensilsCrossed size={20} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-white truncate text-sm">{item.name}</h4>
                  <div className="flex gap-2 mt-0.5 text-[10px] text-slate-400">
                    <span className="text-indigo-300 font-bold">{item.calories} kcal</span>
                    <span>P: {item.protein}g</span>
                    <span>C: {item.carbs}g</span>
                    <span>F: {item.fat}g</span>
                  </div>
                </div>
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                        onClick={() => openEditModal(item)}
                        className="p-1.5 bg-slate-700 rounded-lg text-slate-300 hover:text-white hover:bg-slate-600"
                    >
                        <Pencil size={14} />
                    </button>
                    <button 
                        onClick={() => deleteLog(item.id)}
                        className="p-1.5 bg-slate-700 rounded-lg text-slate-300 hover:text-red-400 hover:bg-slate-600"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};