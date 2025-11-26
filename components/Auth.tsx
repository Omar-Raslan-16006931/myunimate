
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { theme, styles } from '../theme';
import { Loader2, Mail, Lock, LogIn, UserPlus, Sparkles, Shield, User } from 'lucide-react';

interface AuthProps {
  onEnterTestMode?: () => void;
}

export default function Auth({ onEnterTestMode }: AuthProps) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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

  return (
    <div style={{...styles.container, justifyContent: 'center', alignItems: 'center'}}>
      {/* Background Ambience */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-violet-600/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[80px] pointer-events-none" />

      <div style={{...styles.card, width: '100%', maxWidth: '400px', padding: '40px', display: 'flex', flexDirection: 'column', gap: '24px', backdropFilter: 'blur(50px)'}}>
        
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-violet-500/20">
            <Sparkles size={32} className="text-white" />
          </div>
          <h1 style={{...styles.title, fontSize: '2rem', marginBottom: '8px'}}>UniMate</h1>
          <p style={styles.subtitle}>Your AI Academic Companion</p>
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-white/5 rounded-xl border border-white/10 relative">
          <button
            onClick={() => { setMode('signin'); setError(null); setMessage(null); }}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${mode === 'signin' ? 'bg-violet-600 text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode('signup'); setError(null); setMessage(null); }}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${mode === 'signup' ? 'bg-violet-600 text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          
          {mode === 'signup' && (
             <div className="animate-in slide-in-from-top-2 fade-in duration-300">
                <label style={styles.label}>Username</label>
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
          )}

          <div>
            <label style={styles.label}>Email</label>
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
            <label style={styles.label}>Password</label>
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
            style={{...styles.button, justifyContent: 'center', marginTop: '8px'}}
            className="group"
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

        {/* Test Mode Button */}
        {onEnterTestMode && (
          <div className="mt-2 pt-4 border-t border-white/10 text-center">
             <button 
               type="button"
               onClick={onEnterTestMode}
               className="text-xs text-white/40 hover:text-white transition-colors flex items-center justify-center gap-2 mx-auto"
             >
                <Shield size={12} />
                Enter Test Mode (Admin)
             </button>
          </div>
        )}
      </div>
    </div>
  );
}
