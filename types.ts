
export interface Frame {
  id: string;
  variant: 'A' | 'B';
  imageUrl: string;
  metadata: {
    composition: string;
    palette: string[];
    lighting: string;
    camera: string;
  };
}

// Story-World [SW] Parameterization - Deep/Intermediate Structure
export interface StoryWorld {
  premise: string;                    // Logline with "I gotta know" factor
  theme: string;                      // Philosophical stance on conflict
  structure: {
    act1: string;                     // Setup
    act2: string;                     // Confrontation
    act3: string;                     // Resolution
    attractors: string[];             // 6-8 structural nodes (I.I, PP1, MP, PP2, Climax, etc.)
  };
  characterBlueprint: string;          // 15+ physical/behavioral attributes (verbatim template)
  coreConflict: {
    internal: string;                  // Psychological motives (Maslow-based needs)
    external: string;                  // External obstacles
  };
  boundaries: {
    spatial: string;                   // [SL] Spatial Logic
    temporal: string;                  // [TL] Temporal Logic
    historical: string;                // [HST] Historical Setting
    visual: string;                    // [VST] Visual Style
  };
}

export interface Scene {
  // Core fields
  id: number;
  title: string;
  scriptLine: string;
  emotion: string;
  intent: string;
  frames: [Frame, Frame];

  // Master Screenplay Architect: 8-Component Tier Hierarchy (Level 9 Broadcast Quality)
  // TIER 1 (Architecture): Cinematography & Format
  cinematographyFormat: string;       // ARRI Alexa Mini LF / Sony Venice, 35mm T1.5, 16:9/2.35:1, 1080p/4K
  
  // TIER 2 (Core Subject): Subject Identity
  subjectIdentity: string;             // Verbatim character description (15+ attributes, emotional state)
  
  // TIER 3 (Scene Anchors): Scene & Context
  sceneContext: string;                // Forensic location description (time of day, weather, architecture)
  
  // TIER 4 (Motion): Action & Camera Composition
  action: string;                      // Body/face actions separated (Single-Action Principle)
  cameraComposition: string;           // Shot type, movement, "(thats where the camera is)" syntax
  
  // TIER 5 (Aesthetics): Style & Ambiance
  styleAmbiance: string;               // Color grading, lighting ratios, mood
  
  // TIER 6 (Audio): Audio & Dialogue
  audioDialogue: string;               // Sound design, Character: "Dialogue" syntax, phoneme mapping
  
  // TIER 7 (Quality Control): Technical & Negative
  technicalNegative: string;           // Universal quality control negatives
  
  // Comprehensive Veo 3.1 prompt integrating all tiers
  veoPrompt: string;

  // Optional: Three-Layer Architecture Tracking
  deepStructure?: string;              // [DS] Universal components (needs, motives, goals, conflicts)
  intermediateStructure?: string;      // [IS] Story-World parameterization (environment, character interactions)
  surfaceStructure?: string;           // [SS] Surface realization (actions, scenes, dialogue)

  // Backward compatibility: Keep old field names as optional aliases
  subject?: string;                    // Deprecated: Use subjectIdentity
  sceneDescription?: string;           // Deprecated: Use sceneContext
  style?: string;                      // Deprecated: Use styleAmbiance
  cinematography?: string;             // Deprecated: Use cinematographyFormat + cameraComposition
  lighting?: string;                    // Deprecated: Use styleAmbiance (lighting ratios)
  postProduction?: string;              // Deprecated: Use styleAmbiance (color grading)
}

export interface Base64Asset {
  mimeType: string;
  data: string;
}

export interface Storyboard {
  scenes: Scene[];
  storyWorld?: StoryWorld;             // Optional Story-World parameterization
  aspectRatio?: '16:9' | '9:16';      // Aspect ratio used for generation
  // Optional: Track assets used for generation (for reference)
  assets?: {
    logo?: Base64Asset | null;
    mainCharacter?: Base64Asset | null;
    additionalCharacters?: Base64Asset[];
    background?: Base64Asset | null;
    artStyle?: Base64Asset | null;
  };
}

export type ActiveTab = 'storyboard' | 'script' | 'professional';

export interface GenerationProgress {
  phase: 'story-world' | 'script' | 'images' | 'complete';
  progress: number; // 0-100
  message: string;
  currentScene?: number;
  totalScenes?: number;
  currentFrame?: string; // 'A' or 'B'
  estimatedTimeRemaining?: number; // in seconds
  elapsedTime?: number; // in seconds
}

export interface ImageFileInfo {
  path: string;
  filename: string;
  url: string; // Keep URL for display purposes (backward compatibility)
}

export interface ProjectImagePaths {
  logo: ImageFileInfo | null;
  character: ImageFileInfo | null;
  background?: ImageFileInfo | null;
  artStyle?: ImageFileInfo | null;
  additionalCharacters?: ImageFileInfo[];
  frames: ImageFileInfo[];
}

export interface SavedProject {
  id: string;
  title: string;
  storyboard: Storyboard;
  storyDescription: string;
  // New format: file paths (preferred)
  logoPath?: ImageFileInfo | null;
  characterPath?: ImageFileInfo | null;
  backgroundPath?: ImageFileInfo | null;
  artStylePath?: ImageFileInfo | null;
  additionalCharacterPaths?: ImageFileInfo[];
  imagePaths?: ProjectImagePaths;
  // Old format: base64 URLs (backward compatibility)
  logoUrl?: string | null;
  characterUrl?: string | null;
  backgroundUrl?: string | null;
  artStyleUrl?: string | null;
  additionalCharacterUrls?: string[];
  createdAt: string;
}

export interface Comment {
  id: string;
  author: string;
  text: string;
  likeCount: number;
  publishedAt: string;
}

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  viewCount: number;
  likeCount: number;
  channelName: string;
  url: string;
  duration?: number;
  commentCount?: number;
  engagementRate?: number;
  topComments?: Comment[];
}
