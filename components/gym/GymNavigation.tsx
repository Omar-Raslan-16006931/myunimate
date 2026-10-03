import React from 'react';
import { motion } from 'motion/react';
import { GymViewType } from '../../types';
import { LayoutDashboard, Dumbbell, Apple, LineChart, Settings, LogOut } from 'lucide-react';
import { styles } from '../../theme';

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
    <div style={styles.bottomNav}>
      {navItems.map((item) => {
        const isActive = currentView === item.view;
        return (
          <div
            key={item.view}
            style={{
               ...styles.navItem,
               ...(isActive ? styles.activeNavItem : {})
            }}
            onClick={() => setView(item.view)}
            title={item.label}
          >
            {isActive && (
              <motion.div
                layoutId="gym-nav-pill"
                className="absolute inset-0 bg-white/15 rounded-full"
                transition={{ type: "spring", stiffness: 350, damping: 22, mass: 0.8 }}
              />
            )}
            <item.icon size={21} strokeWidth={isActive ? 2.5 : 1.5} className="relative z-10" />
          </div>
        );
      })}

      {/* Divider */}
      <div style={{width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)', margin: '0 4px'}}></div>

      {/* Exit Button */}
      <div
        style={styles.navItem}
        onClick={onExit}
        title="Exit Gym Mode"
      >
        <LogOut size={20} color="#f87171" />
      </div>
    </div>
  );
};
