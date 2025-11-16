import { Storyboard, Scene } from '../types';
import { apiClient } from '../utils/apiClient.js';
import { logInfo, logError, logDebug, time, timeEnd } from '../utils/logger.js';
import { getSupabaseUrl, getSupabaseAnonKey } from '../config/supabase';

// Helper to convert File object to a base64 string with MIME type
const fileToBase64 = (file: File): Promise<{ mimeType: string, data: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        return reject(new Error("FileReader did not return a string."));
      }
      const result = reader.result;
      // e.g., "data:image/png;base64,iVBORw0KGgo..."
      const mimeType = result.substring(result.indexOf(':') + 1, result.indexOf(';'));
      const base64Data = result.substring(result.indexOf(',') + 1);
      resolve({ mimeType, data: base64Data });
    };
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
};

/**
 * Generates a storyboard by calling the backend API
 * This ensures API keys are kept secure on the server
 */
export const generateStoryboard = async (
  logo: File | null,
  character: File | null,
  story: string,
  aspectRatio: '16:9' | '9:16' = '16:9',
  additionalCharacters: File[] = [],
  background: File | null = null,
  artStyle: File | null = null,
  frameCount: number = 4,
  onProgress?: (progress: { phase: string; progress: number; message: string; currentScene?: number; totalScenes?: number; currentFrame?: string; estimatedTimeRemaining?: number; elapsedTime?: number }) => void
): Promise<Storyboard> => {
  const startTime = Date.now();
  
  logInfo('Generating storyboard via backend API', {
    category: 'GENERATION',
    component: 'geminiService',
    action: 'generate',
    storyLength: story.length,
    aspectRatio,
  });

  // Check file sizes before processing (base64 increases size by ~33%)
  // Increased limit to allow larger images while staying within 200MB server limit
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB per file (will be ~67MB as base64)
  const checkFileSize = (file: File | null, name: string) => {
    if (file && file.size > MAX_FILE_SIZE) {
      const error = new Error(`${name} file is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 50MB. Please compress or resize the image.`);
      logError('File size validation failed', error, {
        category: 'VALIDATION',
        component: 'geminiService',
        fileName: name,
        fileSize: `${(file.size / 1024 / 1024).toFixed(1)}MB`,
        maxSize: '50MB',
      });
      throw error;
    }
  };
  
  checkFileSize(logo, 'Logo');
  checkFileSize(character, 'Character');
  checkFileSize(background, 'Background');
  checkFileSize(artStyle, 'Art style');
  additionalCharacters.forEach((char, index) => {
    checkFileSize(char, `Additional character ${index + 1}`);
  });

  // Convert all assets to base64 in parallel
  const conversionStartTime = Date.now();
  
  logDebug('Converting files to base64', {
    category: 'GENERATION',
    component: 'geminiService',
    action: 'file-conversion',
    fileCount: [logo, character, background, artStyle, ...additionalCharacters].filter(Boolean).length,
  });
  
  time('file-to-base64-conversion');
  
  const [logoAsset, characterAsset, backgroundAsset, artStyleAsset, ...additionalCharacterAssets] = await Promise.all([
    logo ? fileToBase64(logo) : Promise.resolve(null),
    character ? fileToBase64(character) : Promise.resolve(null),
    background ? fileToBase64(background) : Promise.resolve(null),
    artStyle ? fileToBase64(artStyle) : Promise.resolve(null),
    ...additionalCharacters.map(char => fileToBase64(char))
  ]);
  
  const conversionDuration = Date.now() - conversionStartTime;
  timeEnd('file-to-base64-conversion', {
    category: 'GENERATION',
    component: 'geminiService',
    duration: `${conversionDuration}ms`,
  });
  
  logDebug('Files converted to base64', {
    category: 'GENERATION',
    component: 'geminiService',
    duration: `${conversionDuration}ms`,
    logoSize: logoAsset ? `${(logoAsset.data.length / 1024).toFixed(2)}KB` : undefined,
    characterSize: characterAsset ? `${(characterAsset.data.length / 1024).toFixed(2)}KB` : undefined,
  });

  // Call backend API using API client
  // Note: Progress tracking would need WebSocket or Server-Sent Events for real-time updates
  // For now, we'll handle progress on the backend and return when complete
  
  logDebug('Sending request to backend API', {
    category: 'GENERATION',
    component: 'geminiService',
    action: 'api-request',
    hasStory: !!story,
    storyLength: story.length,
    hasLogo: !!logoAsset,
    hasCharacter: !!characterAsset,
    hasBackground: !!backgroundAsset,
    hasArtStyle: !!artStyleAsset,
    additionalCharactersCount: additionalCharacterAssets.length,
    aspectRatio,
  });
  
  // Update progress immediately
  onProgress?.({ phase: 'story-world', progress: 5, message: 'Connecting to server...' });

  time('storyboard-api-call');

  try {
    const SUPABASE_URL = getSupabaseUrl();
    const SUPABASE_ANON_KEY = getSupabaseAnonKey();

    const apiResponse = await fetch(`${SUPABASE_URL}/functions/v1/gemini-storyboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        logoAsset,
        mainCharacterAsset: characterAsset,
        additionalCharacterAssets: additionalCharacterAssets.filter(Boolean),
        backgroundAsset,
        artStyleAsset,
        story,
        aspectRatio,
        frameCount,
      }),
    });

    const contentType = apiResponse.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const textResponse = await apiResponse.text();
      logError('Non-JSON response from API', new Error('Invalid response format'), {
        category: 'GENERATION',
        component: 'geminiService',
        contentType,
        responsePreview: textResponse.substring(0, 200),
        status: apiResponse.status,
      });

      if (apiResponse.status === 500) {
        throw new Error('Server error: The GEMINI_API_KEY is not configured in Supabase. Please add your Gemini API key to Supabase Project Settings > Edge Functions > Secrets.');
      }

      throw new Error(`API returned invalid response (${apiResponse.status}). Expected JSON but received ${contentType || 'unknown'}. Please check your Supabase Edge Function configuration.`);
    }

    const responseData = await apiResponse.json();
    const response = {
      success: responseData.success,
      data: responseData.data,
      error: responseData.error,
      code: apiResponse.status,
    };

    const apiCallDuration = Date.now() - startTime;
    timeEnd('storyboard-api-call', {
      category: 'GENERATION',
      component: 'geminiService',
      duration: `${apiCallDuration}ms`,
    });

    logDebug('Received response from backend API', {
      category: 'GENERATION',
      component: 'geminiService',
      success: response.success,
      hasData: !!response.data,
      error: response.error,
      code: response.code,
    });
    
    // Simulate progress updates (in real implementation, use WebSocket/SSE)
    if (onProgress && response.data) {
      onProgress({ phase: 'complete', progress: 100, message: 'Storyboard generated successfully!' });
    }

    if (!response.success || !response.data) {
      const errorMsg = response.error || 'Failed to generate storyboard';
      const totalDuration = Date.now() - startTime;
      logError('Backend returned error', new Error(errorMsg), {
        category: 'GENERATION',
        component: 'geminiService',
        action: 'generate',
        duration: `${totalDuration}ms`,
        errorCode: response.code,
      });
      throw new Error(errorMsg);
    }

    const totalDuration = Date.now() - startTime;
    logInfo('Storyboard generation successful', {
      category: 'GENERATION',
      component: 'geminiService',
      action: 'generate',
      duration: `${totalDuration}ms`,
      scenesCount: response.data.scenes?.length || 0,
    });
    
    return response.data;
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    logError('Error during storyboard generation', error, {
      category: 'GENERATION',
      component: 'geminiService',
      action: 'generate',
      duration: `${totalDuration}ms`,
    });
    
    onProgress?.({ phase: 'complete', progress: 0, message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` });
    throw error;
  }
};

