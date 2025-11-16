import { FILE_LIMITS } from '../constants/index.js';

/**
 * Converts a File object to base64 string with MIME type
 */
export const fileToBase64 = (file: File): Promise<{ mimeType: string; data: string }> => {
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
 * Validates file type
 */
export const isValidImageType = (file: File): boolean => {
  return FILE_LIMITS.ALLOWED_IMAGE_TYPES.includes(file.type);
};

/**
 * Validates file size
 */
export const isValidFileSize = (file: File): boolean => {
  return file.size <= FILE_LIMITS.MAX_SIZE;
};

/**
 * Validates image file
 */
export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  if (!isValidImageType(file)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${FILE_LIMITS.ALLOWED_IMAGE_TYPES.join(', ')}`,
    };
  }

  if (!isValidFileSize(file)) {
    const maxSizeMB = FILE_LIMITS.MAX_SIZE / (1024 * 1024);
    return {
      valid: false,
      error: `File size exceeds maximum of ${maxSizeMB}MB`,
    };
  }

  return { valid: true };
};

/**
 * Creates a blob URL from a file
 */
export const createBlobURL = (file: File): string => {
  return URL.createObjectURL(file);
};

/**
 * Revokes a blob URL
 */
export const revokeBlobURL = (url: string): void => {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
};

/**
 * Gets file extension from filename
 */
export const getFileExtension = (filename: string): string => {
  const lastDot = filename.lastIndexOf('.');
  return lastDot !== -1 ? filename.substring(lastDot).toLowerCase() : '';
};

