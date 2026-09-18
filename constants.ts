

import { ScheduleEvent, MaterialFile, ScheduleProfile, EventType, MuscleGroup, GymSettings, ExerciseDefinition, WorkoutRoutine, PeriodDefinition, PresetPlan, Equipment } from './types';

// Helper to get local ISO string (YYYY-MM-DD) to fix timezone issues
export const getLocalISOString = (date: Date = new Date()) => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().split('T')[0];
};

export const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

const todayStr = getLocalISOString();
const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// Shared Period Definitions
export const INITIAL_PERIODS: PeriodDefinition[] = [
  { id: 'p1', label: "1st", startTime: "08:30", endTime: "10:00", isBreak: false, startVal: 8.5 },
  { id: 'b1', label: "Break", startTime: "10:00", endTime: "10:15", isBreak: true, startVal: 10 },
  { id: 'p2', label: "2nd", startTime: "10:15", endTime: "11:45", isBreak: false, startVal: 10.25 },
  { id: 'b2', label: "Break", startTime: "11:45", endTime: "12:00", isBreak: true, startVal: 11.75 },
  { id: 'p3', label: "3rd", startTime: "12:00", endTime: "13:30", isBreak: false, startVal: 12 },
  { id: 'b3', label: "Break", startTime: "13:30", endTime: "13:45", isBreak: true, startVal: 13.5 },
  { id: 'p4', label: "4th", startTime: "13:45", endTime: "15:15", isBreak: false, startVal: 13.75 },
  { id: 'b4', label: "Break", startTime: "15:15", endTime: "15:45", isBreak: true, startVal: 15.25 },
  { id: 'p5', label: "5th", startTime: "15:45", endTime: "17:15", isBreak: false, startVal: 15.75 },
];

export const INITIAL_PROFILES: ScheduleProfile[] = [
  { id: 'main', name: 'Main Schedule', periods: INITIAL_PERIODS },
  { id: 'template', name: 'Student Template', periods: INITIAL_PERIODS },
];

export const INITIAL_EVENTS: ScheduleEvent[] = [
  { id: "1", scheduleId: "main", title: "Database Systems", code: "3INF & CS L001", group: "L001", isRecurring: true, dayOfWeek: "Sunday", startTime: "08:30", durationMinutes: 90, type: "lecture", location: "M1.205" },
  { id: "2", scheduleId: "main", title: "Programming III", code: "3INF & CS L002", group: "L002", isRecurring: true, dayOfWeek: "Sunday", startTime: "10:15", durationMinutes: 90, type: "lecture", location: "A2.010" },
  { id: "3", scheduleId: "main", title: "Operating Systems", code: "3INF & CS L003", group: "L003", isRecurring: true, dayOfWeek: "Monday", startTime: "10:15", durationMinutes: 90, type: "lecture", location: "M1.105" },
  { id: "4", scheduleId: "main", title: "Prog III Tut", code: "3INF & CS T021", group: "T021", isRecurring: true, dayOfWeek: "Monday", startTime: "13:45", durationMinutes: 90, type: "tutorial", location: "A2.208" },
  { id: "5", scheduleId: "main", title: "OS Lab", code: "3INF & CS P016", group: "P016", isRecurring: true, dayOfWeek: "Tuesday", startTime: "08:30", durationMinutes: 90, type: "lab", location: "Lab 3" },
  { id: "6", scheduleId: "main", title: "OS Quiz 1", code: "3INF & CS Q1", group: "Q1", isRecurring: false, date: todayStr, startTime: "10:15", durationMinutes: 45, type: "quiz", location: "M1.105", description: "First quiz covering chapters 1-3. Bring calculator." },
  { id: "7", scheduleId: "main", title: "DB Assignment", code: "3INF & CS A1", group: "A1", isRecurring: false, date: getLocalISOString(addDays(new Date(), 2)), startTime: "23:59", durationMinutes: 0, type: "assignment", location: "Online", description: "Submit the ERD diagram and normalization steps via the portal." },
  
  // Template Events
  { id: "t1", scheduleId: "template", title: "Software Engineering", code: "SE-301", group: "G1", isRecurring: true, dayOfWeek: "Monday", startTime: "08:30", durationMinutes: 90, type: "lecture", location: "Hall A" },
  { id: "t2", scheduleId: "template", title: "Computer Networks", code: "CN-302", group: "G2", isRecurring: true, dayOfWeek: "Monday", startTime: "12:00", durationMinutes: 90, type: "lecture", location: "Hall B" },
  { id: "t3", scheduleId: "template", title: "AI & ML", code: "AI-303", group: "G1", isRecurring: true, dayOfWeek: "Tuesday", startTime: "10:15", durationMinutes: 90, type: "lecture", location: "Hall C" },
  { id: "t4", scheduleId: "template", title: "Network Lab", code: "CN-302-L", group: "L1", isRecurring: true, dayOfWeek: "Wednesday", startTime: "08:30", durationMinutes: 180, type: "lab", location: "Lab 5" },
  { id: "t5", scheduleId: "template", title: "SE Tutorial", code: "SE-301-T", group: "T1", isRecurring: true, dayOfWeek: "Thursday", startTime: "13:45", durationMinutes: 90, type: "tutorial", location: "Room 102" },
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
  defaultRestTimer: 60,
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
  activityLevel: 'moderate',
  goal: 'maintain'
};

