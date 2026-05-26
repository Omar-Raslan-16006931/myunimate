import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

interface AuthContext {
  userId: string;
  email: string;
  token: string;
  headers: Record<string, string>;
}

export async function authenticateRequest(
  req: Request
): Promise<{ user: AuthContext | null; error: string | null }> {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return { user: null, error: "Missing Authorization header" };
    }

    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      return { user: null, error: "Invalid Authorization header format" };
    }

    // Verify JWT token
    const { data: user, error } = await supabase.auth.getUser(token);
    if (error || !user?.user) {
      return { user: null, error: "Invalid or expired token" };
    }

    // Verify user exists in profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, is_admin")
      .eq("id", user.user.id)
      .single();

    if (profileError || !profile) {
      return { user: null, error: "User not found in profiles" };
    }

    return {
      user: {
        userId: user.user.id,
        email: user.user.email ?? "",
        token,
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
      error: null,
    };
  } catch (error) {
    return {
      user: null,
      error: `Authentication failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, content-type, x-csrf-token",
        "Access-Control-Max-Age": "86400",
      },
    });
  }
  return null;
}

export function errorResponse(
  error: string,
  status: number = 400
): Response {
  return new Response(
    JSON.stringify({
      error: error.split(":")[0], // Don't expose full error details
      code: status,
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}

export function successResponse(data: any): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

// Rate limiting helper
const requestCounts = new Map<string, number[]>();

export async function checkRateLimit(
  userId: string,
  limit: number = 50,
  windowMs: number = 3600000 // 1 hour
): Promise<{ allowed: boolean; remaining: number }> {
  const now = Date.now();
  const key = userId;

  if (!requestCounts.has(key)) {
    requestCounts.set(key, []);
  }

  const timestamps = requestCounts.get(key)!;

  // Remove old timestamps outside the window
  const validTimestamps = timestamps.filter((ts) => now - ts < windowMs);
  requestCounts.set(key, validTimestamps);

  const allowed = validTimestamps.length < limit;

  if (allowed) {
    validTimestamps.push(now);
    requestCounts.set(key, validTimestamps);
  }

  return {
    allowed,
    remaining: Math.max(0, limit - validTimestamps.length),
  };
}

// Usage tracking helper
export async function trackUsage(
  userId: string,
  feature: string,
  supabaseClient: any
): Promise<void> {
  try {
    const todayStr = new Date().toISOString().split("T")[0];

    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("settings")
      .eq("id", userId)
      .single();

    if (profile) {
      const settings = profile.settings || {};
      const usage = settings.usage || { total: 0, today: 0, date: todayStr, features: {} };

      if (usage.date !== todayStr) {
        usage.today = 0;
        usage.date = todayStr;
      }

      usage.total = (usage.total || 0) + 1;
      usage.today = (usage.today || 0) + 1;

      if (!usage.features) usage.features = {};
      usage.features[feature] = (usage.features[feature] || 0) + 1;

      await supabaseClient
        .from("profiles")
        .update({
          settings: { ...settings, usage },
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
    }
  } catch (_error) {
    // Silent fail - don't disrupt user experience
  }
}
