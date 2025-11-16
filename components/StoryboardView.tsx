import React, { useEffect, useState } from 'react';
import { Storyboard, Scene as SceneType, Frame } from '../types';
import { DownloadIcon } from './icons';
import { validateImageQuality, isImageUrlValid } from '../utils/imageValidation';

interface StoryboardViewProps {
  storyboard: Storyboard | null;
  onContinueNarrative?: (customInstruction?: string) => void;
  isContinuing?: boolean;
}

// Helper function to download an image
const downloadImage = (imageUrl: string, filename: string) => {
  // If it's a base64 data URL, download directly
  if (imageUrl.startsWith('data:')) {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    // For external URLs, fetch and download
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

const FrameCard: React.FC<{ frame: Frame; sceneTitle: string; sceneId: number; aspectRatio?: '16:9' | '9:16' }> = ({ frame, sceneTitle, sceneId, aspectRatio }) => {
  const [imageError, setImageError] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  
  useEffect(() => {
    // Validate image quality when component mounts
    if (frame.imageUrl && isImageUrlValid(frame.imageUrl)) {
      validateImageQuality(frame.imageUrl)
        .then((check) => {
          if (!check.isValid) {
            console.warn(`[Frame ${frame.id}] Image validation failed:`, check.errors);
            setImageError(true);
          }
          setIsValidating(false);
        })
        .catch(() => {
          setIsValidating(false);
        });
    } else {
      setIsValidating(false);
      if (!isImageUrlValid(frame.imageUrl)) {
        setImageError(true);
      }
    }
  }, [frame.imageUrl, frame.id]);
  
  const handleDownload = () => {
    // Create a clean filename: Scene1_FrameA_16x9.png
    const sceneNum = sceneId;
    const frameVariant = frame.variant;
    const aspectRatioStr = aspectRatio ? aspectRatio.replace(':', 'x') : '16x9';
    const sanitizedTitle = sceneTitle.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
    const filename = `Scene${sceneNum}_${sanitizedTitle}_Frame${frameVariant}_${aspectRatioStr}.png`;
    
    downloadImage(frame.imageUrl, filename);
  };

  // Determine aspect ratio class based on aspectRatio prop
  const aspectClass = aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-video';

  return (
    <div className="relative group">
        <div className={`${aspectClass} bg-gray-200 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300 relative`}>
            {isValidating ? (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : imageError ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 text-red-600 p-4">
                <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium text-center">Image failed to load</p>
                <p className="text-xs text-center mt-1">Frame {frame.variant}</p>
              </div>
            ) : (
              <img 
                src={frame.imageUrl} 
                alt={`${sceneTitle}: Frame ${frame.variant}`} 
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            )}
            {/* Download button overlay */}
            {!imageError && !isValidating && (
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hidden md:block">
                <button
                  onClick={handleDownload}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg shadow-lg transition-colors flex items-center gap-1 min-h-[44px] min-w-[44px]"
                  title={`Download Frame ${frame.variant}`}
                >
                  <DownloadIcon className="w-4 h-4" />
                  <span className="text-xs font-semibold">Download</span>
                </button>
              </div>
            )}
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-center text-xs lg:text-sm text-gray-600 font-medium flex-1">{`${sceneTitle}: Frame ${frame.variant}`}</p>
          {!imageError && (
            <button
              onClick={handleDownload}
              className="ml-2 text-indigo-600 hover:text-indigo-700 p-2 rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              title={`Download Frame ${frame.variant}`}
            >
              <DownloadIcon className="w-5 h-5" />
            </button>
          )}
        </div>
    </div>
  );
};

const Scene: React.FC<{ scene: SceneType; aspectRatio?: '16:9' | '9:16' }> = ({ scene, aspectRatio }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {scene.frames.map((frame) => (
            <FrameCard key={frame.id} frame={frame} sceneTitle={scene.title} sceneId={scene.id} aspectRatio={aspectRatio} />
        ))}
    </div>
);

const Timeline: React.FC<{ scenes: SceneType[] }> = ({ scenes }) => (
    <div className="relative mb-8 lg:mb-12">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 -translate-y-1/2"></div>
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-indigo-500 -translate-y-1/2" style={{ width: '100%' }}></div>
        <div className="relative flex justify-between items-center">
            {scenes.map((scene) => (
                <div key={scene.id} className="flex flex-col items-center">
                    <div className="w-3 h-3 lg:w-4 lg:h-4 bg-indigo-600 rounded-full border-2 border-white shadow-sm z-10"></div>
                    <p className="mt-1 lg:mt-2 text-xs lg:text-sm font-semibold text-gray-700 text-center px-1">{scene.title}</p>
                </div>
            ))}
        </div>
    </div>
);

const StoryboardView: React.FC<StoryboardViewProps> = ({ storyboard, onContinueNarrative, isContinuing }) => {
    const [showContinueOptions, setShowContinueOptions] = useState(false);
    const [customInstruction, setCustomInstruction] = useState('');

    if (!storyboard) {
        return (
            <div className="text-center py-20">
                <p className="text-gray-500">Your generated storyboard will appear here.</p>
            </div>
        );
    }

    const handleContinueClick = () => {
        if (customInstruction.trim()) {
            onContinueNarrative?.(customInstruction.trim());
        } else {
            onContinueNarrative?.();
        }
        setShowContinueOptions(false);
        setCustomInstruction('');
    };

    const lastScene = storyboard.scenes[storyboard.scenes.length - 1];

    return (
        <div className="mt-4 lg:mt-8">
            <h2 className="text-xl lg:text-2xl font-bold text-gray-800 mb-4 lg:mb-6">2. Generated Storyboard</h2>
            <Timeline scenes={storyboard.scenes} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8">
                {storyboard.scenes.map((scene) => (
                    <Scene key={scene.id} scene={scene} aspectRatio={storyboard.aspectRatio} />
                ))}
            </div>
            
            {/* Continue Narrative Button */}
            {onContinueNarrative && (
                <div className="mt-8 lg:mt-12 pt-6 lg:pt-8 border-t border-gray-200">
                    {!showContinueOptions ? (
                        <div className="flex flex-col items-center gap-4">
                            <button
                                onClick={() => setShowContinueOptions(true)}
                                disabled={isContinuing}
                                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 lg:px-6 rounded-lg shadow-md transition-colors inline-flex items-center gap-2 min-h-[44px] text-sm lg:text-base"
                            >
                                {isContinuing ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Generating continuation...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                                        </svg>
                                        <span>Continue Narrative</span>
                                    </>
                                )}
                            </button>
                            <p className="text-sm text-gray-500 text-center">
                                Add 2 more frames that continue from "{lastScene?.title || 'the last scene'}"
                            </p>
                        </div>
                    ) : (
                        <div className="max-w-2xl mx-auto bg-gray-50 p-4 lg:p-6 rounded-lg border border-gray-200">
                            <h3 className="text-base lg:text-lg font-semibold text-gray-800 mb-3 lg:mb-4">Continue Narrative</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Optional: Add custom instruction for the continuation
                                    </label>
                                    <textarea
                                        value={customInstruction}
                                        onChange={(e) => setCustomInstruction(e.target.value)}
                                        placeholder="e.g., 'The character discovers a hidden door' or leave empty for automatic continuation"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-base"
                                        rows={3}
                                    />
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <button
                                        onClick={handleContinueClick}
                                        disabled={isContinuing}
                                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors min-h-[44px] text-sm lg:text-base"
                                    >
                                        {isContinuing ? 'Generating...' : 'Generate 2 More Frames'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowContinueOptions(false);
                                            setCustomInstruction('');
                                        }}
                                        disabled={isContinuing}
                                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] text-sm lg:text-base"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default StoryboardView;