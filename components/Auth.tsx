
import React, { useState, memo, useEffect } from 'react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { Loader2, Mail, Lock, User, GraduationCap, Calendar, Building, Users, LogIn, Check, AlertCircle, X, Ticket } from 'lucide-react';
import { validateEmail, validatePassword, validateUsername, validateReferralCode } from '../utils/validation';
import { logError, logAuthEvent } from '../utils/logger';

// ── Design tokens ────────────────────────────────────────────────────────────
const INK       = '#1A1730';
const PAPER_BG  = '#C7B2DB';
const CARD_BG   = '#FAFAF6';
const HL_YELLOW = '#F6DF63';
const HL_GREEN  = '#8CE3B7';
const HL_RED    = '#E56A5A';

// ── Shared input style ───────────────────────────────────────────────────────
const inputBase: React.CSSProperties = {
  width: '100%',
  background: CARD_BG,
  border: `1.5px solid ${INK}`,
  borderRadius: 8,
  padding: '11px 14px 11px 40px',
  color: INK,
  fontFamily: "'Instrument Sans', 'Inter', sans-serif",
  fontSize: '0.9rem',
  outline: 'none',
  boxSizing: 'border-box',
};

const inputError: React.CSSProperties = {
  ...inputBase,
  borderColor: HL_RED,
};

const selectBase: React.CSSProperties = {
  ...inputBase,
  padding: '11px 10px 11px 36px',
  appearance: 'none',
  WebkitAppearance: 'none',
  fontSize: '0.85rem',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.68rem',
  fontWeight: 700,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color: `rgba(26,23,48,0.55)`,
  fontFamily: "'Instrument Sans', 'Inter', sans-serif",
  marginBottom: 5,
  marginLeft: 2,
};

// ── Component ────────────────────────────────────────────────────────────────
interface AuthProps {
  onEnterTestMode?: () => void;
}

