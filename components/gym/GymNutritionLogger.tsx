import React, { useState, useRef } from 'react';
import { FoodItem, GymSettings, WaterLog } from '../../types';
import { analyzeFoodImage, analyzeFoodText } from '../../services/geminiService';
import { Camera, Send, Loader2, Image as ImageIcon, Droplets, X, Check, PenTool, AlertCircle, Pencil, Trash2, UtensilsCrossed, Apple, Sparkles } from 'lucide-react';

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

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

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
    e.target.value = ''; // allow re-selecting the same file
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
        } finally {
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
              updateLog({ ...original, ...itemData });
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

  const macroChips = [
    { label: 'Protein', left: leftP, color: 'text-sky-300' },
    { label: 'Carbs', left: leftC, color: 'text-emerald-300' },
    { label: 'Fat', left: leftF, color: 'text-pink-300' },
  ];

  return (
    <div className="pb-24 space-y-4 relative">
      {showManualEntry && (
          <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-[#1c1c1e] border border-white/10 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-white">{editingId ? 'Edit Food' : 'Manual Food Entry'}</h3>
                      <button onClick={() => setShowManualEntry(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition"><X size={16} /></button>
                  </div>
                  <form onSubmit={handleManualSubmit} className="space-y-3">
                      <div>
                          <label className="block text-[9px] font-bold text-white/40 uppercase tracking-wider mb-1">Food Name</label>
                          <input
                            type="text"
                            autoFocus
                            placeholder="e.g. Chicken Rice Bowl"
                            value={manualFood.name}
                            onChange={e => setManualFood({...manualFood, name: e.target.value})}
                            className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white focus:border-indigo-500/60 outline-none text-sm transition placeholder:text-white/20"
                            required
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                           <div>
                              <label className="block text-[9px] font-bold text-orange-400 uppercase tracking-wider mb-1">Calories</label>
                              <input
                                type="number"
                                placeholder="0"
                                value={manualFood.calories}
                                onChange={e => setManualFood({...manualFood, calories: e.target.value})}
                                className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white focus:border-orange-500/60 outline-none text-sm transition placeholder:text-white/20"
                                required
                              />
                           </div>
                           <div>
                              <label className="block text-[9px] font-bold text-sky-400 uppercase tracking-wider mb-1">Protein (g)</label>
                              <input
                                type="number"
                                placeholder="0"
                                value={manualFood.protein}
                                onChange={e => setManualFood({...manualFood, protein: e.target.value})}
                                className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white focus:border-sky-500/60 outline-none text-sm transition placeholder:text-white/20"
                              />
                           </div>
                           <div>
                              <label className="block text-[9px] font-bold text-emerald-400 uppercase tracking-wider mb-1">Carbs (g)</label>
                              <input
                                type="number"
                                placeholder="0"
                                value={manualFood.carbs}
                                onChange={e => setManualFood({...manualFood, carbs: e.target.value})}
                                className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white focus:border-emerald-500/60 outline-none text-sm transition placeholder:text-white/20"
                              />
                           </div>
                           <div>
                              <label className="block text-[9px] font-bold text-pink-400 uppercase tracking-wider mb-1">Fat (g)</label>
                              <input
                                type="number"
                                placeholder="0"
                                value={manualFood.fat}
                                onChange={e => setManualFood({...manualFood, fat: e.target.value})}
                                className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white focus:border-pink-500/60 outline-none text-sm transition placeholder:text-white/20"
                              />
                           </div>
                      </div>
                      <button type="submit" className="w-full py-3.5 bg-gradient-to-r from-teal-600 to-indigo-600 hover:brightness-110 text-white font-bold rounded-2xl mt-2 transition text-sm shadow-lg shadow-indigo-900/30 active:scale-[0.98]">
                          {editingId ? 'Update Food' : 'Add Food'}
                      </button>
                  </form>
              </div>
          </div>
      )}

      <header className="pt-2">
        <div className="flex justify-between items-start mb-3">
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Nutrition</h1>
              <p className="text-white/40 text-xs mt-0.5">Track your fuel</p>
            </div>
            <div className="text-right">
              <span className={`text-2xl font-black ${remainingCalories < 0 ? 'text-rose-400' : 'text-white'} animate-count`}>{Math.round(totalMacros.calories)}</span>
              <span className="text-[10px] text-white/40 block"> / {settings.targets.calories} kcal</span>
              <span className={`text-[10px] font-bold block mt-0.5 ${remainingCalories >= 0 ? 'text-emerald-400' : 'text-rose-400 flex items-center justify-end gap-1'}`}>
                  {remainingCalories >= 0 ? (
                      `${Math.round(remainingCalories)} Remaining`
                  ) : (
                      <><AlertCircle size={10} /> {Math.abs(Math.round(remainingCalories))} Over</>
                  )}
              </span>
            </div>
        </div>

        <div className="flex gap-2">
            {macroChips.map(m => (
                <div key={m.label} className={`flex-1 bg-white/[0.03] rounded-xl p-2 text-center border ${m.left < 0 ? 'border-rose-500/40' : 'border-white/5'}`}>
                    <div className="text-[9px] text-white/35 uppercase font-bold tracking-wider">{m.label}</div>
                    <div className={`${m.left < 0 ? 'text-rose-400' : m.color} font-bold text-xs`}>
                        {m.left < 0 ? `${Math.abs(Math.round(m.left))}g over` : `${Math.round(m.left)}g left`}
                    </div>
                </div>
            ))}
        </div>
      </header>

      {/* WATER */}
      <div className="bg-gradient-to-br from-sky-950/60 to-cyan-950/30 rounded-3xl p-4 border border-sky-500/15 relative overflow-hidden">
        <div className="absolute -bottom-12 -right-8 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex justify-between items-center mb-3 relative z-10">
           <div className="flex items-center gap-2">
             <div className="p-1.5 bg-sky-500/15 rounded-lg">
               <Droplets className="text-sky-400" size={16} />
             </div>
             <div>
               <h3 className="text-white font-bold text-sm">Water Intake</h3>
               <p className="text-sky-300/60 text-[10px]">{currentWater}ml / {settings.waterTarget}ml</p>
             </div>
           </div>
           <span className="text-lg font-black text-sky-400 animate-count">{Math.round(waterPercentage)}%</span>
        </div>

        <div className="w-full bg-black/30 h-2.5 rounded-full overflow-hidden mb-3 relative z-10 border border-white/5">
          <div
             className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all duration-700 ease-out rounded-full"
             style={{ width: `${waterPercentage}%` }}
          ></div>
        </div>

        {!showCustomWater ? (
          <div className="flex gap-2 relative z-10">
            <button onClick={() => addWater(250)} className="flex-1 py-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-200 text-xs font-bold rounded-xl border border-sky-500/20 transition active:scale-95">
              + 250ml
            </button>
            <button onClick={() => addWater(500)} className="flex-1 py-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-200 text-xs font-bold rounded-xl border border-sky-500/20 transition active:scale-95">
              + 500ml
            </button>
            <button onClick={() => setShowCustomWater(true)} className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white/50 text-xs font-bold rounded-xl border border-white/5 transition active:scale-95">
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
               className="flex-1 bg-black/40 border border-sky-500/30 rounded-xl px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:border-sky-400 text-sm transition"
             />
             <button type="submit" className="p-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl transition active:scale-95">
               <Check size={16} />
             </button>
             <button type="button" onClick={() => setShowCustomWater(false)} className="p-2 bg-white/5 hover:bg-white/10 text-white/50 rounded-xl transition active:scale-95">
               <X size={16} />
             </button>
          </form>
        )}
      </div>

      {/* AI LOGGING */}
      <div className="bg-white/[0.03] backdrop-blur-md p-4 rounded-3xl border border-white/5">
        <form onSubmit={handleTextSubmit} className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={13} className="text-teal-400" />
            <span className="text-white/60 text-[10px] uppercase tracking-wide font-bold">AI Food Logging</span>
          </div>
          <div className="relative">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="e.g., 2 eggs and toast..."
              className="w-full bg-black/30 text-white rounded-2xl pl-4 pr-12 py-3 border border-white/10 focus:border-teal-500/60 focus:outline-none placeholder-white/25 text-sm transition"
              disabled={isAnalyzing}
            />
            <button
              type="submit"
              disabled={!inputText || isAnalyzing}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-teal-600 rounded-xl text-white disabled:opacity-40 hover:bg-teal-500 transition active:scale-90"
            >
              {isAnalyzing ? <Loader2 className="animate-spin" size={15} /> : <Send size={15} />}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
             <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isAnalyzing}
              className="flex flex-col items-center justify-center gap-1.5 py-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 rounded-2xl text-[10px] font-bold text-white/70 transition disabled:opacity-50 active:scale-95"
            >
              <Camera size={17} className="text-indigo-400" />
              <span>Camera</span>
            </button>
             <input
              type="file"
              ref={cameraInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              capture="environment"
              className="hidden"
            />
             <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              disabled={isAnalyzing}
              className="flex flex-col items-center justify-center gap-1.5 py-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 rounded-2xl text-[10px] font-bold text-white/70 transition disabled:opacity-50 active:scale-95"
            >
              <ImageIcon size={17} className="text-emerald-400" />
              <span>Gallery</span>
            </button>
             <input
              type="file"
              ref={galleryInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
             <button
              type="button"
              onClick={openAddModal}
              disabled={isAnalyzing}
              className="flex flex-col items-center justify-center gap-1.5 py-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 rounded-2xl text-[10px] font-bold text-white/70 transition disabled:opacity-50 active:scale-95"
            >
              <PenTool size={17} className="text-pink-400" />
              <span>Manual</span>
            </button>
          </div>
        </form>
        {isAnalyzing && (
          <div className="flex items-center justify-center gap-2 mt-3 text-teal-300 text-xs animate-in fade-in">
            <Loader2 className="animate-spin" size={13} /> Analyzing nutrition...
          </div>
        )}
        {error && <p className="text-rose-400 text-xs mt-2 text-center animate-in fade-in slide-in-from-top-1">{error}</p>}
      </div>

      {/* MEALS */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest px-1">Today's Meals</h3>
        {logs.length === 0 ? (
          <div className="text-center py-10 text-white/35 bg-white/[0.02] rounded-3xl border border-dashed border-white/10 text-sm">
            <Apple size={32} className="mx-auto text-white/15 mb-2" />
            <p className="mt-1">No meals logged yet today.</p>
          </div>
        ) : (
          <div className="space-y-2 stagger-children">
            {logs.slice().reverse().map((item) => (
              <div key={item.id} className="bg-white/[0.03] rounded-2xl p-3 flex gap-3 items-center border border-white/5 group hover:bg-white/[0.05] transition">
                {item.imageUri ? (
                  <img src={item.imageUri} alt={item.name} className="w-12 h-12 rounded-xl object-cover bg-black/30" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/15 flex items-center justify-center text-indigo-400 flex-shrink-0">
                    <UtensilsCrossed size={20} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-white truncate text-sm">{item.name}</h4>
                  <div className="flex gap-2 mt-0.5 text-[10px] text-white/40">
                    <span className="text-orange-300 font-bold">{item.calories} kcal</span>
                    <span>P: {item.protein}g</span>
                    <span>C: {item.carbs}g</span>
                    <span>F: {item.fat}g</span>
                  </div>
                </div>
                <div className="flex gap-1.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => openEditModal(item)}
                        className="p-2 bg-white/5 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition"
                    >
                        <Pencil size={13} />
                    </button>
                    <button
                        onClick={() => deleteLog(item.id)}
                        className="p-2 bg-white/5 rounded-xl text-white/40 hover:text-rose-400 hover:bg-white/10 transition"
                    >
                        <Trash2 size={13} />
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
