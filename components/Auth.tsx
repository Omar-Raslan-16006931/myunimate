
import React, { useState, memo, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { styles } from '../theme';
import { Loader2, Mail, Lock, Sparkles, ArrowRight, User, GraduationCap, Calendar, Building, Users, LogIn, Check, AlertCircle, X, Ticket } from 'lucide-react';

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
        if (!username.trim()) throw new Error("Username is required.");
        if (username.trim().length < 4) throw new Error("Username must be at least 4 characters long.");
        
        if (usernameAvailable === false) {
             throw new Error("Username is already taken. Please choose another.");
        }

        if (!identifier.includes('@')) throw new Error("Please enter a valid email address for registration.");
        
        if (password.length < 6) throw new Error("Password must be at least 6 characters long.");

        if (password !== confirmPassword) {
            throw new Error("Passwords do not match.");
        }

        // --- REFERRAL CODE CHECK ---
        let verifiedReferralCode = null;
        let referralCodeId = null;

        if (referralCode.trim()) {
            // Re-validate strictly on submit
            const { data, error } = await supabase
                .from('referral_codes')
                .select('*')
                .eq('code', referralCode.trim())
                .eq('is_active', true)
                .single();
            
            if (error || !data) {
                throw new Error("Invalid or inactive referral code.");
            }
            verifiedReferralCode = data.code;
            referralCodeId = data.id;
        }

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: identifier,
          password,
          options: {
            // CRITICAL: Passing metadata here lets the Postgres Trigger 'on_auth_user_created'
            // automatically create the profile row with the correct data.
            data: {
                username,
                full_name: username,    
                display_name: username, 
                name: username,         
                gender,
                major,
                year,
                college,
                subscription_tier: 0,
                referred_by: verifiedReferralCode 
            }
          }
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
                 console.warn("Failed to increment referral code count:", updateError);
             }
        }

        // --- EXPLICIT UPDATE FOR REFERRED_BY ---
        // If the database trigger fails to map referred_by from metadata, we do it manually here.
        if (signUpData.user && verifiedReferralCode) {
            // Use a short timeout to reduce race condition probability with the initial trigger
            setTimeout(async () => {
                try {
                    await supabase.from('profiles')
                        .update({ referred_by: verifiedReferralCode })
                        .eq('id', signUpData.user!.id);
                } catch (err) {
                    console.warn("Manual profile update failed", err);
                }
            }, 1000);
        }

        setMessage('Check your email for the confirmation link!');
      } else {
        // --- SIGN IN FLOW ---
        let emailToUse = identifier.trim();

        // Check if input is NOT an email (assuming it is a username)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailToUse)) {
            // Attempt to resolve username to email via Profile lookup
            const { data, error: lookupError } = await supabase
                .from('profiles')
                .select('email')
                .eq('username', emailToUse) // Queries the CITEXT username column
                .maybeSingle();

            if (lookupError || !data || !data.email) {
                throw new Error("Username not found. Please try your email address.");
            }
            
            // Found the email associated with the username
            emailToUse = data.email;
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: emailToUse,
          password,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
      setIsCheckingReferral(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/drive.readonly',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) throw error;
    } catch (error: any) {
      setError(error.message);
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    clearForm();
  };

  return (
    <div style={{...styles.container, justifyContent: 'center', alignItems: 'center', overflow: 'hidden'}}>
      {/* Background Ambience */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-violet-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Card */}
      <div 
        className="w-full max-w-[420px] mx-4 bg-[#0a0a0f] border border-white/10 rounded-3xl shadow-2xl relative z-10 overflow-hidden animate-pop-in flex flex-col max-h-[90vh]"
      >
        {/* Animated Header */}
        <div className="h-40 relative flex items-center justify-center shrink-0 overflow-hidden bg-gradient-to-br from-violet-600 via-fuchsia-600 to-indigo-800 bg-[length:200%_200%] animate-gradient-x">
            {/* Liquid Background Overlay */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/20 blur-3xl rounded-full animate-blob" />
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-300/20 blur-3xl rounded-full animate-blob animation-delay-2000" />
            
            <div className="relative z-10 flex flex-col items-center">
                 <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center mb-3 shadow-2xl border border-white/30 transform transition-transform hover:scale-105 duration-300 group animate-float">
                    {mode === 'signin' ? (
                         <Sparkles className="text-white group-hover:rotate-12 transition-transform duration-300" size={32} />
                    ) : (
                         <GraduationCap className="text-white group-hover:-rotate-12 transition-transform duration-300" size={32} />
                    )}
                 </div>
                 
                 {/* Stacked Titles for Smooth Transition */}
                 <div className="relative h-9 w-64 flex justify-center items-center overflow-hidden">
                    <h1 
                        className={`text-3xl font-bold text-white tracking-tight absolute transition-all duration-500 transform ${mode === 'signin' ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}
                    >
                        Welcome Back
                    </h1>
                    <h1 
                        className={`text-3xl font-bold text-white tracking-tight absolute transition-all duration-500 transform ${mode === 'signup' ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
                    >
                        Join UniMate
                    </h1>
                 </div>

                 <p className="text-white/70 text-xs font-medium tracking-wide uppercase opacity-80 mt-1">
                    {mode === 'signin' ? 'Your AI Productivity Hub' : 'Start your journey today'}
                 </p>
            </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="p-8 overflow-y-auto custom-scrollbar bg-gradient-to-b from-[#0a0a0f] to-[#130f1c]">
            {/* Google Button - Always Primary */}
            <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full bg-white hover:bg-slate-200 text-black font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-3 mb-6 relative group shadow-lg shadow-white/5 active:scale-[0.98] animate-fade-in-up"
                style={{animationDelay: '0.1s'}}
            >
                <img src="https://www.google.com/favicon.ico" alt="G" className="w-5 h-5" />
                <span>Continue with Google</span>
                <ArrowRight size={18} className="absolute right-4 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1 text-black/50" />
            </button>

            <div className="relative mb-6 animate-fade-in-up" style={{animationDelay: '0.2s'}}>
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest"><span className="bg-[#0f0f16] px-3 text-white/30">Or via Credentials</span></div>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
                
                {/* 1. Username Field - Snappy Collapse/Expand */}
                <div 
                    className={`grid transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                        mode === 'signup' 
                            ? 'grid-rows-[1fr] opacity-100 mb-0' 
                            : 'grid-rows-[0fr] opacity-0 mb-0'
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
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-violet-400 transition-colors" size={18} />
                                <input
                                    type="text"
                                    required={mode === 'signup'}
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className={`w-full bg-white/5 border rounded-xl py-3.5 pl-11 pr-10 text-white placeholder-white/20 focus:outline-none focus:bg-white/10 transition-all
                                        ${(usernameAvailable === false && !isCheckingUsername) ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-violet-500/50'}
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
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 ml-1 uppercase tracking-wide">
                        {mode === 'signin' ? 'Email or Username' : 'Email Address'} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative group">
                        {mode === 'signin' ? (
                            <LogIn className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-violet-400 transition-colors" size={18} />
                        ) : (
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-violet-400 transition-colors" size={18} />
                        )}
                        <input
                            type="text"
                            required
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 transition-all focus:bg-white/10"
                            placeholder={mode === 'signin' ? "username or user@example.com" : "user@example.com"}
                        />
                    </div>
                </div>
                
                <div className="animate-fade-in-up" style={{animationDelay: '0.4s'}}>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 ml-1 uppercase tracking-wide">
                        Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-violet-400 transition-colors" size={18} />
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 transition-all focus:bg-white/10"
                            placeholder="••••••••"
                        />
                    </div>
                    {mode === 'signup' && password.length > 0 && password.length < 6 && (
                        <p className="text-[10px] text-red-500 font-bold ml-1 mt-1">Must be at least 6 characters</p>
                    )}
                </div>

                {/* Confirm Password - Only in Signup */}
                <div 
                    className={`grid transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                        mode === 'signup' 
                            ? 'grid-rows-[1fr] opacity-100 mb-0' 
                            : 'grid-rows-[0fr] opacity-0 mb-0'
                    }`}
                >
                    <div className="overflow-hidden min-h-0">
                         <div className="pt-2"> 
                            <label className="block text-xs font-bold text-slate-400 mb-1.5 ml-1 uppercase tracking-wide">
                                Confirm Password <span className="text-red-500">*</span>
                            </label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-violet-400 transition-colors" size={18} />
                                <input
                                    type="password"
                                    required={mode === 'signup'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className={`w-full bg-white/5 border rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-white/20 focus:outline-none transition-all focus:bg-white/10
                                        ${confirmPassword && confirmPassword !== password ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-violet-500/50'}
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

                {/* Referral Code - Only in Signup */}
                <div 
                    className={`grid transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                        mode === 'signup' 
                            ? 'grid-rows-[1fr] opacity-100 mb-0' 
                            : 'grid-rows-[0fr] opacity-0 mb-0'
                    }`}
                >
                     <div className="overflow-hidden min-h-0">
                         <div className="pt-4"> 
                            <label className="block text-xs font-bold text-slate-400 mb-1.5 ml-1 uppercase tracking-wide">
                                Referral Code
                            </label>
                            <div className="relative group">
                                <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-violet-400 transition-colors" size={18} />
                                <input
                                    type="text"
                                    value={referralCode}
                                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                                    className={`w-full bg-white/5 border rounded-xl py-3.5 pl-11 pr-10 text-white placeholder-white/20 focus:outline-none transition-all focus:bg-white/10 font-mono tracking-wider
                                        ${(isReferralValid === false && !isCheckingReferral) ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-violet-500/50'}
                                    `}
                                    placeholder="OPTIONAL"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                    {isCheckingReferral ? (
                                        <Loader2 size={16} className="animate-spin text-white/40" />
                                    ) : isReferralValid === true ? (
                                        <Check className="text-emerald-500 animate-in zoom-in" size={16} />
                                    ) : isReferralValid === false ? (
                                        <X className="text-red-500 animate-in zoom-in" size={16} />
                                    ) : null}
                                </div>
                            </div>
                            {isReferralValid === false && !isCheckingReferral && (
                                <p className="text-[10px] text-red-500 font-bold ml-1 mt-1">Invalid referral code</p>
                            )}
                         </div>
                    </div>
                </div>

                {/* 3. Optional Fields - Snappy Collapse/Expand */}
                <div 
                    className={`grid transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                        mode === 'signup' 
                            ? 'grid-rows-[1fr] opacity-100 pt-2' 
                            : 'grid-rows-[0fr] opacity-0 pt-0'
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
                                 <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-violet-400 transition-colors" size={14} />
                                 <select
                                   value={gender}
                                   onChange={(e) => setGender(e.target.value)}
                                   className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-9 pr-2 text-white/80 text-sm focus:outline-none focus:border-violet-500/50 appearance-none focus:bg-white/10"
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
                                 <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-violet-400 transition-colors" size={14} />
                                 <select
                                   value={year}
                                   onChange={(e) => setYear(e.target.value)}
                                   className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-9 pr-2 text-white/80 text-sm focus:outline-none focus:border-violet-500/50 appearance-none focus:bg-white/10"
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
                            <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-violet-400 transition-colors" size={18} />
                            <input
                                type="text"
                                value={major}
                                onChange={(e) => setMajor(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 transition-all text-sm focus:bg-white/10"
                                placeholder="Major (e.g. CS)"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1 uppercase tracking-wide">College</label>
                        <div className="relative group">
                            <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-violet-400 transition-colors" size={18} />
                            <input
                                type="text"
                                value={college}
                                onChange={(e) => setCollege(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 transition-all text-sm focus:bg-white/10"
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
                    className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-violet-900/30 flex items-center justify-center gap-2 mt-4 active:scale-[0.98] animate-fade-in-up"
                    style={{animationDelay: '0.6s'}}
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : (mode === 'signin' ? 'Sign In' : 'Create Account')}
                </button>
            </form>

            <div className="mt-6 text-center animate-fade-in-up" style={{animationDelay: '0.7s'}}>
                <p className="text-white/40 text-sm">
                    {mode === 'signin' ? "New here?" : "Already have an account?"}
                    <button 
                        onClick={toggleMode}
                        className="ml-2 text-violet-400 hover:text-violet-300 font-bold transition-colors"
                    >
                        {mode === 'signin' ? 'Create Account' : 'Sign In'}
                    </button>
                </p>
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
