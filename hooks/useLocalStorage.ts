import { useState, useEffect, useCallback } from 'react';
import { 
  safeGetLocalStorage, 
  safeSetLocalStorage, 
  handleLocalStorageError 
} from '../utils/errorHandler.js';

/**
 * Custom hook for managing localStorage with error handling
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void, () => void] {
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = safeGetLocalStorage(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that
  // persists the new value to localStorage.
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Save state
      setStoredValue(valueToStore);
      
      // Save to local storage
      const success = safeSetLocalStorage(key, JSON.stringify(valueToStore));
      if (!success) {
        const errorMsg = handleLocalStorageError(new DOMException('QuotaExceededError'));
        console.error(errorMsg);
        // Optionally show user notification here
      }
    } catch (error) {
      const errorMsg = handleLocalStorageError(error);
      console.error(`Error setting localStorage key "${key}":`, errorMsg);
    }
  }, [key, storedValue]);

  // Remove value from localStorage
  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}

