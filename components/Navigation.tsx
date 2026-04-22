import React from 'react';
import { motion } from 'motion/react';
import { LayoutDashboard, Calendar as CalendarIcon, BookOpen, Folder, Settings } from 'lucide-react';
import { ViewState } from '../types';
import { styles } from '../theme';

interface NavigationProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentView, onNavigate }) => {
  const navItems: { view: ViewState; icon: React.ElementType; label: string }[] = [
    { view: 'dashboard', icon: LayoutDashboard, label: 'Home' },
    { view: 'schedule', icon: CalendarIcon, label: 'Schedule' },
    { view: 'materials', icon: Folder, label: 'Files' },
    { view: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div style={styles.bottomNav} className="bg-white/10 backdrop-blur-lg border border-white/10 rounded-full shadow-2xl">
      {navItems.map((item) => {
        const isActive = currentView === item.view;
        return (
          <div
            key={item.view}
            style={{
               ...styles.navItem,
               ...(isActive ? styles.activeNavItem : {})
            }}
            onClick={() => onNavigate(item.view)}
          >
            {isActive && (
              <motion.div
                layoutId="nav-pill"
                className="absolute inset-0 bg-white/20 rounded-full"
                transition={{ type: "spring", stiffness: 350, damping: 20, mass: 0.8 }}
              />
            )}
            <item.icon size={22} strokeWidth={isActive ? 2.5 : 1.5} className="relative z-10" />
          </div>
        );
      })}
    </div>
  );
};

export default Navigation;
