
import React, { useState, useCallback, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import InputPanel from './components/InputPanel';
import Dashboard from './components/Dashboard';
import MyProjects from './components/MyProjects';
import ViralShortsView from './components/ViralShortsView';
import ErrorBoundary from './components/ErrorBoundary';
import { ActiveTab, YouTubeVideo, Scene, Frame } from './types';
import { useProjects } from './hooks/useProjects';
import { useStoryboard } from './hooks/useStoryboard';
import { fileToBase64 } from './utils/fileUtils';
import { createErrorMessage } from './utils/errorHandler';
import { saveProjectImages } from './utils/fileSystem';
import { logInfo, logError, logWarn } from './utils/logger.js';
import { setupGlobalErrorHandlers } from './utils/errorReporter.js';

type View = 'dashboard' | 'my-projects' | 'viral-shorts';

function App() {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [characterFile, setCharacterFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [characterPreview, setCharacterPreview] = useState<string | null>(null);
  
  // New asset states
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [artStyleFile, setArtStyleFile] = useState<File | null>(null);
  const [characterFiles, setCharacterFiles] = useState<File[]>([]);
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null);
  const [artStylePreview, setArtStylePreview] = useState<string | null>(null);
  const [characterPreviews, setCharacterPreviews] = useState<string[]>([]);

  const [storyDescription, setStoryDescription] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [frameCount, setFrameCount] = useState<number>(4); // Default: 4 frames (2 scenes)
  const [activeTab, setActiveTab] = useState<ActiveTab>('storyboard');
  const [currentView, setCurrentViewState] = useState<View>('dashboard');
  const [saveMessage, setSaveMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Setup global error handlers on mount
  useEffect(() => {
    setupGlobalErrorHandlers();
    logInfo('App initialized', {
      category: 'SYSTEM',
      component: 'App',
    });
  }, []);

  // Use custom hooks
  const { projects: savedProjects, saveProject, deleteProject, loadProject } = useProjects();
  const { storyboard: storyboardData, isLoading, error: storyboardError, progress, generate: generateStoryboard, continueNarrative, setStoryboard: setStoryboardData } = useStoryboard({
    onError: (err) => {
      setErrorMessage(err);
      logError('Storyboard generation error in App', new Error(err), {
        category: 'GENERATION',
        component: 'App',
      });
    },
  });

  // Wrapper to log view changes
  const setCurrentView = useCallback((view: View) => {
    if (view !== currentView) {
      logInfo('View changed', {
        category: 'USER_ACTION',
        component: 'App',
        action: 'view-change',
        from: currentView,
        to: view,
      });
    }
    setCurrentViewState(view);
  }, [currentView]);

  const handleLogoChange = (file: File | null) => {
    if (logoPreview && logoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(logoPreview);
    }
    setLogoFile(file);
    if (file) {
      setLogoPreview(URL.createObjectURL(file));
    } else {
      setLogoPreview(null);
    }
  };

  const handleCharacterChange = (file: File | null) => {
    if (characterPreview && characterPreview.startsWith('blob:')) {
      URL.revokeObjectURL(characterPreview);
    }
    setCharacterFile(file);
    if (file) {
      setCharacterPreview(URL.createObjectURL(file));
      // Also set as first character in array for backward compatibility
      setCharacterFiles([file]);
      setCharacterPreviews([URL.createObjectURL(file)]);
    } else {
      setCharacterPreview(null);
      setCharacterFiles([]);
      setCharacterPreviews([]);
    }
  };

  const handleBackgroundChange = (file: File | null) => {
    if (backgroundPreview && backgroundPreview.startsWith('blob:')) {
      URL.revokeObjectURL(backgroundPreview);
    }
    setBackgroundFile(file);
    if (file) {
      setBackgroundPreview(URL.createObjectURL(file));
    } else {
      setBackgroundPreview(null);
    }
  };

  const handleArtStyleChange = (file: File | null) => {
    if (artStylePreview && artStylePreview.startsWith('blob:')) {
      URL.revokeObjectURL(artStylePreview);
    }
    setArtStyleFile(file);
    if (file) {
      setArtStylePreview(URL.createObjectURL(file));
    } else {
      setArtStylePreview(null);
    }
  };

  const handleCharactersChange = (files: File[]) => {
    // This function handles adding additional characters
    // Main character is always first in characterFiles array
    // files parameter contains NEW files to add (not replacement)
    
    // Revoke old preview URLs for additional characters only (skip first/main)
    if (characterPreviews.length > 1) {
      characterPreviews.slice(1).forEach((url: string) => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    }
    
    // Keep main character, add new files as additional
    const mainChar = characterFiles.length > 0 ? characterFiles[0] : null;
    const mainPreview = characterPreviews.length > 0 ? characterPreviews[0] : null;
    
    // Combine: main character + new additional characters
    const allFiles = mainChar ? [mainChar, ...files] : files;
    const allPreviews = mainPreview 
      ? [mainPreview, ...files.map((file: File) => URL.createObjectURL(file))]
      : files.map((file: File) => URL.createObjectURL(file));
    
    setCharacterFiles(allFiles);
    setCharacterPreviews(allPreviews);
    
    // Update main character reference for backward compatibility
    if (allFiles.length > 0) {
      setCharacterFile(allFiles[0]);
      setCharacterPreview(allPreviews[0]);
    } else {
      setCharacterFile(null);
      setCharacterPreview(null);
    }
  };

  const handleRemoveCharacter = (index: number) => {
    const newFiles = characterFiles.filter((_: File, i: number) => i !== index);
    
    // Revoke URL for removed preview
    if (characterPreviews[index]?.startsWith('blob:')) {
      URL.revokeObjectURL(characterPreviews[index]);
    }
    
    handleCharactersChange(newFiles);
  };

  const handleGenerate = useCallback(() => {
    setActiveTab('storyboard');
    setErrorMessage('');
    // Get main character (first in array or single character file)
    const mainCharacter = characterFiles.length > 0 ? characterFiles[0] : characterFile;
    // Get additional characters (rest of array)
    const additionalCharacters = characterFiles.length > 1 ? characterFiles.slice(1) : [];
    generateStoryboard(
      logoFile, 
      mainCharacter, 
      storyDescription, 
      aspectRatio,
      additionalCharacters,
      backgroundFile,
      artStyleFile,
      frameCount
    );
  }, [logoFile, characterFile, characterFiles, storyDescription, aspectRatio, backgroundFile, artStyleFile, frameCount, generateStoryboard]);

  const handleSaveProject = useCallback(async () => {
    if (!storyboardData) {
      setErrorMessage("No storyboard to save.");
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }
    const title = window.prompt("Enter a name for your project:");
    if (!title || !title.trim()) {
      return; // User cancelled or entered empty name
    }

    setSaveMessage("Saving images to Downloads...");

    // Get image URLs (base64 or blob URLs) for all assets
    const [logoUrl, characterUrl, backgroundUrl, artStyleUrl, ...additionalCharacterUrls] = await Promise.all([
      logoFile ? fileToBase64(logoFile).then(asset => `data:${asset.mimeType};base64,${asset.data}`) : Promise.resolve(logoPreview),
      characterFile ? fileToBase64(characterFile).then(asset => `data:${asset.mimeType};base64,${asset.data}`) : Promise.resolve(characterPreview),
      backgroundFile ? fileToBase64(backgroundFile).then(asset => `data:${asset.mimeType};base64,${asset.data}`) : Promise.resolve(backgroundPreview),
      artStyleFile ? fileToBase64(artStyleFile).then(asset => `data:${asset.mimeType};base64,${asset.data}`) : Promise.resolve(artStylePreview),
      ...characterFiles.slice(1).map((file: File) => fileToBase64(file).then(asset => `data:${asset.mimeType};base64,${asset.data}`))
    ]);

    // Collect all frames from storyboard
    const allFrames = storyboardData.scenes.flatMap((scene: Scene) => scene.frames);
    const scenes = storyboardData.scenes;

    // Save all images to Downloads folder
    let imagePaths = null;
    try {
      imagePaths = await saveProjectImages(
        title,
        logoUrl,
        characterUrl,
        allFrames,
        scenes,
        backgroundUrl,
        artStyleUrl,
        additionalCharacterUrls.filter(Boolean) as string[]
      );
      setSaveMessage("Images saved! Saving project...");
    } catch (error) {
      console.error('Failed to save images to Downloads:', error);
      setErrorMessage("Failed to save images. Project will be saved with embedded images.");
      setTimeout(() => setErrorMessage(''), 3000);
    }

    const newProject = {
      id: Date.now().toString(),
      title,
      storyboard: storyboardData,
      storyDescription,
      // New format: file paths
      logoPath: imagePaths?.logo || null,
      characterPath: imagePaths?.character || null,
      backgroundPath: imagePaths?.background || null,
      artStylePath: imagePaths?.artStyle || null,
      additionalCharacterPaths: imagePaths?.additionalCharacters || [],
      imagePaths: imagePaths || undefined,
      // Old format: base64 URLs (for backward compatibility and fallback)
      logoUrl: logoUrl,
      characterUrl: characterUrl,
      backgroundUrl: backgroundUrl,
      artStyleUrl: artStyleUrl,
      additionalCharacterUrls: additionalCharacterUrls.filter(Boolean) as string[],
      createdAt: new Date().toISOString(),
    };

    saveProject(newProject);
    setSaveMessage(`Project "${title}" saved successfully! Images saved to Downloads folder.`);

    // Navigate to My Projects page to see the saved project
    setTimeout(() => {
      logInfo('Navigating to My Projects view', {
        category: 'USER_ACTION',
        component: 'App',
        action: 'navigate',
        view: 'my-projects',
      });
      setCurrentView('my-projects');
      setSaveMessage('');
    }, 2000);
  }, [storyboardData, storyDescription, logoFile, characterFile, characterFiles, backgroundFile, artStyleFile, logoPreview, characterPreview, backgroundPreview, artStylePreview, characterPreviews, saveProject]);

  const handleLoadProject = useCallback((projectId: string) => {
    const projectToLoad = loadProject(projectId);
    if (projectToLoad) {
      setStoryboardData(projectToLoad.storyboard);
      setStoryDescription(projectToLoad.storyDescription);
      setLogoFile(null);
      setCharacterFile(null);
      setBackgroundFile(null);
      setArtStyleFile(null);
      setCharacterFiles([]);
      
      // Handle both new format (file paths) and old format (base64 URLs)
      // New format: use URL from ImageFileInfo (which contains the original URL)
      // Old format: use base64 URL directly
      const logoUrl = projectToLoad.logoPath?.url || projectToLoad.logoUrl || null;
      const characterUrl = projectToLoad.characterPath?.url || projectToLoad.characterUrl || null;
      const backgroundUrl = projectToLoad.backgroundPath?.url || projectToLoad.backgroundUrl || null;
      const artStyleUrl = projectToLoad.artStylePath?.url || projectToLoad.artStyleUrl || null;
      const additionalCharacterUrls = projectToLoad.additionalCharacterPaths?.map((p: { url: string }) => p.url) || projectToLoad.additionalCharacterUrls || [];
      
      setLogoPreview(logoUrl);
      setCharacterPreview(characterUrl);
      setBackgroundPreview(backgroundUrl);
      setArtStylePreview(artStyleUrl);
      setCharacterPreviews(additionalCharacterUrls);
      // Set main character and additional characters
      if (characterUrl) {
        setCharacterPreviews([characterUrl, ...additionalCharacterUrls]);
      } else {
        setCharacterPreviews(additionalCharacterUrls);
      }
      setActiveTab('storyboard');
      
      logInfo('Project loaded, navigating to dashboard', {
        category: 'USER_ACTION',
        component: 'App',
        action: 'load-project',
        projectId,
        projectName: projectToLoad.name,
      });
      
      setCurrentView('dashboard');
    }
  }, [loadProject, setStoryboardData]);

  const handleDeleteProject = useCallback((projectId: string) => {
    deleteProject(projectId);
  }, [deleteProject]);

  const handleVideoSelect = useCallback((video: YouTubeVideo) => {
    logInfo('Video selected for story inspiration', {
      category: 'USER_ACTION',
      component: 'App',
      action: 'select-video',
      videoId: video.id,
      videoTitle: video.title,
    });
    
    // Populate story description with video title and description
    const storyText = `${video.title}\n\n${video.description || ''}\n\nInspired by: ${video.url}`;
    setStoryDescription(storyText);
    // Navigate to dashboard
    setCurrentView('dashboard');
    // Optionally set video thumbnail as character reference
    if (video.thumbnail) {
      // Convert thumbnail URL to blob/file if needed
      // For now, we'll just use the URL directly
      setCharacterPreview(video.thumbnail);
    }
  }, []);

  const handleContinueNarrative = useCallback(async (customInstruction?: string) => {
    if (!storyboardData) {
      setErrorMessage("No storyboard to continue from.");
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }
    
    setErrorMessage('');
    // Get main character (first in array or single character file)
    const mainCharacter = characterFiles.length > 0 ? characterFiles[0] : characterFile;
    // Get additional characters (rest of array)
    const additionalCharacters = characterFiles.length > 1 ? characterFiles.slice(1) : [];
    
    await continueNarrative(
      logoFile,
      mainCharacter,
      storyboardData,
      aspectRatio,
      additionalCharacters,
      backgroundFile,
      artStyleFile,
      customInstruction
    );
  }, [storyboardData, logoFile, characterFile, characterFiles, aspectRatio, backgroundFile, artStyleFile, continueNarrative]);

  const handleExport = useCallback(async () => {
    if (!storyboardData) return;

    const exportStartTime = Date.now();
    
    logInfo('Starting project export', {
      category: 'USER_ACTION',
      component: 'App',
      action: 'export',
      scenesCount: storyboardData.scenes.length,
    });

    setSaveMessage("Preparing export pack...");

    const exportName = `BrandFrame_Export_${Date.now()}`;

    // 1. Save all images to Downloads
    try {
      const allFrames = storyboardData.scenes.flatMap((scene: Scene) => scene.frames);
      const additionalCharacterUrls = characterPreviews.slice(1); // Skip first (main character)
      await saveProjectImages(
        exportName,
        logoPreview,
        characterPreview,
        allFrames,
        storyboardData.scenes,
        backgroundPreview,
        artStylePreview,
        additionalCharacterUrls
      );
      setSaveMessage("Images saved! Saving export files...");
      
      logInfo('Project images saved successfully', {
        category: 'USER_ACTION',
        component: 'App',
        action: 'export-images',
        framesCount: allFrames.length,
      });
    } catch (error) {
      logError('Failed to save images during export', error, {
        category: 'USER_ACTION',
        component: 'App',
        action: 'export-images',
      });
      setSaveMessage("Warning: Some images may not have been saved.");
    }

    // 2. Create storyboard.json (complete data)
    const storyboardJSON = JSON.stringify(storyboardData, null, 2);

    // 3. Create prompts_veo.txt (comprehensive Veo prompts)
    const veoPrompts = storyboardData.scenes
      .map((s: Scene) => `Scene ${s.id}: ${s.title}\n${s.veoPrompt}`)
      .join('\n\n---\n\n');

    // 4. Create production_notes.txt (8-component tier hierarchy breakdown)
    const productionNotes = storyboardData.scenes
      .map((s: Scene) => {
        // Handle backward compatibility
        const cinematographyFormat = s.cinematographyFormat || s.cinematography || 'Not specified';
        const subjectIdentity = s.subjectIdentity || s.subject || 'Not specified';
        const sceneContext = s.sceneContext || s.sceneDescription || 'Not specified';
        const cameraComposition = s.cameraComposition || s.cinematography || 'Not specified';
        const styleAmbiance = s.styleAmbiance || s.style || 'Not specified';
        const audioDialogue = s.audioDialogue || 'Not specified';
        const technicalNegative = s.technicalNegative || 'Not specified';

        return `
═══════════════════════════════════════
${s.title} - LEVEL 9 PRODUCTION BREAKDOWN
═══════════════════════════════════════

SCRIPT LINE: "${s.scriptLine}"
EMOTION: ${s.emotion} | INTENT: ${s.intent}

─── TIER 1 (ARCHITECTURE - CRITICAL): CINEMATOGRAPHY & FORMAT ───
${cinematographyFormat}

─── TIER 2 (CORE SUBJECT): SUBJECT IDENTITY ───
${subjectIdentity}

─── TIER 3 (SCENE ANCHORS): SCENE & CONTEXT ───
${sceneContext}

─── TIER 4 (MOTION): ACTION ───
${s.action}

─── TIER 4 (MOTION): CAMERA & COMPOSITION ───
${cameraComposition}

─── TIER 5 (AESTHETICS): STYLE & AMBIANCE ───
${styleAmbiance}

─── TIER 6 (AUDIO): AUDIO & DIALOGUE ───
${audioDialogue}

─── TIER 7 (QUALITY CONTROL): TECHNICAL & NEGATIVE ───
${technicalNegative}

VEO 3.1 COMPREHENSIVE PROMPT (Optimized):
${s.veoPrompt}
`;
      })
      .join('\n\n');

    // Add Story-World parameterization if available
    let storyWorldSection = '';
    if (storyboardData.storyWorld) {
      const sw = storyboardData.storyWorld;
      storyWorldSection = `

═══════════════════════════════════════
STORY-WORLD [SW] PARAMETERIZATION
═══════════════════════════════════════

PREMISE / LOGLINE:
${sw.premise}

THEME:
${sw.theme}

STRUCTURE:
Act 1 (Setup): ${sw.structure.act1}
Act 2 (Confrontation): ${sw.structure.act2}
Act 3 (Resolution): ${sw.structure.act3}

STRUCTURAL ATTRACTORS:
${sw.structure.attractors.map((a: string, i: number) => `${i + 1}. ${a}`).join('\n')}

CHARACTER BLUEPRINT (Verbatim Template):
${sw.characterBlueprint}

CORE CONFLICT:
Internal: ${sw.coreConflict.internal}
External: ${sw.coreConflict.external}

BOUNDARIES & LOGIC:
[Spatial Logic]: ${sw.boundaries.spatial}
[Temporal Logic]: ${sw.boundaries.temporal}
[Historical Setting]: ${sw.boundaries.historical}
[Visual Style]: ${sw.boundaries.visual}

`;
    }

    // 5. Create captions.srt
    let srtContent = '';
    storyboardData.scenes.forEach((scene: Scene, index: number) => {
      const startTime = index * 5;
      const endTime = (index + 1) * 5;
      const formatTime = (seconds: number) => new Date(seconds * 1000).toISOString().substr(11, 12).replace('.', ',');
      srtContent += `${index + 1}\n${formatTime(startTime)} --> ${formatTime(endTime)}\n${scene.scriptLine}\n\n`;
    });

    // Helper function to download text file
    const downloadTextFile = (content: string, filename: string) => {
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${exportName}_${filename}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    };

    // Download all text files
    downloadTextFile(storyboardJSON, 'storyboard.json');
    if (storyWorldSection) {
      downloadTextFile(storyWorldSection, 'story_world.txt');
    }
    downloadTextFile(veoPrompts, 'prompts_veo.txt');
    downloadTextFile(productionNotes + storyWorldSection, 'production_notes.txt');
    downloadTextFile(srtContent, 'captions.srt');

    const exportDuration = Date.now() - exportStartTime;
    
    logInfo('Export pack completed successfully', {
      category: 'USER_ACTION',
      component: 'App',
      action: 'export-complete',
      duration: `${exportDuration}ms`,
      scenesCount: storyboardData.scenes.length,
      exportName,
    });

    setSaveMessage("Export pack saved to Downloads folder!");
    setTimeout(() => setSaveMessage(''), 3000);

  }, [storyboardData, logoPreview, characterPreview, backgroundPreview, artStylePreview, characterPreviews]);

  return (
    <ErrorBoundary>
      <div className="bg-gray-50 min-h-screen flex text-gray-800">
        {errorMessage && (
          <div className="fixed top-4 right-4 bg-red-50 border border-red-200 rounded-lg shadow-lg p-4 z-50 max-w-md">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <p className="text-sm text-red-800">{errorMessage}</p>
              </div>
              <button
                onClick={() => setErrorMessage('')}
                className="text-red-600 hover:text-red-800"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
        <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
        <div className="flex-1 flex flex-col lg:flex-row ml-0 lg:ml-64">
        {currentView === 'dashboard' ? (
          <>
            <InputPanel
              onLogoChange={handleLogoChange}
              onCharacterChange={handleCharacterChange}
              logoPreview={logoPreview}
              characterPreview={characterPreview}
              story={storyDescription}
              onStoryChange={setStoryDescription}
              aspectRatio={aspectRatio}
              onAspectRatioChange={setAspectRatio}
              frameCount={frameCount}
              onFrameCountChange={setFrameCount}
              onGenerate={handleGenerate}
              isLoading={isLoading}
              onBackgroundChange={handleBackgroundChange}
              onArtStyleChange={handleArtStyleChange}
              onCharactersChange={handleCharactersChange}
              onRemoveCharacter={handleRemoveCharacter}
              backgroundPreview={backgroundPreview}
              artStylePreview={artStylePreview}
              characterPreviews={characterPreviews}
              characterFiles={characterFiles}
            />
            <Dashboard
              storyboard={storyboardData}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onExport={handleExport}
              onSave={handleSaveProject}
              onContinueNarrative={handleContinueNarrative}
              isLoading={isLoading}
              saveMessage={saveMessage}
              progress={progress}
            />
          </>
        ) : currentView === 'my-projects' ? (
          <MyProjects 
            projects={savedProjects}
            onLoad={handleLoadProject}
            onDelete={handleDeleteProject}
          />
        ) : (
          <ViralShortsView onVideoSelect={handleVideoSelect} />
        )}
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;