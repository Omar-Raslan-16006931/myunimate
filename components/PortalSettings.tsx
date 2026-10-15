import React, { useEffect, useState } from 'react';
import { Loader2, RefreshCw, Check, GraduationCap, CircleUser, AlarmClock, Bell, Smartphone, Send, PartyPopper, CalendarDays, ChevronDown, ChevronRight, MoreHorizontal, Pencil, Unplug } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Collapse from './ui/Collapse';
import { setCmsAlerts, getCmsAlertsOn } from '../services/cms';
import { toast } from 'react-hot-toast';
import OnboardSteps from './OnboardSteps';
import Sheet from './Sheet';
import { ntfyRemindersEnabled, setNtfyReminders } from '../services/ntfyReminders';
import { getPortalAccount, savePortalLogin, syncPortal, removePortalLogin, setPortalAlerts, setBarkKey, setPortalNotify, getPortalNotifyOn, testPortalAlert, getPortalAlertTopic, getPortalSchedule, timeAgo, readPortalCache, writePortalCache, PortalAccount, PortalClass } from '../services/portal';

const BARK_APP = 'https://apps.apple.com/app/bark-customed-notifications/id1403753865';
const GUIDE_KEY = 'portal_setup_v1';
type GuideFlags = { subscribed?: string; tested?: string; skipped?: boolean; classes?: boolean };
const readGuide = (): GuideFlags => {
  try { return JSON.parse(localStorage.getItem(GUIDE_KEY) || '{}'); } catch { return {}; }
};
const writeGuide = (f: GuideFlags) => {
  try { localStorage.setItem(GUIDE_KEY, JSON.stringify(f)); } catch { /* private mode */ }
};

/** The student only ever sees a short plain sentence, never server details. */
const plainError = (res: { code?: string }, what = 'connect to the portal'): string =>
  res.code === 'PORTAL_LOGIN_FAILED' ? "Those portal details didn't work. Use the login you use on the GIU portal, not your UniMate one."
  : res.code === 'NO_CREDENTIALS' ? 'Connect your portal first.'
  : `Couldn't ${what} right now. Try again in a minute.`;

/** A row with a switch, used on the compact Settings card. */
const AlertRow: React.FC<{ tile: React.ReactNode; title: string; sub: string; on: boolean; busy: boolean; disabled: boolean; onToggle: () => void }> =
  ({ tile, title, sub, on, busy, disabled, onToggle }) => (
    <div className="flex items-center gap-3 border-t border-white/[0.06] px-3.5 py-3">
      {tile}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold text-white">{title}</div>
        <div className="truncate text-xs text-white/50">{sub}</div>
      </div>
      <button type="button" role="switch" aria-checked={on} aria-label={title} onClick={onToggle} disabled={disabled}
        className="relative h-[30px] w-[50px] shrink-0 rounded-full border-0 p-0 transition-colors duration-200"
        style={{ background: on ? '#14b8a6' : 'rgba(255,255,255,0.14)' }}>
        {busy
          ? <span className="absolute inset-0 flex items-center justify-center text-white"><Loader2 size={14} className="animate-spin" /></span>
          : <motion.span initial={false} className="absolute left-[3px] top-[3px] h-6 w-6 rounded-full bg-white" style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.25)' }} animate={{ x: on ? 20 : 0 }} transition={{ type: 'spring', stiffness: 520, damping: 32 }} />}
      </button>
    </div>
  );

/** A choice with a switch, used on the onboarding alerts step. */
const AlertChoice: React.FC<{ tint: string; icon: React.ReactNode; title: string; sub: string; on: boolean; onToggle: () => void }> =
  ({ tint, icon, title, sub, on, onToggle }) => (
    <button type="button" role="switch" aria-checked={on} onClick={onToggle}
      className="flex w-full items-center gap-3 rounded-xl border border-white/5 bg-black/40 p-3 text-left">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tint}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-white">{title}</span>
        <span className="block text-xs text-white/50">{sub}</span>
      </span>
      <span className="relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors duration-200" style={{ background: on ? '#14b8a6' : 'rgba(255,255,255,0.14)' }}>
        <span className="absolute left-[3px] top-[3px] h-5 w-5 rounded-full bg-white transition-transform duration-200" style={{ transform: on ? 'translateX(18px)' : 'none' }} />
      </span>
    </button>
  );

