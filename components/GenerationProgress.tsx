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
          <div className="text-2xl font-bold text-indigo-600">{progress.progress}%</div>
          {progress.currentScene && progress.totalScenes && (
            <div className="text-xs text-gray-500">
              סצנה {progress.currentScene} מתוך {progress.totalScenes}
            </div>
          )}
        </div>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
        <div 
          className="bg-indigo-600 h-3 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress.progress}%` }}
        />
      </div>
      
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          {progress.currentFrame && (
            <div className="text-gray-600">
              <span className="font-medium">פריים {progress.currentFrame}</span>
            </div>
          )}
          {progress.currentScene && progress.totalScenes && (
            <div className="text-gray-500">
              סצנה {progress.currentScene}/{progress.totalScenes}
            </div>
          )}
        </div>
        <div className="flex items-center gap-4 text-gray-600">
          {progress.elapsedTime !== undefined && (
            <div className="text-xs">
              <span className="font-medium">זמן שעבר:</span> {formatTime(progress.elapsedTime)}
            </div>
          )}
          {progress.estimatedTimeRemaining !== undefined && progress.estimatedTimeRemaining > 0 && (
            <div className="text-xs text-indigo-600">
              <span className="font-medium">⏱️ זמן נותר:</span> {formatTime(progress.estimatedTimeRemaining)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GenerationProgress;

