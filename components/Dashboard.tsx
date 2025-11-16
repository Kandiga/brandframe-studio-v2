
import React, { memo, useCallback } from 'react';
import { Storyboard, ActiveTab, GenerationProgress } from '../types';
import StoryboardView from './StoryboardView';
import ScriptView from './ScriptView';
import ProfessionalScriptView from './ProfessionalScriptView';
import GenerationProgressComponent from './GenerationProgress';
import { DownloadIcon, SaveIcon } from './icons';
import { logInfo } from '../utils/logger.js';

interface DashboardProps {
  storyboard: Storyboard | null;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onExport: () => void;
  onSave: () => void;
  onContinueNarrative?: (customInstruction?: string) => void;
  isLoading: boolean;
  saveMessage: string;
  progress?: GenerationProgress | null;
}

const Dashboard: React.FC<DashboardProps> = memo(({ storyboard, activeTab, setActiveTab, onExport, onSave, onContinueNarrative, isLoading, saveMessage, progress }) => {
  // Wrapper to log tab changes
  const handleTabChange = useCallback((tab: ActiveTab) => {
    if (tab !== activeTab) {
      logInfo('Dashboard tab changed', {
        category: 'USER_ACTION',
        component: 'Dashboard',
        action: 'tab-change',
        from: activeTab,
        to: tab,
      });
    }
    setActiveTab(tab);
  }, [activeTab, setActiveTab]);

  // Wrapper to log export action
  const handleExport = useCallback(() => {
    logInfo('Export button clicked', {
      category: 'USER_ACTION',
      component: 'Dashboard',
      action: 'export-click',
      hasStoryboard: !!storyboard,
      scenesCount: storyboard?.scenes.length || 0,
    });
    onExport();
  }, [onExport, storyboard]);

  // Wrapper to log save action
  const handleSave = useCallback(() => {
    logInfo('Save button clicked', {
      category: 'USER_ACTION',
      component: 'Dashboard',
      action: 'save-click',
      hasStoryboard: !!storyboard,
      scenesCount: storyboard?.scenes.length || 0,
    });
    onSave();
  }, [onSave, storyboard]);

  return (
    <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-extrabold text-gray-900">Project Dashboard</h1>
            <p className="mt-2 text-base lg:text-lg text-gray-600">
              Upload your assets, describe your story, and generate your storyboard.
            </p>
          </div>
          <div className="flex flex-col items-start lg:items-end">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-shrink-0 w-full sm:w-auto">
              <button 
                onClick={handleSave}
                disabled={!storyboard}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed text-white font-semibold py-2 lg:py-3 px-4 border border-transparent rounded-lg shadow-sm inline-flex items-center justify-center gap-2 transition-colors min-h-[44px] text-sm lg:text-base">
                <SaveIcon className="w-5 h-5"/>
                Save Project
              </button>
              <button 
                onClick={handleExport}
                disabled={!storyboard}
                className="bg-white hover:bg-gray-100 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400 text-gray-800 font-semibold py-2 lg:py-3 px-4 border border-gray-300 rounded-lg shadow-sm inline-flex items-center justify-center gap-2 transition-colors min-h-[44px] text-sm lg:text-base">
                <DownloadIcon className="w-5 h-5"/>
                Export Pack
              </button>
            </div>
            {saveMessage && (
              <p className="text-sm text-green-600 font-medium mt-2 transition-opacity duration-300" aria-live="polite">
                {saveMessage}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 lg:mt-10 bg-white p-4 lg:p-6 rounded-xl shadow-lg">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center min-h-96">
              {progress ? (
                <div className="w-full max-w-2xl">
                  <GenerationProgressComponent progress={progress} />
                </div>
              ) : (
                <>
                  <svg className="animate-spin h-12 w-12 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="mt-4 text-base lg:text-lg font-semibold text-gray-700">Generating your masterpiece...</p>
                  <p className="text-sm lg:text-base text-gray-500">This might take a moment.</p>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="border-b border-gray-200 overflow-x-auto">
                <nav className="-mb-px flex space-x-4 lg:space-x-8 min-w-max lg:min-w-0" aria-label="Tabs">
                  <button
                    onClick={() => handleTabChange('storyboard')}
                    className={`whitespace-nowrap py-3 lg:py-4 px-2 lg:px-1 border-b-2 font-medium text-sm min-h-[44px] flex items-center ${
                      activeTab === 'storyboard'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Storyboard View
                  </button>
                  <button
                    onClick={() => handleTabChange('script')}
                    className={`whitespace-nowrap py-3 lg:py-4 px-2 lg:px-1 border-b-2 font-medium text-sm min-h-[44px] flex items-center ${
                      activeTab === 'script'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Script View
                  </button>
                  <button
                    onClick={() => handleTabChange('professional')}
                    className={`whitespace-nowrap py-3 lg:py-4 px-2 lg:px-1 border-b-2 font-medium text-sm min-h-[44px] flex items-center ${
                      activeTab === 'professional'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Professional View
                  </button>
                </nav>
              </div>
              {activeTab === 'storyboard' ? (
                <StoryboardView 
                  storyboard={storyboard} 
                  onContinueNarrative={onContinueNarrative}
                  isContinuing={isLoading}
                />
              ) : activeTab === 'script' ? (
                <ScriptView storyboard={storyboard} />
              ) : (
                <ProfessionalScriptView storyboard={storyboard} />
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;