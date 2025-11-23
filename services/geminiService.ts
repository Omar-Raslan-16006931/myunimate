import { GoogleGenAI, Type } from "@google/genai";
import { ScheduleEvent, EventType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
const MODEL_NAME = 'gemini-2.5-flash';

// --- Magic Autofill ---
export const parseNaturalLanguageEvent = async (input: string): Promise<Partial<ScheduleEvent> | null> => {
  if (!input) return null;
  const today = new Date().toISOString().split('T')[0];

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Extract event details from this text: "${input}".
            Today is ${today}.
            Return JSON only with this schema: { title: string, type: string (lecture/tutorial/lab/quiz/assignment/exam/study/other), date: string (YYYY-MM-DD), startTime: string (HH:MM), durationMinutes: number, location: string, description: string }.
            If specific date is not mentioned but day is (e.g. "next monday"), calculate YYYY-MM-DD based on today.`,
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
export const getChatResponse = async (history: {role: string, text: string}[], message: string, context?: string): Promise<string> => {
  try {
    const formattedHistory = history.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
    }));

    const chatSession = ai.chats.create({
      model: MODEL_NAME,
      config: {
        systemInstruction: "You are 'College Container AI', a helpful, witty, and academic-focused assistant for a university student. You help with scheduling, study tips, and explaining concepts. Keep answers concise and helpful." + (context || ""),
      },
      history: formattedHistory
    });

    const result = await chatSession.sendMessage({ message });
    return result.text || "I'm having trouble thinking right now.";
  } catch (error) {
    console.error("Chat Error:", error);
    return "Sorry, I couldn't reach the server.";
  }
};
