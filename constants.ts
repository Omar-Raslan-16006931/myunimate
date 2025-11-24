
import { ScheduleEvent, MaterialFile, ScheduleProfile, EventType, MuscleGroup, GymSettings, ExerciseDefinition, WorkoutRoutine } from './types';

// Helper to get local ISO string (YYYY-MM-DD) to fix timezone issues
export const getLocalISOString = (date: Date = new Date()) => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().split('T')[0];
};

const todayStr = getLocalISOString();
const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// Shared Period Definitions
export const PERIODS = [
  { label: "1st", startTime: "08:30", endTime: "10:00", startVal: 8.5 },
  { label: "Break", isBreak: true },
  { label: "2nd", startTime: "10:15", endTime: "11:45", startVal: 10.25 },
  { label: "Break", isBreak: true },
  { label: "3rd", startTime: "12:00", endTime: "13:30", startVal: 12 },
  { label: "Break", isBreak: true },
  { label: "4th", startTime: "13:45", endTime: "15:15", startVal: 13.75 },
  { label: "Break", isBreak: true },
  { label: "5th", startTime: "15:45", endTime: "17:15", startVal: 15.75 },
];

export const INITIAL_PROFILES: ScheduleProfile[] = [
  { id: 'main', name: 'Main Schedule' },
];

export const INITIAL_EVENTS: ScheduleEvent[] = [
  { id: "1", scheduleId: "main", title: "Database Systems", code: "3INF & CS L001", group: "L001", isRecurring: true, dayOfWeek: "Sunday", startTime: "08:30", durationMinutes: 90, type: "lecture", location: "M1.205" },
  { id: "2", scheduleId: "main", title: "Programming III", code: "3INF & CS L002", group: "L002", isRecurring: true, dayOfWeek: "Sunday", startTime: "10:15", durationMinutes: 90, type: "lecture", location: "A2.010" },
  { id: "3", scheduleId: "main", title: "Operating Systems", code: "3INF & CS L003", group: "L003", isRecurring: true, dayOfWeek: "Monday", startTime: "10:15", durationMinutes: 90, type: "lecture", location: "M1.105" },
  { id: "4", scheduleId: "main", title: "Prog III Tut", code: "3INF & CS T021", group: "T021", isRecurring: true, dayOfWeek: "Monday", startTime: "13:45", durationMinutes: 90, type: "tutorial", location: "A2.208" },
  { id: "5", scheduleId: "main", title: "OS Lab", code: "3INF & CS P016", group: "P016", isRecurring: true, dayOfWeek: "Tuesday", startTime: "08:30", durationMinutes: 90, type: "lab", location: "Lab 3" },
  { id: "6", scheduleId: "main", title: "OS Quiz 1", code: "3INF & CS Q1", group: "Q1", isRecurring: false, date: todayStr, startTime: "10:15", durationMinutes: 45, type: "quiz", location: "M1.105", description: "First quiz covering chapters 1-3. Bring calculator." },
  { id: "7", scheduleId: "main", title: "DB Assignment", code: "3INF & CS A1", group: "A1", isRecurring: false, date: getLocalISOString(addDays(new Date(), 2)), startTime: "23:59", durationMinutes: 0, type: "assignment", location: "Online", description: "Submit the ERD diagram and normalization steps via the portal." }
];

export const INITIAL_FILES: MaterialFile[] = [
  { id: "f1", name: "Database Systems", type: "folder", dateAdded: "2023-09-01" },
  { id: "m1", name: "Syllabus.pdf", type: "pdf", size: "2.4 MB", dateAdded: "2023-09-01", parentId: "f1" },
];

export const INITIAL_COLORS: Record<EventType, string> = {
  lecture: "#8b5cf6",      
  tutorial: "#f59e0b",     
  lab: "#ec4899",          
  quiz: "#ef4444",         
  assignment: "#10b981",   
  exam: "#6366f1",         
  study: "#06b6d4",        
  other: "#71717a"         
};

