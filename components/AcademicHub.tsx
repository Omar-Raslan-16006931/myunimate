import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
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
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
                    <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-6 text-center">Grade Breakdown</p>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={course.categories.map(cat => ({ name: cat.name, value: parseFloat(cat.weight) || 0 }))}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={70}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {course.categories.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={`hsl(${(index * 45) % 360}, 70%, 60%)`} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

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
