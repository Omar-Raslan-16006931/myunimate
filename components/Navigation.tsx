import React from 'react';
import { LayoutDashboard, Calendar as CalendarIcon, BookOpen, Folder, Bot, Settings, Calculator } from 'lucide-react';
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
    { view: 'grades', icon: Calculator, label: 'Grades' },
    { view: 'courses', icon: BookOpen, label: 'Classes' },
    { view: 'materials', icon: Folder, label: 'Files' },
    { view: 'ai', icon: Bot, label: 'AI' },
    { view: 'settings', icon: Settings, label: 'Settings' },
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
            onClick={() => onNavigate(item.view)}
          >
            <item.icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
          </div>
        );
      })}
    </div>
  );
};

export default Navigation;