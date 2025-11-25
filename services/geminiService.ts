import { GoogleGenAI, Type, Schema, FunctionDeclaration } from "@google/genai";
import { ScheduleEvent, EventType, Macros, PeriodDefinition } from "../types";

const MODEL_NAME = 'gemini-2.5-flash';

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please provide a valid API key.");
  }
  return new GoogleGenAI({ apiKey });
};

// --- Nutrition Schema ---
const nutritionSchema: Schema = {
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

// --- Nutrition Analysis ---
export const analyzeFoodText = async (description: string): Promise<Macros & { name: string }> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Analyze the following food description and estimate the nutritional content: "${description}". Be realistic.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: nutritionSchema,
        systemInstruction: "You are an expert nutritionist. Analyze food descriptions provided by the user and return accurate estimated macro-nutrients."
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    const data = JSON.parse(text);
    return {
      name: data.foodName,
      calories: data.calories,
      protein: data.protein,
      carbs: data.carbs,
      fat: data.fat
    };
  } catch (error) {
    console.error("Gemini Text Analysis Error:", error);
    throw error;
  }
};

export const analyzeFoodImage = async (base64Image: string): Promise<Macros & { name: string }> => {
  try {
    const ai = getAiClient();
    // Remove header if present (e.g., "data:image/jpeg;base64,")
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64
            }
          },
          {
            text: "Identify the food in this image and estimate the portion size and nutritional content for the entire visible portion."
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: nutritionSchema,
        systemInstruction: "You are an expert nutritionist. Analyze the image provided, estimate the portion size visually, and calculate the macros."
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const data = JSON.parse(text);
    return {
      name: data.foodName,
      calories: data.calories,
      protein: data.protein,
      carbs: data.carbs,
      fat: data.fat
    };
  } catch (error) {
    console.error("Gemini Image Analysis Error:", error);
    throw error;
  }
};

// --- Magic Autofill (Schedule) ---
export const parseNaturalLanguageEvent = async (input: string, periods: PeriodDefinition[] = []): Promise<Partial<ScheduleEvent> | null> => {
  if (!input) return null;
  const now = new Date();
  
  // Format period info for the model
  const periodContext = periods.length > 0 
    ? `\nAvailable Time Slots (use these start times if user says "1st slot", "period 2", etc):
       ${periods.map(p => `- ${p.label}: Starts ${p.startTime}, Duration ${90} mins approx`).join('\n')}`
    : "";

  const dateContext = `Today is ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;

  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Extract event details from this text: "${input}".
            ${dateContext}
            ${periodContext}
            Return JSON only with this schema: { title: string, type: string (lecture/tutorial/lab/quiz/assignment/exam/study/other), date: string (YYYY-MM-DD), startTime: string (HH:MM), durationMinutes: number, location: string, description: string }.
            
            CRITICAL RULES:
            1. DATE LOGIC: "Next [Day]" (e.g., "Next Thursday") ALWAYS means the VERY NEXT occurrence of that day, even if it is in the current week.
               - Example: If today is Monday Nov 24, "Next Thursday" is Nov 27 (the closest upcoming Thursday).
               - Do NOT skip a week unless the user says "week after next".
            2. TIME SLOTS: If the user mentions a slot (e.g. "1st slot"), map it to the corresponding 'startTime' from the provided list.
            3. DURATION: Default to 90 minutes if not specified.
            4. Ensure YYYY-MM-DD format is accurate based on ${now.getFullYear()}.`,
      config: {
        responseMimeType: "application/json"
      },
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as Partial<ScheduleEvent>;
  } catch (error) {
    console.error("Autofill error:", error);
    return null;
  }
};

