import React, { useEffect, useState } from 'react';
import { Fingerprint, Loader2, Plus, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { addPasskey, listPasskeys, removePasskey, passkeysSupported, passkeysUnsupportedReason, Passkey } from '../services/passkeys';

const when = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/** Settings card: see, add and remove passkeys. */
const PasskeySettings: React.FC = () => {
  const [list, setList] = useState<Passkey[] | null>(null);
  const [busy, setBusy] = useState<'add' | string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  const load = () => listPasskeys().then(setList).catch(() => setList([]));
  useEffect(() => { load(); }, []);

  if (!passkeysSupported()) {
    return <p className="px-1 text-[13px] text-white/50">{passkeysUnsupportedReason()}</p>;
  }

  const add = async () => {
    setBusy('add');
    const res = await addPasskey();
    setBusy(null);
    if (res.ok) { toast.success('Passkey added'); load(); }
    else if (!res.cancelled) toast.error(res.message);
  };

  const remove = async (id: string) => {
    setBusy(id);
    const ok = await removePasskey(id);
    setBusy(null);
    setConfirm(null);
    if (ok) { setList(l => l && l.filter(p => p.id !== id)); toast('Passkey removed'); }
    else toast.error("Couldn't remove it. Try again.");
  };

  return (
    <div className="space-y-3">
      <p className="px-1 text-[13px] leading-snug text-white/50">Sign in with Face ID or Touch ID instead of typing your password.</p>

      {list === null ? (
        <div className="flex justify-center py-4 text-white/40"><Loader2 size={16} className="animate-spin" /></div>
      ) : (
        <AnimatePresence initial={false}>
          {list.map(p => (
            <motion.div key={p.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-black/30 p-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-500/15 text-teal-400"><Fingerprint size={20} /></div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-white">{p.device_name}</div>
                  <div className="truncate text-xs text-white/50">Added {when(p.created_at)}{p.last_used_at ? ` · Used ${when(p.last_used_at)}` : ''}</div>
                </div>
                {confirm === p.id ? (
                  <div className="flex shrink-0 gap-2">
                    <button onClick={() => setConfirm(null)} disabled={busy === p.id} className="h-9 rounded-xl bg-white/5 px-3 text-xs font-bold text-white">No</button>
                    <button onClick={() => remove(p.id)} disabled={busy === p.id} className="flex h-9 items-center rounded-xl bg-red-500/15 px-3 text-xs font-bold text-red-400">
                      {busy === p.id ? <Loader2 size={13} className="animate-spin" /> : 'Remove'}
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirm(p.id)} aria-label="Remove passkey" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 text-white/60"><Trash2 size={15} /></button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      )}

      <button onClick={add} disabled={busy !== null || list === null}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 text-sm font-bold text-white disabled:opacity-40">
        {busy === 'add' ? <Loader2 size={16} className="animate-spin" /> : <><Plus size={16} /> Add a passkey</>}
      </button>
    </div>
  );
};

export default PasskeySettings;
