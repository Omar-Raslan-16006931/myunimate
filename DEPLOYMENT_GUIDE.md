# DEPLOYMENT & SETUP INSTRUCTIONS

## Quick Setup Checklist

### 1. Install Dependencies
```bash
npm install dompurify zod
```

### 2. Configure Environment Variables
```bash
# Create .env.local (copy from .env.example)
cp .env.example .env.local

# Update with actual values:
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_PUBLISHABLE_KEY
# - VITE_SUPABASE_ANON_KEY
# - VITE_API_URL (backend endpoint)
```

### 3. Setup Supabase Edge Functions
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Create project (if not already created)
supabase projects create --name unimate

# Link to existing project
supabase link --project-id your_project_id

# Deploy edge functions
supabase functions deploy ai-handler
supabase functions deploy shared/auth

# Set secrets
supabase secrets set GEMINI_API_KEY=sk-your_actual_key_here
```

### 4. Run Row-Level Security (RLS) SQL Setup
```bash
# Open Supabase Dashboard > SQL Editor
# Copy entire content of security_setup.sql
# Paste and run in SQL editor
```

### 5. Build & Test
```bash
# Development
npm run dev

# Production build
npm run build

# Check that API key is NOT in bundle
grep -r "sk-" dist/ || echo "✅ API key not exposed"

# Test build
npm run preview
```

### 6. Commit Changes
```bash
git add .
git commit -m "security: implement comprehensive security hardening

- Move Gemini API key from frontend to backend Edge Functions
- Add Row-Level Security (RLS) policies on all database tables
- Implement comprehensive input validation on all user inputs
- Add secure logging without sensitive data exposure
- Fix XSS vulnerability in shader-lines component
- Add JSON parsing safety with schema validators
- Implement authentication middleware for backend
- Sanitize cache loading with data validation
- Update Auth flow with strong password requirements
- Add user_id verification to all database queries

All 9 critical security vulnerabilities now fixed."

git push origin main
```

---

## Detailed Setup Instructions

### Step 1: API Key Rotation (Critical)

**In Supabase Dashboard:**
1. Go to Settings > API Keys
2. Click "Rotate Key" on Publishable Key
3. Copy new key
4. Click "Rotate Key" on Anon Key
5. Copy new JWT token
6. Update `.env.local`:
   ```
   VITE_SUPABASE_PUBLISHABLE_KEY=<new_publishable_key>
   VITE_SUPABASE_ANON_KEY=<new_anon_key>
   ```

### Step 2: Remove .env from Git History

```bash
# Remove from tracking
git rm --cached .env

# Update gitignore
echo ".env" >> .gitignore

# Commit
git add .gitignore
git commit -m "chore: remove .env from git history"

# Optional: Clean full history (careful!)
git filter-branch --tree-filter 'rm -f .env' -- --all
```

### Step 3: Deploy Edge Functions

```bash
# 1. Install Supabase CLI
npm install -g supabase

# 2. Login to Supabase
supabase login

# 3. Link your project
supabase link --project-id your_project_id

# 4. Deploy functions
supabase functions deploy

# 5. Check deployment
supabase functions list

# 6. Set API key as secret
supabase secrets set GEMINI_API_KEY=sk-your_gemini_key
```

### Step 4: Enable Row-Level Security

**In Supabase Dashboard:**
1. Go to SQL Editor
2. Copy entire `security_setup.sql` file content
3. Paste in SQL Editor
4. Click "Run"
5. Verify no errors in output

**Verify RLS is enabled:**
```sql
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;
```

### Step 5: Configure CORS (If Using Express Backend)

If deploying Express backend instead of Edge Functions:

```typescript
import cors from 'cors';

