import React, { useEffect, useState } from 'react';
import { Loader2, RefreshCw, Trash2, CheckCircle2, AlertTriangle, Bell, Copy } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getPortalAccount, savePortalLogin, syncPortal, removePortalLogin, setPortalAlerts, testPortalAlert, getPortalAlertTopic, timeAgo, PortalAccount } from '../services/portal';

/** Settings block for the uni portal login. Separate from the app login. */
const PortalSettings: React.FC = () => {
  const [account, setAccount] = useState<PortalAccount | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'save' | 'sync' | 'remove' | 'alerts' | 'test' | null>(null);
  const [topic, setTopic] = useState<string | null>(null);

  const load = async () => {
    const a = await getPortalAccount();
    setAccount(a);
    if (a) setUsername(a.username);
    setTopic(a ? await getPortalAlertTopic() : null);
    setLoaded(true);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!username.trim() || !password) {
      toast.error('Enter your portal username and password.');
      return;
    }
    setBusy('save');
    const res = await savePortalLogin(username.trim(), password);
    setBusy(null);
    setPassword('');
    await load();
    if (res.ok) toast.success(`Connected. ${res.grades ?? 0} grades and ${res.attendance ?? 0} attendance entries loaded.`);
    else toast.error(res.message || 'Could not connect to the portal.');
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
    if (res.ok) setTopic(res.topic ?? null);
    else toast.error(res.message || 'Could not change phone alerts.');
  };

  const testAlert = async () => {
    setBusy('test');
    const res = await testPortalAlert();
    setBusy(null);
    if (res.ok) toast.success('Test sent. Check your phone.');
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

  const input = 'w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-teal-500/50';

  return (
    <div className="space-y-3">
      <p className="text-xs text-white/50 leading-relaxed">
        Your GIU portal login, used only to read your grades and attendance. It is not your UniMate login.
        The password is stored encrypted on the server so it can check for new grades every hour.
      </p>

      {loaded && account && (
        <div className="flex items-start gap-2 rounded-xl border border-white/5 bg-black/30 px-3 py-2.5 text-xs">
          {account.last_status === 'error'
            ? <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-400" />
            : <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-teal-400" />}
          <div className="min-w-0">
            <div className="font-bold text-white">
              {account.last_status === 'error' ? 'Last sync failed' : account.last_ok_at ? 'Connected' : 'Saved, not synced yet'}
              <span className="font-medium text-white/50"> · checked {timeAgo(account.last_sync_at)}</span>
            </div>
            {account.last_status === 'error' && account.last_error && (
              <div className="mt-0.5 text-white/60">{account.last_error}</div>
            )}
          </div>
        </div>
      )}

      <label className="block">
        <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-white/40">Portal username</span>
        <input
          className={input}
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="e.g. firstname.lastname"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoComplete="off"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-white/40">Portal password</span>
        <input
          className={input}
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder={account ? 'Type it again to change the login' : 'Your portal password'}
          autoComplete="new-password"
        />
      </label>

      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={busy !== null || !password}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-40"
        >
          {busy === 'save' && <Loader2 size={15} className="animate-spin" />}
          {busy === 'save' ? 'Connecting…' : account ? 'Update login' : 'Save and connect'}
        </button>
        {account && (
          <>
            <button
              onClick={sync}
              disabled={busy !== null}
              aria-label="Sync now"
              className="flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-white disabled:opacity-40"
            >
              {busy === 'sync' ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            </button>
            <button
              onClick={remove}
              disabled={busy !== null}
              aria-label="Remove portal login"
              className="flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-red-400 disabled:opacity-40"
            >
              {busy === 'remove' ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            </button>
          </>
        )}
      </div>
      {account && (
        <div className="space-y-2.5 rounded-xl border border-white/5 bg-black/30 p-3">
          <div className="flex items-center gap-3">
            <Bell size={16} className="shrink-0 text-teal-400" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-white">Phone alerts</div>
              <div className="text-xs text-white/50">New grades, attendance and exam seats, even when the app is closed</div>
            </div>
            <button
              onClick={toggleAlerts}
              disabled={busy !== null}
              className={`rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-40 ${topic ? 'border border-white/10 bg-white/5 text-white' : 'bg-teal-600 text-white'}`}
            >
              {busy === 'alerts' ? <Loader2 size={14} className="animate-spin" /> : topic ? 'Turn off' : 'Turn on'}
            </button>
          </div>
          {topic && (
            <>
              <p className="text-xs leading-relaxed text-white/50">
                Install the free <span className="font-bold text-white/80">ntfy</span> app, tap +, and paste this topic. Keep it private: anyone who has it can read your alerts.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={copyTopic}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/5 bg-black/40 px-3 py-2.5 text-left text-xs text-white"
                >
                  <span className="min-w-0 flex-1 select-all truncate font-mono">{topic}</span>
                  <Copy size={13} className="shrink-0 text-white/40" />
                </button>
                <button
                  onClick={testAlert}
                  disabled={busy !== null}
                  className="flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-bold text-white disabled:opacity-40"
                >
                  {busy === 'test' ? <Loader2 size={14} className="animate-spin" /> : 'Send test'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
      {busy === 'save' && <p className="text-xs text-white/50">Signing into the portal and reading every course. This can take up to a minute.</p>}
    </div>
  );
};

export default PortalSettings;
