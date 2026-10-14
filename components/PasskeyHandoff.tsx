import React, { useEffect, useState } from 'react';
import { Check, Fingerprint, Loader2, TriangleAlert } from 'lucide-react';
import { finishHandoffAdd, finishHandoffLogin, handoffInfo } from '../services/passkeys';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Is this page being opened by the app's Safari sheet? (?pk=add|login&h=<id>) */
export const passkeyHandoffFromUrl = (): { kind: 'login' | 'register'; id: string } | null => {
  try {
    const q = new URLSearchParams(window.location.search);
    const pk = q.get('pk');
    const id = q.get('h') || '';
    if ((pk !== 'add' && pk !== 'login') || !UUID.test(id)) return null;
    return { kind: pk === 'add' ? 'register' : 'login', id };
  } catch { return null; }
};

/**
 * The page the in-app Safari sheet shows. iOS blocks passkeys inside the sideloaded
 * app itself, but Safari can do them. The app waits and carries on once this finishes.
 */
const PasskeyHandoff: React.FC<{ kind: 'login' | 'register'; id: string }> = ({ kind, id }) => {
  const [phase, setPhase] = useState<'loading' | 'ready' | 'working' | 'done' | 'error'>('loading');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const adding = kind === 'register';

  useEffect(() => {
    let alive = true;
    handoffInfo(id, kind).then(r => {
      if (!alive) return;
      if (r.ok) { setCode(r.code); setPhase('ready'); } else { setError(r.message); setPhase('error'); }
    });
    return () => { alive = false; };
  }, [id, kind]);

  const go = async () => {
    setPhase('working');
    setError('');
    const res = await (adding ? finishHandoffAdd(id) : finishHandoffLogin(id));
    if (res.ok) setPhase('done');
    else { setError(res.cancelled ? '' : res.message); setPhase('ready'); }
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-6 py-10" style={{ background: '#0f0f16', color: '#fff' }}>
      <div className="w-full max-w-[380px] text-center">
        {phase === 'loading' && <Loader2 className="mx-auto animate-spin text-white/50" size={26} />}

        {phase === 'error' && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15 text-amber-300"><TriangleAlert size={28} /></div>
            <h1 className="text-[22px] font-extrabold">Link expired</h1>
            <p className="mt-2 text-[15px] text-white/55">{error || 'Start again in the UniMate app.'}</p>
            <p className="mt-6 text-[13px] text-white/35">You can close this and go back to the app.</p>
          </>
        )}

        {(phase === 'ready' || phase === 'working') && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal-500/15 text-teal-300"><Fingerprint size={30} /></div>
            <h1 className="text-[22px] font-extrabold">{adding ? 'Add a passkey' : 'Sign in with a passkey'}</h1>
            <p className="mt-2 text-[15px] leading-snug text-white/55">
              {adding ? 'Use Face ID or Touch ID so you can skip the password next time.' : 'Use Face ID or Touch ID to sign in to UniMate.'}
            </p>
            {!adding && (
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/40">Code</div>
                <div className="mt-0.5 text-[28px] font-extrabold tracking-[0.2em]">{code}</div>
                <p className="mt-1 text-[12.5px] leading-snug text-white/50">It must match the code in the UniMate app. If it doesn't, don't continue.</p>
              </div>
            )}
            {error && <p className="mt-4 text-[13px] font-semibold text-red-400">{error}</p>}
            <button onClick={go} disabled={phase === 'working'}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border-0 py-3.5 text-[16px] font-extrabold disabled:opacity-60" style={{ background: '#2ee6d6', color: '#062a28' }}>
              {phase === 'working' ? <Loader2 size={18} className="animate-spin" /> : 'Continue'}
            </button>
          </>
        )}

        {phase === 'done' && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-[#062a28]" style={{ background: '#2ee6d6' }}><Check size={32} strokeWidth={3} /></div>
            <h1 className="text-[22px] font-extrabold">{adding ? 'Passkey added' : "You're signed in"}</h1>
            <p className="mt-2 text-[15px] text-white/55">{adding ? 'This sheet will close, or tap Done at the top.' : 'Going back to UniMate. If this stays open, tap Done at the top.'}</p>
          </>
        )}
      </div>
    </div>
  );
};

export default PasskeyHandoff;
