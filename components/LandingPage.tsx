import React, { useEffect, useRef, useState } from 'react';
import {
  motion, useScroll, useTransform, useSpring, AnimatePresence, useReducedMotion,
  useInView, animate,
} from 'framer-motion';
import {
  Check, ArrowRight, GraduationCap, Calendar, Calculator, CheckSquare, Dumbbell,
  Folder, Brain, Sparkles, MapPin, Clock, Flame, TrendingUp, LayoutGrid,
  Settings, Apple, Pencil, X,
} from 'lucide-react';

/* ════════════════════════════════════════════════════════════════════
   UniMate — "Paper & Highlighter" design system
   Paper #FAFAF6 · Ink #1B2032 · Highlighters: yellow / pink / green / blue
   Display: Bricolage Grotesque · Body: Instrument Sans · Utility: Space Mono
   ════════════════════════════════════════════════════════════════════ */

interface LandingPageProps {
  onGetStarted: () => void;
}

const EASE = [0.22, 1, 0.36, 1] as const;

const INK = '#1A1730';
const PAPER = '#C7B2DB';
const HL = {
  yellow: '#F6DF63',
  pink: '#eea8f2',
  green: '#8CE3B7',
  blue: '#9ECFFF',
  orange: '#F4BE8A',
  red: '#E56A5A',
};

/* ---------------------------------------------------------------- Global styles */
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=Space+Mono:wght@400;700&display=swap');

    .um-display { font-family: 'Bricolage Grotesque', 'Inter', sans-serif; }
    .um-body    { font-family: 'Instrument Sans', 'Inter', sans-serif; }
    .um-mono    { font-family: 'Space Mono', monospace; }

    .um-paper-grid {
      background-color: ${PAPER};
      background-image:
        linear-gradient(rgba(27,32,50,0.045) 1px, transparent 1px),
        linear-gradient(90deg, rgba(27,32,50,0.045) 1px, transparent 1px);
      background-size: 36px 36px;
    }

    .um-ruled {
      background-image: repeating-linear-gradient(
        ${PAPER} 0px, ${PAPER} 35px, rgba(27,32,50,0.10) 35px, rgba(27,32,50,0.10) 36px
      );
    }

    @keyframes um-marquee {
      from { transform: translateX(0); }
      to   { transform: translateX(-50%); }
    }
    .um-marquee-track {
      animation: um-marquee 32s linear infinite;
      will-change: transform;
    }
    .um-marquee:hover .um-marquee-track { animation-play-state: paused; }

    @media (prefers-reduced-motion: reduce) {
      .um-marquee-track { animation: none; }
    }

    .um-focus:focus-visible {
      outline: 3px solid ${INK};
      outline-offset: 3px;
      border-radius: 6px;
    }

    ::selection { background: ${HL.yellow}; color: ${INK}; }
  `}</style>
);

/* ---------------------------------------------------------------- Primitives */

/** Animated highlighter swipe behind text */
const Mark = ({
  children, color = HL.yellow, delay = 0,
}: { children: React.ReactNode; color?: string; delay?: number }) => {
  const reduce = useReducedMotion();
  return (
    <span className="relative inline-block whitespace-nowrap px-[0.08em]">
      <motion.span
        aria-hidden
        className="absolute -inset-x-[0.12em] top-[0.14em] bottom-[0.02em] -z-[1] origin-left"
        style={{
          background: color,
          borderRadius: '0.25em 0.6em 0.3em 0.5em / 0.6em 0.3em 0.55em 0.3em',
          transform: 'skewX(-6deg)',
        }}
        initial={{ scaleX: reduce ? 1 : 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ delay, duration: 0.55, ease: [0.65, 0, 0.35, 1] }}
      />
      <span className="relative">{children}</span>
    </span>
  );
};

/** Hand-drawn red-pen circle around content (SVG draw-on) */
const PenCircle = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
  <span className="relative inline-block px-2">
    <svg
      className="absolute -inset-x-1 -inset-y-2 w-[calc(100%+0.5rem)] h-[calc(100%+1rem)] pointer-events-none"
      viewBox="0 0 120 60" fill="none" preserveAspectRatio="none" aria-hidden
    >
      <motion.path
        d="M 12 30 C 10 12, 48 5, 72 7 C 102 9, 116 18, 113 32 C 110 48, 78 56, 50 54 C 24 52, 8 44, 11 28"
        stroke={HL.red} strokeWidth="3" strokeLinecap="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ delay, duration: 0.9, ease: 'easeInOut' }}
      />
    </svg>
    {children}
  </span>
);

/** Scroll-triggered fade-up */
const Reveal = ({
  children, delay = 0, className = '',
}: { children: React.ReactNode; delay?: number; className?: string }) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 26 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-70px' }}
    transition={{ delay, duration: 0.7, ease: EASE }}
  >
    {children}
  </motion.div>
);

/** Counter that ticks up when in view */
const Counter = ({ value, suffix = '' }: { value: number; suffix?: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? value : 0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) { setDisplay(value); return; }
    const controls = animate(0, value, {
      duration: 1.4, ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, value, reduce]);

  return <span ref={ref}>{display.toLocaleString()}{suffix}</span>;
};

/** Sticky-note card with masking tape */
const Sticky = ({
  color, rotate = 0, className = '', children, tape = true,
}: { color: string; rotate?: number; className?: string; children: React.ReactNode; tape?: boolean }) => (
  <motion.div
    className={`relative ${className}`}
    style={{ rotate }}
    whileHover={{ rotate: 0, y: -4, transition: { duration: 0.25 } }}
  >
    {tape && (
      <div
        aria-hidden
        className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-5 rotate-[-3deg] z-10"
        style={{ background: 'rgba(255,233,77,0.6)', boxShadow: '0 1px 2px rgba(27,32,50,0.12)' }}
      />
    )}
    <div
      className="rounded-lg h-full"
      style={{
        background: color,
        border: `1.5px solid ${INK}`,
        boxShadow: `4px 5px 0 ${INK}`,
      }}
    >
      {children}
    </div>
  </motion.div>
);

/** Primary ink button */
const InkButton = ({
  onClick, children, className = '', large = false,
}: { onClick?: () => void; children: React.ReactNode; className?: string; large?: boolean }) => (
  <motion.button
    onClick={onClick}
    className={`um-focus um-display relative inline-flex items-center justify-center gap-2 font-bold rounded-xl text-white ${large ? 'h-14 px-9 text-lg' : 'h-12 px-6 text-sm'} ${className}`}
    style={{ background: INK, border: `1.5px solid ${INK}`, boxShadow: `4px 4px 0 ${HL.yellow}` }}
    whileHover={{ x: -2, y: -2, boxShadow: `7px 7px 0 ${HL.yellow}` }}
    whileTap={{ x: 2, y: 2, boxShadow: `1px 1px 0 ${HL.yellow}` }}
    transition={{ duration: 0.15 }}
  >
    {children}
  </motion.button>
);

/* ---------------------------------------------------------------- Scroll progress (highlighter line) */
const ScrollProgress = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 24 });
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[5px] z-[60] origin-left"
      style={{ scaleX, background: HL.yellow, borderBottom: `1.5px solid ${INK}` }}
    />
  );
};

/* ---------------------------------------------------------------- Nav */
const Nav = ({ onGetStarted }: { onGetStarted: () => void }) => {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => scrollY.on('change', (v) => setScrolled(v > 24)), [scrollY]);

  return (
    <motion.nav
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-10 h-16 transition-shadow duration-300 ${scrolled ? 'shadow-[0_2px_0_rgba(27,32,50,1)]' : ''}`}
      style={{ background: scrolled ? PAPER : 'transparent', borderBottom: scrolled ? `1.5px solid ${INK}` : '1.5px solid transparent' }}
      initial={{ y: -64 }} animate={{ y: 0 }} transition={{ duration: 0.6, ease: EASE }}
    >
      <button
        className="um-focus flex items-center gap-2.5 cursor-pointer"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Back to top"
      >
        <motion.div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: INK, boxShadow: `2.5px 2.5px 0 ${HL.yellow}` }}
          whileHover={{ rotate: -8 }}
        >
          <GraduationCap size={18} className="text-white" />
        </motion.div>
        <span className="um-display font-extrabold text-xl tracking-tight" style={{ color: INK }}>UniMate</span>
      </button>

      <div className="flex items-center gap-3">
        <span className="um-mono hidden md:block text-[11px] tracking-wider" style={{ color: `${INK}99` }}>
          free · forever · no ads
        </span>
        <InkButton onClick={onGetStarted}>Sign in</InkButton>
      </div>
    </motion.nav>
  );
};

