import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutDashboard, Calendar as CalendarIcon, Folder, Settings } from 'lucide-react';
import { ViewState } from '../types';

// Design system tokens
const INK = '#1A1730';
const CARD_BG = '#FAFAF6';
const HL_YELLOW = '#F6DF63';

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

const Navigation: React.FC<NavigationProps> = ({ currentView, onNavigate }) => {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'calc(20px + env(safe-area-inset-bottom))',
        left: '50%',
        transform: 'translateX(-50%)',
        background: CARD_BG,
        border: `1.5px solid ${INK}`,
        borderRadius: 40,
        boxShadow: `4px 6px 0 ${INK}`,
        padding: '0 8px',
        height: 64,
        width: '90%',
        maxWidth: 380,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 1000,
      }}
    >
      {navItems.map((item) => {
        const isActive = currentView === item.view;
        const Icon = item.icon;

        return (
          <motion.button
            key={item.view}
            onClick={() => onNavigate(item.view)}
            whileTap={{ scale: 0.92 }}
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              flex: 1,
              height: 48,
              borderRadius: 30,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              padding: '4px 6px',
              outline: 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {/* Animated yellow pill behind active item */}
            {isActive && (
              <motion.div
                layoutId="nav-pill"
                transition={{ type: 'spring', stiffness: 400, damping: 28, mass: 0.7 }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: HL_YELLOW,
                  borderRadius: 30,
                  border: `1.5px solid ${INK}`,
                  zIndex: 0,
                }}
              />
            )}

            {/* Icon */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <Icon
                size={isActive ? 22 : 20}
                strokeWidth={isActive ? 2.5 : 1.8}
                color={INK}
              />
            </div>

            {/* Label — only visible when active */}
            <AnimatePresence>
              {isActive && (
                <motion.span
                  key="label"
                  initial={{ opacity: 0, y: 4, scale: 0.85 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.85 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: INK,
                    fontFamily: "'Instrument Sans', 'Inter', sans-serif",
                    lineHeight: 1,
                  }}
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </div>
  );
};

export default Navigation;
