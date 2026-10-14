
import React, { useState, memo, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { styles } from '../theme';
import { Loader2, Mail, Lock, User, GraduationCap, Calendar, Building, Users, Check, AlertCircle, X } from 'lucide-react';
import { validateEmail, validatePassword, validateUsername } from '../utils/validation';
import { logError, logAuthEvent } from '../utils/logger';
import { SIGNUPS_ENABLED } from '../lib/featureFlags';
import OnboardSteps from './OnboardSteps';

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

        logAuthEvent('signup', signUpData.user?.id, true);
        setMessage('Check your email for the confirmation link!');
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
      setError(error.message);
      logAuthEvent(mode === 'signup' ? 'signup' : 'signin', undefined, false);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    if (!SIGNUPS_ENABLED) return;
    setMode(mode === 'signin' ? 'signup' : 'signin');
    clearForm();
  };

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
