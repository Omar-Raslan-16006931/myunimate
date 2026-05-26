
import { Type, FunctionDeclaration } from "@google/genai";
import { ScheduleEvent, Macros, PeriodDefinition } from "../types";
import { supabase } from "../lib/supabase";

const MODEL_NAME = 'gemini-3-flash-preview';
const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const makeBackendRequest = async (endpoint: string, data: any) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Backend request failed: ${response.status}`);
  }

  return response.json();
};

// --- Usage Tracking Helper ---
const trackUsage = async (feature: string) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return;

    const todayStr = new Date().toISOString().split('T')[0];
    
    // Fetch only settings to minimize data transfer
    const { data: profile } = await supabase
      .from('profiles')
      .select('settings')
      .eq('id', session.user.id)
      .single();

    if (profile) {
      const settings = profile.settings || {};
      const usage = settings.usage || { total: 0, today: 0, date: todayStr, features: {} };

      // Reset daily counter if date changed
      if (usage.date !== todayStr) {
          usage.today = 0;
          usage.date = todayStr;
      }

      // Increment counters
      usage.total = (usage.total || 0) + 1;
      usage.today = (usage.today || 0) + 1;
      
      if (!usage.features) usage.features = {};
      usage.features[feature] = (usage.features[feature] || 0) + 1;

      // Fire and forget update
      await supabase
        .from('profiles')
        .update({ settings: { ...settings, usage }, updated_at: new Date().toISOString() })
        .eq('id', session.user.id);
    }
  } catch (err) {
    // Silent fail to not disrupt user experience
    console.warn("Failed to track AI usage", err);
  }
};

// --- Nutrition Schema ---
// Removed Schema type annotation as per naming safety guidelines
const nutritionSchema = {
  type: Type.OBJECT,
  properties: {
    foodName: { type: Type.STRING, description: "A short, descriptive name of the food identified." },
    calories: { type: Type.NUMBER, description: "Estimated total calories." },
    protein: { type: Type.NUMBER, description: "Estimated protein in grams." },
    carbs: { type: Type.NUMBER, description: "Estimated carbohydrates in grams." },
    fat: { type: Type.NUMBER, description: "Estimated fat in grams." },
  },
  required: ["foodName", "calories", "protein", "carbs", "fat"],
};

// --- Add Event Tool Definition ---
const addEventTool: FunctionDeclaration = {
  name: "addEvent",
  description: "Schedule a new event (class, quiz, etc) into the calendar.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "Title of the event" },
      type: { type: Type.STRING, description: "Type: lecture, tutorial, lab, quiz, assignment, exam, study, other" },
      date: { type: Type.STRING, description: "Date in YYYY-MM-DD format" },
      startTime: { type: Type.STRING, description: "Start time in HH:MM format (24-hour)" },
      durationMinutes: { type: Type.NUMBER, description: "Duration in minutes" },
      location: { type: Type.STRING, description: "Location or room number" },
      description: { type: Type.STRING, description: "Brief description" },
      isRecurring: { type: Type.BOOLEAN, description: "Whether this event repeats weekly" },
      dayOfWeek: { type: Type.STRING, description: "Day of week if recurring (e.g. Monday)" }
    },
    required: ["title", "type", "date", "startTime"]
  }
};

export const analyzeFoodText = async (description: string): Promise<Macros & { name: string }> => {
  trackUsage('nutrition_text');
  try {
    const data = await makeBackendRequest('/api/ai/analyze-food-text', { description });
    return {
      name: data.name,
      calories: data.calories,
      protein: data.protein,
      carbs: data.carbs,
      fat: data.fat
    };
  } catch (error) {
    console.error("Food text analysis error:", error);
    throw error;
  }
};

export const analyzeFoodImage = async (base64Image: string): Promise<Macros & { name: string }> => {
  trackUsage('nutrition_image');
  try {
    const cleanBase64 = base64Image.split(',')[1] || base64Image;
    const data = await makeBackendRequest('/api/ai/analyze-food-image', { image: cleanBase64 });
    return {
      name: data.name,
      calories: data.calories,
      protein: data.protein,
      carbs: data.carbs,
      fat: data.fat
    };
  } catch (error) {
    console.error("Food image analysis error:", error);
    throw error;
  }
};

export const parseNaturalLanguageEvent = async (input: string, periods: PeriodDefinition[] = []): Promise<Partial<ScheduleEvent> | null> => {
  if (!input) return null;
  trackUsage('autofill');

  try {
    const data = await makeBackendRequest('/api/ai/parse-event', { input, periods });
    return data as Partial<ScheduleEvent>;
  } catch (error) {
    console.error("Event parsing error:", error);
    return null;
  }
};

export const parseScheduleImage = async (base64Data: string): Promise<any[]> => {
  trackUsage('schedule_import');
  try {
    const data = await makeBackendRequest('/api/ai/parse-schedule', { image: base64Data });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Schedule parsing error:", error);
    return [];
  }
};

export const getChatResponse = async (
    history: {role: string, text: string}[],
    message: string,
    periods: PeriodDefinition[] = [],
    context?: string
): Promise<{ text: string, eventData?: Partial<ScheduleEvent> }> => {
    trackUsage('chat');
    try {
        const data = await makeBackendRequest('/api/ai/chat', {
          history,
          message,
          periods,
          context
        });
        return {
          text: data.text || "I'm having trouble thinking right now.",
          eventData: data.eventData
        };
    } catch (error) {
        console.error("Chat error:", error);
        return { text: "I'm having trouble thinking right now." };
    }
};
