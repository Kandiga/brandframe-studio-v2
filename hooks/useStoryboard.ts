import { useState, useCallback, useEffect, useRef } from 'react';
import { Storyboard, GenerationProgress } from '../types.js';
import { generateStoryboard } from '../services/geminiService.js';
import { createErrorMessage } from '../utils/errorHandler.js';
import { logInfo, logError, logDebug, time, timeEnd } from '../utils/logger.js';

// Helper to calculate estimated time remaining based on progress
const calculateTimeRemaining = (
  progress: number,
  elapsedTime: number,
  baseEstimatedTime: number
): number => {
  if (progress <= 0) return baseEstimatedTime;
  if (progress >= 100) return 0;

  // Use both progress-based and time-based estimates for more accuracy
  const progressRatio = progress / 100;

  // Estimate based on current pace
  const estimatedTotalFromPace = elapsedTime / progressRatio;

  // Weighted average: 70% based on actual pace, 30% based on initial estimate
  const estimatedTotal = (estimatedTotalFromPace * 0.7) + (baseEstimatedTime * 0.3);

  const estimatedRemaining = Math.max(0, estimatedTotal - elapsedTime);
  return Math.round(estimatedRemaining);
};

interface UseStoryboardOptions {
  onSuccess?: (storyboard: Storyboard) => void;
  onError?: (error: string) => void;
  onProgress?: (progress: GenerationProgress) => void;
}

/**
 * Custom hook for managing storyboard generation
 */
