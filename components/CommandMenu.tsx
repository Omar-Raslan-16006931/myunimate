import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Search, LayoutDashboard, Calendar, ListChecks, Folder, Settings, CheckSquare, Calculator,
  Dumbbell, GraduationCap, UserCheck, Armchair, Plus, Sparkles, LifeBuoy, CornerDownLeft,
} from 'lucide-react';
import { ViewState } from '../types';

/**
 * Cmd+K / Ctrl+K command menu (Linear style) plus single-key shortcuts.
 * Opens instantly with no animation on purpose: it's a keyboard tool you use many times a day.
 * Shortcuts never fire while you type in a field or while a sheet is open.
 */

export const isMac = () => {
  if (typeof navigator === 'undefined') return false;
  const p = (navigator as any).userAgentData?.platform || navigator.platform || navigator.userAgent;
  return /mac|iphone|ipad|ipod/i.test(p);
};
/** "⌘" on Mac, "Ctrl" elsewhere. */
export const modKey = () => (isMac() ? '⌘' : 'Ctrl');

const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
};

export const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <kbd
    className="inline-flex min-w-[20px] items-center justify-center rounded-md px-1.5 text-[11px] font-bold leading-[20px]"
    style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--line)', fontFamily: 'inherit' }}
  >
    {children}
  </kbd>
);

interface Item {
  id: string;
  label: string;
  group: 'Pages' | 'Actions';
  icon: React.ElementType;
  keys?: string;          // single-key shortcut shown and listened for
  words?: string;         // extra search words
  run: () => void;
}

