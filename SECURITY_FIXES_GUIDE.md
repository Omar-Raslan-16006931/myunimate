# Security Fixes Implementation Guide

## Overview
This guide provides step-by-step instructions to fix critical security vulnerabilities found in the audit.

---

## Fix #1: Backend API for Gemini (CRITICAL) ✅ IN PROGRESS

### Status: Frontend updated, backend needed

**Files Modified:**
- ✅ `vite.config.ts` - Removed API key embedding
- ✅ `geminiService.ts` - Updated to use backend API endpoints

**What You Need to Do:**

### Option A: Using Supabase Edge Functions (Recommended)

1. **Create Edge Function for AI Features:**

```bash
# Install Supabase CLI if not already installed
npm install supabase --save-dev

# Create functions directory
supabase functions new ai-handler
```

2. **Create file: `supabase/functions/ai-handler/index.ts`:**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenAI } from "https://esm.sh/@google/genai@latest";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const genai = new GoogleGenAI({
  apiKey: Deno.env.get("GEMINI_API_KEY"),
});

serve(async (req) => {
  // Add CORS headers
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get auth token
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");

    // Verify user
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    const body = await req.json();
    const endpoint = new URL(req.url).pathname;

    // Route to appropriate handler
    if (endpoint.includes("/analyze-food-text")) {
      return await analyzeFoodText(body, data.user.id);
    } else if (endpoint.includes("/analyze-food-image")) {
      return await analyzeFoodImage(body, data.user.id);
    } else if (endpoint.includes("/parse-event")) {
      return await parseEvent(body, data.user.id);
    } else if (endpoint.includes("/parse-schedule")) {
      return await parseSchedule(body, data.user.id);
    } else if (endpoint.includes("/chat")) {
      return await handleChat(body, data.user.id);
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
});

async function analyzeFoodText(body: any, userId: string) {
  // Implementation here
  // Remember to track usage in Supabase!
}

async function analyzeFoodImage(body: any, userId: string) {
  // Implementation here
}

async function parseEvent(body: any, userId: string) {
  // Implementation here
}

async function parseSchedule(body: any, userId: string) {
  // Implementation here
}

async function handleChat(body: any, userId: string) {
  // Implementation here
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, content-type",
};
```

3. **Set Environment Variable in Supabase:**

```bash
supabase secrets set GEMINI_API_KEY=your_actual_api_key
```

4. **Update Frontend Config:**

Create `.env.local`:
```
VITE_API_URL=https://your-project.supabase.co/functions/v1
```

### Option B: Using Express.js Backend

1. **Install dependencies:**
```bash
npm install express @google/genai cors dotenv
```

2. **Create `backend/routes/ai.ts`:**

```typescript
import express from 'express';
import { GoogleGenAI } from '@google/genai';
import { authenticateUser } from '../middleware/auth';

const router = express.Router();
const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

router.post('/analyze-food-text', authenticateUser, async (req, res) => {
  try {
    const { description } = req.body;
    if (!description) return res.status(400).json({ error: 'Description required' });

    const ai = genai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze food: "${description}"`,
      // ... rest of implementation
    });

    // Track usage
    // ... track API usage

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

---

## Fix #2: Add User ID Verification to Queries (CRITICAL) ✅

### Status: Needs implementation

**Action Required:**
Update all database queries in these files to include user ownership checks:

1. **`AdminInbox.tsx`** - Add auth checks:

```typescript
// Before updating/deleting, verify ownership or admin status
const { data: { session } } = await supabase.auth.getSession();

// For admin operations - check admin status
const { data: profile } = await supabase
  .from('profiles')
  .select('is_admin')
  .eq('id', session.user.id)
  .single();

if (!profile?.is_admin) {
  throw new Error("Unauthorized - Admin access required");
}
```

2. **`App.tsx`** - Ensure all queries include user_id filter:

```typescript
// ✅ CORRECT
const { data: events } = await supabase
  .from('events')
  .select('*')
  .eq('user_id', session.user.id)  // Always include this
  .eq('profile_id', activeProfileId);

// ❌ WRONG (vulnerable to IDOR)
const { data: events } = await supabase
  .from('events')
  .select('*')
  .eq('profile_id', activeProfileId);  // No user_id check!
```

---

## Fix #3: Implement Row-Level Security (RLS) (CRITICAL) ✅

### Status: Needs Supabase configuration

**Create RLS Policies in Supabase Dashboard:**

1. **Enable RLS on all tables:**

```sql
-- Go to Supabase Dashboard > SQL Editor and run:

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_ledger ENABLE ROW LEVEL SECURITY;
```

2. **Create Personal Data Policies:**

```sql
-- Users can read/update/delete their own events
CREATE POLICY "Users can manage own events"
ON events FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can read/update/delete their own profiles
CREATE POLICY "Users can manage own profile"
ON profiles FOR ALL
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Apply similar policies to: courses, todos, schedule_profiles, materials, wallet_ledger
```

3. **Create Admin Policies:**

```sql
-- Admins can view all feedback and replies
CREATE POLICY "Admins can view all feedback"
ON app_feedback FOR SELECT
USING (
  (SELECT is_admin FROM profiles WHERE profiles.id = auth.uid()) = true
);

CREATE POLICY "Admins can manage feedback"
ON app_feedback FOR UPDATE, DELETE
USING (
  (SELECT is_admin FROM profiles WHERE profiles.id = auth.uid()) = true
)
WITH CHECK (
  (SELECT is_admin FROM profiles WHERE profiles.id = auth.uid()) = true
);
```

---

## Fix #4: Input Validation Improvements (HIGH) ✅

### In `Auth.tsx`:

```typescript
// 1. Better email validation
const isValidEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

if (!isValidEmail(identifier)) {
  throw new Error("Please enter a valid email address.");
}

// 2. Increase password minimum
if (password.length < 12) {
  throw new Error("Password must be at least 12 characters long.");
}

// 3. Sanitize username - allow alphanumeric, underscore, hyphen only
const isValidUsername = (username: string) => {
  return /^[a-zA-Z0-9_-]+$/.test(username);
};

if (!isValidUsername(username.trim())) {
  throw new Error("Username can only contain letters, numbers, underscores, and hyphens.");
}
```

---

## Fix #5: JSON.parse Error Handling (CRITICAL) ✅

### Template for all JSON.parse instances:

```typescript
// ❌ BEFORE (Vulnerable)
const data = JSON.parse(cachedData);
setEvents(data.events);

// ✅ AFTER (Safe)
try {
  const data = JSON.parse(cachedData);

  // Validate schema
  if (!Array.isArray(data.events)) {
    throw new Error("Invalid cache structure");
  }

  // Validate event objects
  const validEvents = data.events.filter(e =>
    typeof e.id === 'string' &&
    typeof e.title === 'string' &&
    typeof e.user_id === 'string'
  );

  setEvents(validEvents);
} catch (error) {
  console.warn("Failed to load cache, starting fresh:", error);
  // Fall back to fetching from database
  fetchEvents();
}
```

---

## Fix #6: Remove .env from Git History (CRITICAL) ✅

```bash
# Remove .env from git history
git rm --cached .env

# Add to .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore

# Create .env.example with placeholder values
cat > .env.example << 'EOF'
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=http://localhost:3000
EOF

# Commit
git add .env.example .gitignore
git commit -m "chore: remove sensitive .env from history and add example"

# Force push if already pushed (careful!)
git push origin main --force
```

**Important:** After removing from git history, rotate your Supabase keys:
1. Go to Supabase Dashboard > Settings > API Keys
2. Create new anon and service keys
3. Update `.env` locally with new keys

---

## Fix #7: Add CSRF Protection (CRITICAL) ✅

### Create CSRF middleware:

```typescript
// middleware/csrf.ts
import { createHash } from 'crypto';

export const generateCSRFToken = (sessionId: string): string => {
  return createHash('sha256')
    .update(sessionId + process.env.CSRF_SECRET)
    .digest('hex');
};

export const validateCSRFToken = (token: string, sessionId: string): boolean => {
  const expected = generateCSRFToken(sessionId);
  return token === expected;
};
```

### Use in frontend:

```typescript
// Get CSRF token on auth
const { data: { session } } = await supabase.auth.getSession();
const csrfToken = await fetch('/api/csrf-token', {
  headers: { 'Authorization': `Bearer ${session?.access_token}` }
}).then(r => r.json());

// Send with state-changing requests
const response = await fetch('/api/update', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': csrfToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
});
```

---

## Fix #8: Sanitize Console Logs (MEDIUM) ✅

### Create logger utility:

```typescript
// utils/logger.ts
export const safeLog = (message: string, data?: any) => {
  if (process.env.NODE_ENV === 'production') {
    // Only log non-sensitive errors in production
    if (data?.error) {
      console.error(`[ERROR] ${message}: ${data.error.code || 'Unknown'}`);
    }
  } else {
    console.log(`[${message}]`, data);
  }
};

export const safeError = (message: string, error: any) => {
  const sanitized = {
    code: error.code,
    message: error.message,
    // Never log: tokens, passwords, personal data
  };
  console.error(message, sanitized);
};
```

---

## Timeline & Priority

| Priority | Task | Est. Time | Difficulty |
|----------|------|-----------|-----------|
| 1 | Move Gemini key to backend | 2 hours | Medium |
| 2 | Implement RLS policies | 1 hour | Easy |
| 3 | Add user_id verification | 1 hour | Easy |
| 4 | Input validation | 30 min | Easy |
| 5 | JSON error handling | 1 hour | Easy |
| 6 | Remove .env from git | 15 min | Easy |
| 7 | CSRF protection | 1 hour | Medium |
| 8 | Sanitize logging | 30 min | Easy |

**Total Estimated Time:** 7-9 hours

---

## Testing Checklist

- [ ] Backend AI endpoints working with authentication
- [ ] RLS policies blocking unauthorized access
- [ ] User_id queries prevent IDOR
- [ ] JSON parsing handles malformed data
- [ ] CSRF tokens prevent state changes
- [ ] Console logs don't expose sensitive data
- [ ] Admin functions require admin status
- [ ] File uploads have size/type validation
- [ ] Email validation working
- [ ] Password requirements enforced

---

## Deployment Checklist

1. [ ] All code changes committed
2. [ ] RLS policies created in production Supabase
3. [ ] Environment variables set securely
4. [ ] Backend API deployed (if using Express/Node)
5. [ ] API keys rotated
6. [ ] .env removed from git
7. [ ] Tested all fixes in staging
8. [ ] Security headers configured
9. [ ] Rate limiting deployed
10. [ ] Monitoring alerts set up

---

**Last Updated:** 2026-05-27  
**Next Review:** After all critical fixes are implemented
