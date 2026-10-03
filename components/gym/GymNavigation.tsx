import React from 'react';
import { motion } from 'motion/react';
import { GymViewType } from '../../types';
import { LayoutDashboard, Dumbbell, Apple, LineChart, Settings, LogOut } from 'lucide-react';

const INK = '#1A1730';
const CARD_BG = '#FAFAF6';
const HL_YELLOW = '#F6DF63';

interface NavigationProps {
  currentView: GymViewType;
  setView: (view: GymViewType) => void;
  onExit: () => void;
}

export const GymNavigation: React.FC<NavigationProps> = ({ currentView, setView, onExit }) => {
  const navItems = [
    { view: GymViewType.DASHBOARD, icon: LayoutDashboard, label: 'Home' },
    { view: GymViewType.WORKOUT, icon: Dumbbell, label: 'Workout' },
    { view: GymViewType.NUTRITION, icon: Apple, label: 'Food' },
    { view: GymViewType.ANALYSIS, icon: LineChart, label: 'Progress' },
    { view: GymViewType.SETTINGS, icon: Settings, label: 'Settings' },
  ];

  return (
    <div style={{
      position: 'fixed',
      bottom: 'calc(24px + env(safe-area-inset-bottom))',
      left: '50%',
      transform: 'translateX(-50%)',
      background: CARD_BG,
      border: `1.5px solid ${INK}`,
      borderRadius: 40,
      boxShadow: `4px 6px 0 ${INK}`,
      padding: '0 12px',
      height: 64,
      width: '90%',
      maxWidth: 380,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 100,
    }}>
      {navItems.map((item) => {
        const isActive = currentView === item.view;
        return (
          <div
            key={item.view}
            onClick={() => setView(item.view)}
            title={item.label}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              borderRadius: 30,
              cursor: 'pointer',
              color: isActive ? INK : `${INK}60`,
              transition: 'color 0.2s',
            }}
          >
            {isActive && (
              <motion.div
                layoutId="gym-nav-pill"
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: HL_YELLOW,
                  borderRadius: 30,
                  border: `1.5px solid ${INK}`,
                }}
                transition={{ type: 'spring', stiffness: 350, damping: 22, mass: 0.8 }}
              />
            )}
            <item.icon size={21} strokeWidth={isActive ? 2.5 : 1.5} style={{ position: 'relative', zIndex: 1 }} />
          </div>
        );
      })}

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: `${INK}20`, margin: '0 4px' }} />

      {/* Exit Button */}
      <div
        onClick={onExit}
        title="Exit Gym Mode"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 44,
          height: 44,
          borderRadius: 30,
          cursor: 'pointer',
          color: '#E56A5A',
        }}
      >
        <LogOut size={20} />
      </div>
    </div>
  );
};
