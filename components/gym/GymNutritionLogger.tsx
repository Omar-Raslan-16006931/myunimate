import React, { useState, useRef } from 'react';
import { FoodItem, GymSettings, WaterLog } from '../../types';
import { analyzeFoodImage, analyzeFoodText } from '../../services/geminiService';
import { Camera, Send, Loader2, Image as ImageIcon, Droplets, X, Check, PenTool, AlertCircle, Pencil, Trash2, UtensilsCrossed, Apple, Sparkles } from 'lucide-react';

const INK = '#1A1730';
const CARD_BG = '#FAFAF6';
const HL_YELLOW = '#F6DF63';
const HL_GREEN = '#8CE3B7';
const HL_BLUE = '#9ECFFF';
const HL_ORANGE = '#F4BE8A';
const HL_PINK = '#eea8f2';
const HL_RED = '#E56A5A';

const card: React.CSSProperties = {
  background: CARD_BG,
  border: `1.5px solid ${INK}`,
  borderRadius: 10,
  boxShadow: `4px 5px 0 ${INK}`,
};

const inputStyle: React.CSSProperties = {
  background: `${INK}0a`,
  border: `1.5px solid ${INK}`,
  borderRadius: 8,
  padding: '10px 14px',
  color: INK,
  fontFamily: "'Instrument Sans', sans-serif",
  fontSize: '0.9rem',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: `${INK}80`,
  fontSize: 9,
  textTransform: 'uppercase',
  fontWeight: 700,
  marginBottom: 4,
  letterSpacing: '0.5px',
  fontFamily: "'Instrument Sans', sans-serif",
};

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
    { label: 'Protein', left: leftP, color: HL_BLUE },
    { label: 'Carbs', left: leftC, color: HL_GREEN },
    { label: 'Fat', left: leftF, color: HL_PINK },
  ];

  return (
    <div className="pb-24 space-y-4 relative">
      {/* Manual entry modal */}
      {showManualEntry && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16, background: `${INK}99` }} className="sm:items-center animate-in fade-in duration-200">
              <div style={{ background: CARD_BG, border: `1.5px solid ${INK}`, width: '100%', maxWidth: 400, borderRadius: 14, padding: 24, boxShadow: `8px 10px 0 ${INK}` }} className="animate-in slide-in-from-bottom-10">
                  <div className="flex justify-between items-center mb-4">
                      <h3 style={{ fontSize: 18, fontWeight: 700, color: INK, fontFamily: "'Bricolage Grotesque', sans-serif" }}>{editingId ? 'Edit Food' : 'Manual Food Entry'}</h3>
                      <button onClick={() => setShowManualEntry(false)} style={{ width: 32, height: 32, borderRadius: '50%', background: `${INK}10`, border: `1px solid ${INK}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: `${INK}80`, cursor: 'pointer' }}><X size={16} /></button>
                  </div>
                  <form onSubmit={handleManualSubmit} className="space-y-3">
                      <div>
                          <label style={labelStyle}>Food Name</label>
                          <input
                            type="text"
                            autoFocus
                            placeholder="e.g. Chicken Rice Bowl"
                            value={manualFood.name}
                            onChange={e => setManualFood({...manualFood, name: e.target.value})}
                            style={inputStyle}
                            required
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                           <div>
                              <label style={{ ...labelStyle, color: HL_ORANGE }}>Calories</label>
                              <input type="number" placeholder="0" value={manualFood.calories} onChange={e => setManualFood({...manualFood, calories: e.target.value})} style={inputStyle} required />
                           </div>
                           <div>
                              <label style={{ ...labelStyle, color: HL_BLUE }}>Protein (g)</label>
                              <input type="number" placeholder="0" value={manualFood.protein} onChange={e => setManualFood({...manualFood, protein: e.target.value})} style={inputStyle} />
                           </div>
                           <div>
                              <label style={{ ...labelStyle, color: HL_GREEN }}>Carbs (g)</label>
                              <input type="number" placeholder="0" value={manualFood.carbs} onChange={e => setManualFood({...manualFood, carbs: e.target.value})} style={inputStyle} />
                           </div>
                           <div>
                              <label style={{ ...labelStyle, color: HL_PINK }}>Fat (g)</label>
                              <input type="number" placeholder="0" value={manualFood.fat} onChange={e => setManualFood({...manualFood, fat: e.target.value})} style={inputStyle} />
                           </div>
                      </div>
                      <button type="submit" style={{
                          width: '100%', padding: '12px 0', background: INK, color: CARD_BG,
                          border: `1.5px solid ${INK}`, borderRadius: 10, fontWeight: 700, fontSize: 14,
                          cursor: 'pointer', boxShadow: `4px 4px 0 ${HL_YELLOW}`, fontFamily: "'Bricolage Grotesque', sans-serif",
                          marginTop: 8
                      }}>
                          {editingId ? 'Update Food' : 'Add Food'}
                      </button>
                  </form>
              </div>
          </div>
      )}

      {/* Header */}
      <header className="pt-2">
        <div className="flex justify-between items-start mb-3">
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: INK, fontFamily: "'Bricolage Grotesque', sans-serif" }}>Nutrition</h1>
              <p style={{ color: `${INK}60`, fontSize: 12, marginTop: 2, fontFamily: "'Instrument Sans', sans-serif" }}>Track your fuel</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 24, fontWeight: 900, color: remainingCalories < 0 ? HL_RED : INK, fontFamily: "'Bricolage Grotesque', sans-serif" }}>{Math.round(totalMacros.calories)}</span>
              <span style={{ fontSize: 10, color: `${INK}60`, display: 'block', fontFamily: "'Instrument Sans', sans-serif" }}>/ {settings.targets.calories} kcal</span>
              <span style={{ fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, color: remainingCalories >= 0 ? HL_GREEN : HL_RED, fontFamily: "'Instrument Sans', sans-serif" }}>
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
                <div key={m.label} style={{
                  flex: 1, background: `${m.color}50`, borderRadius: 10, padding: '8px 6px', textAlign: 'center',
                  border: `1.5px solid ${m.left < 0 ? HL_RED : INK}`,
                }}>
                    <div style={{ fontSize: 9, color: `${INK}70`, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', fontFamily: "'Instrument Sans', sans-serif" }}>{m.label}</div>
                    <div style={{ color: m.left < 0 ? HL_RED : INK, fontWeight: 700, fontSize: 12, fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                        {m.left < 0 ? `${Math.abs(Math.round(m.left))}g over` : `${Math.round(m.left)}g left`}
                    </div>
                </div>
            ))}
        </div>
      </header>

      {/* WATER */}
      <div style={{ ...card, padding: 16, background: `${HL_BLUE}50` }}>
        <div className="flex justify-between items-center mb-3">
           <div className="flex items-center gap-2">
             <div style={{ padding: 6, background: `${INK}10`, border: `1px solid ${INK}20`, borderRadius: 8 }}>
               <Droplets style={{ color: INK }} size={16} />
             </div>
             <div>
               <h3 style={{ color: INK, fontWeight: 700, fontSize: 14, fontFamily: "'Bricolage Grotesque', sans-serif" }}>Water Intake</h3>
               <p style={{ color: `${INK}70`, fontSize: 10, fontFamily: "'Instrument Sans', sans-serif" }}>{currentWater}ml / {settings.waterTarget}ml</p>
             </div>
           </div>
           <span style={{ fontSize: 18, fontWeight: 900, color: INK, fontFamily: "'Bricolage Grotesque', sans-serif" }}>{Math.round(waterPercentage)}%</span>
        </div>

        <div style={{ width: '100%', background: `${INK}20`, height: 10, borderRadius: 99, overflow: 'hidden', marginBottom: 12, border: `1px solid ${INK}30` }}>
          <div
             style={{ height: '100%', background: INK, transition: 'width 0.7s ease-out', borderRadius: 99, width: `${waterPercentage}%` }}
          ></div>
        </div>

        {!showCustomWater ? (
          <div className="flex gap-2">
            <button onClick={() => addWater(250)} style={{ flex: 1, padding: '8px 0', background: CARD_BG, color: INK, fontSize: 12, fontWeight: 700, borderRadius: 8, border: `1.5px solid ${INK}`, cursor: 'pointer', fontFamily: "'Instrument Sans', sans-serif" }}>
              + 250ml
            </button>
            <button onClick={() => addWater(500)} style={{ flex: 1, padding: '8px 0', background: CARD_BG, color: INK, fontSize: 12, fontWeight: 700, borderRadius: 8, border: `1.5px solid ${INK}`, cursor: 'pointer', fontFamily: "'Instrument Sans', sans-serif" }}>
              + 500ml
            </button>
            <button onClick={() => setShowCustomWater(true)} style={{ padding: '8px 12px', background: `${INK}10`, color: `${INK}80`, fontSize: 12, fontWeight: 700, borderRadius: 8, border: `1px solid ${INK}30`, cursor: 'pointer', fontFamily: "'Instrument Sans', sans-serif" }}>
              Other...
            </button>
          </div>
        ) : (
          <form onSubmit={handleCustomWaterSubmit} className="flex gap-2 animate-in fade-in slide-in-from-bottom-1 duration-200">
             <input
               type="number"
               autoFocus
               placeholder="Amount (ml)"
               value={customAmount}
               onChange={(e) => setCustomAmount(e.target.value)}
               style={{ ...inputStyle, flex: 1 }}
             />
             <button type="submit" style={{ padding: 8, background: INK, color: CARD_BG, borderRadius: 8, border: `1.5px solid ${INK}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <Check size={16} />
             </button>
             <button type="button" onClick={() => setShowCustomWater(false)} style={{ padding: 8, background: `${INK}10`, color: `${INK}80`, borderRadius: 8, border: `1px solid ${INK}30`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <X size={16} />
             </button>
          </form>
        )}
      </div>

      {/* AI LOGGING */}
      <div style={{ ...card, padding: 16 }}>
        <form onSubmit={handleTextSubmit} className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={13} style={{ color: INK }} />
            <span style={{ color: `${INK}80`, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, fontFamily: "'Instrument Sans', sans-serif" }}>AI Food Logging</span>
          </div>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="e.g., 2 eggs and toast..."
              style={{ ...inputStyle, paddingRight: 48 }}
              disabled={isAnalyzing}
            />
            <button
              type="submit"
              disabled={!inputText || isAnalyzing}
              style={{
                position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                padding: 8, background: INK, borderRadius: 8, color: CARD_BG,
                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: !inputText || isAnalyzing ? 0.4 : 1,
              }}
            >
              {isAnalyzing ? <Loader2 className="animate-spin" size={15} /> : <Send size={15} />}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
             <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isAnalyzing}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px 0', background: `${HL_BLUE}40`, border: `1.5px solid ${INK}`, borderRadius: 10, fontSize: 10, fontWeight: 700, color: INK, cursor: 'pointer', fontFamily: "'Instrument Sans', sans-serif", opacity: isAnalyzing ? 0.5 : 1 }}
            >
              <Camera size={17} style={{ color: INK }} />
              <span>Camera</span>
            </button>
             <input type="file" ref={cameraInputRef} onChange={handleImageUpload} accept="image/*" capture="environment" className="hidden" />
             <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              disabled={isAnalyzing}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px 0', background: `${HL_GREEN}40`, border: `1.5px solid ${INK}`, borderRadius: 10, fontSize: 10, fontWeight: 700, color: INK, cursor: 'pointer', fontFamily: "'Instrument Sans', sans-serif", opacity: isAnalyzing ? 0.5 : 1 }}
            >
              <ImageIcon size={17} style={{ color: INK }} />
              <span>Gallery</span>
            </button>
             <input type="file" ref={galleryInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
             <button
              type="button"
              onClick={openAddModal}
              disabled={isAnalyzing}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px 0', background: `${HL_PINK}40`, border: `1.5px solid ${INK}`, borderRadius: 10, fontSize: 10, fontWeight: 700, color: INK, cursor: 'pointer', fontFamily: "'Instrument Sans', sans-serif", opacity: isAnalyzing ? 0.5 : 1 }}
            >
              <PenTool size={17} style={{ color: INK }} />
              <span>Manual</span>
            </button>
          </div>
        </form>
        {isAnalyzing && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, color: INK, fontSize: 12, fontFamily: "'Instrument Sans', sans-serif" }} className="animate-in fade-in">
            <Loader2 className="animate-spin" size={13} /> Analyzing nutrition...
          </div>
        )}
        {error && <p style={{ color: HL_RED, fontSize: 12, marginTop: 8, textAlign: 'center' }} className="animate-in fade-in slide-in-from-top-1">{error}</p>}
      </div>

      {/* MEALS */}
      <div className="space-y-3">
        <h3 style={{ fontSize: 10, fontWeight: 700, color: `${INK}60`, textTransform: 'uppercase', letterSpacing: '1px', paddingLeft: 4, fontFamily: "'Instrument Sans', sans-serif" }}>Today's Meals</h3>
        {logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: `${INK}50`, background: `${INK}05`, borderRadius: 12, border: `1.5px dashed ${INK}30`, fontSize: 14 }}>
            <Apple size={32} style={{ margin: '0 auto 8px', color: `${INK}30` }} />
            <p style={{ marginTop: 4 }}>No meals logged yet today.</p>
          </div>
        ) : (
          <div className="space-y-2 stagger-children">
            {logs.slice().reverse().map((item) => (
              <div key={item.id} style={{ ...card, padding: 12, display: 'flex', gap: 12, alignItems: 'center' }} className="group">
                {item.imageUri ? (
                  <img src={item.imageUri} alt={item.name} style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', border: `1px solid ${INK}20` }} />
                ) : (
                  <div style={{ width: 48, height: 48, borderRadius: 10, background: `${HL_ORANGE}50`, border: `1.5px solid ${INK}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: INK, flexShrink: 0 }}>
                    <UtensilsCrossed size={20} />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ fontWeight: 700, color: INK, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Bricolage Grotesque', sans-serif" }}>{item.name}</h4>
                  <div style={{ display: 'flex', gap: 8, marginTop: 2, fontSize: 10, color: `${INK}60`, fontFamily: "'Instrument Sans', sans-serif" }}>
                    <span style={{ color: HL_ORANGE, fontWeight: 700 }}>{item.calories} kcal</span>
                    <span>P: {item.protein}g</span>
                    <span>C: {item.carbs}g</span>
                    <span>F: {item.fat}g</span>
                  </div>
                </div>
                <div className="flex gap-1.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => openEditModal(item)}
                        style={{ padding: 8, background: `${INK}08`, border: `1px solid ${INK}20`, borderRadius: 8, color: `${INK}60`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <Pencil size={13} />
                    </button>
                    <button
                        onClick={() => deleteLog(item.id)}
                        style={{ padding: 8, background: `${HL_RED}15`, border: `1px solid ${HL_RED}40`, borderRadius: 8, color: HL_RED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
