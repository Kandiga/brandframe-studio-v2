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
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40 lg:hidden">
      <div
        className="px-4 py-3 flex items-center justify-between gap-3"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={onBack}
          disabled={!canGoBack || isGenerating}
          className={`flex-1 max-w-[100px] py-3 px-4 rounded-lg font-semibold transition-all min-h-[44px] ${
            canGoBack && !isGenerating
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
              : 'bg-gray-50 text-gray-300 cursor-not-allowed'
          }`}
        >
          Back
        </button>

        <button
          onClick={onSaveDraft}
          disabled={isGenerating}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold transition-all min-h-[44px] border-2 border-blue-600 text-blue-600 hover:bg-blue-50 active:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Save your progress"
        >
          <SaveIcon className="w-5 h-5" />
          <span className="hidden sm:inline">Save Draft</span>
        </button>

        <button
          onClick={onNext}
          disabled={!canGoNext || isGenerating}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all min-h-[44px] flex items-center justify-center gap-2 ${
            canGoNext && !isGenerating
              ? 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
              : 'bg-blue-300 text-white cursor-not-allowed'
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
