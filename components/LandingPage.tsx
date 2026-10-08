import React from 'react';
import { motion } from 'framer-motion';
import {
  Calendar, GraduationCap, Bell, Sparkles, BookOpen, CheckSquare, Dumbbell,
  Smartphone, ArrowRight, Check, Home, ListTodo, User, ChevronRight, ShieldCheck,
  RefreshCw, Lock,
} from 'lucide-react';
import { SIGNUPS_ENABLED } from '../lib/featureFlags';

interface LandingPageProps {
  onGetStarted: () => void;
}

/* ─── Design tokens: same CSS variables the app itself uses (see index.html) ─── */
const glassFx: React.CSSProperties = {
  backdropFilter: 'var(--glass-blur)',
  WebkitBackdropFilter: 'var(--glass-blur)',
  boxShadow: 'var(--glass-shadow)',
};
const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--line)', ...glassFx };
const EASE = [0.16, 1, 0.3, 1] as const;
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};
const stagger = { show: { transition: { staggerChildren: 0.06 } } };

const sectionLabel = 'text-[0.72rem] font-bold uppercase tracking-[0.08em]';

/* ─── Small building blocks ─── */
const PrimaryButton: React.FC<{ onClick: () => void; children: React.ReactNode; large?: boolean }> = ({ onClick, children, large }) => (
  <button
    onClick={onClick}
    className={`group inline-flex items-center justify-center gap-2 rounded-full border-0 font-extrabold transition-transform active:scale-[0.97] ${large ? 'h-13 px-7 text-[1rem]' : 'h-10 px-5 text-[0.88rem]'}`}
    style={{ background: 'var(--accent)', color: 'var(--on-accent)', height: large ? 52 : 40, boxShadow: '0 10px 30px rgba(25,184,166,0.28)' }}
  >
    {children}
  </button>
);

const GhostButton: React.FC<{ href?: string; onClick?: () => void; children: React.ReactNode }> = ({ href, onClick, children }) => {
  const cls = 'inline-flex items-center justify-center gap-2 rounded-full px-6 font-bold no-underline transition-transform active:scale-[0.97]';
  const st: React.CSSProperties = { ...card, height: 52, color: 'var(--text-primary)' };
  return href
    ? <a href={href} className={cls} style={st}>{children}</a>
    : <button onClick={onClick} className={`${cls} border-0`} style={st}>{children}</button>;
};

const Logo = () => (
  <div className="flex items-center gap-2.5">
    <img src="/apple-touch-icon.png" alt="" className="h-9 w-9 rounded-[11px]" style={{ border: '1px solid var(--line)' }} />
    <span className="text-[1.15rem] font-extrabold tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>UniMate</span>
  </div>
);

/* ─── Nav ─── */
const Nav = ({ onGetStarted }: { onGetStarted: () => void }) => (
  <div className="sticky top-0 z-50 px-4 pt-[max(12px,env(safe-area-inset-top))]">
    <nav className="mx-auto flex max-w-5xl items-center justify-between rounded-[22px] px-3.5 py-2.5" style={{ background: 'var(--nav)', border: '1px solid var(--line)', ...glassFx, boxShadow: 'var(--nav-shadow)' }}>
      <Logo />
      <div className="hidden items-center gap-6 text-[0.86rem] font-semibold md:flex" style={{ color: 'var(--text-muted)' }}>
        <a href="#features" className="no-underline hover:opacity-80" style={{ color: 'inherit' }}>Features</a>
        <a href="#portal" className="no-underline hover:opacity-80" style={{ color: 'inherit' }}>Portal sync</a>
        <a href="#ios" className="no-underline hover:opacity-80" style={{ color: 'inherit' }}>iOS app</a>
      </div>
      <PrimaryButton onClick={onGetStarted}>Sign in</PrimaryButton>
    </nav>
  </div>
);

