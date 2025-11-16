
import React, { memo, useMemo } from 'react';
import ImageUpload from './ImageUpload';
import { SparklesIcon } from './icons';

interface InputPanelProps {
  onLogoChange: (file: File | null) => void;
  onCharacterChange: (file: File | null) => void;
  logoPreview: string | null;
  characterPreview: string | null;
  story: string;
  onStoryChange: (story: string) => void;
  aspectRatio: '16:9' | '9:16';
  onAspectRatioChange: (ratio: '16:9' | '9:16') => void;
  frameCount: number; // Number of frames (2, 4, 6, or 8)
  onFrameCountChange: (count: number) => void;
  onGenerate: () => void;
  isLoading: boolean;
  // New props for enhanced assets
  onBackgroundChange?: (file: File | null) => void;
  onArtStyleChange?: (file: File | null) => void;
  onCharactersChange?: (files: File[]) => void;
  onRemoveCharacter?: (index: number) => void;
  backgroundPreview?: string | null;
  artStylePreview?: string | null;
  characterPreviews?: string[];
  characterFiles?: File[]; // Track files for proper handling
}

const InputPanel: React.FC<InputPanelProps> = memo(({
  onLogoChange,
  onCharacterChange,
  logoPreview,
  characterPreview,
  story,
  onStoryChange,
  aspectRatio,
  onAspectRatioChange,
  frameCount,
  onFrameCountChange,
  onGenerate,
  isLoading,
  onBackgroundChange,
  onArtStyleChange,
  onCharactersChange,
  onRemoveCharacter,
  backgroundPreview = null,
  artStylePreview = null,
  characterPreviews = [],
  characterFiles = [],
}) => {
  return (
    <aside className="w-full lg:w-[420px] bg-gray-50 border-r border-gray-200 p-6 flex-shrink-0">
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-6">1. Brand Assets & Story</h2>
          <div className="space-y-6">
            <ImageUpload
              id="logo-upload"
              title="Brand Logo"
              subtitle="Drag & drop or click to upload (SVG, PNG, JPG)"
              buttonText="Upload Logo"
              onFileChange={onLogoChange}
              previewUrl={logoPreview}
            />
            <ImageUpload
              id="character-upload"
              title="Main Character Reference"
              subtitle="Drag & drop or click to upload (PNG, JPG)"
              buttonText="Upload Character"
              onFileChange={onCharacterChange}
              previewUrl={characterPreview}
            />
            
            {/* Multiple Characters */}
            {onCharactersChange && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Additional Characters (Optional)</h3>
                <ImageUpload
                  id="characters-upload"
                  title="Additional Characters"
                  subtitle="Upload multiple character references (PNG, JPG)"
                  buttonText="Add Characters"
                  onFileChange={(file: File | null) => {
                    if (file && onCharactersChange) {
                      // Add single file to existing additional characters
                      // Keep main character (first in array), add new file
                      const currentAdditional = characterFiles.length > 1 ? characterFiles.slice(1) : [];
                      const totalNew = currentAdditional.length + 1;
                      if (totalNew <= 9) { // Max 10 total (1 main + 9 additional)
                        onCharactersChange([...currentAdditional, file]);
                      } else {
                        alert('Maximum 9 additional characters allowed (10 total including main character).');
                      }
                    }
                  }}
                  onMultipleFilesChange={(files: File[]) => {
                    if (onCharactersChange && files.length > 0) {
                      // When multiple files selected, add them to existing additional characters
                      const currentAdditional = characterFiles.length > 1 ? characterFiles.slice(1) : [];
                      const totalNew = currentAdditional.length + files.length;
                      if (totalNew <= 9) { // Max 10 total (1 main + 9 additional)
                        onCharactersChange([...currentAdditional, ...files]);
                      } else {
                        const remaining = 9 - currentAdditional.length;
                        if (remaining > 0) {
                          alert(`Maximum 9 additional characters allowed. Adding ${remaining} of ${files.length} selected.`);
                          onCharactersChange([...currentAdditional, ...files.slice(0, remaining)]);
                        } else {
                          alert('Maximum 9 additional characters already added.');
                        }
                      }
                    }
                  }}
                  multiple={true}
                  maxFiles={9}
                  previewUrls={characterPreviews}
                />
                {characterPreviews.length > 1 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-2">Additional characters ({characterPreviews.length - 1}):</p>
                    <div className="flex flex-wrap gap-2">
                      {characterPreviews.slice(1).map((preview, index) => (
                        <div key={index + 1} className="relative">
                          <img 
                            src={preview} 
                            alt={`Character ${index + 2}`} 
                            className="w-16 h-16 object-cover rounded border-2 border-gray-300" 
                          />
                          {onRemoveCharacter && (
                            <button
                              onClick={() => onRemoveCharacter(index + 1)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                              title="Remove character"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Background Reference */}
            {onBackgroundChange && (
              <ImageUpload
                id="background-upload"
                title="Background Reference"
                subtitle="Upload background image for scene consistency (PNG, JPG)"
                buttonText="Upload Background"
                onFileChange={onBackgroundChange}
                previewUrl={backgroundPreview || null}
              />
            )}
            
            {/* Art Style Reference */}
            {onArtStyleChange && (
              <ImageUpload
                id="art-style-upload"
                title="Art Style Reference"
                subtitle="Upload art style image (e.g., Minecraft, anime) - applies to entire storyboard"
                buttonText="Upload Art Style"
                onFileChange={onArtStyleChange}
                previewUrl={artStylePreview || null}
              />
            )}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-3">Number of Frames</h3>
          <div className="grid grid-cols-4 gap-2 mb-6">
            {[2, 4, 6, 8].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => onFrameCountChange(count)}
                disabled={isLoading}
                className={`p-3 border-2 rounded-lg font-semibold transition-all ${
                  frameCount === count
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="text-sm">{count}</div>
                <div className="text-xs text-gray-500">{count / 2} scene{count / 2 > 1 ? 's' : ''}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-3">Aspect Ratio</h3>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              onClick={() => onAspectRatioChange('16:9')}
              disabled={isLoading}
              className={`p-4 border-2 rounded-lg font-semibold transition-all ${
                aspectRatio === '16:9'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className="text-sm mb-1">16:9</div>
              <div className="text-xs text-gray-500">Landscape</div>
            </button>
            <button
              type="button"
              onClick={() => onAspectRatioChange('9:16')}
              disabled={isLoading}
              className={`p-4 border-2 rounded-lg font-semibold transition-all ${
                aspectRatio === '9:16'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className="text-sm mb-1">9:16</div>
              <div className="text-xs text-gray-500">Portrait</div>
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-3">Describe Your Story</h3>
          <textarea
            value={story}
            onChange={(e) => onStoryChange(e.target.value)}
            placeholder="e.g., A hero embarks on a quest to find a hidden treasure..."
            className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow resize-none"
            disabled={isLoading}
          />
        </div>

        <button
          onClick={onGenerate}
          disabled={isLoading || !story}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating...
            </>
          ) : (
            <>
              <SparklesIcon className="w-5 h-5" />
              Generate Storyboard
            </>
          )}
        </button>
      </div>
    </aside>
  );
});

InputPanel.displayName = 'InputPanel';

export default InputPanel;
