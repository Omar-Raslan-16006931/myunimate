
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { styles } from '../theme';
import { Loader2, Mail, Lock, Sparkles, ArrowRight, Github } from 'lucide-react';

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

  const clearForm = () => {
      setEmail('');
      setPassword('');
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
        // Simple sign up - Profile details will be collected in CompleteProfile step
        const { error } = await supabase.auth.signUp({
          email,
          password,
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

      {/* Main Card */}
      <div 
        className="w-full max-w-[400px] mx-4 bg-[#130f1c] border border-white/10 rounded-3xl shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-300"
      >
        {/* Header Image / Gradient */}
        <div className="h-32 bg-gradient-to-br from-violet-600 to-indigo-900 relative flex items-center justify-center">
            <div className="absolute inset-0 bg-black/20" />
            <div className="relative z-10 flex flex-col items-center">
                 <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center mb-2 shadow-lg border border-white/20">
                    <Sparkles className="text-white" size={24} />
                 </div>
                 <h1 className="text-2xl font-bold text-white tracking-tight">UniMate</h1>
                 <p className="text-white/60 text-xs mt-1">Your AI Productivity Hub</p>
            </div>
        </div>

        <div className="p-8">
            <h2 className="text-xl font-bold text-white mb-6 text-center">
                {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
            </h2>

            {/* Google Button - Always Primary */}
            <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full bg-white hover:bg-gray-100 text-black font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-3 mb-6 relative group shadow-lg shadow-white/5"
            >
                <img src="https://www.google.com/favicon.ico" alt="G" className="w-5 h-5" />
                <span>Continue with Google</span>
                <ArrowRight size={18} className="absolute right-4 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
            </button>

            <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#130f1c] px-2 text-white/30">Or via Email</span></div>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
                <div>
                    <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-violet-400 transition-colors" size={18} />
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 transition-all"
                            placeholder="Email address"
                        />
                    </div>
                </div>
                
                <div>
                    <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-violet-400 transition-colors" size={18} />
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 transition-all"
                            placeholder="Password"
                        />
                    </div>
                </div>

                {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">{error}</div>}
                {message && <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs text-center">{message}</div>}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-violet-900/20 flex items-center justify-center gap-2"
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : (mode === 'signin' ? 'Sign In' : 'Create Account')}
                </button>
            </form>

            <div className="mt-6 text-center">
                <p className="text-white/40 text-sm">
                    {mode === 'signin' ? "New here?" : "Already have an account?"}
                    <button 
                        onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); clearForm(); }}
                        className="ml-2 text-violet-400 hover:text-violet-300 font-bold transition-colors"
                    >
                        {mode === 'signin' ? 'Create Account' : 'Sign In'}
                    </button>
                </p>
            </div>
            
             {onEnterTestMode && (
                <div className="text-center mt-6 border-t border-white/5 pt-4">
                   <button onClick={onEnterTestMode} className="text-[10px] text-white/20 hover:text-white/50 transition uppercase tracking-widest">
                     Admin Mode
                   </button>
                </div>
              )}
        </div>
      </div>
    </div>
  );
}
