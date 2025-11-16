import React, { useEffect, useState } from 'react';
import { Storyboard, GenerationProgress, Scene, Frame } from '../types';
import GenerationProgressComponent from './GenerationProgress';
import { DownloadIcon } from './icons';
import { WizardFormData } from './StoryboardWizard';

interface MobileGenerationScreenProps {
  wizardData: WizardFormData;
  onGenerate: (wizardData: WizardFormData) => void;
  isLoading: boolean;
  progress: GenerationProgress | null;
  storyboard: Storyboard | null;
  onBackToDashboard: () => void;
  onNewStory: () => void;
  onContinueNarrative?: (customInstruction?: string) => void;
  onExport: () => void;
  onSave: () => void;
}

const MobileGenerationScreen: React.FC<MobileGenerationScreenProps> = ({
  wizardData,
  onGenerate,
  isLoading,
  progress,
  storyboard,
  onBackToDashboard,
  onNewStory,
  onContinueNarrative,
  onExport,
  onSave,
}) => {
  const [hasStartedGeneration, setHasStartedGeneration] = useState(false);
  const [showContinueOptions, setShowContinueOptions] = useState(false);
  const [customInstruction, setCustomInstruction] = useState('');

  useEffect(() => {
    if (!hasStartedGeneration && !storyboard) {
      setHasStartedGeneration(true);
      onGenerate(wizardData);
    }
  }, [hasStartedGeneration, storyboard, wizardData, onGenerate]);

  const handleContinueClick = () => {
    if (customInstruction.trim()) {
      onContinueNarrative?.(customInstruction.trim());
    } else {
      onContinueNarrative?.();
    }
    setShowContinueOptions(false);
    setCustomInstruction('');
  };

  const downloadImage = (imageUrl: string, filename: string) => {
    if (imageUrl.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      fetch(imageUrl)
        .then(response => response.blob())
        .then(blob => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        })
        .catch(error => {
          console.error('Error downloading image:', error);
          alert('Failed to download image. Please try again.');
        });
    }
  };

  const lastScene = storyboard?.scenes[storyboard.scenes.length - 1];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">
            {isLoading ? 'יוצר סיפור...' : 'הסיפור שלך'}
          </h1>
          {!isLoading && storyboard && (
            <button
              onClick={onBackToDashboard}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              חזרה
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
            <div className="w-full max-w-lg">
              <GenerationProgressComponent progress={progress} />
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  אנחנו יוצרים את הסיפור שלך...
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  זה עשוי לקחת מספר דקות
                </p>
              </div>
            </div>
          </div>
        ) : storyboard ? (
          <div className="p-4 space-y-6">
            <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">הסיפור שלך מוכן!</h2>
              <div className="flex flex-col gap-2">
                <button
                  onClick={onSave}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  שמור פרויקט
                </button>
                <button
                  onClick={onExport}
                  className="w-full bg-white hover:bg-gray-50 text-gray-800 font-semibold py-3 px-4 border border-gray-300 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  <DownloadIcon className="w-5 h-5" />
                  ייצא חבילה
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {storyboard.scenes.map((scene: Scene, sceneIndex: number) => (
                <div key={scene.id} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3">
                    <h3 className="text-lg font-bold text-white">{scene.title}</h3>
                    <p className="text-sm text-blue-100 mt-1">{scene.scriptLine}</p>
                  </div>

                  <div className="p-4 space-y-4">
                    {scene.frames.map((frame: Frame, frameIndex: number) => {
                      const aspectClass = storyboard.aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-video';
                      const filename = `Scene${sceneIndex + 1}_${scene.title.replace(/[^a-zA-Z0-9]/g, '_')}_Frame${frame.variant}.png`;

                      return (
                        <div key={frame.id} className="space-y-2">
                          <div className={`${aspectClass} bg-gray-200 rounded-lg overflow-hidden shadow-sm relative`}>
                            <img
                              src={frame.imageUrl}
                              alt={`${scene.title}: Frame ${frame.variant}`}
                              className="w-full h-full object-cover"
                            />
                            <button
                              onClick={() => downloadImage(frame.imageUrl, filename)}
                              className="absolute bottom-2 right-2 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg shadow-lg transition-colors"
                            >
                              <DownloadIcon className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-600 font-medium">פריים {frame.variant}</p>
                            <button
                              onClick={() => downloadImage(frame.imageUrl, filename)}
                              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                            >
                              <DownloadIcon className="w-4 h-4" />
                              הורד
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {onContinueNarrative && (
              <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                {!showContinueOptions ? (
                  <div className="space-y-3">
                    <button
                      onClick={() => setShowContinueOptions(true)}
                      disabled={isLoading}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>יוצר המשך...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                          </svg>
                          <span>המשך סיפור</span>
                        </>
                      )}
                    </button>
                    <p className="text-sm text-gray-500 text-center">
                      הוסף 2 פריימים נוספים שממשיכים את "{lastScene?.title || 'הסצנה האחרונה'}"
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800">המשך סיפור</h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        אופציונלי: הוסף הנחיה להמשך
                      </label>
                      <textarea
                        value={customInstruction}
                        onChange={(e) => setCustomInstruction(e.target.value)}
                        placeholder='לדוגמה: "הדמות מגלה דלת נסתרת" או השאר ריק להמשך אוטומטי'
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-base"
                        rows={3}
                      />
                    </div>
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={handleContinueClick}
                        disabled={isLoading}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                      >
                        {isLoading ? 'יוצר...' : 'צור 2 פריימים נוספים'}
                      </button>
                      <button
                        onClick={() => {
                          setShowContinueOptions(false);
                          setCustomInstruction('');
                        }}
                        disabled={isLoading}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        ביטול
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
              <button
                onClick={onNewStory}
                className="w-full bg-white hover:bg-gray-50 text-gray-800 font-semibold py-3 px-4 border-2 border-gray-300 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                צור סיפור חדש
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">משהו השתבש</h3>
              <p className="mt-2 text-sm text-gray-500">לא הצלחנו ליצור את הסיפור</p>
              <div className="mt-6 flex flex-col gap-3">
                <button
                  onClick={() => {
                    setHasStartedGeneration(false);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-sm transition-colors"
                >
                  נסה שוב
                </button>
                <button
                  onClick={onBackToDashboard}
                  className="text-gray-600 hover:text-gray-800 font-medium"
                >
                  חזרה למסך הראשי
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileGenerationScreen;
