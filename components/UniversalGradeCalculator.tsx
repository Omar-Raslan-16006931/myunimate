
import React, { useState } from 'react';
import { 
    Plus, Trash2, ArrowLeft, Target, 
    X, ChevronDown, ChevronUp, Calculator, AlertTriangle
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
            // Reset after 3 seconds if not confirmed
            setTimeout(() => setConfirmDelete(false), 3000);
        }
    };

    return (
        <div className="bg-[#1c1c1e] border border-white/5 rounded-2xl overflow-hidden mb-3 transition-all duration-300">
            {/* Header / Summary View */}
            <div 
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02]"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-white font-bold text-base truncate">{cat.name}</h3>
                        <div className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                            <span className="text-[10px] font-bold text-white/60">WEIGHT</span>
                            <span className="text-[10px] font-bold text-white">{cat.weight}%</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/40">
                       <span>{cat.items.length} items</span>
                       <span>•</span>
                       <span className={validItems.length > 0 ? 'text-indigo-400 font-bold' : ''}>
                           {validItems.length > 0 ? `+${pointsContributed.toFixed(1)} pts` : 'No data'}
                       </span>
                    </div>
                </div>
                <div className="text-white/30">
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
                <div className="border-t border-white/5 bg-black/20 p-4 space-y-4">
                    
                    {/* Settings Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[9px] font-bold text-white/30 uppercase tracking-wider block mb-1">Name</label>
                            <input 
                                value={cat.name}
                                onChange={(e) => updateCategory(cat.id, { name: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[9px] font-bold text-white/30 uppercase tracking-wider block mb-1">Weight</label>
                                <input 
                                    type="number"
                                    value={cat.weight}
                                    onChange={(e) => updateCategory(cat.id, { weight: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 text-center"
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-white/30 uppercase tracking-wider block mb-1">Drop Low</label>
                                <input 
                                    type="number"
                                    value={cat.dropLowest}
                                    onChange={(e) => updateCategory(cat.id, { dropLowest: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 text-center"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Items List */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-end mb-2">
                            <label className="text-[9px] font-bold text-white/30 uppercase tracking-wider block">Assignments</label>
                            {validItems.length > 0 && <span className="text-[9px] font-mono text-white/40">{catScoreDisplay}/{catMaxDisplay} ({catPercentage.toFixed(1)}%)</span>}
                        </div>
                        
                        {cat.items.map((item: any) => (
                            <div key={item.id} className="flex items-center gap-2 group">
                                <input 
                                    value={item.name}
                                    onChange={(e) => updateItem(cat.id, item.id, 'name', e.target.value)}
                                    placeholder="Assignment"
                                    className="flex-1 bg-transparent border-b border-white/10 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500 transition-colors"
                                />
                                <div className="flex items-center gap-1 w-24">
                                    <input 
                                        type="number"
                                        value={item.score}
                                        onChange={(e) => updateItem(cat.id, item.id, 'score', e.target.value)}
                                        placeholder="-"
                                        className="w-10 bg-transparent border-b border-white/10 py-2 text-sm text-white text-right focus:outline-none focus:border-emerald-500 placeholder-white/20"
                                    />
                                    <span className="text-white/30 text-sm">/</span>
                                    <input 
                                        type="number"
                                        value={item.total}
                                        onChange={(e) => updateItem(cat.id, item.id, 'total', e.target.value)}
                                        placeholder="100"
                                        className="w-10 bg-transparent border-b border-white/10 py-2 text-sm text-white/50 focus:outline-none focus:border-white/40"
                                    />
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => deleteItem(cat.id, item.id)}
                                    className="p-2 text-white/30 hover:text-red-400 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                        
                        <button 
                            type="button"
                            onClick={() => addItem(cat.id)}
                            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mt-3 py-1"
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
                                    : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'}
                            `}
                        >
                            <Trash2 size={14} /> {confirmDelete ? 'Confirm Delete?' : 'Remove Category'}
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

    return (
        <div className="flex flex-col h-full bg-[#0f0f12] relative">
            {/* Top Navigation */}
            <div className="px-4 py-4 flex items-center justify-between shrink-0">
                <button 
                    type="button"
                    onClick={onBack} 
                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="flex gap-2">
                    {onDelete && (
                        <button 
                            type="button"
                            onClick={() => setShowDeleteModal(true)} 
                            className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors"
                        >
                            <Trash2 size={18} />
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-32">
                
                {/* Hero Grade Display */}
                <div className="flex flex-col items-center text-center py-6 mb-4">
                    <input 
                        value={course.title}
                        onChange={(e) => updateCourse({ title: e.target.value })}
                        className="bg-transparent border-none text-center text-xl font-bold text-white/60 focus:text-white outline-none w-full mb-2 focus:ring-0"
                        placeholder="Course Name"
                    />
                    
                    <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Final Grade (Accumulated)</div>
                    
                    <div className={`text-8xl font-black tracking-tighter leading-none mb-2 text-white`}>
                        {totalPointsAccumulated.toFixed(1)}<span className="text-4xl align-top opacity-30">%</span>
                    </div>
                    
                    {/* Secondary Stat: Max Possible vs Relative */}
                    <div className="flex items-center gap-4 mt-2">
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-bold text-white/40 uppercase">Max Possible</span>
                            <span className="text-white font-bold">{maxPossible.toFixed(1)}%</span>
                        </div>
                        <div className="w-px h-6 bg-white/10"></div>
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-bold text-white/40 uppercase">Performance</span>
                            <span className={`font-bold ${getScoreColor(weightCompleted > 0 ? (totalPointsAccumulated/weightCompleted)*100 : 0)}`}>
                                {weightCompleted > 0 ? ((totalPointsAccumulated/weightCompleted)*100).toFixed(1) : 0}%
                            </span>
                        </div>
                    </div>

                    <div className="mt-6 flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/5">
                        <Target size={14} className="text-white/40" />
                        <span className="text-xs font-bold text-white/40 uppercase">Target</span>
                        <input 
                            value={course.targetGrade}
                            onChange={(e) => updateCourse({ targetGrade: e.target.value })}
                            className="w-8 bg-transparent border-b border-white/20 text-center text-white font-bold text-sm outline-none focus:border-indigo-500 p-0"
                        />
                        <span className="text-xs font-bold text-white/40">%</span>
                    </div>
                </div>

                {/* Insight Banner */}
                {remainingWeight > 0 ? (
                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 mb-8 flex items-start gap-3">
                        <Calculator size={18} className="text-indigo-400 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-indigo-100">Path to Victory</p>
                            <p className="text-xs text-indigo-300/80 leading-relaxed mt-1">
                                You have <b>{totalPointsAccumulated.toFixed(1)} pts</b> so far. You need <b>{pointsNeeded.toFixed(1)} pts</b> more from the remaining <b>{remainingWeight}%</b> weight.
                                <br/>
                                That requires averaging <span className="font-bold text-white">{(pointsNeeded/remainingWeight * 100).toFixed(1)}%</span> on future assignments.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-8 text-center">
                        <p className="text-xs text-white/40 font-medium">Course 100% Completed.</p>
                    </div>
                )}

                {/* Categories Header */}
                <div className="flex items-center justify-between mb-4 px-1">
                    <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">Weights & Grades</h3>
                    <button 
                        type="button"
                        onClick={addCategory}
                        className="text-[10px] font-bold bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                    >
                        <Plus size={12} /> ADD CATEGORY
                    </button>
                </div>

                {/* Category List */}
                <div className="space-y-3">
                    {course.categories.length === 0 && (
                        <div className="text-center py-10 border-2 border-dashed border-white/10 rounded-2xl">
                            <p className="text-white/30 text-sm">Add grading categories (e.g. Exams, Quizzes) to calculate.</p>
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
                                className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleDeleteCourse}
                                className="flex-1 py-3.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-900/20"
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
