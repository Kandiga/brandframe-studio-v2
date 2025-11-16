/**
 * Application-wide constants
 */

// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3002'),
  TIMEOUT: 300000, // 5 minutes (300 seconds) - Story generation takes ~2-3 minutes
  RETRY_ATTEMPTS: 3,
} as const;

// Cache Durations (in milliseconds)
export const CACHE_DURATION = {
  VIDEO_INFO: 10 * 60 * 1000, // 10 minutes
  REQUEST_CACHE: 5 * 60 * 1000, // 5 minutes
  PROJECTS: 0, // No cache for projects (always fresh)
} as const;

// Rate Limiting
export const RATE_LIMITS = {
  API_REQUESTS: 100, // per 15 minutes
  STORYBOARD_GENERATION: 10, // per hour
} as const;

// File Upload Limits
export const FILE_LIMITS = {
  MAX_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_IMAGE_TYPES: ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'],
  ALLOWED_IMAGE_EXTENSIONS: ['.png', '.jpg', '.jpeg', '.svg'],
} as const;

// YouTube Configuration
export const YOUTUBE_CONFIG = {
  VIDEO_ID_LENGTH: 11,
  SHORTS_MAX_DURATION: 60, // seconds
  MAX_LIMIT: 100,
  DEFAULT_LIMIT: 20,
} as const;

// LocalStorage Keys
export const STORAGE_KEYS = {
  PROJECTS: 'brandframe_projects',
  SETTINGS: 'brandframe_settings',
} as const;

// Aspect Ratios
export const ASPECT_RATIOS = {
  LANDSCAPE: '16:9' as const,
  PORTRAIT: '9:16' as const,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  STORAGE_QUOTA_EXCEEDED: 'Storage quota exceeded. Please free up some space or delete old projects.',
  STORAGE_ACCESS_DENIED: 'Storage access denied. Please check your browser settings.',
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  SERVER_ERROR: 'Server error. Please try again later.',
  VALIDATION_ERROR: 'Validation error. Please check your input.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  PROJECT_SAVED: 'Project saved successfully!',
  PROJECT_DELETED: 'Project deleted successfully!',
  EXPORT_COMPLETE: 'Export completed successfully!',
} as const;

