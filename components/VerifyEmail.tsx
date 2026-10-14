import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Check, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import OnboardSteps from './OnboardSteps';

const COOLDOWN = 60;

/** Step 2 of setup: "check your email". Animated envelope, resend with a timer. */
const VerifyEmail: React.FC<{ email: string; password?: string; onBack: () => void }> = ({ email, password, onBack }) => {
  const [left, setLeft] = useState(COOLDOWN);
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft(l => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  // Carry on by itself: once the link is tapped (even in another browser), signing in with the
  // details just typed works, and the app moves on. The password only lives in memory here.
  useEffect(() => {
    if (!password) return;
    let alive = true;
    let busy = false;
    const look = async () => {
      if (busy || !alive || document.visibilityState === 'hidden') return;
      busy = true;
      try { await supabase.auth.signInWithPassword({ email, password }); } // success starts the session: the app moves on
      catch { /* not confirmed yet, or offline: keep waiting */ }
      busy = false;
    };
    const onVisible = () => { if (document.visibilityState === 'visible') look(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    const t = setInterval(look, 15000);
    return () => { alive = false; clearInterval(t); document.removeEventListener('visibilitychange', onVisible); window.removeEventListener('focus', onVisible); };
  }, [email, password]);

  const resend = async () => {
    setSending(true);
    setNote(null);
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    setSending(false);
    if (error) {
      setNote({ ok: false, text: /rate|seconds|limit/i.test(error.message) ? 'Too many emails. Wait a minute and try again.' : "Couldn't send it. Try again in a bit." });
    } else {
      setNote({ ok: true, text: 'Sent again. Check spam too.' });
      setLeft(COOLDOWN);
    }
  };

  return (
    <div className="flex min-h-full w-full flex-col items-center justify-center px-5 py-6">
      <div className="w-full max-w-[420px]">
        <div className="px-2 pb-14"><OnboardSteps current={1} /></div>

        <div className="flex flex-col items-center text-center">
          {/* envelope: floats in, the flap opens, a letter slides up, the check pops */}
          <motion.div
            initial={{ scale: 0.7, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 190 }}
            className="relative"
            style={{ width: 170, height: 150 }}
          >
            <motion.div className="absolute inset-0" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 3.4, ease: 'easeInOut', delay: 1.6 }}>
              <svg width="170" height="150" viewBox="-10 -14 170 150" fill="none" style={{ overflow: 'visible' }}>
                {/* back of the envelope */}
                <rect x="0" y="40" width="150" height="84" rx="14" fill="#16262a" stroke="rgba(255,255,255,0.09)" />
                {/* the open flap sits behind the letter */}
                <motion.path d="M4 40 L75 -6 L146 40 Z" fill="#244247" stroke="#244247" strokeWidth="6" strokeLinejoin="round"
                  style={{ originX: 0.5, originY: 1 }}
                  initial={{ scaleY: 0, opacity: 0 }} animate={{ scaleY: 1, opacity: 1 }} transition={{ delay: 0.62, duration: 0.28, ease: 'easeOut' }} />
                {/* the letter */}
                <motion.g initial={{ y: 0, opacity: 0 }} animate={{ y: -38, opacity: 1 }} transition={{ y: { delay: 0.85, type: 'spring', damping: 15, stiffness: 120 }, opacity: { delay: 0.7, duration: 0.01 } }}>
                  <rect x="18" y="48" width="114" height="64" rx="8" fill="#f1f3f4" />
                  <rect x="32" y="60" width="44" height="6" rx="3" fill="#19b8a6" />
                  <rect x="32" y="74" width="78" height="5" rx="2.5" fill="#0f1417" fillOpacity="0.12" />
                  <rect x="32" y="85" width="62" height="5" rx="2.5" fill="#0f1417" fillOpacity="0.12" />
                </motion.g>
                {/* front pocket */}
                <path d="M0 54 L75 96 L150 54 V110 a14 14 0 0 1 -14 14 H14 a14 14 0 0 1 -14 -14 Z" fill="#1d3338" stroke="rgba(255,255,255,0.07)" />
                {/* the closed flap, folds away first */}
                <motion.path d="M4 40 L75 90 L146 40 Z" fill="#2a4a50" stroke="#2a4a50" strokeWidth="6" strokeLinejoin="round"
                  style={{ originX: 0.5, originY: 0 }}
                  initial={{ scaleY: 1, opacity: 1 }} animate={{ scaleY: 0, opacity: 0 }} transition={{ delay: 0.4, duration: 0.24, ease: 'easeIn' }} />
              </svg>
            </motion.div>
            <motion.div
              className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center rounded-full"
              style={{ background: '#19b8a6', color: '#fff' }}
              initial={{ scale: 0, rotate: -40 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 1.35, type: 'spring', damping: 10, stiffness: 260 }}
            >
              <Check size={20} strokeWidth={3.2} />
            </motion.div>
          </motion.div>

          <motion.h1 className="mt-7 text-[1.75rem] font-extrabold tracking-[-0.02em] text-white"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            Check your email
          </motion.h1>
          <motion.p className="mt-2 text-[0.95rem] leading-snug text-white/55"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
            We sent a link to<br /><span className="font-bold text-white">{email}</span>
          </motion.p>
          <motion.p className="mt-3 text-[0.82rem] text-white/40"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
            Tap the link within 30 minutes, then come back here. We'll sign you in. Unconfirmed sign-ups are removed after that.<br /><span className="mt-1.5 inline-block font-semibold text-white/60">Can't see it? Check your spam or junk folder.</span>
          </motion.p>

          {password && (
            <motion.div className="mt-5 flex items-center gap-2 text-[0.8rem] font-semibold text-white/45" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>
              <Loader2 size={14} className="animate-spin" /> Waiting for you to tap the link
            </motion.div>
          )}

          <motion.div className="mt-8 w-full" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
            <button onClick={resend} disabled={left > 0 || sending}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-3.5 text-[0.95rem] font-bold text-white transition-opacity disabled:opacity-50">
              {sending ? <Loader2 size={18} className="animate-spin" /> : left > 0 ? `Send again in ${left}s` : 'Send it again'}
            </button>
            {note && <p className="mt-2 text-[0.8rem] font-semibold" style={{ color: note.ok ? '#34d399' : '#f87171' }}>{note.text}</p>}
            <button onClick={onBack}
              className="mt-4 inline-flex items-center gap-1.5 border-0 bg-transparent p-1 text-[0.9rem] font-bold text-teal-400">
              <ArrowLeft size={16} /> Back to sign in
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
