
import React, { useState } from 'react';
import { User, GraduationCap, Calendar, Building, Users, Sparkles, Loader2, LogOut, ArrowRight } from 'lucide-react';
import { theme, styles } from '../theme';

interface CompleteProfileProps {
  onComplete: (data: { username: string; gender: string; major: string; year: string; college: string }) => Promise<void>;
  loading: boolean;
  onSignOut?: () => void;
}

const CompleteProfile: React.FC<CompleteProfileProps> = ({ onComplete, loading, onSignOut }) => {
  const [username, setUsername] = useState('');
  const [gender, setGender] = useState('');
  const [major, setMajor] = useState('');
  const [year, setYear] = useState('');
  const [college, setCollege] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    
    try {
      await onComplete({ username, gender, major, year, college });
    } catch (err) {
      setError('Failed to update profile. Please try again.');
    }
  };

  const isFormValid = username.trim().length > 0;

  // Compact input style helper
  const compactInputStyle = {
      ...styles.input,
      paddingTop: '6px',
      paddingBottom: '6px',
      fontSize: '0.75rem',
      width: '100%',
      minHeight: 'auto'
  };

  return (
    <div style={{...styles.container, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', position: 'fixed', inset: 0, zIndex: 3000}}>
      {/* Background Ambience */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-violet-600/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[80px] pointer-events-none" />
      
      <div className="w-full max-w-[280px] mx-4 max-h-[90vh] overflow-y-auto bg-[#130f1c] border border-white/10 rounded-2xl shadow-2xl relative z-10 animate-in zoom-in-95 duration-300">
        <div className="p-3 flex flex-col gap-3">
          <div className="text-center relative">
            <div className="mx-auto w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center mb-2 shadow-lg shadow-violet-500/20 animate-pulse-slow">
              <Sparkles size={16} className="text-white" />
            </div>
            <h1 className="text-base font-bold text-white mb-0.5">Almost There!</h1>
            <p className="text-white/60 text-[10px]">Finish setting up your profile.</p>
            
            {onSignOut && (
                <button 
                    onClick={onSignOut}
                    className="absolute top-0 right-0 text-white/30 hover:text-white transition p-1"
                    title="Sign Out"
                >
                    <LogOut size={12} />
                </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            
            {/* Mandatory Username */}
            <div className="space-y-0.5">
              <label style={{...styles.label, fontSize: '0.6rem', marginBottom: '2px'}}>Username <span className="text-red-500">*</span></label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-violet-400 transition-colors" size={12} />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{...compactInputStyle, paddingLeft: '32px'}}
                  placeholder="Display name"
                  autoFocus
                />
              </div>
            </div>

            <div className="h-px bg-white/5 my-0.5" />
            <div className="flex items-center gap-2">
                <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Optional</span>
                <div className="h-px bg-white/5 flex-1"></div>
            </div>

            <div className="grid grid-cols-2 gap-2">
               <div>
                   <label style={{...styles.label, fontSize: '0.6rem', marginBottom: '2px'}}>Gender</label>
                   <div className="relative group">
                     <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-violet-400 transition-colors" size={10} />
                     <select
                       value={gender}
                       onChange={(e) => setGender(e.target.value)}
                       style={{...styles.select, ...compactInputStyle, paddingLeft: '28px', paddingRight: '10px'}}
                     >
                       <option value="" disabled>Select...</option>
                       <option value="male">Male</option>
                       <option value="female">Female</option>
                       <option value="other">Other</option>
                     </select>
                   </div>
               </div>
               <div>
                   <label style={{...styles.label, fontSize: '0.6rem', marginBottom: '2px'}}>Year</label>
                   <div className="relative group">
                     <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-violet-400 transition-colors" size={10} />
                     <select
                       value={year}
                       onChange={(e) => setYear(e.target.value)}
                       style={{...styles.select, ...compactInputStyle, paddingLeft: '28px', paddingRight: '10px'}}
                     >
                       <option value="" disabled>Select...</option>
                       <option value="1">Year 1</option>
                       <option value="2">Year 2</option>
                       <option value="3">Year 3</option>
                       <option value="4">Year 4</option>
                       <option value="5">Year 5+</option>
                     </select>
                   </div>
               </div>
            </div>

            <div>
               <label style={{...styles.label, fontSize: '0.6rem', marginBottom: '2px'}}>Major</label>
               <div className="relative group">
                 <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-violet-400 transition-colors" size={12} />
                 <input
                   type="text"
                   value={major}
                   onChange={(e) => setMajor(e.target.value)}
                   style={{...compactInputStyle, paddingLeft: '32px'}}
                   placeholder="e.g. CS"
                 />
               </div>
            </div>

            <div>
               <label style={{...styles.label, fontSize: '0.6rem', marginBottom: '2px'}}>College</label>
               <div className="relative group">
                 <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-violet-400 transition-colors" size={12} />
                 <input
                   type="text"
                   value={college}
                   onChange={(e) => setCollege(e.target.value)}
                   style={{...compactInputStyle, paddingLeft: '32px'}}
                   placeholder="University Name"
                 />
               </div>
            </div>

            {error && (
              <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-semibold text-center animate-in fade-in">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !isFormValid}
              style={{...styles.button, justifyContent: 'center', marginTop: '4px', padding: '8px', fontSize: '0.8rem', opacity: isFormValid ? 1 : 0.5, cursor: isFormValid ? 'pointer' : 'not-allowed'}}
              className="group shadow-lg shadow-indigo-900/20 hover:scale-[1.02] active:scale-95 transition-all bg-white text-black font-extrabold"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                <>
                  Done <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CompleteProfile;