// --- Image to Schedule ---
export const parseScheduleImage = async (base64Data: string): Promise<any[]> => {
  try {
    const ai = getAiClient();
    const prompt = `
        Role: You are a precise Data Extraction Engine for university schedules.
        Task: Extract the schedule from the provided image into strict JSON format.
        CRITICAL VISUAL RULES (Do not ignore):
        1. Grid Logic: The schedule is a grid. The columns are "Periods" (1st to 5th) and rows are "Days" (Saturday to Thursday).
        2. Merged Cell Rule: If a cell spans multiple columns (horizontally) or rows (vertically), you must UNMERGE it in the data.
           - Example: If "Free" spans 1st, 2nd, and 3rd period, you must generate THREE separate entries: one for 1st, one for 2nd, and one for 3rd.
           - NEVER output a single entry for a time range.
           - ALWAYS break it down into the specific period slots defined in the header.
        3. Empty/Visual Gaps: If a slot has no text but is visually distinct (e.g., a grey box or empty white box), mark it as "Free" or "No Class".
        Output Format:
        Return ONLY a JSON array with this structure:
        [
          {
            "day": "Sunday",
            "period_number": 1,
            "time_start": "08:30",
            "time_end": "10:00",
            "course_name": "Databases",
            "room": "M1.205",
            "type": "Lecture"
          }
        ] 
      `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType: 'image/png' } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
             type: Type.ARRAY,
             items: {
               type: Type.OBJECT,
               properties: {
                 day: { type: Type.STRING },
                 period_number: { type: Type.INTEGER },
                 time_start: { type: Type.STRING },
                 time_end: { type: Type.STRING },
                 course_name: { type: Type.STRING },
                 room: { type: Type.STRING },
                 type: { type: Type.STRING }
               }
             }
          }
      },
    });

    const text = response.text;
    if (!text) return [];
    
    const extracted = JSON.parse(text);
    return extracted.filter((item: any) => 
        item.course_name && 
        !item.course_name.toLowerCase().includes('free') && 
        !item.course_name.toLowerCase().includes('no class')
    );

  } catch (error) {
    console.error("Image Parse Error:", error);
    return [];
  }
};

// --- Chat Assistant ---
export const getChatResponse = async (
    history: {role: string, text: string}[], 
    message: string, 
    periods: PeriodDefinition[] = [],
    context?: string
): Promise<{ text: string, eventData?: Partial<ScheduleEvent> }> => {
    // Allow errors to propagate to the caller for proper UI handling
    try {
        const ai = getAiClient();
        const formattedHistory = history.map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }));

        const now = new Date();
        const dateContext = `
        Current Date: ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.
        
        CRITICAL INSTRUCTIONS:
        1. DATES: "Next [Day]" (e.g. Next Thursday) means the closest upcoming Thursday, even if it's this week. Do not skip weeks unless explicitly told.
        2. SLOTS: Use the grid below. If user says "1st slot", use start time ${periods[0]?.startTime || '08:30'}.
        
        SCHEDULE GRID:
        ${periods.map(p => `- "${p.label}" (${p.startTime} - ${p.endTime})`).join('\n')}
        `;

        const chatSession = ai.chats.create({
        model: MODEL_NAME,
        config: {
            systemInstruction: `You are a concise, helpful assistant for a university student. 
            ${dateContext}
            ${context || ""}
            Behavior:
            - No cringe. No emojis. Be brief and direct.
            - If user asks to add an event, call 'addEvent'.
            - If user asks about "next Thursday", assume the closest upcoming Thursday.
            `,
            tools: [{ functionDeclarations: [addEventTool] }]
        },
        history: formattedHistory
        });

        const result = await chatSession.sendMessage({ message });
        
        let finalText = result.text || "";
        let eventData: Partial<ScheduleEvent> | undefined;

        // Check for tool calls
        const calls = result.functionCalls;
        if (calls && calls.length > 0) {
             const call = calls[0];
             if (call.name === 'addEvent') {
                 eventData = call.args as any;
                 
                 // Feed result back to get the final text response from model
                 const toolResult = await chatSession.sendMessage({
                     message: [{
                         functionResponse: {
                             name: 'addEvent',
                             id: call.id,
                             response: { result: "Event added successfully" }
                         }
                     }]
                 });
                 finalText = toolResult.text || "Event scheduled.";
             }
        }

        return { text: finalText, eventData };
    } catch (error) {
        console.error("Chat Error:", error);
        return { text: "I'm having trouble thinking right now." };
    }
};