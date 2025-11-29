import React from 'react';
import { 
    Plus, Trash2, ArrowLeft, Target, 
    TrendingUp, Info, X
} from 'lucide-react';
import { CourseGrade, GradeCategory, GradeItem } from '../types';
import { theme, styles } from '../theme';

interface UniversalGradeCalculatorProps {
    course: CourseGrade;
    onUpdate: (updatedCourse: CourseGrade) => void;
    onBack: () => void;
}

// --- Modern Radial Progress ---
const RadialProgress = ({ percentage, color, size = 100, strokeWidth = 8, label, subLabel }: { percentage: number, color: string, size?: number, strokeWidth?: number, label?: string, subLabel?: string }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;

    return (
        <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} fill="none" />
                <circle 
                    cx={size / 2} cy={size / 2} r={radius} 
                    stroke={color} strokeWidth={strokeWidth} fill="none" 
                    strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)' }}
                />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                {label && <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{label}</span>}
                {subLabel && <span style={{ fontSize: '0.6rem', color: theme.textMuted, fontWeight: 700, textTransform: 'uppercase', marginTop: '2px' }}>{subLabel}</span>}
            </div>
        </div>
    );
};

// --- Clean Category Card ---
const CategoryCard = ({ cat, updateCategory, deleteCategory, addItem, updateItem, deleteItem }: any) => {
    return (
        <div className="group mb-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex-1 flex items-center gap-3">
                    <input 
                        value={cat.name}
                        onChange={(e) => updateCategory(cat.id, { name: e.target.value })}
                        className="bg-transparent border-none text-white text-lg font-bold w-full outline-none placeholder-white/30"
                        placeholder="Category Name"
                    />
                    <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5 border border-white/5">
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Weight</span>
                        <input 
                            value={cat.weight}
                            onChange={(e) => updateCategory(cat.id, { weight: e.target.value })}
                            type="number"
                            placeholder="0"
                            className="bg-transparent border-none text-white font-bold text-sm w-8 text-center outline-none"
                        />
                        <span className="text-xs text-white/40 font-bold">%</span>
                    </div>
                </div>
                <button onClick={() => deleteCategory(cat.id)} className="text-white/20 hover:text-red-400 transition-colors p-2">
                    <Trash2 size={16} />
                </button>
            </div>

            {/* Drop Lowest Option (Only show if items exist) */}
            {cat.items.length > 2 && (
                <div className="flex items-center gap-2 mb-3 ml-1">
                    <span className="text-xs text-white/40 font-medium">Drop Lowest:</span>
                    <input 
                        value={cat.dropLowest}
                        onChange={(e) => updateCategory(cat.id, { dropLowest: e.target.value })}
                        type="number"
                        className="bg-white/5 border border-white/5 rounded-md text-white text-xs w-10 py-1 text-center outline-none focus:border-indigo-500/50"
                    />
                </div>
            )}

            {/* Items List */}
            <div className="flex flex-col gap-2">
                {cat.items.map((item: any) => (
                    <div key={item.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${item.active !== false ? 'bg-white/5 border-white/5' : 'bg-black/20 border-transparent opacity-50'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${item.score ? 'bg-green-400' : 'bg-white/20'}`} />
                        
                        <input 
                            value={item.name}
                            onChange={(e) => updateItem(cat.id, item.id, 'name', e.target.value)}
                            className="flex-1 bg-transparent border-none text-white text-sm font-medium outline-none placeholder-white/20"
                            placeholder="Item Name (e.g. Quiz 1)"
                        />

                        <div className="flex items-center gap-2 bg-black/20 rounded-lg px-2 py-1 border border-white/5">
                            <input 
                                value={item.score}
                                onChange={(e) => updateItem(cat.id, item.id, 'score', e.target.value)}
                                type="number"
                                placeholder="-"
                                className="w-8 bg-transparent border-none text-right text-white font-bold text-sm outline-none placeholder-white/20"
                            />
                            <span className="text-white/20 text-xs">/</span>
                            <input 
                                value={item.total}
                                onChange={(e) => updateItem(cat.id, item.id, 'total', e.target.value)}
                                type="number"
                                placeholder="100"
                                className="w-8 bg-transparent border-none text-white/50 font-medium text-sm outline-none"
                            />
                        </div>

                        <button onClick={() => deleteItem(cat.id, item.id)} className="text-white/10 hover:text-white transition-colors">
                            <X size={14} />
                        </button>
                    </div>
                ))}
                
                <button 
                    onClick={() => addItem(cat.id)}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-dashed border-white/10 text-white/30 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all text-xs font-bold uppercase tracking-wider mt-2"
                >
                    <Plus size={14} /> Add Item
                </button>
            </div>
        </div>
    );
};

const UniversalGradeCalculator: React.FC<UniversalGradeCalculatorProps> = ({ course, onUpdate, onBack }) => {
    // --- LOGIC ---
    const getCategoryStats = (category: GradeCategory) => {
        const usableItems = category.items.filter(i => i.active !== false && i.score !== ''); 
        if (usableItems.length === 0) return { average: null };

        const percentages = usableItems.map(i => {
            const s = parseFloat(i.score);
            const t = parseFloat(i.total);
            return { percent: (s / ((isNaN(t) || t === 0) ? 100 : t)) * 100 };
        }).sort((a, b) => a.percent - b.percent);

        const dropCount = parseInt(category.dropLowest) || 0;
        const kept = percentages.slice(dropCount);
        if (kept.length === 0) return { average: 0 };

        const sum = kept.reduce((acc, curr) => acc + curr.percent, 0);
        return { average: sum / kept.length };
    };

    let totalWeightedScore = 0;
    let totalWeightUsed = 0;

    course.categories.forEach(cat => {
        const weight = parseFloat(cat.weight) || 0;
        const { average } = getCategoryStats(cat);
        if (average !== null) {
            totalWeightedScore += average * (weight / 100);
            totalWeightUsed += weight;
        }
    });

    const currentAverage = totalWeightUsed > 0 ? (totalWeightedScore / (totalWeightUsed / 100)) : 0.0;
    const target = parseFloat(course.targetGrade) || 90;
    const remainingWeight = 100 - totalWeightUsed; 
    const pointsNeeded = target - totalWeightedScore;
    const neededAverage = remainingWeight > 0 ? (pointsNeeded / (remainingWeight / 100)) : 0;

    // --- ACTIONS ---
    const updateCourse = (updates: Partial<CourseGrade>) => onUpdate({ ...course, ...updates });
    
    const addCategory = () => {
        const newCat: GradeCategory = { id: crypto.randomUUID(), name: "New Category", weight: "0", dropLowest: "0", items: [] };
        updateCourse({ categories: [...course.categories, newCat] });
    };

    const updateCategory = (catId: string, updates: Partial<GradeCategory>) => {
        const newCats = course.categories.map(c => c.id === catId ? { ...c, ...updates } : c);
        updateCourse({ categories: newCats });
    };

    const deleteCategory = (catId: string) => {
        if(confirm("Delete category?")) updateCourse({ categories: course.categories.filter(c => c.id !== catId) });
    };

    const addItem = (catId: string) => {
        const newCats = course.categories.map(c => c.id === catId ? { ...c, items: [...c.items, { id: crypto.randomUUID(), name: "", score: "", total: "100", active: true }] } : c);
        updateCourse({ categories: newCats });
    };

    const updateItem = (catId: string, itemId: string, field: keyof GradeItem, value: any) => {
        const newCats = course.categories.map(c => {
            if (c.id === catId) return { ...c, items: c.items.map(i => i.id === itemId ? { ...i, [field]: value } : i) };
            return c;
        });
        updateCourse({ categories: newCats });
    };

    const deleteItem = (catId: string, itemId: string) => {
        const newCats = course.categories.map(c => c.id === catId ? { ...c, items: c.items.filter(i => i.id !== itemId) } : c);
        updateCourse({ categories: newCats });
    };

    return (
        <div style={styles.scrollableContent}>
            {/* Top Nav */}
            <div className="flex items-center gap-4 mb-8">
                <button onClick={onBack} className="bg-white/5 hover:bg-white/10 rounded-full p-2 text-white transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex-1">
                    <input 
                        value={course.title}
                        onChange={(e) => updateCourse({ title: e.target.value })}
                        className="bg-transparent border-none text-2xl font-black text-white w-full outline-none placeholder-white/30"
                        placeholder="Course Name"
                    />
                </div>
            </div>

            {/* Score Dashboard */}
            <div className="bg-gradient-to-br from-indigo-900/40 to-violet-900/40 border border-white/10 rounded-3xl p-6 mb-8 flex items-center justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-[50px] rounded-full pointer-events-none" />
                
                <div className="z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <Target size={14} className="text-indigo-300" />
                        <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Target</span>
                        <div className="flex items-center gap-1 bg-white/10 rounded px-2 py-0.5">
                            <input 
                                value={course.targetGrade}
                                onChange={(e) => updateCourse({ targetGrade: e.target.value })}
                                type="number"
                                className="bg-transparent border-none text-white font-bold text-sm w-6 text-center outline-none"
                            />
                            <span className="text-xs text-white/50">%</span>
                        </div>
                    </div>
                    <div>
                        <div className="text-5xl font-black text-white tracking-tighter">
                            {currentAverage.toFixed(1)}<span className="text-2xl text-white/40">%</span>
                        </div>
                        <div className="text-xs font-medium text-white/40 mt-1">Current Grade</div>
                    </div>
                </div>

                <div className="z-10">
                    <RadialProgress 
                        percentage={totalWeightedScore} 
                        color={theme.accent}
                        size={90} 
                        strokeWidth={8} 
                        label={`${totalWeightedScore.toFixed(0)}%`}
                    />
                </div>
            </div>

            {/* Path to Victory */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 mb-8 flex gap-4 items-start">
                <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400 mt-0.5">
                    <TrendingUp size={18} />
                </div>
                <div>
                    <h4 className="text-sm font-bold text-blue-100 mb-1">Path to Victory</h4>
                    <p className="text-sm text-blue-200/80 leading-relaxed">
                        {remainingWeight <= 0 ? (
                             pointsNeeded <= 0 ? "You've already hit your target! Great work." : "Target unreachable with remaining weights."
                        ) : (
                             <>To get <b>{target}%</b>, you need to average <span className="bg-blue-500 text-white px-1.5 py-0.5 rounded font-bold">{neededAverage.toFixed(1)}%</span> on the remaining <b>{remainingWeight}%</b>.</>
                        )}
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="space-y-2">
                {course.categories.map((cat) => (
                    <CategoryCard 
                        key={cat.id} cat={cat}
                        updateCategory={updateCategory} deleteCategory={deleteCategory}
                        addItem={addItem} updateItem={updateItem} deleteItem={deleteItem}
                    />
                ))}
            </div>

            {/* Add Button */}
            <button 
                onClick={addCategory}
                className="w-full py-4 mt-4 rounded-2xl border-2 border-dashed border-white/10 text-white/40 font-bold hover:bg-white/5 hover:text-white hover:border-white/20 transition-all flex items-center justify-center gap-2"
            >
                <Plus size={20} /> Add Category
            </button>
            <div className="h-10" />
        </div>
    );
};

export default UniversalGradeCalculator;