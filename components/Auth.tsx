
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { theme, styles } from '../theme';
import { Loader2, Mail, Lock, LogIn, UserPlus, Sparkles, User, GraduationCap, Building, Calendar, Users } from 'lucide-react';

interface AuthProps {
  onEnterTestMode?: () => void;
}

export default function Auth({ onEnterTestMode }: AuthProps) {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  
  // Optional Fields
  const [gender, setGender] = useState('');
  const [major, setMajor] = useState('');
  const [year, setYear] = useState('');
  const [college, setCollege] = useState('');

  const clearForm = () => {
      setEmail('');
      setPassword('');
      setUsername('');
      setGender('');
      setMajor('');
      setYear('');
      setCollege('');
      setError(null);
      setMessage(null);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'signup') {
        if (!username.trim()) throw new Error("Username is required");
        
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username,
              gender: gender,
              major: major,
              year: year,
              college: college
            }
          }
        });
        if (error) throw error;
        setMessage('Check your email for the confirmation link!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
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

  return (
    <div style={{...styles.container, justifyContent: 'center', alignItems: 'center', overflow: 'hidden'}}>
      {/* Background Ambience */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-violet-600/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[80px] pointer-events-none" />

      {/* Floating Scrollable Window */}
      <div 
        className="w-full max-w-[420px] mx-4 max-h-[85vh] overflow-y-auto bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl relative z-10"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="p-8 flex flex-col gap-6">
          
          <div className="text-center">
            <div className="mx-auto w-14 h-14 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-violet-500/20">
              <Sparkles size={28} className="text-white" />
            </div>
            <h1 style={{...styles.title, fontSize: '1.8rem', marginBottom: '4px'}}>UniMate</h1>
            <p style={styles.subtitle}>Your AI Academic Companion</p>
          </div>

          {/* Tabs */}
          <div className="flex p-1 bg-white/5 rounded-xl border border-white/10 relative shrink-0">
            <button
              onClick={() => { setMode('signin'); clearForm(); }}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${mode === 'signin' ? 'bg-violet-600 text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('signup'); clearForm(); }}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${mode === 'signup' ? 'bg-violet-600 text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
            >
              Sign Up
            </button>
          </div>

          {/* Google Login - Moved to Top */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white text-black font-bold py-3 px-4 rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-center gap-3 mt-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign in with Google
          </button>

          <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#1e1b2e] px-2 text-white/30 rounded">Or continue with email</span>
              </div>
          </div>

          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            
            {/* Essential Fields */}
            {mode === 'signup' && (
               <div className="animate-in slide-in-from-top-2 fade-in duration-300 space-y-4">
                  <div>
                    <label style={styles.label}>Username <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        style={{...styles.input, paddingLeft: '44px', width: '100%', boxSizing: 'border-box'}}
                        placeholder="johndoe123"
                      />
                    </div>
                  </div>
                </div>
            )}

            <div>
              <label style={styles.label}>Email <span className="text-red-400">*</span></label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{...styles.input, paddingLeft: '44px', width: '100%', boxSizing: 'border-box'}}
                  placeholder="student@university.edu"
                />
              </div>
            </div>
            
            <div>
              <label style={styles.label}>Password <span className="text-red-400">*</span></label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{...styles.input, paddingLeft: '44px', width: '100%', boxSizing: 'border-box'}}
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Optional Fields for Sign Up */}
            {mode === 'signup' && (
              <div className="animate-in slide-in-from-top-2 fade-in duration-300 space-y-4 pt-2 border-t border-white/10 mt-2">
                 <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Optional Profile Details</span>
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label style={styles.label}>Gender</label>
                        <div className="relative">
                          <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={14} />
                          <select
                            value={gender}
                            onChange={(e) => setGender(e.target.value)}
                            style={{...styles.select, paddingLeft: '34px', paddingRight: '10px', fontSize: '0.8rem'}}
                          >
                            <option value="" disabled>Select...</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                          </select>
                        </div>
                    </div>
                    <div>
                        <label style={styles.label}>Year</label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={14} />
                          <select
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                            style={{...styles.select, paddingLeft: '34px', paddingRight: '10px', fontSize: '0.8rem'}}
                          >
                            <option value="" disabled>Select...</option>
                            <option value="1">Year 1</option>
                            <option value="2">Year 2</option>
                            <option value="3">Year 3</option>
                            <option value="4">Year 4</option>
                            <option value="5">Year 5</option>
                          </select>
                        </div>
                    </div>
                 </div>

                 <div>
                    <label style={styles.label}>Major</label>
                    <div className="relative">
                      <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                      <input
                        type="text"
                        value={major}
                        onChange={(e) => setMajor(e.target.value)}
                        style={{...styles.input, paddingLeft: '44px', width: '100%', boxSizing: 'border-box'}}
                        placeholder="Computer Science"
                      />
                    </div>
                 </div>

                 <div>
                    <label style={styles.label}>College / University</label>
                    <div className="relative">
                      <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                      <input
                        type="text"
                        value={college}
                        onChange={(e) => setCollege(e.target.value)}
                        style={{...styles.input, paddingLeft: '44px', width: '100%', boxSizing: 'border-box'}}
                        placeholder="University of Technology"
                      />
                    </div>
                 </div>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold text-center">
                {error}
              </div>
            )}

            {message && (
              <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold text-center">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{...styles.button, justifyContent: 'center', marginTop: '12px', padding: '14px'}}
              className="group shadow-lg shadow-violet-900/20"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : mode === 'signin' ? (
                <>Sign In <LogIn size={18} className="group-hover:translate-x-1 transition-transform" /></>
              ) : (
                <>Create Account <UserPlus size={18} className="group-hover:translate-x-1 transition-transform" /></>
              )}
            </button>
          </form>

          {onEnterTestMode && (
            <div className="text-center pt-2">
               <button onClick={onEnterTestMode} className="text-xs text-white/30 hover:text-white transition underline">
                 Enter Admin Mode
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
