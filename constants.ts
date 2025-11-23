import { ScheduleEvent, MaterialFile, ScheduleProfile, EventType } from './types';

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