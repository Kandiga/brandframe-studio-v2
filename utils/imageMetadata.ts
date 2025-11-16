/**
 * Image metadata extraction utilities
 * Extracts visual metadata from generated images
 */

import { Frame } from '../types';

/**
 * Extracts dominant colors from an image
 */
function extractColorPalette(imageData: ImageData, sampleRate: number = 100): string[] {
  const colors = new Map<string, number>();
  const data = imageData.data;
  
  // Sample pixels for performance
  for (let i = 0; i < data.length; i += (sampleRate * 4)) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    
    // Skip transparent pixels
    if (a < 128) continue;
    
    // Quantize colors to reduce noise
    const quantizedR = Math.round(r / 32) * 32;
    const quantizedG = Math.round(g / 32) * 32;
    const quantizedB = Math.round(b / 32) * 32;
    
    const color = `#${[quantizedR, quantizedG, quantizedB]
      .map(x => Math.min(255, Math.max(0, x)).toString(16).padStart(2, '0'))
      .join('')}`;
    
    colors.set(color, (colors.get(color) || 0) + 1);
  }
  
  // Return top 5 most common colors
  return Array.from(colors.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([color]) => color);
}

/**
 * Analyzes image brightness
 */
function analyzeBrightness(imageData: ImageData): 'dark' | 'medium' | 'bright' {
  const data = imageData.data;
  let totalBrightness = 0;
  let pixelCount = 0;
  
  // Sample every 10th pixel
  for (let i = 0; i < data.length; i += 40) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    
    if (a < 128) continue; // Skip transparent
    
    // Calculate luminance
    const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
    totalBrightness += brightness;
    pixelCount++;
  }
  
  const avgBrightness = pixelCount > 0 ? totalBrightness / pixelCount : 0.5;
  
  if (avgBrightness < 0.3) return 'dark';
  if (avgBrightness > 0.7) return 'bright';
  return 'medium';
}

/**
 * Extracts metadata from an image URL
 */
export async function extractImageMetadata(
  imageUrl: string,
  fallbackMetadata?: Partial<Frame['metadata']>
): Promise<Frame['metadata']> {
  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    img.onload = () => {
      try {
        canvas.width = img.width;
        canvas.height = img.height;
        
        if (!ctx) {
          resolve(fallbackMetadata || {
            composition: `Professional composition (${img.width}x${img.height})`,
            palette: [],
            lighting: 'Unknown',
            camera: 'Unknown'
          });
          return;
        }
        
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        const palette = extractColorPalette(imageData);
        const brightness = analyzeBrightness(imageData);
        
        const lighting = brightness === 'dark' 
          ? 'Low-key cinematic lighting'
          : brightness === 'bright'
          ? 'High-key bright lighting'
          : 'Balanced medium lighting';
        
        resolve({
          composition: `Professional composition (${img.width}x${img.height})`,
          palette: palette.length > 0 ? palette : (fallbackMetadata?.palette || []),
          lighting: lighting,
          camera: fallbackMetadata?.camera || 'Professional cinematography'
        });
      } catch (error) {
        console.warn('Error extracting metadata:', error);
        resolve(fallbackMetadata || {
          composition: `Professional composition (${img.width}x${img.height})`,
          palette: [],
          lighting: 'Unknown',
          camera: 'Unknown'
        });
      }
    };
    
    img.onerror = () => {
      resolve(fallbackMetadata || {
        composition: 'Unknown',
        palette: [],
        lighting: 'Unknown',
        camera: 'Unknown'
      });
    };
    
    // Set timeout
    setTimeout(() => {
      if (!img.complete) {
        resolve(fallbackMetadata || {
          composition: 'Timeout',
          palette: [],
          lighting: 'Unknown',
          camera: 'Unknown'
        });
      }
    }, 5000);
    
    img.src = imageUrl;
  });
}