export function useStoryboard(options: UseStoryboardOptions = {}) {
  const [storyboard, setStoryboard] = useState<Storyboard | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const progressStartTimeRef = useRef<number | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Store callbacks in refs to avoid dependency issues
  const onSuccessRef = useRef(options.onSuccess);
  const onErrorRef = useRef(options.onError);
  const onProgressRef = useRef(options.onProgress);

  // Update refs when options change
  useEffect(() => {
    onSuccessRef.current = options.onSuccess;
    onErrorRef.current = options.onError;
    onProgressRef.current = options.onProgress;
  }, [options.onSuccess, options.onError, options.onProgress]);

  const generate = useCallback(async (
    logo: File | null,
    character: File | null,
    story: string,
    aspectRatio: '16:9' | '9:16' = '16:9',
    additionalCharacters: File[] = [],
    background: File | null = null,
    artStyle: File | null = null,
    frameCount: number = 4
  ) => {
    if (!story.trim()) {
      const errorMsg = 'Please describe your story before generating.';
      setError(errorMsg);
      onErrorRef.current?.(errorMsg);
      return;
    }

    setIsLoading(true);
    setError(null);
    setStoryboard(null);
    const generationStartTime = Date.now();
    
    // Estimate time based on frame count with more accurate calculations
    const sceneCount = frameCount / 2;
    const baseStoryWorldTime = 10; // seconds for story world architecture
    const scriptTimePerScene = 15; // seconds per scene for script generation
    const imageTimePerFrame = 25; // seconds per frame for AI image generation
    const totalEstimatedTime = baseStoryWorldTime + (scriptTimePerScene * sceneCount) + (imageTimePerFrame * frameCount);
    
    progressStartTimeRef.current = generationStartTime;
    
    // Clear any existing interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    
    // Start interval to update elapsed time every second
    const isGeneratingRef = { current: true };
    progressIntervalRef.current = setInterval(() => {
      if (progressStartTimeRef.current && isGeneratingRef.current) {
        const elapsed = Math.round((Date.now() - progressStartTimeRef.current) / 1000);
        setProgress(prev => {
          if (!prev) return null;
          const estimatedRemaining = calculateTimeRemaining(
            prev.progress,
            elapsed,
            totalEstimatedTime
          );
          return {
            ...prev,
            elapsedTime: elapsed,
            estimatedTimeRemaining: prev.estimatedTimeRemaining || estimatedRemaining,
          };
        });
      }
    }, 1000);
    
    setProgress({ 
      phase: 'story-world', 
      progress: 0, 
      message: 'מתחיל יצירה...',
      estimatedTimeRemaining: totalEstimatedTime,
      elapsedTime: 0
    });
    
    logInfo('Starting storyboard generation', {
      category: 'GENERATION',
      component: 'useStoryboard',
      action: 'generate',
      hasStory: !!story,
      storyLength: story.length,
      hasLogo: !!logo,
      hasCharacter: !!character,
      hasBackground: !!background,
      hasArtStyle: !!artStyle,
      additionalCharactersCount: additionalCharacters.length,
      aspectRatio,
    });

    time('storyboard-generation');

    try {
      const progressCallback = (prog: { phase: string; progress: number; message: string; currentScene?: number; totalScenes?: number; currentFrame?: string; estimatedTimeRemaining?: number; elapsedTime?: number }) => {
        const elapsed = prog.elapsedTime !== undefined ? prog.elapsedTime : Math.round((Date.now() - generationStartTime) / 1000);
        
        logDebug('Storyboard generation progress', {
          category: 'GENERATION',
          component: 'useStoryboard',
          phase: prog.phase,
          progress: prog.progress,
          message: prog.message,
          currentScene: prog.currentScene,
          totalScenes: prog.totalScenes,
          estimatedTimeRemaining: prog.estimatedTimeRemaining,
          elapsedTime: elapsed,
        });
        
        const progressData: GenerationProgress = {
          phase: prog.phase as GenerationProgress['phase'],
          progress: prog.progress,
          message: prog.message,
          currentScene: prog.currentScene,
          totalScenes: prog.totalScenes,
          currentFrame: prog.currentFrame as 'A' | 'B' | undefined,
          estimatedTimeRemaining: prog.estimatedTimeRemaining,
          elapsedTime: elapsed,
        };
        setProgress(progressData);
        onProgressRef.current?.(progressData);
      };
      
      const data = await generateStoryboard(
        logo, 
        character, 
        story, 
        aspectRatio, 
        additionalCharacters, 
        background, 
        artStyle,
        frameCount,
        progressCallback
      );
      
      const duration = Date.now() - generationStartTime;
      timeEnd('storyboard-generation', {
        category: 'GENERATION',
        component: 'useStoryboard',
        duration: `${duration}ms`,
      });
      
      logInfo('Storyboard generation completed successfully', {
        category: 'GENERATION',
        component: 'useStoryboard',
        action: 'generate',
        duration: `${duration}ms`,
        scenesCount: data.scenes?.length || 0,
      });
      
      isGeneratingRef.current = false;
      setStoryboard(data);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      const finalElapsed = Math.round((Date.now() - generationStartTime) / 1000);
      setProgress({ 
        phase: 'complete', 
        progress: 100, 
        message: 'יצירה הושלמה בהצלחה!',
        elapsedTime: finalElapsed,
        estimatedTimeRemaining: 0
      });
      progressStartTimeRef.current = null;
      onSuccessRef.current?.(data);
    } catch (err) {
      const duration = Date.now() - generationStartTime;
      timeEnd('storyboard-generation', {
        category: 'GENERATION',
        component: 'useStoryboard',
        duration: `${duration}ms`,
        error: true,
      });
      
      logError('Storyboard generation failed', err, {
        category: 'GENERATION',
        component: 'useStoryboard',
        action: 'generate',
        duration: `${duration}ms`,
        storyLength: story.length,
      });
      
      isGeneratingRef.current = false;
      const errorMsg = createErrorMessage(err);
      setError(errorMsg);
      setProgress(null);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      progressStartTimeRef.current = null;
      onErrorRef.current?.(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    logInfo('Resetting storyboard state', {
      category: 'USER_ACTION',
      component: 'useStoryboard',
      action: 'reset',
    });
    
    setStoryboard(null);
    setError(null);
    setIsLoading(false);
    setProgress(null);
  }, []);

  const setStoryboardData = useCallback((data: Storyboard | null) => {
    setStoryboard(data);
    setError(null);
  }, []);

  const continueNarrative = useCallback(async (
    logo: File | null,
    character: File | null,
    existingStoryboard: Storyboard,
    aspectRatio: '16:9' | '9:16' = '16:9',
    additionalCharacters: File[] = [],
    background: File | null = null,
    artStyle: File | null = null,
    customInstruction?: string
  ) => {
    if (!existingStoryboard || !existingStoryboard.scenes || existingStoryboard.scenes.length === 0) {
      const errorMsg = 'No existing storyboard to continue from.';
      setError(errorMsg);
      onErrorRef.current?.(errorMsg);
      return;
    }

    setIsLoading(true);
    setError(null);
    const generationStartTime = Date.now();
    
    // Estimate time for continuation (1 scene = 2 frames)
    const continuationEstimatedTime = 20 + (30 * 2); // 20s script + 30s per frame * 2 frames
    
    progressStartTimeRef.current = generationStartTime;
    
    // Clear any existing interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    
    // Start interval to update elapsed time every second
    const isGeneratingRef = { current: true };
    progressIntervalRef.current = setInterval(() => {
      if (progressStartTimeRef.current && isGeneratingRef.current) {
        const elapsed = Math.round((Date.now() - progressStartTimeRef.current) / 1000);
        setProgress(prev => {
          if (!prev) return null;
          const estimatedRemaining = calculateTimeRemaining(
            prev.progress,
            elapsed,
            continuationEstimatedTime
          );
          return {
            ...prev,
            elapsedTime: elapsed,
            estimatedTimeRemaining: prev.estimatedTimeRemaining || estimatedRemaining,
          };
        });
      }
    }, 1000);
    
    setProgress({ 
      phase: 'story-world', 
      progress: 0, 
      message: 'ממשיך נרטיב...',
      estimatedTimeRemaining: continuationEstimatedTime,
      elapsedTime: 0
    });
    
    logInfo('Continuing narrative', {
      category: 'GENERATION',
      component: 'useStoryboard',
      action: 'continue-narrative',
      existingScenesCount: existingStoryboard.scenes.length,
      hasCustomInstruction: !!customInstruction,
      customInstructionLength: customInstruction?.length || 0,
    });

    time('narrative-continuation');

    try {
      const progressCallback = (prog: { phase: string; progress: number; message: string; currentScene?: number; totalScenes?: number; currentFrame?: string; estimatedTimeRemaining?: number; elapsedTime?: number }) => {
        const elapsed = prog.elapsedTime !== undefined ? prog.elapsedTime : Math.round((Date.now() - generationStartTime) / 1000);
        
        logDebug('Narrative continuation progress', {
          category: 'GENERATION',
          component: 'useStoryboard',
          phase: prog.phase,
          progress: prog.progress,
          message: prog.message,
          currentScene: prog.currentScene,
          totalScenes: prog.totalScenes,
          estimatedTimeRemaining: prog.estimatedTimeRemaining,
          elapsedTime: elapsed,
        });
        
        const progressData: GenerationProgress = {
          phase: prog.phase as GenerationProgress['phase'],
          progress: prog.progress,
          message: prog.message,
          currentScene: prog.currentScene,
          totalScenes: prog.totalScenes,
          currentFrame: prog.currentFrame as 'A' | 'B' | undefined,
          estimatedTimeRemaining: prog.estimatedTimeRemaining,
          elapsedTime: elapsed,
        };
        setProgress(progressData);
        onProgressRef.current?.(progressData);
      };
      
      const { continueStoryboard } = await import('../services/geminiService.js');
      const newScenes = await continueStoryboard(
        logo, 
        character, 
        existingStoryboard,
        aspectRatio, 
        additionalCharacters, 
        background, 
        artStyle,
        customInstruction,
        progressCallback
      );
      
      // Merge new scenes with existing storyboard
      const updatedStoryboard: Storyboard = {
        ...existingStoryboard,
        scenes: [...existingStoryboard.scenes, ...newScenes],
      };
      
      const duration = Date.now() - generationStartTime;
      timeEnd('narrative-continuation', {
        category: 'GENERATION',
        component: 'useStoryboard',
        duration: `${duration}ms`,
      });
      
      logInfo('Narrative continuation completed successfully', {
        category: 'GENERATION',
        component: 'useStoryboard',
        action: 'continue-narrative',
        duration: `${duration}ms`,
        newScenesCount: newScenes.length,
        totalScenesCount: updatedStoryboard.scenes.length,
      });
      
      isGeneratingRef.current = false;
      setStoryboard(updatedStoryboard);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      const finalElapsed = Math.round((Date.now() - generationStartTime) / 1000);
      setProgress({ 
        phase: 'complete', 
        progress: 100, 
        message: 'המשך נרטיב הושלם בהצלחה!',
        elapsedTime: finalElapsed,
        estimatedTimeRemaining: 0
      });
      progressStartTimeRef.current = null;
      onSuccessRef.current?.(updatedStoryboard);
    } catch (err) {
      const duration = Date.now() - generationStartTime;
      timeEnd('narrative-continuation', {
        category: 'GENERATION',
        component: 'useStoryboard',
        duration: `${duration}ms`,
        error: true,
      });
      
      logError('Narrative continuation failed', err, {
        category: 'GENERATION',
        component: 'useStoryboard',
        action: 'continue-narrative',
        duration: `${duration}ms`,
      });
      
      // Stop the interval
      isGeneratingRef.current = false;
      const errorMsg = createErrorMessage(err);
      setError(errorMsg);
      setProgress(null);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      progressStartTimeRef.current = null;
      onErrorRef.current?.(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    storyboard,
    isLoading,
    error,
    progress,
    generate,
    continueNarrative,
    reset,
    setStoryboard: setStoryboardData,
  };
}

