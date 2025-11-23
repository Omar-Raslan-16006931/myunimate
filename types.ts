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
  type: "pdf" | "folder" | "image" | "other";
  size?: string;
  dateAdded: string;
  parentId?: string;
  content?: string; 
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

export interface Assessment {
  id: string;
  name: string;
  weight: number; // percentage 0-100
  score: number;
  total: number;
}

export interface CourseGrade {
  id: string;
  title: string;
  code?: string;
  assessments: Assessment[];
  targetGrade?: number;
}

export type ViewState = "dashboard" | "schedule" | "courses" | "materials" | "ai" | "settings" | "grades";

// Map event types to hex colors
export type EventColorMap = Record<EventType, string>;