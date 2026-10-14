import React, { useState } from 'react';
import { User, GraduationCap, Loader2, LogOut, ArrowRight, ArrowLeft } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface CompleteProfileProps {
  onComplete: (data: { username: string; gender: string; major: string; year: string; college: string }) => Promise<void>;
  loading: boolean;
  onSignOut?: () => void;
}

const field = 'w-full rounded-xl border border-white/5 bg-black/40 px-4 py-4 text-base text-white placeholder-white/30 focus:border-teal-500/50 focus:outline-none';
const label = 'mb-1.5 block text-[11px] font-extrabold uppercase tracking-wider text-white/40';
const primary = 'flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 py-4 text-base font-bold text-white disabled:opacity-40';
const quiet = 'w-full py-2 text-sm font-semibold text-white/40 disabled:opacity-40';

/** Two short screens instead of one cramped form: 1) username, 2) a few optional details. */
const CompleteProfile: React.FC<CompleteProfileProps> = ({ onComplete, loading, onSignOut }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [username, setUsername] = useState('');
  const [gender, setGender] = useState('');
  const [major, setMajor] = useState('');
  const [year, setYear] = useState('');
  const [college, setCollege] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const finish = async (withDetails: boolean) => {
    if (!username.trim()) { setStep(1); setError('Username is required'); return; }
    setError('');
    setSaving(true);
    try {
      await onComplete({
        username: username.trim(),
        gender: withDetails ? gender : '', major: withDetails ? major : '',
        year: withDetails ? year : '', college: withDetails ? college : '',
      });
    } catch {
      setError('Could not save your profile. Try again.');
      setSaving(false);
    }
  };

  const busy = loading || saving;

  return (
    <div className="fixed inset-0 z-[3000] flex flex-col bg-[#0f0f16] text-white"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
      <div className="flex shrink-0 items-center justify-between px-5 pt-2">
        <span className="text-xs font-bold uppercase tracking-wider text-white/30">Profile · {step} of 2</span>
        {onSignOut && (
          <button onClick={onSignOut} title="Sign out" className="flex items-center gap-1.5 border-0 bg-transparent p-1 text-sm font-semibold text-white/40">
            <LogOut size={14} /> Sign out
          </button>
        )}
      </div>
      <div className="mx-auto mt-4 flex w-full max-w-[420px] shrink-0 gap-2 px-5">
        {[1, 2].map(n => (
          <div key={n} className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-teal-500 transition-all duration-500" style={{ width: step >= n ? '100%' : '0%' }} />
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {step === 1 ? (
          <motion.form key="s1" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}
            onSubmit={e => { e.preventDefault(); if (username.trim()) { setError(''); setStep(2); } else setError('Username is required'); }}
            className="mx-auto flex w-full max-w-[420px] flex-1 flex-col overflow-y-auto px-5 py-4">
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-teal-500/15 text-teal-400"><User size={30} /></div>
              <h1 className="mt-6 text-[28px] font-extrabold tracking-tight">Pick a username</h1>
              <p className="mt-1.5 text-[15px] text-white/50">This is the name you'll see in UniMate</p>
              <div className="mt-7 w-full text-left">
                <label className={label}>Username</label>
                <input className={field} value={username} onChange={e => { setUsername(e.target.value); setError(''); }} placeholder="Display name" autoFocus maxLength={30} />
                {error && <p className="mt-3 text-center text-[13px] font-semibold text-red-400">{error}</p>}
              </div>
            </div>
            <div className="shrink-0 pt-4">
              <button type="submit" disabled={!username.trim()} className={primary}>Next <ArrowRight size={16} /></button>
            </div>
          </motion.form>
        ) : (
          <motion.form key="s2" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}
            onSubmit={e => { e.preventDefault(); finish(true); }}
            className="mx-auto flex w-full max-w-[420px] flex-1 flex-col overflow-y-auto px-5 py-4">
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-teal-500/15 text-teal-400"><GraduationCap size={30} /></div>
              <h1 className="mt-6 text-[28px] font-extrabold tracking-tight">About you</h1>
              <p className="mt-1.5 text-[15px] text-white/50">All optional. You can skip it</p>
              <div className="mt-7 w-full space-y-3 text-left">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={label}>Gender</label>
                    <select className={field} value={gender} onChange={e => setGender(e.target.value)}>
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className={label}>Year</label>
                    <select className={field} value={year} onChange={e => setYear(e.target.value)}>
                      <option value="">Select</option>
                      <option value="1">Year 1</option>
                      <option value="2">Year 2</option>
                      <option value="3">Year 3</option>
                      <option value="4">Year 4</option>
                      <option value="5">Year 5+</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className={label}>Major</label>
                  <input className={field} value={major} onChange={e => setMajor(e.target.value)} placeholder="e.g. Software Engineering" />
                </div>
                <div>
                  <label className={label}>College</label>
                  <input className={field} value={college} onChange={e => setCollege(e.target.value)} placeholder="University name" />
                </div>
                {error && <p className="text-center text-[13px] font-semibold text-red-400">{error}</p>}
              </div>
            </div>
            <div className="shrink-0 pt-4">
              <button type="submit" disabled={busy} className={primary}>{busy ? <Loader2 className="animate-spin" size={16} /> : <>Done <ArrowRight size={16} /></>}</button>
              <button type="button" onClick={() => finish(false)} disabled={busy} className={quiet}>Skip</button>
              <button type="button" onClick={() => setStep(1)} disabled={busy} className={`${quiet} flex items-center justify-center gap-1`}><ArrowLeft size={14} /> Back</button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CompleteProfile;