function Auth({ onEnterTestMode }: AuthProps) {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Auth Identifier (Email or Username for login, Email for signup)
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Profile Fields (Signup Only)
  const [username, setUsername] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  // Referral
  const [referralCode, setReferralCode] = useState('');
  const [isCheckingReferral, setIsCheckingReferral] = useState(false);
  const [isReferralValid, setIsReferralValid] = useState<boolean | null>(null);

  const [gender, setGender] = useState('');
  const [major, setMajor] = useState('');
  const [year, setYear] = useState('');
  const [college, setCollege] = useState('');

  const clearForm = () => {
    setIdentifier('');
    setPassword('');
    setConfirmPassword('');
    setUsername('');
    setUsernameAvailable(null);
    setReferralCode('');
    setIsReferralValid(null);
    setGender('');
    setMajor('');
    setYear('');
    setCollege('');
    setError(null);
    setMessage(null);
  };

  // Real-time username check
  useEffect(() => {
    // Only check availability if in signup mode and length requirement is met
    if (mode === 'signup' && username.trim().length >= 4) {
      const timer = setTimeout(async () => {
        setIsCheckingUsername(true);
        try {
          // Check if username exists (case insensitive)
          const { data } = await supabase
            .from('profiles')
            .select('username')
            .ilike('username', username.trim())
            .maybeSingle();

          if (data) {
            setUsernameAvailable(false);
          } else {
            setUsernameAvailable(true);
          }
        } catch (err) {
          console.error("Error checking username:", err);
        } finally {
          setIsCheckingUsername(false);
        }
      }, 500); // 500ms debounce

      return () => clearTimeout(timer);
    } else {
      setUsernameAvailable(null);
      setIsCheckingUsername(false);
    }
  }, [username, mode]);

  // Real-time referral check
  useEffect(() => {
    if (mode === 'signup' && referralCode.length > 3) {
      const timer = setTimeout(async () => {
        setIsCheckingReferral(true);
        try {
          const { data } = await supabase
            .from('referral_codes')
            .select('id')
            .eq('code', referralCode.trim())
            .eq('is_active', true)
            .maybeSingle();

          setIsReferralValid(!!data);
        } catch (e) {
          console.error(e);
        } finally {
          setIsCheckingReferral(false);
        }
      }, 600);
      return () => clearTimeout(timer);
    } else if (referralCode.length === 0) {
      setIsReferralValid(null);
      setIsCheckingReferral(false);
    }
  }, [referralCode, mode]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'signup') {
        // --- SIGN UP FLOW ---
        // Username validation
        const usernameCheck = validateUsername(username);
        if (!usernameCheck.valid) {
          throw new Error(usernameCheck.error || "Invalid username");
        }

        if (usernameAvailable === false) {
          throw new Error("Username is already taken. Please choose another.");
        }

        // Email validation
        const emailCheck = validateEmail(identifier);
        if (!emailCheck.valid) {
          throw new Error(emailCheck.error || "Invalid email address");
        }

        // Password validation
        const passwordCheck = validatePassword(password);
        if (!passwordCheck.valid) {
          throw new Error(passwordCheck.error || "Password does not meet requirements");
        }

        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }

        // --- REFERRAL CODE CHECK ---
        let verifiedReferralCode = null;
        let referralCodeId = null;

        if (referralCode.trim()) {
          // Validate referral code format first
          const codeCheck = validateReferralCode(referralCode);
          if (!codeCheck.valid) {
            throw new Error(codeCheck.error || "Invalid referral code format");
          }

          // Re-validate strictly on submit
          const { data, error } = await supabase
            .from('referral_codes')
            .select('*')
            .eq('code', referralCode.trim().toUpperCase())
            .eq('is_active', true)
            .single();

          if (error || !data) {
            throw new Error("Invalid or inactive referral code.");
          }
          verifiedReferralCode = data.code;
          referralCodeId = data.id;
        }

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: identifier.toLowerCase().trim(),
          password,
          options: {
            data: {
              username: username.trim(),
              full_name: username.trim(),
              display_name: username.trim(),
              name: username.trim(),
              gender,
              major,
              year,
              college,
              subscription_tier: 0,
              referred_by: verifiedReferralCode,
            },
          },
        });

        if (signUpError) throw signUpError;

        // --- INCREMENT REFERRAL USAGE (AFTER SIGNUP) ---
        if (referralCodeId) {
          try {
            const { error: rpcError } = await supabase.rpc('increment_referral_usage', { row_id: referralCodeId });
            if (rpcError && signUpData.session) {
              const { data: latestCode } = await supabase
                .from('referral_codes')
                .select('usage_count')
                .eq('id', referralCodeId)
                .single();

              if (latestCode) {
                await supabase
                  .from('referral_codes')
                  .update({ usage_count: (latestCode.usage_count || 0) + 1 })
                  .eq('id', referralCodeId);
              }
            }
          } catch (updateError) {
            logError("signup_referral", updateError);
          }
        }

        // --- EXPLICIT UPDATE FOR REFERRED_BY ---
        if (signUpData.user && verifiedReferralCode) {
          setTimeout(async () => {
            try {
              await supabase.from('profiles')
                .update({ referred_by: verifiedReferralCode })
                .eq('id', signUpData.user!.id);
            } catch (err) {
              logError("profile_update", err);
            }
          }, 1000);
        }

        logAuthEvent('signup', signUpData.user?.id, true);
        setMessage('Check your email for the confirmation link!');
      } else {
        // --- SIGN IN FLOW ---
        let emailToUse = identifier.trim().toLowerCase();

        // Check if input is NOT an email (assuming it is a username)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailToUse)) {
          // Attempt to resolve username to email via Profile lookup
          const { data, error: lookupError } = await supabase
            .from('profiles')
            .select('email')
            .eq('username', emailToUse)
            .maybeSingle();

          if (lookupError || !data || !data.email) {
            throw new Error("Username not found. Please try your email address.");
          }

          emailToUse = data.email;
        }

        const { data: signInData, error } = await supabase.auth.signInWithPassword({
          email: emailToUse,
          password,
        });

        if (error) throw error;
        logAuthEvent('signin', signInData.user?.id, true);
      }
    } catch (error: any) {
      logError("auth_handleAuth", error);
      setError(error.message);
      logAuthEvent(mode === 'signup' ? 'signup' : 'signin', undefined, false);
    } finally {
      setLoading(false);
      setIsCheckingReferral(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    clearForm();
  };

  // ── Render helpers ─────────────────────────────────────────────────────────

  const IconAdornment = ({ children }: { children: React.ReactNode }) => (
    <div style={{
      position: 'absolute',
      left: 12,
      top: '50%',
      transform: 'translateY(-50%)',
      color: `rgba(26,23,48,0.45)`,
      display: 'flex',
      alignItems: 'center',
      pointerEvents: 'none',
      zIndex: 1,
    }}>
      {children}
    </div>
  );

  const StatusIcon = ({ checking, valid }: { checking: boolean; valid: boolean | null }) => {
    if (checking) return <Loader2 size={15} style={{ color: `rgba(26,23,48,0.4)`, animation: 'spin 1s linear infinite' }} />;
    if (valid === true) return <Check size={15} style={{ color: '#16a34a' }} />;
    if (valid === false) return <X size={15} style={{ color: HL_RED }} />;
    return null;
  };

  const FieldHint = ({ children, isError = true }: { children: React.ReactNode; isError?: boolean }) => (
    <p style={{
      fontSize: '0.68rem',
      fontWeight: 700,
      color: isError ? HL_RED : '#16a34a',
      marginTop: 4,
      marginLeft: 2,
      display: 'flex',
      alignItems: 'center',
      gap: 3,
      fontFamily: "'Instrument Sans', 'Inter', sans-serif",
    }}>
      {children}
    </p>
  );

  // Collapse wrapper for signup-only fields
  const CollapseSection = ({ show, children }: { show: boolean; children: React.ReactNode }) => (
    <div style={{
      display: 'grid',
      gridTemplateRows: show ? '1fr' : '0fr',
      opacity: show ? 1 : 0,
      transition: 'grid-template-rows 0.42s cubic-bezier(0.16,1,0.3,1), opacity 0.3s ease',
    }}>
      <div style={{ overflow: 'hidden', minHeight: 0 }}>
        {children}
      </div>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      minWidth: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      // Paper grid background
      background: PAPER_BG,
      backgroundImage: `
        linear-gradient(rgba(26,23,48,0.10) 1px, transparent 1px),
        linear-gradient(90deg, rgba(26,23,48,0.10) 1px, transparent 1px)
      `,
      backgroundSize: '28px 28px',
      padding: '24px 16px',
      boxSizing: 'border-box',
      position: 'relative',
    }}>

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        style={{
          width: '100%',
          maxWidth: 400,
          background: CARD_BG,
          border: `1.5px solid ${INK}`,
          borderRadius: 14,
          boxShadow: `8px 10px 0 ${INK}`,
          overflow: 'hidden',
          position: 'relative',
          zIndex: 10,
        }}
      >

        {/* ── Brand Header ─────────────────────────────────────────────── */}
        <div style={{
          padding: '28px 28px 20px',
          borderBottom: `1.5px solid ${INK}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          background: CARD_BG,
        }}>
          {/* Logo box */}
          <div style={{
            width: 56,
            height: 56,
            background: INK,
            borderRadius: 12,
            border: `1.5px solid ${INK}`,
            boxShadow: `4px 4px 0 ${HL_YELLOW}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <GraduationCap size={28} color={CARD_BG} strokeWidth={2} />
          </div>

          {/* Brand name */}
          <div style={{ textAlign: 'center' }}>
            <h1 style={{
              fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif",
              fontWeight: 800,
              fontSize: '1.65rem',
              color: INK,
              margin: 0,
              lineHeight: 1,
              letterSpacing: '-0.02em',
            }}>
              UniMate
            </h1>
            <p style={{
              fontFamily: "'Instrument Sans', 'Inter', sans-serif",
              fontSize: '0.78rem',
              fontWeight: 500,
              color: `rgba(26,23,48,0.5)`,
              marginTop: 4,
              letterSpacing: '0.01em',
            }}>
              {mode === 'signin' ? 'Welcome back — sign in to continue' : 'Create your account to get started'}
            </p>
          </div>

          {/* Mode tab strip */}
          <div style={{
            display: 'flex',
            background: `rgba(26,23,48,0.07)`,
            border: `1.5px solid ${INK}`,
            borderRadius: 10,
            padding: 3,
            gap: 3,
            width: '100%',
          }}>
            {(['signin', 'signup'] as const).map((m) => (
              <motion.button
                key={m}
                onClick={() => { setMode(m); clearForm(); }}
                whileTap={{ scale: 0.96 }}
                style={{
                  flex: 1,
                  padding: '7px 0',
                  borderRadius: 7,
                  border: mode === m ? `1.5px solid ${INK}` : '1.5px solid transparent',
                  background: mode === m ? HL_YELLOW : 'transparent',
                  color: INK,
                  fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif",
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  letterSpacing: '0.01em',
                  transition: 'all 0.18s ease',
                  outline: 'none',
                }}
              >
                {m === 'signin' ? 'Sign In' : 'Sign Up'}
              </motion.button>
            ))}
          </div>
        </div>

        {/* ── Scrollable Form Body ──────────────────────────────────────── */}
        <div style={{
          padding: '20px 24px 24px',
          overflowY: 'auto',
          maxHeight: '65vh',
        }}>
          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Username — signup only */}
            <CollapseSection show={mode === 'signup'}>
              <div style={{ paddingBottom: 2 }}>
                <label style={labelStyle}>
                  Username <span style={{ color: HL_RED }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <IconAdornment><User size={16} /></IconAdornment>
                  <input
                    type="text"
                    required={mode === 'signup'}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={usernameAvailable === false && !isCheckingUsername ? inputError : inputBase}
                    placeholder="Min 4 characters"
                  />
                  {mode === 'signup' && username.length >= 4 && (
                    <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
                      <StatusIcon checking={isCheckingUsername} valid={usernameAvailable} />
                    </div>
                  )}
                </div>
                {mode === 'signup' && username.length > 0 && username.length < 4 && (
                  <FieldHint>Must be at least 4 characters</FieldHint>
                )}
                {mode === 'signup' && usernameAvailable === false && !isCheckingUsername && (
                  <FieldHint><AlertCircle size={10} /> Username already taken</FieldHint>
                )}
              </div>
            </CollapseSection>

            {/* Email / Identifier */}
            <div>
              <label style={labelStyle}>
                {mode === 'signin' ? 'Email or Username' : 'Email Address'}{' '}
                <span style={{ color: HL_RED }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <IconAdornment>
                  {mode === 'signin' ? <LogIn size={16} /> : <Mail size={16} />}
                </IconAdornment>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  style={inputBase}
                  placeholder={mode === 'signin' ? 'username or user@example.com' : 'user@example.com'}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={labelStyle}>
                Password <span style={{ color: HL_RED }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <IconAdornment><Lock size={16} /></IconAdornment>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={inputBase}
                  placeholder="••••••••"
                />
              </div>
              {mode === 'signup' && password.length > 0 && password.length < 6 && (
                <FieldHint>Must be at least 6 characters</FieldHint>
              )}
            </div>

            {/* Confirm Password — signup only */}
            <CollapseSection show={mode === 'signup'}>
              <div>
                <label style={labelStyle}>
                  Confirm Password <span style={{ color: HL_RED }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <IconAdornment><Lock size={16} /></IconAdornment>
                  <input
                    type="password"
                    required={mode === 'signup'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={confirmPassword && confirmPassword !== password ? inputError : inputBase}
                    placeholder="••••••••"
                  />
                </div>
                {confirmPassword && confirmPassword !== password && (
                  <FieldHint>Passwords do not match</FieldHint>
                )}
              </div>
            </CollapseSection>

            {/* Referral Code — signup only */}
            <CollapseSection show={mode === 'signup'}>
              <div>
                <label style={labelStyle}>Referral Code</label>
                <div style={{ position: 'relative' }}>
                  <IconAdornment><Ticket size={16} /></IconAdornment>
                  <input
                    type="text"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    style={{
                      ...(isReferralValid === false && !isCheckingReferral ? inputError : inputBase),
                      fontFamily: "'Space Mono', monospace",
                      letterSpacing: '0.1em',
                    }}
                    placeholder="OPTIONAL"
                  />
                  <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
                    <StatusIcon checking={isCheckingReferral} valid={isReferralValid} />
                  </div>
                </div>
                {isReferralValid === false && !isCheckingReferral && (
                  <FieldHint>Invalid referral code</FieldHint>
                )}
              </div>
            </CollapseSection>

            {/* Optional Details — signup only */}
            <CollapseSection show={mode === 'signup'}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 1, background: `rgba(26,23,48,0.15)` }} />
                  <span style={{
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: `rgba(26,23,48,0.35)`,
                    fontFamily: "'Instrument Sans', 'Inter', sans-serif",
                  }}>
                    Optional Details
                  </span>
                  <div style={{ flex: 1, height: 1, background: `rgba(26,23,48,0.15)` }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {/* Gender */}
                  <div>
                    <label style={labelStyle}>Gender</label>
                    <div style={{ position: 'relative' }}>
                      <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: `rgba(26,23,48,0.45)`, pointerEvents: 'none', zIndex: 1, display: 'flex' }}>
                        <Users size={14} />
                      </div>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        style={selectBase}
                      >
                        <option value="" disabled>Select</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  {/* Year */}
                  <div>
                    <label style={labelStyle}>Year</label>
                    <div style={{ position: 'relative' }}>
                      <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: `rgba(26,23,48,0.45)`, pointerEvents: 'none', zIndex: 1, display: 'flex' }}>
                        <Calendar size={14} />
                      </div>
                      <select
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        style={selectBase}
                      >
                        <option value="" disabled>Select</option>
                        <option value="1">Year 1</option>
                        <option value="2">Year 2</option>
                        <option value="3">Year 3</option>
                        <option value="4">Year 4</option>
                        <option value="5">Year 5+</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Major */}
                <div>
                  <label style={labelStyle}>Major</label>
                  <div style={{ position: 'relative' }}>
                    <IconAdornment><GraduationCap size={16} /></IconAdornment>
                    <input
                      type="text"
                      value={major}
                      onChange={(e) => setMajor(e.target.value)}
                      style={inputBase}
                      placeholder="e.g. Computer Science"
                    />
                  </div>
                </div>

                {/* College */}
                <div>
                  <label style={labelStyle}>College</label>
                  <div style={{ position: 'relative' }}>
                    <IconAdornment><Building size={16} /></IconAdornment>
                    <input
                      type="text"
                      value={college}
                      onChange={(e) => setCollege(e.target.value)}
                      style={inputBase}
                      placeholder="College"
                    />
                  </div>
                </div>
              </div>
            </CollapseSection>

            {/* Error / Success Banners */}
            {error && (
              <div style={{
                padding: '10px 14px',
                borderRadius: 8,
                background: `rgba(229,106,90,0.12)`,
                border: `1.5px solid ${HL_RED}`,
                color: HL_RED,
                fontSize: '0.8rem',
                fontWeight: 600,
                textAlign: 'center',
                fontFamily: "'Instrument Sans', 'Inter', sans-serif",
              }}>
                {error}
              </div>
            )}
            {message && (
              <div style={{
                padding: '10px 14px',
                borderRadius: 8,
                background: `rgba(140,227,183,0.18)`,
                border: `1.5px solid ${HL_GREEN}`,
                color: '#15803d',
                fontSize: '0.8rem',
                fontWeight: 600,
                textAlign: 'center',
                fontFamily: "'Instrument Sans', 'Inter', sans-serif",
              }}>
                {message}
              </div>
            )}

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={!loading ? { x: -2, y: -2, boxShadow: `7px 7px 0 ${HL_YELLOW}` } : {}}
              whileTap={!loading ? { x: 2, y: 2, boxShadow: `1px 1px 0 ${HL_YELLOW}` } : {}}
              style={{
                width: '100%',
                background: INK,
                color: CARD_BG,
                border: `1.5px solid ${INK}`,
                borderRadius: 10,
                fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif",
                fontWeight: 700,
                fontSize: '0.95rem',
                padding: '13px 18px',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: `4px 4px 0 ${HL_YELLOW}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginTop: 4,
                opacity: loading ? 0.75 : 1,
                transition: 'opacity 0.15s ease',
              }}
            >
              {loading
                ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                : (mode === 'signin' ? 'Sign In' : 'Create Account')
              }
            </motion.button>
          </form>

          {/* Toggle sign in / sign up text link */}
          <div style={{ marginTop: 18, textAlign: 'center' }}>
            <p style={{
              fontFamily: "'Instrument Sans', 'Inter', sans-serif",
              fontSize: '0.85rem',
              color: `rgba(26,23,48,0.55)`,
            }}>
              {mode === 'signin' ? "New here?" : "Already have an account?"}
              {' '}
              <button
                onClick={toggleMode}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif",
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  color: INK,
                  textDecoration: 'underline',
                  textUnderlineOffset: 3,
                }}
              >
                {mode === 'signin' ? 'Create Account' : 'Sign In'}
              </button>
            </p>
          </div>

          {/* Test Mode */}
          {onEnterTestMode && (
            <div style={{ textAlign: 'center', marginTop: 16, borderTop: `1px solid rgba(26,23,48,0.1)`, paddingTop: 12 }}>
              <button
                onClick={onEnterTestMode}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: "'Space Mono', monospace",
                  fontSize: '0.62rem',
                  color: `rgba(26,23,48,0.25)`,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                }}
              >
                Test Mode
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default memo(Auth);