// --- GYM CONSTANTS ---

export const EXERCISE_ICONS: Record<string, string> = {
  'Bench Press': 'https://img.icons8.com/ios-filled/100/bench-press.png',
  'Incline Dumbbell Press': 'https://img.icons8.com/ios-filled/100/chest-press.png',
  'Cable Flyes': 'https://img.icons8.com/ios-filled/100/pullups.png',
  'Push-ups': 'https://img.icons8.com/ios-filled/100/pushups.png',
  'Dips': 'https://img.icons8.com/ios-filled/100/deadlift.png',
  
  'Deadlift': 'https://img.icons8.com/ios-filled/100/deadlift.png',
  'Pull-ups': 'https://img.icons8.com/ios-filled/100/pullups.png',
  'Lat Pulldown': 'https://img.icons8.com/ios-filled/100/lat-pull-down.png',
  'Bent Over Row': 'https://img.icons8.com/ios-filled/100/rowing.png',
  
  'Squat': 'https://img.icons8.com/ios-filled/100/squats.png',
  'Leg Press': 'https://img.icons8.com/ios-filled/100/leg-press.png',
  'Lunges': 'https://img.icons8.com/ios-filled/100/lunge.png',
  
  'Overhead Press': 'https://img.icons8.com/ios-filled/100/shoulder-press.png',
  'Lateral Raises': 'https://img.icons8.com/ios-filled/100/dumbbell.png',
  
  'Barbell Curl': 'https://img.icons8.com/ios-filled/100/barbell.png',
  'Tricep Pushdown': 'https://img.icons8.com/ios-filled/100/triceps.png',
  
  'Plank': 'https://img.icons8.com/ios-filled/100/plank.png',
  'Running': 'https://img.icons8.com/ios-filled/100/running.png',
};

export const DEFAULT_GYM_SETTINGS: GymSettings = {
  name: 'Athlete',
  waterTarget: 2500,
  defaultRestTimer: 30, 
  targets: {
    calories: 2500,
    protein: 180,
    carbs: 250,
    fat: 80,
  },
  gender: 'male',
  age: 25,
  weight: 75,
  height: 175,
  activityLevel: 'moderate'
};

