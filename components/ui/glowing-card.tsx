
import React, { useRef, useEffect } from 'react';

interface GlowingCardProps {
  children: React.ReactNode;
  className?: string;
}

export const GlowingCard: React.FC<GlowingCardProps> = ({ children, className = "" }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const update = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Calculate angle for conic gradient rotation
      const center = { x: rect.width / 2, y: rect.height / 2 };
      const angle = Math.atan2(y - center.y, x - center.x) * 180 / Math.PI;
      
      // Proximity Calculation for "Neighboring" effect
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distance = Math.hypot(e.clientX - centerX, e.clientY - centerY);
      
      // Activation threshold (range of the glow)
      const threshold = 600; 
      
      let intensity = 1 - (distance / threshold);
      intensity = Math.max(0, intensity);
      
      // Cubic falloff: Makes the "tail" of the glow much weaker for neighbors,
      // while keeping the active card bright.
      intensity = Math.pow(intensity, 3);

      container.style.setProperty('--x', `${x}px`);
      container.style.setProperty('--y', `${y}px`);
      container.style.setProperty('--start', `${angle + 90}deg`);
      container.style.setProperty('--active', intensity.toFixed(3));
    };

    // Listen on window to track mouse even when outside the card
    window.addEventListener('mousemove', update);
    
    return () => {
        window.removeEventListener('mousemove', update);
    }
  }, []);

  return (
    <div 
        ref={containerRef} 
        className={`relative group ${className}`}
        style={{
            '--active': 0,
            '--start': '0deg',
            '--x': '0px',
            '--y': '0px',
        } as React.CSSProperties}
    >
        {/* Rainbow Glow Border - Tighter and less blurred */}
        <div 
            className="absolute inset-[-2px] rounded-[inherit] overflow-hidden pointer-events-none transition-opacity duration-300 ease-out z-0"
            style={{
                opacity: 'var(--active)',
                padding: '2px',
                background: `
                    conic-gradient(
                        from var(--start),
                        transparent 0deg,
                        #dd7bbb 60deg,
                        #d79f1e 120deg,
                        #5a922c 180deg,
                        #4c7894 240deg,
                        #dd7bbb 300deg,
                        transparent 360deg
                    )
                `,
                mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                maskComposite: 'exclude',
                WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                WebkitMaskComposite: 'xor',
                filter: 'blur(3px)', 
            }}
        />

        {/* Ambient Inner Glow - Subtler */}
        <div 
            className="absolute inset-0 rounded-[inherit] pointer-events-none transition-opacity duration-300 ease-out z-[1]"
            style={{
                opacity: 'calc(var(--active) * 0.1)',
                background: `
                    radial-gradient(
                        circle at var(--x) var(--y),
                        rgba(255, 255, 255, 0.2) 0%,
                        transparent 60%
                    )
                `
            }}
        />

        {/* Blur Behind - Smaller and weaker to avoid hitting padding borders */}
        <div 
            className="absolute inset-[-10px] rounded-[inherit] transition-opacity duration-300 ease-out pointer-events-none z-[-1]"
            style={{
                opacity: 'calc(var(--active) * 0.2)',
                background: `
                    conic-gradient(
                        from var(--start),
                        transparent 0deg,
                        #dd7bbb 60deg,
                        #d79f1e 120deg,
                        #5a922c 180deg,
                        #4c7894 240deg,
                        transparent 300deg
                    )
                `,
                filter: 'blur(15px)', 
            }}
        />

        {/* Content Content */}
        <div className="relative z-10 h-full rounded-[inherit]">
            {children}
        </div>
    </div>
  );
}