/**
 * Continues a narrative by generating 2 more frames that continue from the existing storyboard
 */
export const continueStoryboard = async (
  logo: File | null,
  character: File | null,
  existingStoryboard: Storyboard,
  aspectRatio: '16:9' | '9:16' = '16:9',
  additionalCharacters: File[] = [],
  background: File | null = null,
  artStyle: File | null = null,
  customInstruction?: string,
  onProgress?: (progress: { phase: string; progress: number; message: string; currentScene?: number; totalScenes?: number; currentFrame?: string; estimatedTimeRemaining?: number; elapsedTime?: number }) => void
): Promise<Scene[]> => {
  const startTime = Date.now();
  
  logInfo('Continuing storyboard via backend API', {
    category: 'GENERATION',
    component: 'geminiService',
    action: 'continue',
    existingScenesCount: existingStoryboard.scenes.length,
    hasCustomInstruction: !!customInstruction,
    aspectRatio,
  });

  // Check file sizes before processing
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB per file
  const checkFileSize = (file: File | null, name: string) => {
    if (file && file.size > MAX_FILE_SIZE) {
      const error = new Error(`${name} file is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 50MB.`);
      logError('File size validation failed', error, {
        category: 'VALIDATION',
        component: 'geminiService',
        fileName: name,
        fileSize: `${(file.size / 1024 / 1024).toFixed(1)}MB`,
        maxSize: '50MB',
      });
      throw error;
    }
  };
  
  checkFileSize(logo, 'Logo');
  checkFileSize(character, 'Character');
  checkFileSize(background, 'Background');
  checkFileSize(artStyle, 'Art style');
  additionalCharacters.forEach((char, index) => {
    checkFileSize(char, `Additional character ${index + 1}`);
  });

  // Convert all assets to base64 in parallel
  const conversionStartTime = Date.now();
  
  logDebug('Converting files to base64 for continuation', {
    category: 'GENERATION',
    component: 'geminiService',
    action: 'file-conversion',
    fileCount: [logo, character, background, artStyle, ...additionalCharacters].filter(Boolean).length,
  });
  
  time('file-to-base64-conversion-continue');
  
  const [logoAsset, characterAsset, backgroundAsset, artStyleAsset, ...additionalCharacterAssets] = await Promise.all([
    logo ? fileToBase64(logo) : Promise.resolve(null),
    character ? fileToBase64(character) : Promise.resolve(null),
    background ? fileToBase64(background) : Promise.resolve(null),
    artStyle ? fileToBase64(artStyle) : Promise.resolve(null),
    ...additionalCharacters.map(char => fileToBase64(char))
  ]);
  
  const conversionDuration = Date.now() - conversionStartTime;
  timeEnd('file-to-base64-conversion-continue', {
    category: 'GENERATION',
    component: 'geminiService',
    duration: `${conversionDuration}ms`,
  });
  
  logDebug('Files converted to base64 for continuation', {
    category: 'GENERATION',
    component: 'geminiService',
    duration: `${conversionDuration}ms`,
  });

  // Update progress
  onProgress?.({ phase: 'story-world', progress: 5, message: 'Connecting to server...' });

  time('continue-storyboard-api-call');

  try {
    const SUPABASE_URL = getSupabaseUrl();
    const SUPABASE_ANON_KEY = getSupabaseAnonKey();

    const apiResponse = await fetch(`${SUPABASE_URL}/functions/v1/gemini-storyboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        logoAsset,
        mainCharacterAsset: characterAsset,
        additionalCharacterAssets: additionalCharacterAssets.filter(Boolean),
        backgroundAsset,
        artStyleAsset,
        existingStoryboard,
        aspectRatio,
        customInstruction,
        continue: true,
      }),
    });

    const contentType = apiResponse.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const textResponse = await apiResponse.text();
      logError('Non-JSON response from API', new Error('Invalid response format'), {
        category: 'GENERATION',
        component: 'geminiService',
        contentType,
        responsePreview: textResponse.substring(0, 200),
        status: apiResponse.status,
      });

      if (apiResponse.status === 500) {
        throw new Error('Server error: The GEMINI_API_KEY is not configured in Supabase. Please add your Gemini API key to Supabase Project Settings > Edge Functions > Secrets.');
      }

      throw new Error(`API returned invalid response (${apiResponse.status}). Expected JSON but received ${contentType || 'unknown'}. Please check your Supabase Edge Function configuration.`);
    }

    const responseData = await apiResponse.json();
    const response = {
      success: responseData.success,
      data: responseData.data,
      error: responseData.error,
      code: apiResponse.status,
    };

    const apiCallDuration = Date.now() - startTime;
    timeEnd('continue-storyboard-api-call', {
      category: 'GENERATION',
      component: 'geminiService',
      duration: `${apiCallDuration}ms`,
    });
    
    logDebug('Received continuation response from backend API', {
      category: 'GENERATION',
      component: 'geminiService',
      success: response.success,
      hasData: !!response.data,
      error: response.error,
      code: response.code,
    });
    
    // Simulate progress updates
    if (onProgress && response.data) {
      onProgress({ phase: 'complete', progress: 100, message: 'Continuation generated successfully!' });
    }

    if (!response.success || !response.data) {
      let errorMsg = response.error || 'Failed to continue storyboard';
      
      // Check if it's a 404 error (route not found)
      if (response.code === 404 || errorMsg.includes('404') || errorMsg.includes('not found')) {
        errorMsg = 'The continue narrative feature is not available. Please restart the backend server to enable this feature.';
      }
      
      const totalDuration = Date.now() - startTime;
      logError('Backend returned error for continuation', new Error(errorMsg), {
        category: 'GENERATION',
        component: 'geminiService',
        action: 'continue',
        duration: `${totalDuration}ms`,
        errorCode: response.code,
        statusCode: response.statusCode,
      });
      throw new Error(errorMsg);
    }

    const totalDuration = Date.now() - startTime;
    logInfo('Storyboard continuation successful', {
      category: 'GENERATION',
      component: 'geminiService',
      action: 'continue',
      duration: `${totalDuration}ms`,
      newScenesCount: response.data.scenes?.length || 0,
    });
    
    return response.data.scenes;
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    logError('Error during storyboard continuation', error, {
      category: 'GENERATION',
      component: 'geminiService',
      action: 'continue',
      duration: `${totalDuration}ms`,
    });
    
    onProgress?.({ phase: 'complete', progress: 0, message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` });
    throw error;
  }
};
