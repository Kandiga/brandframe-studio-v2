
import React from 'react';
import { DashboardIcon, MyProjectsIcon } from './icons';

const ViralShortsIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7"></polygon>
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
  </svg>
);

interface BottomNavProps {
  currentView: 'dashboard' | 'my-projects' | 'viral-shorts';
  setCurrentView: (view: 'dashboard' | 'my-projects' | 'viral-shorts') => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentView, setCurrentView }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon, view: 'dashboard' as const },
    { id: 'my-projects', label: 'Projects', icon: MyProjectsIcon, view: 'my-projects' as const },
    { id: 'viral-shorts', label: 'Shorts', icon: ViralShortsIcon, view: 'viral-shorts' as const },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
      <div className="flex justify-around items-center px-2 py-2" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.view;
          
          return (
            <button
              key={item.id}
              onClick={(e) => {
                e.preventDefault();
                setCurrentView(item.view);
              }}
              className={`flex flex-col items-center justify-center gap-1 px-4 py-2 min-w-[44px] min-h-[44px] rounded-lg transition-colors ${
                isActive
                  ? 'text-indigo-600'
                  : 'text-gray-600'
              }`}
              aria-label={item.label}
            >
              <Icon className={`w-6 h-6 ${isActive ? 'text-indigo-600' : 'text-gray-600'}`} />
              <span className={`text-xs font-medium ${isActive ? 'text-indigo-600 font-semibold' : 'text-gray-600'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;

