import React, { useEffect, useState } from 'react';
import { Fingerprint, AlarmClock, CircleUser, Star } from 'lucide-react';
import Sheet from './Sheet';
import { WHATS_NEW, WhatsNewItem } from '../lib/whatsNew';

const SEEN_KEY = 'whats_new_seen_v1';

const ICONS: Record<WhatsNewItem['icon'], { Icon: React.ElementType; tint: string }> = {
  passkey: { Icon: Fingerprint, tint: 'bg-teal-500/20 text-teal-300' },
  alarm: { Icon: AlarmClock, tint: 'bg-violet-500/20 text-violet-300' },
  portal: { Icon: CircleUser, tint: 'bg-sky-500/20 text-sky-300' },
  sparkle: { Icon: Star, tint: 'bg-amber-500/20 text-amber-300' },
};

const seenId = (): string | null => {
  try { return localStorage.getItem(SEEN_KEY); } catch { return null; }
};

/** Call when a brand-new user finishes setup: they have nothing to catch up on. */
export const markWhatsNewSeen = () => {
  try { localStorage.setItem(SEEN_KEY, WHATS_NEW.id); } catch { /* ignore */ }
};

/** A short sheet listing what changed, the first time someone opens a new version. */
const WhatsNew: React.FC<{ ready: boolean; onOpenChange?: (open: boolean) => void }> = ({ ready, onOpenChange }) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!ready || seenId() === WHATS_NEW.id) return;
    const t = setTimeout(() => setOpen(true), 700);
    return () => clearTimeout(t);
  }, [ready]);

  useEffect(() => { onOpenChange?.(open); }, [open, onOpenChange]);

  const close = () => { setOpen(false); markWhatsNewSeen(); };

  return (
    <Sheet open={open} onClose={close}>
      <div className="px-5 pb-6 pt-1">
        <div className="text-center">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>New update</div>
          <div className="mt-1 text-[22px] font-extrabold">{WHATS_NEW.title}</div>
        </div>
        <div className="mt-5 grid gap-3.5">
          {WHATS_NEW.items.map(it => {
            const { Icon, tint } = ICONS[it.icon] ?? ICONS.sparkle;
            return (
              <div key={it.title} className="flex items-start gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] ${tint}`}><Icon size={19} /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-bold">{it.title}</div>
                  <div className="mt-0.5 text-[13px] leading-snug" style={{ color: 'var(--text-muted)' }}>{it.text}</div>
                </div>
              </div>
            );
          })}
        </div>
        <button onClick={close}
          className="mt-6 flex w-full items-center justify-center rounded-2xl border-0 py-3.5 text-[16px] font-extrabold"
          style={{ background: 'var(--cta-bg)', color: 'var(--cta-ink)' }}>
          Got it
        </button>
      </div>
    </Sheet>
  );
};

export default WhatsNew;
