import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  Check,
  ArrowRight,
  GraduationCap,
  Calendar,
  Calculator,
  Link,
  Users,
  CheckSquare,
  Zap,
  Shield,
  Star,
  LayoutGrid,
  Settings,
  FileText,
  Brain,
  Plus,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  Dumbbell,
  Folder,
} from 'lucide-react';
import { motion, useMotionValue, useSpring, useTransform, useScroll, useInView } from 'framer-motion';
import { RainbowButton } from './ui/rainbow-button';

interface LandingPageProps {
  onGetStarted: () => void;
}

const AnimatedHero = () => {
  const [titleNumber, setTitleNumber] = useState(0);
  const titles = useMemo(() => ['focused', 'smart', 'modern', 'smooth', 'clean'], []);
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setTitleNumber((prev) => (prev === titles.length - 1 ? 0 : prev + 1));
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [titleNumber, titles]);

  return (
    <div className="w-full">
      <div className="flex gap-4 flex-col items-center">
        <h1 className="text-5xl md:text-7xl lg:text-8xl max-w-4xl tracking-tighter text-center font-black leading-[0.92]">
          <span className="text-white block">Build a</span>
          <span className="relative flex w-full justify-center overflow-hidden text-center md:pb-4 md:pt-1">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400">
              {titles.map((title, index) => (
                <motion.span
                  key={index}
                  className="absolute left-1/2 -translate-x-1/2 font-semibold"
                  initial={{ opacity: 0, y: '-100%' }}
                  transition={{ type: 'spring', stiffness: 50 }}
                  animate={
                    titleNumber === index
                      ? { y: 0, opacity: 1 }
                      : { y: titleNumber > index ? -150 : 150, opacity: 0 }
                  }
                >
                  {title}
                </motion.span>
              ))}
            </span>
          </span>
          <span className="text-white block">student space</span>
        </h1>
      </div>
    </div>
  );
};

