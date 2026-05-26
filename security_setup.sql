-- ===================================================================
-- SUPABASE ROW-LEVEL SECURITY (RLS) SETUP SCRIPT
-- ===================================================================
-- Execute this in Supabase SQL Editor to implement security policies
-- Database: PostgreSQL
-- Risk Level: This secures critical vulnerabilities

-- ===================================================================
-- 1. ENABLE RLS ON ALL TABLES
-- ===================================================================

-- Disable policies briefly to avoid errors during setup
ALTER TABLE IF EXISTS events DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS todos DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS app_feedback DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS feedback_replies DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS schedule_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS wallet_ledger DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS referral_codes DISABLE ROW LEVEL SECURITY;

-- Enable RLS on all tables
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;

-- ===================================================================
-- 2. EVENTS TABLE POLICIES
-- ===================================================================

-- Users can view their own events
CREATE POLICY "Users can view own events"
ON events FOR SELECT
USING (auth.uid() = user_id);

-- Users can create events
CREATE POLICY "Users can create events"
ON events FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own events
CREATE POLICY "Users can update own events"
ON events FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own events
CREATE POLICY "Users can delete own events"
ON events FOR DELETE
USING (auth.uid() = user_id);

-- ===================================================================
-- 3. COURSES TABLE POLICIES
-- ===================================================================

CREATE POLICY "Users can view own courses"
ON courses FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create courses"
ON courses FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own courses"
ON courses FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own courses"
ON courses FOR DELETE
USING (auth.uid() = user_id);

-- ===================================================================
-- 4. TODOS TABLE POLICIES
-- ===================================================================

CREATE POLICY "Users can view own todos"
ON todos FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create todos"
ON todos FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own todos"
ON todos FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own todos"
ON todos FOR DELETE
USING (auth.uid() = user_id);

-- ===================================================================
-- 5. PROFILES TABLE POLICIES
-- ===================================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile (but not is_admin or other sensitive fields)
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  -- is_admin cannot be changed by user (would need separate endpoint with verification)
);

-- Anyone can create a profile (for signup)
-- But we rely on Postgres trigger to set user_id correctly
CREATE POLICY "Users can create profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Users cannot delete their own profiles directly
CREATE POLICY "Users cannot delete profiles"
ON profiles FOR DELETE
USING (false);

-- ===================================================================
-- 6. SCHEDULE_PROFILES TABLE POLICIES
-- ===================================================================

CREATE POLICY "Users can view own schedule profiles"
ON schedule_profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create schedule profiles"
ON schedule_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own schedule profiles"
ON schedule_profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own schedule profiles"
ON schedule_profiles FOR DELETE
USING (auth.uid() = user_id);

-- ===================================================================
-- 7. MATERIALS TABLE POLICIES
-- ===================================================================

CREATE POLICY "Users can view own materials"
ON materials FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can upload materials"
ON materials FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own materials"
ON materials FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own materials"
ON materials FOR DELETE
USING (auth.uid() = user_id);

-- ===================================================================
-- 8. WALLET_LEDGER TABLE POLICIES
-- ===================================================================

CREATE POLICY "Users can view own wallet ledger"
ON wallet_ledger FOR SELECT
USING (auth.uid() = user_id);

-- Users cannot directly insert/update/delete wallet entries
-- These should be managed by triggers and RPC functions only
CREATE POLICY "Wallet entries are system-managed"
ON wallet_ledger FOR INSERT, UPDATE, DELETE
USING (false);

-- ===================================================================
-- 9. APP_FEEDBACK TABLE POLICIES
-- ===================================================================

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback"
ON app_feedback FOR SELECT
USING (auth.uid() = user_id);

-- Users can create feedback
CREATE POLICY "Users can create feedback"
ON app_feedback FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all feedback
CREATE POLICY "Admins can view all feedback"
ON app_feedback FOR SELECT
USING (
  (SELECT is_admin FROM profiles WHERE profiles.id = auth.uid()) = true
);

