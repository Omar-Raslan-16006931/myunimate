import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenAI, Type } from "https://esm.sh/@google/genai@1.30.0";
import {
  authenticateRequest,
  handleCors,
  errorResponse,
  successResponse,
  checkRateLimit,
  trackUsage,
} from "../shared/auth.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const genai = new GoogleGenAI({
  apiKey: Deno.env.get("GEMINI_API_KEY"),
});

const MODEL_NAME = "gemini-3-flash-preview";

serve(async (req: Request) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    // Authenticate request
    const { user, error: authError } = await authenticateRequest(req);
    if (authError || !user) {
      return errorResponse(authError || "Unauthorized", 401);
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(user.userId, 50, 3600000); // 50 per hour
    if (!rateLimit.allowed) {
      return errorResponse("Rate limit exceeded", 429);
    }

    const url = new URL(req.url);
    const path = url.pathname;

    // Route to appropriate handler
    if (path.includes("/analyze-food-text")) {
      return await analyzeFoodText(req, user);
    } else if (path.includes("/analyze-food-image")) {
      return await analyzeFoodImage(req, user);
    } else if (path.includes("/parse-event")) {
      return await parseEvent(req, user);
    } else if (path.includes("/parse-schedule")) {
      return await parseSchedule(req, user);
    } else if (path.includes("/chat")) {
      return await handleChat(req, user);
    } else {
      return errorResponse("Endpoint not found", 404);
    }
  } catch (error) {
    console.error("Unhandled error:", error);
    return errorResponse("Internal server error", 500);
  }
});