export const DEFAULT_EXERCISES: ExerciseDefinition[] = [
  // Chest
  { 
    id: 'c1', name: 'Bench Press', muscleGroup: MuscleGroup.CHEST, equipment: 'Barbell',
    imageUrl: EXERCISE_ICONS['Bench Press'],
    restTime: 120
  },
  { 
    id: 'c2', name: 'Incline Dumbbell Press', muscleGroup: MuscleGroup.CHEST, equipment: 'Dumbbell',
    imageUrl: EXERCISE_ICONS['Incline Dumbbell Press'] 
  },
  { 
    id: 'c3', name: 'Cable Flyes', muscleGroup: MuscleGroup.CHEST, equipment: 'Cable',
    imageUrl: EXERCISE_ICONS['Cable Flyes']
  },
  { 
    id: 'c4', name: 'Push-ups', muscleGroup: MuscleGroup.CHEST, equipment: 'Bodyweight',
    imageUrl: EXERCISE_ICONS['Push-ups'],
    restTime: 60
  },
  { 
    id: 'c5', name: 'Dips', muscleGroup: MuscleGroup.CHEST, equipment: 'Bodyweight',
    imageUrl: EXERCISE_ICONS['Dips']
  },
  // Back
  { 
    id: 'b1', name: 'Deadlift', muscleGroup: MuscleGroup.BACK, equipment: 'Barbell',
    imageUrl: EXERCISE_ICONS['Deadlift'],
    restTime: 180
  },
  { 
    id: 'b2', name: 'Pull-ups', muscleGroup: MuscleGroup.BACK, equipment: 'Bodyweight',
    imageUrl: EXERCISE_ICONS['Pull-ups']
  },
  { 
    id: 'b3', name: 'Lat Pulldown', muscleGroup: MuscleGroup.BACK, equipment: 'Cable',
    imageUrl: EXERCISE_ICONS['Lat Pulldown']
  },
  { 
    id: 'b4', name: 'Bent Over Row', muscleGroup: MuscleGroup.BACK, equipment: 'Barbell',
    imageUrl: EXERCISE_ICONS['Bent Over Row']
  },
  // Legs
  { 
    id: 'l1', name: 'Squat', muscleGroup: MuscleGroup.LEGS, equipment: 'Barbell',
    imageUrl: EXERCISE_ICONS['Squat'],
    restTime: 180
  },
  { 
    id: 'l2', name: 'Leg Press', muscleGroup: MuscleGroup.LEGS, equipment: 'Machine',
    imageUrl: EXERCISE_ICONS['Leg Press']
  },
  { 
    id: 'l3', name: 'Lunges', muscleGroup: MuscleGroup.LEGS, equipment: 'Dumbbell',
    imageUrl: EXERCISE_ICONS['Lunges']
  },
  // Shoulders
  { 
    id: 's1', name: 'Overhead Press', muscleGroup: MuscleGroup.SHOULDERS, equipment: 'Barbell',
    imageUrl: EXERCISE_ICONS['Overhead Press'],
    restTime: 120
  },
  { 
    id: 's2', name: 'Lateral Raises', muscleGroup: MuscleGroup.SHOULDERS, equipment: 'Dumbbell',
    imageUrl: EXERCISE_ICONS['Lateral Raises'],
    restTime: 60
  },
  // Arms
  { 
    id: 'a1', name: 'Barbell Curl', muscleGroup: MuscleGroup.ARMS, equipment: 'Barbell',
    imageUrl: EXERCISE_ICONS['Barbell Curl'],
    restTime: 60
  },
  { 
    id: 'a2', name: 'Tricep Pushdown', muscleGroup: MuscleGroup.ARMS, equipment: 'Cable',
    imageUrl: EXERCISE_ICONS['Tricep Pushdown'],
    restTime: 60
  },
  // Core
  { 
    id: 'co1', name: 'Plank', muscleGroup: MuscleGroup.CORE, equipment: 'Bodyweight',
    imageUrl: EXERCISE_ICONS['Plank'],
    restTime: 45
  },
  // Cardio
  { 
    id: 'ca1', name: 'Running', muscleGroup: MuscleGroup.CARDIO, equipment: 'Other',
    imageUrl: EXERCISE_ICONS['Running']
  },
];

export const DEFAULT_ROUTINES: WorkoutRoutine[] = [
  {
    id: 'r1',
    name: 'Upper Power',
    exercises: [
      { id: 'c1', name: 'Bench Press', muscleGroup: MuscleGroup.CHEST, equipment: 'Barbell', imageUrl: EXERCISE_ICONS['Bench Press'], restTime: 120 },
      { id: 'b4', name: 'Bent Over Row', muscleGroup: MuscleGroup.BACK, equipment: 'Barbell', imageUrl: EXERCISE_ICONS['Bent Over Row'] },
      { id: 's1', name: 'Overhead Press', muscleGroup: MuscleGroup.SHOULDERS, equipment: 'Barbell', imageUrl: EXERCISE_ICONS['Overhead Press'], restTime: 120 },
    ]
  },
  {
    id: 'r2',
    name: 'Leg Day',
    exercises: [
      { id: 'l1', name: 'Squat', muscleGroup: MuscleGroup.LEGS, equipment: 'Barbell', imageUrl: EXERCISE_ICONS['Squat'], restTime: 180 },
      { id: 'l3', name: 'Lunges', muscleGroup: MuscleGroup.LEGS, equipment: 'Dumbbell', imageUrl: EXERCISE_ICONS['Lunges'] },
    ]
  }
];
