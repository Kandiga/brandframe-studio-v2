/**
 * Image validation utilities
 * Validates image quality and content before display
 */

export interface ImageQualityCheck {
  isValid: boolean;
  hasContent: boolean;
  width: number;
  height: number;
  size: number;
  errors: string[];
  warnings: string[];
}

/**
 * Validates image quality by loading and checking dimensions
 */
export async function validateImageQuality(imageUrl: string): Promise<ImageQualityCheck> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  return new Promise((resolve) => {
    // Check if it's a placeholder or error image
    if (imageUrl.includes('placehold.co') || imageUrl.includes('Error') || imageUrl.includes('error')) {
      errors.push('Image appears to be error placeholder');
      resolve({
        isValid: false,
        hasContent: false,
        width: 0,
        height: 0,
        size: imageUrl.length,
        errors,
        warnings
      });
      return;
    }
    
    // Check base64 data size
    if (imageUrl.startsWith('data:')) {
      const size = imageUrl.length;
      if (size < 1000) {
        errors.push('Image file size suspiciously small (likely corrupted)');
      } else if (size < 5000) {
        warnings.push('Image file size is very small');
      }
    }
    
    const img = new Image();
    
    img.onload = () => {
      const hasContent = img.width > 0 && img.height > 0;
      
      if (!hasContent) {
        errors.push('Image has zero dimensions');
      }
      
      if (img.width < 100 || img.height < 100) {
        warnings.push(`Image dimensions are small: ${img.width}x${img.height}`);
      }
      
      // Check aspect ratio (should be reasonable)
      const aspectRatio = img.width / img.height;
      if (aspectRatio < 0.1 || aspectRatio > 10) {
        warnings.push(`Unusual aspect ratio: ${aspectRatio.toFixed(2)}`);
      }
      
      resolve({
        isValid: errors.length === 0,
        hasContent,
        width: img.width,
        height: img.height,
        size: imageUrl.length,
        errors,
        warnings
      });
    };
    
    img.onerror = () => {
      errors.push('Failed to load image');
      resolve({
        isValid: false,
        hasContent: false,
        width: 0,
        height: 0,
        size: imageUrl.length,
        errors,
        warnings
      });
    };
    
    // Set timeout for validation
    setTimeout(() => {
      if (!img.complete) {
        errors.push('Image loading timeout');
        resolve({
          isValid: false,
          hasContent: false,
          width: 0,
          height: 0,
          size: imageUrl.length,
          errors,
          warnings
        });
      }
    }, 10000); // 10 second timeout
    
    img.src = imageUrl;
  });
}

/**
 * Checks if an image URL is valid (not placeholder/error)
 */
export function isImageUrlValid(imageUrl: string): boolean {
  if (!imageUrl || typeof imageUrl !== 'string') {
    return false;
  }
  
  // Check for error placeholders
  if (imageUrl.includes('placehold.co') || 
      imageUrl.includes('Error') || 
      imageUrl.includes('error') ||
      imageUrl.includes('failed')) {
    return false;
  }
  
  // Check if it's a valid data URL or http(s) URL
  if (imageUrl.startsWith('data:image/') || 
      imageUrl.startsWith('http://') || 
      imageUrl.startsWith('https://') ||
      imageUrl.startsWith('blob:')) {
    return true;
  }
  
  return false;
}

