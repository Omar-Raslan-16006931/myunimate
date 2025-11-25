
import React, { useState, useEffect } from 'react';
import { 
    Plus, Trash2, ArrowLeft, RotateCcw, TrendingUp, 
    AlertCircle, CheckCircle2, Target, Calculator, ChevronDown, ChevronUp, X, Eye, EyeOff,
    ArrowDownNarrowWide, HelpCircle, Minus, PieChart, Award, Percent, AlertTriangle
} from 'lucide-react';
import { CourseGrade, GradeCategory, GradeItem } from '../types';
import { theme, styles } from '../theme';

interface UniversalGradeCalculatorProps {
    course: CourseGrade;
    onUpdate: (updatedCourse: CourseGrade) => void;
    onBack: () => void;
}

// --- Helper Component for Confirmation Modal ---
const ConfirmModal = ({ 
    isOpen, 
    title, 
    message, 
    onConfirm, 
    onCancel 
}: { 
    isOpen: boolean, 
    title: string, 
    message: string, 
    onConfirm: () => void, 
    onCancel: () => void 
}) => {
    if (!isOpen) return null;
    return (
        <div style={styles.modalOverlay} onClick={onCancel}>
            <div style={{...styles.modalContent, maxWidth: '320px', padding: '0', overflow: 'hidden'}} onClick={e => e.stopPropagation()}>
                <div style={{padding: '24px', textAlign: 'center'}}>
                    <div style={{width: '60px', height: '60px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'}}>
                        <AlertTriangle size={32} color={theme.danger} />
                    </div>
                    <h3 style={{margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 800}}>{title}</h3>
                    <p style={{margin: 0, fontSize: '0.9rem', color: theme.textMuted, lineHeight: '1.5'}}>
                        {message}
                    </p>
                </div>
                <div style={{display: 'flex', borderTop: '1px solid rgba(255,255,255,0.1)'}}>
                    <button 
                        onClick={onCancel}
                        style={{flex: 1, padding: '16px', background: 'transparent', border: 'none', color: theme.text, fontSize: '1rem', fontWeight: 600, cursor: 'pointer', borderRight: '1px solid rgba(255,255,255,0.1)'}}
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={onConfirm}
                        style={{flex: 1, padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: theme.danger, fontSize: '1rem', fontWeight: 800, cursor: 'pointer'}}
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Helper Component for Category UI ---
const CategoryCard = ({ 
    cat, 
    updateCategory, 
    deleteCategory, 
    addItem, 
    updateItem, 
    deleteItem, 
    singularize, 
    getCategoryStats 
}: any) => {
    const [showDropSettings, setShowDropSettings] = useState(false);
    const stats = getCategoryStats(cat);
    const dropCount = parseInt(cat.dropLowest) || 0;

    return (
        <div style={{ ...styles.card, padding: '0', overflow: 'visible', marginBottom: 0, position: 'relative' }}>
            {/* Delete Button - Absolute Top Right */}
            <button 
                onClick={(e) => { e.stopPropagation(); deleteCategory(cat.id); }}
                style={{ 
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    width: '28px', height: '28px', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: theme.danger, 
                    background: 'rgba(239, 68, 68, 0.1)', 
                    border: 'none', 
                    borderRadius: '6px',
                    cursor: 'pointer',
                    zIndex: 10,
                    opacity: 0.7
                }}
            >
                <Trash2 size={14} />
            </button>

            {/* Card Header */}
            <div style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingRight: '40px' }}>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
                    {/* Left: Name & Weight */}
                    <div style={{ flex: 1, minWidth: '150px' }}>
                        <input 
                            value={cat.name}
                            onChange={(e) => updateCategory(cat.id, { name: e.target.value })}
                            style={{ background: 'transparent', border: 'none', color: '#fff', fontWeight: 700, fontSize: '1.1rem', width: '100%', outline: 'none', marginBottom: '4px' }}
                            placeholder="Category Name"
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{position: 'relative', display: 'flex', alignItems: 'center'}}>
                                <input 
                                    value={cat.weight}
                                    onChange={(e) => updateCategory(cat.id, { weight: e.target.value })}
                                    type="number"
                                    placeholder="0"
                                    style={{ 
                                        background: 'rgba(0,0,0,0.3)', 
                                        border: '1px solid rgba(255,255,255,0.1)', 
                                        borderRadius: '8px', 
                                        color: theme.accent, 
                                        fontSize: '0.9rem', 
                                        fontWeight: 700, 
                                        width: '60px', 
                                        padding: '4px 8px', 
                                        textAlign: 'center' 
                                    }}
                                />
                                <span style={{ position: 'absolute', right: '8px', fontSize: '0.7rem', color: theme.textMuted, pointerEvents: 'none' }}>%</span>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: theme.textMuted }}>Weight</span>
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button 
                            onClick={() => setShowDropSettings(!showDropSettings)}
                            style={{ 
                                background: showDropSettings ? 'rgba(139, 92, 246, 0.15)' : 'transparent', 
                                border: '1px solid rgba(255,255,255,0.1)', 
                                borderRadius: '8px', 
                                padding: '6px 10px', 
                                color: showDropSettings ? theme.accent : theme.textMuted, 
                                fontSize: '0.75rem', 
                                fontWeight: 600, 
                                cursor: 'pointer', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '6px',
                                transition: 'all 0.2s'
                            }}
                        >
                            <ArrowDownNarrowWide size={14} />
                            {dropCount > 0 ? `${dropCount} Dropped` : 'Drop Lowest'}
                        </button>
                    </div>
                </div>

                {/* Drop Settings Panel */}
                {showDropSettings && (
                    <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', animation: 'fadeIn 0.2s' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '6px', borderRadius: '50%', color: theme.accent }}>
                                <HelpCircle size={16} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <h4 style={{ margin: '0 0 4px 0', fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>Drop Lowest Grades</h4>
                                <p style={{ margin: '0 0 8px 0', fontSize: '0.75rem', color: theme.textMuted, lineHeight: '1.4' }}>
                                    Automatically remove the lowest scoring items from this category.
                                </p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>Drop count:</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <button 
                                            onClick={() => updateCategory(cat.id, { dropLowest: Math.max(0, dropCount - 1).toString() })}
                                            style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <Minus size={12} />
                                        </button>
                                        <span style={{ minWidth: '20px', textAlign: 'center', fontWeight: 700, fontSize: '1rem' }}>{dropCount}</span>
                                        <button 
                                            onClick={() => updateCategory(cat.id, { dropLowest: (dropCount + 1).toString() })}
                                            style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <Plus size={12} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Average Badge */}
            {stats.average !== null && (
                <div style={{ background: theme.accent, padding: '2px 8px', position: 'absolute', top: '50px', right: '0', borderRadius: '8px 0 0 8px', fontSize: '0.75rem', fontWeight: 800, color: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', zIndex: 5 }}>
                    Avg: {stats.average.toFixed(1)}%
                </div>
            )}

            {/* Items List */}
            <div style={{ padding: '12px' }}>
                {cat.items.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '16px', color: theme.textMuted, fontSize: '0.8rem', fontStyle: 'italic' }}>
                        No items yet.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {cat.items.map((item: any) => (
                            <div key={item.id} style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '10px', 
                                background: item.active !== false ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)', 
                                padding: '8px 12px', 
                                borderRadius: '8px', 
                                border: '1px solid rgba(255,255,255,0.05)',
                                opacity: item.active !== false ? 1 : 0.5,
                                transition: 'opacity 0.2s'
                            }}>
                                {/* Action: Visibility */}
                                <button
                                    onClick={() => updateItem(cat.id, item.id, 'active', !(item.active !== false))}
                                    style={{ background: 'transparent', border: 'none', color: item.active !== false ? theme.textMuted : theme.textMuted, cursor: 'pointer', padding: '0', display: 'flex' }}
                                    title={item.active !== false ? "Exclude" : "Include"}
                                >
                                    {item.active !== false ? <Eye size={14} /> : <EyeOff size={14} />}
                                </button>

                                {/* Name Input */}
                                <input 
                                    value={item.name}
                                    onChange={(e) => updateItem(cat.id, item.id, 'name', e.target.value)}
                                    style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', fontSize: '0.85rem', fontWeight: 500, minWidth: '0', outline: 'none', padding: '4px 0' }}
                                    placeholder="Item Name"
                                />
                                
                                {/* Scores Group */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.25)', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <input 
                                            value={item.score}
                                            onChange={(e) => updateItem(cat.id, item.id, 'score', e.target.value)}
                                            type="number"
                                            placeholder="-"
                                            style={{ width: '32px', background: 'transparent', border: 'none', color: item.score ? theme.accent : theme.textMuted, textAlign: 'right', fontWeight: 700, fontSize: '0.9rem', outline: 'none', padding: 0 }}
                                        />
                                        <span style={{ color: theme.textMuted, fontWeight: 400, fontSize: '0.8rem', opacity: 0.7 }}>/</span>
                                        <input 
                                            value={item.total}
                                            onChange={(e) => updateItem(cat.id, item.id, 'total', e.target.value)}
                                            type="number"
                                            placeholder="100"
                                            style={{ width: '32px', background: 'transparent', border: 'none', color: theme.textMuted, fontWeight: 600, fontSize: '0.8rem', outline: 'none', padding: 0 }}
                                        />
                                    </div>
                                    
                                    {/* Delete */}
                                    <button 
                                        onClick={() => deleteItem(cat.id, item.id)}
                                        style={{ background: 'transparent', border: 'none', color: theme.danger, cursor: 'pointer', padding: '4px', opacity: 0.6, marginLeft: '4px' }}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <button 
                    onClick={() => addItem(cat.id)}
                    style={{ width: '100%', marginTop: '8px', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '8px', color: theme.textMuted, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'background 0.2s' }}
                >
                    <Plus size={14} /> Add {singularize(cat.name) || "Item"}
                </button>
            </div>
        </div>
    );
};

const UniversalGradeCalculator: React.FC<UniversalGradeCalculatorProps> = ({ course, onUpdate, onBack }) => {
    // --- LOCAL STATE (Syncs with props) ---
    const [localTitle, setLocalTitle] = useState(course.title);
    const [localTarget, setLocalTarget] = useState(course.targetGrade);
    const [confirmAction, setConfirmAction] = useState<{ type: 'deleteCategory' | 'reset', id?: string } | null>(null);

    useEffect(() => {
        setLocalTitle(course.title);
        setLocalTarget(course.targetGrade);
    }, [course.id]);

    const handleTitleChange = (val: string) => {
        setLocalTitle(val);
        onUpdate({ ...course, title: val });
    };

    const handleTargetChange = (val: string) => {
        setLocalTarget(val);
        onUpdate({ ...course, targetGrade: val });
    };

    // --- CALCULATOR LOGIC ENGINE ---

    const getCategoryStats = (category: GradeCategory) => {
        // Filter valid items: Must have a score AND be active
        const usableItems = category.items.filter(i => i.active !== false && i.score !== ''); 
        
        if (usableItems.length === 0) return { average: null, droppedCount: 0, usedItems: 0 };

        // Normalize to percentages
        const percentages = usableItems.map(i => {
            const s = parseFloat(i.score);
            const t = parseFloat(i.total);
            const totalVal = (isNaN(t) || t === 0) ? 100 : t; 
            return {
                id: i.id,
                percent: (s / totalVal) * 100,
                original: i
            };
        }).sort((a, b) => a.percent - b.percent); // Ascending sort for dropping lowest

        const dropCount = parseInt(category.dropLowest) || 0;
        const kept = percentages.slice(dropCount);
        
        if (kept.length === 0) return { average: 0, droppedCount: percentages.length, usedItems: 0 };

        const sum = kept.reduce((acc, curr) => acc + curr.percent, 0);
        return {
            average: sum / kept.length,
            droppedCount: dropCount,
            usedItems: kept.length
        };
    };

    // Global Stats
    const calculateOverall = () => {
        let totalWeightedScore = 0;
        let totalWeightUsed = 0;
        let totalDefinedWeight = 0;

        course.categories.forEach(cat => {
            const weight = parseFloat(cat.weight) || 0;
            totalDefinedWeight += weight;

            const { average } = getCategoryStats(cat);
            if (average !== null) {
                // STRICT MATH: Average * (Weight / 100)
                // e.g., Avg 100% * (50 / 100) = 50 points
                const points = average * (weight / 100);
                if (!isNaN(points)) {
                    totalWeightedScore += points;
                    totalWeightUsed += weight;
                }
            }
        });

        // Current Average = Performance on submitted work
        // e.g. 50 points earned / 50 weight used = 100% average
        const currentAverage = totalWeightUsed > 0 ? (totalWeightedScore / (totalWeightUsed / 100)) : 0;

        return {
            currentAverage, // The "100%" (Performance)
            totalWeightedScore, // The "50%" (Accumulated Course Grade)
            totalWeightUsed,
            totalDefinedWeight
        };
    };

    const { currentAverage, totalWeightedScore, totalWeightUsed, totalDefinedWeight } = calculateOverall();

    // Predictor Logic
    const target = parseFloat(localTarget) || 90;
    const remainingWeight = 100 - totalWeightUsed; 
    const pointsNeeded = target - totalWeightedScore;
    const neededAverage = remainingWeight > 0 ? (pointsNeeded / (remainingWeight / 100)) : 0;
    
    // --- ACTIONS ---

    const addCategory = () => {
        const newCat: GradeCategory = {
            id: crypto.randomUUID(),
            name: "New Category",
            weight: "0",
            dropLowest: "0",
            items: []
        };
        onUpdate({ ...course, categories: [...course.categories, newCat] });
    };

    const updateCategory = (catId: string, updates: Partial<GradeCategory>) => {
        const newCats = course.categories.map(c => c.id === catId ? { ...c, ...updates } : c);
        onUpdate({ ...course, categories: newCats });
    };

    const deleteCategory = (catId: string) => {
        setConfirmAction({ type: 'deleteCategory', id: catId });
    };

    const executeConfirm = () => {
        if (confirmAction?.type === 'deleteCategory' && confirmAction.id) {
            const newCats = course.categories.filter(c => c.id !== confirmAction.id);
            onUpdate({ ...course, categories: newCats });
        } else if (confirmAction?.type === 'reset') {
            const newCats = course.categories.map(c => ({ ...c, items: [] }));
            onUpdate({ ...course, categories: newCats });
        }
        setConfirmAction(null);
    };

    const singularize = (word: string) => {
        const w = word.trim();
        if (!w) return "Item";
        // Basic heuristic for singularization
        if (w.toLowerCase().endsWith('quizzes')) return w.slice(0, -3); // Quizzes -> Quiz
        if (w.toLowerCase().endsWith('ies')) return w.slice(0, -3) + 'y'; // Activities -> Activity
        if (w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1); // Exams -> Exam
        return w;
    };

    const addItem = (catId: string) => {
        const category = course.categories.find(c => c.id === catId);
        const baseName = category ? singularize(category.name) : "Item";
        const nextNum = category ? category.items.length + 1 : 1;

        const newItem: GradeItem = {
            id: crypto.randomUUID(),
            name: `${baseName} ${nextNum}`,
            score: "",
            total: "",
            active: true
        };
        const newCats = course.categories.map(c => {
            if (c.id === catId) return { ...c, items: [...c.items, newItem] };
            return c;
        });
        onUpdate({ ...course, categories: newCats });
    };

    const updateItem = (catId: string, itemId: string, field: keyof GradeItem, value: any) => {
        const newCats = course.categories.map(c => {
            if (c.id === catId) {
                const newItems = c.items.map(i => i.id === itemId ? { ...i, [field]: value } : i);
                return { ...c, items: newItems };
            }
            return c;
        });
        onUpdate({ ...course, categories: newCats });
    };

    const deleteItem = (catId: string, itemId: string) => {
        const newCats = course.categories.map(c => {
            if (c.id === catId) {
                return { ...c, items: c.items.filter(i => i.id !== itemId) };
            }
            return c;
        });
        onUpdate({ ...course, categories: newCats });
    };

    const handleReset = () => {
        setConfirmAction({ type: 'reset' });
    };

    // --- VISUAL HELPERS ---

    const getGradeColor = (grade: number) => {
        if (grade >= 90) return theme.accent;
        if (grade >= 80) return theme.success;
        if (grade >= 70) return theme.warning;
        return theme.danger;
    };

    const circularColor = getGradeColor(currentAverage);

    return (
        <div style={{ paddingBottom: '100px' }}>
            {/* --- TOP BAR --- */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '12px', padding: '10px', color: '#fff', cursor: 'pointer' }}>
                    <ArrowLeft size={20} />
                </button>
                <div style={{ flex: 1 }}>
                    <input 
                        value={localTitle}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.3rem', fontWeight: 800, width: '100%', outline: 'none' }}
                        placeholder="Course Name"
                    />
                </div>
            </div>

            {/* --- DASHBOARD CARD --- */}
            <div style={{ ...styles.card, background: 'linear-gradient(145deg, rgba(30,30,40,0.8), rgba(20,20,30,0.9))', padding: '20px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                
                {/* LEFT: Target + Stats */}
                <div style={{ flex: 1 }}>
                    {/* Target Input (Small) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <span style={{ fontSize: '0.65rem', color: theme.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Target</span>
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                            <input 
                                value={localTarget}
                                onChange={(e) => handleTargetChange(e.target.value)}
                                type="number"
                                style={{ 
                                    background: 'rgba(255,255,255,0.1)', 
                                    border: 'none', 
                                    borderRadius: '16px', 
                                    color: '#fff', 
                                    fontSize: '0.8rem', 
                                    fontWeight: 700, 
                                    width: '45px', 
                                    padding: '4px 8px', 
                                    textAlign: 'center' 
                                }}
                            />
                            <span style={{ position: 'absolute', right: '-10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: theme.textMuted }}>%</span>
                        </div>
                    </div>

                    {/* Detailed Stats */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        
                        {/* Performance (Average) */}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: theme.textMuted, marginBottom: '2px', fontWeight: 600 }}>
                                <Award size={12} /> Average Performance
                            </div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: getGradeColor(currentAverage) }}>
                                {currentAverage.toFixed(1)}%
                            </div>
                        </div>

                    </div>
                </div>

                {/* RIGHT: Big Circle (ACCUMULATED GRADE) */}
                <div style={{ position: 'relative', width: '100px', height: '100px' }}>
                    <svg width="100" height="100" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx="60" cy="60" r="52" stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="none" />
                        <circle 
                            cx="60" cy="60" r="52" 
                            stroke={circularColor} 
                            strokeWidth="8" 
                            fill="none" 
                            strokeDasharray={326}
                            // Fill based on totalWeightedScore (0-100)
                            strokeDashoffset={326 - ((Math.min(totalWeightedScore, 100) / 100) * 326)}
                            strokeLinecap="round"
                            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                        />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '0.6rem', color: theme.textMuted, fontWeight: 700, textTransform: 'uppercase' }}>Course Grade</span>
                        <span style={{ fontSize: '1.5rem', color: '#fff', fontWeight: 800, lineHeight: 1, letterSpacing: '-1px' }}>
                            {totalWeightedScore.toFixed(1)}%
                        </span>
                        <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px', fontWeight: 500 }}>
                            Score
                        </span>
                    </div>
                </div>
            </div>

            {/* --- PREDICTOR BANNER --- */}
            <div style={{ marginBottom: '20px', padding: '14px', borderRadius: '14px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', gap: '12px' }}>
                <TrendingUp size={20} className="text-blue-400 shrink-0" />
                <div>
                    <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#93c5fd' }}>Path to Victory</h4>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>
                        {remainingWeight <= 0 ? (
                             pointsNeeded <= 0 ? "You've reached your target! Great job." : "No weight remaining. Extra credit needed!"
                        ) : neededAverage > 100 ? (
                             `You need >100% on remaining work. Target may be out of reach.`
                        ) : neededAverage <= 0 ? (
                             `You've already secured a ${target}%.`
                        ) : (
                             <>To get <b>{target}%</b>, you need to average <b>{neededAverage.toFixed(1)}%</b> on the remaining <b>{remainingWeight}%</b> weight.</>
                        )}
                    </p>
                </div>
            </div>

            {/* --- CATEGORY LIST --- */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {course.categories.map((cat) => (
                    <CategoryCard 
                        key={cat.id}
                        cat={cat}
                        updateCategory={updateCategory}
                        deleteCategory={deleteCategory}
                        addItem={addItem}
                        updateItem={updateItem}
                        deleteItem={deleteItem}
                        singularize={singularize}
                        getCategoryStats={getCategoryStats}
                    />
                ))}

                <button 
                    onClick={addCategory}
                    style={{ ...styles.button, width: '100%', justifyContent: 'center', padding: '14px', fontSize: '0.95rem', marginTop: '8px' }}
                >
                    <Plus size={18} /> Add Category
                </button>

                {course.categories.length > 0 && (
                     <button 
                        onClick={handleReset}
                        style={{ background: 'transparent', border: 'none', color: theme.danger, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px', opacity: 0.8 }}
                    >
                        <RotateCcw size={14} /> Reset All Grades
                    </button>
                )}
            </div>

            <ConfirmModal 
                isOpen={!!confirmAction}
                title={confirmAction?.type === 'deleteCategory' ? "Delete Category?" : "Reset All?"}
                message={confirmAction?.type === 'deleteCategory' ? "This category and its grades will be removed." : "This will wipe all grades for this course. Are you sure?"}
                onConfirm={executeConfirm}
                onCancel={() => setConfirmAction(null)}
            />
        </div>
    );
};

export default UniversalGradeCalculator;
