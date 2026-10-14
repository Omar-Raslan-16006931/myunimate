import React, { useEffect, useState } from 'react';
import { Loader2, RefreshCw, AlertTriangle, Check, Copy, GraduationCap, Bell, Smartphone, Send, PartyPopper, CalendarDays, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import OnboardSteps from './OnboardSteps';
import { getPortalAccount, savePortalLogin, syncPortal, removePortalLogin, setPortalAlerts, testPortalAlert, getPortalAlertTopic, getPortalSchedule, timeAgo, readPortalCache, writePortalCache, PortalAccount, PortalClass } from '../services/portal';

const NTFY_APP = 'https://apps.apple.com/app/ntfy/id1625396347';
const GUIDE_KEY = 'portal_setup_v1';
type GuideFlags = { subscribed?: string; tested?: string; skipped?: boolean; classes?: boolean };
const readGuide = (): GuideFlags => {
  try { return JSON.parse(localStorage.getItem(GUIDE_KEY) || '{}'); } catch { return {}; }
};
const writeGuide = (f: GuideFlags) => {
  try { localStorage.setItem(GUIDE_KEY, JSON.stringify(f)); } catch { /* private mode */ }
};

type Flow = 'login' | 'classes' | 'alerts' | 'ntfy' | 'test' | 'done';
/** Position in the step bar (0 is the app account, which is already made by now). */
const BAR: Record<Flow, number> = { login: 1, classes: 2, alerts: 3, ntfy: 3, test: 4, done: 5 };

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
  const cached = readPortalCache<{ account: PortalAccount | null; topic: string | null }>('settings');
  const [account, setAccount] = useState<PortalAccount | null>(cached?.account ?? null);
  const [loaded, setLoaded] = useState(!!cached);
  const [refreshing, setRefreshing] = useState(true);
  const [username, setUsername] = useState(cached?.account?.username ?? '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'save' | 'sync' | 'remove' | 'alerts' | 'test' | 'classes' | null>(null);
  const [topic, setTopic] = useState<string | null>(cached?.topic ?? null);
  const [guide, setGuideState] = useState<GuideFlags>(readGuide);
  const [editing, setEditing] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [classError, setClassError] = useState<string | null>(null);
  const [found, setFound] = useState<PortalClass[] | null>(null); // classes read from the portal, waiting to be added
  const [sentTest, setSentTest] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const setGuide = (patch: GuideFlags) => setGuideState(g => { const n = { ...g, ...patch }; writeGuide(n); return n; });

  const load = async () => {
    setRefreshing(true);
    try {
      const a = await getPortalAccount(true);
      const t = a ? await getPortalAlertTopic() : null;
      setAccount(a);
      if (a) setUsername(a.username);
      setTopic(t);
      writePortalCache('settings', { account: a, topic: t });
    } catch {
      /* offline: keep the saved copy */
    } finally {
      setLoaded(true);
      setRefreshing(false);
    }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setLoginError(null);
    setBusy('save');
    const res = await savePortalLogin(username.trim(), password);
    setBusy(null);
    setPassword('');
    if (!res.ok) {
      // a wrong login is never saved by the server, so there is nothing to refresh
      setLoginError(res.message || 'Could not connect to the portal.');
      return;
    }
    await load();
    setEditing(false);
    toast.success('Portal connected');
  };

  const sync = async () => {
    setBusy('sync');
    const res = await syncPortal();
    setBusy(null);
    await load();
    if (res.ok) toast.success(res.newGrades ? `${res.newGrades} new grade${res.newGrades === 1 ? '' : 's'}` : 'Up to date');
    else toast.error(res.message || 'Sync failed.');
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

  const toggleAlerts = async () => {
    setBusy('alerts');
    const res = await setPortalAlerts(!topic);
    setBusy(null);
    if (res.ok) { setTopic(res.topic ?? null); setGuide({ skipped: !res.topic }); }
    else toast.error(res.message || 'Could not change phone alerts.');
  };

  const testAlert = async () => {
    setBusy('test');
    const res = await testPortalAlert();
    setBusy(null);
    if (res.ok) { setSentTest(true); toast.success('Test sent. Check your phone.'); }
    else toast.error(res.message || 'Could not send the test.');
  };

  const copyTopic = async () => {
    try {
      await navigator.clipboard.writeText(topic ?? '');
      toast.success('Copied');
    } catch {
      toast.error('Could not copy. Select the text and copy it by hand.');
    }
  };

  // 1) read the portal schedule and show what was found
  const importClasses = async () => {
    setClassError(null);
    setBusy('classes');
    const res = await getPortalSchedule();
    setBusy(null);
    if (!res.ok) { setClassError(res.message || 'Could not read the portal.'); return; }
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
      setFound(null);
      setGuide({ classes: true });
    } catch {
      toast.error('Could not add the classes. Try again.');
    }
    setBusy(null);
  };

  // one flow: login → classes → alerts → ntfy → test → done
  const loggedIn = !!account?.last_ok_at && !editing;
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
        <li>Turn your <b className="text-white">VPN off</b>. It can block ntfy.</li>
        <li>In ntfy, make sure you are subscribed to <b className="text-white">your code</b>. <button onClick={copyTopic} className="border-0 bg-transparent p-0 font-bold text-teal-400">Copy it again</button></li>
        <li>On your iPhone: Settings → Notifications → ntfy → <b className="text-white">Allow</b>.</li>
        <li>Open ntfy, pull down to refresh, then send the test again.</li>
      </ol>
    </div>
  );

  // each step: icon, title, short line, the fields, and the buttons
  const screens: Record<Exclude<Flow, 'done'>, { icon: React.ReactNode; title: string; sub: string; fields?: React.ReactNode; actions: React.ReactNode }> = {
    login: {
      icon: <GraduationCap size={30} />,
      title: editing ? 'Change login' : 'Connect GIU portal',
      sub: 'Your portal login, not UniMate',
      fields: (
        <div className="space-y-2.5">
          <input className={input} value={username} onChange={e => { setUsername(e.target.value); setLoginError(null); }} placeholder="Username"
            autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="off" />
          <input className={input} type="password" value={password} onChange={e => { setPassword(e.target.value); setLoginError(null); }} placeholder="Password" autoComplete="new-password"
            onKeyDown={e => { if (e.key === 'Enter' && password && username.trim() && busy === null) save(); }} />
          {errorText(loginError)}
          {!loginError && account?.last_status === 'error' && !editing && account.last_error && (
            <p className="text-center text-xs text-amber-400">{account.last_error}</p>
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
      sub: 'From your portal. Periods 6 and 7 are skipped',
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
      sub: 'New grades, absences and exam seats',
      actions: (
        <>
          <button onClick={toggleAlerts} disabled={busy !== null} className={primary}>{busy === 'alerts' ? spin : 'Turn on'}</button>
          <button onClick={() => setGuide({ skipped: true })} className={quiet}>Not now</button>
        </>
      ),
    },
    ntfy: {
      icon: <Smartphone size={30} />,
      title: 'Set up ntfy',
      sub: 'A free app that shows the alerts',
      fields: (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/40 p-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-500 text-[11px] font-extrabold text-black">1</span>
            <span className="min-w-0 flex-1 text-sm font-semibold text-white">Install ntfy</span>
            <a href={NTFY_APP} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white">Get app</a>
          </div>
          <div className="rounded-xl border border-white/5 bg-black/40 p-3">
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-500 text-[11px] font-extrabold text-black">2</span>
              <span className="min-w-0 flex-1 text-sm font-semibold text-white">In ntfy tap + and paste this</span>
              <button onClick={copyTopic} className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white"><Copy size={12} /> Copy</button>
            </div>
            <div className="mt-2.5 truncate rounded-lg bg-black/40 px-3 py-2.5 font-mono text-xs text-white/60 select-all">{topic}</div>
          </div>
        </div>
      ),
      actions: <button onClick={() => setGuide({ subscribed: topic ?? undefined })} className={primary}>I added it</button>,
    },
    test: {
      icon: <Send size={30} />,
      title: sentTest ? 'Did it arrive?' : 'Send a test',
      sub: sentTest ? 'Check ntfy on your phone' : 'You should get a ping',
      fields: showHelp ? helpList : undefined,
      actions: sentTest ? (
        <>
          <button onClick={() => setGuide({ tested: topic ?? undefined })} className={primary}><Check size={16} strokeWidth={3} /> Yes, I got it</button>
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
    if (flow === 'done') {
      const err = account!.last_status === 'error';
      return (
        <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${err ? 'bg-amber-500/15 text-amber-400' : 'bg-teal-500/15 text-teal-400'}`}>
              {err ? <AlertTriangle size={17} /> : <Check size={17} strokeWidth={3} />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-white">{account!.username}</div>
              <div className="truncate text-xs text-white/50">
                {err && account!.last_error ? account!.last_error : `Checked ${timeAgo(account!.last_sync_at)} · Alerts ${topic ? 'on' : 'off'}`}
              </div>
            </div>
            <button onClick={sync} disabled={busy !== null} aria-label="Check now"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 text-white disabled:opacity-40">
              {busy === 'sync' || refreshing ? spin : <RefreshCw size={15} />}
            </button>
          </div>
          {topic && (
            <div className="mt-3 border-t border-white/5 pt-2">
              <button onClick={() => setShowHelp(v => !v)} className="flex w-full items-center justify-center gap-1 py-1 text-xs font-semibold text-white/50">
                Not receiving alerts? <ChevronDown size={13} className={`transition-transform ${showHelp ? 'rotate-180' : ''}`} />
              </button>
              {showHelp && <div className="mt-2">{helpList}</div>}
            </div>
          )}
          <div className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-1 border-t border-white/5 pt-3 text-xs font-semibold text-white/50">
            {topic
              ? <button onClick={testAlert} disabled={busy !== null}>{busy === 'test' ? 'Sending…' : 'Send test'}</button>
              : <button onClick={toggleAlerts} disabled={busy !== null} className="text-teal-400">{busy === 'alerts' ? 'Turning on…' : 'Turn on alerts'}</button>}
            {topic && <button onClick={toggleAlerts} disabled={busy !== null}>{busy === 'alerts' ? 'Turning off…' : 'Alerts off'}</button>}
            <button onClick={() => setEditing(true)} className={err ? 'text-amber-400' : ''}>Change login</button>
            <button onClick={remove} disabled={busy !== null} className="text-red-400/80">{busy === 'remove' ? 'Removing…' : 'Disconnect'}</button>
          </div>
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
    <div className="fixed inset-0 z-[3000] flex flex-col bg-[#0f0f16] text-white" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex shrink-0 items-center justify-between px-5 pt-4">
        <span className="text-xs font-bold uppercase tracking-wider text-white/30">{flow === 'done' ? 'All done' : `Step ${BAR[flow] + 1} of 5`}</span>
        {flow !== 'done' && <button onClick={finish} className="border-0 bg-transparent p-1 text-sm font-semibold text-white/40">Skip all</button>}
      </div>
      <div className="mx-auto w-full max-w-[420px] shrink-0 px-5 pt-5">
        <OnboardSteps current={BAR[flow]} />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {flow === 'classes' && found ? (
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
