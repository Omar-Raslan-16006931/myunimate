
import React, { useState, useEffect } from 'react';
import { X, ArrowRight, DollarSign } from 'lucide-react';

interface BannerProps {
  show: boolean;
  title: string;
  action: {
    label: string;
    onClick: () => void;
  };
  onHide: () => void;
}

export const Banner: React.FC<BannerProps> = ({ show, action, onHide }) => {
  const [isVisible, setIsVisible] = useState(show);

  useEffect(() => {
    if (show) setIsVisible(true);
  }, [show]);

  const isHidden = !show;

  return (
    <div 
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[2000] w-auto max-w-[95vw] transition-all duration-700 cubic-bezier(0.19, 1, 0.22, 1) ${
        isHidden ? 'translate-y-[150%] opacity-0 scale-90' : 'translate-y-0 opacity-100 scale-100'
      }`}
    >
      <div className="relative group flex items-center gap-3 bg-[#0a0a0f]/80 backdrop-blur-xl border border-white/20 shadow-[0_0_25px_-5px_rgba(255,255,255,0.2)] rounded-full p-1.5 pr-3 ring-1 ring-white/5 overflow-hidden">
        
        {/* Subtle Shine Overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />

        {/* Green Icon Circle */}
        <div className="w-10 h-10 rounded-full bg-[#10b981] flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.3)] relative z-10">
            <DollarSign className="text-white" size={20} strokeWidth={3} />
        </div>

        {/* Text Content */}
        <div className="flex flex-col relative z-10 mr-2">
            <span className="text-xs font-bold text-white leading-tight">Refer & Earn Cash</span>
            <span className="text-[10px] text-white/50 font-medium leading-tight whitespace-nowrap">Create your code. Get 20%.</span>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-white/10 mx-1 hidden sm:block relative z-10"></div>

        {/* Action Button */}
        <button 
            onClick={action.onClick}
            className="flex items-center gap-1.5 bg-white hover:bg-gray-200 text-black px-4 py-2 rounded-full text-[11px] font-bold transition-all active:scale-95 relative z-10 shadow-lg whitespace-nowrap"
        >
            {action.label} <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
        </button>

        {/* Close Button */}
        <button 
            onClick={onHide} 
            className="w-6 h-6 flex items-center justify-center rounded-full text-white/30 hover:text-white hover:bg-white/10 transition-colors relative z-10 ml-1 shrink-0"
        >
            <X size={14} />
        </button>
      </div>
    </div>
  );
};
