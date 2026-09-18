import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useInView,
  useScroll,
  AnimatePresence,
  type MotionValue,
} from 'framer-motion';

/* ============================================================
   Reusable motion primitives shared by the landing page and app.
   Keep these dependency-light and theme-agnostic.
   ============================================================ */

const EASE = [0.16, 1, 0.3, 1] as const;

// --- Scroll reveal ---------------------------------------------------------
export const Reveal = ({
  children,
  delay = 0,
  y = 40,
  x = 0,
  once = true,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  x?: number;
  once?: boolean;
  className?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y, x, filter: 'blur(6px)' }}
      animate={inView ? { opacity: 1, y: 0, x: 0, filter: 'blur(0px)' } : {}}
      transition={{ duration: 0.8, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
};

// --- Stagger container + item ----------------------------------------------
export const Stagger = ({
  children,
  className = '',
  gap = 0.08,
  once = true,
}: {
  children: React.ReactNode;
  className?: string;
  gap?: number;
  once?: boolean;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once, margin: '-50px' });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={inView ? 'show' : 'hidden'}
      variants={{ show: { transition: { staggerChildren: gap } } }}
    >
      {children}
    </motion.div>
  );
};

export const StaggerItem = ({ children, className = '', y = 24 }: { children: React.ReactNode; className?: string; y?: number }) => (
  <motion.div
    className={className}
    variants={{
      hidden: { opacity: 0, y, filter: 'blur(4px)' },
      show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.6, ease: EASE } },
    }}
  >
    {children}
  </motion.div>
);

// --- Animated number counter -----------------------------------------------
export const AnimatedCounter = ({
  value,
  suffix = '',
  duration = 1800,
  className = '',
}: {
  value: number;
  suffix?: string;
  duration?: number;
  className?: string;
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.floor(eased * value));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setCount(value);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration]);

  return (
    <span ref={ref} className={className}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
};