// Compact builder for the exercise library
const ex = (id: string, name: string, muscleGroup: MuscleGroup, equipment: Equipment, restTime?: number): ExerciseDefinition => ({
  id, name, muscleGroup, equipment, restTime, imageUrl: EXERCISE_ICONS[name]
});

export const DEFAULT_EXERCISES: ExerciseDefinition[] = [
  // --- CHEST ---
  ex('ch01', 'Bench Press', MuscleGroup.CHEST, 'Barbell', 150),
  ex('ch02', 'Incline Bench Press', MuscleGroup.CHEST, 'Barbell', 150),
  ex('ch03', 'Decline Bench Press', MuscleGroup.CHEST, 'Barbell', 150),
  ex('ch04', 'Dumbbell Bench Press', MuscleGroup.CHEST, 'Dumbbell', 120),
  ex('ch05', 'Incline Dumbbell Press', MuscleGroup.CHEST, 'Dumbbell', 120),
  ex('ch06', 'Decline Dumbbell Press', MuscleGroup.CHEST, 'Dumbbell', 120),
  ex('ch07', 'Dumbbell Flyes', MuscleGroup.CHEST, 'Dumbbell', 75),
  ex('ch08', 'Cable Flyes', MuscleGroup.CHEST, 'Cable', 75),
  ex('ch09', 'Low Cable Crossover', MuscleGroup.CHEST, 'Cable', 75),
  ex('ch10', 'Pec Deck Machine', MuscleGroup.CHEST, 'Machine', 75),
  ex('ch11', 'Chest Press Machine', MuscleGroup.CHEST, 'Machine', 90),
  ex('ch12', 'Push-ups', MuscleGroup.CHEST, 'Bodyweight', 60),
  ex('ch13', 'Wide-Grip Push-ups', MuscleGroup.CHEST, 'Bodyweight', 60),
  ex('ch14', 'Chest Dips', MuscleGroup.CHEST, 'Bodyweight', 90),

  // --- BACK ---
  ex('bk01', 'Deadlift', MuscleGroup.BACK, 'Barbell', 180),
  ex('bk02', 'Pull-ups', MuscleGroup.BACK, 'Bodyweight', 120),
  ex('bk03', 'Chin-ups', MuscleGroup.BACK, 'Bodyweight', 120),
  ex('bk04', 'Lat Pulldown', MuscleGroup.BACK, 'Cable', 90),
  ex('bk05', 'Close-Grip Lat Pulldown', MuscleGroup.BACK, 'Cable', 90),
  ex('bk06', 'Bent Over Row', MuscleGroup.BACK, 'Barbell', 120),
  ex('bk07', 'Pendlay Row', MuscleGroup.BACK, 'Barbell', 120),
  ex('bk08', 'Dumbbell Row', MuscleGroup.BACK, 'Dumbbell', 90),
  ex('bk09', 'Seated Cable Row', MuscleGroup.BACK, 'Cable', 90),
  ex('bk10', 'T-Bar Row', MuscleGroup.BACK, 'Barbell', 120),
  ex('bk11', 'Chest Supported Row', MuscleGroup.BACK, 'Machine', 90),
  ex('bk12', 'Machine Row', MuscleGroup.BACK, 'Machine', 90),
  ex('bk13', 'Straight-Arm Pulldown', MuscleGroup.BACK, 'Cable', 75),
  ex('bk14', 'Rack Pull', MuscleGroup.BACK, 'Barbell', 180),
  ex('bk15', 'Back Extension', MuscleGroup.BACK, 'Bodyweight', 60),
  ex('bk16', 'Barbell Shrugs', MuscleGroup.BACK, 'Barbell', 75),
  ex('bk17', 'Dumbbell Shrugs', MuscleGroup.BACK, 'Dumbbell', 75),

  // --- SHOULDERS ---
  ex('sh01', 'Overhead Press', MuscleGroup.SHOULDERS, 'Barbell', 150),
  ex('sh02', 'Seated Dumbbell Press', MuscleGroup.SHOULDERS, 'Dumbbell', 120),
  ex('sh03', 'Arnold Press', MuscleGroup.SHOULDERS, 'Dumbbell', 120),
  ex('sh04', 'Machine Shoulder Press', MuscleGroup.SHOULDERS, 'Machine', 90),
  ex('sh05', 'Push Press', MuscleGroup.SHOULDERS, 'Barbell', 150),
  ex('sh06', 'Lateral Raises', MuscleGroup.SHOULDERS, 'Dumbbell', 60),
  ex('sh07', 'Cable Lateral Raise', MuscleGroup.SHOULDERS, 'Cable', 60),
  ex('sh08', 'Front Raises', MuscleGroup.SHOULDERS, 'Dumbbell', 60),
  ex('sh09', 'Rear Delt Flyes', MuscleGroup.SHOULDERS, 'Dumbbell', 60),
  ex('sh10', 'Reverse Pec Deck', MuscleGroup.SHOULDERS, 'Machine', 60),
  ex('sh11', 'Face Pull', MuscleGroup.SHOULDERS, 'Cable', 60),
  ex('sh12', 'Upright Row', MuscleGroup.SHOULDERS, 'Barbell', 90),

  // --- BICEPS ---
  ex('bi01', 'Barbell Curl', MuscleGroup.BICEPS, 'Barbell', 75),
  ex('bi02', 'EZ-Bar Curl', MuscleGroup.BICEPS, 'Barbell', 75),
  ex('bi03', 'Dumbbell Curl', MuscleGroup.BICEPS, 'Dumbbell', 60),
  ex('bi04', 'Hammer Curl', MuscleGroup.BICEPS, 'Dumbbell', 60),
  ex('bi05', 'Incline Dumbbell Curl', MuscleGroup.BICEPS, 'Dumbbell', 60),
  ex('bi06', 'Preacher Curl', MuscleGroup.BICEPS, 'Machine', 60),
  ex('bi07', 'Concentration Curl', MuscleGroup.BICEPS, 'Dumbbell', 60),
  ex('bi08', 'Cable Curl', MuscleGroup.BICEPS, 'Cable', 60),
  ex('bi09', 'Spider Curl', MuscleGroup.BICEPS, 'Dumbbell', 60),
  ex('bi10', 'Reverse Curl', MuscleGroup.BICEPS, 'Barbell', 60),

  // --- TRICEPS ---
  ex('tr01', 'Tricep Pushdown', MuscleGroup.TRICEPS, 'Cable', 60),
  ex('tr02', 'Rope Pushdown', MuscleGroup.TRICEPS, 'Cable', 60),
  ex('tr03', 'Dips', MuscleGroup.TRICEPS, 'Bodyweight', 90),
  ex('tr04', 'Close-Grip Bench Press', MuscleGroup.TRICEPS, 'Barbell', 120),
  ex('tr05', 'Skull Crushers', MuscleGroup.TRICEPS, 'Barbell', 75),
  ex('tr06', 'Overhead Tricep Extension', MuscleGroup.TRICEPS, 'Dumbbell', 60),
  ex('tr07', 'Cable Overhead Extension', MuscleGroup.TRICEPS, 'Cable', 60),
  ex('tr08', 'Dumbbell Kickback', MuscleGroup.TRICEPS, 'Dumbbell', 60),
  ex('tr09', 'Diamond Push-ups', MuscleGroup.TRICEPS, 'Bodyweight', 60),
  ex('tr10', 'Machine Tricep Extension', MuscleGroup.TRICEPS, 'Machine', 60),

  // --- FOREARMS ---
  ex('fa01', 'Wrist Curl', MuscleGroup.FOREARMS, 'Dumbbell', 45),
  ex('fa02', 'Reverse Wrist Curl', MuscleGroup.FOREARMS, 'Dumbbell', 45),
  ex('fa03', "Farmer's Walk", MuscleGroup.FOREARMS, 'Dumbbell', 90),
  ex('fa04', 'Plate Pinch Hold', MuscleGroup.FOREARMS, 'Other', 60),
  ex('fa05', 'Dead Hang', MuscleGroup.FOREARMS, 'Bodyweight', 60),

  // --- QUADRICEPS ---
  ex('qd01', 'Squat', MuscleGroup.QUADRICEPS, 'Barbell', 180),
  ex('qd02', 'Front Squat', MuscleGroup.QUADRICEPS, 'Barbell', 180),
  ex('qd03', 'Hack Squat', MuscleGroup.QUADRICEPS, 'Machine', 150),
  ex('qd04', 'Leg Press', MuscleGroup.QUADRICEPS, 'Machine', 120),
  ex('qd05', 'Leg Extension', MuscleGroup.QUADRICEPS, 'Machine', 75),
  ex('qd06', 'Goblet Squat', MuscleGroup.QUADRICEPS, 'Dumbbell', 90),
  ex('qd07', 'Bulgarian Split Squat', MuscleGroup.QUADRICEPS, 'Dumbbell', 90),
  ex('qd08', 'Smith Machine Squat', MuscleGroup.QUADRICEPS, 'Machine', 150),
  ex('qd09', 'Sissy Squat', MuscleGroup.QUADRICEPS, 'Bodyweight', 75),
  ex('qd10', 'Step-ups', MuscleGroup.QUADRICEPS, 'Dumbbell', 75),

  // --- HAMSTRINGS ---
  ex('hm01', 'Romanian Deadlift', MuscleGroup.HAMSTRINGS, 'Barbell', 150),
  ex('hm02', 'Stiff-Leg Deadlift', MuscleGroup.HAMSTRINGS, 'Barbell', 150),
  ex('hm03', 'Leg Curl', MuscleGroup.HAMSTRINGS, 'Machine', 75),
  ex('hm04', 'Seated Leg Curl', MuscleGroup.HAMSTRINGS, 'Machine', 75),
  ex('hm05', 'Nordic Curl', MuscleGroup.HAMSTRINGS, 'Bodyweight', 90),
  ex('hm06', 'Good Mornings', MuscleGroup.HAMSTRINGS, 'Barbell', 120),
  ex('hm07', 'Single-Leg RDL', MuscleGroup.HAMSTRINGS, 'Dumbbell', 75),

  // --- GLUTES ---
  ex('gl01', 'Hip Thrust', MuscleGroup.GLUTES, 'Barbell', 120),
  ex('gl02', 'Glute Bridge', MuscleGroup.GLUTES, 'Bodyweight', 60),
  ex('gl03', 'Lunges', MuscleGroup.GLUTES, 'Dumbbell', 90),
  ex('gl04', 'Walking Lunges', MuscleGroup.GLUTES, 'Dumbbell', 90),
  ex('gl05', 'Cable Kickback', MuscleGroup.GLUTES, 'Cable', 60),
  ex('gl06', 'Sumo Deadlift', MuscleGroup.GLUTES, 'Barbell', 180),
  ex('gl07', 'Curtsy Lunge', MuscleGroup.GLUTES, 'Dumbbell', 75),
  ex('gl08', 'Glute Kickback Machine', MuscleGroup.GLUTES, 'Machine', 60),

  // --- CALVES ---
  ex('cv01', 'Standing Calf Raise', MuscleGroup.CALVES, 'Machine', 60),
  ex('cv02', 'Seated Calf Raise', MuscleGroup.CALVES, 'Machine', 60),
  ex('cv03', 'Donkey Calf Raise', MuscleGroup.CALVES, 'Machine', 60),
  ex('cv04', 'Single-Leg Calf Raise', MuscleGroup.CALVES, 'Bodyweight', 45),
  ex('cv05', 'Calf Press on Leg Press', MuscleGroup.CALVES, 'Machine', 60),

  // --- ADDUCTORS ---
  ex('ad01', 'Hip Adduction Machine', MuscleGroup.ADDUCTORS, 'Machine', 60),
  ex('ad02', 'Sumo Squat', MuscleGroup.ADDUCTORS, 'Dumbbell', 90),
  ex('ad03', 'Copenhagen Plank', MuscleGroup.ADDUCTORS, 'Bodyweight', 60),
  ex('ad04', 'Side Lunge', MuscleGroup.ADDUCTORS, 'Bodyweight', 60),

  // --- ABS ---
  ex('ab01', 'Plank', MuscleGroup.ABS, 'Bodyweight', 45),
  ex('ab02', 'Crunches', MuscleGroup.ABS, 'Bodyweight', 45),
  ex('ab03', 'Cable Crunch', MuscleGroup.ABS, 'Cable', 60),
  ex('ab04', 'Hanging Leg Raise', MuscleGroup.ABS, 'Bodyweight', 60),
  ex('ab05', 'Hanging Knee Raise', MuscleGroup.ABS, 'Bodyweight', 60),
  ex('ab06', 'Sit-ups', MuscleGroup.ABS, 'Bodyweight', 45),
  ex('ab07', 'Bicycle Crunches', MuscleGroup.ABS, 'Bodyweight', 45),
  ex('ab08', 'Ab Wheel Rollout', MuscleGroup.ABS, 'Other', 60),
  ex('ab09', 'Mountain Climbers', MuscleGroup.ABS, 'Bodyweight', 45),
  ex('ab10', 'V-ups', MuscleGroup.ABS, 'Bodyweight', 45),
  ex('ab11', 'Decline Sit-up', MuscleGroup.ABS, 'Bodyweight', 45),
  ex('ab12', 'Toe Touches', MuscleGroup.ABS, 'Bodyweight', 45),

  // --- CORE ---
  ex('co01', 'Russian Twist', MuscleGroup.CORE, 'Bodyweight', 45),
  ex('co02', 'Side Plank', MuscleGroup.CORE, 'Bodyweight', 45),
  ex('co03', 'Dead Bug', MuscleGroup.CORE, 'Bodyweight', 45),
  ex('co04', 'Bird Dog', MuscleGroup.CORE, 'Bodyweight', 45),
  ex('co05', 'Pallof Press', MuscleGroup.CORE, 'Cable', 60),
  ex('co06', 'Cable Woodchopper', MuscleGroup.CORE, 'Cable', 60),
  ex('co07', 'Suitcase Carry', MuscleGroup.CORE, 'Dumbbell', 60),
  ex('co08', 'Hollow Body Hold', MuscleGroup.CORE, 'Bodyweight', 45),

  // --- CARDIO ---
  ex('cr01', 'Running', MuscleGroup.CARDIO, 'Other', 0),
  ex('cr02', 'Incline Treadmill Walk', MuscleGroup.CARDIO, 'Machine', 0),
  ex('cr03', 'Cycling', MuscleGroup.CARDIO, 'Machine', 0),
  ex('cr04', 'Rowing Machine', MuscleGroup.CARDIO, 'Machine', 60),
  ex('cr05', 'Elliptical', MuscleGroup.CARDIO, 'Machine', 0),
  ex('cr06', 'Stair Master', MuscleGroup.CARDIO, 'Machine', 0),
  ex('cr07', 'Jump Rope', MuscleGroup.CARDIO, 'Other', 60),
  ex('cr08', 'Swimming', MuscleGroup.CARDIO, 'Other', 0),
  ex('cr09', 'HIIT Sprints', MuscleGroup.CARDIO, 'Other', 90),
  ex('cr10', 'Battle Ropes', MuscleGroup.CARDIO, 'Other', 60),
  ex('cr11', 'Boxing', MuscleGroup.CARDIO, 'Other', 60),
  ex('cr12', 'Assault Bike', MuscleGroup.CARDIO, 'Machine', 60),
  ex('cr13', 'Sled Push', MuscleGroup.CARDIO, 'Other', 90),
];

