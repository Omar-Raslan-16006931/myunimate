import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { LayoutDashboard, Calendar as CalendarIcon, Folder, Settings, ListChecks } from 'lucide-react';
import { ViewState } from '../types';

/**
 * Floating glass pill tab bar.
 * Inactive tabs show only an icon; the active tab springs open (flex 1 → 2.15),
 * its filled pill fades and scales in (0.85 → 1) and the label appears.
 * One spring for everything (damping 22, stiffness 260, mass 0.9), skipped with "reduce motion".
 */

/* Theme: the app's own colour tokens (see index.html) */
const TAB_THEME = {
  barBackground: 'var(--nav)',
  barBorder: 'var(--line)',
  inactiveIcon: 'var(--nav-ink)',
  activeIconAndLabel: 'var(--nav-active-ink)',
  activePill: 'var(--nav-active)',
  shadow: 'var(--nav-shadow)',
};

/* Layout */
export const TAB_BAR = { height: 54, sideInset: 16, bottomGap: 12, maxWidth: 430 };
/** Bottom padding that keeps scroll content clear of the bar (plus the safe-area inset). */
export const TAB_BAR_CLEARANCE = TAB_BAR.height + TAB_BAR.bottomGap + 20;

const SPRING = { type: 'spring' as const, damping: 22, stiffness: 260, mass: 0.9 };

interface NavigationProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
}

const navItems: { view: ViewState; icon: React.ElementType; label: string }[] = [
  { view: 'dashboard', icon: LayoutDashboard, label: 'Home' },
  { view: 'schedule', icon: CalendarIcon, label: 'Schedule' },
  { view: 'projects', icon: ListChecks, label: 'Projects' },
  { view: 'materials', icon: Folder, label: 'Files' },
  { view: 'settings', icon: Settings, label: 'Settings' },
];

const Navigation: React.FC<NavigationProps> = ({ currentView, onNavigate }) => {
  const reduced = useReducedMotion();
  const transition = reduced ? { duration: 0 } : SPRING;

  return (
    <nav
      aria-label="Main"
      className="app-nav"
      style={{
        position: 'fixed',
        left: TAB_BAR.sideInset,
        right: TAB_BAR.sideInset,
        bottom: `calc(${TAB_BAR.bottomGap}px + env(safe-area-inset-bottom))`,
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none', // content behind the gaps stays tappable
      }}
    >
      <div
        role="tablist"
        style={{
          pointerEvents: 'auto',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          width: '100%',
          maxWidth: TAB_BAR.maxWidth,
          height: TAB_BAR.height,
          padding: '0 6px',
          borderRadius: 29,
          background: TAB_THEME.barBackground,
          border: `1px solid ${TAB_THEME.barBorder}`,
          backdropFilter: 'blur(18px) saturate(160%)',
          WebkitBackdropFilter: 'blur(18px) saturate(160%)',
          boxShadow: TAB_THEME.shadow,
        }}
      >
        {navItems.map(({ view, icon: Icon, label }, index) => {
          const active = currentView === view;
          return (
            <motion.div
              key={view}
              initial={false}
              animate={{ flexGrow: active ? 2.15 : 1 }}
              transition={transition}
              style={{ flexBasis: 0, flexShrink: 1, minWidth: 44 }}
            >
              <motion.button
                type="button"
                role="tab"
                aria-selected={active}
                aria-current={active ? 'page' : undefined}
                aria-label={`${label}, tab, ${index + 1} of ${navItems.length}`}
                aria-keyshortcuts={String(index + 1)}
                title={`${label}  (${index + 1})`}
                onClick={() => { if (!active) onNavigate(view); }}
                whileTap={reduced ? undefined : { scale: 0.95 }}
                style={{
                  width: '100%',
                  height: 46,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <span
                  style={{
                    position: 'relative',
                    flex: 1,
                    height: 42,
                    margin: '0 2px',
                    borderRadius: 21,
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '0 8px',
                    overflow: 'hidden',
                  }}
                >
                  <motion.span
                    aria-hidden
                    initial={false}
                    animate={{ opacity: active ? 1 : 0, scale: active ? 1 : 0.85 }}
                    transition={transition}
                    style={{ position: 'absolute', inset: 0, borderRadius: 21, background: TAB_THEME.activePill, pointerEvents: 'none' }}
                  />
                  <Icon
                    size={21}
                    strokeWidth={1.9}
                    style={{
                      position: 'relative',
                      flexShrink: 0,
                      color: active ? TAB_THEME.activeIconAndLabel : TAB_THEME.inactiveIcon,
                      transition: 'color 0.18s ease',
                    }}
                  />
                  <AnimatePresence initial={false}>
                    {active && (
                      <motion.span
                        key="label"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, transition: { duration: 0 } }}
                        transition={transition}
                        style={{
                          position: 'relative',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          fontSize: 12.5,
                          fontWeight: 800,
                          letterSpacing: -0.2,
                          color: TAB_THEME.activeIconAndLabel,
                        }}
                      >
                        {label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
              </motion.button>
            </motion.div>
          );
        })}
      </div>
    </nav>
  );
};

export default Navigation;
