
import { ScheduleEvent, Macros, PeriodDefinition } from "../types";
import { supabase } from "../lib/supabase";

// For Supabase Edge Functions
const getBackendUrl = () => {
  // For Edge Functions, use the supabase function invoke method
  return (import.meta as any).env?.VITE_SUPABASE_URL || 'http://localhost:54321';
};

const makeBackendRequest = async (endpoint: string, data: any) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  // For Supabase Edge Functions, use supabase.functions.invoke
  try {
    const { data: responseData, error } = await supabase.functions.invoke('ai-handler', {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: {
        ...data,
        endpoint,
      },
    });

    if (error) throw new Error(error.message || 'Backend request failed');
    return responseData;
  } catch (error) {
    // Fallback to direct HTTP if functions not available
    const backendUrl = getBackendUrl();
    const response = await fetch(`${backendUrl}/functions/v1/ai-handler${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Backend request failed: ${response.status}`);
    }

    return response.json();
  }
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


export const analyzeFoodText = async (description: string): Promise<Macros & { name: string }> => {
  trackUsage('nutrition_text');
  try {
    const data = await makeBackendRequest('/analyze-food-text', { description });
    return {
      name: data.name || 'Unknown Food',
      calories: data.calories || 0,
      protein: data.protein || 0,
      carbs: data.carbs || 0,
      fat: data.fat || 0
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
    const data = await makeBackendRequest('/analyze-food-image', { image: cleanBase64 });
    return {
      name: data.name || 'Unknown Food',
      calories: data.calories || 0,
      protein: data.protein || 0,
      carbs: data.carbs || 0,
      fat: data.fat || 0
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
    const data = await makeBackendRequest('/parse-event', { input, periods });
    return data as Partial<ScheduleEvent>;
  } catch (error) {
    console.error("Event parsing error:", error);
    return null;
  }
};

export const parseScheduleImage = async (base64Data: string): Promise<any[]> => {
  trackUsage('schedule_import');
  try {
    const data = await makeBackendRequest('/parse-schedule', { image: base64Data });
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
        const data = await makeBackendRequest('/chat', {
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
