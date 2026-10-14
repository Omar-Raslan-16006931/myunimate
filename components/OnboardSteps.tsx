import React from 'react';
import { Check } from 'lucide-react';

export const ONBOARD_STEPS = ['Account', 'Portal', 'Classes', 'Alerts', 'Test'];

/** Row of all setup steps. `current` is the 0-based active step; earlier ones show a tick. */
const OnboardSteps: React.FC<{ current: number }> = ({ current }) => (
  <div className="flex w-full items-start" role="list" aria-label="Setup steps">
    {ONBOARD_STEPS.map((label, i) => {
      const done = i < current;
      const active = i === current;
      return (
        <React.Fragment key={label}>
          {i > 0 && (
            <div className="mt-[13px] h-[2px] flex-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-teal-500 transition-all duration-500" style={{ width: i <= current ? '100%' : '0%' }} />
            </div>
          )}
          <div role="listitem" className="flex w-7 shrink-0 flex-col items-center gap-1.5">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-extrabold transition-colors duration-300 ${
                done ? 'bg-teal-500 text-black' : active ? 'border-2 border-teal-400 text-teal-300' : 'border border-white/15 text-white/30'
              }`}
            >
              {done ? <Check size={14} strokeWidth={3} /> : i + 1}
            </div>
            <span className={`whitespace-nowrap text-[10px] font-bold ${active ? 'text-white' : done ? 'text-white/50' : 'text-white/25'}`}>{label}</span>
          </div>
        </React.Fragment>
      );
    })}
  </div>
);

export default OnboardSteps;