// Look up library exercises by name to compose routines (skips silently if renamed)
const pick = (...names: string[]): ExerciseDefinition[] =>
  names
    .map(n => DEFAULT_EXERCISES.find(e => e.name === n))
    .filter((e): e is ExerciseDefinition => !!e);

const routine = (id: string, name: string, ...names: string[]): WorkoutRoutine => ({
  id, name, exercises: pick(...names)
});

export const DEFAULT_ROUTINES: WorkoutRoutine[] = [
  routine('r1', 'Upper Power', 'Bench Press', 'Bent Over Row', 'Overhead Press', 'Lat Pulldown', 'Barbell Curl', 'Tricep Pushdown'),
  routine('r2', 'Leg Day', 'Squat', 'Romanian Deadlift', 'Leg Press', 'Leg Curl', 'Standing Calf Raise'),
];

// --- PRESET TRAINING PLANS ---

export const PRESET_PLANS: PresetPlan[] = [
  {
    id: 'plan-ppl',
    name: 'Push / Pull / Legs',
    description: 'The classic high-volume hypertrophy split. Run it 3 or 6 days a week.',
    category: 'Hypertrophy',
    level: 'Intermediate',
    daysPerWeek: 6,
    routines: [
      routine('ppl-push', 'Push Day', 'Bench Press', 'Overhead Press', 'Incline Dumbbell Press', 'Cable Flyes', 'Lateral Raises', 'Tricep Pushdown', 'Overhead Tricep Extension'),
      routine('ppl-pull', 'Pull Day', 'Deadlift', 'Pull-ups', 'Seated Cable Row', 'Lat Pulldown', 'Face Pull', 'Barbell Curl', 'Hammer Curl'),
      routine('ppl-legs', 'Leg Day', 'Squat', 'Romanian Deadlift', 'Leg Press', 'Leg Curl', 'Leg Extension', 'Standing Calf Raise', 'Plank'),
    ]
  },
  {
    id: 'plan-ul',
    name: 'Upper / Lower Split',
    description: 'Balanced strength and size with 4 sessions per week. Great recovery-to-volume ratio.',
    category: 'Strength & Size',
    level: 'Intermediate',
    daysPerWeek: 4,
    routines: [
      routine('ul-upper-a', 'Upper A (Strength)', 'Bench Press', 'Bent Over Row', 'Overhead Press', 'Lat Pulldown', 'EZ-Bar Curl', 'Skull Crushers'),
      routine('ul-lower-a', 'Lower A (Strength)', 'Squat', 'Romanian Deadlift', 'Leg Press', 'Standing Calf Raise', 'Hanging Leg Raise'),
      routine('ul-upper-b', 'Upper B (Volume)', 'Incline Dumbbell Press', 'Seated Cable Row', 'Seated Dumbbell Press', 'Cable Flyes', 'Hammer Curl', 'Rope Pushdown'),
      routine('ul-lower-b', 'Lower B (Volume)', 'Deadlift', 'Bulgarian Split Squat', 'Leg Curl', 'Hip Thrust', 'Seated Calf Raise', 'Cable Crunch'),
    ]
  },
  {
    id: 'plan-fb',
    name: 'Full Body 3x',
    description: 'Hit every muscle three times a week. The most efficient start for new lifters.',
    category: 'Foundation',
    level: 'Beginner',
    daysPerWeek: 3,
    routines: [
      routine('fb-a', 'Full Body A', 'Squat', 'Bench Press', 'Seated Cable Row', 'Lateral Raises', 'Plank'),
      routine('fb-b', 'Full Body B', 'Deadlift', 'Overhead Press', 'Lat Pulldown', 'Leg Curl', 'Crunches'),
      routine('fb-c', 'Full Body C', 'Leg Press', 'Incline Dumbbell Press', 'Dumbbell Row', 'Dumbbell Curl', 'Russian Twist'),
    ]
  },
  {
    id: 'plan-5x5',
    name: 'StrongLifts 5x5',
    description: 'Pure barbell strength. Alternate A and B, 3 days a week, add weight every session.',
    category: 'Strength',
    level: 'Beginner',
    daysPerWeek: 3,
    routines: [
      routine('sl-a', 'Workout A (5x5)', 'Squat', 'Bench Press', 'Bent Over Row'),
      routine('sl-b', 'Workout B (5x5)', 'Squat', 'Overhead Press', 'Deadlift'),
    ]
  },
  {
    id: 'plan-bro',
    name: 'Bro Split',
    description: 'One muscle group per day, maximum pump. The bodybuilding classic.',
    category: 'Hypertrophy',
    level: 'Intermediate',
    daysPerWeek: 5,
    routines: [
      routine('bro-chest', 'Chest Day', 'Bench Press', 'Incline Dumbbell Press', 'Cable Flyes', 'Pec Deck Machine', 'Push-ups'),
      routine('bro-back', 'Back Day', 'Deadlift', 'Pull-ups', 'Bent Over Row', 'Seated Cable Row', 'Straight-Arm Pulldown'),
      routine('bro-shoulders', 'Shoulder Day', 'Overhead Press', 'Arnold Press', 'Lateral Raises', 'Rear Delt Flyes', 'Face Pull', 'Barbell Shrugs'),
      routine('bro-arms', 'Arm Day', 'Close-Grip Bench Press', 'Barbell Curl', 'Skull Crushers', 'Hammer Curl', 'Rope Pushdown', 'Wrist Curl'),
      routine('bro-legs', 'Leg Day', 'Squat', 'Leg Press', 'Romanian Deadlift', 'Leg Extension', 'Leg Curl', 'Standing Calf Raise'),
    ]
  },
  {
    id: 'plan-core',
    name: 'Core & Conditioning',
    description: 'Athletic core strength plus engine-building cardio. Stack onto any plan.',
    category: 'Conditioning',
    level: 'Beginner',
    daysPerWeek: 2,
    routines: [
      routine('cc-core', 'Core Circuit', 'Plank', 'Hanging Leg Raise', 'Cable Crunch', 'Russian Twist', 'Dead Bug', 'Side Plank'),
      routine('cc-hiit', 'HIIT Engine', 'HIIT Sprints', 'Battle Ropes', 'Assault Bike', 'Jump Rope', 'Mountain Climbers'),
    ]
  },
];
