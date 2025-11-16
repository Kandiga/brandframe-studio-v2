
import React from 'react';
import { DashboardIcon, MyProjectsIcon, SettingsIcon, HelpIcon, DonateIcon } from './icons';

const ViralShortsIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7"></polygon>
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
  </svg>
);

interface SidebarProps {
  currentView: 'dashboard' | 'my-projects' | 'viral-shorts';
  setCurrentView: (view: 'dashboard' | 'my-projects' | 'viral-shorts') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView }) => {
  const baseLinkClasses = "flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors";
  const activeLinkClasses = "bg-indigo-50 text-indigo-600 font-semibold";
  const inactiveLinkClasses = "text-gray-600 hover:bg-gray-100";

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col p-4 fixed h-full">
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-white font-bold text-sm">
          BFS
        </div>
        <div>
          <h1 className="font-bold text-gray-800 text-lg">BrandFrame</h1>
          <p className="text-sm text-gray-500">Studio</p>
        </div>
      </div>
      <nav className="flex-grow">
        <ul>
          <li>
            <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('dashboard'); }} className={`${baseLinkClasses} ${currentView === 'dashboard' ? activeLinkClasses : inactiveLinkClasses}`}>
              <DashboardIcon className="w-5 h-5" />
              Dashboard
            </a>
          </li>
          <li className="mt-2">
            <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('my-projects'); }} className={`${baseLinkClasses} ${currentView === 'my-projects' ? activeLinkClasses : inactiveLinkClasses}`}>
              <MyProjectsIcon className="w-5 h-5" />
              My Projects
            </a>
          </li>
          <li className="mt-2">
            <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('viral-shorts'); }} className={`${baseLinkClasses} ${currentView === 'viral-shorts' ? activeLinkClasses : inactiveLinkClasses}`}>
              <ViralShortsIcon className="w-5 h-5" />
              Viral Shorts
            </a>
          </li>
        </ul>
      </nav>
      <div className="mt-auto">
        <ul>
          <li>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">
              <SettingsIcon className="w-5 h-5" />
              Settings
            </a>
          </li>
          <li className="mt-2">
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">
              <HelpIcon className="w-5 h-5" />
              Help
            </a>
          </li>
          <li className="mt-2">
            <a href="https://github.com/yourusername/brandframe-studio" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3 text-pink-600 hover:bg-pink-50 rounded-lg font-medium transition-colors">
              <DonateIcon className="w-5 h-5" />
              Donate
            </a>
          </li>
        </ul>
      </div>
    </aside>
  );
};

export default Sidebar;