type Flow = 'login' | 'classes' | 'alerts' | 'ntfy' | 'test' | 'done';
/** Position in the step bar (0 is the app account, which is already made by now). */
const BAR: Record<Flow, number> = { login: 2, classes: 3, alerts: 4, ntfy: 4, test: 5, done: 6 };

interface Props {
  /** Full-screen onboarding instead of the small Settings card. */
  fullscreen?: boolean;
  onFinish?: () => void;
  /** When given, the flow has an "Import classes" step. Returns how many classes were new. */
  onImportClasses?: (classes: PortalClass[]) => Promise<number>;
}

/**
 * Uni portal login, class import and phone alerts as one step-by-step flow.
 * Settings shows it as a card; onboarding shows it full screen.
 */
const PortalSettings: React.FC<Props> = ({ fullscreen = false, onFinish, onImportClasses }) => {
  // show the saved copy right away, then refresh it from the server
  const cached = readPortalCache<{ account: PortalAccount | null; topic: string | null; cmsOn?: boolean; portalOn?: boolean }>('settings');
  const [account, setAccount] = useState<PortalAccount | null>(cached?.account ?? null);
  const [loaded, setLoaded] = useState(!!cached);
  const [rowBusy, setRowBusy] = useState<'portal' | 'cls' | 'cms' | null>(null);
  const [username, setUsername] = useState(cached?.account?.username ?? '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'save' | 'sync' | 'remove' | 'alerts' | 'test' | 'classes' | 'cms' | null>(null);
  const [cmsOn, setCmsOn] = useState(cached?.cmsOn ?? false);      // phone alerts for new CMS files
  const [portalOn, setPortalOn] = useState(cached?.portalOn ?? true);    // alerts for grades, absences, exam seats
  // the choices on the onboarding alerts step
  const [wantPortal, setWantPortal] = useState(true);
  const [wantClass, setWantClass] = useState(true);
  const [wantCms, setWantCms] = useState(true);
  const [topic, setTopic] = useState<string | null>(cached?.topic ?? null);
  const [guide, setGuideState] = useState<GuideFlags>(readGuide);
  const [editing, setEditing] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [classError, setClassError] = useState<string | null>(null);
  const [found, setFound] = useState<PortalClass[] | null>(null); // classes read from the portal, waiting to be added
  const [sentTest, setSentTest] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [classRem, setClassRem] = useState(() => ntfyRemindersEnabled());
  const [barkKey, setBarkKeyText] = useState('');
  const [confirmDisc, setConfirmDisc] = useState(false);
  const [, setConfirmCode] = useState(false);
  const [saved, setSaved] = useState(false);       // the login was accepted just now
  const [moment, setMoment] = useState<{ title: string; sub: string } | null>(null); // a short "done" screen before the next step
  const celebrate = !!moment;
  // show a tick + message for a moment after a step is finished (onboarding only), then move on
  const confirmStep = (title: string, sub: string, ms = 1300) => {
    if (!fullscreen) return;
    setMoment({ title, sub });
    setTimeout(() => setMoment(null), ms);
  };
  const setGuide = (patch: GuideFlags) => setGuideState(g => { const n = { ...g, ...patch }; writeGuide(n); return n; });

  const load = async () => {
    try {
      const a = await getPortalAccount(true);
      const t = a ? await getPortalAlertTopic() : null;
      let cms = cmsOn, portal = portalOn;
      if (a) { cms = await getCmsAlertsOn(); portal = await getPortalNotifyOn(); setCmsOn(cms); setPortalOn(portal); }
      setAccount(a);
      if (a) setUsername(a.username);
      setTopic(t);
      // the switches are remembered too, so they are drawn in the right place straight away
      writePortalCache('settings', { account: a, topic: t, cmsOn: cms, portalOn: portal });
    } catch {
      /* offline: keep the saved copy */
    } finally {
      setLoaded(true);
    }
  };
  useEffect(() => { load(); }, []);
  // keep the saved copy in step with every change, so the switches never replay their animation
  useEffect(() => { if (loaded && account) writePortalCache('settings', { account, topic, cmsOn, portalOn }); }, [loaded, account, topic, cmsOn, portalOn]);

  const save = async () => {
    setLoginError(null);
    setBusy('save');
    const res = await savePortalLogin(username.trim(), password);
    setBusy(null);
    setPassword('');
    if (!res.ok) {
      // a wrong login is never saved by the server, so there is nothing to refresh
      setLoginError(plainError(res));
      return;
    }
    setSaved(true);
    setMoment({ title: 'Portal connected', sub: 'Your login works.' }); // success first…
    await Promise.all([load(), new Promise(r => setTimeout(r, 1500))]);
    setMoment(null);                          // …then on to the next step
    setEditing(false);
  };

  const sync = async () => {
    setBusy('sync');
    const res = await syncPortal();
    setBusy(null);
    await load();
    if (res.ok) toast.success(res.newGrades ? `${res.newGrades} new grade${res.newGrades === 1 ? '' : 's'}` : 'Up to date');
    else toast.error(plainError(res, 'check the portal'));
  };

  const remove = async () => {
    setBusy('remove');
    const res = await removePortalLogin();
    setBusy(null);
    if (res.ok) {
      setAccount(null);
      setUsername('');
      setPassword('');
      toast('Portal login removed');
    } else toast.error(res.message || 'Could not remove the portal login.');
  };

  /**
   * The three alert choices (grades/absences/exams, class reminders, new CMS files).
   * The ntfy channel exists only while at least one is on; with all three off it is switched off.
   */
  const applyAlerts = async (next: { portal: boolean; cls: boolean; cms: boolean }): Promise<boolean> => {
    const any = next.portal || next.cls || next.cms;
    setBusy('alerts');
    try {
      let t = topic;
      if (any !== !!t) {
        const res = await setPortalAlerts(any);
        if (!res.ok) { toast.error(res.message || 'Could not change phone alerts.'); return false; }
        t = res.topic ?? null;
        setTopic(t);
      }
      if (next.portal !== portalOn) {
        const r = await setPortalNotify(next.portal);
        if (!r.ok) toast.error(r.message || 'Could not change grade alerts.'); else setPortalOn(next.portal);
      }
      if (next.cms !== cmsOn) {
        const r = await setCmsAlerts(next.cms);
        if (!r.ok) toast.error(r.message || 'Could not change CMS alerts.'); else setCmsOn(next.cms);
      }
      if (next.cls !== classRem) { setClassRem(next.cls); setNtfyReminders(next.cls); }
      setGuide({ skipped: !t });
      return true;
    } finally {
      setBusy(null);
    }
  };

  // iPhone alternative to ntfy: the student pastes the key shown in the Bark app
  const useBark = async () => {
    setBusy('alerts');
    const res = await setBarkKey(barkKey);
    setBusy(null);
    if (res.ok && res.topic) {
      setTopic(res.topic);
      setBarkKeyText('');
      setGuide({ subscribed: res.topic }); // nothing to subscribe to in Bark, so go straight to the test
      toast.success('Bark connected');
    } else toast.error(res.message || 'Could not connect Bark.');
  };

  const testAlert = async () => {
    setBusy('test');
    const res = await testPortalAlert();
    setBusy(null);
    if (res.ok) { setSentTest(true); toast.success(`Test sent. Check your phone.${(res as { where?: string }).where ? ` (${(res as { where?: string }).where})` : ''}`); }
    else toast.error(res.message || 'Could not send the test.');
  };

  // 1) read the portal schedule and show what was found
  const importClasses = async () => {
    setClassError(null);
    setBusy('classes');
    const res = await getPortalSchedule();
    setBusy(null);
    if (!res.ok) { setClassError(plainError(res, 'read your schedule')); return; }
    if (!res.classes?.length) { setClassError('No classes found on your portal schedule.'); return; }
    setFound(res.classes);
  };

  // 2) add what is left after the student removed any they do not want
  const addFound = async () => {
    if (!onImportClasses || !found?.length) return;
    setBusy('classes');
    try {
      const added = await onImportClasses(found);
      toast.success(added ? `Added ${added} class${added === 1 ? '' : 'es'}` : 'Your classes are already in');
      confirmStep(added ? `${added} class${added === 1 ? '' : 'es'} added` : 'Classes are in', 'They are on your schedule now.');
      setFound(null);
      setGuide({ classes: true });
    } catch {
      toast.error('Could not add the classes. Try again.');
    }
    setBusy(null);
  };

  // one flow: login → classes → alerts → ntfy → test → done
  const loggedIn = (!!account?.last_ok_at || (saved && !!account)) && !editing;
  const flow: Flow =
    !loggedIn ? 'login'
    : onImportClasses && !guide.classes ? 'classes'
    : !topic ? (guide.skipped ? 'done' : 'alerts')
    : guide.tested === topic ? 'done'
    : guide.subscribed !== topic ? 'ntfy'
    : 'test';

  const big = fullscreen;
  const input = `w-full rounded-xl border border-white/5 bg-black/40 px-4 ${big ? 'py-4 text-base' : 'py-3 text-sm'} text-white placeholder-white/30 focus:border-teal-500/50 focus:outline-none`;
  const primary = `flex w-full items-center justify-center gap-2 ${big ? 'rounded-2xl py-4 text-base' : 'rounded-xl py-3 text-sm'} bg-teal-600 font-bold text-white disabled:opacity-40`;
  const quiet = `w-full py-2 ${big ? 'text-sm' : 'text-xs'} font-semibold text-white/40 disabled:opacity-40`;
  const spin = <Loader2 size={15} className="animate-spin" />;

  if (!loaded) return <div className={`flex justify-center py-6 text-white/40 ${big ? 'fixed inset-0 z-[3000] items-center bg-[#0f0f16]' : ''}`}>{spin}</div>;

  const errorText = (t: string | null) => t ? <p className="text-center text-[13px] font-semibold text-red-400">{t}</p> : undefined;

  const helpList = (
    <div className="rounded-xl border border-white/5 bg-black/40 p-3.5 text-left text-[13px] leading-snug text-white/70">
      <div className="mb-2 font-bold text-white">Not receiving alerts?</div>
      <ol className="list-decimal space-y-1.5 pl-4">
        <li>Turn your <b className="text-white">VPN off</b>.</li>
        <li>iPhone Settings → Notifications → Bark → turn <b className="text-white">Allow Notifications</b> on, with Lock Screen and Banners ticked.</li>
        <li>Turn off Low Power Mode and any Focus that mutes Bark.</li>
        <li>In Bark, check the key you pasted in UniMate is the one Bark shows now.</li>
        <li>Swipe Bark away, then send the test again.</li>
      </ol>
    </div>
  );

  const connectedView = (
    <motion.div key="connected" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ type: 'spring', damping: 20, stiffness: 260 }}
      className={`flex flex-col items-center justify-center text-center ${big ? 'mx-auto w-full max-w-[420px] flex-1 px-5 pb-10' : 'py-8'}`}>
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 11, stiffness: 220, delay: 0.1 }}
        className="flex h-20 w-20 items-center justify-center rounded-full bg-teal-500 text-black" style={{ boxShadow: '0 10px 34px rgba(20,184,166,0.45)' }}>
        <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.3, duration: 0.4, ease: 'easeOut' }} />
        </svg>
      </motion.div>
      <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className={`${big ? 'mt-6 text-[28px]' : 'mt-4 text-xl'} font-extrabold tracking-tight text-white`}>{moment?.title}</motion.h1>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className={`${big ? 'mt-1.5 text-[15px]' : 'mt-1 text-sm'} text-white/50`}>{moment?.sub}</motion.p>
    </motion.div>
  );

  // each step: icon, title, short line, the fields, and the buttons
  const screens: Record<Exclude<Flow, 'done'>, { icon: React.ReactNode; title: string; sub: string; fields?: React.ReactNode; actions: React.ReactNode }> = {
    login: {
      icon: <GraduationCap size={30} />,
      title: editing ? 'Change login' : 'Connect GIU portal',
      sub: 'Your portal login, not UniMate',
      fields: (
        <div className="space-y-2.5">
          <input className={input} value={username} onChange={e => { setUsername(e.target.value); setLoginError(null); }} placeholder="Username" name="portal-username" data-lpignore="true" data-form-type="other"
            autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="off" />
          <input className={input} type="password" value={password} onChange={e => { setPassword(e.target.value); setLoginError(null); }} placeholder="Password" autoComplete="new-password"
            onKeyDown={e => { if (e.key === 'Enter' && password && username.trim() && busy === null) save(); }} />
          {errorText(loginError)}
          {!loginError && !editing && <p className="text-center text-xs leading-snug text-white/40">This login also opens your CMS course files in Materials.</p>}
          {!loginError && account?.last_status === 'error' && !editing && account.last_error && (
            <p className="text-center text-xs text-amber-400">Couldn't check the portal last time. Connect again.</p>
          )}
        </div>
      ),
      actions: (
        <>
          <button onClick={save} disabled={busy !== null || !password || !username.trim()} className={primary}>
            {busy === 'save' ? <>{spin} Checking…</> : 'Connect'}
          </button>
          {editing && <button onClick={() => { setEditing(false); setPassword(''); setLoginError(null); }} className={quiet}>Cancel</button>}
        </>
      ),
    },
    classes: {
      icon: <CalendarDays size={30} />,
      title: 'Import classes',
      sub: 'From your portal, all periods',
      fields: errorText(classError),
      actions: (
        <>
          <button onClick={importClasses} disabled={busy !== null} className={primary}>
            {busy === 'classes' ? <>{spin} Reading…</> : classError ? 'Try again' : 'Import my classes'}
          </button>
          <button onClick={() => setGuide({ classes: true })} disabled={busy !== null} className={quiet}>Skip</button>
        </>
      ),
    },
    alerts: {
      icon: <Bell size={30} />,
      title: 'Get alerts?',
      sub: 'Pick what you want a ping for',
      fields: (
        <div className="space-y-2.5">
          <AlertChoice tint="bg-amber-500/20 text-amber-300" icon={<Bell size={18} />} title="Grades, absences, exams" sub="New grade, absence or exam seat"
            on={wantPortal} onToggle={() => setWantPortal(v => !v)} />
          <AlertChoice tint="bg-violet-500/20 text-violet-300" icon={<AlarmClock size={18} />} title="Class reminders" sub="15 min before each class"
            on={wantClass} onToggle={() => setWantClass(v => !v)} />
          <AlertChoice tint="bg-emerald-500/20 text-emerald-300" icon={<GraduationCap size={18} />} title="New CMS files" sub="When a teacher adds a file"
            on={wantCms} onToggle={() => setWantCms(v => !v)} />
          {!(wantPortal || wantClass || wantCms) && <p className="px-1 pt-1 text-xs text-white/40">All off, so there is nothing to set up. You can turn alerts on later in Settings.</p>}
        </div>
      ),
      actions: (
        <button onClick={() => applyAlerts({ portal: wantPortal, cls: wantClass, cms: wantCms })} disabled={busy !== null} className={primary}>
          {busy === 'alerts' ? spin : (wantPortal || wantClass || wantCms) ? 'Turn on' : 'Continue'}
        </button>
      ),
    },
    ntfy: {
      icon: <Smartphone size={30} />,
      title: 'Set up Bark',
      sub: 'A free iPhone app that shows the alerts',
      fields: (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/40 p-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-500 text-[11px] font-extrabold text-black">1</span>
            <span className="min-w-0 flex-1 text-sm font-semibold text-white">Install Bark</span>
            <a href={BARK_APP} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white">Get app</a>
          </div>
          <div className="rounded-xl border border-white/5 bg-black/40 p-3">
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-500 text-[11px] font-extrabold text-black">2</span>
              <span className="min-w-0 flex-1 text-sm font-semibold text-white">Open Bark, copy the key it shows, paste it here</span>
            </div>
            <input className={`${input} mt-2.5`} value={barkKey} onChange={e => setBarkKeyText(e.target.value)} placeholder="Paste your Bark key" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="off" />
          </div>
        </div>
      ),
      actions: <button onClick={useBark} disabled={busy !== null || barkKey.trim().length < 10} className={primary}>{busy === 'alerts' ? spin : 'Connect Bark'}</button>,
    },
    test: {
      icon: <Send size={30} />,
      title: sentTest ? 'Did it arrive?' : 'Send a test',
      sub: sentTest ? 'Check Bark on your phone' : 'You should get a ping',
      fields: showHelp ? helpList : undefined,
      actions: sentTest ? (
        <>
          <button onClick={() => { confirmStep('Test received', 'Alerts work.'); setGuide({ tested: topic ?? undefined }); }} className={primary}><Check size={16} strokeWidth={3} /> Yes, I got it</button>
          <button onClick={() => setShowHelp(v => !v)} className={quiet}>{showHelp ? 'Hide help' : 'No, not receiving alerts'}</button>
          <button onClick={testAlert} disabled={busy !== null} className={quiet}>{busy === 'test' ? 'Sending…' : 'Send again'}</button>
        </>
      ) : (
        <>
          <button onClick={testAlert} disabled={busy !== null} className={primary}>{busy === 'test' ? spin : 'Send test'}</button>
          <button onClick={() => setGuide({ tested: topic ?? undefined })} className={quiet}>Skip</button>
        </>
      ),
    },
  };

  // ── compact card (Settings) ──
  if (!fullscreen) {
    if (celebrate) return <div className="rounded-2xl border border-white/5 bg-black/30 p-4">{connectedView}</div>;
    if (flow === 'done') {
      const err = account!.last_status === 'error';
      const tile = (bg: string, icon: React.ReactNode) => <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] ${bg}`}>{icon}</div>;
      return (
        <div>
          {/* one box: portal, alerts, test */}
          <div className="overflow-hidden rounded-[22px] border border-white/[0.06] bg-white/5">
            <div className="p-3.5">
              <div className="flex items-center gap-3">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] ${err ? 'bg-amber-500/20 text-amber-300' : 'bg-teal-500/20 text-teal-300'}`}><CircleUser size={22} /></div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[16px] font-bold text-white">{account!.username}</div>
                  <div className="mt-0.5 flex items-center gap-1.5 whitespace-nowrap text-[12px]">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${err ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                    <span className={`truncate ${err ? 'text-amber-300' : 'text-emerald-300/90'}`}>{err ? "Portal check failed" : (account!.last_sync_at ? `Checked ${timeAgo(account!.last_sync_at)}` : "Not checked yet")}</span>
                  </div>
                </div>
                <button onClick={() => setShowManage(true)} aria-label="More" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-0 bg-white/[0.07] text-white/80"><MoreHorizontal size={20} /></button>
              </div>
              <button onClick={sync} disabled={busy !== null}
                className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border-0 bg-teal-500 text-[14px] font-bold text-[#03201c] disabled:opacity-60">
                {busy === 'sync' ? <><Loader2 size={16} className="animate-spin" /> Checking…</> : <><RefreshCw size={15} /> Check now</>}
              </button>
            </div>

            {(() => {
              const cur = { portal: !!topic && portalOn, cls: !!topic && classRem, cms: !!topic && cmsOn };
              const row = (key: keyof typeof cur, bg: string, icon: React.ReactNode, title: string, sub: string) => (
                <AlertRow key={key} tile={tile(bg, icon)} title={title} sub={sub} on={cur[key]} busy={busy === 'alerts' && rowBusy === key} disabled={busy !== null}
                  onToggle={() => { setRowBusy(key); applyAlerts({ ...cur, [key]: !cur[key] }); }} />
              );
              return <>
                {row('portal', 'bg-amber-500/20 text-amber-300', <Bell size={18} />, 'Grades, absences, exams', 'New grade, absence or exam seat')}
                {row('cls', 'bg-violet-500/20 text-violet-300', <AlarmClock size={18} />, 'Class reminders', '15 min before each class')}
                {row('cms', 'bg-emerald-500/20 text-emerald-300', <GraduationCap size={18} />, 'New CMS files', 'When a teacher adds something')}
              </>;
            })()}

            {topic && (
              <button onClick={testAlert} disabled={busy !== null}
                className="flex w-full items-center gap-3 border-0 border-t border-white/[0.06] bg-transparent px-3.5 py-3 text-left disabled:opacity-60">
                {tile('bg-sky-500/20 text-sky-300', busy === 'test' ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />)}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-white">Send a test</div>
                  <div className="truncate text-xs text-white/50">Make sure it reaches your phone</div>
                </div>
                <ChevronRight size={18} className="shrink-0 text-white/25" />
              </button>
            )}
          </div>
          {topic && (
            <div className="mt-1.5">
              <button onClick={() => setShowHelp(v => !v)} className="flex w-full items-center justify-center gap-1 border-0 bg-transparent py-2.5 text-xs font-semibold text-white/45">
                Not receiving alerts? <ChevronDown size={13} className={`transition-transform duration-300 ${showHelp ? 'rotate-180' : ''}`} />
              </button>
              <Collapse open={showHelp}><div className="mt-1">{helpList}</div></Collapse>
            </div>
          )}

          {/* rare actions live in a sheet */}
          <Sheet open={showManage} onClose={() => { if (busy === null) { setShowManage(false); setConfirmDisc(false); setConfirmCode(false); } }}>
            <div className="px-5 pb-6 pt-1">
              <div className="mb-4 text-center">
                <div className="text-[19px] font-extrabold">Uni Portal</div>
                <div className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{account!.username}</div>
              </div>
              {!confirmDisc ? (
                <div className="space-y-2.5">
                  <button onClick={() => { setShowManage(false); setEditing(true); }}
                    className="flex w-full items-center gap-3 rounded-2xl border-0 p-3.5 text-left" style={{ background: 'var(--sheet-field)', color: 'var(--text-primary)' }}>
                    <span className="flex h-10 w-10 items-center justify-center rounded-[14px]" style={{ background: 'var(--surface-2)' }}><Pencil size={17} /></span>
                    <span className="flex-1"><span className="block text-[15px] font-bold">Change login</span><span className="block text-xs" style={{ color: 'var(--text-muted)' }}>New portal username or password</span></span>
                  </button>
                  <button onClick={() => setConfirmDisc(true)}
                    className="flex w-full items-center gap-3 rounded-2xl border-0 p-3.5 text-left" style={{ background: 'var(--sheet-field)', color: 'var(--danger)' }}>
                    <span className="flex h-10 w-10 items-center justify-center rounded-[14px]" style={{ background: 'rgba(255,90,95,0.14)' }}><Unplug size={17} /></span>
                    <span className="flex-1"><span className="block text-[15px] font-bold">Disconnect</span><span className="block text-xs" style={{ color: 'var(--text-muted)' }}>Removes your login and stops alerts</span></span>
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <p className="mb-4 text-[14px]" style={{ color: 'var(--text-muted)' }}>Disconnect your portal? Your grades stay, but alerts stop until you connect again.</p>
                  <button onClick={async () => { await remove(); setShowManage(false); setConfirmDisc(false); }} disabled={busy !== null}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border-0 py-3.5 text-[16px] font-extrabold text-white disabled:opacity-60" style={{ background: 'var(--danger)' }}>
                    {busy === 'remove' ? <Loader2 size={18} className="animate-spin" /> : 'Disconnect'}
                  </button>
                  <button onClick={() => setConfirmDisc(false)} disabled={busy !== null}
                    className="mt-2 w-full rounded-2xl border-0 py-3.5 text-[16px] font-bold" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}>Cancel</button>
                </div>
              )}
            </div>
          </Sheet>
        </div>
      );
    }
    const sc = screens[flow];
    const at = flow === 'login' || flow === 'classes' ? 0 : flow === 'test' ? 2 : 1;
    return (
      <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
        {!editing && (
          <div className="mb-4 flex gap-1">
            {[0, 1, 2].map(i => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-500 ${i < at ? 'bg-teal-500' : i === at ? 'bg-teal-500/40' : 'bg-white/10'}`} />
            ))}
          </div>
        )}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={flow + (editing ? '-edit' : '')} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}>
            <div className="mb-4 text-center">
              <div className="text-lg font-bold text-white">{sc.title}</div>
              <div className="text-xs text-white/50">{sc.sub}</div>
            </div>
            {sc.fields && <div className="mb-3">{sc.fields}</div>}
            {sc.actions}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // ── full screen (onboarding) ──
  const finish = () => onFinish?.();
  return (
    <div className="fixed inset-0 z-[3000] flex flex-col bg-[#0f0f16] text-white" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
      <div className="flex shrink-0 items-center justify-between px-5 pt-4">
        <span className="text-xs font-bold uppercase tracking-wider text-white/30">{flow === 'done' ? 'All done' : `Step ${BAR[flow] + 1} of 6`}</span>
        {flow !== 'done' && <button onClick={finish} className="border-0 bg-transparent p-1 text-sm font-semibold text-white/40">Skip all</button>}
      </div>
      <div className="mx-auto w-full max-w-[420px] shrink-0 px-5 pt-5">
        <OnboardSteps current={BAR[flow]} />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {celebrate ? connectedView : flow === 'classes' && found ? (
          <motion.div key="review" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}
            className="mx-auto flex min-h-0 w-full max-w-[420px] flex-1 flex-col px-5 pb-10">
            <div className="shrink-0 pt-6 text-center">
              <h1 className="text-[28px] font-extrabold tracking-tight">Found {found.length} class{found.length === 1 ? '' : 'es'}</h1>
              <p className="mt-1.5 text-[15px] text-white/50">Tap ✕ to remove one</p>
            </div>
            <div className="mt-5 min-h-0 flex-1 overflow-y-auto rounded-2xl border border-white/5 bg-black/30">
              {found.map((c, i) => (
                <div key={`${c.day}-${c.period_number}-${c.course_name}`} className={`flex items-center gap-3 px-4 py-3 ${i ? 'border-t border-white/5' : ''}`}>
                  <div className="w-9 shrink-0 text-xs font-extrabold uppercase text-teal-400">{c.day.slice(0, 3)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">{c.course_name}</div>
                    <div className="truncate text-xs text-white/50">{c.time_start}–{c.time_end}{c.room ? ` · ${c.room}` : ''}{c.type !== 'other' ? ` · ${c.type[0].toUpperCase()}${c.type.slice(1)}` : ''}</div>
                  </div>
                  <button onClick={() => setFound(prev => prev && prev.filter((_, j) => j !== i))} aria-label="Remove"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-0 bg-white/10 text-white/60">✕</button>
                </div>
              ))}
              {!found.length && <div className="p-6 text-center text-sm text-white/40">Nothing left to add</div>}
            </div>
            <div className="shrink-0 pt-4">
              <button onClick={addFound} disabled={busy !== null || !found.length} className={primary}>
                {busy === 'classes' ? <>{spin} Adding…</> : `Add ${found.length} class${found.length === 1 ? '' : 'es'}`}
              </button>
              <button onClick={() => setFound(null)} disabled={busy !== null} className={quiet}>Back</button>
            </div>
          </motion.div>
        ) : flow === 'done' ? (
          <motion.div key="done" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
            className="mx-auto flex w-full max-w-[420px] flex-1 flex-col px-5 pb-10">
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-teal-500/15 text-teal-400"><PartyPopper size={34} /></div>
              <h1 className="mt-6 text-[28px] font-extrabold tracking-tight">You're all set</h1>
              <p className="mt-1.5 text-[15px] text-white/50">{topic ? 'Alerts are on.' : 'You can turn on alerts later in Settings.'}</p>
            </div>
            <button onClick={finish} className={primary}>Open UniMate</button>
          </motion.div>
        ) : (
          <motion.div key={flow} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}
            className="mx-auto flex w-full max-w-[420px] flex-1 flex-col overflow-y-auto px-5 pb-10">
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-teal-500/15 text-teal-400">{screens[flow].icon}</div>
              <h1 className="mt-6 text-[28px] font-extrabold tracking-tight">{screens[flow].title}</h1>
              <p className="mt-1.5 text-[15px] text-white/50">{screens[flow].sub}</p>
              {screens[flow].fields && <div className="mt-7 w-full text-left">{screens[flow].fields}</div>}
            </div>
            <div className="shrink-0 pt-4">{screens[flow].actions}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PortalSettings;
