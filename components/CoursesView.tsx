
import React from 'react';
import { CourseGrade } from '../types';
import { BookOpen, GraduationCap, ChevronRight, Plus, Calculator } from 'lucide-react';
import { styles, theme } from '../theme';

interface CoursesViewProps {
  courses: CourseGrade[];
  onSelectCourse: (id: string) => void;
  onAddCourse: () => void;
}

const CoursesView: React.FC<CoursesViewProps> = ({ courses, onSelectCourse, onAddCourse }) => {
  return (
    <div style={styles.scrollableContent}>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingTop: '8px'}}>
         <div>
            <h1 style={styles.title}>Classes</h1>
            <p style={styles.subtitle}>Manage your subjects</p>
         </div>
         <button onClick={onAddCourse} style={{...styles.button, padding: '10px', borderRadius: '12px'}}>
            <Plus size={20} />
         </button>
      </div>

      <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
        {courses.map(course => (
          <div 
            key={course.id} 
            onClick={() => onSelectCourse(course.id)}
            style={{...styles.card, display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', marginBottom: 0, padding: '16px'}}
          >
            <div style={{width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.accent}}>
               <BookOpen size={24} />
            </div>
            <div style={{flex: 1}}>
               <h3 style={{margin: 0, fontSize: '1rem', fontWeight: 700, color: '#fff'}}>{course.title}</h3>
               <p style={{margin: 0, fontSize: '0.8rem', color: theme.textMuted}}>{course.code || 'No Code'}</p>
            </div>
            <div style={{textAlign: 'right'}}>
                <span style={{fontSize: '1.2rem', fontWeight: 800, color: '#fff'}}>{course.targetGrade}%</span>
                <p style={{margin: 0, fontSize: '0.65rem', color: theme.textMuted, textTransform: 'uppercase', fontWeight: 700}}>Target</p>
            </div>
            <div style={{background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '8px'}}>
                <ChevronRight size={16} color={theme.textMuted} />
            </div>
          </div>
        ))}

        {courses.length === 0 && (
            <div style={{textAlign: 'center', padding: '60px 20px', color: theme.textMuted, background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)'}}>
                <GraduationCap size={48} style={{opacity: 0.2, margin: '0 auto 16px'}} />
                <h3 style={{fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '8px'}}>No classes yet</h3>
                <p style={{fontSize: '0.8rem', marginBottom: '20px'}}>Add your courses to track grades and assignments.</p>
                <button onClick={onAddCourse} style={{...styles.secondaryButton, margin: '0 auto'}}>
                    <Plus size={16} /> Add First Class
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default CoursesView;