/* ---------------------------------------------------------------- Hero */
const HERO_STICKIES: {
  pos: string; rotate: number; color: string; icon: React.ElementType; title: string; sub: string; delay: number;
}[] = [
  { pos: 'top-[21%] left-[5%] lg:left-[8%]', rotate: -5, color: HL.blue, icon: Calendar, title: 'Database Systems', sub: '10:15 · Room M1.205', delay: 0.9 },
  { pos: 'top-[24%] right-[5%] lg:right-[8%]', rotate: 4, color: HL.green, icon: Dumbbell, title: 'Push Day · 6 lifts', sub: 'New bench PR 🔥', delay: 1.05 },
  { pos: 'bottom-[26%] left-[7%] lg:left-[11%]', rotate: 3, color: HL.pink, icon: Calculator, title: 'GPA 3.92', sub: 'on track ▲', delay: 1.2 },
  { pos: 'bottom-[23%] right-[7%] lg:right-[10%]', rotate: -4, color: HL.yellow, icon: CheckSquare, title: '3 tasks today', sub: '2 done · 1 left', delay: 1.35 },
];

const TODAY_BLOCKS = [
  { label: 'Database Systems', time: '10:15', tag: 'LECTURE', color: HL.blue, w: 'flex-[3]' },
  { label: 'OS Quiz 1', time: '13:00', tag: 'QUIZ', color: HL.pink, w: 'flex-[2]' },
  { label: 'Push Day', time: '17:00', tag: 'GYM', color: HL.green, w: 'flex-[2.5]' },
];