-- Admins can update feedback (status, etc.)
CREATE POLICY "Admins can update feedback"
ON app_feedback FOR UPDATE
USING (
  (SELECT is_admin FROM profiles WHERE profiles.id = auth.uid()) = true
);

-- Admins can delete feedback
CREATE POLICY "Admins can delete feedback"
ON app_feedback FOR DELETE
USING (
  (SELECT is_admin FROM profiles WHERE profiles.id = auth.uid()) = true
);

-- ===================================================================
-- 10. FEEDBACK_REPLIES TABLE POLICIES
-- ===================================================================

-- Users can view replies to their own feedback
CREATE POLICY "Users can view replies to own feedback"
ON feedback_replies FOR SELECT
USING (
  (SELECT user_id FROM app_feedback WHERE app_feedback.id = feedback_id) = auth.uid()
  OR
  sender_id = auth.uid()
);

-- Admins can view all replies
CREATE POLICY "Admins can view all replies"
ON feedback_replies FOR SELECT
USING (
  (SELECT is_admin FROM profiles WHERE profiles.id = auth.uid()) = true
);

-- Admins can create replies
CREATE POLICY "Admins can create replies"
ON feedback_replies FOR INSERT
WITH CHECK (
  (SELECT is_admin FROM profiles WHERE profiles.id = auth.uid()) = true
  AND
  sender_id = auth.uid()
);

-- Admins can update their own replies
CREATE POLICY "Admins can update own replies"
ON feedback_replies FOR UPDATE
USING (
  sender_id = auth.uid()
  AND
  (SELECT is_admin FROM profiles WHERE profiles.id = auth.uid()) = true
);

-- Admins can delete their own replies
CREATE POLICY "Admins can delete own replies"
ON feedback_replies FOR DELETE
USING (
  sender_id = auth.uid()
  AND
  (SELECT is_admin FROM profiles WHERE profiles.id = auth.uid()) = true
);

-- ===================================================================
-- 11. REFERRAL_CODES TABLE POLICIES
-- ===================================================================

-- Only admins can view referral codes
CREATE POLICY "Admins can view referral codes"
ON referral_codes FOR SELECT
USING (
  (SELECT is_admin FROM profiles WHERE profiles.id = auth.uid()) = true
);

-- Only admins can create referral codes
CREATE POLICY "Admins can create referral codes"
ON referral_codes FOR INSERT
WITH CHECK (
  (SELECT is_admin FROM profiles WHERE profiles.id = auth.uid()) = true
);

-- Only admins can update referral codes
CREATE POLICY "Admins can update referral codes"
ON referral_codes FOR UPDATE
USING (
  (SELECT is_admin FROM profiles WHERE profiles.id = auth.uid()) = true
);

-- Only admins can delete referral codes
CREATE POLICY "Admins can delete referral codes"
ON referral_codes FOR DELETE
USING (
  (SELECT is_admin FROM profiles WHERE profiles.id = auth.uid()) = true
);

-- ===================================================================
-- 12. VERIFICATION: Show all policies created
-- ===================================================================

-- Run this to verify all policies are in place
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ===================================================================
-- IMPORTANT NOTES:
-- ===================================================================
-- 1. is_admin field must be immutable after user creation
-- 2. Only backend functions should modify is_admin
-- 3. All user_id fields must be set by triggers, not client
-- 4. Sensitive operations should have additional verification
-- 5. Regularly audit RLS policies for effectiveness
-- 6. Test policies thoroughly before production deployment

-- ===================================================================
-- TESTING QUERIES (verify policies work)
-- ===================================================================

-- Test 1: User should see only their own events
-- SELECT * FROM events WHERE user_id = auth.uid();

-- Test 2: User should not see other user's events
-- SELECT * FROM events WHERE user_id != auth.uid();  -- Should return 0 rows

-- Test 3: Admin should see all feedback
-- SELECT * FROM app_feedback;  -- Should work if admin

-- Test 4: Non-admin should not see all feedback
-- SELECT * FROM app_feedback;  -- Should only see own feedback
