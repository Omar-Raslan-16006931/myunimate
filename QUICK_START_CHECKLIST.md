# Security Audit Checklist - Quick Reference

## 📋 Critical Fixes (Do These First)

### 1. API Key Rotation (15 minutes)
- [ ] Go to Supabase Dashboard > Settings > API Keys
- [ ] Create new Publishable Key
- [ ] Create new Anon Key
- [ ] Copy new keys to `.env` locally
- [ ] Test app still works
- [ ] Note old keys for revocation

**Status:** Ready to implement

---

### 2. Remove .env from Git History (30 minutes)
- [ ] Run: `git rm --cached .env`
- [ ] Create `.env.example` with placeholders
- [ ] Run: `echo ".env" >> .gitignore`
- [ ] Commit: `git add .env.example .gitignore && git commit -m "chore: remove secrets"`
- [ ] Force push: `git push origin main --force`

**Status:** Ready to implement

---

### 3. Run Security Setup SQL (30 minutes)
- [ ] Open Supabase Dashboard > SQL Editor
- [ ] Copy entire content of `security_setup.sql`
- [ ] Paste into SQL editor
- [ ] Run query
- [ ] Verify: Run verification query at bottom

**Status:** Script ready in `security_setup.sql`

---

### 4. Create Backend API for AI (2-4 hours)
- [ ] Choose: Supabase Edge Functions OR Express.js
- [ ] Read: SECURITY_FIXES_GUIDE.md section "Fix #1"
- [ ] Implement AI endpoints
- [ ] Update frontend `.env.local` with VITE_API_URL
- [ ] Test endpoints with authentication
- [ ] Deploy to production

**Status:** Code templates provided in SECURITY_FIXES_GUIDE.md

---

### 5. Add User ID Verification to Queries (1-2 hours)
- [ ] Review: SECURITY_FIXES_GUIDE.md section "Fix #2"
- [ ] Audit `App.tsx` for database queries
- [ ] Add `.eq('user_id', session.user.id)` to all user queries
- [ ] Audit `AdminInbox.tsx` for admin-only queries
- [ ] Add admin status verification
- [ ] Test with different users

**Status:** Code pattern provided in SECURITY_FIXES_GUIDE.md

---

## 🔒 High Priority Fixes (This Week)

### 6. Input Validation
- [ ] Read: INPUT_VALIDATION_GUIDE.md
- [ ] Update email validation in Auth.tsx
- [ ] Update password requirements (min 12 chars)
- [ ] Add username sanitization
- [ ] Add referral code validation
- [ ] Add file upload validation
- [ ] Test edge cases

**Time:** 2 hours | **Files:** Auth.tsx, ImageImportModal.tsx

---

### 7. Add CSRF Protection (1-2 hours)
- [ ] Read: SECURITY_FIXES_GUIDE.md section "Fix #7"
- [ ] Create CSRF token middleware
- [ ] Generate token on auth
- [ ] Validate on state-changing requests
- [ ] Test cross-origin requests blocked

**Time:** 2 hours | **Files:** middleware/csrf.ts

---

### 8. Sanitize Console Logs (30 minutes)
- [ ] Read: SECURITY_FIXES_GUIDE.md section "Fix #8"
- [ ] Create logger utility
- [ ] Replace all `console.error` in critical files
- [ ] Test in production mode (no sensitive data logged)

**Time:** 30 minutes | **Files:** utils/logger.ts + modify 10+ files

---

## 🛠️ Medium Priority Fixes (Next 2 weeks)

### 9. JSON.parse Error Handling (1 hour)
- [ ] Read: SECURITY_FIXES_GUIDE.md section "Fix #5"
- [ ] Create validation function for each JSON.parse
- [ ] Update App.tsx cache loading
- [ ] Update geminiService.ts response parsing
- [ ] Test with malformed JSON

**Time:** 1 hour | **Files:** App.tsx, geminiService.ts

---

### 10. Fix innerHTML Usage (30 minutes)
- [ ] Locate: components/ui/shader-lines.tsx
- [ ] Replace `innerHTML = ""` with `replaceChildren()`
- [ ] Test component still renders

**Time:** 30 minutes | **Files:** shader-lines.tsx

---

### 11. Add Rate Limiting (1-2 hours)
- [ ] Choose rate limiting library (express-rate-limit, etc.)
- [ ] Add to auth endpoints (10 requests/15 mins)
- [ ] Add to AI endpoints (50 requests/hour)
- [ ] Add to general endpoints (100 requests/hour)
- [ ] Test rate limit triggers

**Time:** 2 hours | **Files:** Backend API

---

### 12. Add Security Headers (30 minutes)
- [ ] Configure CSP header
- [ ] Add X-Frame-Options
- [ ] Add X-Content-Type-Options
- [ ] Add Strict-Transport-Security
- [ ] Test headers in browser DevTools

**Time:** 30 minutes | **Files:** vite.config.ts OR backend server.ts

