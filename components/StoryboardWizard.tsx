import React, { useState, useCallback, useEffect, useRef } from 'react';
import WizardProgress from './WizardProgress';
import WizardNavigation from './WizardNavigation';
import WizardStep from './WizardStep';
import ImageUpload from './ImageUpload';
import { useDrafts, WizardDraftData } from '../hooks/useDrafts';
import { fileToBase64 } from '../utils/fileUtils';
import { logInfo } from '../utils/logger';

interface StoryboardWizardProps {
  onComplete: (wizardData: WizardFormData) => void;
  isGenerating: boolean;
  initialData?: WizardFormData;
  initialStep?: number;
  onDraftSaved?: () => void;
}

export interface WizardFormData {
  logoFile: File | null;
  characterFile: File | null;
  backgroundFile: File | null;
  artStyleFile: File | null;
  characterFiles: File[];
  logoPreview: string | null;
  characterPreview: string | null;
  backgroundPreview: string | null;
  artStylePreview: string | null;
  characterPreviews: string[];
  storyDescription: string;
  aspectRatio: '16:9' | '9:16';
  frameCount: number;
}

const STEP_TITLES = ['Assets', 'Visuals', 'Settings', 'Story', 'Review'];

const StoryboardWizard: React.FC<StoryboardWizardProps> = ({
  onComplete,
  isGenerating,
  initialData,
  initialStep = 1,
  onDraftSaved,
}) => {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [showSaveDraftModal, setShowSaveDraftModal] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDataRef = useRef<string>('');
  const currentDraftIdRef = useRef<string | null>(null);

  const { saveDraft } = useDrafts();

  const [formData, setFormData] = useState<WizardFormData>(
    initialData || {
      logoFile: null,
      characterFile: null,
      backgroundFile: null,
      artStyleFile: null,
      characterFiles: [],
      logoPreview: null,
      characterPreview: null,
      backgroundPreview: null,
      artStylePreview: null,
      characterPreviews: [],
      storyDescription: '',
      aspectRatio: '16:9',
      frameCount: 4,
    }
  );

  const handleLogoChange = (file: File | null) => {
    if (formData.logoPreview && formData.logoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(formData.logoPreview);
    }
    setFormData((prev) => ({
      ...prev,
      logoFile: file,
      logoPreview: file ? URL.createObjectURL(file) : null,
    }));
  };

  const handleCharacterChange = (file: File | null) => {
    if (formData.characterPreview && formData.characterPreview.startsWith('blob:')) {
      URL.revokeObjectURL(formData.characterPreview);
    }
    setFormData((prev) => ({
      ...prev,
      characterFile: file,
      characterPreview: file ? URL.createObjectURL(file) : null,
      characterFiles: file ? [file] : [],
      characterPreviews: file ? [URL.createObjectURL(file)] : [],
    }));
  };

  const handleBackgroundChange = (file: File | null) => {
    if (formData.backgroundPreview && formData.backgroundPreview.startsWith('blob:')) {
      URL.revokeObjectURL(formData.backgroundPreview);
    }
    setFormData((prev) => ({
      ...prev,
      backgroundFile: file,
      backgroundPreview: file ? URL.createObjectURL(file) : null,
    }));
  };

  const handleArtStyleChange = (file: File | null) => {
    if (formData.artStylePreview && formData.artStylePreview.startsWith('blob:')) {
      URL.revokeObjectURL(formData.artStylePreview);
    }
    setFormData((prev) => ({
      ...prev,
      artStyleFile: file,
      artStylePreview: file ? URL.createObjectURL(file) : null,
    }));
  };

  const handleCharactersChange = (files: File[]) => {
    if (formData.characterPreviews.length > 1) {
      formData.characterPreviews.slice(1).forEach((url: string) => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    }

    const mainChar = formData.characterFiles.length > 0 ? formData.characterFiles[0] : null;
    const mainPreview = formData.characterPreviews.length > 0 ? formData.characterPreviews[0] : null;

    const allFiles = mainChar ? [mainChar, ...files] : files;
    const allPreviews = mainPreview
      ? [mainPreview, ...files.map((file: File) => URL.createObjectURL(file))]
      : files.map((file: File) => URL.createObjectURL(file));

    setFormData((prev) => ({
      ...prev,
      characterFiles: allFiles,
      characterPreviews: allPreviews,
    }));
  };

  const handleRemoveCharacter = (index: number) => {
    const newFiles = formData.characterFiles.filter((_: File, i: number) => i !== index);

    if (formData.characterPreviews[index]?.startsWith('blob:')) {
      URL.revokeObjectURL(formData.characterPreviews[index]);
    }

    const mainChar = newFiles.length > 0 ? newFiles[0] : null;
    const allPreviews = newFiles.map((file: File) => URL.createObjectURL(file));

    setFormData((prev) => ({
      ...prev,
      characterFiles: newFiles,
      characterPreviews: allPreviews,
      characterFile: mainChar,
      characterPreview: allPreviews.length > 0 ? allPreviews[0] : null,
    }));
  };

  const canProceedFromStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.logoFile || formData.characterFile);
      case 2:
        return true;
      case 3:
        return true;
      case 4:
        return formData.storyDescription.trim().length > 0;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep === 5) {
      onComplete(formData);
    } else {
      setCurrentStep((prev) => Math.min(prev + 1, 5));
      logInfo('Wizard step advanced', {
        category: 'USER_ACTION',
        component: 'StoryboardWizard',
        action: 'next-step',
        fromStep: currentStep,
        toStep: currentStep + 1,
      });
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    logInfo('Wizard step back', {
      category: 'USER_ACTION',
      component: 'StoryboardWizard',
      action: 'back-step',
      fromStep: currentStep,
      toStep: currentStep - 1,
    });
  };

  const handleSaveDraftClick = () => {
    setShowSaveDraftModal(true);
  };

  const performSaveDraft = useCallback(
    async (title?: string) => {
      const draftData: WizardDraftData = {
        logoFile: formData.logoFile ? await fileToBase64(formData.logoFile).then(d => `data:${d.mimeType};base64,${d.data}`) : null,
        characterFile: formData.characterFile ? await fileToBase64(formData.characterFile).then(d => `data:${d.mimeType};base64,${d.data}`) : null,
        backgroundFile: formData.backgroundFile ? await fileToBase64(formData.backgroundFile).then(d => `data:${d.mimeType};base64,${d.data}`) : null,
        artStyleFile: formData.artStyleFile ? await fileToBase64(formData.artStyleFile).then(d => `data:${d.mimeType};base64,${d.data}`) : null,
        characterFiles: await Promise.all(
          formData.characterFiles.slice(1).map(async (file: File) => {
            const data = await fileToBase64(file);
            return `data:${data.mimeType};base64,${data.data}`;
          })
        ),
        storyDescription: formData.storyDescription,
        aspectRatio: formData.aspectRatio,
        frameCount: formData.frameCount,
      };

      const currentDataString = JSON.stringify(draftData);
      if (currentDataString === lastSavedDataRef.current && !title) {
        return;
      }

      const thumbnailUrl = formData.logoPreview || formData.characterPreview || null;
      const draftName = title || draftTitle || `Draft - ${new Date().toLocaleString()}`;

      const savedDraft = await saveDraft(
        draftName,
        draftData,
        currentStep,
        thumbnailUrl,
        currentDraftIdRef.current || undefined
      );

      if (savedDraft) {
        currentDraftIdRef.current = savedDraft.id;
        lastSavedDataRef.current = currentDataString;

        logInfo('Draft saved', {
          category: 'USER_ACTION',
          component: 'StoryboardWizard',
          action: 'save-draft',
          draftId: savedDraft.id,
          step: currentStep,
        });

        if (title) {
          setShowSaveDraftModal(false);
          setDraftTitle('');
          onDraftSaved?.();
        }
      }
    },
    [formData, currentStep, draftTitle, saveDraft, onDraftSaved]
  );

  const handleSaveDraftConfirm = async () => {
    if (!draftTitle.trim()) {
      alert('Please enter a name for your draft.');
      return;
    }
    await performSaveDraft(draftTitle);
  };

  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      performSaveDraft();
    }, 30000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [formData, currentStep, performSaveDraft]);

  const jumpToStep = (step: number) => {
    setCurrentStep(step);
    logInfo('Wizard jumped to step', {
      category: 'USER_ACTION',
      component: 'StoryboardWizard',
      action: 'jump-to-step',
      fromStep: currentStep,
      toStep: step,
    });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <WizardProgress currentStep={currentStep} totalSteps={5} stepTitles={STEP_TITLES} />

      <WizardStep
        isActive={currentStep === 1}
        title="Upload Brand Assets"
        description="Add your logo and main character to personalize your storyboard"
      >
        <ImageUpload
          id="wizard-logo"
          title="Brand Logo"
          subtitle="Your brand logo (SVG, PNG, JPG)"
          buttonText="Upload Logo"
          onFileChange={handleLogoChange}
          previewUrl={formData.logoPreview}
        />

        <ImageUpload
          id="wizard-character"
          title="Main Character"
          subtitle="Your main character reference (PNG, JPG)"
          buttonText="Upload Character"
          onFileChange={handleCharacterChange}
          previewUrl={formData.characterPreview}
        />

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Tip:</strong> Upload at least one asset to continue. You can add more characters in the next step.
          </p>
        </div>
      </WizardStep>

      <WizardStep
        isActive={currentStep === 2}
        title="Visual Enhancements (Optional)"
        description="Add background and art style references to customize your scenes"
      >
        <div className="space-y-6">
          <ImageUpload
            id="wizard-background"
            title="Background Reference"
            subtitle="Upload a background image for scene consistency (Optional)"
            buttonText="Upload Background"
            onFileChange={handleBackgroundChange}
            previewUrl={formData.backgroundPreview}
          />

          <ImageUpload
            id="wizard-art-style"
            title="Art Style Reference"
            subtitle="Upload an art style image (e.g., Minecraft, anime) - Optional"
            buttonText="Upload Art Style"
            onFileChange={handleArtStyleChange}
            previewUrl={formData.artStylePreview}
          />

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Additional Characters (Optional)</h3>
            <ImageUpload
              id="wizard-additional-characters"
              title="Additional Characters"
              subtitle="Upload multiple character references (PNG, JPG)"
              buttonText="Add Characters"
              onFileChange={(file: File | null) => {
                if (file) {
                  const currentAdditional = formData.characterFiles.length > 1 ? formData.characterFiles.slice(1) : [];
                  const totalNew = currentAdditional.length + 1;
                  if (totalNew <= 9) {
                    handleCharactersChange([...currentAdditional, file]);
                  } else {
                    alert('Maximum 9 additional characters allowed (10 total including main character).');
                  }
                }
              }}
              onMultipleFilesChange={(files: File[]) => {
                if (files.length > 0) {
                  const currentAdditional = formData.characterFiles.length > 1 ? formData.characterFiles.slice(1) : [];
                  const totalNew = currentAdditional.length + files.length;
                  if (totalNew <= 9) {
                    handleCharactersChange([...currentAdditional, ...files]);
                  } else {
                    const remaining = 9 - currentAdditional.length;
                    if (remaining > 0) {
                      alert(`Maximum 9 additional characters allowed. Adding ${remaining} of ${files.length} selected.`);
                      handleCharactersChange([...currentAdditional, ...files.slice(0, remaining)]);
                    } else {
                      alert('Maximum 9 additional characters already added.');
                    }
                  }
                }
              }}
              multiple={true}
              maxFiles={9}
              previewUrls={formData.characterPreviews}
            />
            {formData.characterPreviews.length > 1 && (
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-2">Additional characters ({formData.characterPreviews.length - 1}):</p>
                <div className="flex flex-wrap gap-2">
                  {formData.characterPreviews.slice(1).map((preview, index) => (
                    <div key={index + 1} className="relative">
                      <img
                        src={preview}
                        alt={`Character ${index + 2}`}
                        className="w-16 h-16 object-cover rounded border-2 border-gray-300"
                      />
                      <button
                        onClick={() => handleRemoveCharacter(index + 1)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                        title="Remove character"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              These are optional. Skip this step if you want to use default settings.
            </p>
          </div>
        </div>
      </WizardStep>

      <WizardStep
        isActive={currentStep === 3}
        title="Scene Settings"
        description="Choose the number of frames and aspect ratio for your storyboard"
      >
        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-3">Number of Frames</h3>
          <div className="grid grid-cols-2 gap-3">
            {[2, 4, 6, 8].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, frameCount: count }))}
                className={`p-4 border-2 rounded-lg font-semibold transition-all min-h-[80px] ${
                  formData.frameCount === count
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-sm text-gray-500 mt-1">{count / 2} scene{count / 2 > 1 ? 's' : ''}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-3">Aspect Ratio</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, aspectRatio: '16:9' }))}
              className={`p-4 border-2 rounded-lg font-semibold transition-all min-h-[100px] ${
                formData.aspectRatio === '16:9'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              <div className="text-xl font-bold mb-2">16:9</div>
              <div className="text-sm text-gray-500">Landscape</div>
              <div className="mt-2 bg-gray-200 rounded" style={{ height: '40px', width: '100%' }}></div>
            </button>
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, aspectRatio: '9:16' }))}
              className={`p-4 border-2 rounded-lg font-semibold transition-all min-h-[100px] ${
                formData.aspectRatio === '9:16'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              <div className="text-xl font-bold mb-2">9:16</div>
              <div className="text-sm text-gray-500">Portrait</div>
              <div className="mt-2 bg-gray-200 rounded mx-auto" style={{ height: '60px', width: '40px' }}></div>
            </button>
          </div>
        </div>
      </WizardStep>

      <WizardStep
        isActive={currentStep === 4}
        title="Tell Your Story"
        description="Describe the narrative you want to visualize in your storyboard"
      >
        <textarea
          value={formData.storyDescription}
          onChange={(e) => setFormData((prev) => ({ ...prev, storyDescription: e.target.value }))}
          placeholder="e.g., A hero embarks on a quest to find a hidden treasure, facing challenges and discovering the true meaning of courage along the way..."
          className="w-full h-64 p-4 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow resize-none text-base"
        />

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            {formData.storyDescription.length} characters
          </span>
          <span className={formData.storyDescription.length < 50 ? 'text-orange-600' : 'text-green-600'}>
            {formData.storyDescription.length < 50 ? 'Add more details for better results' : 'Great! Ready to generate'}
          </span>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">Tips for great stories:</h4>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Include clear beginning, middle, and end</li>
            <li>Describe key characters and their motivations</li>
            <li>Mention important settings or locations</li>
            <li>Highlight the main conflict or challenge</li>
          </ul>
        </div>
      </WizardStep>

      <WizardStep
        isActive={currentStep === 5}
        title="Review & Generate"
        description="Check your selections and generate your storyboard"
      >
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Brand Assets</h3>
              <button
                onClick={() => jumpToStep(1)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Edit
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {formData.logoPreview && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Logo</p>
                  <img src={formData.logoPreview} alt="Logo" className="w-full h-20 object-cover rounded border" />
                </div>
              )}
              {formData.characterPreview && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Main Character</p>
                  <img src={formData.characterPreview} alt="Character" className="w-full h-20 object-cover rounded border" />
                </div>
              )}
            </div>
          </div>

          {(formData.backgroundPreview || formData.artStylePreview || formData.characterPreviews.length > 1) && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Visual Enhancements</h3>
                <button
                  onClick={() => jumpToStep(2)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Edit
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {formData.backgroundPreview && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Background</p>
                    <img src={formData.backgroundPreview} alt="Background" className="w-full h-20 object-cover rounded border" />
                  </div>
                )}
                {formData.artStylePreview && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Art Style</p>
                    <img src={formData.artStylePreview} alt="Art Style" className="w-full h-20 object-cover rounded border" />
                  </div>
                )}
              </div>
              {formData.characterPreviews.length > 1 && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500 mb-2">Additional Characters ({formData.characterPreviews.length - 1})</p>
                  <div className="flex flex-wrap gap-2">
                    {formData.characterPreviews.slice(1).map((preview, index) => (
                      <img
                        key={index}
                        src={preview}
                        alt={`Character ${index + 2}`}
                        className="w-16 h-16 object-cover rounded border"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Scene Settings</h3>
              <button
                onClick={() => jumpToStep(3)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Edit
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Frames</p>
                <p className="text-lg font-semibold text-gray-900">{formData.frameCount}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Aspect Ratio</p>
                <p className="text-lg font-semibold text-gray-900">{formData.aspectRatio}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Your Story</h3>
              <button
                onClick={() => jumpToStep(4)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Edit
              </button>
            </div>
            <p className="text-sm text-gray-700 line-clamp-4">{formData.storyDescription}</p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800 font-medium">
              Everything looks good! Click "Generate Storyboard" to create your visual story.
            </p>
          </div>
        </div>
      </WizardStep>

      <WizardNavigation
        currentStep={currentStep}
        totalSteps={5}
        onBack={handleBack}
        onNext={handleNext}
        onSaveDraft={handleSaveDraftClick}
        canGoBack={currentStep > 1}
        canGoNext={canProceedFromStep(currentStep)}
        isLastStep={currentStep === 5}
        isGenerating={isGenerating}
      />

      {showSaveDraftModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Save Draft</h3>
            <p className="text-sm text-gray-600 mb-4">
              Give your draft a name so you can find it later.
            </p>
            <input
              type="text"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder="e.g., Hero's Journey Draft"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSaveDraftModal(false);
                  setDraftTitle('');
                }}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDraftConfirm}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoryboardWizard;
