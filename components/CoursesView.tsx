
import React, { useState, useEffect } from 'react';
import { CourseGrade } from '../types';
import { generateId } from '../constants';
import { Plus, GraduationCap, BookOpen, Trash2, AlertTriangle, X, Calculator, ArrowLeft, Save, CheckCircle2 } from 'lucide-react';
import { styles } from '../theme';


interface CoursesViewProps {
  courses: CourseGrade[];
  onSelectCourse: (id: string) => void;
  onAddCourse: () => void;
  onDeleteCourse: (id: string) => void;
  onUpdateCourse: (course: CourseGrade) => void;
}

// --- GPA TYPES ---
interface GPACourse {
    id: string;
    name: string;
    credits: number;
    gradePoint: number; // The numeric value used for calculation (e.g., 4.0 or 1.0)
    percent: string;    // Store as string for input handling
    isPercentMode: boolean;
}

interface Semester {
    id: string;
    name: string;
    courses: GPACourse[];
}

interface GradeScaleItem {
    label: string;
    value: number;
    min: number;
}

interface GradingSystem {
    name: string;
    lowIsBetter: boolean; // false = standard (4.0 is good), true = german (1.0 is good)
    scale: GradeScaleItem[];
}

const SYSTEMS: Record<string, GradingSystem> = {
    'US': {
        name: 'US Standard (4.0)',
        lowIsBetter: false,
        scale: [
            { label: 'A', value: 4.0, min: 93 },
            { label: 'A-', value: 3.7, min: 90 },
            { label: 'B+', value: 3.3, min: 87 },
            { label: 'B', value: 3.0, min: 83 },
            { label: 'B-', value: 2.7, min: 80 },
            { label: 'C+', value: 2.3, min: 77 },
            { label: 'C', value: 2.0, min: 73 },
            { label: 'C-', value: 1.7, min: 70 },
            { label: 'D+', value: 1.3, min: 67 },
            { label: 'D', value: 1.0, min: 63 },
            { label: 'F', value: 0.0, min: 0 },
        ]
    },
    'GERMAN': {
        name: 'German (1.0-5.0)',
        lowIsBetter: true,
        scale: [
            { label: 'A+', value: 1.0, min: 97 },
            { label: 'A', value: 1.3, min: 93 },
            { label: 'A-', value: 1.7, min: 90 },
            { label: 'B+', value: 2.0, min: 87 },
            { label: 'B', value: 2.3, min: 83 },
            { label: 'B-', value: 2.7, min: 80 },
            { label: 'C+', value: 3.0, min: 77 },
            { label: 'C', value: 3.3, min: 73 },
            { label: 'C-', value: 3.7, min: 67 },
            { label: 'D+', value: 4.0, min: 60 },
            { label: 'D', value: 4.0, min: 50 },
            { label: 'F', value: 5.0, min: 0 },
        ]
    }
};

// --- HELPER TO CALCULATE COURSE STATS ---
const calculateCourseStats = (course: CourseGrade) => {
    let accumulatedPoints = 0;
    let weightCompleted = 0;

    course.categories.forEach(cat => {
        const weight = parseFloat(cat.weight) || 0;
        const usableItems = cat.items.filter(i => i.active !== false && i.score !== '' && i.total !== '' && parseFloat(i.total) > 0);
        
        if (usableItems.length > 0) {
            const withPercent = usableItems.map(i => ({
                pct: parseFloat(i.score) / parseFloat(i.total)
            })).sort((a, b) => a.pct - b.pct);

            const dropCount = parseInt(cat.dropLowest) || 0;
            const kept = withPercent.slice(dropCount);
            
            if (kept.length > 0) {
                const sumPct = kept.reduce((a, b) => a + b.pct, 0);
                const catAvg = sumPct / kept.length;
                
                accumulatedPoints += catAvg * weight;
                weightCompleted += weight;
            }
        }
    });

    const performance = weightCompleted > 0 ? (accumulatedPoints / weightCompleted) * 100 : 0;
    return { accumulatedPoints, performance, weightCompleted };
};

const calculateCoursePercentage = (course: CourseGrade): number => {
    const stats = calculateCourseStats(course);
    return stats.performance;
};

