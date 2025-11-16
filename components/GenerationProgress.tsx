import React from 'react';
import { GenerationProgress as GenerationProgressType } from '../types';

interface GenerationProgressProps {
  progress: GenerationProgressType | null;
}

export const GenerationProgress: React.FC<GenerationProgressProps> = ({ progress }) => {
  if (!progress) return null;
  
  const getPhaseLabel = (phase: GenerationProgressType['phase']) => {
    switch (phase) {
      case 'story-world':
        return 'ארכיטקטורת סיפור';
      case 'script':
        return 'יצירת תסריט';
      case 'images':
        return 'יצירת תמונות';
      case 'complete':
        return 'הושלם';
      default:
        return 'מעבד...';
    }
  };
  
  const getPhaseIcon = (phase: GenerationProgressType['phase']) => {
    switch (phase) {
      case 'story-world':
        return '📐';
      case 'script':
        return '📝';
      case 'images':
        return '🎨';
      case 'complete':
        return '✅';
      default:
        return '⏳';
    }
  };
  
  const formatTime = (seconds?: number): string => {
    if (!seconds || seconds < 0) return 'מחשב...';
    if (seconds < 60) return `${seconds} שניות`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${minutes} דקות ${secs} שניות` : `${minutes} דקות`;
  };
  
  return (
    <div className="w-full bg-white rounded-lg p-6 shadow-md border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{getPhaseIcon(progress.phase)}</span>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">{getPhaseLabel(progress.phase)}</h3>
            <p className="text-sm text-gray-600">{progress.message}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
            {progress.progress}%
          </div>
          {progress.currentScene && progress.totalScenes && (
            <div className="text-sm text-gray-600 font-medium">
              סצנה {progress.currentScene}/{progress.totalScenes}
            </div>
          )}
        </div>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-4 mb-3 overflow-hidden relative">
        <div
          className="bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 h-4 rounded-full transition-all duration-300 ease-out shadow-sm"
          style={{ width: `${progress.progress}%` }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-white drop-shadow-md">{progress.progress}%</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between text-sm mt-2">
        <div className="flex items-center gap-3">
          {progress.currentFrame && (
            <div className="bg-blue-50 px-3 py-1 rounded-full">
              <span className="font-semibold text-blue-700">פריים {progress.currentFrame}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          {progress.elapsedTime !== undefined && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">⏱ עבר:</span> <span className="font-semibold text-gray-800">{formatTime(progress.elapsedTime)}</span>
            </div>
          )}
          {progress.estimatedTimeRemaining !== undefined && progress.estimatedTimeRemaining > 0 && (
            <div className="text-sm bg-blue-50 px-3 py-1 rounded-full">
              <span className="font-medium text-blue-600">⏳ נותר:</span> <span className="font-bold text-blue-800">{formatTime(progress.estimatedTimeRemaining)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GenerationProgress;