// --- Rotating words (kinetic typography) -----------------------------------
export const WordRotate = ({
  words,
  interval = 2200,
  className = '',
}: {
  words: string[];
  interval?: number;
  className?: string;
}) => {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((p) => (p + 1) % words.length), interval);
    return () => clearInterval(id);
  }, [words.length, interval]);

  return (
    <span className={`relative inline-grid ${className}`}>
      <AnimatePresence mode="popLayout">
        <motion.span
          key={i}
          className="col-start-1 row-start-1"
          initial={{ y: '100%', opacity: 0, filter: 'blur(8px)' }}
          animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
          exit={{ y: '-100%', opacity: 0, filter: 'blur(8px)' }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          {words[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
};

// --- Gradient animated text -------------------------------------------------
export const GradientText = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <span
    className={`bg-clip-text text-transparent ${className}`}
    style={{
      backgroundImage:
        'linear-gradient(110deg, #a78bfa, #f0abfc, #818cf8, #a78bfa)',
      backgroundSize: '200% auto',
      animation: 'fx-gradient 5s linear infinite',
    }}
  >
    {children}
  </span>
);

// --- 3D tilt card with cursor glow -----------------------------------------
export const TiltCard = ({
  children,
  className = '',
  intensity = 12,
  glow = true,
}: {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
  glow?: boolean;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const xs = useSpring(x, { stiffness: 150, damping: 18 });
  const ys = useSpring(y, { stiffness: 150, damping: 18 });
  const rotateX = useTransform(ys, [-0.5, 0.5], [intensity, -intensity]);
  const rotateY = useTransform(xs, [-0.5, 0.5], [-intensity, intensity]);
  const gx = useTransform(xs, [-0.5, 0.5], [0, 100]);
  const gy = useTransform(ys, [-0.5, 0.5], [0, 100]);
  const glowBg = useTransform(
    [gx, gy] as [MotionValue<number>, MotionValue<number>],
    ([a, b]: number[]) => `radial-gradient(circle at ${a}% ${b}%, rgba(167,139,250,0.22), transparent 60%)`
  );

  const onMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      x.set((e.clientX - r.left) / r.width - 0.5);
      y.set((e.clientY - r.top) / r.height - 0.5);
    },
    [x, y]
  );
  const onLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  return (
    <motion.div
      ref={ref}
      className={`relative ${className}`}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {glow && <motion.div className="absolute inset-0 rounded-[inherit] pointer-events-none z-0" style={{ background: glowBg }} />}
      <div className="relative z-10" style={{ transform: 'translateZ(40px)' }}>
        {children}
      </div>
    </motion.div>
  );
};

// --- Magnetic button (cursor attraction) -----------------------------------
export const Magnetic = ({
  children,
  className = '',
  strength = 0.4,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  strength?: number;
  onClick?: () => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const xs = useSpring(x, { stiffness: 200, damping: 15 });
  const ys = useSpring(y, { stiffness: 200, damping: 15 });

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      className={`inline-block ${className}`}
      style={{ x: xs, y: ys }}
      onMouseMove={onMove}
      onMouseLeave={reset}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
};

// --- Cursor spotlight (follows mouse over a container) ----------------------
export const Spotlight = ({ className = '', color = 'rgba(139,92,246,0.12)' }: { className?: string; color?: string }) => {
  const x = useMotionValue(-400);
  const y = useMotionValue(-400);
  const xs = useSpring(x, { stiffness: 120, damping: 25 });
  const ys = useSpring(y, { stiffness: 120, damping: 25 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [x, y]);

  const bg = useTransform([xs, ys] as [MotionValue<number>, MotionValue<number>], ([a, b]: number[]) =>
    `radial-gradient(600px circle at ${a}px ${b}px, ${color}, transparent 70%)`
  );

  return <motion.div className={`pointer-events-none fixed inset-0 z-30 ${className}`} style={{ background: bg }} />;
};

// --- Aurora animated background --------------------------------------------
export const Aurora = ({ className = '' }: { className?: string }) => (
  <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
    <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.04)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
    {[
      { c: '-top-40 -left-32 w-[560px] h-[560px]', col: 'rgba(139,92,246,0.25)', a: { x: [0, 90, 0], y: [0, 60, 0], scale: [1, 1.15, 1] }, d: 19 },
      { c: 'top-1/4 -right-32 w-[480px] h-[480px]', col: 'rgba(217,70,239,0.16)', a: { x: [0, -80, 0], y: [0, -50, 0], scale: [1, 1.1, 1] }, d: 23 },
      { c: '-bottom-40 left-1/4 w-[520px] h-[520px]', col: 'rgba(79,70,229,0.22)', a: { x: [0, 60, 0], y: [0, 45, 0], scale: [1, 1.18, 1] }, d: 21 },
      { c: 'top-1/2 left-1/3 w-[340px] h-[340px]', col: 'rgba(56,189,248,0.12)', a: { x: [0, -40, 0], y: [0, -70, 0], scale: [1, 1.2, 1] }, d: 17 },
    ].map((o, i) => (
      <motion.div
        key={i}
        className={`absolute ${o.c} rounded-full`}
        style={{ background: `radial-gradient(circle, ${o.col} 0%, transparent 70%)`, filter: 'blur(70px)' }}
        animate={o.a}
        transition={{ duration: o.d, repeat: Infinity, ease: 'easeInOut' }}
      />
    ))}
  </div>
);

// --- Marquee ----------------------------------------------------------------
export const Marquee = ({
  items,
  speed = 32,
  className = '',
}: {
  items: string[];
  speed?: number;
  className?: string;
}) => (
  <div className={`relative overflow-hidden ${className}`}>
    <div className="absolute left-0 top-0 bottom-0 w-16 md:w-28 bg-gradient-to-r from-[#09060f] to-transparent z-10" />
    <div className="absolute right-0 top-0 bottom-0 w-16 md:w-28 bg-gradient-to-l from-[#09060f] to-transparent z-10" />
    <motion.div
      className="flex gap-8 whitespace-nowrap"
      animate={{ x: ['0%', '-50%'] }}
      transition={{ duration: speed, repeat: Infinity, ease: 'linear' }}
    >
      {[...items, ...items].map((it, i) => (
        <span key={i} className="text-slate-400 text-sm font-medium flex items-center gap-3">
          {it}
          <span className="text-violet-500/40">✦</span>
        </span>
      ))}
    </motion.div>
  </div>
);

// --- Scroll progress bar ----------------------------------------------------
export const ScrollProgress = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[3px] z-[60] origin-left bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500"
      style={{ scaleX }}
    />
  );
};

// Shared rotating-title helper used in hero
export function useRotatingIndex(length: number, interval = 2000) {
  const [i, setI] = useState(0);
  const arr = useMemo(() => Array.from({ length }), [length]);
  useEffect(() => {
    const id = setInterval(() => setI((p) => (p + 1) % length), interval);
    return () => clearInterval(id);
  }, [length, interval]);
  return [i, arr] as const;
}
