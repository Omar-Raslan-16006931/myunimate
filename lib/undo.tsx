import React from 'react';
import { toast } from 'react-hot-toast';

/**
 * Delete now, ask later (Gmail style).
 * The item leaves the screen right away and an Undo toast shows for a few seconds.
 * The real delete request only goes out when the toast runs out, so Undo never has
 * to re-create anything. If the app is closed or hidden first, pending deletes are sent then.
 */

const UNDO_MS = 6000;

interface Pending {
  timer: number;
  commit: () => Promise<{ error: unknown } | void>;
  restore: () => void;
  failText: string;
}

const pending = new Map<string, Pending>();

/** Ids that are deleted on screen but not on the server yet (a refetch must not bring them back). */
export const isPendingDelete = (id: string) => pending.has(id);

const send = async (key: string) => {
  const p = pending.get(key);
  if (!p) return;
  pending.delete(key);
  window.clearTimeout(p.timer);
  let failed = false;
  try {
    const res = await p.commit();
    failed = !!(res && res.error);
  } catch {
    failed = true;
  }
  if (failed) {
    p.restore();
    toast.error(p.failText);
  }
};

const flushAll = () => { [...pending.keys()].forEach(k => { void send(k); }); };
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushAll);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushAll(); });
}

export function deleteWithUndo(opts: {
  /** id of the record (used to dedupe and to hide it from refetches) */
  id: string;
  /** toast text, e.g. "Class deleted" */
  message: string;
  /** take it off the screen */
  hide: () => void;
  /** put it back on the screen */
  restore: () => void;
  /** the real delete request */
  commit: () => Promise<{ error: unknown } | void>;
  failText?: string;
}) {
  const { id, message, hide, restore, commit, failText = "Couldn't delete it. It's back." } = opts;
  if (pending.has(id)) void send(id); // same item twice: send the first one now
  hide();
  const timer = window.setTimeout(() => { void send(id); }, UNDO_MS);
  pending.set(id, { timer, commit, restore, failText });

  const toastId = `undo-${id}`;
  toast(
    t => (
      <span className="flex items-center gap-3">
        <span>{message}</span>
        <button
          type="button"
          onClick={() => {
            const p = pending.get(id);
            if (p) { window.clearTimeout(p.timer); pending.delete(id); p.restore(); }
            toast.dismiss(t.id);
          }}
          className="border-0 bg-transparent p-0 text-[0.92em] font-extrabold"
          style={{ color: '#2ee6d6', cursor: 'pointer' }}
        >
          Undo
        </button>
      </span>
    ),
    // react-hot-toast already renders this with role="status" and aria-live="polite"
    { id: toastId, duration: UNDO_MS },
  );
}