/* ─── Phone mockup: a faithful mini version of the real Home screen ─── */
const PhoneMockup = () => {
  const classes = [
    { t: '08:30', title: 'Software Engineering', sub: 'Lecture · H12', st: 'done' },
    { t: '10:15', title: 'Network Security', sub: 'Lab · C3.204', st: 'now' },
    { t: '12:00', title: 'Research Paper Writing', sub: 'Tutorial · B2.101', st: 'next' },
    { t: '14:15', title: 'Databases II', sub: 'Lecture · H8', st: '' },
  ];
  const quick = [
    { i: Calendar, l: 'Schedule' }, { i: GraduationCap, l: 'Grades' }, { i: BookOpen, l: 'Materials' },
    { i: CheckSquare, l: 'To-do' }, { i: Dumbbell, l: 'Gym' },
  ];
  return (
    <div className="relative mx-auto w-[300px] sm:w-[320px]">
      <div className="absolute -inset-10 -z-10 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(25,184,166,0.35), transparent 65%)' }} />
      <div className="rounded-[46px] p-[10px]" style={{ background: 'linear-gradient(160deg, #2a2d36, #0c0d12)', boxShadow: '0 40px 80px rgba(0,0,0,0.55), inset 0 0 0 1.5px rgba(255,255,255,0.08)' }}>
        <div className="relative overflow-hidden rounded-[38px] px-3.5 pb-20 pt-10" style={{ background: 'var(--bg)', minHeight: 600 }}>
          <div className="absolute left-1/2 top-2.5 h-[26px] w-[92px] -translate-x-1/2 rounded-full bg-black" />
          {/* greeting */}
          <div className="text-[0.66rem] font-semibold" style={{ color: 'var(--text-muted)' }}>
            Good morning, <span className="font-bold" style={{ color: 'var(--text-primary)' }}>Omar</span>
          </div>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-[1.5rem] font-extrabold tracking-[-0.03em]" style={{ color: 'var(--text-primary)' }}>10:42</span>
            <span className="text-[0.66rem] font-bold" style={{ color: 'var(--accent-text)' }}>Tue, Oct 14</span>
          </div>
          {/* hero card */}
          <div className="mt-3 rounded-[18px] px-3 py-2.5" style={{ background: 'var(--hero-bg)', color: 'var(--hero-ink)', border: '1px solid var(--line)', ...glassFx }}>
            <div className="flex items-center gap-1.5 text-[0.56rem] font-extrabold uppercase tracking-[0.08em]">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" /> Happening now
            </div>
            <div className="mt-1 text-[1rem] font-extrabold leading-tight">Network Security</div>
            <div className="mt-1 text-[0.62rem] font-bold opacity-80">Lab · C3.204 · until 11:45</div>
            <div className="mt-2 h-1 overflow-hidden rounded-full" style={{ background: 'color-mix(in srgb, currentColor 22%, transparent)' }}>
              <div className="h-full w-[38%] rounded-full bg-current" />
            </div>
          </div>
          {/* today list */}
          <div className={`${sectionLabel} mb-1 mt-3 px-1 text-[0.56rem]`} style={{ color: 'var(--text-muted)' }}>Today</div>
          <div className="rounded-[14px] px-2.5" style={card}>
            {classes.map((c, i) => (
              <div key={c.t} className="flex items-center gap-2 py-1.5" style={{ borderTop: i ? '1px solid var(--line)' : 'none', opacity: c.st === 'done' ? 0.5 : 1 }}>
                <div className="w-9 text-[0.62rem] font-bold" style={{ color: c.st === 'now' || c.st === 'next' ? 'var(--accent-text)' : 'var(--text-primary)' }}>{c.t}</div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[0.68rem] font-bold" style={{ color: 'var(--text-primary)' }}>{c.title}</div>
                  <div className="text-[0.56rem]" style={{ color: 'var(--text-muted)' }}>{c.sub}</div>
                </div>
                {c.st === 'now' && <span className="rounded-full px-1.5 py-0.5 text-[0.5rem] font-extrabold uppercase" style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}>Now</span>}
              </div>
            ))}
          </div>
          {/* quick grid */}
          <div className="mt-2.5 grid grid-cols-5 rounded-[14px] py-2" style={card}>
            {quick.map(({ i: I, l }) => (
              <div key={l} className="flex flex-col items-center gap-1">
                <I size={15} style={{ color: 'var(--text-primary)' }} />
                <span className="text-[0.5rem] font-semibold" style={{ color: 'var(--text-muted)' }}>{l}</span>
              </div>
            ))}
          </div>
          {/* portal card */}
          <div className="mt-2.5 flex items-center gap-2 rounded-[14px] px-2.5 py-2" style={card}>
            <GraduationCap size={16} style={{ color: 'var(--accent)' }} />
            <div className="flex-1">
              <div className="text-[0.66rem] font-bold" style={{ color: 'var(--text-primary)' }}>Portal grades</div>
              <div className="text-[0.56rem]" style={{ color: 'var(--accent-text)' }}>2 new grades posted</div>
            </div>
            <ChevronRight size={13} style={{ color: 'var(--text-muted)' }} />
          </div>
          {/* bottom nav pill */}
          <div className="absolute bottom-4 left-1/2 flex h-11 w-[82%] -translate-x-1/2 items-center justify-evenly rounded-full" style={{ background: 'var(--nav)', border: '1px solid var(--line)', ...glassFx, boxShadow: 'var(--nav-shadow)' }}>
            {[Home, Calendar, ListTodo, GraduationCap, User].map((I, i) => (
              <div key={i} className="flex h-8 w-8 items-center justify-center rounded-full" style={i === 0 ? { background: 'var(--accent)', color: 'var(--on-accent)' } : { color: 'var(--nav-ink)' }}>
                <I size={15} />
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* floating notification */}
      <motion.div
        initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.9, duration: 0.6, ease: EASE }}
        className="absolute -right-20 top-[150px] hidden w-[210px] rounded-[16px] px-3 py-2.5 sm:block"
        style={{ ...card, background: 'var(--modal-bg)' }}
      >
        <div className="flex items-center gap-1.5 text-[0.6rem] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          <Bell size={11} style={{ color: 'var(--accent)' }} /> UniMate · now
        </div>
        <div className="mt-1 text-[0.72rem] font-bold leading-snug" style={{ color: 'var(--text-primary)' }}>New grade: Databases II quiz 2</div>
      </motion.div>
    </div>
  );
};