// --- SCHEMA EDITOR MODAL ---
const SchemaEditor = ({ 
    isOpen, 
    onClose, 
    system, 
    onSave 
}: { 
    isOpen: boolean, 
    onClose: () => void, 
    system: GradingSystem, 
    onSave: (newSystem: GradingSystem) => void 
}) => {
    const [localSystem, setLocalSystem] = useState<GradingSystem>(system);

    useEffect(() => {
        setLocalSystem(system);
    }, [system, isOpen]);

    if (!isOpen) return null;

    const handleUpdateItem = (index: number, field: keyof GradeScaleItem, value: any) => {
        const newScale = [...localSystem.scale];
        newScale[index] = { ...newScale[index], [field]: value };
        setLocalSystem({ ...localSystem, scale: newScale });
    };

    const handleApplyPreset = (presetKey: string) => {
        if(SYSTEMS[presetKey]) {
            setLocalSystem(JSON.parse(JSON.stringify(SYSTEMS[presetKey])));
        }
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-[#1c1c1e] border border-white/10 rounded-3xl w-full max-w-sm flex flex-col shadow-2xl relative animate-in zoom-in-95 max-h-[85vh]" onClick={e => e.stopPropagation()}>
                
                {/* Header - Fixed */}
                <div className="flex justify-between items-center p-5 border-b border-white/5 shrink-0">
                    <div>
                        <h3 className="text-base font-bold text-white">Grading Schema</h3>
                        <p className="text-white/40 text-[10px]">Configure your GPA system</p>
                    </div>
                    <button onClick={onClose} className="text-white/40 hover:text-white bg-white/5 p-1.5 rounded-full transition-colors"><X size={16} /></button>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
                    {/* Preset Selector */}
                    <div className="space-y-2">
                        <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Load Preset</label>
                        <div className="flex gap-2">
                            {Object.keys(SYSTEMS).map(key => (
                                <button
                                    key={key}
                                    onClick={() => handleApplyPreset(key)}
                                    className={`flex-1 py-2 px-3 rounded-xl text-[10px] font-bold transition-all border ${
                                        localSystem.name === SYSTEMS[key].name 
                                        ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300' 
                                        : 'bg-white/5 border-transparent text-white/60 hover:bg-white/10'
                                    }`}
                                >
                                    {key}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Configuration */}
                    <div className="bg-black/20 rounded-xl p-4 space-y-4 border border-white/5">
                        <div>
                            <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block mb-1.5">System Name</label>
                            <input 
                                value={localSystem.name}
                                onChange={(e) => setLocalSystem({ ...localSystem, name: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Lower GPA is Better?</label>
                            <button 
                                onClick={() => setLocalSystem({ ...localSystem, lowIsBetter: !localSystem.lowIsBetter })}
                                className={`w-8 h-5 rounded-full relative transition-colors ${localSystem.lowIsBetter ? 'bg-indigo-500' : 'bg-white/10'}`}
                            >
                                <div className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform ${localSystem.lowIsBetter ? 'translate-x-3' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </div>

                    {/* Grade Table */}
                    <div>
                        <div className="grid grid-cols-[1fr_60px_60px] gap-2 mb-2 px-1">
                            <div className="text-[9px] font-bold text-white/30 uppercase">Grade</div>
                            <div className="text-[9px] font-bold text-white/30 uppercase text-center">Value</div>
                            <div className="text-[9px] font-bold text-white/30 uppercase text-center">Min %</div>
                        </div>

                        <div className="space-y-2">
                            {localSystem.scale.map((item, idx) => (
                                <div key={idx} className="grid grid-cols-[1fr_60px_60px] gap-2 items-center bg-white/5 p-2 rounded-xl border border-white/5">
                                    <input 
                                        type="text"
                                        value={item.label}
                                        onChange={(e) => handleUpdateItem(idx, 'label', e.target.value)}
                                        className="bg-transparent font-bold text-white pl-2 w-full focus:outline-none text-xs"
                                    />
                                    <input 
                                        type="number" 
                                        value={item.value} 
                                        onChange={(e) => handleUpdateItem(idx, 'value', parseFloat(e.target.value))}
                                        className="bg-black/20 text-white text-center py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                    <input 
                                        type="number" 
                                        value={item.min} 
                                        onChange={(e) => handleUpdateItem(idx, 'min', parseFloat(e.target.value))}
                                        className="bg-black/20 text-white text-center py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer - Fixed */}
                <div className="flex gap-3 p-5 border-t border-white/5 shrink-0 bg-[#1c1c1e] rounded-b-3xl">
                    <button 
                        onClick={onClose}
                        className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl transition-colors font-bold text-xs"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={() => { onSave(localSystem); onClose(); }}
                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-900/20 text-xs"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- IMPORT MODAL ---
const ImportModal = ({ 
    isOpen, 
    onClose, 
    courses, 
    semesters, 
    system,
    onImport,
    defaultTargetSemesterId
}: { 
    isOpen: boolean, 
    onClose: () => void, 
    courses: CourseGrade[], 
    semesters: Semester[], 
    system: GradingSystem,
    onImport: (selectedCourseIds: string[], targetSemesterId: string | 'new') => void,
    defaultTargetSemesterId?: string | 'new'
}) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [targetSemester, setTargetSemester] = useState<string>('new');

    useEffect(() => {
        if (isOpen) {
            setTargetSemester(defaultTargetSemesterId || 'new');
        }
    }, [isOpen, defaultTargetSemesterId]);

    if (!isOpen) return null;

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleImport = () => {
        onImport(Array.from(selectedIds), targetSemester);
        onClose();
        setSelectedIds(new Set());
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-[#1c1c1e] border border-white/10 rounded-3xl w-full max-w-sm p-6 shadow-2xl relative animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-white">Import Grades</h3>
                    <button onClick={onClose} className="text-white/40 hover:text-white"><X size={20} /></button>
                </div>

                <div className="mb-4 max-h-[300px] overflow-y-auto custom-scrollbar space-y-2">
                    {courses.length === 0 ? (
                        <p className="text-white/40 text-sm text-center py-4">No courses available to import.</p>
                    ) : (
                        courses.map(course => {
                            const pct = calculateCoursePercentage(course);
                            const grade = system.scale.find(g => pct >= g.min) || system.scale[system.scale.length - 1];
                            const isSelected = selectedIds.has(course.id);

                            return (
                                <div 
                                    key={course.id} 
                                    onClick={() => toggleSelection(course.id)}
                                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-indigo-600/20 border-indigo-500/50' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-white/30'}`}>
                                            {isSelected && <CheckCircle2 size={12} className="text-white" />}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-white">{course.title}</div>
                                            <div className="text-xs text-white/40">{pct.toFixed(1)}%</div>
                                        </div>
                                    </div>
                                    <div className="text-base font-bold text-indigo-300">{grade.label}</div>
                                </div>
                            );
                        })
                    )}
                </div>

                {courses.length > 0 && (
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5 block">Target Semester</label>
                            <select 
                                value={targetSemester} 
                                onChange={(e) => setTargetSemester(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                            >
                                <option value="new">+ New Semester</option>
                                {semesters.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        <button 
                            onClick={handleImport}
                            disabled={selectedIds.size === 0}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-900/20 text-sm"
                        >
                            Import {selectedIds.size} Courses
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- GPA CALCULATOR COMPONENT ---
const GPACalculator = ({ courses, onBack }: { courses: CourseGrade[], onBack: () => void }) => {
    const [semesters, setSemesters] = useState<Semester[]>([
        { id: '1', name: 'Semester 1', courses: [] }
    ]);
    // Initialize with US Standard
    const [currentSystem, setCurrentSystem] = useState<GradingSystem>(SYSTEMS['US']);
    
    const [showImport, setShowImport] = useState(false);
    const [importTargetId, setImportTargetId] = useState<string | 'new'>('new');
    const [showSchema, setShowSchema] = useState(false);

    const getGradePointFromPercent = (pct: number) => {
        const grade = currentSystem.scale.find(g => pct >= g.min) || currentSystem.scale[currentSystem.scale.length - 1];
        return grade.value;
    };

    const calculateGPA = () => {
        let totalPoints = 0;
        let totalCredits = 0;
        
        semesters.forEach(sem => {
            sem.courses.forEach(c => {
                totalPoints += c.gradePoint * c.credits;
                totalCredits += c.credits;
            });
        });

        return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "0.00";
    };

    const calculateSemesterStats = (courses: GPACourse[]) => {
        let totalPoints = 0;
        let totalCredits = 0;
        
        courses.forEach(c => {
            totalPoints += c.gradePoint * c.credits;
            totalCredits += c.credits;
        });

        return {
            gpa: totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "0.00",
            totalCredits
        };
    };

    const addSemester = () => {
        let baseName = "Semester";
        let name = `${baseName} ${semesters.length + 1}`;
        let counter = semesters.length + 1;
        while (semesters.some(s => s.name.toLowerCase() === name.toLowerCase())) {
            counter++;
            name = `${baseName} ${counter}`;
        }
        setSemesters([...semesters, { 
            id: generateId(), 
            name: name, 
            courses: [] 
        }]);
    };

    const addCourse = (semesterId: string) => {
        setSemesters(semesters.map(sem => {
            if (sem.id === semesterId) {
                let baseName = "New Course";
                let name = baseName;
                let counter = 1;
                while (sem.courses.some(c => c.name.toLowerCase() === name.toLowerCase())) {
                    name = `${baseName} (${counter})`;
                    counter++;
                }
                return {
                    ...sem,
                    courses: [...sem.courses, { 
                        id: generateId(), 
                        name: name, 
                        credits: 3, 
                        gradePoint: currentSystem.scale[0].value, 
                        percent: '95', 
                        isPercentMode: false 
                    }]
                };
            }
            return sem;
        }));
    };

    const updateCourse = (semesterId: string, courseId: string, updates: Partial<GPACourse>) => {
        setSemesters(semesters.map(sem => {
            if (sem.id === semesterId) {
                return {
                    ...sem,
                    courses: sem.courses.map(c => c.id === courseId ? { ...c, ...updates } : c)
                };
            }
            return sem;
        }));
    };

    const deleteCourse = (semesterId: string, courseId: string) => {
        setSemesters(semesters.map(sem => {
            if (sem.id === semesterId) {
                return {
                    ...sem,
                    courses: sem.courses.filter(c => c.id !== courseId)
                };
            }
            return sem;
        }));
    };

    const deleteSemester = (semesterId: string) => {
        setSemesters(semesters.filter(s => s.id !== semesterId));
    };

    const handleImportCourses = (selectedIds: string[], targetSemesterId: string | 'new') => {
        const newGPACourses: GPACourse[] = selectedIds.map(id => {
            const original = courses.find(c => c.id === id);
            if (!original) return null;
            const stats = calculateCourseStats(original);
            const pct = stats.performance;
            const grade = currentSystem.scale.find(g => pct >= g.min) || currentSystem.scale[currentSystem.scale.length - 1];
            return {
                id: generateId(),
                name: original.title,
                credits: 3, // Default credit
                gradePoint: grade.value,
                percent: pct.toFixed(1),
                isPercentMode: true // Default to percent mode for imports
            };
        }).filter(Boolean) as GPACourse[];

        if (targetSemesterId === 'new') {
            const newSem: Semester = {
                id: generateId(),
                name: `Imported Semester`,
                courses: newGPACourses
            };
            setSemesters([...semesters, newSem]);
        } else {
            setSemesters(semesters.map(s => {
                if (s.id === targetSemesterId) {
                    return { ...s, courses: [...s.courses, ...newGPACourses] };
                }
                return s;
            }));
        }
    };

    const gpa = calculateGPA();
    const gpaNum = parseFloat(gpa);
    
    // Determine Color based on System (Invert logic for German/Low-Better systems)
    let gpaColor = 'text-white';
    if (!currentSystem.lowIsBetter) {
        // Standard (High is good)
        gpaColor = gpaNum >= 3.5 ? 'text-emerald-400' : gpaNum >= 3.0 ? 'text-blue-400' : gpaNum >= 2.0 ? 'text-yellow-400' : 'text-red-400';
    } else {
        // German (Low is good: 1.0 is best, 4.0 is pass)
        gpaColor = gpaNum <= 1.5 ? 'text-emerald-400' : gpaNum <= 2.5 ? 'text-blue-400' : gpaNum <= 3.5 ? 'text-yellow-400' : 'text-red-400';
    }

    return (
        <div style={styles.scrollableContent} className="relative animate-in fade-in slide-in-from-right-4 pb-32">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 pt-2">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="w-8 h-8 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center transition-colors">
                        <ArrowLeft size={18} className="text-white" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-white leading-tight">GPA Calculator</h1>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-white/50 text-xs">Schema:</span>
                            <span className="text-indigo-400 text-xs font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">{currentSystem.name}</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setShowSchema(true)}
                        className="text-[10px] font-bold bg-white/5 text-white/60 hover:text-white px-3 py-1.5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors flex items-center gap-2"
                        title="Grading Schema"
                    >
                        <GraduationCap size={14} /> Grading Schema
                    </button>
                </div>
            </div>

            {/* Score Card */}
            <div className="bg-gradient-to-br from-indigo-900/40 to-[#12141a] border border-indigo-500/20 rounded-3xl p-6 mb-6 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[50px] rounded-full pointer-events-none"></div>
                <div className="relative z-10">
                    <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Cumulative GPA</div>
                    <div className={`text-6xl font-black ${gpaColor} mb-2 tracking-tighter`}>{gpa}</div>
                    <div className="text-xs text-white/40 font-medium">
                        Total Credits: <span className="text-white">{semesters.reduce((acc, s) => acc + s.courses.reduce((a, c) => a + c.credits, 0), 0)}</span>
                    </div>
                </div>
            </div>

            {/* Semesters */}
            <div className="space-y-4 pb-20">
                {semesters.map((sem) => {
                    const semStats = calculateSemesterStats(sem.courses);
                    return (
                    <div key={sem.id} className="bg-[#1c1c1e] border border-white/5 rounded-2xl overflow-hidden">
                        <div className="p-3 bg-white/[0.02] border-b border-white/5 flex items-center justify-between gap-3">
                            <input 
                                value={sem.name}
                                onChange={(e) => setSemesters(semesters.map(s => s.id === sem.id ? { ...s, name: e.target.value } : s))}
                                className="bg-transparent border-none text-sm font-bold text-white focus:outline-none flex-1 min-w-0"
                            />
                            <div className="flex items-center gap-3">
                                <div className="text-[10px] font-bold text-white/40 bg-white/5 px-2 py-1 rounded border border-white/5">
                                    GPA <span className="text-white ml-1">{semStats.gpa}</span>
                                </div>
                                <button onClick={() => deleteSemester(sem.id)} className="text-white/20 hover:text-red-400 p-1">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                        
                        <div className="p-2 space-y-1">
                            {sem.courses.length > 0 && (
                                <div className="grid grid-cols-[1fr_45px_90px_45px_30px] px-2 mb-1 gap-2">
                                    <div className="text-[9px] font-bold text-white/30 uppercase">Course</div>
                                    <div className="text-[9px] font-bold text-white/30 uppercase text-center">Credit</div>
                                    <div className="text-[9px] font-bold text-white/30 uppercase text-center">Grade</div>
                                    <div className="text-[9px] font-bold text-white/30 uppercase text-center">GPA</div>
                                    <div></div>
                                </div>
                            )}

                            {sem.courses.map((course) => (
                                <div key={course.id} className="grid grid-cols-[1fr_45px_90px_45px_30px] gap-2 items-center bg-white/[0.03] p-2 rounded-xl">
                                    <input 
                                        value={course.name}
                                        onChange={(e) => updateCourse(sem.id, course.id, { name: e.target.value })}
                                        className="bg-transparent text-xs text-white font-medium focus:outline-none w-full"
                                        placeholder="Course Name"
                                    />
                                    <input 
                                        type="number"
                                        value={course.credits}
                                        onChange={(e) => updateCourse(sem.id, course.id, { credits: parseFloat(e.target.value) || 0 })}
                                        className="bg-black/20 text-xs text-white text-center py-1 rounded focus:outline-none"
                                    />
                                    
                                    <div className="flex gap-1 items-center bg-black/20 rounded p-0.5">
                                        {course.isPercentMode ? (
                                            <input 
                                                type="number"
                                                value={course.percent}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    const num = parseFloat(val);
                                                    updateCourse(sem.id, course.id, { 
                                                        percent: val,
                                                        gradePoint: isNaN(num) ? 0 : getGradePointFromPercent(num)
                                                    });
                                                }}
                                                className="w-full bg-transparent text-xs text-white text-center py-0.5 focus:outline-none placeholder-white/20"
                                                placeholder="%"
                                            />
                                        ) : (
                                            <select 
                                                value={course.gradePoint}
                                                onChange={(e) => updateCourse(sem.id, course.id, { gradePoint: parseFloat(e.target.value) })}
                                                className="w-full bg-transparent text-xs text-white text-center py-0.5 focus:outline-none appearance-none"
                                            >
                                                {currentSystem.scale.map(g => (
                                                    <option key={g.label} value={g.value}>{g.label}</option>
                                                ))}
                                            </select>
                                        )}
                                        <button 
                                            onClick={() => updateCourse(sem.id, course.id, { isPercentMode: !course.isPercentMode })}
                                            className={`p-1 rounded text-[8px] font-bold uppercase transition-colors shrink-0 ${course.isPercentMode ? 'bg-indigo-500 text-white' : 'bg-white/10 text-white/50 hover:text-white'}`}
                                            title="Toggle Grade Mode"
                                        >
                                            {course.isPercentMode ? '%' : 'ABC'}
                                        </button>
                                    </div>

                                    <div className="text-center text-xs font-bold text-white/50 bg-white/5 py-1 rounded">
                                        {course.gradePoint.toFixed(1)}
                                    </div>

                                    <button onClick={() => deleteCourse(sem.id, course.id)} className="flex items-center justify-center text-white/20 hover:text-red-400">
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}

                            <div className="flex gap-2 mt-2">
                                <button 
                                    onClick={() => addCourse(sem.id)}
                                    className="flex-1 py-2 flex items-center justify-center gap-1 text-[10px] font-bold text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors border border-dashed border-white/10"
                                >
                                    <Plus size={12} /> Add Course
                                </button>
                                {courses.length > 0 && (
                                    <button 
                                        onClick={() => { setImportTargetId(sem.id); setShowImport(true); }}
                                        className="flex-1 py-2 flex items-center justify-center gap-1 text-[10px] font-bold text-indigo-300/60 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-colors border border-dashed border-indigo-500/20"
                                    >
                                        <Save size={12} /> Import
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )})}

                <button 
                    onClick={addSemester}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl border border-white/5 transition-all text-xs flex items-center justify-center gap-2"
                >
                    <Plus size={14} /> Add Semester
                </button>
            </div>

            <ImportModal 
                isOpen={showImport}
                onClose={() => setShowImport(false)}
                courses={courses}
                semesters={semesters}
                system={currentSystem}
                onImport={handleImportCourses}
                defaultTargetSemesterId={importTargetId}
            />

            <SchemaEditor 
                isOpen={showSchema}
                onClose={() => setShowSchema(false)}
                system={currentSystem}
                onSave={setCurrentSystem}
            />
        </div>
    );
};

// --- MAIN COURSES VIEW ---
const CoursesView: React.FC<CoursesViewProps> = ({ courses, onSelectCourse, onAddCourse, onDeleteCourse }) => {
  const [courseToDelete, setCourseToDelete] = useState<CourseGrade | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'gpa'>('list');

  // Calculate Absolute Grade
  const getCourseStats = (course: CourseGrade) => {
      const stats = calculateCourseStats(course);
      
      return {
          grade: stats.accumulatedPoints, // Current obtained grade
          completed: stats.weightCompleted,
          relative: stats.performance // Average performance
      };
  };

  const getGradeColor = (grade: number) => {
      if (grade >= 90) return 'text-emerald-400';
      if (grade >= 80) return 'text-blue-400';
      if (grade >= 70) return 'text-yellow-400';
      if (grade >= 60) return 'text-orange-400';
      return 'text-red-400';
  };

  const promptDelete = (e: React.MouseEvent, course: CourseGrade) => {
      e.stopPropagation();
      e.preventDefault();
      setCourseToDelete(course);
  };

  const confirmDelete = () => {
      if (courseToDelete) {
          onDeleteCourse(courseToDelete.id);
          setCourseToDelete(null);
      }
  };

  if (viewMode === 'gpa') {
      return <GPACalculator courses={courses} onBack={() => setViewMode('list')} />;
  }

  return (
    <div style={styles.scrollableContent} className="relative pb-32">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pt-2">
         <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Grades</h1>
            <p className="text-white/50 text-xs font-medium">Course Overview</p>
         </div>
         <div className="flex gap-2">
             <button 
                onClick={() => setViewMode('gpa')}
                className="h-10 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-white flex items-center gap-2 transition-all active:scale-95"
                title="Open GPA Calculator"
             >
                <Calculator size={16} className="text-indigo-300" />
                <span className="text-xs font-bold">GPA Calculator</span>
             </button>
             <button 
                onClick={onAddCourse} 
                className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
             >
                <Plus size={20} />
             </button>
         </div>
      </div>

      {/* Grid */}
      <div className="grid gap-3 pb-20">
        {courses.map(course => {
          const { grade, completed, relative } = getCourseStats(course);
          const gradeColor = getGradeColor(relative);
          
          return (
            <div 
                key={course.id} 
                onClick={() => onSelectCourse(course.id)}
                className="group relative bg-[#1c1c1e] border border-white/5 rounded-2xl p-4 cursor-pointer hover:bg-white/10 transition-all active:scale-[0.99] overflow-hidden shadow-sm hover:shadow-md"
            >
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-teal-500/20 flex items-center justify-center text-indigo-400 border border-white/5 shrink-0">
                            <BookOpen size={18} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-bold text-base text-white leading-tight truncate pr-2">{course.title}</h3>
                            <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mt-0.5">{course.code || 'No Code'}</p>
                        </div>
                    </div>

                    <div className="text-right shrink-0">
                        <div className={`text-2xl font-black tracking-tight leading-none ${gradeColor}`}>
                            {grade.toFixed(1)}%
                        </div>
                        <div className="text-[9px] font-bold text-white/30 uppercase mt-0.5">
                            Current
                        </div>
                    </div>
                </div>

                <div className="relative h-1.5 w-full bg-white/5 rounded-full overflow-hidden mb-3">
                    <div 
                        className="absolute top-0 left-0 h-full bg-white/20 transition-all duration-1000" 
                        style={{ width: `${Math.min(completed, 100)}%` }} 
                    />
                    <div 
                        className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ${gradeColor}`} 
                        style={{ width: `${Math.min(grade, 100)}%` }} 
                    />
                </div>
                
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="text-[10px] font-bold text-white/40">
                            <span className="text-white/60">{completed.toFixed(0)}%</span> Weight
                        </div>
                        {completed > 0 && (
                            <>
                                <div className="w-px h-2 bg-white/10"></div>
                                <div className="text-[10px] font-bold text-white/40">
                                    <span className={gradeColor}>{relative.toFixed(1)}%</span> Avg. Perf
                                </div>
                            </>
                        )}
                    </div>
                    
                    <button
                        onClick={(e) => promptDelete(e, course)}
                        className="text-white/20 hover:text-red-400 transition-colors p-1.5 -mr-1.5 rounded-lg hover:bg-white/5"
                        title="Delete Course"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
          );
        })}

        {courses.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center border-2 border-dashed border-white/5 rounded-2xl bg-white/[0.01]">
                <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mb-4 text-indigo-400">
                    <GraduationCap size={32} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">No courses tracked</h3>
                <p className="text-white/40 text-xs mb-6 max-w-[200px] leading-relaxed">
                    Add a course to start tracking your grades.
                </p>
                <button 
                    onClick={onAddCourse}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2 text-xs"
                >
                    <Plus size={16} /> Create Course
                </button>
            </div>
        )}
      </div>

      {/* Custom Delete Confirmation Modal */}
      {courseToDelete && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div 
                  className="bg-[#1c1c1e] border border-white/10 rounded-3xl w-full max-w-sm p-6 shadow-2xl relative animate-in zoom-in-95"
                  onClick={(e) => e.stopPropagation()}
              >
                  <button 
                      onClick={() => setCourseToDelete(null)} 
                      className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors"
                  >
                      <X size={20} />
                  </button>
                  
                  <div className="flex flex-col items-center mb-6 text-center">
                      <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-4 border border-red-500/20">
                          <AlertTriangle size={32} />
                      </div>
                      <h2 className="text-xl font-bold text-white mb-2">Delete Course?</h2>
                      <p className="text-white/60 text-sm leading-relaxed">
                          Are you sure you want to delete <span className="text-white font-bold">"{courseToDelete.title}"</span>? 
                          <br/>This will permanently remove all associated grades and data.
                      </p>
                  </div>

                  <div className="flex gap-3">
                      <button 
                          onClick={() => setCourseToDelete(null)}
                          className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all text-sm"
                      >
                          Cancel
                      </button>
                      <button 
                          onClick={confirmDelete}
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

export default CoursesView;
