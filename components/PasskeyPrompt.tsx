import React, { useEffect, useState } from 'react';
import { Fingerprint, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Sheet from './Sheet';
import { addPasskey, listPasskeys, passkeysSupported } from '../services/passkeys';

const key = (uid: string) => `passkey_prompt_v1_${uid}`;

/** Offered once after sign-up (and once to existing users) until they add one or say no. */
const PasskeyPrompt: React.FC<{ userId: string | undefined; ready: boolean }> = ({ userId, ready }) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!userId || !ready || !passkeysSupported()) return;
    try { if (localStorage.getItem(key(userId))) return; } catch { /* private mode: still ask once per visit */ }
    let alive = true;
    const t = setTimeout(() => {
      listPasskeys()
        .then(l => { if (alive && !l.length) setOpen(true); })
        .catch(() => { /* table not set up yet: stay quiet */ });
    }, 1800);
    return () => { alive = false; clearTimeout(t); };
  }, [userId, ready]);

  const dismiss = () => {
    setOpen(false);
    try { if (userId) localStorage.setItem(key(userId), '1'); } catch { /* ignore */ }
  };

  const add = async () => {
    setBusy(true);
    const res = await addPasskey();
    setBusy(false);
    if (res.ok) { toast.success('Passkey added'); dismiss(); }
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
        <button onClick={dismiss} disabled={busy}
          className="mt-2 w-full rounded-2xl border-0 py-3.5 text-[16px] font-bold disabled:opacity-40" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}>
          Not now
        </button>
      </div>
    </Sheet>
  );
};

export default PasskeyPrompt;
