
import React from 'react';
import { GymViewType } from '../../types';
import { LayoutDashboard, Dumbbell, Apple, Settings, LogOut } from 'lucide-react';
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
          >
            <item.icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
          </div>
        );
      })}
      
      {/* Divider */}
      <div style={{width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)', margin: '0 5px'}}></div>

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
