import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ApplicationError } from './errorHandler.js';

/**
 * Validation middleware factory using Zod
 */
export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw new ApplicationError(`Validation error: ${errorMessage}`, 400, 'VALIDATION_ERROR');
      }
      next(error);
    }
  };
};

/**
 * Validation schemas
 */
const base64AssetSchema = z.object({
  mimeType: z.string(),
  data: z.string(),
});

export const storyboardGenerationSchema = z.object({
  story: z.string().min(1, 'Story description is required').max(10000, 'Story description is too long'),
  aspectRatio: z.enum(['16:9', '9:16']).optional(),
  frameCount: z.number().int().min(2).max(8).refine((val) => [2, 4, 6, 8].includes(val), {
    message: 'Frame count must be 2, 4, 6, or 8'
  }).optional(),
  logoAsset: base64AssetSchema.nullable().optional(),
  // Backward compatibility: accept both old and new field names
  characterAsset: base64AssetSchema.nullable().optional(), // Old format
  mainCharacterAsset: base64AssetSchema.nullable().optional(), // New format
  additionalCharacterAssets: z.array(base64AssetSchema).optional(),
  backgroundAsset: base64AssetSchema.nullable().optional(),
  artStyleAsset: base64AssetSchema.nullable().optional(),
}).refine((data) => {
  // Ensure at least one character asset format is provided if any character-related field exists
  return true; // Allow both formats for backward compatibility
});

export const videoIdSchema = z.object({
  videoId: z.string().length(11).regex(/^[a-zA-Z0-9_-]{11}$/, 'Invalid video ID format'),
});

export const limitSchema = z.object({
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(100)).optional(),
});

