import React from 'react';
import UniversalGradeCalculator from './UniversalGradeCalculator';
import { CourseGrade } from '../types';

interface AcademicHubProps {
    course: CourseGrade;
    onUpdate: (updatedCourse: CourseGrade) => void;
    onBack: () => void;
}

const AcademicHub: React.FC<AcademicHubProps> = ({ course, onUpdate, onBack }) => {
    return (
        <div className="flex flex-col h-full bg-[#0f0f12] text-white">
            <div className="p-4 border-b border-white/10 flex items-center gap-4">
                <button onClick={onBack} className="text-white">Back</button>
                <h2 className="text-xl font-bold">{course.title} Academic Hub</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
                <UniversalGradeCalculator 
                    course={course}
                    onUpdate={onUpdate}
                    onBack={() => {}}
                />
            </div>
        </div>
    );
};

export default AcademicHub;
