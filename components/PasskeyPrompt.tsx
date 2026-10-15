import React, { useEffect, useState } from 'react';
import { Fingerprint, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Sheet from './Sheet';
import { supabase } from '../lib/supabase';
import { addPasskey, listPasskeys, passkeysSupported } from '../services/passkeys';

const key = (uid: string) => `passkey_prompt_v1_${uid}`;          // '1' = never again
const snoozeKey = (uid: string) => `passkey_prompt_snooze_${uid}`; // time of "Not now"
const SNOOZE_MS = 7 * 24 * 3600 * 1000;

/** Offered after sign-up until they add one. "Not now" asks again in a week; "Don't show again" never does (on any device). */
const PasskeyPrompt: React.FC<{ userId: string | undefined; ready: boolean }> = ({ userId, ready }) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!userId || !ready || !passkeysSupported()) return;
    try {
      if (localStorage.getItem(key(userId))) return;
      const snoozed = Number(localStorage.getItem(snoozeKey(userId)) || 0);
      if (snoozed && Date.now() - snoozed < SNOOZE_MS) return;
    } catch { /* private mode: still ask once per visit */ }
    let alive = true;
    const t = setTimeout(async () => {
      try {
        // "Don't show again" is also saved on the account, so a new phone or the app doesn't ask again
        const { data } = await supabase.auth.getUser();
        if (data.user?.user_metadata?.passkey_prompt_off) {
          try { localStorage.setItem(key(userId), '1'); } catch { /* ignore */ }
          return;
        }
      } catch { /* offline: fall through */ }
      listPasskeys()
        .then(l => { if (alive && !l.length) setOpen(true); })
        .catch(() => { /* table not set up yet: stay quiet */ });
    }, 1800);
    return () => { alive = false; clearTimeout(t); };
  }, [userId, ready]);

  /** Closes for now (added, or "Not now"). */
  const dismiss = (forever = false) => {
    setOpen(false);
    try {
      if (!userId) return;
      if (forever) localStorage.setItem(key(userId), '1');
      else localStorage.setItem(snoozeKey(userId), String(Date.now()));
    } catch { /* ignore */ }
  };

  const never = () => {
    dismiss(true);
    supabase.auth.updateUser({ data: { passkey_prompt_off: true } }).catch(() => { /* local flag still works */ });
  };

  const add = async () => {
    setBusy(true);
    const res = await addPasskey();
    setBusy(false);
    if (res.ok) { toast.success('Passkey added'); dismiss(true); }
    else if (!res.cancelled) toast.error(res.message);
  };

  return (
    <Sheet open={open} onClose={() => { if (!busy) dismiss(); }}>
      <div className="px-5 pb-6 pt-1 text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full" style={{ background: 'var(--surface-2)', color: 'var(--cta-bg)' }}>
          <Fingerprint size={30} />
        </div>
        <div className="text-[20px] font-extrabold">Sign in faster</div>
        <p className="mt-1 text-[14px]" style={{ color: 'var(--text-muted)' }}>
          Add a passkey and next time you just use Face ID or Touch ID. No password to type.
        </p>
        <button onClick={add} disabled={busy}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border-0 py-3.5 text-[16px] font-extrabold disabled:opacity-60" style={{ background: 'var(--cta-bg)', color: 'var(--cta-ink)' }}>
          {busy ? <Loader2 size={18} className="animate-spin" /> : 'Add a passkey'}
        </button>
        <button onClick={() => dismiss()} disabled={busy}
          className="mt-2 w-full rounded-2xl border-0 py-3.5 text-[16px] font-bold disabled:opacity-40" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}>
          Not now
        </button>
        <button onClick={never} disabled={busy}
          className="mt-1 w-full border-0 bg-transparent py-3 text-[14px] font-semibold disabled:opacity-40" style={{ color: 'var(--text-muted)' }}>
          Don't show this again
        </button>
      </div>
    </Sheet>
  );
};

export default PasskeyPrompt;
