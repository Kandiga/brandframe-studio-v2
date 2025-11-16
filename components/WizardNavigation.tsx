import React from 'react';
import { SaveIcon } from './icons';

interface WizardNavigationProps {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  onSaveDraft: () => void;
  canGoBack: boolean;
  canGoNext: boolean;
  isLastStep: boolean;
  isGenerating?: boolean;
  nextButtonText?: string;
}

const WizardNavigation: React.FC<WizardNavigationProps> = ({
  currentStep,
  totalSteps,
  onBack,
  onNext,
  onSaveDraft,
  canGoBack,
  canGoNext,
  isLastStep,
  isGenerating = false,
  nextButtonText,
}) => {
  const getNextButtonLabel = () => {
    if (nextButtonText) return nextButtonText;
    if (isLastStep) return isGenerating ? 'Generating...' : 'Generate Storyboard';
    return 'Next';
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-300 shadow-2xl z-50 lg:hidden">
      <div
        className="px-4 py-4 flex items-center justify-between gap-3"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={onBack}
          disabled={!canGoBack || isGenerating}
          className={`flex-1 max-w-[100px] py-3 px-4 rounded-lg font-semibold transition-all min-h-[48px] text-base ${
            canGoBack && !isGenerating
              ? 'bg-gray-200 text-gray-800 hover:bg-gray-300 active:bg-gray-400 shadow-sm'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
          }`}
        >
          Back
        </button>

        <button
          onClick={onSaveDraft}
          disabled={isGenerating}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold transition-all min-h-[48px] border-2 border-blue-600 text-blue-600 hover:bg-blue-50 active:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          title="Save your progress"
        >
          <SaveIcon className="w-5 h-5" />
          <span className="hidden sm:inline">Save</span>
        </button>

        <button
          onClick={onNext}
          disabled={!canGoNext || isGenerating}
          className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all min-h-[48px] flex items-center justify-center gap-2 text-base shadow-md ${
            canGoNext && !isGenerating
              ? 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
              : 'bg-blue-300 text-white cursor-not-allowed opacity-60'
          }`}
        >
          {isGenerating && (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {getNextButtonLabel()}
        </button>
      </div>
    </div>
  );
};

export default WizardNavigation;