// Nutrition Analysis from Text
async function analyzeFoodText(req: Request, user: any): Promise<Response> {
  try {
    const body = await req.json();
    const { description } = body;

    if (!description || typeof description !== "string") {
      return errorResponse("Description is required");
    }

    const nutritionSchema = {
      type: Type.OBJECT,
      properties: {
        foodName: {
          type: Type.STRING,
          description: "A short, descriptive name of the food identified.",
        },
        calories: { type: Type.NUMBER, description: "Estimated total calories." },
        protein: { type: Type.NUMBER, description: "Estimated protein in grams." },
        carbs: {
          type: Type.NUMBER,
          description: "Estimated carbohydrates in grams.",
        },
        fat: { type: Type.NUMBER, description: "Estimated fat in grams." },
      },
      required: ["foodName", "calories", "protein", "carbs", "fat"],
    };

    const response = await genai.models.generateContent({
      model: MODEL_NAME,
      contents: `Analyze the following food description and estimate the nutritional content: "${description}". Be realistic.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: nutritionSchema,
        systemInstruction:
          "You are an expert nutritionist. Analyze food descriptions provided by the user and return accurate estimated macro-nutrients.",
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const data = JSON.parse(text);

    // Track usage
    await trackUsage(user.userId, "nutrition_text", supabase);

    return successResponse({
      name: data.foodName,
      calories: data.calories,
      protein: data.protein,
      carbs: data.carbs,
      fat: data.fat,
    });
  } catch (error) {
    console.error("Food text analysis error:", error);
    return errorResponse("Failed to analyze food text");
  }
}

// Nutrition Analysis from Image
async function analyzeFoodImage(req: Request, user: any): Promise<Response> {
  try {
    const body = await req.json();
    const { image } = body;

    if (!image || typeof image !== "string") {
      return errorResponse("Image data is required");
    }

    const cleanBase64 = image.split(",")[1] || image;

    const nutritionSchema = {
      type: Type.OBJECT,
      properties: {
        foodName: {
          type: Type.STRING,
          description: "A short, descriptive name of the food identified.",
        },
        calories: { type: Type.NUMBER, description: "Estimated total calories." },
        protein: { type: Type.NUMBER, description: "Estimated protein in grams." },
        carbs: {
          type: Type.NUMBER,
          description: "Estimated carbohydrates in grams.",
        },
        fat: { type: Type.NUMBER, description: "Estimated fat in grams." },
      },
      required: ["foodName", "calories", "protein", "carbs", "fat"],
    };

    const response = await genai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanBase64,
            },
          },
          {
            text: "Identify the food in this image and estimate the portion size and nutritional content for the entire visible portion.",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: nutritionSchema,
        systemInstruction:
          "You are an expert nutritionist. Analyze the image provided, estimate the portion size visually, and calculate the macros.",
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const data = JSON.parse(text);

    // Track usage
    await trackUsage(user.userId, "nutrition_image", supabase);

    return successResponse({
      name: data.foodName,
      calories: data.calories,
      protein: data.protein,
      carbs: data.carbs,
      fat: data.fat,
    });
  } catch (error) {
    console.error("Food image analysis error:", error);
    return errorResponse("Failed to analyze food image");
  }
}

// Natural Language Event Parsing
async function parseEvent(req: Request, user: any): Promise<Response> {
  try {
    const body = await req.json();
    const { input, periods } = body;

    if (!input || typeof input !== "string") {
      return errorResponse("Input is required");
    }

    const now = new Date();

    const periodContext =
      periods && periods.length > 0
        ? `\nAvailable Time Slots:\n${periods
            .map(
              (p: any) =>
                `- ${p.label}: Starts ${p.startTime}, Duration 90 mins`
            )
            .join("\n")}`
        : "";

    const dateContext = `Today is ${now.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })}.`;

    const response = await genai.models.generateContent({
      model: MODEL_NAME,
      contents: `Extract event details from this text: "${input}".\n${dateContext}\n${periodContext}\nReturn JSON only with this schema: { title: string, type: string, date: string (YYYY-MM-DD), startTime: string (HH:MM), durationMinutes: number, location: string, description: string }`,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text) return successResponse(null);

    const eventData = JSON.parse(text);

    // Track usage
    await trackUsage(user.userId, "autofill", supabase);

    return successResponse(eventData);
  } catch (error) {
    console.error("Event parsing error:", error);
    return successResponse(null); // Return null on error
  }
}

// Schedule Image Parsing
async function parseSchedule(req: Request, user: any): Promise<Response> {
  try {
    const body = await req.json();
    const { image } = body;

    if (!image || typeof image !== "string") {
      return errorResponse("Image data is required");
    }

    const prompt = `
        Role: You are a precise Data Extraction Engine for university schedules.
        Task: Extract the schedule from the provided image into strict JSON format.
        Output Format: Return ONLY a JSON array with this structure:
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

    const response = await genai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          { inlineData: { data: image, mimeType: "image/png" } },
          { text: prompt },
        ],
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
              type: { type: Type.STRING },
            },
          },
        },
      },
    });

    const text = response.text;
    if (!text) return successResponse([]);

    const extracted = JSON.parse(text);
    const filtered = extracted.filter(
      (item: any) =>
        item.course_name &&
        !item.course_name.toLowerCase().includes("free") &&
        !item.course_name.toLowerCase().includes("no class")
    );

    // Track usage
    await trackUsage(user.userId, "schedule_import", supabase);

    return successResponse(filtered);
  } catch (error) {
    console.error("Schedule parsing error:", error);
    return successResponse([]);
  }
}

// AI Chat Handler
async function handleChat(req: Request, user: any): Promise<Response> {
  try {
    const body = await req.json();
    const { history, message, periods, context } = body;

    if (!message || typeof message !== "string") {
      return errorResponse("Message is required");
    }

    const formattedHistory = (history || []).map((m: any) => ({
      role: m.role,
      parts: [{ text: m.text }],
    }));

    const now = new Date();
    const dateContext = `Current Date: ${now.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })}`;

    const systemInstruction = `You are a concise, helpful assistant for a university student.
      ${dateContext}
      ${context || ""}
      Behavior: No cringe. No emojis. Be brief and direct.`;

    const chatSession = genai.chats.create({
      model: MODEL_NAME,
      config: {
        systemInstruction,
      },
      history: formattedHistory,
    });

    const result = await chatSession.sendMessage({ message });

    // Track usage
    await trackUsage(user.userId, "chat", supabase);

    return successResponse({
      text: result.text || "I'm having trouble thinking right now.",
    });
  } catch (error) {
    console.error("Chat error:", error);
    return successResponse({
      text: "I'm having trouble thinking right now.",
    });
  }
}
