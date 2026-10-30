import React, { useEffect, useState } from 'react';

/** true only after `ms` of `on`, so quick loads never flash a placeholder */
export const useAfter = (on: boolean, ms = 300) => {
  const [late, setLate] = useState(false);
  useEffect(() => {
    if (!on) { setLate(false); return; }
    const t = window.setTimeout(() => setLate(true), ms);
    return () => window.clearTimeout(t);
  }, [on, ms]);
  return late;
};

const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--line)' };
const WIDTHS = ['72%', '58%', '80%', '64%', '50%', '68%'];

/**
 * Gray blocks in the shape of the app's list cards (same radius, padding and line heights as
 * the real rows), shown only if loading takes longer than 300ms.
 */
export const SkeletonList: React.FC<{
  rows?: number;
  /** 'table' = one line + value on the right (portal), 'two-line' = title + small line (projects, files) */
  kind?: 'table' | 'two-line';
  /** a search field / picker block above the list */
  field?: boolean;
  /** small section label above the card */
  label?: boolean;
}> = ({ rows = 5, kind = 'two-line', field = false, label = false }) => {
  const show = useAfter(true, 300);
  if (!show) return <div aria-busy="true" />;
  return (
    <div className="skel-in flex flex-col gap-3" aria-busy="true" aria-label="Loading">
      {field && <div className="skel h-11 w-full" style={{ borderRadius: 16 }} />}
      {label && <div className="skel h-[11px] w-16" />}
      <section className="overflow-hidden rounded-[18px]" style={card}>
        {kind === 'table' && (
          <div className="flex items-center justify-between px-3.5 py-2.5" style={{ borderBottom: '1px solid var(--line)' }}>
            <span className="skel h-[11px] w-24" />
            <span className="skel h-[11px] w-6" />
          </div>
        )}
        {WIDTHS.slice(0, rows).map((w, i) =>
          kind === 'table' ? (
            <div key={i} className="flex items-center gap-3 px-3.5 py-2" style={i % 2 ? { background: 'var(--sheet-field)' } : undefined}>
              <div className="min-w-0 flex-1 py-[3px]"><div className="skel h-[15px]" style={{ width: w }} /></div>
              <div className="skel h-[15px] w-10 shrink-0" />
            </div>
          ) : (
            <div key={i} className="px-3.5 py-2.5" style={i ? { borderTop: '1px solid var(--line)' } : undefined}>
              <div className="skel h-[17px]" style={{ width: w }} />
              <div className="skel mt-1.5 h-[11px]" style={{ width: `calc(${w} - 22%)` }} />
            </div>
          ),
        )}
      </section>
    </div>
  );
};