const Hero = ({ onGetStarted }: { onGetStarted: () => void }) => {
  const { scrollY } = useScroll();
  const fade = useTransform(scrollY, [0, 420], [1, 0]);
  const drift = useTransform(scrollY, [0, 420], [0, 60]);
  const reduce = useReducedMotion();

  return (
    <section className="relative min-h-[100svh] flex flex-col items-center justify-center pt-28 pb-16 px-5 overflow-hidden">
      {/* floating sticky notes */}
      {HERO_STICKIES.map((s) => (
        <motion.div
          key={s.title}
          className={`absolute hidden md:block ${s.pos} z-10`}
          initial={{ opacity: 0, y: 24, rotate: s.rotate * 2 }}
          animate={{ opacity: 1, y: 0, rotate: s.rotate }}
          transition={{ delay: s.delay, duration: 0.7, ease: EASE }}
        >
          <motion.div
            animate={reduce ? {} : { y: [0, -8, 0] }}
            transition={{ duration: 5 + s.delay, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Sticky color={s.color} rotate={0} tape>
              <div className="px-3.5 py-3 flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0" style={{ background: INK }}>
                  <s.icon size={16} className="text-white" />
                </div>
                <div>
                  <div className="um-display text-[13px] font-bold leading-tight" style={{ color: INK }}>{s.title}</div>
                  <div className="um-mono text-[10px]" style={{ color: `${INK}A6` }}>{s.sub}</div>
                </div>
              </div>
            </Sticky>
          </motion.div>
        </motion.div>
      ))}

      <motion.div className="relative z-20 flex flex-col items-center text-center max-w-4xl w-full" style={{ opacity: fade, y: drift }}>
        {/* eyebrow */}
        <motion.div
          className="um-mono text-[11px] md:text-xs tracking-[0.25em] uppercase mb-7 px-4 py-2 rounded-full"
          style={{ color: INK, border: `1.5px dashed ${INK}55`, background: 'rgba(255,255,255,0.6)' }}
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}
        >
          ✏️ one free workspace for students
        </motion.div>

        {/* headline with highlighter swipes */}
        <h1 className="um-display font-extrabold tracking-tight leading-[1.02] text-[2.6rem] sm:text-6xl md:text-7xl lg:text-[5.2rem]" style={{ color: INK }}>
          <motion.span className="block" initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.7, ease: EASE }}>
            Your whole <Mark color={HL.yellow} delay={0.7}>student life,</Mark>
          </motion.span>
          <motion.span className="block mt-1" initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.7, ease: EASE }}>
            on <Mark color={HL.pink} delay={1.0}>one page.</Mark>
          </motion.span>
        </h1>

        <motion.p
          className="um-body text-base md:text-xl max-w-md md:max-w-xl mt-7 mb-9 leading-relaxed"
          style={{ color: `${INK}B3` }}
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.7, ease: EASE }}
        >
          Schedule, grades, tasks, files, and a full gym tracker — one app instead of
          five tabs. Free, forever, no ads.
        </motion.p>

        <motion.div
          className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto px-4 sm:px-0"
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.52, duration: 0.7, ease: EASE }}
        >
          <InkButton onClick={onGetStarted} large className="w-full sm:w-auto group">
            Get started free
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </InkButton>
          <button
            onClick={() => document.getElementById('preview')?.scrollIntoView({ behavior: 'smooth' })}
            className="um-focus um-display h-14 px-7 text-base font-bold rounded-xl w-full sm:w-auto inline-flex items-center justify-center gap-2 transition-colors"
            style={{ color: INK, border: `1.5px solid ${INK}`, background: 'rgba(255,255,255,0.7)' }}
          >
            <motion.span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: HL.green, border: `1px solid ${INK}` }}
              animate={reduce ? {} : { scale: [1, 1.5, 1] }}
              transition={{ duration: 1.6, repeat: Infinity }}
            />
            See it live
          </button>
        </motion.div>

        {/* signature: today strip — academics + gym in one timeline */}
        <motion.div
          className="w-full max-w-2xl mt-14"
          initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85, duration: 0.8, ease: EASE }}
        >
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="um-mono text-[10px] tracking-[0.25em] uppercase" style={{ color: `${INK}80` }}>Today · Thursday</span>
            <span className="um-mono text-[10px] tracking-[0.25em] uppercase" style={{ color: `${INK}80` }}>auto-planned ✓</span>
          </div>
          <div
            className="flex gap-2 p-2 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.75)', border: `1.5px solid ${INK}`, boxShadow: `5px 6px 0 ${INK}` }}
          >
            {TODAY_BLOCKS.map((b, i) => (
              <motion.div
                key={b.label}
                className={`${b.w} min-w-0 rounded-xl px-3 py-2.5 text-left`}
                style={{ background: b.color, border: `1.5px solid ${INK}` }}
                initial={{ opacity: 0, scaleX: 0.6 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ delay: 1.15 + i * 0.18, duration: 0.5, ease: EASE }}
              >
                <div className="um-mono text-[8px] md:text-[9px] font-bold tracking-widest" style={{ color: `${INK}99` }}>{b.tag} · {b.time}</div>
                <div className="um-display text-[11px] md:text-sm font-bold truncate" style={{ color: INK }}>{b.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="flex flex-wrap justify-center items-center gap-x-5 gap-y-2 mt-9 um-mono text-[11px]"
          style={{ color: `${INK}80` }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}
        >
          {['no credit card', 'no ads', 'always free'].map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <Check size={12} style={{ color: HL.red }} strokeWidth={3} /> {t}
            </span>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
};

/* ---------------------------------------------------------------- Marquee */
const MARQUEE_ITEMS = [
  'Smart scheduling', 'Gym tracker', 'Grade calculator', 'Task manager',
  'Material vault', 'AI timetable import', '100% free', 'No ads', 'Any device',
];
const MARQUEE_COLORS = [HL.yellow, HL.pink, HL.green, HL.blue, HL.orange];

const HighlighterMarquee = () => (
  <div
    className="um-marquee overflow-hidden py-4"
    style={{ borderTop: `1.5px solid ${INK}`, borderBottom: `1.5px solid ${INK}`, background: '#fff' }}
    aria-hidden
  >
    <div className="um-marquee-track flex w-max gap-8 px-4">
      {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
        <span key={i} className="um-display flex items-center gap-8 text-sm md:text-base font-bold whitespace-nowrap" style={{ color: INK }}>
          <span className="px-2 py-0.5 rounded" style={{ background: MARQUEE_COLORS[i % MARQUEE_COLORS.length] }}>{item}</span>
          <Pencil size={13} style={{ color: `${INK}59` }} />
        </span>
      ))}
    </div>
  </div>
);

/* ---------------------------------------------------------------- Phone preview */
const APP_BG = '#14182A';
const APP_CARD = 'rgba(255,255,255,0.05)';
const APP_BORDER = 'rgba(255,255,255,0.09)';

const PhoneHome = () => (
  <div className="flex flex-col h-full">
    <div className="flex items-start justify-between mb-3">
      <div>
        <div className="text-white text-2xl font-black leading-none um-display">9:41 AM</div>
        <div className="um-mono text-[10px] mt-1" style={{ color: HL.yellow }}>THU · JUNE 11</div>
        <div className="text-white/50 text-[10px] mt-0.5">Good morning, <span className="text-white font-bold">Omar</span></div>
      </div>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: HL.yellow }}>
        <Sparkles size={14} style={{ color: INK }} />
      </div>
    </div>

    <div className="rounded-2xl p-3 mb-3 relative overflow-hidden" style={{ background: HL.blue, color: INK }}>
      <div className="um-mono text-[8px] font-bold uppercase tracking-[0.2em] mb-1 opacity-70">Happening now</div>
      <div className="um-display font-extrabold text-base leading-tight">Database Systems</div>
      <div className="mt-2 flex items-center gap-1.5 rounded-lg px-2 py-1 w-fit" style={{ background: 'rgba(27,32,50,0.12)' }}>
        <Clock size={9} /><span className="text-[9px] font-bold">10:15 – 11:45</span>
        <MapPin size={9} className="ml-1" /><span className="text-[9px] opacity-80">M1.205</span>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-2 mb-3">
      {[
        { icon: Dumbbell, label: 'Gym', sub: 'Train & track', c: HL.green },
        { icon: Calculator, label: 'Grades', sub: 'GPA calc', c: HL.pink },
        { icon: CheckSquare, label: 'To-do', sub: '3 tasks', c: HL.yellow },
        { icon: Brain, label: 'Smart import', sub: 'AI parse', c: HL.orange },
      ].map((c) => (
        <div key={c.label} className="rounded-xl p-2.5" style={{ background: APP_CARD, border: `1px solid ${APP_BORDER}` }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2.5" style={{ background: c.c }}>
            <c.icon size={13} style={{ color: INK }} />
          </div>
          <div className="text-white font-bold text-[11px]">{c.label}</div>
          <div className="text-white/40 text-[8px]">{c.sub}</div>
        </div>
      ))}
    </div>

    <div className="um-mono text-[9px] font-bold text-white/35 uppercase tracking-[0.2em] mb-1.5">Upcoming tests</div>
    <div className="flex flex-col gap-1.5">
      {[
        { t: 'QUIZ', n: 'OS Quiz 1', d: 'Jun 11', c: HL.pink },
        { t: 'ASSIGNMENT', n: 'DB ERD Diagram', d: 'Jun 13', c: HL.green },
      ].map((x) => (
        <div key={x.n} className="flex items-center justify-between rounded-xl px-3 py-2 border-l-[3px]" style={{ background: APP_CARD, borderLeftColor: x.c }}>
          <div>
            <div className="um-mono text-[7px] font-bold uppercase tracking-wider" style={{ color: x.c }}>{x.t}</div>
            <div className="text-white text-[10px] font-bold">{x.n}</div>
          </div>
          <div className="text-white/50 text-[9px] font-bold">{x.d}</div>
        </div>
      ))}
    </div>
  </div>
);

const PhoneGym = () => (
  <div className="flex flex-col h-full">
    <div className="flex items-center justify-between mb-3">
      <div>
        <div className="text-white/40 text-[10px]">Good morning,</div>
        <div className="text-white text-xl font-black um-display">Athlete 💪</div>
      </div>
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl" style={{ background: 'rgba(255,193,120,0.15)', border: `1px solid ${HL.orange}55` }}>
        <Flame size={13} style={{ color: HL.orange }} />
        <div className="leading-none">
          <div className="text-white font-black text-xs">5</div>
          <div className="um-mono text-[6px] uppercase font-bold" style={{ color: `${HL.orange}B3` }}>streak</div>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-2 mb-3">
      {[
        { label: 'Calories', val: '1,840', sub: '660 left', pct: 74, c: HL.orange },
        { label: 'Water', val: '1.8L', sub: '72%', pct: 72, c: HL.blue },
      ].map((r) => (
        <div key={r.label} className="rounded-2xl p-3 flex flex-col items-center" style={{ background: APP_CARD, border: `1px solid ${APP_BORDER}` }}>
          <div className="relative w-16 h-16 mb-1">
            <svg className="w-16 h-16 -rotate-90">
              <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
              <circle cx="32" cy="32" r="26" fill="none" stroke={r.c} strokeWidth="6" strokeLinecap="round" strokeDasharray={163} strokeDashoffset={163 - (r.pct / 100) * 163} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white font-black text-xs">{r.val}</span>
            </div>
          </div>
          <div className="text-white/50 text-[9px] font-bold">{r.label} · {r.sub}</div>
        </div>
      ))}
    </div>

    <div className="rounded-2xl p-3 mb-3" style={{ background: APP_CARD, border: `1px solid ${APP_BORDER}` }}>
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp size={12} style={{ color: HL.green }} />
        <span className="text-white text-[11px] font-bold">Weekly volume</span>
      </div>
      <div className="flex items-end gap-1.5 h-14">
        {[40, 55, 35, 70, 60, 85, 50].map((h, i) => (
          <motion.div
            key={i} className="flex-1 rounded-t-md" style={{ background: HL.green }}
            initial={{ height: 0 }} whileInView={{ height: `${h}%` }} viewport={{ once: true }}
            transition={{ delay: i * 0.06, ease: EASE }}
          />
        ))}
      </div>
    </div>

    <div className="um-mono text-[9px] font-bold text-white/35 uppercase tracking-[0.2em] mb-1.5">Personal records</div>
    <div className="flex flex-col gap-1.5">
      {[{ n: 'Bench Press', v: '105 kg' }, { n: 'Squat', v: '140 kg' }].map((p, i) => (
        <div key={p.n} className="flex items-center gap-2.5 rounded-xl px-2.5 py-2" style={{ background: APP_CARD, border: `1px solid ${APP_BORDER}` }}>
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black" style={{ background: `${HL.yellow}26`, color: HL.yellow }}>{i + 1}</div>
          <div className="flex-1 text-white text-[11px] font-bold">{p.n}</div>
          <div className="text-[11px] font-black" style={{ color: HL.yellow }}>{p.v}</div>
        </div>
      ))}
    </div>
  </div>
);

const PhoneSchedule = () => {
  const days = ['SUN', 'MON', 'TUE'];
  const cls: Record<string, { n: string; c: string }> = {
    'SUN-0': { n: 'Database', c: HL.blue }, 'SUN-1': { n: 'Prog III', c: HL.green },
    'MON-1': { n: 'OS', c: HL.pink }, 'MON-2': { n: 'Tut', c: HL.orange },
    'TUE-0': { n: 'OS Lab', c: HL.yellow },
  };
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <span className="text-white text-xl font-black um-display">Schedule</span>
        <div className="um-mono rounded-full px-2.5 py-1 text-[9px] font-bold" style={{ background: `${HL.yellow}1F`, border: `1px solid ${HL.yellow}55`, color: HL.yellow }}>WEEKLY ▾</div>
      </div>
      <div className="grid gap-1 text-[7px]" style={{ gridTemplateColumns: '28px repeat(3,1fr)' }}>
        <div />
        {['1ST', '2ND', '3RD'].map((p) => (
          <div key={p} className="rounded px-1 py-1.5 text-center" style={{ background: APP_CARD, border: `1px solid ${APP_BORDER}` }}>
            <div className="um-mono font-bold text-white/60">{p}</div>
          </div>
        ))}
        {days.map((d) => (
          <React.Fragment key={d}>
            <div className="flex items-center justify-center">
              <span className="um-mono text-white/50 font-bold text-[8px]">{d}</span>
            </div>
            {[0, 1, 2].map((pi) => {
              const c = cls[`${d}-${pi}`];
              return (
                <div key={pi} className="rounded p-0.5 min-h-[44px]" style={{ border: `1px solid ${APP_BORDER}` }}>
                  {c && (
                    <motion.div
                      className="rounded p-1 h-full" style={{ background: c.c, color: INK }}
                      initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                      transition={{ ease: EASE }}
                    >
                      <div className="font-bold text-[7px] leading-tight">{c.n}</div>
                      <div className="mt-0.5 rounded text-[5px] px-0.5 w-fit" style={{ background: 'rgba(27,32,50,0.18)' }}>LECT</div>
                    </motion.div>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <div className="mt-3 rounded-2xl p-3" style={{ background: `${HL.yellow}14`, border: `1px solid ${HL.yellow}40` }}>
        <div className="flex items-center gap-1.5 mb-1">
          <Brain size={12} style={{ color: HL.yellow }} />
          <span className="text-white text-[11px] font-bold">Smart import</span>
        </div>
        <div className="text-white/50 text-[9px]">Snap your timetable — AI fills your whole week in seconds.</div>
      </div>
    </div>
  );
};

const PhoneMock = () => {
  const [tab, setTab] = useState<'home' | 'gym' | 'schedule'>('home');
  const tabs = [
    { id: 'home', icon: LayoutGrid },
    { id: 'gym', icon: Dumbbell },
    { id: 'schedule', icon: Calendar },
    { id: 'files', icon: Folder },
    { id: 'settings', icon: Settings },
  ] as const;

  return (
    <div className="w-full h-full relative select-none flex flex-col" style={{ background: APP_BG }}>
      <div className="h-6 flex items-center justify-between px-5 shrink-0">
        <span className="text-white/40 text-[9px] font-bold">9:41</span>
        <div className="flex gap-1 text-white/30 text-[8px]">●●●</div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -18 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="absolute inset-0 px-3 pt-1 pb-16 overflow-hidden um-body"
          >
            {tab === 'home' && <PhoneHome />}
            {tab === 'gym' && <PhoneGym />}
            {tab === 'schedule' && <PhoneSchedule />}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="absolute bottom-2 left-3 right-3">
        <div className="rounded-[20px] px-2 py-1.5 flex items-center justify-around backdrop-blur-xl" style={{ background: 'rgba(20,24,42,0.92)', border: `1px solid ${APP_BORDER}` }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => (t.id === 'home' || t.id === 'gym' || t.id === 'schedule') && setTab(t.id as 'home' | 'gym' | 'schedule')}
              className="relative w-9 h-9 rounded-xl flex items-center justify-center"
              aria-label={t.id}
            >
              {tab === t.id && (
                <motion.span
                  layoutId="phone-pill" className="absolute inset-0 rounded-xl" style={{ background: HL.yellow }}
                  transition={{ type: 'spring', stiffness: 350, damping: 26 }}
                />
              )}
              <t.icon size={15} className="relative z-10" style={{ color: tab === t.id ? INK : 'rgba(255,255,255,0.4)' }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const PhonePreview = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] });
  const rotateX = useTransform(scrollYProgress, [0, 1], [34, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.86, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [0.35, 1]);

  return (
    <section id="preview" className="py-20 md:py-28 px-4 overflow-hidden">
      <Reveal className="text-center mb-12 max-w-2xl mx-auto">
        <div className="um-mono inline-block text-[11px] tracking-[0.25em] uppercase mb-5 px-4 py-2 rounded-full" style={{ color: INK, border: `1.5px dashed ${INK}55`, background: '#fff' }}>
          📱 live preview — tap the tabs
        </div>
        <h2 className="um-display text-4xl md:text-5xl font-extrabold tracking-tight mb-4" style={{ color: INK }}>
          Your <Mark color={HL.blue}>command center</Mark>
        </h2>
        <p className="um-body text-base md:text-lg" style={{ color: `${INK}B3` }}>
          This is the real interface — including the new gym tracker. Go ahead, poke around.
        </p>
      </Reveal>

      <div ref={ref} className="flex justify-center" style={{ perspective: 1400 }}>
        <motion.div style={{ rotateX, scale, opacity }} className="relative">
          <div
            className="relative w-[300px] h-[620px] md:w-[330px] md:h-[680px] rounded-[44px] overflow-hidden"
            style={{ border: `10px solid ${INK}`, background: APP_BG, boxShadow: `14px 16px 0 ${HL.yellow}, 14px 16px 0 1.5px ${INK}` }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 rounded-b-2xl z-20" style={{ background: INK }} />
            <PhoneMock />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

/* ---------------------------------------------------------------- Features — the sticky board */
type Feature = {
  icon: React.ElementType; color: string; rotate: number; title: string; body: string;
  tag?: string; chips?: string[]; big?: boolean; wide?: boolean;
};

const FEATURES: Feature[] = [
  {
    icon: Dumbbell, color: HL.green, rotate: -1.5, big: true, tag: 'NEW',
    title: 'Full gym tracker',
    body: '135+ exercises, preset plans (PPL, 5×5, Upper/Lower), live rest timers, a routine builder, plate calculator, macro & TDEE calculator, body-weight tracking, PRs and 1RM analytics.',
    chips: ['135+ moves', 'Macro calc', 'PR tracker', 'AI food log'],
  },
  { icon: Calendar, color: HL.blue, rotate: 1.5, title: 'Smart schedule', body: 'Recurring classes, conflict detection, and an AI timetable importer.' },
  { icon: Calculator, color: HL.pink, rotate: -1, title: 'Grade calculator', body: 'Track GPA live and see exactly what you need on the final.' },
  { icon: CheckSquare, color: HL.yellow, rotate: 1, title: 'Tasks & to-do', body: 'Prioritized tasks tied to your courses and deadlines.' },
  { icon: Folder, color: HL.orange, rotate: -1.5, title: 'Material vault', body: 'PDFs, slides and links for every course, synced across devices.' },
  { icon: Brain, color: '#D7C4FF', rotate: 1, wide: true, title: 'AI assistant & smart import', body: 'Snap a photo of your timetable or ask the assistant — it builds your week and logs your meals automatically.' },
];

const FeaturesSection = () => (
  <section id="features" className="py-16 md:py-24 max-w-6xl mx-auto px-4 md:px-6">
    <Reveal className="text-center mb-14">
      <div className="um-mono inline-block text-[11px] tracking-[0.25em] uppercase mb-5 px-4 py-2 rounded-full" style={{ color: INK, border: `1.5px dashed ${INK}55`, background: '#fff' }}>
        🗂 everything in one place
      </div>
      <h2 className="um-display text-4xl md:text-5xl font-extrabold tracking-tight mb-4" style={{ color: INK }}>
        Five apps. <Mark color={HL.green}>One home.</Mark>
      </h2>
      <p className="um-body text-base md:text-lg max-w-2xl mx-auto" style={{ color: `${INK}B3` }}>
        Stop juggling tabs. UniMate fuses your academic and fitness life into a single workspace.
      </p>
    </Reveal>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-7">
      {FEATURES.map((f, i) => (
        <motion.div
          key={f.title}
          className={`${f.big ? 'md:col-span-2 md:row-span-1' : ''} ${f.wide ? 'md:col-span-2' : ''}`}
          initial={{ opacity: 0, y: 34 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ delay: (i % 3) * 0.08, duration: 0.65, ease: EASE }}
        >
          <Sticky color={f.color} rotate={f.rotate} className="h-full">
            <div className="p-6 flex flex-col h-full">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: INK }}>
                  <f.icon size={20} className="text-white" />
                </div>
                {f.tag && (
                  <span className="um-mono text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: INK, color: f.color }}>{f.tag}</span>
                )}
              </div>
              <h3 className="um-display text-xl font-extrabold mb-1.5" style={{ color: INK }}>{f.title}</h3>
              <p className="um-body text-sm leading-relaxed" style={{ color: `${INK}B8` }}>{f.body}</p>
              {f.chips && (
                <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {f.chips.map((c, j) => (
                    <div key={c} className="um-mono flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[10px] font-bold" style={{ background: 'rgba(255,255,255,0.55)', border: `1.5px solid ${INK}`, color: INK }}>
                      {[<TrendingUp size={12} key="a" />, <Flame size={12} key="b" />, <Dumbbell size={12} key="c" />, <Apple size={12} key="d" />][j]}
                      {c}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Sticky>
        </motion.div>
      ))}
    </div>
  </section>
);

/* ---------------------------------------------------------------- Stats — red pen circles */
const StatsSection = () => (
  <section className="py-14 md:py-20" style={{ borderTop: `1.5px solid ${INK}`, borderBottom: `1.5px solid ${INK}`, background: '#fff' }}>
    <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-4 px-6 text-center">
      {[
        { v: 10000, s: '+', l: 'students on board', d: 0.1 },
        { v: 5, s: '', l: 'tools in one app', d: 0.3 },
        { v: 100, s: '%', l: 'free, forever', d: 0.5 },
      ].map((x) => (
        <Reveal key={x.l} delay={x.d}>
          <div className="um-display text-4xl md:text-5xl font-extrabold" style={{ color: INK }}>
            <PenCircle delay={x.d + 0.3}><Counter value={x.v} suffix={x.s} /></PenCircle>
          </div>
          <div className="um-mono text-[11px] tracking-[0.2em] uppercase mt-3" style={{ color: `${INK}80` }}>{x.l}</div>
        </Reveal>
      ))}
    </div>
  </section>
);

/* ---------------------------------------------------------------- Compare — notebook checklist */
const COMPARE = [
  { f: 'Class schedule', us: true, n: false, g: true },
  { f: 'Gym & macro tracker', us: true, n: false, g: false },
  { f: 'Grade calculator', us: true, n: false, g: false },
  { f: 'AI timetable import', us: true, n: false, g: false },
  { f: 'Built for students', us: true, n: false, g: false },
  { f: 'Completely free, no ads', us: true, n: false, g: true },
];

const CompareSection = () => (
  <section className="py-16 md:py-24 max-w-4xl mx-auto px-4">
    <Reveal className="text-center mb-12">
      <div className="um-mono inline-block text-[11px] tracking-[0.25em] uppercase mb-5 px-4 py-2 rounded-full" style={{ color: INK, border: `1.5px dashed ${INK}55`, background: '#fff' }}>
        ✅ why UniMate
      </div>
      <h2 className="um-display text-4xl md:text-5xl font-extrabold tracking-tight mb-4" style={{ color: INK }}>
        Built <Mark color={HL.orange}>different</Mark>
      </h2>
      <p className="um-body text-base md:text-lg" style={{ color: `${INK}B3` }}>
        We didn't bolt student features on — we built around them.
      </p>
    </Reveal>

    <Reveal delay={0.15}>
      <div className="rounded-2xl overflow-hidden um-ruled" style={{ border: `1.5px solid ${INK}`, boxShadow: `6px 7px 0 ${INK}` }}>
        <div className="grid grid-cols-4 px-4 md:px-8 h-[36px] items-center" style={{ background: HL.yellow, borderBottom: `1.5px solid ${INK}` }}>
          {['Feature', 'UniMate', 'Notion', 'Google'].map((h, i) => (
            <span key={h} className={`um-mono text-[10px] md:text-xs font-bold uppercase tracking-widest ${i > 0 ? 'text-center' : ''}`} style={{ color: INK }}>{h}</span>
          ))}
        </div>
        {COMPARE.map((row, i) => (
          <motion.div
            key={row.f}
            className="grid grid-cols-4 px-4 md:px-8 h-[36px] items-center"
            initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
            transition={{ delay: i * 0.05, ease: EASE }}
          >
            <span className="um-body text-xs md:text-sm font-medium pr-2 leading-tight truncate" style={{ color: INK }}>{row.f}</span>
            {[row.us, row.n, row.g].map((v, j) => (
              <span key={j} className="flex justify-center items-center">
                {v ? (
                  <motion.span
                    initial={{ scale: 0, rotate: -20 }} whileInView={{ scale: 1, rotate: 0 }} viewport={{ once: true }}
                    transition={{ delay: 0.25 + i * 0.05, type: 'spring', stiffness: 300, damping: 16 }}
                  >
                    <Check size={18} strokeWidth={3.5} style={{ color: j === 0 ? HL.red : `${INK}66` }} />
                  </motion.span>
                ) : (
                  <X size={14} strokeWidth={2.5} style={{ color: `${INK}30` }} />
                )}
              </span>
            ))}
          </motion.div>
        ))}
      </div>
      <p className="um-mono text-[10px] text-center mt-4 tracking-widest uppercase" style={{ color: `${INK}59` }}>
        red ✓ = checked by hand. we're biased, but we're also right.
      </p>
    </Reveal>
  </section>
);

/* ---------------------------------------------------------------- CTA — the exam sheet */
const CTASection = ({ onGetStarted }: { onGetStarted: () => void }) => (
  <section className="py-20 md:py-28 px-4">
    <Reveal>
      <div className="max-w-3xl mx-auto">
        <motion.div
          className="relative bg-white rounded-2xl overflow-hidden"
          style={{ border: `1.5px solid ${INK}`, boxShadow: `8px 10px 0 ${INK}` }}
          initial={{ rotate: -1 }} whileInView={{ rotate: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease: EASE }}
        >
          {/* exam header */}
          <div className="px-6 md:px-12 pt-8 pb-5" style={{ borderBottom: `1.5px dashed ${INK}40` }}>
            <div className="flex flex-wrap items-center justify-between gap-2 um-mono text-[10px] md:text-[11px] tracking-widest uppercase" style={{ color: `${INK}99` }}>
              <span>Final exam · Semester readiness</span>
              <span>Time allowed: 30 seconds</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 um-mono text-[10px] md:text-[11px] tracking-widest uppercase mt-1.5" style={{ color: `${INK}99` }}>
              <span>Name: ______________</span>
              <span>Total marks: <PenCircle delay={0.4}><b style={{ color: INK }}>1</b></PenCircle></span>
            </div>
          </div>

          {/* the one question */}
          <div className="px-6 md:px-12 py-10 md:py-14 text-center">
            <div className="um-mono text-xs tracking-[0.25em] uppercase mb-5" style={{ color: `${INK}80` }}>Question 1 of 1</div>
            <h2 className="um-display text-3xl sm:text-5xl md:text-[3.4rem] font-extrabold tracking-tight leading-[1.05] mb-8" style={{ color: INK }}>
              Ready to <Mark color={HL.yellow}>ace</Mark> this semester?
            </h2>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <InkButton onClick={onGetStarted} large className="w-full sm:w-auto group">
                <span className="um-mono text-sm mr-1 opacity-70">(a)</span>
                Yes — start for free
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </InkButton>
              <motion.button
                onClick={onGetStarted}
                className="um-focus um-display h-14 px-8 text-base font-bold rounded-xl w-full sm:w-auto inline-flex items-center justify-center gap-2"
                style={{ color: INK, border: `1.5px solid ${INK}`, background: HL.green, boxShadow: `4px 4px 0 ${INK}` }}
                whileHover={{ x: -2, y: -2, boxShadow: `7px 7px 0 ${INK}` }}
                whileTap={{ x: 2, y: 2, boxShadow: `1px 1px 0 ${INK}` }}
              >
                <span className="um-mono text-sm opacity-70">(b)</span>
                Obviously yes
              </motion.button>
            </div>
            <p className="um-mono text-[10px] tracking-widest uppercase mt-6" style={{ color: `${INK}66` }}>
              hint: both answers are correct
            </p>

            <div className="mt-9 flex flex-wrap justify-center items-center gap-x-5 gap-y-2 um-mono text-[11px]" style={{ color: `${INK}80` }}>
              {['completely free', 'no ads or paywalls', 'works on any device'].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <Check size={12} strokeWidth={3} style={{ color: HL.red }} /> {t}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </Reveal>
  </section>
);

/* ---------------------------------------------------------------- Footer */
const Footer = () => (
  <footer className="py-12 px-6 text-center" style={{ background: INK }}>
    <motion.button
      className="um-focus inline-flex items-center gap-2.5 mb-4"
      whileHover={{ scale: 1.04 }}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
    >
      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: HL.yellow }}>
        <GraduationCap size={17} style={{ color: INK }} />
      </div>
      <span className="um-display font-extrabold text-xl text-white tracking-tight">UniMate</span>
    </motion.button>
    <p className="um-mono text-[11px] tracking-widest uppercase text-white/40">
      © {new Date().getFullYear()} UniMate · built for students, by students
    </p>
    <p className="um-body text-xs text-white/40 mt-3">
      <a
        href="https://paypal.me/OmarRaslan298" target="_blank" rel="noopener noreferrer"
        className="um-focus underline underline-offset-4 transition-colors hover:text-white"
        style={{ textDecorationColor: HL.yellow }}
      >
        Support me ☕
      </a>
    </p>
  </footer>
);

/* ---------------------------------------------------------------- Page */
const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="um-body um-paper-grid relative min-h-screen overflow-x-hidden" style={{ color: INK }}>
      <GlobalStyles />
      <ScrollProgress />
      <Nav onGetStarted={onGetStarted} />
      <Hero onGetStarted={onGetStarted} />
      <HighlighterMarquee />
      <PhonePreview />
      <FeaturesSection />
      <StatsSection />
      <CompareSection />
      <CTASection onGetStarted={onGetStarted} />
      <Footer />
    </div>
  );
};

export default LandingPage;