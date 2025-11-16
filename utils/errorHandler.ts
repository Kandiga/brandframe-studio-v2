/**
 * Error handling utilities for the frontend
 */

export interface AppError {
  message: string;
  code?: string;
  statusCode?: number;
  originalError?: unknown;
}

/**
 * Creates a user-friendly error message from various error types
 */
export function createErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Handles localStorage errors, particularly quota exceeded
 */
export function handleLocalStorageError(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.code === 22 || error.code === 1014 || error.name === 'QuotaExceededError') {
      return 'Storage quota exceeded. Please free up some space or delete old projects.';
    }
    if (error.code === 18 || error.name === 'SecurityError') {
      return 'Storage access denied. Please check your browser settings.';
    }
  }
  
  return createErrorMessage(error);
}

/**
 * Checks if localStorage is available and has space
 */
export function isLocalStorageAvailable(): boolean {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely gets an item from localStorage with error handling
 */
export function safeGetLocalStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error(`Failed to get localStorage item "${key}":`, error);
    return null;
  }
}

/**
 * Safely sets an item in localStorage with error handling
 */
export function safeSetLocalStorage(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    const errorMessage = handleLocalStorageError(error);
    console.error(`Failed to set localStorage item "${key}":`, errorMessage);
    return false;
  }
}

/**
 * Safely removes an item from localStorage with error handling
 */
export function safeRemoveLocalStorage(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Failed to remove localStorage item "${key}":`, error);
    return false;
  }
}

/**
 * Creates an AppError object from various error types
 */
export function createAppError(error: unknown, code?: string): AppError {
  const message = createErrorMessage(error);
  
  return {
    message,
    code,
    originalError: error,
  };
}