/* ─── Hero ─── */
const Hero = ({ onGetStarted }: { onGetStarted: () => void }) => (
  <section className="mx-auto grid max-w-5xl items-center gap-14 px-5 pb-20 pt-12 md:grid-cols-[1.1fr_1fr] md:pt-20">
    <motion.div initial="hidden" animate="show" variants={stagger}>
      <motion.div variants={fadeUp} className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[0.74rem] font-bold" style={{ ...card, color: 'var(--accent-text)' }}>
        <Sparkles size={13} /> Built for GIU students
      </motion.div>
      <motion.h1 variants={fadeUp} className="mb-0 mt-5 font-extrabold" style={{ fontSize: 'clamp(2.4rem, 6vw, 3.9rem)', lineHeight: 1.02, letterSpacing: '-0.035em', color: 'var(--text-primary)' }}>
        Your whole semester.<br />
        <span style={{ color: 'var(--accent-text)' }}>One calm app.</span>
      </motion.h1>
      <motion.p variants={fadeUp} className="mt-5 max-w-md text-[1.02rem] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        Schedule, grades, materials, to-dos and an AI assistant, all in one place. UniMate syncs with the student portal and pings you the moment a grade or exam seat drops.
      </motion.p>
      <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center gap-3">
        <PrimaryButton onClick={onGetStarted} large>
          Sign in <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
        </PrimaryButton>
        <GhostButton href="#features">See features</GhostButton>
      </motion.div>
      {!SIGNUPS_ENABLED && (
        <motion.div variants={fadeUp} className="mt-5 inline-flex items-center gap-2 text-[0.8rem] font-semibold" style={{ color: 'var(--text-muted)' }}>
          <Lock size={13} /> New sign-ups are paused for now. Existing users can sign in.
        </motion.div>
      )}
      <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[0.8rem] font-semibold" style={{ color: 'var(--text-muted)' }}>
        {['Free', 'No ads', 'Works on any device', 'Installable on iPhone'].map(t => (
          <span key={t} className="inline-flex items-center gap-1.5"><Check size={14} style={{ color: 'var(--accent)' }} />{t}</span>
        ))}
      </motion.div>
    </motion.div>
    <motion.div initial={{ opacity: 0, y: 30, rotate: -2 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ duration: 0.8, delay: 0.2, ease: EASE }}>
      <PhoneMockup />
    </motion.div>
  </section>
);

