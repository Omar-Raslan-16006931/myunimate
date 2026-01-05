
import React, { useState } from 'react';
import { CourseGrade } from '../types';
import { Plus, GraduationCap, BookOpen, TrendingUp, Trash2, AlertTriangle, X } from 'lucide-react';
import { styles, theme } from '../theme';

interface CoursesViewProps {
  courses: CourseGrade[];
  onSelectCourse: (id: string) => void;
  onAddCourse: () => void;
  onDeleteCourse: (id: string) => void;
}

const CoursesView: React.FC<CoursesViewProps> = ({ courses, onSelectCourse, onAddCourse, onDeleteCourse }) => {
  const [courseToDelete, setCourseToDelete] = useState<CourseGrade | null>(null);

  // Calculate Absolute Grade
  const getCourseStats = (course: CourseGrade) => {
      let accumulatedPoints = 0;
      let weightCompleted = 0;

      course.categories.forEach(cat => {
          const weight = parseFloat(cat.weight) || 0;
          const usableItems = cat.items.filter(i => i.active !== false && i.score !== '' && i.total !== '' && parseFloat(i.total) > 0);
          
          if (usableItems.length > 0) {
              const withPercent = usableItems.map(i => ({
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
                  
                  accumulatedPoints += catAvg * weight;
                  weightCompleted += weight;
              }
          }
      });

      return {
          grade: accumulatedPoints,
          completed: weightCompleted,
          relative: weightCompleted > 0 ? (accumulatedPoints / weightCompleted) * 100 : 0
      };
  };

  const getGradeColor = (grade: number) => {
      if (grade >= 90) return 'text-emerald-400';
      if (grade >= 80) return 'text-blue-400';
      if (grade >= 70) return 'text-yellow-400';
      if (grade >= 60) return 'text-orange-400';
      return 'text-red-400';
  };

  // Handler to open the custom modal
  const promptDelete = (e: React.MouseEvent, course: CourseGrade) => {
      e.stopPropagation();
      e.preventDefault();
      setCourseToDelete(course);
  };

  // Actual delete function called by the modal
  const confirmDelete = () => {
      if (courseToDelete) {
          onDeleteCourse(courseToDelete.id);
          setCourseToDelete(null);
      }
  };

  return (
    <div style={styles.scrollableContent} className="relative">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pt-2">
         <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Grades</h1>
            <p className="text-white/50 text-sm font-medium mt-1">Final Grade Calculator</p>
         </div>
         <button 
            onClick={onAddCourse} 
            className="w-12 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
         >
            <Plus size={24} />
         </button>
      </div>

      {/* Grid */}
      <div className="grid gap-4 pb-20">
        {courses.map(course => {
          const { grade, completed, relative } = getCourseStats(course);
          const target = parseFloat(course.targetGrade) || 90;
          
          return (
            <div 
                key={course.id} 
                onClick={() => onSelectCourse(course.id)}
                className="group relative bg-[#1c1c1e] border border-white/5 rounded-3xl p-5 cursor-pointer hover:bg-white/10 transition-all active:scale-[0.99] overflow-hidden shadow-xl"
            >
                {/* Delete Button - Directly on card, Top Right */}
                <button
                    onClick={(e) => promptDelete(e, course)}
                    className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/20 text-white/30 hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center transition-all backdrop-blur-md"
                    title="Delete Course"
                >
                    <Trash2 size={16} />
                </button>

                <div className="flex justify-between items-start mb-6 pr-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-indigo-400 border border-white/5 shrink-0">
                            <BookOpen size={22} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-bold text-lg text-white leading-tight truncate">{course.title}</h3>
                            <p className="text-white/40 text-xs font-bold uppercase tracking-wider mt-0.5">{course.code || 'No Code'}</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-end justify-between mb-4">
                    <div>
                        <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Final Grade (Accumulated)</div>
                        <div className="text-4xl font-black tracking-tighter text-white">
                            {grade.toFixed(1)}%
                        </div>
                    </div>
                    {completed > 0 && (
                        <div className="text-right">
                            <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Performance</div>
                            <div className={`text-xl font-bold ${getGradeColor(relative)}`}>
                                {relative.toFixed(1)}%
                            </div>
                        </div>
                    )}
                </div>

                <div className="relative h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div 
                        className="absolute top-0 left-0 h-full bg-white/20 transition-all duration-1000" 
                        style={{ width: `${Math.min(completed, 100)}%` }} 
                    />
                    <div 
                        className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ${getGradeColor(relative)}`} 
                        style={{ width: `${Math.min(grade, 100)}%` }} 
                    />
                </div>
                
                <div className="flex justify-between mt-2">
                    <div className="text-[10px] font-bold text-white/30">
                        {completed.toFixed(0)}% of course completed
                    </div>
                    {grade < target && completed < 100 && (
                        <div className="text-[10px] font-bold text-indigo-400 flex items-center gap-1">
                            <TrendingUp size={10} /> Needs work
                        </div>
                    )}
                </div>
            </div>
          );
        })}

        {courses.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
                <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6 text-indigo-400">
                    <GraduationCap size={40} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No courses tracked</h3>
                <p className="text-white/40 text-sm mb-8 max-w-[240px] leading-relaxed">
                    Add your first course to start calculating your final grade.
                </p>
                <button 
                    onClick={onAddCourse}
                    className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2 text-sm"
                >
                    <Plus size={18} /> Create Course
                </button>
            </div>
        )}
      </div>

      {/* Custom Delete Confirmation Modal */}
      {courseToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
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
                          className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all"
                      >
                          Cancel
                      </button>
                      <button 
                          onClick={confirmDelete}
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

export default CoursesView;