---

## 📊 Progress Tracking

### Phase 1: Critical (Complete within 48 hours)
- [ ] API key rotation
- [ ] Remove .env from git
- [ ] Run RLS SQL script
- [ ] Begin backend API implementation

**Est. Time:** 5-7 hours

### Phase 2: High Priority (Complete within 1 week)
- [ ] Complete backend API
- [ ] Add user ID verification
- [ ] Input validation
- [ ] CSRF protection

**Est. Time:** 5-7 hours

### Phase 3: Medium Priority (Complete within 2 weeks)
- [ ] JSON.parse error handling
- [ ] Sanitize logging
- [ ] Fix innerHTML
- [ ] Add rate limiting
- [ ] Security headers

**Est. Time:** 4-5 hours

### Phase 4: Testing & Deployment (Complete within 3 weeks)
- [ ] Security testing
- [ ] Penetration testing
- [ ] Load testing
- [ ] Production deployment
- [ ] Monitoring setup

**Est. Time:** 3-4 hours

---

## 🧪 Testing Before Deployment

### Security Testing Checklist
- [ ] IDOR check: Can't access other user's data
- [ ] CSRF check: Cross-origin requests blocked
- [ ] Injection check: SQL injection attempts fail
- [ ] XSS check: Script tags rendered as text
- [ ] Auth check: Unauthenticated users can't access data
- [ ] File check: Oversized files rejected
- [ ] Rate limit: Excessive requests blocked
- [ ] API key: Not visible in network requests
- [ ] Console: No sensitive data in DevTools
- [ ] Headers: Security headers present

### Automated Testing Tools
- [ ] OWASP ZAP scan
- [ ] npm audit (dependency vulnerabilities)
- [ ] Snyk scan
- [ ] SonarQube analysis

---

## 📚 Document Reference

| Document | Purpose | Read When |
|----------|---------|-----------|
| SECURITY_AUDIT_REPORT.md | Complete audit findings | Starting work |
| SECURITY_FIXES_GUIDE.md | Step-by-step fixes | Implementing fixes |
| INPUT_VALIDATION_GUIDE.md | Validation rules | Adding input checks |
| security_setup.sql | RLS policies | Configuring database |
| SECURITY_IMPLEMENTATION_SUMMARY.md | Overview & timeline | Planning work |

---

## ⚡ Quick Commands

```bash
# Check for hardcoded secrets
grep -r "api[_-]?key\|password\|token\|secret" \
  --include="*.ts" --include="*.tsx" \
  --exclude-dir=node_modules .

# Run security audit (if npm is set up)
npm audit

# Check for outdated packages
npm outdated

# Run type checking
npm run lint

# Remove .env from git history
git rm --cached .env
git commit -m "chore: remove .env"

# Verify RLS policies
psql -c "SELECT * FROM pg_policies WHERE schemaname = 'public';"
```

---

## 🎯 Success Criteria

You'll know you're done when:

✅ API key not visible in frontend bundle  
✅ RLS policies enforced on all tables  
✅ Users can't access other users' data  
✅ Admin functions require admin status  
✅ Input validation rejects invalid data  
✅ CSRF tokens protect state changes  
✅ Rate limiting blocks abuse  
✅ Console logs don't expose secrets  
✅ All tests pass  
✅ Security audit passes  

---

## 🚨 If You Get Stuck

1. **Backend API:** Read `SECURITY_FIXES_GUIDE.md` - both Supabase and Express templates included
2. **RLS Policies:** Run `security_setup.sql` as-is, should work
3. **Input Validation:** Copy-paste from `INPUT_VALIDATION_GUIDE.md`
4. **Testing:** Use verification queries in `security_setup.sql`
5. **General:** Review corresponding section in `SECURITY_AUDIT_REPORT.md`

---

## 📅 Recommended Schedule

**Day 1-2:** API key rotation + SQL setup + remove from git  
**Day 3-4:** Start backend API implementation  
**Day 5-6:** User ID verification + input validation  
**Day 7:** CSRF + rate limiting  
**Day 8-10:** Testing & deployment  

**Total:** ~10-12 working days

---

## ✅ Completion Checklist

When complete, check ALL items:

- [ ] All files in SECURITY_AUDIT_REPORT.md vulnerabilities fixed
- [ ] RLS policies active in Supabase
- [ ] Backend API handling AI requests
- [ ] User ID verification in all queries
- [ ] Input validation on all forms
- [ ] CSRF tokens on state changes
- [ ] Rate limiting deployed
- [ ] Security headers configured
- [ ] .env removed from git history
- [ ] Keys rotated
- [ ] All tests passing
- [ ] Security testing passed
- [ ] Deployed to production
- [ ] Monitoring alerts set up
- [ ] Team trained on security practices

---

**Document Version:** 1.0  
**Last Updated:** 2026-05-27  
**Next Review:** After Phase 1 complete
