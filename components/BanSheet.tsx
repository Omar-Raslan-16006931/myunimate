import React, { useEffect, useState } from 'react';
import { Ban, Loader2 } from 'lucide-react';
import Sheet from './Sheet';
import { BAN_OPTIONS, BanDuration, MAX_REASON, MIN_REASON } from '../services/admin';

/** Pick how long and write why. The person sees the reason on their suspended screen. */
const BanSheet: React.FC<{
  open: boolean; username: string; busy?: boolean;
  onClose: () => void; onConfirm: (d: BanDuration, reason: string) => void;
}> = ({ open, username, busy, onClose, onConfirm }) => {
  const [d, setD] = useState<BanDuration>('1w');
  const [reason, setReason] = useState('');
  useEffect(() => { if (open) { setD('1w'); setReason(''); } }, [open]);

  const ok = reason.trim().length >= MIN_REASON;
  const perm = d === 'perm';

  return (
    <Sheet open={open} onClose={() => { if (!busy) onClose(); }}>
      <div className="px-5 pb-6 pt-1">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: 'var(--surface-2)', color: 'var(--danger)' }}><Ban size={24} /></div>
          <div className="text-[20px] font-extrabold">Suspend {username || 'user'}?</div>
          <p className="mt-1 text-[14px]" style={{ color: 'var(--text-muted)' }}>They'll be locked out and shown your reason.</p>
        </div>

        <div className="mt-5 text-[11px] font-extrabold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>How long</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {BAN_OPTIONS.map(o => (
            <button key={o.key} onClick={() => setD(o.key)} type="button"
              className="rounded-full border-0 px-4 py-2 text-[13px] font-bold transition-colors"
              style={d === o.key
                ? { background: o.key === 'perm' ? 'var(--danger)' : 'var(--cta-bg)', color: o.key === 'perm' ? '#fff' : 'var(--cta-ink)' }
                : { background: 'var(--surface-2)', color: 'var(--text-primary)' }}>
              {o.label}
            </button>
          ))}
        </div>

        <div className="mt-5 flex items-baseline justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Reason</span>
          <span className="text-[11px] font-semibold" style={{ color: reason.length > MAX_REASON - 40 ? 'var(--danger)' : 'var(--text-muted)' }}>{reason.length}/{MAX_REASON}</span>
        </div>
        <textarea value={reason} onChange={e => setReason(e.target.value.slice(0, MAX_REASON))} rows={3} maxLength={MAX_REASON}
          placeholder="e.g. Spamming support tickets"
          className="mt-2 w-full resize-none rounded-2xl p-3.5 text-[15px] outline-none"
          style={{ background: 'var(--sheet-field)', border: '1px solid var(--line)', color: 'var(--text-primary)' }} />

        <button onClick={() => ok && onConfirm(d, reason)} disabled={!ok || busy}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-0 py-3.5 text-[16px] font-extrabold text-white disabled:opacity-40" style={{ background: 'var(--danger)' }}>
          {busy ? <Loader2 size={18} className="animate-spin" /> : perm ? 'Ban forever' : 'Suspend'}
        </button>
        <button onClick={onClose} disabled={busy}
          className="mt-2 w-full rounded-2xl border-0 py-3.5 text-[16px] font-bold disabled:opacity-40" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}>Cancel</button>
      </div>
    </Sheet>
  );
};

export default BanSheet;
