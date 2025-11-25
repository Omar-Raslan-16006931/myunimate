import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import Schedule from './components/Schedule';
import AIChat from './components/AIChat';
import Settings from './components/Settings';
import AddEventModal from './components/AddEventModal';
import GymView from './components/GymView';
import UniversalGradeCalculator from './components/UniversalGradeCalculator';
import { ScheduleEvent, ViewState, MaterialFile, ScheduleProfile, EventColorMap, ExtractedScheduleItem, EventType, CourseGrade, GradeCategory, PeriodDefinition } from './types';
import { INITIAL_EVENTS, INITIAL_FILES, INITIAL_PROFILES, INITIAL_COLORS, INITIAL_PERIODS } from './constants';
import { theme, styles } from './theme';
import { GraduationCap, Folder, BookOpen, Trash2, FileText, File, Upload, Check, X, Brain, Calendar, Clock, MapPin, AlignLeft, Pencil, Send, Plus, ChevronDown, ChevronUp, Sparkles, Loader2, LogOut, RotateCcw, Calculator, ArrowRight, PieChart, AlertTriangle } from 'lucide-react';
import { parseScheduleImage, getChatResponse } from './services/geminiService';

// --- HELPER: Default Grade Structure ---
const createDefaultCourseGrade = (title: string): CourseGrade => ({
    id: Math.random().toString(36).slice(2, 9),
    title: title,
    targetGrade: '90',
    categories: [
        {
            id: Math.random().toString(36).slice(2, 9),
            name: 'Final Exam',
            weight: '40',
            dropLowest: '0',
            items: [
                { id: crypto.randomUUID(), name: 'Final', score: '', total: '100', active: true }
            ]
        },
        {
            id: Math.random().toString(36).slice(2, 9),
            name: 'Midterm',
            weight: '30',
            dropLowest: '0',
            items: [
                { id: crypto.randomUUID(), name: 'Midterm', score: '', total: '100', active: true }
            ]
        },
        {
            id: Math.random().toString(36).slice(2, 9),
            name: 'Quizzes',
            weight: '30',
            dropLowest: '0',
            items: [
                { id: crypto.randomUUID(), name: 'Quiz 1', score: '', total: '100', active: true },
                { id: crypto.randomUUID(), name: 'Quiz 2', score: '', total: '100', active: true }
            ]
        }
    ]
});

// --- Subcomponents for other views ---

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

