
import React, { useState, memo, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { styles } from '../theme';
import { Loader2, Mail, Lock, User, GraduationCap, Calendar, Building, Users, Check, AlertCircle, X, Fingerprint, ArrowRight, ArrowLeft, Share, SquarePlus, Smartphone, MoreVertical } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { AnimatePresence, motion } from 'framer-motion';
import { validateEmail, validatePassword, validateUsername } from '../utils/validation';
import { logError, logAuthEvent } from '../utils/logger';
import { SIGNUPS_ENABLED } from '../lib/featureFlags';
import OnboardSteps from './OnboardSteps';
import VerifyEmail from './VerifyEmail';
import { passkeysSupported, signInWithPasskey } from '../services/passkeys';

/** True in a normal browser tab: the app is not installed on the Home Screen yet. */
const needsHomeScreen = (): boolean => {
  try {
    if (Capacitor.isNativePlatform()) return false;
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    return !standalone;
  } catch { return false; }
};
const onIos = (): boolean => {
  try { return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); } catch { return false; }
};

interface AuthProps {
  onEnterTestMode?: () => void;
}

function Auth({ onEnterTestMode }: AuthProps) {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  // set after sign-up: shows the animated "check your email" step
  const [verifyEmail, setVerifyEmail] = useState<string | null>(null);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [passkeyCode, setPasskeyCode] = useState<string | null>(null); // app only: shown while the Safari sheet is open

  // Auth Identifier (Email or Username for login, Email for signup)
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Profile Fields (Signup Only)
  const [username, setUsername] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  const [signupStep, setSignupStep] = useState(1); // 1 username, 2 email, 3 password, 4 optional details
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
      setGender('');
      setMajor('');
      setYear('');
      setCollege('');
      setSignupStep(1);
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
          // asks the server; other people's profiles are never readable from the app
          const { data, error } = await supabase.rpc('username_available', { p_username: username.trim() });
          setUsernameAvailable(error ? null : !!data);
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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'signup') {
        // --- SIGN UP FLOW ---
        if (!SIGNUPS_ENABLED) {
          throw new Error("New sign-ups are paused right now. Please check back soon.");
        }
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

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: identifier.toLowerCase().trim(),
          password,
          options: {
            // the link opens a small "email confirmed" page; the app itself carries on without it
            emailRedirectTo: `${window.location.origin}/?confirmed=1`,
            data: {
              username: username.trim(),
              full_name: username.trim(),
              display_name: username.trim(),
              name: username.trim(),
              gender,
              major,
              year,
              college,
            },
          },
        });

        if (signUpError) throw signUpError;

        // email already registered: Supabase answers with no error and no identities
        if (signUpData.user && signUpData.user.identities?.length === 0) {
          throw new Error('That email already has an account. Try signing in.');
        }
        // a session here means "Confirm email" is OFF on the server. Never let an
        // unverified account in: sign it out and stop.
        if (signUpData.session) {
          await supabase.auth.signOut();
          console.error('Supabase "Confirm email" is OFF: turn it on in Authentication > Sign In / Providers > Email.');
          throw new Error('Sign-up is unavailable right now. Please try again later.');
        }

        logAuthEvent('signup', signUpData.user?.id, true);
        setVerifyEmail(identifier.toLowerCase().trim());
      } else {
        // --- SIGN IN FLOW ---
        let emailToUse = identifier.trim().toLowerCase();

        let signInData: { user: { id: string } | null };
        let error: any = null;
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToUse)) {
          const res = await supabase.auth.signInWithPassword({ email: emailToUse, password });
          signInData = { user: res.data.user }; error = res.error;
        } else {
          // username: the server finds the email, so it is never shown here
          const { data, error: fnError } = await supabase.functions.invoke('username-login', { body: { username: emailToUse, password } });
          let reply: any = data;
          if (fnError) { try { reply = await (fnError as any).context.json(); } catch { reply = null; } }
          if (!reply?.ok) throw new Error(reply?.message || 'Could not sign in. Check your connection and try again.');
          const set = await supabase.auth.setSession({ access_token: reply.access_token, refresh_token: reply.refresh_token });
          signInData = { user: set.data.user }; error = set.error;
        }

        if (error) throw error;
        logAuthEvent('signin', signInData.user?.id, true);
      }
    } catch (error: any) {
      logError("auth_handleAuth", error);
      if (mode === 'signin' && /not confirmed/i.test(error?.message || '') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier.trim())) {
        setVerifyEmail(identifier.trim().toLowerCase());
        return;
      }
      setError(/not confirmed/i.test(error?.message || '') ? 'Confirm your email first, then sign in.' : error.message);
      logAuthEvent(mode === 'signup' ? 'signup' : 'signin', undefined, false);
    } finally {
      setLoading(false);
    }
  };

  const passkeyLogin = async () => {
    setError(null);
    setPasskeyBusy(true);
    setPasskeyCode(null);
    const res = await signInWithPasskey(setPasskeyCode);
    setPasskeyBusy(false);
    setPasskeyCode(null);
    if (!res.ok && !res.cancelled) setError(res.message);
  };

  const toggleMode = () => {
    if (!SIGNUPS_ENABLED) return;
    const toSignup = mode === 'signin';
    setMode(toSignup ? 'signup' : 'signin');
    clearForm();
    // step 0 = "Add to Home Screen", only when the app is opened in a browser tab
    setSignupStep(toSignup && needsHomeScreen() ? 0 : 1);
  };

  if (verifyEmail) {
    return (
      <div style={{...styles.container, overflowY: 'auto', background: '#0f0f16', backgroundImage: 'none'}}>
        <VerifyEmail email={verifyEmail} password={password} onBack={() => { setVerifyEmail(null); setMode('signin'); clearForm(); }} />
      </div>
    );
  }

  // ── sign-up: one question per screen ──
  if ((mode as string) === 'signup') {
    const SU_TOTAL = 4;
    const bigField = 'w-full rounded-xl border border-white/10 bg-white/5 py-4 pl-12 pr-4 text-base text-white placeholder-white/30 transition-all focus:border-teal-500/50 focus:bg-white/10 focus:outline-none';
    const lbl = 'mb-1.5 ml-1 block text-[11px] font-extrabold uppercase tracking-wider text-white/40';
    const iconCls = 'absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-teal-400 transition-colors';
    const pwOk = password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password);

    const next = () => {
      setError(null);
      if (signupStep === 1) {
        const c = validateUsername(username);
        if (!c.valid) return setError(c.error || 'Invalid username');
        if (isCheckingUsername) return setError('Checking the username, one second…');
        if (usernameAvailable === false) return setError('That username is taken. Pick another.');
      } else if (signupStep === 2) {
        const c = validateEmail(identifier);
        if (!c.valid) return setError(c.error || 'Invalid email address');
      } else if (signupStep === 3) {
        const c = validatePassword(password);
        if (!c.valid) return setError(c.error || 'Password does not meet requirements');
        if (password !== confirmPassword) return setError('Passwords do not match.');
      }
      setSignupStep(n => n + 1);
    };
    const back = () => {
      setError(null);
      if (signupStep === 0 || (signupStep === 1 && !needsHomeScreen())) toggleMode();
      else setSignupStep(n => n - 1);
    };
    const onSubmit = (e: React.FormEvent) => { e.preventDefault(); if (signupStep < SU_TOTAL) next(); else handleAuth(e); };

    const head = (icon: React.ReactNode, title: string, sub: string) => (
      <>
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-teal-500/15 text-teal-400">{icon}</div>
        <h1 className="mt-6 text-[28px] font-extrabold tracking-tight text-white">{title}</h1>
        <p className="mt-1.5 text-[15px] text-white/50">{sub}</p>
      </>
    );
    const errBox = error && <p className="mt-3 text-center text-[13px] font-semibold text-red-400">{error}</p>;

    return (
      <div className="fixed inset-0 z-[3000] flex flex-col bg-[#0f0f16] text-white"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
        <div className="flex shrink-0 items-center justify-between px-5 pt-2">
          <button type="button" onClick={back} disabled={loading} className="flex items-center gap-1.5 border-0 bg-transparent p-1 text-sm font-semibold text-white/50">
            <ArrowLeft size={16} /> {signupStep === 0 || (signupStep === 1 && !needsHomeScreen()) ? 'Sign in' : 'Back'}
          </button>
          <span className="text-xs font-bold uppercase tracking-wider text-white/30">{signupStep === 0 ? 'Before you start' : `Account · ${signupStep} of ${SU_TOTAL}`}</span>
        </div>
        <div className="mx-auto mt-4 flex w-full max-w-[420px] shrink-0 gap-2 px-5">
          {Array.from({ length: SU_TOTAL }, (_, i) => i + 1).map(n => (
            <div key={n} className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-teal-500 transition-all duration-500" style={{ width: signupStep >= n ? '100%' : '0%' }} />
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.form key={signupStep} onSubmit={onSubmit} noValidate
            initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}
            className="mx-auto flex w-full max-w-[420px] flex-1 flex-col overflow-y-auto px-5 py-4">
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              {signupStep === 0 && (<>
                {head(<Smartphone size={30} />, 'Add UniMate to your Home Screen', 'It opens full screen, loads faster, and alerts work properly')}
                <ol className="mt-7 w-full space-y-3 text-left">
                  {(onIos()
                    ? [
                        { icon: <Share size={18} />, text: <>Tap the <b>Share</b> button at the bottom of Safari</> },
                        { icon: <SquarePlus size={18} />, text: <>Scroll down and tap <b>Add to Home Screen</b></> },
                        { icon: <Smartphone size={18} />, text: <>Tap <b>Add</b>, then open UniMate from your Home Screen</> },
                      ]
                    : [
                        { icon: <MoreVertical size={18} />, text: <>Tap the <b>menu</b> (⋮) in your browser</> },
                        { icon: <SquarePlus size={18} />, text: <>Tap <b>Install app</b> or <b>Add to Home screen</b></> },
                        { icon: <Smartphone size={18} />, text: <>Open UniMate from your Home Screen</> },
                      ]
                  ).map((r, i) => (
                    <li key={i} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-500/15 text-[13px] font-extrabold text-teal-300">{i + 1}</span>
                      <span className="flex-1 text-[15px] leading-snug text-white/80">{r.text}</span>
                      <span className="shrink-0 text-white/30">{r.icon}</span>
                    </li>
                  ))}
                </ol>
                <p className="mt-4 text-[13px] text-white/40">Then sign up from the app. You can also keep going here.</p>
              </>)}

              {signupStep === 1 && (<>
                {head(<User size={30} />, 'Pick a username', 'This is the name you will see in UniMate')}
                <div className="mt-7 w-full text-left">
                  <label className={lbl}>Username</label>
                  <div className="group relative">
                    <User className={iconCls} size={18} />
                    <input className={`${bigField} pr-11 ${usernameAvailable === false && !isCheckingUsername ? '!border-red-500/50' : ''}`} value={username} autoFocus maxLength={30}
                      onChange={e => { setUsername(e.target.value); setError(null); }} placeholder="Min 4 characters" autoCapitalize="none" autoCorrect="off" />
                    {username.length >= 4 && (
                      <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                        {isCheckingUsername ? <Loader2 className="animate-spin text-white/40" size={16} />
                          : usernameAvailable === true ? <Check className="text-emerald-500" size={16} />
                          : usernameAvailable === false ? <X className="text-red-500" size={16} /> : null}
                      </div>
                    )}
                  </div>
                  {username.length > 0 && username.length < 4 && <p className="ml-1 mt-1.5 text-[12px] font-bold text-red-400">Must be at least 4 characters</p>}
                  {usernameAvailable === false && !isCheckingUsername && <p className="ml-1 mt-1.5 flex items-center gap-1 text-[12px] font-bold text-red-400"><AlertCircle size={12} /> Username already taken</p>}
                  {errBox}
                </div>
              </>)}

              {signupStep === 2 && (<>
                {head(<Mail size={30} />, 'Your email', 'We will send a link to confirm it')}
                <div className="mt-7 w-full text-left">
                  <label className={lbl}>Email address</label>
                  <div className="group relative">
                    <Mail className={iconCls} size={18} />
                    <input className={bigField} type="text" inputMode="email" autoComplete="email" autoCapitalize="none" autoCorrect="off" autoFocus
                      value={identifier} onChange={e => { setIdentifier(e.target.value); setError(null); }} placeholder="you@example.com" />
                  </div>
                  {errBox}
                </div>
              </>)}

              {signupStep === 3 && (<>
                {head(<Lock size={30} />, 'Make a password', '8+ characters, a capital letter and a number')}
                <div className="mt-7 w-full space-y-3 text-left">
                  <div>
                    <label className={lbl}>Password</label>
                    <div className="group relative">
                      <Lock className={iconCls} size={18} />
                      <input className={bigField} type="password" autoComplete="new-password" autoFocus value={password}
                        onChange={e => { setPassword(e.target.value); setError(null); }} placeholder="Password" />
                    </div>
                    {password.length > 0 && !pwOk && <p className="ml-1 mt-1.5 text-[12px] font-bold text-red-400">8+ characters with a capital letter and a number</p>}
                  </div>
                  <div>
                    <label className={lbl}>Confirm password</label>
                    <div className="group relative">
                      <Lock className={iconCls} size={18} />
                      <input className={`${bigField} ${confirmPassword && confirmPassword !== password ? '!border-red-500/50' : ''}`} type="password" autoComplete="new-password" value={confirmPassword}
                        onChange={e => { setConfirmPassword(e.target.value); setError(null); }} placeholder="Type it again" />
                    </div>
                    {confirmPassword && confirmPassword !== password && <p className="ml-1 mt-1.5 text-[12px] font-bold text-red-400">Passwords do not match</p>}
                  </div>
                  {errBox}
                </div>
              </>)}

              {signupStep === 4 && (<>
                {head(<GraduationCap size={30} />, 'About you', 'All optional. You can skip it')}
                <div className="mt-7 w-full space-y-3 text-left">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={lbl}>Gender</label>
                      <select className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-4 text-base text-white focus:border-teal-500/50 focus:outline-none" value={gender} onChange={e => setGender(e.target.value)}>
                        <option value="" className="bg-slate-900">Select</option>
                        <option value="male" className="bg-slate-900">Male</option>
                        <option value="female" className="bg-slate-900">Female</option>
                        <option value="other" className="bg-slate-900">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className={lbl}>Year</label>
                      <select className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-4 text-base text-white focus:border-teal-500/50 focus:outline-none" value={year} onChange={e => setYear(e.target.value)}>
                        <option value="" className="bg-slate-900">Select</option>
                        {['1', '2', '3', '4'].map(y => <option key={y} value={y} className="bg-slate-900">Year {y}</option>)}
                        <option value="5" className="bg-slate-900">Year 5+</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={lbl}>Major</label>
                    <div className="group relative"><GraduationCap className={iconCls} size={18} />
                      <input className={bigField} value={major} onChange={e => setMajor(e.target.value)} placeholder="e.g. Software Engineering" /></div>
                  </div>
                  <div>
                    <label className={lbl}>College</label>
                    <div className="group relative"><Building className={iconCls} size={18} />
                      <input className={bigField} value={college} onChange={e => setCollege(e.target.value)} placeholder="University name" /></div>
                  </div>
                  {errBox}
                </div>
              </>)}
            </div>

            <div className="shrink-0 pt-4">
              <button type="submit" disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-0 bg-teal-600 py-4 text-base font-bold text-white disabled:opacity-60">
                {loading ? <Loader2 className="animate-spin" size={18} /> : signupStep === 0 ? <>Continue here <ArrowRight size={16} /></> : signupStep < SU_TOTAL ? <>Next <ArrowRight size={16} /></> : <>Create account <ArrowRight size={16} /></>}
              </button>
            </div>
          </motion.form>
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div style={{...styles.container, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', background: '#0f0f16', backgroundImage: 'none'}}>
      {/* Main */}
      <div className="w-full max-w-[420px] px-5 relative z-10 flex flex-col max-h-[94vh] animate-pop-in">
        {mode === 'signup' && (
          <div className="shrink-0 px-2 pb-6"><OnboardSteps current={0} /></div>
        )}
        {/* Brand */}
        <div className="flex flex-col items-center text-center shrink-0 pb-7">
            <img src="/apple-touch-icon.png" alt="UniMate" className="w-[76px] h-[76px] rounded-[20px] border border-white/10" />
            <h1 className="mt-5 mb-0 text-[2rem] font-extrabold tracking-[-0.03em] text-white">
                {mode === 'signin' ? 'Sign in' : 'Join UniMate'}
            </h1>
            <p className="mt-1.5 text-[0.95rem] font-medium text-white/50">
                {mode === 'signin' ? 'Welcome back to UniMate.' : 'Your whole semester, one calm app.'}
            </p>
        </div>

        {/* Form panel */}
        <div className="overflow-y-auto custom-scrollbar px-1 pb-2">
            <form onSubmit={handleAuth} className="space-y-4">
                
                {/* 1. Username Field - Snappy Collapse/Expand */}
                <div 
                    className={`grid transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                        mode === 'signup' 
                            ? 'grid-rows-[1fr] opacity-100 mb-0' 
                            : 'grid-rows-[0fr] opacity-0 mb-0 !mt-0'
                    }`}
                >
                    <div className="overflow-hidden min-h-0">
                        <div className="pb-4">
                            <div className="flex justify-between items-center mb-1.5 ml-1">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide">
                                    Username <span className="text-red-500">*</span>
                                </label>
                            </div>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-teal-400 transition-colors" size={18} />
                                <input
                                    type="text"
                                    required={mode === 'signup'}
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className={`w-full bg-white/5 border rounded-xl py-3.5 pl-11 pr-10 text-white placeholder-white/20 focus:outline-none focus:bg-white/10 transition-all
                                        ${(usernameAvailable === false && !isCheckingUsername) ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-teal-500/50'}
                                    `}
                                    placeholder="Min 4 characters"
                                />
                                {mode === 'signup' && username.length >= 4 && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                        {isCheckingUsername ? (
                                            <Loader2 className="animate-spin text-white/40" size={16} />
                                        ) : usernameAvailable === true ? (
                                            <Check className="text-emerald-500 animate-in zoom-in" size={16} />
                                        ) : usernameAvailable === false ? (
                                            <X className="text-red-500 animate-in zoom-in" size={16} />
                                        ) : null}
                                    </div>
                                )}
                            </div>
                            
                            {/* Username Validation Alerts */}
                            {mode === 'signup' && username.length > 0 && username.length < 4 && (
                                <p className="text-[10px] text-red-500 font-bold ml-1 mt-1">Must be at least 4 characters</p>
                            )}
                            {mode === 'signup' && usernameAvailable === false && !isCheckingUsername && (
                                <p className="text-[10px] text-red-500 font-bold ml-1 mt-1 flex items-center gap-1">
                                    <AlertCircle size={10} /> Username already taken
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. Static Fields (Email & Password) */}
                <div className="animate-fade-in-up" style={{animationDelay: '0.3s'}}>
                    <label className={`block text-xs font-bold text-slate-400 mb-1.5 ml-1 uppercase tracking-wide ${mode === 'signin' ? 'sr-only' : ''}`}>
                        {mode === 'signin' ? 'Email or Username' : 'Email Address'} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-teal-400 transition-colors" size={18} />
                        <input
                            type="text"
                            inputMode={mode === 'signin' ? 'text' : 'email'}
                            autoComplete={mode === 'signin' ? 'username' : 'email'}
                            autoCapitalize="none"
                            autoCorrect="off"
                            required
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-white/35 focus:outline-none focus:border-teal-500/50 transition-all focus:bg-white/10"
                            placeholder={mode === 'signin' ? "Email or username" : "you@example.com"}
                        />
                    </div>
                </div>
                
                <div className="animate-fade-in-up" style={{animationDelay: '0.4s'}}>
                    <label className={`block text-xs font-bold text-slate-400 mb-1.5 ml-1 uppercase tracking-wide ${mode === 'signin' ? 'sr-only' : ''}`}>
                        Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-teal-400 transition-colors" size={18} />
                        <input
                            type="password"
                            required
                            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-white/35 focus:outline-none focus:border-teal-500/50 transition-all focus:bg-white/10"
                            placeholder="Password"
                        />
                    </div>
                    {mode === 'signup' && password.length > 0 && !(password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)) && (
                        <p className="text-[10px] text-red-500 font-bold ml-1 mt-1">8+ characters with a capital letter and a number</p>
                    )}
                </div>

                {/* Confirm Password - Only in Signup */}
                <div 
                    className={`grid transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                        mode === 'signup' 
                            ? 'grid-rows-[1fr] opacity-100 mb-0' 
                            : 'grid-rows-[0fr] opacity-0 mb-0 !mt-0'
                    }`}
                >
                    <div className="overflow-hidden min-h-0">
                         <div className="pt-2"> 
                            <label className="block text-xs font-bold text-slate-400 mb-1.5 ml-1 uppercase tracking-wide">
                                Confirm Password <span className="text-red-500">*</span>
                            </label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-teal-400 transition-colors" size={18} />
                                <input
                                    type="password"
                                    required={mode === 'signup'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className={`w-full bg-white/5 border rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-white/20 focus:outline-none transition-all focus:bg-white/10
                                        ${confirmPassword && confirmPassword !== password ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-teal-500/50'}
                                    `}
                                    placeholder="••••••••"
                                />
                            </div>
                            {confirmPassword && confirmPassword !== password && (
                                <p className="text-[10px] text-red-500 font-bold ml-1 mt-1">Passwords do not match</p>
                            )}
                         </div>
                    </div>
                </div>

                {/* 3. Optional Fields - Snappy Collapse/Expand */}
                <div 
                    className={`grid transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                        mode === 'signup' 
                            ? 'grid-rows-[1fr] opacity-100 pt-2' 
                            : 'grid-rows-[0fr] opacity-0 pt-0 !mt-0'
                    }`}
                >
                  <div className="overflow-hidden min-h-0 space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="h-px bg-white/10 flex-1"></div>
                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Optional Details</span>
                        <div className="h-px bg-white/10 flex-1"></div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                             <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1 uppercase tracking-wide">Gender</label>
                             <div className="relative group">
                                 <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-teal-400 transition-colors" size={14} />
                                 <select
                                   value={gender}
                                   onChange={(e) => setGender(e.target.value)}
                                   className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-9 pr-2 text-white/80 text-sm focus:outline-none focus:border-teal-500/50 appearance-none focus:bg-white/10"
                                 >
                                   <option value="" disabled className="bg-slate-900">Select</option>
                                   <option value="male" className="bg-slate-900">Male</option>
                                   <option value="female" className="bg-slate-900">Female</option>
                                   <option value="other" className="bg-slate-900">Other</option>
                                 </select>
                             </div>
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1 uppercase tracking-wide">Year</label>
                             <div className="relative group">
                                 <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-teal-400 transition-colors" size={14} />
                                 <select
                                   value={year}
                                   onChange={(e) => setYear(e.target.value)}
                                   className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-9 pr-2 text-white/80 text-sm focus:outline-none focus:border-teal-500/50 appearance-none focus:bg-white/10"
                                 >
                                   <option value="" disabled className="bg-slate-900">Select</option>
                                   <option value="1" className="bg-slate-900">Year 1</option>
                                   <option value="2" className="bg-slate-900">Year 2</option>
                                   <option value="3" className="bg-slate-900">Year 3</option>
                                   <option value="4" className="bg-slate-900">Year 4</option>
                                   <option value="5" className="bg-slate-900">Year 5+</option>
                                 </select>
                             </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1 uppercase tracking-wide">Major</label>
                        <div className="relative group">
                            <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-teal-400 transition-colors" size={18} />
                            <input
                                type="text"
                                value={major}
                                onChange={(e) => setMajor(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-white/20 focus:outline-none focus:border-teal-500/50 transition-all text-sm focus:bg-white/10"
                                placeholder="Major (e.g. CS)"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1 uppercase tracking-wide">College</label>
                        <div className="relative group">
                            <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-teal-400 transition-colors" size={18} />
                            <input
                                type="text"
                                value={college}
                                onChange={(e) => setCollege(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-white/20 focus:outline-none focus:border-teal-500/50 transition-all text-sm focus:bg-white/10"
                                placeholder="College"
                            />
                        </div>
                    </div>
                  </div>
                </div>

                {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center font-medium animate-in slide-in-from-top-2">{error}</div>}
                {message && <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs text-center font-medium animate-in slide-in-from-top-2">{message}</div>}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full border-0 font-extrabold text-[1rem] py-4 rounded-2xl transition-transform flex items-center justify-center gap-2 mt-1 active:scale-[0.98] disabled:opacity-70 animate-fade-in-up"
                    style={{animationDelay: '0.6s', background: '#19b8a6', color: '#ffffff'}}
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : (mode === 'signin' ? 'Sign In' : 'Create Account')}
                </button>

                {mode === 'signin' && passkeysSupported() && (
                    <>
                        <div className="flex items-center gap-3 pt-1">
                            <div className="h-px flex-1 bg-white/10" /><span className="text-[10px] font-bold uppercase tracking-widest text-white/30">or</span><div className="h-px flex-1 bg-white/10" />
                        </div>
                        <button type="button" onClick={passkeyLogin} disabled={passkeyBusy || loading}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-3.5 text-[0.95rem] font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-60">
                            {passkeyBusy ? <Loader2 className="animate-spin" size={18} /> : <><Fingerprint size={20} className="text-teal-400" /> Sign in with a passkey</>}
                        </button>
                        {passkeyBusy && passkeyCode && (
                            <p className="text-center text-xs text-white/50">Safari should show the code <span className="font-extrabold text-white">{passkeyCode}</span>. If it doesn't, close it.</p>
                        )}
                    </>
                )}
            </form>

            <div className="mt-6 text-center animate-fade-in-up" style={{animationDelay: '0.7s'}}>
                {SIGNUPS_ENABLED ? (
                <p className="text-white/40 text-sm">
                    {mode === 'signin' ? "New here?" : "Already have an account?"}
                    <button 
                        onClick={toggleMode}
                        className="ml-2 text-teal-400 hover:text-teal-300 font-bold transition-colors"
                    >
                        {mode === 'signin' ? 'Create Account' : 'Sign In'}
                    </button>
                </p>
                ) : (
                <p className="text-white/40 text-[0.82rem]">New sign-ups are paused for now.</p>
                )}
            </div>
            
             {onEnterTestMode && (
                <div className="text-center mt-6 border-t border-white/5 pt-4">
                   <button onClick={onEnterTestMode} className="text-[10px] text-white/20 hover:text-white/50 transition uppercase tracking-widest font-semibold">
                     Test Mode
                   </button>
                </div>
              )}
        </div>
      </div>
    </div>
  );
}

export default memo(Auth);