/* ─── Features ─── */
const FEATURES = [
  { icon: Calendar, title: 'Smart schedule', body: 'Your weekly timetable with custom periods. Import it from a photo or PDF and it builds itself.' },
  { icon: GraduationCap, title: 'Grades & calculator', body: 'Track every course and see exactly what you need on the final with the grade calculator.' },
  { icon: RefreshCw, title: 'Portal sync', body: 'Grades, attendance and exam seats pulled from the student portal every 10 minutes.' },
  { icon: Bell, title: 'Instant alerts', body: 'A push notification the moment something new lands, even when the app is closed.' },
  { icon: Sparkles, title: 'AI assistant', body: 'Ask about your week, your deadlines or your courses. It knows your schedule.' },
  { icon: BookOpen, title: 'Materials', body: 'Keep lecture slides and PDFs per course and read them right inside the app.' },
  { icon: CheckSquare, title: 'To-dos & reminders', body: 'Assignments and tasks with reminders, so nothing slips past a deadline.' },
  { icon: Dumbbell, title: 'Gym tracker', body: 'Log workouts, meals and body stats, and see your progress over the semester.' },
];

const Features = () => (
  <section id="features" className="mx-auto max-w-5xl scroll-mt-24 px-5 pb-24">
    <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} variants={stagger}>
      <motion.div variants={fadeUp} className={sectionLabel} style={{ color: 'var(--accent-text)' }}>Everything in one place</motion.div>
      <motion.h2 variants={fadeUp} className="mb-0 mt-2 max-w-xl font-extrabold" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', letterSpacing: '-0.03em', lineHeight: 1.08, color: 'var(--text-primary)' }}>
        Stop juggling five apps and the portal.
      </motion.h2>
      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ icon: I, title, body }) => (
          <motion.div key={title} variants={fadeUp} whileHover={{ y: -4 }} className="rounded-[22px] p-5" style={card}>
            <div className="flex h-10 w-10 items-center justify-center rounded-[13px]" style={{ background: 'var(--surface-2)', color: 'var(--accent)', border: '1px solid var(--line)' }}>
              <I size={19} />
            </div>
            <div className="mt-4 text-[1rem] font-extrabold" style={{ color: 'var(--text-primary)' }}>{title}</div>
            <p className="mb-0 mt-1.5 text-[0.84rem] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{body}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  </section>
);