const CoursesView = ({ 
    events, 
    eventColors,
    onDeleteCourse,
    onEditCourse,
    onAddCourse
}: { 
    events: ScheduleEvent[], 
    eventColors: EventColorMap,
    onDeleteCourse: (name: string) => void,
    onEditCourse: (oldName: string, info: { name: string, code: string, group: string, location: string }) => void,
    onAddCourse: () => void
}) => {
    const uniqueCourses = Array.from(new Set(events.map(e => e.title))).sort();
    const [editingCourse, setEditingCourse] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ name: "", code: "", group: "", location: "" });
    const [courseToDelete, setCourseToDelete] = useState<string | null>(null);

    const startEdit = (name: string, mainEvent: ScheduleEvent | undefined) => {
        setEditingCourse(name);
        setEditForm({
            name: name,
            code: mainEvent?.code || "",
            group: mainEvent?.group || "",
            location: mainEvent?.location || ""
        });
    };

    const saveEdit = () => {
        if (editingCourse && editForm.name.trim()) {
            onEditCourse(editingCourse, editForm);
        }
        setEditingCourse(null);
    };

    return (
        <div style={styles.scrollableContent}>
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>Classes</h1>
                    <p style={styles.subtitle}>Your academic courses</p>
                </div>
                <button 
                    onClick={onAddCourse}
                    style={{...styles.button, borderRadius: '50%', width: '48px', height: '48px', padding: 0, justifyContent: 'center', boxShadow: '0 5px 15px rgba(0,0,0,0.3)'}}
                >
                    <Plus size={24} />
                </button>
            </div>
            
            <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                {uniqueCourses.map(courseName => {
                    const courseEvents = events.filter(e => e.title === courseName);
                    const mainEvent = courseEvents.find(e => e.type === 'lecture') || courseEvents[0];
                    const typeColor = eventColors[mainEvent?.type || 'other'] || eventColors.other;
                    
                    const isEditing = editingCourse === courseName;

                    if (isEditing) {
                        return (
                            <div key={courseName} style={{...styles.card, padding: '20px', borderLeft: `5px solid ${theme.accent}`, marginBottom: 0}}>
                                <h3 style={{marginTop: 0, marginBottom: '16px', fontSize: '1.1rem'}}>Edit Course Details</h3>
                                <div style={{display: 'grid', gap: '12px'}}>
                                    <div>
                                        <label style={styles.label}>Course Name</label>
                                        <input 
                                            value={editForm.name} 
                                            onChange={e => setEditForm({...editForm, name: e.target.value})}
                                            style={styles.input}
                                            placeholder="Course Name"
                                        />
                                    </div>
                                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                                        <div>
                                            <label style={styles.label}>Code</label>
                                            <input 
                                                value={editForm.code} 
                                                onChange={e => setEditForm({...editForm, code: e.target.value})}
                                                style={styles.input}
                                                placeholder="Code"
                                            />
                                        </div>
                                        <div>
                                            <label style={styles.label}>Group</label>
                                            <input 
                                                value={editForm.group} 
                                                onChange={e => setEditForm({...editForm, group: e.target.value})}
                                                style={styles.input}
                                                placeholder="Group"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={styles.label}>Default Location</label>
                                        <input 
                                            value={editForm.location} 
                                            onChange={e => setEditForm({...editForm, location: e.target.value})}
                                            style={styles.input}
                                            placeholder="Location"
                                        />
                                    </div>
                                    <div style={{display: 'flex', gap: '10px', marginTop: '8px'}}>
                                        <button onClick={saveEdit} style={{...styles.button, flex: 1, justifyContent: 'center'}}>
                                            <Check size={18} /> Save Changes
                                        </button>
                                        <button onClick={() => setEditingCourse(null)} style={{...styles.secondaryButton, flex: 1, justifyContent: 'center'}}>
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    }

                    return (
                        <div key={courseName} style={{...styles.card, padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0, borderLeft: `5px solid ${typeColor}`}}>
                            <div>
                                <h2 style={{margin: 0, fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px'}}>{courseName}</h2>
                                <div style={{display: 'flex', gap: '6px', flexWrap: 'wrap'}}>
                                     {mainEvent.code && (
                                         <div style={{backgroundColor: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', color: '#ddd', fontWeight: 600}}>
                                            {mainEvent.code}
                                         </div>
                                     )}
                                     {mainEvent.group && (
                                         <div style={{backgroundColor: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', color: '#ddd', fontWeight: 600}}>
                                            Grp {mainEvent.group}
                                         </div>
                                     )}
                                     {mainEvent.location && (
                                         <div style={{backgroundColor: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', color: '#ddd', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px'}}>
                                            <MapPin size={10} /> {mainEvent.location}
                                         </div>
                                     )}
                                </div>
                            </div>
                            
                            <div style={{display: 'flex', gap: '8px'}}>
                                <button 
                                    onClick={() => startEdit(courseName, mainEvent)}
                                    style={{background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px', padding: '10px', cursor: 'pointer', color: theme.text}}
                                >
                                    <Pencil size={18} />
                                </button>
                                <button 
                                    onClick={() => setCourseToDelete(courseName)}
                                    style={{background: 'rgba(239, 68, 68, 0.1)', border: 'none', borderRadius: '8px', padding: '10px', cursor: 'pointer', color: theme.danger}}
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    )
                })}
                {uniqueCourses.length === 0 && (
                     <div style={{textAlign: 'center', padding: '40px', color: theme.textMuted}}>
                         <BookOpen size={40} className="mx-auto mb-4 opacity-30" />
                         <p>No courses found in schedule.</p>
                     </div>
                )}
            </div>

            <ConfirmModal 
                isOpen={!!courseToDelete}
                title="Delete Course?"
                message={`Are you sure you want to delete "${courseToDelete}"? This will remove ALL classes and events associated with this course.`}
                onConfirm={() => {
                    if (courseToDelete) onDeleteCourse(courseToDelete);
                    setCourseToDelete(null);
                }}
                onCancel={() => setCourseToDelete(null)}
            />
        </div>
    );
};

const FilesView = ({ materials, setMaterials }: { materials: MaterialFile[], setMaterials: React.Dispatch<React.SetStateAction<MaterialFile[]>> }) => {
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
          const newFile: MaterialFile = {
            id: Math.random().toString(36).slice(2, 11),
            name: file.name,
            type: file.type.includes("pdf") ? "pdf" : file.type.includes("image") ? "image" : "other",
            size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
            dateAdded: new Date().toISOString().split('T')[0]
          };
          setMaterials(prev => [...prev, newFile]);
        }
    };
    return (
        <div style={styles.scrollableContent}>
           <div style={styles.header}>
              <div><h1 style={styles.title}>Files</h1><p style={styles.subtitle}>Course materials</p></div>
              <div style={{display: 'flex', gap: '10px'}}>
                <label style={{...styles.button, borderRadius: '50%', width: '44px', height: '44px', padding: 0, justifyContent: 'center'}} htmlFor="file-upload"><Upload size={20} /></label>
                <input id="file-upload" type="file" style={{display: "none"}} onChange={handleFileUpload} />
              </div>
            </div>
            <div style={styles.card}>
              {materials.length === 0 ? <div style={{padding: "60px", textAlign: "center", color: theme.textMuted, fontSize: '0.95rem'}}>No files yet.</div> : 
                materials.sort((a,b) => (a.type === 'folder' ? -1 : 1)).map(file => (
                  <div key={file.id} style={styles.fileItem}>
                    {file.type === 'pdf' && <FileText color={theme.danger} size={22} />}
                    {file.type === 'folder' && <Folder color={theme.accent} fill={theme.accent} fillOpacity={0.2} size={22} />}
                    {file.type === 'image' && <BookOpen color={theme.success} size={22} />}
                    {file.type === 'other' && <File color={theme.textMuted} size={22} />}
                    <div style={{flex: 1}}>
                      <div style={{fontWeight: 600, fontSize: "0.95rem", color: "#fff"}}>{file.name}</div>
                      <div style={{fontSize: "0.75rem", color: theme.textMuted, marginTop: "2px"}}>{file.type === 'folder' ? 'Folder' : `${file.size} • ${file.dateAdded}`}</div>
                    </div>
                    <button onClick={() => setMaterials(prev => prev.filter(m => m.id !== file.id))} style={{padding: "8px", background: "none", border: "none", cursor: "pointer", color: theme.textMuted, opacity: 0.7}}><Trash2 size={18} /></button>
                  </div>
                ))
              }
            </div>
        </div>
    );
};

const CircularProgress = ({ percentage, size = 56, strokeWidth = 5, color = theme.accent }: { percentage: number, size?: number, strokeWidth?: number, color?: string }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const safePercentage = isNaN(percentage) ? 0 : Math.max(0, Math.min(100, percentage));
    const offset = circumference - (safePercentage / 100) * circumference;
    
    return (
        <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                />
            </svg>
            <div style={{ position: 'absolute', fontSize: '0.75rem', fontWeight: 800, color: '#fff' }}>
                {Math.round(safePercentage)}%
            </div>
        </div>
    );
};

const GradesView = ({ grades, setGrades }: { grades: CourseGrade[], setGrades: React.Dispatch<React.SetStateAction<CourseGrade[]>> }) => {
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
    const [newCourseName, setNewCourseName] = useState("");
    const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
    
    // Confirmation Modal State
    const [modalAction, setModalAction] = useState<{ type: 'delete' | 'reset', id?: string } | null>(null);

    // Helper to calculate current average for list view (Using simplified logic for preview)
    const calculateAverage = (course: CourseGrade) => {
        let totalWeighted = 0;
        let totalWeightUsed = 0;
        
        course.categories?.forEach(cat => {
            const catWeight = parseFloat(cat.weight) || 0;
            // Only active items with scores
            const activeItems = cat.items.filter(i => i.active && i.score !== '');
            
            if (activeItems.length === 0) return; // Skip empty categories

            // Simplified average for preview
            const sumPct = activeItems.reduce((acc, i) => {
                 const s = parseFloat(i.score) || 0;
                 const t = parseFloat(i.total) || 100;
                 return acc + (s/t);
            }, 0);
            
            const avg = sumPct / activeItems.length;
            
            totalWeighted += avg * catWeight;
            totalWeightUsed += catWeight; 
        });

        if (totalWeightUsed === 0) return 0; // Default to 0% if no data or no weight used
        return (totalWeighted / totalWeightUsed) * 100;
    };

    const handleAddCourse = () => {
        if (!newCourseName.trim()) return;
        // Use default structure
        const newGrade = createDefaultCourseGrade(newCourseName);
        setGrades([...grades, newGrade]);
        setNewCourseName("");
    };

    const handleUpdateCourse = (updatedCourse: CourseGrade) => {
        setGrades(prev => prev.map(g => g.id === updatedCourse.id ? updatedCourse : g));
    };

    const confirmAction = () => {
        if (modalAction?.type === 'delete' && modalAction.id) {
             setGrades(prev => prev.filter(g => g.id !== modalAction.id));
        } else if (modalAction?.type === 'reset') {
             setGrades([]);
        }
        setModalAction(null);
    };

    const toggleExpand = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedCourseId(expandedCourseId === id ? null : id);
    };

    if (selectedCourseId) {
        const course = grades.find(g => g.id === selectedCourseId);
        if (!course) { setSelectedCourseId(null); return null; }
        return (
            <div style={styles.scrollableContent}>
                <UniversalGradeCalculator 
                    course={course} 
                    onUpdate={handleUpdateCourse} 
                    onBack={() => setSelectedCourseId(null)} 
                />
            </div>
        );
    }

    return (
        <div style={styles.scrollableContent}>
              <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>Grades</h1>
                    <p style={styles.subtitle}>Calculator & Tracker</p>
                </div>
                <div style={{background: `linear-gradient(135deg, ${theme.accent}, #c084fc)`, padding: '10px', borderRadius: '50%', boxShadow: theme.accentGlow}}>
                    <Calculator size={24} color="#fff" />
                </div>
            </div>

            {/* Add Course */}
            <div style={{...styles.card, padding: '16px', display: 'flex', gap: '10px', alignItems: 'center'}}>
                <input 
                    style={{...styles.input, padding: '12px'}} 
                    placeholder="New Course Name..." 
                    value={newCourseName}
                    onChange={e => setNewCourseName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddCourse()}
                />
                <button style={{...styles.button, padding: '12px'}} onClick={handleAddCourse}>
                    <Plus size={20} />
                </button>
            </div>

            {/* Course List */}
            <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                {grades.map(course => {
                    const avg = calculateAverage(course);
                    const color = avg >= 80 ? theme.success : avg >= 60 ? theme.warning : (avg > 0 ? theme.danger : theme.textMuted);
                    const isExpanded = expandedCourseId === course.id;
                    
                    return (
                        <div 
                            key={course.id} 
                            style={{...styles.card, marginBottom: 0, padding: '20px', transition: 'all 0.2s', borderLeft: `4px solid ${color}`}}
                        >
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                <div style={{flex: 1, cursor: 'pointer'}} onClick={() => setSelectedCourseId(course.id)}>
                                    <h2 style={{margin: 0, fontSize: '1.2rem', fontWeight: 700}}>{course.title}</h2>
                                    <p style={{margin: 0, fontSize: '0.8rem', color: theme.textMuted, marginTop: '4px'}}>
                                        Target: {course.targetGrade}% • {course.categories.length} Categories
                                    </p>
                                </div>
                                <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
                                    <div style={{cursor: 'pointer'}} onClick={() => setSelectedCourseId(course.id)}>
                                        <CircularProgress percentage={avg} color={color} />
                                    </div>
                                    <button 
                                        onClick={(e) => toggleExpand(course.id, e)} 
                                        style={{
                                            padding: '8px', 
                                            background: isExpanded ? 'rgba(255,255,255,0.1)' : 'transparent', 
                                            borderRadius: '50%', 
                                            color: theme.textMuted, 
                                            border: 'none', 
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </button>
                                </div>
                            </div>

                            {/* Dropdown Categories */}
                            {isExpanded && (
                                <div style={{marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px', animation: 'fadeIn 0.2s'}}>
                                    <div style={{display: 'grid', gap: '8px'}}>
                                        {course.categories.map(cat => (
                                            <div 
                                                key={cat.id}
                                                onClick={() => setSelectedCourseId(course.id)}
                                                style={{
                                                    display: 'flex', 
                                                    justifyContent: 'space-between', 
                                                    alignItems: 'center',
                                                    padding: '12px',
                                                    backgroundColor: 'rgba(0,0,0,0.2)',
                                                    borderRadius: '12px',
                                                    cursor: 'pointer',
                                                    border: '1px solid rgba(255,255,255,0.03)'
                                                }}
                                                className="hover:bg-white/5 transition-colors"
                                            >
                                                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                                    <div style={{width: '6px', height: '6px', borderRadius: '50%', backgroundColor: theme.accent}}></div>
                                                    <span style={{fontSize: '0.9rem', fontWeight: 600, color: '#fff'}}>{cat.name}</span>
                                                </div>
                                                <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                                                    <span style={{fontSize: '0.8rem', color: theme.textMuted, fontWeight: 500}}>{cat.weight}% Weight</span>
                                                    <ArrowRight size={14} color={theme.textMuted} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed rgba(255,255,255,0.1)'}}>
                                         <button 
                                            onClick={(e) => { e.stopPropagation(); setModalAction({ type: 'delete', id: course.id }); }} 
                                            style={{
                                                background: 'transparent',
                                                color: theme.danger,
                                                border: 'none',
                                                fontSize: '0.8rem',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                opacity: 0.8
                                            }}
                                         >
                                             <Trash2 size={14} /> Delete Course
                                         </button>
                                         <button
                                            onClick={() => setSelectedCourseId(course.id)}
                                            style={{
                                                background: 'transparent',
                                                color: theme.accent,
                                                border: 'none',
                                                fontSize: '0.8rem',
                                                fontWeight: 700,
                                                cursor: 'pointer'
                                            }}
                                         >
                                             Full Calculator
                                         </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                {grades.length === 0 && (
                     <div style={{textAlign: 'center', padding: '40px', color: theme.textMuted, border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '20px'}}>
                         <PieChart size={40} className="mx-auto mb-4 opacity-30" />
                         <p>No courses added yet.</p>
                     </div>
                )}
                
                {grades.length > 0 && (
                    <button 
                        onClick={() => setModalAction({ type: 'reset' })}
                        style={{
                            ...styles.card,
                            marginTop: '24px',
                            marginBottom: '40px',
                            cursor: 'pointer',
                            border: `1px solid ${theme.danger}`,
                            background: 'rgba(239, 68, 68, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            width: '100%',
                            padding: '16px',
                            boxSizing: 'border-box'
                        }}
                    >
                        <RotateCcw size={18} color={theme.danger} />
                        <span style={{color: theme.danger, fontWeight: 700, fontSize: '1rem'}}>Reset All Grades</span>
                    </button>
                )}
            </div>
            
            {/* Modal Renderer */}
            <ConfirmModal 
                isOpen={!!modalAction}
                title={modalAction?.type === 'delete' ? "Delete Course?" : "Reset All Grades?"}
                message={modalAction?.type === 'delete' ? "Are you sure you want to delete this course and all its data?" : "Are you sure you want to delete all grade data? This cannot be undone."}
                onConfirm={confirmAction}
                onCancel={() => setModalAction(null)}
            />

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

const TaskDetailsModal = ({ event, onClose, onEdit, onDelete }: { event: ScheduleEvent, onClose: () => void, onEdit: (e: ScheduleEvent) => void, onDelete: (id: string) => void }) => {
    const [isDeleting, setIsDeleting] = useState(false);
    
    const to12h = (time24: string) => {
        if (!time24) return "";
        const [h, m] = time24.split(":").map(Number);
        const period = h >= 12 ? "PM" : "AM";
        const h12 = h % 12 || 12;
        return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
    };

    return (
        <div style={styles.modalOverlay} onClick={onClose}>
            <div style={{...styles.modalContent, width: '100%', maxWidth: '360px', padding: 0}} onClick={e => e.stopPropagation()}>
                <div style={{padding: '24px', background: `linear-gradient(135deg, ${theme.accent}22 0%, rgba(0,0,0,0) 100%)`, borderBottom: '1px solid rgba(255,255,255,0.1)'}}>
                   <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                       <div style={{backgroundColor: theme.accent, padding: '4px 10px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 700, color: '#fff', textTransform: 'uppercase', marginBottom: '12px', display: 'inline-block'}}>
                           {event.type}
                       </div>
                       <div style={{display: 'flex', gap: '8px'}}>
                            <button 
                                onClick={() => { 
                                    if(isDeleting) {
                                        onDelete(event.id); 
                                        onClose(); 
                                    } else {
                                        setIsDeleting(true);
                                    }
                                }} 
                                style={{
                                    background: isDeleting ? theme.danger : 'rgba(239, 68, 68, 0.2)', 
                                    border: 'none', 
                                    borderRadius: '12px', 
                                    padding: '6px 12px', 
                                    cursor: 'pointer', 
                                    color: isDeleting ? '#fff' : theme.danger, 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '6px', 
                                    fontSize: '0.8rem', 
                                    fontWeight: 600,
                                    transition: 'all 0.2s'
                                }}
                            >
                               {isDeleting ? "Confirm" : <Trash2 size={14} />}
                           </button>
                           <button onClick={() => onEdit(event)} style={{background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '12px', padding: '6px 12px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600}}>
                               <Pencil size={14} /> Edit
                           </button>
                           <button onClick={onClose} style={{background: 'rgba(0,0,0,0.3)', border: 'none', borderRadius: '50%', padding: '6px', cursor: 'pointer', color: '#fff'}}><X size={16} /></button>
                       </div>
                   </div>
                   <h2 style={{margin: '0 0 6px 0', fontSize: '1.4rem', fontWeight: 800, lineHeight: 1.2}}>{event.title}</h2>
                   <div style={{fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', fontWeight: 500}}>{event.code}</div>
                </div>
                
                <div style={{padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px'}}>
                    
                    <div style={{display: 'flex', gap: '16px'}}>
                        <div style={{flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)'}}>
                            <div style={{display: 'flex', alignItems: 'center', gap: '6px', color: theme.textMuted, fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px', textTransform: 'uppercase'}}>
                                <Calendar size={14} /> Date
                            </div>
                            <div style={{fontSize: '0.95rem', fontWeight: 600}}>
                                {new Date(event.date || "").toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric'})}
                            </div>
                        </div>
                        <div style={{flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)'}}>
                             <div style={{display: 'flex', alignItems: 'center', gap: '6px', color: theme.textMuted, fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px', textTransform: 'uppercase'}}>
                                <Clock size={14} /> Time
                            </div>
                            <div style={{fontSize: '0.95rem', fontWeight: 600}}>
                                {to12h(event.startTime)}
                            </div>
                        </div>
                    </div>

                    {event.location && (
                        <div>
                             <div style={styles.label}>Location</div>
                             <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', fontWeight: 500}}>
                                 <MapPin size={18} color={theme.accent} /> {event.location}
                             </div>
                        </div>
                    )}

                    <div>
                        <div style={styles.label}><AlignLeft size={14} style={{display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom'}}/> Description</div>
                        <div style={{fontSize: '0.95rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.8)', backgroundColor: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)'}}>
                            {event.description || "No description provided."}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const VerifyImportModal = ({ items, onConfirm, onCancel }: { items: ExtractedScheduleItem[], onConfirm: () => void, onCancel: () => void }) => {
    const to12h = (time24: string) => {
        if (!time24) return "";
        const [h, m] = time24.split(":").map(Number);
        const period = h >= 12 ? "PM" : "AM";
        const h12 = h % 12 || 12;
        return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
    };
    return (
        <div style={styles.modalOverlay}>
            <div style={{...styles.modalContent, width: '100%', maxWidth: '500px', padding: 0}} onClick={e => e.stopPropagation()}>
                <div style={{padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                    <h2 style={{margin: 0, fontSize: '1.2rem'}}>Verify Schedule</h2>
                    <button onClick={onCancel} style={{background: 'none', border: 'none', cursor: 'pointer', color: '#fff'}}><X size={24} /></button>
                </div>
                <div style={{padding: '20px', maxHeight: '60vh', overflowY: 'auto'}}>
                    <p style={{fontSize: '0.9rem', color: theme.textMuted, marginBottom: '16px'}}>
                        Found {items.length} classes. Please review before importing.
                    </p>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                        {items.map((item, i) => (
                            <div key={i} style={{backgroundColor: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)'}}>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                                    <div>
                                        <div style={{fontWeight: 700, fontSize: '1rem', color: '#fff'}}>{item.course_name || "Unknown Course"}</div>
                                        <div style={{fontSize: '0.8rem', color: theme.textMuted, marginTop: '2px'}}>{item.type} • {item.room}</div>
                                    </div>
                                    <div style={{textAlign: 'right'}}>
                                        <div style={{fontSize: '0.8rem', fontWeight: 600, color: theme.accent}}>{item.day}</div>
                                        <div style={{fontSize: '0.75rem', color: theme.textMuted}}>{to12h(item.time_start)} - {to12h(item.time_end)}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div style={{padding: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '10px'}}>
                    <button style={{...styles.secondaryButton, flex: 1, justifyContent: 'center'}} onClick={onCancel}>Cancel</button>
                    <button style={{...styles.button, flex: 1, justifyContent: 'center'}} onClick={onConfirm}>
                        <Check size={18} /> Confirm Import
                    </button>
                </div>
            </div>
        </div>
    );
}

const App: React.FC = () => {
  const [session, setSession] = useState<any | null>(null);
  const [isTestMode, setIsTestMode] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- Persistent State Initialization ---
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  
  const [events, setEvents] = useState<ScheduleEvent[]>(() => {
      const saved = localStorage.getItem('college-container-events');
      return saved ? JSON.parse(saved) : INITIAL_EVENTS;
  });
  
  const [materials, setMaterials] = useState<MaterialFile[]>(() => {
      const saved = localStorage.getItem('college-container-materials');
      return saved ? JSON.parse(saved) : INITIAL_FILES;
  });

  const [profiles, setProfiles] = useState<ScheduleProfile[]>(() => {
      const saved = localStorage.getItem('college-container-profiles');
      return saved ? JSON.parse(saved) : INITIAL_PROFILES;
  });

  const [activeProfileId, setActiveProfileId] = useState<string>(() => {
      const saved = localStorage.getItem('college-container-active-profile');
      return saved ? JSON.parse(saved) : "main";
  });

  const [grades, setGrades] = useState<CourseGrade[]>(() => {
      const saved = localStorage.getItem('college-container-grades');
      return saved ? JSON.parse(saved) : [];
  });

  const [periods, setPeriods] = useState<PeriodDefinition[]>(() => {
      const saved = localStorage.getItem('college-container-periods');
      return saved ? JSON.parse(saved) : INITIAL_PERIODS;
  });

  const [eventColors, setEventColors] = useState<EventColorMap>(INITIAL_COLORS);
  
  // --- Effects for Persistence ---
  useEffect(() => localStorage.setItem('college-container-events', JSON.stringify(events)), [events]);
  useEffect(() => localStorage.setItem('college-container-materials', JSON.stringify(materials)), [materials]);
  useEffect(() => localStorage.setItem('college-container-profiles', JSON.stringify(profiles)), [profiles]);
  useEffect(() => localStorage.setItem('college-container-active-profile', JSON.stringify(activeProfileId)), [activeProfileId]);
  useEffect(() => localStorage.setItem('college-container-grades', JSON.stringify(grades)), [grades]);
  useEffect(() => localStorage.setItem('college-container-periods', JSON.stringify(periods)), [periods]);

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ScheduleEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<Partial<ScheduleEvent> | null>(null);

  const [extractedEvents, setExtractedEvents] = useState<ExtractedScheduleItem[]>([]);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // File to Base64 helper
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
  };

  const handleAddEvent = (eventData: Partial<ScheduleEvent>) => {
    if (eventData.title && eventData.startTime) {
       if (eventData.id) {
           // Edit
           setEvents(prev => prev.map(e => e.id === eventData.id ? { ...e, ...eventData } as ScheduleEvent : e));
       } else {
           // Create
           const newEvent: ScheduleEvent = {
             id: Math.random().toString(36).slice(2, 11),
             scheduleId: activeProfileId,
             title: eventData.title,
             code: eventData.code,
             group: eventData.group,
             type: eventData.type || 'lecture',
             isRecurring: eventData.isRecurring || false,
             dayOfWeek: eventData.dayOfWeek,
             date: eventData.date,
             startTime: eventData.startTime,
             durationMinutes: eventData.durationMinutes || 90,
             location: eventData.location,
             description: eventData.description
           };
           setEvents(prev => [...prev, newEvent]);

           // Sync with Grades: Add course if it doesn't exist AND it is a course type
           const excludedTypes = ['quiz', 'assignment', 'exam', 'study', 'other'];
           const isCourseEvent = !excludedTypes.includes(eventData.type || 'lecture');

           if (isCourseEvent && !grades.find(g => g.title === eventData.title)) {
               const newCourse = createDefaultCourseGrade(eventData.title || 'New Course');
               setGrades(prev => [...prev, newCourse]);
           }
       }
       setIsEventModalOpen(false);
       setEditingEvent(null);
    }
  };

  const handleDeleteEvent = (id: string) => {
      setEvents(prev => prev.filter(e => e.id !== id));
  };

  // --- NEW HANDLERS ---
  const handleDeleteCourseByName = (name: string) => {
      setEvents(prev => prev.filter(e => e.title !== name));
      // Sync with Grades: Remove course
      setGrades(prev => prev.filter(g => g.title !== name));
  };

  const handleEditCourseByName = (oldName: string, info: { name: string, code: string, group: string, location: string }) => {
      setEvents(prev => prev.map(e => {
          if (e.title === oldName) {
              return { 
                  ...e, 
                  title: info.name,
                  code: info.code,
                  group: info.group,
                  // Only update location if it matched previous default or if user wants to force update?
                  // For simplicity in this app, we update the location if it was previously set to something, or just update it.
                  location: info.location
              };
          }
          return e;
      }));
      // Sync with Grades: Rename course
      setGrades(prev => prev.map(g => g.title === oldName ? { ...g, title: info.name } : g));
  };

  const handleAddProfile = (name: string) => {
    const newProfile: ScheduleProfile = { id: Math.random().toString(36).slice(2, 11), name };
    setProfiles([...profiles, newProfile]);
    setActiveProfileId(newProfile.id);
  };

  const handleDeleteProfile = (id: string) => {
    if (profiles.length <= 1) {
      alert("Cannot delete the last profile.");
      return;
    }
    if (confirm("Are you sure? This will delete the profile and all its events.")) {
      setProfiles(prev => prev.filter(p => p.id !== id));
      setEvents(prev => prev.filter(e => e.scheduleId !== id));
      if (activeProfileId === id) {
        const remaining = profiles.filter(p => p.id !== id);
        if (remaining.length > 0) setActiveProfileId(remaining[0].id);
      }
    }
  };

  const handleUpdateColor = (type: EventType, color: string) => {
    setEventColors({ ...eventColors, [type]: color });
  };

  const handleImageUpload = async (file: File) => {
      setIsAnalyzing(true);
      try {
          const base64 = await fileToBase64(file);
          const items = await parseScheduleImage(base64);
          if (items.length > 0) {
              setExtractedEvents(items);
              setIsVerifyModalOpen(true);
          } else {
              alert("No events found in image.");
          }
      } catch (e) {
          console.error(e);
          alert("Error parsing image.");
      } finally {
          setIsAnalyzing(false);
      }
  };

  const handleConfirmImport = () => {
    const newEvents: ScheduleEvent[] = extractedEvents.map(item => ({
        id: Math.random().toString(36).slice(2, 11),
        scheduleId: activeProfileId,
        title: item.course_name,
        code: item.course_code || "",
        group: "",
        type: (item.type?.toLowerCase() as EventType) || 'lecture',
        isRecurring: true,
        dayOfWeek: item.day,
        startTime: item.time_start,
        durationMinutes: 90, 
        location: item.room,
        description: `Imported Period ${item.period_number}`
    }));

    setEvents(prev => [...prev, ...newEvents]);
    
    // Sync with Grades: Add any new courses found in import
    const newCourseTitles = new Set(newEvents.map(e => e.title));
    const existingGradeTitles = new Set(grades.map(g => g.title));
    
    const coursesToAdd: CourseGrade[] = [];
    newCourseTitles.forEach(title => {
        if (!existingGradeTitles.has(title)) {
            coursesToAdd.push(createDefaultCourseGrade(title));
        }
    });
    
    if (coursesToAdd.length > 0) {
        setGrades(prev => [...prev, ...coursesToAdd]);
    }

    setIsVerifyModalOpen(false);
    setExtractedEvents([]);
  };

  const handleSignOut = async () => {
      if (isTestMode) {
          setIsTestMode(false);
      } else {
          await supabase.auth.signOut();
      }
  };

  const handleResetApp = () => {
    localStorage.clear();
    setEvents(INITIAL_EVENTS);
    setMaterials(INITIAL_FILES);
    setProfiles(INITIAL_PROFILES);
    setActiveProfileId('main');
    setGrades([]);
    setPeriods(INITIAL_PERIODS);
    setEventColors(INITIAL_COLORS);
    // Soft reset - just reset state and navigate home, do NOT reload the page as it causes crashes
    setCurrentView('dashboard');
  };

  // Calculate unique existing courses for auto-complete
  const existingCourses = Array.from(new Set(events.map(e => e.title)))
        .map(title => {
            const ev = events.find(e => e.title === title);
            return { title, code: ev?.code || '', type: ev?.type || 'lecture' as EventType };
        });

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard 
            events={events.filter(e => e.scheduleId === activeProfileId)} 
            eventColors={eventColors}
            onNavigate={setCurrentView} 
            onEventClick={(e) => setSelectedTask(e)}
            onAddEventClick={() => { setEditingEvent(null); setIsEventModalOpen(true); }}
            periods={periods}
          />
        );
      case 'schedule':
        return (
          <Schedule 
            events={events}
            profiles={profiles}
            activeProfileId={activeProfileId}
            eventColors={eventColors}
            onProfileChange={setActiveProfileId}
            onAddEventClick={() => { setEditingEvent(null); setIsEventModalOpen(true); }}
            onEventClick={(e) => setSelectedTask(e)}
            periods={periods}
          />
        );
      case 'grades':
        return <GradesView grades={grades} setGrades={setGrades} />;
      case 'gym':
        return <GymView onBack={() => setCurrentView('dashboard')} />;
      case 'courses':
        return (
            <CoursesView 
                events={events.filter(e => e.scheduleId === activeProfileId)} 
                eventColors={eventColors}
                onDeleteCourse={handleDeleteCourseByName}
                onEditCourse={handleEditCourseByName}
                onAddCourse={() => { setEditingEvent({isRecurring: true, type: 'lecture'}); setIsEventModalOpen(true); }}
            />
        );
      case 'materials':
        return <FilesView materials={materials} setMaterials={setMaterials} />;
      case 'ai':
        return <AIChat onAddEvent={handleAddEvent} periods={periods} />;
      case 'settings':
        return (
          <Settings
             profiles={profiles}
             activeProfileId={activeProfileId}
             eventColors={eventColors}
             baseEvents={events.filter(e => e.scheduleId === activeProfileId && e.isRecurring)}
             onAddProfile={handleAddProfile}
             onSwitchProfile={setActiveProfileId}
             onUpdateColor={handleUpdateColor}
             onDeleteEvent={handleDeleteEvent}
             onEditEvent={(e) => { setEditingEvent(e); setIsEventModalOpen(true); }}
             onAddBaseEventClick={() => { setEditingEvent({isRecurring: true}); setIsEventModalOpen(true); }}
             onImageUpload={handleImageUpload}
             onDeleteProfile={handleDeleteProfile}
             isAnalyzing={isAnalyzing}
             onResetApp={handleResetApp}
             onSignOut={handleSignOut}
             periods={periods}
             setPeriods={setPeriods}
          />
        );
      default:
        return null;
    }
  };

  if (!session && !isTestMode) {
    return <Auth onEnterTestMode={() => setIsTestMode(true)} />;
  }

  return (
    <div style={styles.container}>
      <main style={styles.main}>
        {renderContent()}</main>
      {currentView !== 'gym' && <Navigation currentView={currentView} onNavigate={setCurrentView} />}
      {isEventModalOpen && <AddEventModal isOpen={isEventModalOpen} onClose={() => setIsEventModalOpen(false)} onSave={handleAddEvent} eventColors={eventColors} initialData={editingEvent} periods={periods} existingCourses={existingCourses} />}
      {selectedTask && <TaskDetailsModal event={selectedTask} onClose={() => setSelectedTask(null)} onEdit={(task) => { setEditingEvent(task); setIsEventModalOpen(true); setSelectedTask(null); }} onDelete={handleDeleteEvent} />}
      {isVerifyModalOpen && <VerifyImportModal items={extractedEvents} onConfirm={handleConfirmImport} onCancel={() => setIsVerifyModalOpen(false)} />}
      <style>{`@keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } } @keyframes spin { to { transform: rotate(360deg); } } ::-webkit-scrollbar { width: 0px; background: transparent; }`}</style>
    </div>
  );
};

export default App;