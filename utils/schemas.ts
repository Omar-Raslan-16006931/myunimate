/**
 * Schema Validators for Type Safety
 * Ensures parsed data matches expected structure
 */

import type {
  ScheduleEvent,
  PeriodDefinition,
  ChatMessage,
  CourseGrade,
  ToDoItem,
} from "../types";

/**
 * Type guards for runtime type checking
 */

export const isScheduleEvent = (obj: any): obj is ScheduleEvent => {
  return (
    typeof obj.id === "string" &&
    typeof obj.title === "string" &&
    typeof obj.startTime === "string" &&
    typeof obj.durationMinutes === "number" &&
    typeof obj.isRecurring === "boolean"
  );
};

export const isPeriodDefinition = (obj: any): obj is PeriodDefinition => {
  return (
    typeof obj.id === "string" &&
    typeof obj.label === "string" &&
    typeof obj.startTime === "string" &&
    typeof obj.endTime === "string" &&
    typeof obj.isBreak === "boolean"
  );
};

export const isChatMessage = (obj: any): obj is ChatMessage => {
  return (
    typeof obj.role === "string" &&
    typeof obj.text === "string" &&
    (obj.role === "user" || obj.role === "model")
  );
};

export const isCourseGrade = (obj: any): obj is CourseGrade => {
  return (
    typeof obj.id === "string" &&
    typeof obj.title === "string" &&
    Array.isArray(obj.categories)
  );
};

export const isToDoItem = (obj: any): obj is ToDoItem => {
  return (
    typeof obj.id === "string" &&
    typeof obj.text === "string" &&
    typeof obj.completed === "boolean"
  );
};

/**
 * Cache Data Validation
 */
export interface CachedData {
  events?: ScheduleEvent[];
  profiles?: any[];
  courses?: CourseGrade[];
  todos?: ToDoItem[];
  materials?: any[];
  timestamp?: number;
}

export const isCachedData = (obj: any): obj is CachedData => {
  try {
    if (typeof obj !== "object" || obj === null) {
      return false;
    }

    // Check events array
    if (obj.events !== undefined) {
      if (!Array.isArray(obj.events)) return false;
      if (obj.events.length > 0 && !isScheduleEvent(obj.events[0])) {
        // At least validate first item
        return false;
      }
    }

    // Check profiles array
    if (obj.profiles !== undefined && !Array.isArray(obj.profiles)) {
      return false;
    }

    // Check courses array
    if (obj.courses !== undefined) {
      if (!Array.isArray(obj.courses)) return false;
      if (obj.courses.length > 0 && !isCourseGrade(obj.courses[0])) {
        return false;
      }
    }

    // Check todos array
    if (obj.todos !== undefined) {
      if (!Array.isArray(obj.todos)) return false;
      if (obj.todos.length > 0 && !isToDoItem(obj.todos[0])) {
        return false;
      }
    }

    // Check materials array
    if (obj.materials !== undefined && !Array.isArray(obj.materials)) {
      return false;
    }

    // Check timestamp
    if (obj.timestamp !== undefined && typeof obj.timestamp !== "number") {
      return false;
    }

    return true;
  } catch {
    return false;
  }
};

/**
 * AI Response Validation
 */

export interface NutritionData {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export const isNutritionData = (obj: any): obj is NutritionData => {
  return (
    typeof obj.name === "string" &&
    typeof obj.calories === "number" &&
    typeof obj.protein === "number" &&
    typeof obj.carbs === "number" &&
    typeof obj.fat === "number" &&
    obj.calories >= 0 &&
    obj.protein >= 0 &&
    obj.carbs >= 0 &&
    obj.fat >= 0
  );
};

export interface ParsedEventData {
  title?: string;
  type?: string;
  date?: string;
  startTime?: string;
  durationMinutes?: number;
  location?: string;
  description?: string;
}

export const isParsedEventData = (obj: any): obj is ParsedEventData => {
  if (typeof obj !== "object" || obj === null) return false;

  // All fields are optional, but if present must be correct type
  if (obj.title !== undefined && typeof obj.title !== "string") return false;
  if (obj.type !== undefined && typeof obj.type !== "string") return false;
  if (obj.date !== undefined && typeof obj.date !== "string") return false;
  if (obj.startTime !== undefined && typeof obj.startTime !== "string")
    return false;
  if (obj.durationMinutes !== undefined && typeof obj.durationMinutes !== "number")
    return false;
  if (obj.location !== undefined && typeof obj.location !== "string") return false;
  if (obj.description !== undefined && typeof obj.description !== "string")
    return false;

  return true;
};

export interface ScheduleParseResult {
  day: string;
  period_number: number;
  time_start: string;
  time_end: string;
  course_name: string;
  room: string;
  type: string;
}

export const isScheduleParseResult = (obj: any): obj is ScheduleParseResult => {
  return (
    typeof obj.day === "string" &&
    typeof obj.period_number === "number" &&
    typeof obj.time_start === "string" &&
    typeof obj.time_end === "string" &&
    typeof obj.course_name === "string" &&
    typeof obj.room === "string" &&
    typeof obj.type === "string"
  );
};

/**
 * Validate array of items with type guard
 */
export const validateArray = <T>(
  arr: any,
  guard: (item: any) => item is T
): arr is T[] => {
  if (!Array.isArray(arr)) return false;
  return arr.every((item) => guard(item));
};

/**
 * Safe JSON parse with validation
 */
export const safeJSONParse = <T>(
  json: string,
  validator: (obj: any) => obj is T,
  defaultValue?: T
): { success: boolean; data?: T; error?: string } => {
  try {
    const parsed = JSON.parse(json);

    if (!validator(parsed)) {
      return {
        success: false,
        error: "Parsed data does not match expected schema",
        data: defaultValue,
      };
    }

    return { success: true, data: parsed };
  } catch (error) {
    return {
      success: false,
      error: `JSON parse error: ${error instanceof Error ? error.message : String(error)}`,
      data: defaultValue,
    };
  }
};

/**
 * Sanitize and validate user input from localStorage
 */
export const sanitizeStoredData = (data: any): any => {
  if (data === null || data === undefined) return null;

  if (typeof data === "string") {
    // Remove control characters and limit length
    return data.substring(0, 10000).replace(/[\x00-\x1F]/g, "");
  }

  if (typeof data === "object") {
    if (Array.isArray(data)) {
      return data.map((item) => sanitizeStoredData(item)).slice(0, 1000);
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof key === "string" && key.length < 100) {
        sanitized[key] = sanitizeStoredData(value);
      }
    }
    return sanitized;
  }

  return data;
};