/* ─── Portal sync explainer ─── */
const PortalSync = () => {
  const steps = [
    { n: '1', title: 'Connect once', body: 'Add your student portal login once in settings.' },
    { n: '2', title: 'We check every 10 min', body: 'A background job reads your grades, attendance and exam seats.' },
    { n: '3', title: 'You get pinged', body: 'New grade or exam seat? A notification arrives and your schedule updates itself.' },
  ];
  return (
    <section id="portal" className="mx-auto max-w-5xl scroll-mt-24 px-5 pb-24">
      <motion.div
        initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} variants={stagger}
        className="rounded-[28px] p-6 sm:p-10" style={{ ...card, background: 'var(--hero-bg)' }}
      >
        <motion.div variants={fadeUp} className={sectionLabel} style={{ color: 'var(--accent-text)' }}>Portal sync</motion.div>
        <motion.h2 variants={fadeUp} className="mb-0 mt-2 max-w-lg font-extrabold" style={{ fontSize: 'clamp(1.6rem, 3.6vw, 2.3rem)', letterSpacing: '-0.03em', lineHeight: 1.1, color: 'var(--text-primary)' }}>
          Stop refreshing the portal. UniMate does it for you.
        </motion.h2>
        <div className="mt-8 grid gap-3 md:grid-cols-3">
          {steps.map(s => (
            <motion.div key={s.n} variants={fadeUp} className="rounded-[20px] p-5" style={card}>
              <div className="flex h-8 w-8 items-center justify-center rounded-full text-[0.85rem] font-extrabold" style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}>{s.n}</div>
              <div className="mt-3 text-[0.98rem] font-extrabold" style={{ color: 'var(--text-primary)' }}>{s.title}</div>
              <p className="mb-0 mt-1.5 text-[0.84rem] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{s.body}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
};

/* ─── iOS / install ─── */
const InstallSection = () => (
  <section id="ios" className="mx-auto max-w-5xl scroll-mt-24 px-5 pb-24">
    <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} variants={stagger} className="grid gap-3 md:grid-cols-2">
      <motion.div variants={fadeUp} className="rounded-[24px] p-6" style={card}>
        <Smartphone size={22} style={{ color: 'var(--accent)' }} />
        <div className="mt-4 text-[1.15rem] font-extrabold" style={{ color: 'var(--text-primary)' }}>Feels like a native app</div>
        <p className="mb-0 mt-2 text-[0.88rem] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Add UniMate to your home screen, or use the iOS app. Full screen, offline-friendly and fast.
        </p>
      </motion.div>
      <motion.div variants={fadeUp} className="rounded-[24px] p-6" style={card}>
        <ShieldCheck size={22} style={{ color: 'var(--accent)' }} />
        <div className="mt-4 text-[1.15rem] font-extrabold" style={{ color: 'var(--text-primary)' }}>Private by design</div>
        <p className="mb-0 mt-2 text-[0.88rem] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Your data stays in your own account. No ads, and nothing is sold.
        </p>
      </motion.div>
    </motion.div>
  </section>
);

/* ─── Final CTA + footer ─── */
const CTASection = ({ onGetStarted }: { onGetStarted: () => void }) => (
  <section className="mx-auto max-w-5xl px-5 pb-16">
    <motion.div
      initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, ease: EASE }}
      className="relative overflow-hidden rounded-[30px] px-6 py-14 text-center"
      style={{ ...card, background: 'linear-gradient(160deg, rgba(25,184,166,0.28), rgba(37,99,235,0.18) 55%, rgba(219,39,119,0.14))' }}
    >
      <h2 className="m-0 font-extrabold" style={{ fontSize: 'clamp(1.8rem, 4.5vw, 2.8rem)', letterSpacing: '-0.035em', color: 'var(--text-primary)' }}>
        Ready for a calmer semester?
      </h2>
      <p className="mx-auto mb-0 mt-3 max-w-md text-[0.95rem]" style={{ color: 'var(--text-muted)' }}>
        {SIGNUPS_ENABLED ? 'Create your account in under a minute.' : 'New sign-ups are paused for now. Already have an account? Jump back in.'}
      </p>
      <div className="mt-7 flex justify-center">
        <PrimaryButton onClick={onGetStarted} large>Sign in <ArrowRight size={18} /></PrimaryButton>
      </div>
    </motion.div>
    <footer className="mt-10 flex flex-col items-center justify-between gap-3 text-[0.8rem] sm:flex-row" style={{ color: 'var(--text-muted)' }}>
      <Logo />
      <span>© {new Date().getFullYear()} UniMate · Made in Cairo</span>
    </footer>
  </section>
);

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => (
  <div
    className="h-[100dvh] overflow-y-auto overflow-x-hidden"
    style={{
      background: 'var(--bg)',
      color: 'var(--text-primary)',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      scrollBehavior: 'smooth',
    }}
  >
    <Nav onGetStarted={onGetStarted} />
    <Hero onGetStarted={onGetStarted} />
    <Features />
    <PortalSync />
    <InstallSection />
    <CTASection onGetStarted={onGetStarted} />
  </div>
);

export default LandingPage;
