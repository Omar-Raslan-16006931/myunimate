import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Check, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import OnboardSteps from './OnboardSteps';

const COOLDOWN = 60;

/** Step 2 of setup: "check your email". Animated envelope, resend with a timer. */
const VerifyEmail: React.FC<{ email: string; onBack: () => void }> = ({ email, onBack }) => {
  const [left, setLeft] = useState(COOLDOWN);
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft(l => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

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
          {/* envelope: floats in, flap opens, a letter slides up, the check pops */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', damping: 16, stiffness: 180 }}
            className="relative h-[120px] w-[150px]"
          >
            <motion.div className="absolute inset-0" animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 3.2, ease: 'easeInOut', delay: 1.2 }}>
              <div className="absolute inset-x-0 bottom-0 h-[92px] rounded-2xl border border-white/10" style={{ background: 'linear-gradient(160deg,#1c2a2c,#101a1c)' }} />
              <motion.div
                className="absolute left-4 right-4 rounded-lg bg-white/90"
                style={{ bottom: 18, height: 70 }}
                initial={{ y: 0 }}
                animate={{ y: -34 }}
                transition={{ delay: 0.7, type: 'spring', damping: 14, stiffness: 120 }}
              >
                <div className="mx-3 mt-3 h-[5px] w-10 rounded-full bg-teal-500/70" />
                <div className="mx-3 mt-2 h-[4px] w-16 rounded-full bg-black/10" />
                <div className="mx-3 mt-1.5 h-[4px] w-12 rounded-full bg-black/10" />
              </motion.div>
              <div className="absolute inset-x-0 bottom-0 h-[92px] overflow-hidden rounded-2xl" style={{ clipPath: 'polygon(0 100%, 50% 38%, 100% 100%)', background: 'linear-gradient(180deg,#24383a,#152124)' }} />
              <motion.div
                className="absolute inset-x-0 origin-top"
                style={{ top: 28, height: 52, clipPath: 'polygon(0 0, 100% 0, 50% 100%)', background: 'linear-gradient(180deg,#2f4a4c,#1c2d2f)', transformStyle: 'preserve-3d' }}
                initial={{ rotateX: 0 }}
                animate={{ rotateX: 180 }}
                transition={{ delay: 0.45, duration: 0.5, ease: 'easeOut' }}
              />
            </motion.div>
            <motion.div
              className="absolute -right-1 -top-1 flex h-9 w-9 items-center justify-center rounded-full"
              style={{ background: '#19b8a6', color: '#fff', boxShadow: '0 6px 18px rgba(25,184,166,0.45)' }}
              initial={{ scale: 0, rotate: -40 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 1.1, type: 'spring', damping: 10, stiffness: 260 }}
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
            Tap the link, then come back here and sign in.
          </motion.p>

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