const CommandMenu: React.FC<{
  enabled: boolean;
  onNavigate: (v: ViewState) => void;
  onNewClass: () => void;
  onImport: () => void;
  onSupport: () => void;
}> = ({ enabled, onNavigate, onNewClass, onImport, onSupport }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  const items: Item[] = useMemo(() => [
    { id: 'home', label: 'Home', group: 'Pages', icon: LayoutDashboard, keys: '1', words: 'dashboard today', run: () => onNavigate('dashboard') },
    { id: 'schedule', label: 'Schedule', group: 'Pages', icon: Calendar, keys: '2', words: 'week classes timetable', run: () => onNavigate('schedule') },
    { id: 'projects', label: 'Projects', group: 'Pages', icon: ListChecks, keys: '3', words: 'deadlines assignments', run: () => onNavigate('projects') },
    { id: 'files', label: 'Files', group: 'Pages', icon: Folder, keys: '4', words: 'materials cms course files pdf', run: () => onNavigate('materials') },
    { id: 'settings', label: 'Settings', group: 'Pages', icon: Settings, keys: '5', words: 'preferences account theme', run: () => onNavigate('settings') },
    { id: 'todo', label: 'To-Do', group: 'Pages', icon: CheckSquare, keys: 'T', words: 'tasks list', run: () => onNavigate('todo') },
    { id: 'grades', label: 'Grade calculator', group: 'Pages', icon: Calculator, keys: 'G', words: 'grades courses gpa', run: () => onNavigate('grades') },
    { id: 'portal', label: 'Portal grades', group: 'Pages', icon: GraduationCap, words: 'giu portal marks', run: () => onNavigate('portal_grades') },
    { id: 'attendance', label: 'Attendance', group: 'Pages', icon: UserCheck, words: 'absence portal', run: () => onNavigate('attendance') },
    { id: 'seats', label: 'Exam seats', group: 'Pages', icon: Armchair, words: 'exam hall seat', run: () => onNavigate('exam_seats') },
    { id: 'gym', label: 'Gym', group: 'Pages', icon: Dumbbell, words: 'workout fitness food water', run: () => onNavigate('gym') },
    { id: 'new', label: 'New class', group: 'Actions', icon: Plus, keys: 'N', words: 'add event exam lecture', run: onNewClass },
    { id: 'import', label: 'Import schedule', group: 'Actions', icon: Sparkles, keys: 'I', words: 'smart import photo screenshot', run: onImport },
    { id: 'support', label: 'Contact support', group: 'Actions', icon: LifeBuoy, words: 'help ticket message', run: onSupport },
  ], [onNavigate, onNewClass, onImport, onSupport]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i => `${i.label} ${i.words || ''}`.toLowerCase().includes(q));
  }, [items, query]);

  const close = () => {
    setOpen(false);
    returnFocus.current?.focus?.();
  };
  const runItem = (i: Item | undefined) => {
    if (!i) return;
    setOpen(false);
    i.run();
  };

  // global keys: Cmd/Ctrl+K toggles the menu; single keys run their shortcut
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(o => {
          if (!o) returnFocus.current = document.activeElement as HTMLElement | null;
          return !o;
        });
        return;
      }
      if (open || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      if (isTyping(e.target) || document.body.dataset.sheet) return; // typing, or a sheet is up
      const key = e.key.length === 1 ? e.key.toUpperCase() : '';
      const hit = items.find(i => i.keys === key);
      if (hit) { e.preventDefault(); hit.run(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, open, items]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);
  useEffect(() => { setActive(0); }, [query]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open || !enabled) return null;

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => (shown.length ? (a + 1) % shown.length : 0)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => (shown.length ? (a - 1 + shown.length) % shown.length : 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); runItem(shown[active]); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'Tab') { e.preventDefault(); } // focus stays in the menu
  };

  let lastGroup = '';
  return createPortal(
    <div className="fixed inset-0 z-[3000] flex items-start justify-center px-4" style={{ paddingTop: 'max(12vh, calc(env(safe-area-inset-top) + 24px))' }}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={close} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command menu"
        className="relative w-full max-w-[560px] overflow-hidden rounded-[22px]"
        style={{ background: 'var(--sheet-bg)', color: 'var(--text-primary)', border: '1px solid var(--line)', boxShadow: '0 24px 60px rgba(0,0,0,0.45)', backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)' }}
      >
        <div className="flex items-center gap-2.5 px-4" style={{ borderBottom: '1px solid var(--line)' }}>
          <Search size={18} style={{ color: 'var(--text-muted)' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Search pages and actions…"
            role="combobox"
            aria-expanded="true"
            aria-controls="cmdk-list"
            aria-activedescendant={shown[active] ? `cmdk-${shown[active].id}` : undefined}
            autoComplete="off"
            spellCheck={false}
            className="h-14 flex-1 border-0 bg-transparent text-[16px] font-semibold outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
          <Kbd>Esc</Kbd>
        </div>
        <div id="cmdk-list" ref={listRef} role="listbox" className="max-h-[min(420px,60dvh)] overflow-y-auto overscroll-contain p-2">
          {shown.length === 0 && (
            <div className="px-3 py-8 text-center text-[0.9rem]" style={{ color: 'var(--text-muted)' }}>Nothing matches “{query}”</div>
          )}
          {shown.map((i, idx) => {
            const head = i.group !== lastGroup ? (lastGroup = i.group) : null;
            const Icon = i.icon;
            const on = idx === active;
            return (
              <React.Fragment key={i.id}>
                {head && <div className="px-3 pb-1 pt-2.5 text-[10.5px] font-extrabold uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>{head}</div>}
                <div
                  id={`cmdk-${i.id}`}
                  data-i={idx}
                  role="option"
                  aria-selected={on}
                  onMouseMove={() => { if (!on) setActive(idx); }}
                  onClick={() => runItem(i)}
                  className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5"
                  style={{ background: on ? 'var(--surface-2)' : 'transparent' }}
                >
                  <Icon size={17} style={{ color: on ? 'var(--accent-text)' : 'var(--text-muted)' }} />
                  <span className="flex-1 text-[0.92rem] font-semibold">{i.label}</span>
                  {i.keys && <Kbd>{i.keys}</Kbd>}
                  {on && <CornerDownLeft size={14} style={{ color: 'var(--text-muted)' }} />}
                </div>
              </React.Fragment>
            );
          })}
        </div>
        <div className="flex items-center gap-3 px-4 py-2 text-[11px] font-semibold" style={{ borderTop: '1px solid var(--line)', color: 'var(--text-muted)' }}>
          <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> move</span>
          <span className="flex items-center gap-1"><Kbd>↵</Kbd> open</span>
          <span className="ml-auto flex items-center gap-1"><Kbd>{modKey()}</Kbd><Kbd>K</Kbd> toggle</span>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default CommandMenu;
