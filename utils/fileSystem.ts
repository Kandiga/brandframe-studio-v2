/**
 * File System utilities for saving images to Downloads folder
 * Uses File System Access API when available, falls back to download API
 */

import { ImageFileInfo, ProjectImagePaths } from '../types.js';

/**
 * Converts base64 data URL to Blob
 */
function dataURLToBlob(dataURL: string): Blob {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Sanitizes a string to be used as a filename
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 100);
}

/**
 * Gets file extension from MIME type or data URL
 */
function getFileExtension(dataURL: string, defaultExt: string = 'png'): string {
  const mimeMatch = dataURL.match(/data:([^;]+)/);
  if (mimeMatch) {
    const mime = mimeMatch[1];
    if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
    if (mime.includes('png')) return 'png';
    if (mime.includes('svg')) return 'svg';
    if (mime.includes('webp')) return 'webp';
  }
  return defaultExt;
}

/**
 * Saves a single image file using File System Access API or download fallback
 */
export async function saveImageToDownloads(
  imageUrl: string,
  filename: string,
  directoryHandle?: FileSystemDirectoryHandle
): Promise<ImageFileInfo> {
  // Convert data URL to blob if needed
  let blob: Blob;
  if (imageUrl.startsWith('data:')) {
    blob = dataURLToBlob(imageUrl);
  } else if (imageUrl.startsWith('blob:')) {
    const response = await fetch(imageUrl);
    blob = await response.blob();
  } else {
    // External URL - fetch it
    const response = await fetch(imageUrl);
    blob = await response.blob();
  }

  // Use File System Access API if directory handle is provided
  if (directoryHandle && 'showDirectoryPicker' in window) {
    try {
      const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      
      return {
        path: filename,
        filename,
        url: imageUrl, // Keep original URL for display
      };
    } catch (error) {
      console.warn('Failed to save using File System Access API:', error);
      // Fall through to download API
    }
  }

  // Fallback to download API
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return {
    path: filename,
    filename,
    url: imageUrl,
  };
}

/**
 * Saves all project images to Downloads folder
 * Creates a folder structure: BrandFrame_ProjectName_Timestamp/
 */
export async function saveProjectImages(
  projectName: string,
  logoUrl: string | null,
  characterUrl: string | null,
  storyboardFrames: Array<{ id: string; variant: 'A' | 'B'; imageUrl: string }>,
  scenes: Array<{ id: number; title: string }>,
  backgroundUrl?: string | null,
  artStyleUrl?: string | null,
  additionalCharacterUrls?: string[]
): Promise<ProjectImagePaths> {
  const sanitizedName = sanitizeFilename(projectName);
  const timestamp = Date.now();
  const folderName = `BrandFrame_${sanitizedName}_${timestamp}`;

  let directoryHandle: FileSystemDirectoryHandle | undefined;

  // Try to get directory handle using File System Access API
  if ('showDirectoryPicker' in window) {
    try {
      // Request permission to access Downloads folder
      // Note: This will prompt the user to select a folder
      // For now, we'll use download API which saves to Downloads by default
      // In the future, we could use showDirectoryPicker() to let user choose
    } catch (error) {
      console.warn('File System Access API not available:', error);
    }
  }

  const imagePaths: ProjectImagePaths = {
    logo: null,
    character: null,
    background: null,
    artStyle: null,
    additionalCharacters: [],
    frames: [],
  };

  // Save logo
  if (logoUrl) {
    const logoExt = getFileExtension(logoUrl);
    // Use folder name as prefix for better organization
    const logoFilename = `${folderName}_logo.${logoExt}`;
    try {
      imagePaths.logo = await saveImageToDownloads(logoUrl, logoFilename, directoryHandle);
    } catch (error) {
      console.error('Failed to save logo:', error);
    }
  }

  // Save character
  if (characterUrl) {
    const charExt = getFileExtension(characterUrl);
    const charFilename = `${folderName}_character_main.${charExt}`;
    try {
      imagePaths.character = await saveImageToDownloads(characterUrl, charFilename, directoryHandle);
    } catch (error) {
      console.error('Failed to save character:', error);
    }
  }
  
  // Save background
  if (backgroundUrl) {
    const bgExt = getFileExtension(backgroundUrl);
    const bgFilename = `${folderName}_background.${bgExt}`;
    try {
      imagePaths.background = await saveImageToDownloads(backgroundUrl, bgFilename, directoryHandle);
    } catch (error) {
      console.error('Failed to save background:', error);
    }
  }
  
  // Save art style
  if (artStyleUrl) {
    const artExt = getFileExtension(artStyleUrl);
    const artFilename = `${folderName}_art_style.${artExt}`;
    try {
      imagePaths.artStyle = await saveImageToDownloads(artStyleUrl, artFilename, directoryHandle);
    } catch (error) {
      console.error('Failed to save art style:', error);
    }
  }
  
  // Save additional characters
  if (additionalCharacterUrls && additionalCharacterUrls.length > 0) {
    for (let i = 0; i < additionalCharacterUrls.length; i++) {
      const charUrl = additionalCharacterUrls[i];
      if (charUrl) {
        const charExt = getFileExtension(charUrl);
        const charFilename = `${folderName}_character_${i + 2}.${charExt}`;
        try {
          const savedChar = await saveImageToDownloads(charUrl, charFilename, directoryHandle);
          imagePaths.additionalCharacters = imagePaths.additionalCharacters || [];
          imagePaths.additionalCharacters.push(savedChar);
        } catch (error) {
          console.error(`Failed to save additional character ${i + 2}:`, error);
        }
      }
    }
  }

  // Save storyboard frames
  for (const frame of storyboardFrames) {
    const scene = scenes.find(s => `${s.id}A` === frame.id || `${s.id}B` === frame.id);
    const sceneTitle = scene ? sanitizeFilename(scene.title) : `Scene${scene?.id || 'Unknown'}`;
    const frameExt = getFileExtension(frame.imageUrl);
    // Use folder name and scene info as prefix
    const frameFilename = `${folderName}_${sceneTitle}_Frame${frame.variant}.${frameExt}`;
    
    try {
      const savedFrame = await saveImageToDownloads(frame.imageUrl, frameFilename, directoryHandle);
      imagePaths.frames.push(savedFrame);
    } catch (error) {
      console.error(`Failed to save frame ${frame.id}:`, error);
    }
  }

  return imagePaths;
}

/**
 * Loads an image from a file path (for future use with File System Access API)
 */
export async function loadImageFromPath(
  path: string,
  directoryHandle?: FileSystemDirectoryHandle
): Promise<string | null> {
  if (!directoryHandle || !('showDirectoryPicker' in window)) {
    return null;
  }

  try {
    const fileHandle = await directoryHandle.getFileHandle(path);
    const file = await fileHandle.getFile();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  } catch (error) {
    console.error(`Failed to load image from path ${path}:`, error);
    return null;
  }
}

