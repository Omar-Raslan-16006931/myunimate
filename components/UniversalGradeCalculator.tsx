
import React, { useState } from 'react';
import { 
    Plus, Trash2, ArrowLeft, Target, 
    X, ChevronDown, ChevronUp, Calculator, AlertTriangle, TrendingUp, Award
} from 'lucide-react';
import { CourseGrade, GradeCategory, GradeItem } from '../types';

interface UniversalGradeCalculatorProps {
    course: CourseGrade;
    onUpdate: (updatedCourse: CourseGrade) => void;
    onBack: () => void;
    onDelete?: () => void;
}

const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

// --- Category Component ---
const CategorySection = ({ cat, updateCategory, deleteCategory, addItem, updateItem, deleteItem }: any) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    // Calculate internal category score
    const validItems = cat.items.filter((i: any) => i.score !== '' && i.total !== '' && parseFloat(i.total) > 0);
    
    let catScoreDisplay = "0";
    let catMaxDisplay = "0";
    let catPercentage = 0;

    if (validItems.length > 0) {
        const sumScore = validItems.reduce((acc: number, i: any) => acc + parseFloat(i.score), 0);
        const sumTotal = validItems.reduce((acc: number, i: any) => acc + parseFloat(i.total), 0);
        catScoreDisplay = sumScore.toFixed(1).replace(/\.0$/, '');
        catMaxDisplay = sumTotal.toFixed(1).replace(/\.0$/, '');
        catPercentage = (sumScore / sumTotal) * 100;
    }

    const weight = parseFloat(cat.weight) || 0;
    const pointsContributed = (catPercentage / 100) * weight;

    // Local toggle for delete confirmation
    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirmDelete) {
            deleteCategory(cat.id);
        } else {
            setConfirmDelete(true);
            setTimeout(() => setConfirmDelete(false), 3000);
        }
    };

    const getGradeColor = (grade: number) => {
        if (grade >= 90) return 'text-emerald-400';
        if (grade >= 80) return 'text-blue-400';
        if (grade >= 70) return 'text-yellow-400';
        if (grade >= 60) return 'text-orange-400';
        return 'text-red-400';
    };

    return (
        <div className="bg-[#1c1c1e] border border-white/5 rounded-xl overflow-hidden mb-3 transition-all duration-300 shadow-sm">
            {/* Header / Summary View */}
            <div 
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02]"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex-1 min-w-0 pr-3">
                    <div className="flex items-center justify-between mb-1.5">
                        <h3 className="text-white font-bold text-base truncate">{cat.name}</h3>
                        <div className={`text-base font-bold ${validItems.length > 0 ? getGradeColor(catPercentage) : 'text-white/30'}`}>
                            {validItems.length > 0 ? `${catPercentage.toFixed(1)}%` : '--'}
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                       <div className="flex items-center gap-2 text-white/40">
                           <span className="bg-white/5 px-2 py-0.5 rounded border border-white/5 text-white/60 font-bold text-[10px]">Wt: {cat.weight}%</span>
                           <span>{cat.items.length} items</span>
                       </div>
                       <span className={validItems.length > 0 ? 'text-indigo-300 font-bold' : 'text-white/20'}>
                           {validItems.length > 0 ? `+${pointsContributed.toFixed(2)} pts` : '0 pts'}
                       </span>
                    </div>
                </div>
                <div className="text-white/20 pl-3 border-l border-white/5 ml-2">
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
                <div className="border-t border-white/5 bg-black/20 p-4 space-y-4 animate-in slide-in-from-top-2">
                    
                    {/* Settings Row */}
                    <div className="grid grid-cols-2 gap-4 bg-white/5 p-3 rounded-xl border border-white/5">
                        <div>
                            <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1.5">Name</label>
                            <input 
                                value={cat.name}
                                onChange={(e) => updateCategory(cat.id, { name: e.target.value })}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1.5">Weight %</label>
                                <input 
                                    type="number"
                                    value={cat.weight}
                                    onChange={(e) => updateCategory(cat.id, { weight: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 text-center"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1.5">Drop Low</label>
                                <input 
                                    type="number"
                                    value={cat.dropLowest}
                                    onChange={(e) => updateCategory(cat.id, { dropLowest: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 text-center"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Items List */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-end mb-2 px-1">
                            <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Assignments</label>
                            {validItems.length > 0 && <span className="text-[10px] font-mono text-white/40 font-bold">{catScoreDisplay} / {catMaxDisplay}</span>}
                        </div>
                        
                        {cat.items.map((item: any) => (
                            <div key={item.id} className="flex items-center gap-3 group bg-white/5 rounded-xl px-3 py-2 border border-transparent focus-within:border-white/10 transition-colors">
                                <input 
                                    value={item.name}
                                    onChange={(e) => updateItem(cat.id, item.id, 'name', e.target.value)}
                                    placeholder="Assignment Name"
                                    className="flex-1 bg-transparent border-none py-1 text-sm font-medium text-white placeholder-white/20 focus:outline-none"
                                />
                                <div className="flex items-center gap-2 w-28 justify-end">
                                    <input 
                                        type="number"
                                        value={item.score}
                                        onChange={(e) => updateItem(cat.id, item.id, 'score', e.target.value)}
                                        placeholder="-"
                                        className="w-10 bg-black/20 rounded border border-white/10 py-1 text-sm text-white text-center focus:outline-none focus:border-emerald-500 placeholder-white/20 font-bold"
                                    />
                                    <span className="text-white/30 text-xs font-bold">/</span>
                                    <input 
                                        type="number"
                                        value={item.total}
                                        onChange={(e) => updateItem(cat.id, item.id, 'total', e.target.value)}
                                        placeholder="100"
                                        className="w-10 bg-black/20 rounded border border-white/10 py-1 text-sm text-white/70 text-center focus:outline-none focus:border-white/40 font-medium"
                                    />
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => deleteItem(cat.id, item.id)}
                                    className="text-white/20 hover:text-red-400 transition-colors p-2 hover:bg-white/5 rounded-lg"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                        
                        <button 
                            type="button"
                            onClick={() => addItem(cat.id)}
                            className="w-full py-3 mt-2 rounded-xl border border-dashed border-white/10 text-white/40 text-xs font-bold uppercase tracking-widest hover:text-white hover:border-white/30 hover:bg-white/5 transition flex items-center justify-center gap-2"
                        >
                            <Plus size={14} /> Add Assignment
                        </button>
                    </div>

                    <div className="pt-3 border-t border-white/5 flex justify-end">
                        <button 
                            type="button"
                            onClick={handleDeleteClick}
                            className={`
                                px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all
                                ${confirmDelete 
                                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' 
                                    : 'bg-white/5 text-red-400 hover:bg-white/10'}
                            `}
                        >
                            <Trash2 size={14} /> {confirmDelete ? 'Confirm Delete' : 'Remove Category'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Main Calculator ---
const UniversalGradeCalculator: React.FC<UniversalGradeCalculatorProps> = ({ course, onUpdate, onBack, onDelete }) => {
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // --- Logic ---
    let totalPointsAccumulated = 0;
    let weightCompleted = 0;
    let totalWeightDefined = 0;

    course.categories.forEach(cat => {
        const weight = parseFloat(cat.weight) || 0;
        totalWeightDefined += weight;

        const validItems = cat.items.filter(i => i.active !== false && i.score !== '' && i.total !== '' && parseFloat(i.total) > 0);
        
        if (validItems.length > 0) {
            const withPercent = validItems.map(i => ({
                s: parseFloat(i.score),
                t: parseFloat(i.total),
                pct: parseFloat(i.score) / parseFloat(i.total)
            })).sort((a, b) => a.pct - b.pct);

            const dropCount = parseInt(cat.dropLowest) || 0;
            const kept = withPercent.slice(dropCount);
            
            if (kept.length > 0) {
                const sumScore = kept.reduce((a, b) => a + b.s, 0);
                const sumTotal = kept.reduce((a, b) => a + b.t, 0);
                const catAvg = sumTotal > 0 ? (sumScore / sumTotal) : 0;
                
                totalPointsAccumulated += catAvg * weight;
                weightCompleted += weight;
            }
        }
    });

    const target = parseFloat(course.targetGrade) || 90;
    const remainingWeight = 100 - weightCompleted;
    const pointsNeeded = target - totalPointsAccumulated;
    const currentPerformance = weightCompleted > 0 ? (totalPointsAccumulated/weightCompleted)*100 : 0;
    const maxPossible = totalPointsAccumulated + remainingWeight;

    // --- State Updates ---
    const updateCourse = (updates: Partial<CourseGrade>) => onUpdate({ ...course, ...updates });
    
    const addCategory = () => {
        const newCat: GradeCategory = { id: generateId(), name: "New Category", weight: "20", dropLowest: "0", items: [] };
        updateCourse({ categories: [...course.categories, newCat] });
    };

    const updateCategory = (catId: string, updates: Partial<GradeCategory>) => {
        const newCats = course.categories.map(c => c.id === catId ? { ...c, ...updates } : c);
        updateCourse({ categories: newCats });
    };

    const deleteCategory = (catId: string) => {
        const newCats = course.categories.filter(c => c.id !== catId);
        updateCourse({ categories: newCats });
    };

    const addItem = (catId: string) => {
        const newCats = course.categories.map(c => c.id === catId ? { ...c, items: [...c.items, { id: generateId(), name: "", score: "", total: "100", active: true }] } : c);
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

    const handleDeleteCourse = () => {
        if(onDelete) {
            onDelete();
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 90) return 'text-emerald-400';
        if (score >= 80) return 'text-blue-400';
        if (score >= 70) return 'text-yellow-400';
        if (score >= 60) return 'text-orange-400';
        return 'text-red-400';
    };

    const getBgColor = (score: number) => {
        if (score >= 90) return 'bg-emerald-500';
        if (score >= 80) return 'bg-blue-500';
        if (score >= 70) return 'bg-yellow-500';
        if (score >= 60) return 'bg-orange-500';
        return 'bg-red-500';
    };

    return (
        <div className="flex flex-col h-full bg-[#0f0f12] relative">
            {/* Top Navigation */}
            <div className="px-4 pt-4 pb-2 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button 
                        type="button"
                        onClick={onBack} 
                        className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/70 hover:text-white transition-colors shrink-0"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <input 
                        value={course.title}
                        onChange={(e) => updateCourse({ title: e.target.value })}
                        className="bg-transparent border-none text-xl font-bold text-white focus:text-white outline-none w-full focus:ring-0 truncate"
                        placeholder="Course Name"
                    />
                </div>
                <div className="flex gap-2">
                    {onDelete && (
                        <button 
                            type="button"
                            onClick={() => setShowDeleteModal(true)} 
                            className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors"
                        >
                            <Trash2 size={18} />
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-32">
                
                {/* Hero Dashboard (Compact) */}
                <div className="bg-[#1c1c1e] border border-white/5 rounded-2xl p-4 mb-4 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Current Grade</div>
                            <div className={`text-4xl font-black tracking-tight ${getScoreColor(currentPerformance)}`}>
                                {totalPointsAccumulated.toFixed(1)}<span className="text-lg opacity-50 font-bold ml-1">pts</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-right">
                            <div>
                                <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Target</div>
                                <div className="flex items-center justify-end">
                                    <input 
                                        value={course.targetGrade}
                                        onChange={(e) => updateCourse({ targetGrade: e.target.value })}
                                        className="w-10 bg-transparent text-white font-bold text-lg outline-none focus:text-indigo-400 p-0 text-right"
                                    />
                                    <span className="text-sm text-white/40 font-bold">%</span>
                                </div>
                            </div>
                            <div className="w-px h-8 bg-white/10 mx-1"></div>
                            <div>
                                <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Max</div>
                                <div className="text-lg font-bold text-white/80">{maxPossible.toFixed(1)}%</div>
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div>
                        <div className="flex justify-between mb-1.5 text-[10px] font-bold uppercase tracking-wider">
                            <span className="text-white/40">Progress</span>
                            <span className="text-white/40">{weightCompleted.toFixed(0)}% Completed</span>
                        </div>
                        <div className="relative h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                            <div className="absolute top-0 left-0 h-full bg-white/10 transition-all duration-500" style={{ width: `${Math.min(weightCompleted, 100)}%` }} />
                            <div className={`absolute top-0 left-0 h-full transition-all duration-500 ${getBgColor(currentPerformance)}`} style={{ width: `${Math.min(totalPointsAccumulated, 100)}%` }} />
                        </div>
                    </div>
                </div>

                {/* Insight Banner (Compact) */}
                {remainingWeight > 0 ? (
                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 mb-6 flex items-start gap-3">
                        <Calculator size={18} className="text-indigo-400 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-wide mb-1">Path to Target</p>
                            <p className="text-xs text-indigo-100/80 leading-relaxed font-medium">
                                You need <b>{pointsNeeded.toFixed(1)} pts</b> more. 
                                That means averaging <span className="font-bold text-white">{(pointsNeeded/remainingWeight * 100).toFixed(1)}%</span> on all remaining assignments.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-6 flex items-center justify-center gap-3">
                        <Award size={20} className="text-emerald-400" />
                        <p className="text-sm text-emerald-200 font-bold">Course Completed!</p>
                    </div>
                )}

                {/* Categories Header */}
                <div className="flex items-center justify-between mb-4 px-1">
                    <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                        <TrendingUp size={14} /> Grade Breakdown
                    </h3>
                    <button 
                        type="button"
                        onClick={addCategory}
                        className="text-[10px] font-bold bg-white/5 hover:bg-white/10 border border-white/5 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                        <Plus size={12} /> CATEGORY
                    </button>
                </div>

                {/* Category List */}
                <div className="space-y-3">
                    {course.categories.length === 0 && (
                        <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-2xl">
                            <p className="text-white/30 text-sm font-medium">Add categories (e.g. Exams, HW) to start.</p>
                        </div>
                    )}
                    
                    {course.categories.map((cat) => (
                        <CategorySection 
                            key={cat.id} 
                            cat={cat}
                            updateCategory={updateCategory}
                            deleteCategory={deleteCategory}
                            addItem={addItem}
                            updateItem={updateItem}
                            deleteItem={deleteItem}
                        />
                    ))}
                </div>
            </div>

            {/* Custom Modal for Course Deletion */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div 
                        className="bg-[#1c1c1e] border border-white/10 rounded-3xl w-full max-w-sm p-6 shadow-2xl relative animate-in zoom-in-95"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button 
                            onClick={() => setShowDeleteModal(false)} 
                            className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                        
                        <div className="flex flex-col items-center mb-6 text-center">
                            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-4 border border-red-500/20">
                                <AlertTriangle size={32} />
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">Delete Entire Course?</h2>
                            <p className="text-white/60 text-sm leading-relaxed">
                                This will remove <b>{course.title}</b> and all its data.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button 
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all text-sm"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleDeleteCourse}
                                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-900/20 text-sm"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UniversalGradeCalculator;
