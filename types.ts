

export type EventType = "lecture" | "tutorial" | "lab" | "quiz" | "assignment" | "exam" | "study" | "other";

export interface ScheduleEvent {
  id: string;
  scheduleId: string;
  title: string;
  code?: string; 
  group?: string; 
  type: EventType;
  isRecurring: boolean;
  dayOfWeek?: string;
  date?: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  durationMinutes: number;
  description?: string;
  location?: string;
}

export interface MaterialFile {
  id: string;
  name: string;
  type: "pdf" | "folder" | "image" | "google-doc" | "google-sheet" | "google-slide" | "other";
  size?: string;
  dateAdded: string;
  parentId?: string;
  content?: string; 
  source?: "local" | "drive";
  webViewLink?: string;
  iconLink?: string;
  mimeType?: string;
}

export interface ScheduleProfile {
  id: string;
  name: string;
  isActive?: boolean;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface ExtractedScheduleItem {
    day: string;
    period_number: number;
    time_start: string;
    time_end: string;
    course_name: string;
    course_code: string;
    room: string;
    type: string;
}

export interface ReferralCode {
  id: string;
  code: string;
  is_active: boolean;
  usage_count: number;
  created_at: string;
  subscription_tier?: number;
}

export interface Announcement {
  id: string;
  message: string;
  is_active: boolean;
  created_at: string;
}

export interface FeedbackItem {
  id: string;
  user_id: string;
  message: string;
  type: 'bug' | 'feature' | 'general';
  created_at: string;
  username?: string; // For display after join
}

export interface AppFeedback {
  id: string;
  user_id: string;
  message: string;
  category: 'Bug' | 'Feature Request' | 'Other';
  status: 'read' | 'unread';
  created_at: string;
  admin_reply?: string;
  admin_reply_at?: string;
}

// --- UNIVERSAL GRADE TYPES ---

export interface GradeItem {
  id: string;
  name: string;
  score: string; // String to handle empty state
  total: string; // String to handle empty state
  weight?: string; // Optional individual weight within category
  active: boolean; // "What-if" toggle
}

export interface GradeCategory {
  id: string;
  name: string;
  weight: string; // Percentage (0-100)
  dropLowest: string; // Number of items to drop
  items: GradeItem[];
}

export interface CourseGrade {
  id: string;
  title: string;
  code?: string;
  targetGrade: string;
  categories: GradeCategory[];
}

export type ViewState = "dashboard" | "schedule" | "courses" | "materials" | "ai" | "settings" | "grades" | "gym";

// Map event types to hex colors
export type EventColorMap = Record<EventType, string>;

// --- SCHEDULE CONFIG TYPES ---

export interface PeriodDefinition {
  id: string;
  label: string;
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  isBreak: boolean;
  startVal?: number; // Calculated helper (e.g. 8.5 for 08:30)
}

// --- GYM TYPES ---

export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface FoodItem extends Macros {
  id: string;
  name: string;
  timestamp: number;
  imageUri?: string; 
}

export interface ExerciseSet {
  id: string;
  weight: number;
  reps: number;
  completed: boolean;
}

export interface WorkoutExercise {
  id: string;
  name: string;
  muscleGroup: string;
  sets: ExerciseSet[];
  restTime?: number; 
}

export interface WorkoutSession {
  id: string;
  name: string; 
  startTime: number;
  endTime: number;
  exercises: WorkoutExercise[];
  routineId?: string; 
}

export interface WaterLog {
  id: string;
  amount: number; 
  timestamp: number;
}

export type Gender = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export interface GymSettings {
  targets: Macros;
  waterTarget: number; 
  defaultRestTimer: number;
  name: string;
  gender: Gender;
  age: number;
  weight: number; 
  height: number; 
  activityLevel: ActivityLevel;
}

export enum MuscleGroup {
  CHEST = 'Chest',
  BACK = 'Back',
  LEGS = 'Legs',
  SHOULDERS = 'Shoulders',
  ARMS = 'Arms',
  CORE = 'Core',
  CARDIO = 'Cardio'
}

export type Equipment = 'Barbell' | 'Dumbbell' | 'Machine' | 'Bodyweight' | 'Cable' | 'Other';

export interface ExerciseDefinition {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  imageUrl?: string;
  isCustom?: boolean;
  restTime?: number;
}

export interface WorkoutRoutine {
  id: string;
  name: string;
  exercises: ExerciseDefinition[];
  lastPerformed?: number;
}

export enum GymViewType {
  DASHBOARD = 'DASHBOARD',
  WORKOUT = 'WORKOUT',
  NUTRITION = 'NUTRITION',
  SETTINGS = 'SETTINGS'
}

export type ThemeMode = 'dark' | 'light';