app.use(cors({
  origin: 'https://yourdomain.com',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));
```

### Step 6: Set Security Headers

**In vite.config.ts or Next.js middleware:**

```typescript
const securityHeaders = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://esm.sh",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co https://googleapis.com",
  ].join(';')
};
```

---

## Testing Checklist

### Security Tests

- [ ] **API Key Test**: Build project and verify "sk-" not in dist/
  ```bash
  npm run build && grep -r "sk-" dist/ && echo "❌ FAILED" || echo "✅ PASSED"
  ```

- [ ] **IDOR Test**: Try accessing other user's data
  ```bash
  # Get user A's session token
  # Get user B's event ID
  # Query with A's token for B's event
  # Should get RLS error (Forbidden)
  ```

- [ ] **Input Validation Test**: Try invalid inputs
  ```bash
  # Try signup with weak password
  # Try signup with invalid email
  # Try signup with XSS payload in username
  # All should be rejected with clear error
  ```

- [ ] **Rate Limiting Test**: Rapid fire requests
  ```bash
  # Send 100 auth requests in 1 second
  # Should get 429 Too Many Requests after 10
  ```

- [ ] **JSON Parsing Test**: Malformed JSON
  ```bash
  # Corrupt localStorage cache
  # Reload app
  # Should fallback to database fetch gracefully
  ```

### Manual Tests

- [ ] Sign up with new account
- [ ] Sign in with email
- [ ] Sign in with username
- [ ] Create event via AI chat
- [ ] Upload schedule image
- [ ] Analyze food image
- [ ] Check admin panel (should fail if not admin)
- [ ] Logout and login again
- [ ] Clear browser cache and reload

### Automated Tests

```bash
# Run existing tests
npm test

# Run security audit
npm audit

# Type checking
npm run lint

# Build check
npm run build
```

---

## Production Deployment

### Pre-Deployment Checklist
- [ ] All tests passing
- [ ] Security audit passing (`npm audit`)
- [ ] Type checking passing (`npm run lint`)
- [ ] Build successful (`npm run build`)
- [ ] No console.error in production code
- [ ] Environment variables configured
- [ ] RLS policies verified in Supabase
- [ ] Edge Functions deployed
- [ ] API key rotated and set as secret
- [ ] .env removed from git

### Deploy to Vercel (or similar)

```bash
# Connect repository
vercel --prod

# Set environment variables in Vercel dashboard:
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_PUBLISHABLE_KEY
# - VITE_SUPABASE_ANON_KEY
# - VITE_API_URL=https://your-project.supabase.co/functions/v1

# Deploy
git push origin main
# (Vercel auto-deploys on push)
```

### Post-Deployment Verification
- [ ] Frontend loads without errors
- [ ] Can sign up / sign in
- [ ] AI features work (nutrition, schedule parsing, chat)
- [ ] Data syncs correctly
- [ ] Admin panel accessible only to admins
- [ ] No errors in browser console
- [ ] No sensitive data in localStorage
- [ ] Https enforced
- [ ] Security headers present

Check headers:
```bash
curl -I https://yourdomain.com | grep -i "Strict-Transport-Security"
```

---

## Monitoring & Maintenance

### Enable Monitoring
- [ ] Set up Sentry for error tracking
- [ ] Enable Supabase logs/analytics
- [ ] Set up uptime monitoring
- [ ] Configure security alerts

### Regular Tasks
- **Weekly**: Review logs for errors/attacks
- **Weekly**: Run `npm audit` for vulnerabilities
- **Monthly**: Run penetration test (or manual security audit)
- **Quarterly**: Full security review
- **After each update**: Re-run security tests

### Incident Response
If security issue is discovered:
1. Immediately rotate affected keys
2. Remove .env from git history if exposed
3. Audit logs for unauthorized access
4. Notify affected users
5. Deploy patch
6. Document incident

---

## Troubleshooting

### "API key not in bundle" fails
```bash
# Check for any remaining Gemini references
grep -r "process.env.API_KEY" src/
grep -r "VITE_GEMINI_API_KEY" src/

# Should be empty - all should go through backend
```

### RLS policies not working
```bash
# Verify RLS is enabled
SELECT * FROM pg_tables WHERE schemaname = 'public';

# Check policy details
SELECT * FROM pg_policies WHERE tablename = 'events';

# Test policy
SELECT * FROM events;  -- Should only see own events
```

### Edge Functions not deploying
```bash
# Check Deno types
supabase functions list

# View function logs
supabase functions fetch ai-handler

# Check function size (max 12MB)
du -sh supabase/functions/ai-handler/
```

### CORS errors
```bash
# Check CORS headers
curl -H "Origin: https://yourdomain.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://your-api.com/ai-handler -v
```

---

## Success Indicators

✅ **All vulnerabilities fixed:**
- API key not in frontend bundle
- RLS policies enforced
- Input validation on all inputs
- Admin status verified server-side
- IDOR protection via RLS
- CSRF tokens on state changes (if implemented)
- Rate limiting active
- Error logs sanitized
- JSON parsing safe
- XSS vectors removed

✅ **Security posture improved:**
- All critical issues resolved
- High severity issues mitigated
- Medium issues scheduled
- Monitoring in place
- Documentation complete
- Team trained on new security practices

---

**Setup Last Updated:** 2026-05-27  
**Status:** Ready for Production Deployment
