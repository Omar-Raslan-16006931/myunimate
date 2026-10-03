import React from 'react';
import { LayoutDashboard, Calendar as CalendarIcon, Folder, Settings } from 'lucide-react';
import { ViewState } from '../types';

interface NavigationProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
}

const navItems: { view: ViewState; icon: React.ElementType; label: string }[] = [
  { view: 'dashboard', icon: LayoutDashboard, label: 'Home' },
  { view: 'schedule', icon: CalendarIcon, label: 'Schedule' },
  { view: 'materials', icon: Folder, label: 'Files' },
  { view: 'settings', icon: Settings, label: 'Settings' },
];

const Navigation: React.FC<NavigationProps> = ({ currentView, onNavigate }) => (
  <nav
    aria-label="Main"
    style={{
      position: 'fixed',
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
      display: 'flex',
      justifyContent: 'center',
      padding: '0 16px calc(12px + env(safe-area-inset-bottom))',
      pointerEvents: 'none',
    }}
  >
    <div
      style={{
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 4,
        width: '100%',
        maxWidth: 420,
        padding: 6,
        borderRadius: 28,
        background: 'var(--nav)',
        border: '1px solid var(--line)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        boxShadow: 'var(--nav-shadow)',
      }}
    >
      {navItems.map(({ view, icon: Icon, label }) => {
        const active = currentView === view;
        return (
          <button
            key={view}
            onClick={() => onNavigate(view)}
            aria-current={active ? 'page' : undefined}
            aria-label={label}
            style={{
              flex: active ? '1.6 1 0' : '1 1 0',
              height: 46,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              border: 'none',
              borderRadius: 22,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '0.82rem',
              fontWeight: 700,
              background: active ? 'var(--nav-active)' : 'transparent',
              color: active ? 'var(--nav-active-ink)' : 'var(--nav-ink)',
              transition: 'background 0.18s ease, color 0.18s ease, flex-grow 0.18s ease',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <Icon size={21} strokeWidth={active ? 2.4 : 1.8} />
            {active && <span>{label}</span>}
          </button>
        );
      })}
    </div>
  </nav>
);

export default Navigation;