const ContainerScroll = ({
  titleComponent,
  children,
}: {
  titleComponent: React.ReactNode;
  children: React.ReactNode;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const rotate = useTransform(scrollYProgress, [0, 1], [20, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], isMobile ? [0.7, 0.9] : [1.05, 1]);
  const translate = useTransform(scrollYProgress, [0, 1], [0, -100]);

  return (
    <div className="h-[60rem] md:h-[80rem] flex items-center justify-center relative p-2 md:p-20" ref={containerRef}>
      <div className="py-10 md:py-40 w-full relative" style={{ perspective: '1000px' }}>
        <motion.div style={{ translateY: translate }} className="max-w-5xl mx-auto text-center">
          {titleComponent}
        </motion.div>
        <motion.div
          style={{
            rotateX: rotate,
            scale,
            boxShadow:
              '0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003',
          }}
          className="max-w-5xl -mt-12 mx-auto h-[30rem] md:h-[40rem] w-full border-4 border-[#3d2a6e] p-2 md:p-4 bg-[#0d0b1a] rounded-[30px] shadow-2xl"
        >
          <div className="h-full w-full overflow-hidden rounded-2xl bg-[#0d0b1a]">{children}</div>
        </motion.div>
      </div>
    </div>
  );
};

const FloatingOrbs = () => (
  <div className="pointer-events-none fixed inset-0 -z-20 overflow-hidden">
    <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
    {[
      { cls: 'absolute -top-32 -left-20 w-[500px] h-[500px]', color: 'rgba(139,92,246,0.22)', anim: { x: [0, 80, 0], y: [0, 50, 0], scale: [1, 1.1, 1] }, dur: 18 },
      { cls: 'absolute top-1/3 -right-24 w-[420px] h-[420px]', color: 'rgba(249,115,22,0.16)', anim: { x: [0, -70, 0], y: [0, -50, 0], scale: [1, 1.08, 1] }, dur: 22 },
      { cls: 'absolute -bottom-24 left-1/3 w-[460px] h-[460px]', color: 'rgba(79,70,229,0.2)', anim: { x: [0, 50, 0], y: [0, 40, 0], scale: [1, 1.12, 1] }, dur: 20 },
      { cls: 'absolute top-2/3 left-1/4 w-[300px] h-[300px]', color: 'rgba(217,70,239,0.1)', anim: { x: [0, -30, 0], y: [0, -60, 0], scale: [1, 1.15, 1] }, dur: 16 },
    ].map((orb, i) => (
      <motion.div
        key={i}
        className={`${orb.cls} rounded-full`}
        style={{ background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`, filter: 'blur(60px)' }}
        animate={orb.anim}
        transition={{ duration: orb.dur, repeat: Infinity, ease: 'easeInOut' }}
      />
    ))}
  </div>
);

const Reveal = ({
  children,
  delay = 0,
  direction = 'up',
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  className?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  const dirMap = { up: { y: 48, x: 0 }, down: { y: -48, x: 0 }, left: { x: 48, y: 0 }, right: { x: -48, y: 0 } };
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, ...dirMap[direction] }}
      animate={isInView ? { opacity: 1, y: 0, x: 0 } : {}}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
};

const AnimatedCounter = ({ value, suffix = '' }: { value: number; suffix?: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const step = value / (2000 / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [isInView, value]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
};

const StatBadge = ({
  value,
  suffix,
  label,
  delay,
}: {
  value: number;
  suffix?: string;
  label: string;
  delay: number;
}) => (
  <Reveal delay={delay} direction="up">
    <div className="text-center group">
      <div className="relative inline-block w-full">
        <div className="absolute inset-0 bg-violet-500/10 rounded-xl blur-lg group-hover:bg-violet-500/20 transition-all duration-500" />
        <div className="relative bg-white/5 border border-white/10 rounded-xl px-2 py-3 md:px-6 md:py-4 group-hover:border-violet-500/30 transition-all duration-300">
          <div className="text-xl md:text-4xl font-black bg-gradient-to-r from-violet-300 to-indigo-300 bg-clip-text text-transparent">
            <AnimatedCounter value={value} suffix={suffix} />
          </div>
          <div className="text-[9px] md:text-xs text-slate-400 mt-1 font-medium uppercase tracking-wider leading-tight">
            {label}
          </div>
        </div>
      </div>
    </div>
  </Reveal>
);

const FeatureCard3D = ({
  icon,
  title,
  desc,
  color,
  delay = 0,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  color: string;
  delay?: number;
}) => (
  <Reveal delay={delay}>
    <TiltCard className="group h-full" intensity={12}>
      <div
        className="h-full rounded-3xl p-[1px] transition-all duration-500"
        style={{ background: `linear-gradient(135deg, ${color}33 0%, transparent 50%, ${color}11 100%)` }}
      >
        <div className="h-full bg-[#0d0b18]/90 backdrop-blur-xl rounded-[calc(1.5rem-1px)] p-5 md:p-8 flex flex-col border border-white/5 group-hover:border-white/15 transition-all duration-500">
          <div className="relative mb-5 w-12 h-12 md:w-14 md:h-14">
            <div
              className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{ background: `radial-gradient(circle, ${color}44, transparent 70%)`, filter: 'blur(8px)' }}
            />
            <div
              className="relative w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center border"
              style={{ borderColor: `${color}44`, background: `${color}15` }}
            >
              {icon}
            </div>
          </div>
          <h3 className="text-base md:text-lg font-bold mb-2 text-white group-hover:text-violet-200 transition-colors">{title}</h3>
          <p className="text-slate-400 text-xs md:text-sm leading-relaxed flex-1">{desc}</p>
          <motion.div
            className="mt-4 h-[1px] rounded-full"
            style={{ background: `linear-gradient(90deg, ${color}66, transparent)` }}
            initial={{ scaleX: 0, originX: 0 }}
            whileInView={{ scaleX: 1 }}
            transition={{ duration: 1, delay: delay + 0.3 }}
          />
        </div>
      </div>
    </TiltCard>
  </Reveal>
);

const TiltCard = ({
  children,
  className = '',
  intensity = 15,
}: {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const xSpring = useSpring(x, { stiffness: 150, damping: 20 });
  const ySpring = useSpring(y, { stiffness: 150, damping: 20 });
  const rotateX = useTransform(ySpring, [-0.5, 0.5], [intensity, -intensity]);
  const rotateY = useTransform(xSpring, [-0.5, 0.5], [-intensity, intensity]);
  const glowX = useTransform(xSpring, [-0.5, 0.5], [0, 100]);
  const glowY = useTransform(ySpring, [-0.5, 0.5], [0, 100]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;
      x.set((e.clientX - rect.left) / rect.width - 0.5);
      y.set((e.clientY - rect.top) / rect.height - 0.5);
    },
    [x, y]
  );

  const handleMouseLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  return (
    <motion.div
      ref={ref}
      className={`relative ${className}`}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d', perspective: 1000 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <motion.div
        className="absolute inset-0 rounded-[inherit] pointer-events-none"
        style={{
          background: useTransform(
            [glowX, glowY],
            ([gx, gy]) => `radial-gradient(circle at ${gx}% ${gy}%, rgba(139,92,246,0.2) 0%, transparent 60%)`
          ),
        }}
      />
      <div className="relative" style={{ transform: 'translateZ(20px)' }}>
        {children}
      </div>
    </motion.div>
  );
};

const BottomNav = ({
  tab,
  setTab,
}: {
  tab: string;
  setTab: (t: 'home' | 'schedule' | 'files' | 'settings') => void;
}) => (
  <div className="absolute bottom-0 left-0 right-0 mx-3 mb-2">
    <div className="bg-[#2d1f5e] rounded-[20px] px-2 py-1.5 flex items-center justify-around">
      {([
        { id: 'home', icon: <LayoutGrid size={15} /> },
        { id: 'schedule', icon: <Calendar size={15} /> },
        { id: 'files', icon: <Folder size={15} /> },
        { id: 'settings', icon: <Settings size={15} /> },
      ] as const).map((t) => (
        <button
          key={t.id}
          onClick={() => setTab(t.id)}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
            tab === t.id ? 'bg-[#7c3aed] text-white shadow-lg shadow-violet-700/40' : 'text-white/40 hover:text-white/70'
          }`}
        >
          {t.icon}
        </button>
      ))}
    </div>
  </div>
);

const ModernDashboardPreview = () => {
  const [tab, setTab] = useState<'home' | 'schedule' | 'files' | 'settings'>('home');

  const HomeTab = () => (
    <div className="flex flex-col h-full px-3 pt-3 pb-16 overflow-hidden">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-white text-2xl font-black leading-none">12:57 AM</div>
          <div className="text-violet-400 text-xs font-bold mt-0.5">Friday, May 15</div>
          <div className="text-white/50 text-[10px] mt-0.5">
            Good Morning, <span className="text-white font-bold">Admin</span>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <FileText size={14} className="text-white/60" />
          </div>
          <div className="w-8 h-8 rounded-full bg-[#7c3aed] flex items-center justify-center shadow-lg shadow-violet-700/50">
            <Brain size={14} className="text-white" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl p-3 mb-3 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #5a6e00, #3d4a00)' }}>
        <div className="text-[9px] font-black text-yellow-300/70 uppercase tracking-widest mb-1">Priority Block</div>
        <div className="text-white font-black text-base leading-tight">Mobile UX Sprint</div>
        <div className="mt-1.5 inline-flex bg-black/20 rounded-md px-2 py-0.5 text-[9px] text-white/60">Design</div>
        <div className="mt-2 flex items-center gap-1.5 bg-black/20 rounded-xl px-2.5 py-1.5 w-fit">
          <Clock size={10} className="text-white/60" />
          <span className="text-[10px] text-white font-bold">Event</span>
          <span className="text-[10px] text-white/50 ml-1">11:30 PM – 1:00 AM</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="col-span-1 rounded-xl bg-[#1a1a2e] border border-white/10 p-2.5 relative">
          <div className="absolute top-1.5 right-1.5 bg-white/10 rounded-full px-1.5 py-0.5 text-[7px] font-bold text-white/40 uppercase">Soon</div>
          <Dumbbell size={14} className="text-white/30 mb-4" />
          <div className="text-white/40 text-[10px] font-bold">Gym</div>
          <div className="text-white/20 text-[8px]">Coming Soon</div>
        </div>
        <div className="col-span-2 rounded-xl p-2.5" style={{ background: 'linear-gradient(135deg, #0f4a4a, #0a3535)' }}>
          <Calculator size={14} className="text-teal-300 mb-3" />
          <div className="text-white font-black text-sm">Progress Tracker</div>
          <div className="text-teal-300/70 text-[9px]">Milestone Calculator</div>
        </div>
        <div className="col-span-1 rounded-xl p-2.5" style={{ background: 'linear-gradient(135deg, #6b1a3a, #3d0f22)' }}>
          <CheckSquare size={14} className="text-pink-300 mb-3" />
          <div className="text-white font-black text-xs">Focus Tasks</div>
          <div className="text-pink-300/60 text-[8px]">Task Manager</div>
        </div>
        <div className="col-span-1 rounded-xl border border-dashed border-white/20 flex flex-col items-center justify-center gap-1 p-2">
          <Plus size={16} className="text-white/30" />
          <span className="text-[8px] text-white/30 font-medium">Quick Add</span>
        </div>
        <div className="col-span-1 rounded-xl bg-[#1a1a2e] border border-white/10 flex flex-col items-center justify-center gap-1 p-2">
          <Brain size={14} className="text-violet-400" />
          <span className="text-[8px] text-violet-300 font-bold text-center leading-tight">Quick Sync</span>
        </div>
      </div>

      <div className="text-[10px] font-black text-white/60 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <FileText size={10} /> Upcoming Items
      </div>
      <div className="flex flex-col gap-1.5">
        {[
          { type: 'MILESTONE', name: 'Interface Critique', date: 'May 15', time: '11:30 PM', color: '#a3c700' },
          { type: 'CHECK-IN', name: 'Motion Lab', date: 'May 17', time: '8:45 AM', color: '#ef4444' },
          { type: 'REVIEW', name: 'Prototype Review', date: 'May 17', time: '12:00 PM', color: '#ef4444', sub: '3rd' },
        ].map((item, i) => (
          <div
            key={i}
            className="flex items-center justify-between bg-[#13102a] rounded-xl px-3 py-2 border-l-2"
            style={{ borderLeftColor: item.color }}
          >
            <div>
              <div className="text-[8px] font-black uppercase tracking-wider" style={{ color: item.color }}>
                {item.type}
              </div>
              <div className="text-white text-[10px] font-bold">{item.name}</div>
            </div>
            <div className="text-right">
              <div className="text-white text-[10px] font-bold">{item.date}</div>
              <div className="text-white/40 text-[9px]">{item.time}</div>
              {item.sub && <div className="text-violet-400 text-[8px] font-bold">{item.sub}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const ScheduleTab = () => {
    const days = [
      { label: 'SUN', date: 'May 10' },
      { label: 'MON', date: 'May 11' },
      { label: 'TUE', date: 'May 12' },
      { label: 'WED', date: 'May 13' },
      { label: 'THU', date: 'May 14' },
      { label: 'FRI', date: 'May 15' },
    ];

    const classes: Record<string, { name: string; room: string; type: string; color: string }> = {
      'SUN-0': { name: 'Studio Quiz', room: 'M.014', type: 'QUIZ', color: '#991b1b' },
      'MON-1': { name: 'Product Systems', room: 'A3.128', type: 'LECT', color: '#374151' },
      'MON-2': { name: 'Visual Design', room: 'S2.219', type: 'LECT', color: '#0e7490' },
      'TUE-0': { name: 'Motion Lab', room: 'S2.519', type: 'LAB', color: '#0891b2' },
      'TUE-1': { name: 'Interface Critique', room: 'A3.228', type: 'LECT', color: '#374151' },
      'WED-1': { name: 'Data Storytelling', room: 'A3.328', type: 'LECT', color: '#374151' },
      'WED-2': { name: 'Prototype Review', room: 'A3.22', type: 'LECT', color: '#374151' },
    };

    return (
      <div className="flex flex-col h-full pb-16 overflow-hidden">
        <div className="flex items-center justify-between px-3 pt-3 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-white text-xl font-black">Schedule</span>
            <div className="bg-[#2d1f5e] rounded-full px-2.5 py-1 flex items-center gap-1 text-white text-[10px] font-bold">
              Weekly View <span className="text-white/40 ml-0.5">▾</span>
            </div>
          </div>
          <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
            <span className="text-white/60 text-[10px]">•••</span>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 mb-2">
          <ChevronLeft size={13} className="text-white/40" />
          <span className="text-white text-xs font-bold">May 9 – May 15</span>
          <ChevronRight size={13} className="text-white/40" />
        </div>
        <div className="flex-1 overflow-auto px-2">
          <div className="grid text-[7px]" style={{ gridTemplateColumns: '34px repeat(3, 1fr)' }}>
            <div className="bg-[#0d0b1a]" />
            {['1ST', '2ND', '3RD'].map((p, i) => (
              <div key={i} className="bg-[#1a1030] border border-white/5 px-1 py-1.5 text-center">
                <div className="text-violet-400 font-black">{p}</div>
                <div className="text-white/30">{['8:30–10:00', '10:15–11:45', '12:00–1:30'][i]}</div>
              </div>
            ))}
            {days.map((day, di) => (
              <React.Fragment key={di}>
                <div className={`border border-white/5 px-1 py-2 flex flex-col items-center justify-center ${di === 5 ? 'border-l-2 border-l-violet-500' : ''}`}>
                  <span className={`font-black text-[8px] ${di === 5 ? 'text-violet-400' : 'text-white/60'}`}>{day.label}</span>
                  <span className="text-white/30 text-[6px]">{day.date.split(' ')[1]}</span>
                </div>
                {[0, 1, 2].map((pi) => {
                  const cls = classes[`${day.label}-${pi}`];
                  return (
                    <div key={pi} className="border border-white/5 p-0.5 min-h-[40px]">
                      {cls && (
                        <div className="rounded p-1 h-full" style={{ background: cls.color }}>
                          <div className="text-white font-bold text-[7px] leading-tight truncate">{cls.name}</div>
                          <div className="flex items-center gap-0.5 mt-0.5">
                            <MapPin size={5} className="text-white/60 shrink-0" />
                            <span className="text-white/60 text-[6px] truncate">{cls.room}</span>
                          </div>
                          <div className="mt-0.5 bg-black/25 rounded text-[5px] font-bold text-white/70 px-0.5 py-px w-fit">{cls.type}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const FilesTab = () => (
    <div className="flex flex-col h-full px-3 pt-3 pb-16 overflow-hidden">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-1.5">
            <ChevronLeft size={15} className="text-white/40" />
            <span className="text-white text-xl font-black">Materials</span>
          </div>
          <div className="text-white/40 text-[10px] ml-5">Documents & Resources</div>
        </div>
        <div className="bg-[#1a1030] border border-violet-500/30 rounded-full px-2 py-1 flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          <span className="text-[8px] text-white/50 font-bold uppercase tracking-wider">Sync</span>
        </div>
      </div>
      <div className="bg-[#13102a] rounded-xl px-3 py-2 mb-3">
        <span className="text-white/30 text-xs">Search files...</span>
      </div>
      <div className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-2">Folders</div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          ['Research Kit', '3 items'],
          ['UI Systems', '2 items'],
          ['Launch Assets', '7 items'],
        ].map(([n, c]) => (
          <div key={n} className="bg-[#13102a] rounded-xl p-2 border border-white/5">
            <div className="flex justify-end mb-1">
              <span className="text-white/20 text-xs">⋮</span>
            </div>
            <Folder size={18} className="text-yellow-400 mb-1 mx-auto block" />
            <div className="text-white text-[9px] font-bold text-center truncate">{n}</div>
            <div className="text-white/30 text-[7px] text-center">{c}</div>
          </div>
        ))}
      </div>
      <div className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-2">Files</div>
      <div className="flex flex-col gap-1.5">
        {[
          { icon: '📄', name: 'Launch Plan 2026 Final...', size: '0.15 MB', date: '2026-04-23' },
          { icon: '🖼', name: 'Moodboard set.png', size: '1.87 MB', date: '2026-04-28' },
          { icon: '📝', name: 'Voiceover notes.txt', size: '0.02 MB', date: '2026-04-20' },
        ].map((f, i) => (
          <div key={i} className="flex items-center gap-2 bg-[#13102a] rounded-xl px-2.5 py-2 border border-white/5">
            <div className="w-7 h-7 rounded-lg bg-[#1e1640] flex items-center justify-center text-sm shrink-0">{f.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-[9px] font-bold truncate">{f.name}</div>
              <div className="text-white/30 text-[7px]">{f.size} • {f.date}</div>
            </div>
            <span className="text-violet-400 text-[10px] shrink-0">👁</span>
          </div>
        ))}
      </div>
    </div>
  );

  const SettingsTab = () => (
    <div className="flex flex-col h-full px-3 pt-3 pb-16 overflow-hidden">
      <div className="mb-4">
        <h1 className="text-white text-2xl font-black">Settings</h1>
        <p className="text-white/40 text-[10px]">Manage your studio workspace</p>
      </div>
      {[
        {
          label: 'Personal & Identity',
          items: [{ icon: '👤', name: 'Account Profile', badge: 'Edit', color: '#3b82f6' }],
        },
        {
          label: 'Workspace Engine',
          items: [
            { icon: '📚', name: 'Projects & Versions', badge: '2 Spaces', color: '#7c3aed' },
            { icon: '📊', name: 'Timeline Grid', badge: '', color: '#ec4899' },
            { icon: '🎨', name: 'Theme Colors', badge: '', color: '#f59e0b' },
          ],
        },
      ].map((group) => (
        <div key={group.label} className="bg-[#13102a] rounded-2xl border border-white/5 mb-3 overflow-hidden">
          <div className="px-4 py-2 text-[8px] font-black text-white/30 uppercase tracking-widest border-b border-white/5">
            {group.label}
          </div>
          {group.items.map((item, i) => (
            <div key={i} className={`flex items-center gap-3 px-3 py-2.5 ${i < group.items.length - 1 ? 'border-b border-white/5' : ''}`}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0" style={{ background: `${item.color}22` }}>
                {item.icon}
              </div>
              <span className="text-white font-bold text-xs flex-1">{item.name}</span>
              {item.badge && <span className="bg-white/10 text-white/60 text-[8px] font-bold px-2 py-0.5 rounded-lg">{item.badge}</span>}
              <span className="text-white/20 text-xs">›</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <div className="w-full h-full bg-[#0d0b1a] rounded-2xl overflow-hidden relative select-none">
      <div className="h-5 bg-[#080616] flex items-center justify-between px-4">
        <span className="text-white/30 text-[8px]">9:41</span>
        <div className="flex gap-1">
          <span className="text-white/30 text-[8px]">● ● ●</span>
        </div>
      </div>
      <div className="relative" style={{ height: 'calc(100% - 20px)' }}>
        {tab === 'home' && <HomeTab />}
        {tab === 'schedule' && <ScheduleTab />}
        {tab === 'files' && <FilesTab />}
        {tab === 'settings' && <SettingsTab />}
        <BottomNav tab={tab} setTab={setTab} />
      </div>
    </div>
  );
};

const MARQUEE_ITEMS = [
  '📅 Smart Scheduling',
  '✅ Task Manager',
  '📊 Progress Tracker',
  '🔗 Course Hub',
  '🎓 100% Free',
  '⚡ No Ads',
  '🔒 Private',
  '🌙 Dark Mode',
  '📱 Mobile Ready',
  '🚀 Fast & Lightweight',
];

const Marquee = () => (
  <div className="relative overflow-hidden py-3 border-y border-white/5">
    <div className="absolute left-0 top-0 bottom-0 w-16 md:w-24 bg-gradient-to-r from-[#09060f] to-transparent z-10" />
    <div className="absolute right-0 top-0 bottom-0 w-16 md:w-24 bg-gradient-to-l from-[#09060f] to-transparent z-10" />
    <motion.div
      className="flex gap-6 md:gap-8 whitespace-nowrap"
      animate={{ x: [0, -50 * MARQUEE_ITEMS.length] }}
      transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
    >
      {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
        <span key={i} className="text-slate-400 text-xs md:text-sm font-medium flex items-center gap-2">
          {item}
          <span className="text-violet-500/40">•</span>
        </span>
      ))}
    </motion.div>
  </div>
);

const COMPARE_ROWS = [
  { feature: 'Schedule Management', us: true, notion: false, google: true },
  { feature: 'Progress Tracker', us: true, notion: false, google: false },
  { feature: 'Course Hub', us: true, notion: true, google: false },
  { feature: 'Focus Tasks', us: true, notion: true, google: true },
  { feature: 'Built for Students', us: true, notion: false, google: false },
  { feature: 'Completely Free', us: true, notion: false, google: true },
  { feature: 'No Ads Ever', us: true, notion: false, google: false },
];

const CompareSection = () => (
  <section className="py-16 md:py-28 max-w-4xl mx-auto px-4 md:px-6">
    <Reveal className="text-center mb-10 md:mb-12">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-semibold uppercase tracking-widest mb-4">
        <Star size={11} /> Why UniMate
      </div>
      <h2 className="text-3xl md:text-5xl font-black text-white mb-3">Built Different</h2>
      <p className="text-slate-400 text-base md:text-lg">We didn't bolt on student features — we built around them.</p>
    </Reveal>
    <Reveal delay={0.2}>
      <div className="rounded-2xl md:rounded-3xl border border-white/10 overflow-hidden backdrop-blur-xl bg-white/[0.02]">
        <div className="grid grid-cols-4 text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-400 border-b border-white/8 px-4 md:px-6 py-3 md:py-4 bg-white/3">
          <span>Feature</span>
          <span className="text-center text-violet-300">UniMate</span>
          <span className="text-center">Notion</span>
          <span className="text-center">Google</span>
        </div>
        {COMPARE_ROWS.map((row, i) => (
          <motion.div
            key={i}
            className="grid grid-cols-4 px-4 md:px-6 py-3 md:py-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.07 }}
          >
            <span className="text-slate-300 text-xs md:text-sm font-medium pr-2 leading-tight">{row.feature}</span>
            {[row.us, row.notion, row.google].map((val, j) => (
              <span key={j} className="flex justify-center items-center">
                {val ? (
                  <span className={`w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center ${j === 0 ? 'bg-violet-500/20' : 'bg-emerald-500/15'}`}>
                    <Check size={11} className={j === 0 ? 'text-violet-400' : 'text-emerald-400'} />
                  </span>
                ) : (
                  <span className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-white/3 flex items-center justify-center">
                    <span className="w-2.5 h-[1.5px] bg-slate-600 rounded-full" />
                  </span>
                )}
              </span>
            ))}
          </motion.div>
        ))}
      </div>
    </Reveal>
  </section>
);

const TiltOrbsSection = () => (
  <section className="py-14 md:py-20 px-4">
    <div className="max-w-6xl mx-auto rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 md:p-10 overflow-hidden relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:24px_24px]" />
      <Reveal className="relative z-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold uppercase tracking-widest mb-4">
          <Shield size={11} /> Built for focus
        </div>
        <h2 className="text-3xl md:text-5xl font-black text-white mb-3">Everything feels lighter</h2>
        <p className="text-slate-400 text-sm md:text-lg max-w-2xl mx-auto">
          The interface is designed to reduce clutter, keep the important parts visible, and make mobile use feel natural.
        </p>
      </Reveal>
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        {[
          { title: 'Less friction', desc: 'Quick access to your next task, class, or file.' },
          { title: 'Faster scanning', desc: 'Clear hierarchy, stronger contrast, fewer repeated blocks.' },
          { title: 'Mobile-first', desc: 'Works naturally on small screens without losing the premium feel.' },
        ].map((item, i) => (
          <Reveal key={i} delay={i * 0.1}>
            <div className="rounded-2xl border border-white/10 bg-[#0d0b1a]/80 p-5 h-full">
              <div className="text-white font-bold text-lg mb-2">{item.title}</div>
              <div className="text-slate-400 text-sm leading-relaxed">{item.desc}</div>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 350], [1, 0]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="relative min-h-screen bg-[#09060f] text-white overflow-x-hidden selection:bg-violet-500/30 font-sans">
      <FloatingOrbs />

      <motion.nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-8 py-2.5"
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="absolute inset-0 bg-[#09060f]/80 backdrop-blur-2xl border-b border-white/5" />
        <div className="relative flex items-center gap-2 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <motion.div
            className="w-7 h-7 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-violet-600/30"
            whileHover={{ scale: 1.1, rotate: -5 }}
            whileTap={{ scale: 0.95 }}
          >
            <GraduationCap size={14} className="text-white" />
          </motion.div>
          <span className="relative font-black text-base tracking-tight">
            UniMate
            <motion.span
              className="absolute -bottom-0.5 left-0 right-0 h-[1.5px] bg-gradient-to-r from-violet-400 to-indigo-400"
              initial={{ scaleX: 0 }}
              whileHover={{ scaleX: 1 }}
              transition={{ duration: 0.3 }}
            />
          </span>
        </div>
        <motion.button
          onClick={onGetStarted}
          className="relative px-4 py-1.5 text-xs font-bold bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full shadow-md shadow-violet-600/25 hover:shadow-violet-600/40 transition-shadow"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
        >
          Sign In
        </motion.button>
      </motion.nav>

      <section className="relative min-h-screen flex flex-col items-center justify-center pt-20 pb-16 px-5 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div
            className="w-[500px] h-[500px] md:w-[700px] md:h-[700px] rounded-full border border-violet-500/8"
            animate={{ rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute w-[700px] h-[700px] md:w-[900px] md:h-[900px] rounded-full border border-indigo-500/5"
            animate={{ rotate: -360 }}
            transition={{ duration: 90, repeat: Infinity, ease: 'linear' }}
          />
        </div>

        <motion.div className="relative z-10 flex flex-col items-center text-center max-w-5xl w-full" style={{ opacity: heroOpacity }}>
          <div className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-violet-500/10 border border-violet-500/25 text-violet-300 text-[11px] md:text-xs font-semibold mb-6 md:mb-8 backdrop-blur-sm">
            <span>✨</span>
            Built for students who want one free workspace.
          </div>

          <div className="mb-2 px-2">
            <AnimatedHero />
          </div>

          <p className="text-slate-400 text-base md:text-xl max-w-xs sm:max-w-sm md:max-w-xl mt-5 mb-8 leading-relaxed px-2 md:px-0">
            One unified dashboard for schedules, progress, tasks, and resources.
            Everything you need — completely free.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full px-6 sm:px-0 sm:w-auto">
            <div className="relative group w-full sm:w-auto">
              <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl blur opacity-50 group-hover:opacity-80 transition duration-500" />
              <RainbowButton onClick={onGetStarted} className="relative h-12 md:h-14 px-8 text-sm md:text-base font-bold rounded-xl w-full sm:w-auto">
                Get Started Free
                <ArrowRight size={16} className="ml-2 inline-block group-hover:translate-x-1 transition-transform" />
              </RainbowButton>
            </div>
            <motion.button
              className="h-12 md:h-14 px-6 text-sm font-semibold rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all backdrop-blur-sm flex items-center gap-2 w-full sm:w-auto justify-center"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => document.getElementById('dashboard-section')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <motion.span
                className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"
                animate={{ scale: [1, 1.4, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              See the Dashboard
            </motion.button>
          </div>

          <div className="hidden sm:flex items-center gap-4 mt-10 text-xs text-slate-500">
            {['No credit card', 'No ads', 'Always free'].map((t, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <Check size={11} className="text-emerald-500" /> {t}
              </span>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-slate-600"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span className="text-[9px] uppercase tracking-widest">Scroll</span>
          <div className="w-4 h-7 rounded-full border border-white/10 flex items-start justify-center p-1">
            <motion.div
              className="w-1 h-1.5 bg-violet-400 rounded-full"
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </section>

      <section className="py-10 md:py-16 border-y border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-transparent to-indigo-500/5" />
        <div className="max-w-3xl mx-auto grid grid-cols-3 gap-3 md:gap-6 px-4 md:px-6">
          <StatBadge value={10000} suffix="+" label="Students" delay={0} />
          <StatBadge value={4} suffix=" Tools" label="In One App" delay={0.15} />
          <StatBadge value={100} suffix="%" label="Free Forever" delay={0.3} />
        </div>
      </section>

      <Marquee />

      <section id="dashboard-section" className="relative overflow-hidden bg-transparent">
        <ContainerScroll
          titleComponent={
            <div className="text-center px-4 mb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-semibold uppercase tracking-widest mb-5">
                <Zap size={11} /> Live Preview
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-white mb-3">Your Command Center</h2>
              <p className="text-slate-400 text-base md:text-lg max-w-xl mx-auto">
                Schedule, progress, tasks, and materials — all in one beautiful app.
                Click the tabs to explore.
              </p>
            </div>
          }
        >
          <ModernDashboardPreview />
        </ContainerScroll>
      </section>

      <section id="features" className="py-16 md:py-24 max-w-7xl mx-auto px-4 md:px-8">
        <Reveal className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-semibold uppercase tracking-widest mb-4">
            <Zap size={11} /> Feature-packed
          </div>
          <h2 className="text-3xl md:text-5xl font-black mb-3 text-white">Everything You Need</h2>
          <p className="text-slate-400 text-base md:text-lg max-w-2xl mx-auto">
            Replace your fragmented tools with one cohesive student OS.
          </p>
        </Reveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {[
            { icon: <Calendar className="w-5 h-5 md:w-6 md:h-6 text-violet-400" />, title: 'Smart Scheduling', desc: 'Handle recurring classes, conflict detection, and holidays with a smooth calendar.', color: '#8b5cf6', delay: 0 },
            { icon: <CheckSquare className="w-5 h-5 md:w-6 md:h-6 text-teal-400" />, title: 'To-Do Command', desc: 'Tag assignments to courses, set due dates, and never miss a deadline.', color: '#2dd4bf', delay: 0.1 },
            { icon: <Link className="w-5 h-5 md:w-6 md:h-6 text-pink-400" />, title: 'Course Hub', desc: 'Save YouTube playlists, PDFs, and Drive links for every subject.', color: '#f472b6', delay: 0.2 },
            { icon: <Calculator className="w-5 h-5 md:w-6 md:h-6 text-emerald-400" />, title: 'Grade Calculator', desc: 'Track GPA instantly. See exactly what score you need on the final.', color: '#34d399', delay: 0.3 },
          ].map((f) => (
            <FeatureCard3D key={f.title} {...f} />
          ))}
        </div>
      </section>

      <CompareSection />
      <TiltOrbsSection />

      <section className="py-20 md:py-36 px-4 relative overflow-hidden">
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] md:w-[700px] md:h-[700px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, rgba(79,70,229,0.06) 40%, transparent 70%)',
            filter: 'blur(40px)',
          }}
          animate={{ scale: [1, 1.1, 1], rotate: [0, 10, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <Reveal>
          <div className="max-w-4xl mx-auto relative z-10">
            <TiltCard intensity={4} className="group">
              <div className="relative bg-gradient-to-b from-[#12101a] to-[#0e0c16] border border-white/10 rounded-[2rem] md:rounded-[3rem] p-8 md:p-20 text-center overflow-hidden shadow-[0_0_80px_rgba(139,92,246,0.08)]">
                {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
                  <motion.div
                    key={i}
                    className={`absolute ${pos} w-14 h-14 md:w-20 md:h-20 border-t-2 border-l-2 border-violet-500/25 rounded-tl-3xl pointer-events-none`}
                    style={{ rotate: i * 90 }}
                    animate={{ opacity: [0.3, 0.7, 0.3] }}
                    transition={{ duration: 3, delay: i * 0.5, repeat: Infinity }}
                  />
                ))}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none" />
                <motion.div
                  className="absolute top-6 left-6 hidden md:flex items-center gap-2 bg-white/5 border border-white/8 rounded-full px-3 py-1.5"
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Stable Build</span>
                </motion.div>
                <motion.div
                  className="absolute bottom-6 right-6 hidden md:flex items-center gap-2 bg-white/5 border border-white/8 rounded-full px-3 py-1.5"
                  animate={{ y: [0, 6, 0] }}
                  transition={{ duration: 3.5, repeat: Infinity }}
                >
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                  <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Mobile Ready</span>
                </motion.div>

                <div className="relative z-20 flex flex-col items-center">
                  <div className="flex items-center gap-2 mb-6 md:mb-8">
                    <div className="flex -space-x-2">
                      {['from-violet-400 to-indigo-500', 'from-pink-400 to-rose-500', 'from-teal-400 to-emerald-500'].map((grad, i) => (
                        <motion.div
                          key={i}
                          className={`w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br ${grad} border-2 border-[#12101a] flex items-center justify-center`}
                          initial={{ x: -i * 20, opacity: 0 }}
                          whileInView={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.3 + i * 0.1 }}
                        >
                          <Users size={10} className="text-white" />
                        </motion.div>
                      ))}
                    </div>
                    <span className="text-xs text-slate-400 font-medium">Join 10,000+ Students</span>
                  </div>

                  <h2 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-5 text-white tracking-tight leading-[1.05]">
                    Ready to <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400">Ace</span>
                    <br className="hidden md:block" />
                    This Semester?
                  </h2>

                  <p className="text-sm md:text-lg text-slate-400 mb-8 md:mb-10 max-w-sm md:max-w-xl leading-relaxed">
                    Stop juggling multiple apps. Get the all-in-one student OS that handles your schedule, progress, and goals.
                  </p>

                  <div className="relative group/btn w-full sm:w-auto">
                    <motion.div
                      className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl blur opacity-40"
                      whileHover={{ opacity: 0.8 }}
                      transition={{ duration: 0.3 }}
                    />
                    <RainbowButton
                      onClick={onGetStarted}
                      className="relative h-13 md:h-16 px-8 md:px-12 text-base md:text-xl rounded-xl font-bold w-full sm:w-auto"
                    >
                      Start For Free
                      <ArrowRight size={18} className="ml-2 inline-block group-hover/btn:translate-x-1.5 transition-transform duration-200" />
                    </RainbowButton>
                  </div>

                  <div className="mt-6 md:mt-8 flex flex-wrap justify-center items-center gap-4 md:gap-6 text-[10px] md:text-xs text-slate-500">
                    {['Completely Free', 'No Ads or Paywalls', 'No Sign-up Required'].map((t, i) => (
                      <span key={i} className="flex items-center gap-1.5">
                        <Check size={10} className="text-emerald-500" /> {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </TiltCard>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-white/5 py-8 md:py-10 bg-[#050508] text-center relative z-10 px-6">
        <motion.div
          className="flex items-center justify-center gap-2.5 mb-3 cursor-pointer"
          whileHover={{ scale: 1.03 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-900/30">
            <GraduationCap size={15} className="text-white" />
          </div>
          <span className="font-black text-lg text-white tracking-tight">UniMate</span>
        </motion.div>
        <p className="text-xs text-slate-600">
          &copy; {new Date().getFullYear()} UniMate. Built for students, by students.
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;