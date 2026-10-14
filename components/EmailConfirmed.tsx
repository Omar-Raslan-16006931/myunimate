import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

/** Opened by the link in the confirmation email (?confirmed=1, or Supabase's #...type=signup). */
export const emailConfirmedFromUrl = (): boolean => {
  try {
    return new URLSearchParams(window.location.search).get('confirmed') === '1' || /[#&]type=signup\b/.test(window.location.hash);
  } catch { return false; }
};

/**
 * The page after tapping the link. The UniMate app (or the tab that was waiting) notices
 * the confirmation by itself and continues; this page just says it worked.
 */
const EmailConfirmed: React.FC = () => (
  <div className="flex min-h-[100dvh] items-center justify-center px-6 py-10" style={{ background: '#0f0f16', color: '#fff' }}>
    <div className="w-full max-w-[380px] text-center">
      <motion.div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full text-[#062a28]" style={{ background: '#2ee6d6' }}
        initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', damping: 11, stiffness: 220 }}>
        <Check size={40} strokeWidth={3} />
      </motion.div>
      <h1 className="text-[26px] font-extrabold tracking-[-0.02em]">Email confirmed</h1>
      <p className="mt-2 text-[15px] leading-snug text-white/55">You're all set. Go back to UniMate and it will sign you in by itself. You can close this page.</p>
    </div>
  </div>
);

export default EmailConfirmed;
