import { GoogleGenAI, Type, Modality } from '@google/genai';
import { Storyboard, Scene, Frame, StoryWorld } from '../../types.js';
import { logger, logError, logInfo, logDebug, logWarn } from '../utils/logger.js';
import { trackOperation } from '../utils/performanceMonitor.js';

// Helper to convert base64 string to format needed for API
interface Base64Asset {
  mimeType: string;
  data: string;
}

/**
 * Story-World [SW] Parameterization
 * Generates the foundational story architecture before scene generation.
 * Implements Deep Structure [DS] and Intermediate Structure [IS] layers.
 */
const generateStoryWorld = async (story: string, apiKey: string): Promise<StoryWorld> => {
  const ai = new GoogleGenAI({ apiKey });

  const storyWorldPrompt = `You are a MASTER SCREENPLAY ARCHITECT operating as a Complex System Regulator.

PRIMARY MISSION: Generate comprehensive Story-World [SW] Parameterization for the following story concept.

STORY CONCEPT: "${story}"

STORY-WORLD PARAMETERIZATION REQUIREMENTS:

1. PREMISE / LOGLINE:
   - Create a compelling logline with "I gotta know what's going on" factor
   - Must hook the audience immediately
   - Include protagonist, goal, and obstacle

2. THEME:
   - Define the philosophical stance on the central conflict
   - Express the deeper meaning and message
   - How does the story comment on human nature/relationships/society?

3. STRUCTURE:
   - Define Three-Act Structure:
     * Act 1 (Setup): What happens in the setup?
     * Act 2 (Confrontation): What happens in the confrontation?
     * Act 3 (Resolution): What happens in the resolution?
   - Identify 6-8 structural attractors (key plot points):
     * I.I (Inciting Incident)
     * PP1 (Plot Point 1)
     * MP (Midpoint)
     * PP2 (Plot Point 2)
     * Climax
     * Resolution
     * (Add 1-2 more as needed)

4. CHARACTER BLUEPRINT:
   - Create a verbatim character description template with 15+ specific attributes:
     * Age, ethnicity, body type, facial features, hair, clothing style
     * Posture, mannerisms, micro-expressions
     * Distinctive physical traits
   - This template MUST be copied VERBATIM across all scenes for consistency
   - Include emotional baseline and psychological profile

5. CORE CONFLICT:
   - Internal Conflict: Psychological motives based on Maslow's hierarchy (survival/security/belonging/esteem/self-actualization)
   - External Conflict: Physical obstacles, antagonists, environmental challenges
   - How do internal and external conflicts interact?

6. BOUNDARIES & LOGIC:
   - [SL] Spatial Logic: Where does the story take place? What are the spatial rules?
   - [TL] Temporal Logic: When does it take place? What are the time constraints?
   - [HST] Historical Setting: What is the historical context?
   - [VST] Visual Style: What is the visual aesthetic? (Realistic/Fantasy/Sci-Fi/Noir/etc.)
   - Define any world rules (especially for fantasy/sci-fi)

Respond ONLY with a JSON object matching the StoryWorld schema.`;

  const storyWorldSchema = {
    type: Type.OBJECT,
    properties: {
      premise: { type: Type.STRING },
      theme: { type: Type.STRING },
      structure: {
        type: Type.OBJECT,
        properties: {
          act1: { type: Type.STRING },
          act2: { type: Type.STRING },
          act3: { type: Type.STRING },
          attractors: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["act1", "act2", "act3", "attractors"]
      },
      characterBlueprint: { type: Type.STRING },
      coreConflict: {
        type: Type.OBJECT,
        properties: {
          internal: { type: Type.STRING },
          external: { type: Type.STRING }
        },
        required: ["internal", "external"]
      },
      boundaries: {
        type: Type.OBJECT,
        properties: {
          spatial: { type: Type.STRING },
          temporal: { type: Type.STRING },
          historical: { type: Type.STRING },
          visual: { type: Type.STRING }
        },
        required: ["spatial", "temporal", "historical", "visual"]
      }
    },
    required: ["premise", "theme", "structure", "characterBlueprint", "coreConflict", "boundaries"]
  };

  const startTime = Date.now();
  try {
    logInfo('Starting Story-World generation', {
      category: 'GENERATION',
      storyLength: story.length,
    });

    const storyWorldResponse = await trackOperation(
      'story-world-generation',
      () => ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: storyWorldPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: storyWorldSchema,
        },
      }),
      { storyLength: story.length }
    );

    // Handle response - check if it has .text property or needs to be accessed differently
    const responseText = storyWorldResponse.text || (storyWorldResponse as any).response?.text || JSON.stringify(storyWorldResponse);
    
    logDebug('Story-World API response received', {
      category: 'GENERATION',
      hasText: !!storyWorldResponse.text,
      responseType: typeof storyWorldResponse,
      responseKeys: Object.keys(storyWorldResponse || {}),
    });
    
    const storyWorld = JSON.parse(responseText) as StoryWorld;
    const duration = Date.now() - startTime;
    
    logInfo('Story-World generation completed', {
      category: 'GENERATION',
      duration: `${duration}ms`,
      hasPremise: !!storyWorld.premise,
      hasTheme: !!storyWorld.theme,
      attractorsCount: storyWorld.structure?.attractors?.length || 0,
    });
    
    return storyWorld;
  } catch (error) {
    const duration = Date.now() - startTime;
    logError('Story-World generation failed', error, {
      category: 'GENERATION',
      duration: `${duration}ms`,
      storyLength: story.length,
    });
    throw new Error(`Failed to generate Story-World: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Character Consistency Agent - Analyzes reference images and enforces consistency
 * This is a CRITICAL internal agent that ensures character consistency across all scenes
 */
interface CharacterProfile {
  facialFeatures: string;
  hairDescription: string;
  bodyType: string;
  distinctiveFeatures: string;
  clothingStyle: string;
  skinTone: string;
  ageEstimate: string;
  ethnicity: string;
  completeDescription: string;
}

const analyzeCharacterReference = async (
  characterAsset: Base64Asset,
  apiKey: string,
  characterType: 'main' | 'secondary',
  characterIndex?: number
): Promise<CharacterProfile> => {
  const ai = new GoogleGenAI({ apiKey });
  
  const analysisPrompt = `You are a CHARACTER CONSISTENCY ANALYZER - a specialized agent responsible for maintaining visual consistency across all scenes.

CRITICAL MISSION: Analyze the provided character reference image and extract EVERY detail needed to maintain perfect visual consistency.

CHARACTER TYPE: ${characterType === 'main' ? 'MAIN CHARACTER (PROTAGONIST)' : `SECONDARY CHARACTER ${characterIndex || ''}`}

ANALYSIS REQUIREMENTS:
Extract and document the following with EXTREME precision:

1. FACIAL FEATURES (MANDATORY - must be exact):
   - Face shape (round, oval, square, heart, etc.)
   - Eye color, shape, size, spacing
   - Nose shape and size
   - Mouth shape and size
   - Eyebrow shape, thickness, color
   - Cheekbone structure
   - Jawline shape
   - Any distinctive facial marks, scars, or features

2. HAIR (MANDATORY - must be exact):
   - Color (exact shade)
   - Style (length, texture, cut)
   - Parting (left, right, center, none)
   - Any highlights, streaks, or special features
   - Hairline shape

3. BODY TYPE (MANDATORY - must be exact):
   - Height estimate
   - Build (slim, athletic, stocky, etc.)
   - Body proportions
   - Posture characteristics

4. SKIN TONE & COMPLEXION:
   - Exact skin tone description
   - Any distinctive skin features

5. CLOTHING STYLE:
   - Current clothing description
   - Style preferences visible
   - Color palette

6. DISTINCTIVE FEATURES:
   - Any unique identifying features
   - Mannerisms visible in the image
   - Any accessories or items

7. AGE & ETHNICITY ESTIMATE:
   - Approximate age range
   - Ethnicity/background visible

Respond with a JSON object containing all these details in a structured format that can be used VERBATIM across all scenes.`;

  try {
    logInfo(`Analyzing ${characterType} character reference`, {
      category: 'GENERATION',
      component: 'characterConsistencyAgent',
      characterType,
      characterIndex,
    });

    const analysisResponse = await trackOperation(
      `character-analysis-${characterType}`,
      () => ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: {
          parts: [
            {
              text: analysisPrompt
            },
            {
              inlineData: {
                mimeType: characterAsset.mimeType,
                data: characterAsset.data
              }
            },
            {
              text: `Now analyze this character reference image and provide the detailed character profile in JSON format.`
            }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              facialFeatures: { type: Type.STRING },
              hairDescription: { type: Type.STRING },
              bodyType: { type: Type.STRING },
              distinctiveFeatures: { type: Type.STRING },
              clothingStyle: { type: Type.STRING },
              skinTone: { type: Type.STRING },
              ageEstimate: { type: Type.STRING },
              ethnicity: { type: Type.STRING },
              completeDescription: { type: Type.STRING }
            },
            required: ["facialFeatures", "hairDescription", "bodyType", "distinctiveFeatures", "clothingStyle", "skinTone", "ageEstimate", "ethnicity", "completeDescription"]
          }
        }
      }),
      { characterType, characterIndex }
    );

    const responseText = analysisResponse.text || JSON.stringify(analysisResponse);
    const profile = JSON.parse(responseText) as CharacterProfile;

    logInfo(`Character analysis completed`, {
      category: 'GENERATION',
      component: 'characterConsistencyAgent',
      characterType,
      hasCompleteDescription: !!profile.completeDescription,
      descriptionLength: profile.completeDescription?.length || 0,
    });

    return profile;
  } catch (error) {
    logError(`Character analysis failed`, error, {
      category: 'GENERATION',
      component: 'characterConsistencyAgent',
      characterType,
    });
    // Return a fallback profile if analysis fails
    return {
      facialFeatures: 'See reference image for exact facial features',
      hairDescription: 'See reference image for exact hair',
      bodyType: 'See reference image for exact body type',
      distinctiveFeatures: 'See reference image for all distinctive features',
      clothingStyle: 'See reference image for clothing style',
      skinTone: 'See reference image for exact skin tone',
      ageEstimate: 'See reference image',
      ethnicity: 'See reference image',
      completeDescription: 'Use the provided reference image EXACTLY as shown - maintain all visual features identically across all scenes'
    };
  }
};

/**
 * Enhance character blueprint with reference image analysis
 * This ensures the blueprint matches the actual reference image
 */
const enhanceCharacterBlueprint = async (
  originalBlueprint: string,
  mainCharacterAsset: Base64Asset | null,
  additionalCharacterAssets: Base64Asset[],
  apiKey: string
): Promise<{ mainCharacterBlueprint: string; additionalCharacterBlueprints: string[] }> => {
  let enhancedMainBlueprint = originalBlueprint;
  const enhancedAdditionalBlueprints: string[] = [];

  // Analyze main character if provided
  if (mainCharacterAsset) {
    const mainProfile = await analyzeCharacterReference(mainCharacterAsset, apiKey, 'main');
    
    enhancedMainBlueprint = `[ENHANCED CHARACTER BLUEPRINT - VERBATIM COPY ACROSS ALL SCENES]

ORIGINAL BLUEPRINT: ${originalBlueprint}

REFERENCE IMAGE ANALYSIS (MANDATORY - USE EXACTLY):
- FACIAL FEATURES: ${mainProfile.facialFeatures}
- HAIR: ${mainProfile.hairDescription}
- BODY TYPE: ${mainProfile.bodyType}
- SKIN TONE: ${mainProfile.skinTone}
- DISTINCTIVE FEATURES: ${mainProfile.distinctiveFeatures}
- CLOTHING STYLE: ${mainProfile.clothingStyle}
- AGE ESTIMATE: ${mainProfile.ageEstimate}
- ETHNICITY: ${mainProfile.ethnicity}

COMPLETE VERBATIM DESCRIPTION (COPY THIS EXACTLY IN ALL SCENES):
${mainProfile.completeDescription}

CRITICAL CONSISTENCY RULE: This character MUST appear EXACTLY as described above in EVERY scene. The reference image provided shows the EXACT appearance - replicate it precisely. Only pose, expression, and context may vary - the character's physical appearance MUST remain IDENTICAL.`;
  }

  // Analyze additional characters if provided
  for (let i = 0; i < additionalCharacterAssets.length; i++) {
    const charProfile = await analyzeCharacterReference(
      additionalCharacterAssets[i],
      apiKey,
      'secondary',
      i + 1
    );
    
    enhancedAdditionalBlueprints.push(`[SECONDARY CHARACTER ${i + 1} BLUEPRINT - VERBATIM COPY]

REFERENCE IMAGE ANALYSIS (MANDATORY - USE EXACTLY):
- FACIAL FEATURES: ${charProfile.facialFeatures}
- HAIR: ${charProfile.hairDescription}
- BODY TYPE: ${charProfile.bodyType}
- SKIN TONE: ${charProfile.skinTone}
- DISTINCTIVE FEATURES: ${charProfile.distinctiveFeatures}
- CLOTHING STYLE: ${charProfile.clothingStyle}
- AGE ESTIMATE: ${charProfile.ageEstimate}
- ETHNICITY: ${charProfile.ethnicity}

COMPLETE VERBATIM DESCRIPTION (COPY THIS EXACTLY IN ALL SCENES WHERE THIS CHARACTER APPEARS):
${charProfile.completeDescription}

CRITICAL CONSISTENCY RULE: This character MUST appear EXACTLY as described above in EVERY scene where they appear. Maintain visual consistency with the reference image.`);
  }

  return {
    mainCharacterBlueprint: enhancedMainBlueprint,
    additionalCharacterBlueprints: enhancedAdditionalBlueprints
  };
};

/**
 * Validate character consistency before image generation
 * This agent checks that character descriptions match across scenes
 */
const validateCharacterConsistency = (
  scenes: Scene[],
  mainCharacterBlueprint: string,
  additionalCharacterBlueprints: string[]
): { isValid: boolean; issues: string[] } => {
  const issues: string[] = [];

  // Check that all scenes use the main character blueprint consistently
  scenes.forEach((scene, index) => {
    const sceneId = scene.id || index + 1;
    
    // Check if subjectIdentity contains key character elements
    const subjectIdentity = scene.subjectIdentity || '';
    
    if (!subjectIdentity.toLowerCase().includes('character') && 
        !subjectIdentity.toLowerCase().includes('protagonist') &&
        !subjectIdentity.toLowerCase().includes('main')) {
      issues.push(`Scene ${sceneId}: subjectIdentity may not reference the main character properly`);
    }

    // Check for consistency markers
    const hasConsistencyMarkers = 
      subjectIdentity.includes('EXACT') ||
      subjectIdentity.includes('VERBATIM') ||
      subjectIdentity.includes('IDENTICAL') ||
      subjectIdentity.toLowerCase().includes('same');

    if (!hasConsistencyMarkers && mainCharacterBlueprint) {
      issues.push(`Scene ${sceneId}: Missing explicit consistency markers in subjectIdentity`);
    }
  });

  logInfo('Character consistency validation completed', {
    category: 'GENERATION',
    component: 'characterConsistencyAgent',
    scenesCount: scenes.length,
    issuesCount: issues.length,
    isValid: issues.length === 0,
  });

  return {
    isValid: issues.length === 0,
    issues
  };
};

/**
 * Build reference instructions for script generation
 */
const buildReferenceInstructions = (
  artStyleAsset: Base64Asset | null,
  backgroundAsset: Base64Asset | null,
  mainCharacterAsset: Base64Asset | null,
  additionalCharacterAssets: Base64Asset[]
) => {
  const instructions = [];
  
  if (artStyleAsset) {
    instructions.push(`ART STYLE REFERENCE PROVIDED: A reference image defining the visual art style has been provided. All scene descriptions must align with this art style - characters, environments, objects, and visual elements must be described to match this style exactly.`);
  }
  
  if (backgroundAsset) {
    instructions.push(`BACKGROUND REFERENCE PROVIDED: A reference image showing the base environment/world has been provided. Scene descriptions should incorporate elements, colors, textures, and atmosphere from this background reference.`);
  }
  
  if (mainCharacterAsset) {
    instructions.push(`⚠️ MAIN CHARACTER REFERENCE PROVIDED (CRITICAL): A reference image of the MAIN CHARACTER - THE PROTAGONIST - has been provided. This character MUST be the PRIMARY SUBJECT in EVERY scene. The character description in the blueprint MUST match this reference image EXACTLY - same facial features, same hair, same body type, same distinctive appearance. This character is the protagonist and MUST appear in all scenes as the main subject.`);
  }
  
  if (additionalCharacterAssets.length > 0) {
    instructions.push(`ADDITIONAL CHARACTER REFERENCES PROVIDED: ${additionalCharacterAssets.length} reference image(s) of secondary characters have been provided. Character descriptions must match these references exactly.`);
  }
  
  return instructions.length > 0 
    ? `\n\n═══════════════════════════════════════════════════════════\nVISUAL REFERENCE INSTRUCTIONS:\n═══════════════════════════════════════════════════════════\n${instructions.join('\n\n')}\n\nWhen generating scene descriptions, ensure they align with these visual references. The character descriptions, environments, and visual style must match the provided reference images.`
    : '';
};

/**
 * Generates a storyboard using Gemini API
 */
export const generateStoryboard = async (
  logoAsset: Base64Asset | null,
  mainCharacterAsset: Base64Asset | null,
  additionalCharacterAssets: Base64Asset[] = [],
  backgroundAsset: Base64Asset | null = null,
  artStyleAsset: Base64Asset | null = null,
  story: string,
  aspectRatio: '16:9' | '9:16' = '16:9',
  apiKey: string,
  sceneCount: number = 2, // Number of scenes to generate (default 2)
  onProgress?: (progress: { phase: string; progress: number; message: string; currentScene?: number; totalScenes?: number; currentFrame?: string; estimatedTimeRemaining?: number; elapsedTime?: number }) => void
): Promise<Storyboard> => {
  const generationStartTime = Date.now();
  
  // Estimate time based on scene count (in milliseconds)
  // Base times: story-world: 15s, script: 20s per scene, images: 30s per frame (2 frames per scene)
  const baseStoryWorldTime = 15000; // 15 seconds
  const scriptTimePerScene = 20000; // 20 seconds per scene
  const imageTimePerFrame = 30000; // 30 seconds per frame
  const totalEstimatedTime = baseStoryWorldTime + (scriptTimePerScene * sceneCount) + (imageTimePerFrame * sceneCount * 2);
  
  const updateProgress = (phase: string, progress: number, message: string, currentScene?: number, totalScenes?: number, currentFrame?: string) => {
    const elapsed = (Date.now() - generationStartTime) / 1000; // in seconds
    const progressRatio = progress / 100;
    const estimatedTotal = totalEstimatedTime / 1000; // in seconds
    const estimatedRemaining = Math.max(0, (estimatedTotal / progressRatio) - elapsed);
    
    onProgress?.({
      phase,
      progress,
      message,
      currentScene,
      totalScenes,
      currentFrame,
      estimatedTimeRemaining: Math.round(estimatedRemaining),
      elapsedTime: Math.round(elapsed),
    });
  };
  
  if (!apiKey) {
    logError('Storyboard generation failed: Missing API key', new Error('GEMINI_API_KEY is required'), {
      category: 'GENERATION',
    });
    throw new Error('GEMINI_API_KEY is required');
  }

  const ai = new GoogleGenAI({ apiKey });
  
  logInfo('Starting storyboard generation', {
    category: 'GENERATION',
    storyLength: story.length,
    aspectRatio,
    sceneCount,
    hasLogo: !!logoAsset,
    hasMainCharacter: !!mainCharacterAsset,
    hasBackground: !!backgroundAsset,
    hasArtStyle: !!artStyleAsset,
    additionalCharactersCount: additionalCharacterAssets.length,
  });

  // 1. Generate Story-World [SW] Parameterization first (Deep/Intermediate Structure)
  logDebug('Phase 1: Generating Story-World Parameterization', {
    category: 'GENERATION',
  });
  updateProgress('story-world', 5, 'יוצר ארכיטקטורת סיפור...');
  const storyWorld = await generateStoryWorld(story, apiKey);
  logDebug('Story-World generated successfully', {
    category: 'GENERATION',
    premise: storyWorld.premise?.substring(0, 100),
  });
  updateProgress('story-world', 15, 'ארכיטקטורת סיפור הושלמה');

  // 1.5. CHARACTER CONSISTENCY AGENT: Enhance character blueprint with reference image analysis
  // This is CRITICAL for maintaining visual consistency across all scenes
  logDebug('Phase 1.5: Character Consistency Agent - Analyzing reference images', {
    category: 'GENERATION',
    component: 'characterConsistencyAgent',
    hasMainCharacter: !!mainCharacterAsset,
    additionalCharactersCount: additionalCharacterAssets.length,
  });
  updateProgress('story-world', 18, 'מנתח הפניות דמויות לעקביות...');
  
  const { mainCharacterBlueprint, additionalCharacterBlueprints } = await enhanceCharacterBlueprint(
    storyWorld.characterBlueprint,
    mainCharacterAsset,
    additionalCharacterAssets,
    apiKey
  );
  
  logInfo('Character blueprint enhanced with reference analysis', {
    category: 'GENERATION',
    component: 'characterConsistencyAgent',
    originalBlueprintLength: storyWorld.characterBlueprint.length,
    enhancedBlueprintLength: mainCharacterBlueprint.length,
    additionalBlueprintsCount: additionalCharacterBlueprints.length,
  });
  updateProgress('story-world', 20, 'ניתוח עקביות דמויות הושלם');

  // 2. Generate scenes using Plot-Algorithm [PA] mechanism with 8-component tier hierarchy
  const scriptStartTime = Date.now();
  logDebug('Phase 2: Generating scene scripts', {
    category: 'GENERATION',
  });
  updateProgress('script', 25, `יוצר ${sceneCount} סצנות תסריט...`, undefined, sceneCount);
  
  logInfo('Generating script with scene count requirement', {
    category: 'GENERATION',
    sceneCount,
    expectedFrames: sceneCount * 2,
    frameCount: sceneCount * 2,
  });
  
  const scriptGenerationPrompt = `You are a MASTER SCREENPLAY ARCHITECT / Complex System Regulator operating at Level 9 Broadcast Quality.

CRITICAL REQUIREMENT: You MUST generate EXACTLY ${sceneCount} scene(s). No more, no less. Each scene will have 2 frames (A and B variants).

PRIMARY MISSION: Generate EXACTLY ${sceneCount} scene(s) for a storyboard synchronized holistically through the Plot-Algorithm [PA] mechanism to ensure narrative and technical consistency at broadcast quality.

SCENE COUNT REQUIREMENT:
- Generate EXACTLY ${sceneCount} scene(s)
- Each scene must have 2 frames (Frame A and Frame B)
- Total frames will be ${sceneCount * 2}
- DO NOT generate more than ${sceneCount} scene(s)
- DO NOT generate fewer than ${sceneCount} scene(s)
${sceneCount === 1 ? `
SINGLE SCENE REQUIREMENT:
Since you are generating only ONE scene, make it impactful and complete. This scene should:
- Establish the key moment or turning point
- Include clear visual storytelling
- Be self-contained but can continue the narrative
` : ''}

STORY-WORLD [SW] PARAMETERIZATION:
${JSON.stringify(storyWorld, null, 2)}

PLOT-ALGORITHM [PA] MECHANISM:
- Goal-Path Orientation: Each scene is a step toward the protagonist's goal. Map each scene to the structural attractors: ${storyWorld.structure.attractors.join(', ')}
- Bifurcation Points: At key dramatic nodes, consider alternative paths that reduce the gap between current state and desired state
- Difference-Engine: Each scene should advance the story by reducing the gap between where the character is and where they need to be

ATTENTION HIERARCHY (Tier 1-7) - Front-Loading Required:
Generate each scene with the following 8-component tier hierarchy, ordered by importance to overcome Transformer Attention Decay:

TIER 1 (ARCHITECTURE - CRITICAL): Cinematography & Format
- Camera System: ARRI Alexa Mini LF / Sony Venice
- Lens: 35mm T1.5
- Aspect Ratio: ${aspectRatio} (${aspectRatio === '16:9' ? 'Landscape' : 'Portrait'} format)
- Resolution: 1080p / 4K
- Specify exact technical specifications

TIER 2 (CORE SUBJECT): Subject Identity
- Use ENHANCED VERBATIM character description (analyzed from reference image): "${mainCharacterBlueprint}"
- This description has been ENHANCED by the Character Consistency Agent based on the actual reference image
- Copy this description EXACTLY (word-for-word) across ALL scenes where the character appears
- The reference image analysis ensures perfect visual consistency - use it VERBATIM
- Include current emotional state
- Add 15+ specific physical/behavioral attributes if not already in blueprint
- CRITICAL: The character MUST look EXACTLY like the reference image in EVERY scene

TIER 3 (SCENE ANCHORS): Scene & Context
- Forensic location description: exact location, architecture, props
- Primary lighting source and conditions
- Weather/time of day (e.g., "Modern conference room, white exposed walls, sunset light")
- Spatial relationships

TIER 4 (MOTION): Action & Camera Composition
- Action: Separate body actions from facial actions (Single-Action Principle)
  * Body: Specific movements, gestures, positioning
  * Face: Micro-expressions, eye movements, subtle changes
- Camera & Composition:
  * Shot Type: (MS/Medium Shot, CU/Close-Up, WS/Wide Shot, etc.)
  * Movement: (Smooth Dolly-In, Steadicam Tracking, Static, etc.)
  * Positioning Syntax: MUST include "(thats where the camera is)" for Veo 3.1 optimization
  * Angle and framing

TIER 5 (AESTHETICS): Style & Ambiance
- Color Grading: (e.g., "Teal and Orange separation", "Desaturated cool tones")
- Lighting Ratios: (e.g., "3:1 for moderate drama", "8:1 for high drama")
- Mood: (e.g., "Melancholic, professional, noir")
- Visual genre and emotional tone

TIER 6 (AUDIO): Audio & Dialogue
- Sound Design: Ambient sounds, Foley, Music genre/volume
- Dialogue Syntax: MANDATORY format - Character: "Dialogue here"
  * Example: Protagonist: "We need to move forward."
  * This prevents subtitle generation and ensures proper lip-sync
- Optional: Phoneme Mapping for precise lip-sync accuracy

TIER 7 (QUALITY CONTROL): Technical & Negative
- Universal Quality Control Negatives: "without subtitles, without logos, without compression artifacts, without anatomical warping, exactly 5 fingers per hand, no text overlays, no watermarks"

NARRATIVE CONSISTENCY PROTOCOLS:
- Each scene must align with the Three-Act Structure: ${storyWorld.structure.act1} → ${storyWorld.structure.act2} → ${storyWorld.structure.act3}
- Character arc must reflect internal conflict: ${storyWorld.coreConflict.internal}
- External obstacles must align with: ${storyWorld.coreConflict.external}
- Respect boundaries: ${storyWorld.boundaries.spatial}, ${storyWorld.boundaries.temporal}, ${storyWorld.boundaries.visual}

ENTROPY REDUCTION:
- Use hyper-specificity to reduce latent space dimensionality
- Minimize uncertainty through precise technical language
- Ensure holistic system coherence (bi-directional flow between structural layers)

For the veoPrompt field, create a comprehensive prompt that integrates ALL 8 tiers in a single description optimized for Veo 3.1, including the "(thats where the camera is)" positioning syntax.

Respond ONLY with a JSON object matching the specified schema.`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      scenes: {
        type: Type.ARRAY,
        minItems: sceneCount,
        maxItems: sceneCount,
        items: {
          type: Type.OBJECT,
          properties: {
            // Core fields
            id: { type: Type.INTEGER },
            title: { type: Type.STRING },
            scriptLine: { type: Type.STRING },
            emotion: { type: Type.STRING },
            intent: { type: Type.STRING },

            // 8-Component Tier Hierarchy (Level 9 Broadcast Quality)
            // TIER 1: Cinematography & Format
            cinematographyFormat: { type: Type.STRING },
            
            // TIER 2: Subject Identity (Verbatim)
            subjectIdentity: { type: Type.STRING },
            
            // TIER 3: Scene & Context
            sceneContext: { type: Type.STRING },
            
            // TIER 4: Action & Camera Composition
            action: { type: Type.STRING },
            cameraComposition: { type: Type.STRING },
            
            // TIER 5: Style & Ambiance
            styleAmbiance: { type: Type.STRING },
            
            // TIER 6: Audio & Dialogue
            audioDialogue: { type: Type.STRING },
            
            // TIER 7: Technical & Negative
            technicalNegative: { type: Type.STRING },
            
            // Comprehensive Veo 3.1 prompt
            veoPrompt: { type: Type.STRING },

            // Optional: Three-Layer Architecture
            deepStructure: { type: Type.STRING },
            intermediateStructure: { type: Type.STRING },
            surfaceStructure: { type: Type.STRING },
          },
          required: [
            "id", "title", "scriptLine", "emotion", "intent",
            "cinematographyFormat", "subjectIdentity", "sceneContext",
            "action", "cameraComposition", "styleAmbiance",
            "audioDialogue", "technicalNegative", "veoPrompt"
          ]
        }
      }
    },
    required: ["scenes"]
  };
  
  let scriptResponse;
  try {
    // Add reference instructions to script generation prompt
    const referenceInstructions = buildReferenceInstructions(
      artStyleAsset,
      backgroundAsset,
      mainCharacterAsset,
      additionalCharacterAssets
    );
    
    const fullScriptPrompt = scriptGenerationPrompt + referenceInstructions;
    
    scriptResponse = await trackOperation(
      'script-generation',
      () => ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: fullScriptPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        },
      }),
      { promptLength: fullScriptPrompt.length }
    );

    logDebug('Script API response received', {
      category: 'GENERATION',
      hasText: !!scriptResponse.text,
      responseType: typeof scriptResponse,
      responseKeys: Object.keys(scriptResponse || {}),
    });
  } catch (error) {
    const scriptDuration = Date.now() - scriptStartTime;
    logError('Script generation failed', error, {
      category: 'GENERATION',
      duration: `${scriptDuration}ms`,
    });
    throw new Error(`Failed to generate script: ${error instanceof Error ? error.message : String(error)}`);
  }

  const responseText = scriptResponse.text || (scriptResponse as any).response?.text || JSON.stringify(scriptResponse);
  const scriptData = JSON.parse(responseText);
  let generatedScenes: Omit<Scene, 'frames'>[] = scriptData.scenes;
  const scriptDuration = Date.now() - scriptStartTime;
  
  // Limit to requested scene count (this should not happen with maxItems constraint, but keep as safety)
  if (generatedScenes.length > sceneCount) {
    logWarn('AI generated more scenes than requested despite schema constraint, limiting to requested count', {
      category: 'GENERATION',
      requestedScenes: sceneCount,
      generatedScenes: generatedScenes.length,
      expectedFrames: sceneCount * 2,
      actualFrames: generatedScenes.length * 2,
    });
    generatedScenes = generatedScenes.slice(0, sceneCount);
  } else if (generatedScenes.length < sceneCount) {
    logWarn('AI generated fewer scenes than requested despite schema constraint', {
      category: 'GENERATION',
      requestedScenes: sceneCount,
      generatedScenes: generatedScenes.length,
      expectedFrames: sceneCount * 2,
      actualFrames: generatedScenes.length * 2,
    });
  }
  
  // Final validation - ensure we have exactly the right number
  if (generatedScenes.length !== sceneCount) {
    logError('Scene count mismatch after validation', new Error(`Expected ${sceneCount} scenes, got ${generatedScenes.length}`), {
      category: 'GENERATION',
      requestedScenes: sceneCount,
      actualScenes: generatedScenes.length,
      expectedFrames: sceneCount * 2,
      actualFrames: generatedScenes.length * 2,
    });
  }
  
  logInfo('Script generation completed', {
    category: 'GENERATION',
    duration: `${scriptDuration}ms`,
    requestedScenes: sceneCount,
    generatedScenes: generatedScenes.length,
    finalScenes: generatedScenes.length,
  });
  
  updateProgress('script', 30, `תסריט: ${generatedScenes.length} סצנות נוצרו`, undefined, generatedScenes.length);

  // 2.5. CHARACTER CONSISTENCY VALIDATION: Validate character consistency across scenes
  logDebug('Phase 2.5: Character Consistency Validation', {
    category: 'GENERATION',
    component: 'characterConsistencyAgent',
  });
  const validationResult = validateCharacterConsistency(
    generatedScenes as Scene[],
    mainCharacterBlueprint,
    additionalCharacterBlueprints
  );
  
  if (!validationResult.isValid) {
    logWarn('Character consistency validation found issues', {
      category: 'GENERATION',
      component: 'characterConsistencyAgent',
      issues: validationResult.issues,
    });
    // Log issues but continue - the enhanced blueprint should help
  } else {
    logInfo('Character consistency validation passed', {
      category: 'GENERATION',
      component: 'characterConsistencyAgent',
      scenesCount: generatedScenes.length,
    });
  }

  // 3. Generate images for each scene using a vision model (progressive loading)
  const scenesWithImages: Scene[] = [];
  
  for (let i = 0; i < generatedScenes.length; i++) {
    const scene = generatedScenes[i];
    const baseProgress = 35; // Start from 35% after script generation
    const progressPerScene = 60 / generatedScenes.length; // 60% for all images
    const sceneProgress = baseProgress + Math.round((i / generatedScenes.length) * progressPerScene);
    
    updateProgress('images', sceneProgress, `יוצר תמונות לסצנה ${i + 1}/${generatedScenes.length}: ${scene.title}`, i + 1, generatedScenes.length);
    
    const processedScene = await (async () => {
      const imageGenParts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];
      
      // CRITICAL: Image references MUST come FIRST before text prompt
      // This ensures the model sees and processes visual references before generating
      // Priority order: Art Style → Background → Characters → Logo
      
      // 1. ART STYLE REFERENCE (Highest Priority - applies to entire storyboard)
      if (artStyleAsset) {
        imageGenParts.push({
          text: `[REFERENCE IMAGE 1: ART STYLE] 

CRITICAL INSTRUCTION: The following image defines the EXACT art style for this entire storyboard. 

YOU MUST:
- Match the visual style, rendering technique, color palette, and aesthetic of this reference image EXACTLY
- Apply this art style to ALL elements: characters, environments, objects, lighting, textures, shadows, and visual effects
- Maintain complete visual consistency across ALL scenes - every frame must look like it belongs to the same artistic world
- If this is pixel art, render everything in pixel art. If this is Minecraft style, render everything in Minecraft blocks. If this is anime, render everything in anime style.
- DO NOT deviate from this art style - it is the foundation of the entire visual narrative

This art style reference is MANDATORY and must be applied to every single element in every scene.`
        });
        imageGenParts.push({
          inlineData: {
            mimeType: artStyleAsset.mimeType,
            data: artStyleAsset.data
          }
        });
      }
      
      // 2. BACKGROUND REFERENCE (Second Priority - base environment)
      if (backgroundAsset) {
        imageGenParts.push({
          text: `[REFERENCE IMAGE 2: BACKGROUND ENVIRONMENT]

CRITICAL INSTRUCTION: The following image shows the base environment and world setting.

YOU MUST:
- Use this background as the foundation for ALL scene environments
- Extract and incorporate: color palette, lighting mood, architectural style, texture patterns, atmospheric conditions
- Adapt elements from this background to fit each scene's specific location while maintaining visual consistency
- Preserve the overall visual language, atmosphere, and world-building elements
- If scenes take place in different locations, ensure they all feel like they exist in the same world as this reference

This background reference establishes the visual world - all scenes must feel connected to this environment.`
        });
        imageGenParts.push({
          inlineData: {
            mimeType: backgroundAsset.mimeType,
            data: backgroundAsset.data
          }
        });
      }
      
      // 3. MAIN CHARACTER REFERENCE (Third Priority)
      let characterConsistencyPrompt = '';
      if (mainCharacterAsset) {
        characterConsistencyPrompt = `

[REFERENCE IMAGE 3: MAIN CHARACTER]

CRITICAL CHARACTER CONSISTENCY REQUIREMENTS:
The main character in the following reference image MUST appear EXACTLY as shown in ALL scenes where they appear.

MANDATORY CONSISTENCY CHECKLIST:
✓ Exact facial features: face shape, eyes (color, shape, size), nose, mouth, eyebrows
✓ Identical hair: color, style, length, texture - must match reference EXACTLY
✓ Same body type: height, build, proportions, body shape
✓ Consistent skin tone and complexion - must match reference precisely
✓ Same clothing style and color palette (unless story requires change)
✓ Any distinctive marks, scars, or features must appear identically
✓ Only pose, expression, and context may vary - the character must be recognizable as the SAME person

ENHANCED CHARACTER BLUEPRINT (FROM CHARACTER CONSISTENCY AGENT):
${mainCharacterBlueprint}

SCENE-SPECIFIC SUBJECT IDENTITY:
${scene.subjectIdentity}

CRITICAL: The scene-specific subjectIdentity above MUST align with the enhanced blueprint. Use BOTH the enhanced blueprint (which matches the reference image EXACTLY) AND the scene-specific description. The character MUST look like the EXACT same person from the reference image in EVERY scene.

FAILURE TO MAINTAIN CONSISTENCY WILL RESULT IN REJECTION. The character must look like the EXACT same person throughout the entire storyboard.`;
        
        imageGenParts.push({
          text: `[REFERENCE IMAGE 3: MAIN CHARACTER - ABSOLUTE PRIORITY]

⚠️ CRITICAL: THIS IS THE MAIN CHARACTER - THE PROTAGONIST OF THE ENTIRE STORY ⚠️

YOU MUST:
1. Look at this reference image CAREFULLY
2. Identify EVERY detail: face shape, eye color, hair style and color, body type, clothing, distinctive features
3. REPLICATE THIS EXACT CHARACTER in EVERY scene where they appear
4. The character MUST be recognizable as the SAME person from this reference image
5. ONLY pose, expression, and context may change - the character's appearance MUST remain IDENTICAL

THIS CHARACTER IS THE PROTAGONIST - THEY MUST APPEAR IN EVERY SCENE AS THE MAIN SUBJECT.

DO NOT create a different character. DO NOT ignore this reference. DO NOT use a generic character.

The character in the following image IS the main character - use them EXACTLY as shown.`
        });
        imageGenParts.push({
          inlineData: {
            mimeType: mainCharacterAsset.mimeType,
            data: mainCharacterAsset.data
          }
        });
        imageGenParts.push({
          text: `[CONFIRMATION] You have now seen the MAIN CHARACTER reference image above. This character MUST be the primary subject in ALL scenes. Remember their appearance: face, hair, body, clothing - EVERY detail matters.`
        });
      }
      
      // 4. ADDITIONAL CHARACTERS (Fourth Priority)
      additionalCharacterAssets.forEach((charAsset, index) => {
        imageGenParts.push({
          text: `[REFERENCE IMAGE ${4 + index}: ADDITIONAL CHARACTER ${index + 2}]

This is a SECONDARY CHARACTER. They must maintain visual consistency when appearing in scenes. Study their appearance in this reference and replicate it accurately across all scenes where they appear.`
        });
        imageGenParts.push({
          inlineData: {
            mimeType: charAsset.mimeType,
            data: charAsset.data
          }
        });
      });

      // 5. LOGO INTEGRATION (Lowest Priority - subtle integration)
      const logoPrompt = logoAsset ? `
LOGO INTEGRATION: Subtly incorporate the provided brand logo into the scene naturally - on clothing, screens, products, or background elements. The logo should feel organic to the scene, not forced or artificial.` : '';

      // Build cross-scene consistency context
      // Note: i is the current scene index from the outer loop
      const previousScenes = generatedScenes.slice(0, i);
      
      const crossSceneContext = previousScenes.length > 0 ? `
═══════════════════════════════════════════════════════════
CROSS-SCENE CONSISTENCY REQUIREMENTS:
═══════════════════════════════════════════════════════════
- This is Scene ${scene.id} of ${generatedScenes.length} total scenes
- Previous scenes: ${previousScenes.map(s => `Scene ${s.id}: "${s.title}"`).join(', ')}
- Character must maintain EXACT visual consistency with previous scenes
- Color palette should evolve naturally but maintain overall coherence
- Lighting should follow temporal progression (time of day, weather changes)
- Environment should feel connected to previous scenes
- Narrative arc progression: ${storyWorld.structure.act1.substring(0, 100)}... → ${storyWorld.structure.act2.substring(0, 100)}... → ${storyWorld.structure.act3.substring(0, 100)}...
- Maintain visual continuity while allowing natural story progression
` : '';
      
      // Build comprehensive prompt that references the images already provided
      const referenceInstructions = [];
      if (artStyleAsset) {
        referenceInstructions.push(`- ART STYLE: You have been provided with an art style reference image. EVERY element in this scene MUST match that art style exactly - characters, environment, objects, lighting, textures, everything.`);
      }
      if (backgroundAsset) {
        referenceInstructions.push(`- BACKGROUND: You have been provided with a background reference image. Use its color palette, lighting mood, architectural elements, and atmosphere as the foundation for this scene's environment.`);
      }
      if (mainCharacterAsset) {
        referenceInstructions.push(`- ⚠️ MAIN CHARACTER (CRITICAL): You have been provided with a reference image of the MAIN CHARACTER - THE PROTAGONIST. This character MUST be the PRIMARY SUBJECT in EVERY scene. They MUST appear EXACTLY as shown in the reference image - same face, same hair, same body type, same distinctive features. ONLY pose, expression, and context may vary. The character MUST be recognizable as the EXACT SAME person from the reference image. DO NOT create a different character. DO NOT ignore this reference.`);
      }
      if (additionalCharacterAssets.length > 0) {
        referenceInstructions.push(`- ADDITIONAL CHARACTERS: You have been provided with ${additionalCharacterAssets.length} reference image(s) of secondary characters. They must appear EXACTLY as shown in their respective reference images.`);
      }
      if (logoAsset) {
        referenceInstructions.push(`- LOGO: Subtly incorporate the provided brand logo naturally into the scene.`);
      }

      const textPrompt = `[SCENE GENERATION INSTRUCTION]

SCENE: "${scene.scriptLine}"
${crossSceneContext}
═══════════════════════════════════════════════════════════
⚠️ REFERENCE IMAGES PROVIDED - ABSOLUTE MANDATORY USAGE ⚠️
═══════════════════════════════════════════════════════════
${referenceInstructions.length > 0 ? referenceInstructions.join('\n') : 'No reference images provided - use default photorealistic style.'}

${mainCharacterAsset ? `\n🔴 CRITICAL REMINDER: The MAIN CHARACTER reference image (REFERENCE IMAGE 3) has been provided above. This character MUST be the PRIMARY SUBJECT in this scene. They MUST look EXACTLY like the person in that reference image. DO NOT create a different character. DO NOT ignore the reference image.` : ''}

═══════════════════════════════════════════════════════════
8-COMPONENT TIER HIERARCHY SPECIFICATIONS:
═══════════════════════════════════════════════════════════
TIER 1 (Cinematography & Format): ${scene.cinematographyFormat}
TIER 2 (Subject Identity): ${scene.subjectIdentity}

${mainCharacterAsset ? `\n\n🔴 ENHANCED CHARACTER BLUEPRINT (FROM CHARACTER CONSISTENCY AGENT):
${mainCharacterBlueprint}

⚠️ CRITICAL: The subject identity above MUST match BOTH:
1. The ENHANCED CHARACTER BLUEPRINT (analyzed from reference image) - use it VERBATIM
2. The MAIN CHARACTER reference image (REFERENCE IMAGE 3) that was provided

The character MUST look EXACTLY like the person in that reference image - same face, same hair, same body type, same distinctive features. The Character Consistency Agent has analyzed the reference image and created this enhanced blueprint to ensure perfect consistency. USE IT EXACTLY.` : ''}
TIER 3 (Scene Context): ${scene.sceneContext}
TIER 4 (Action & Camera): ${scene.action} | ${scene.cameraComposition}
TIER 5 (Style & Ambiance): ${scene.styleAmbiance}
TIER 6 (Audio & Dialogue): ${scene.audioDialogue}
TIER 7 (Technical Negative): ${scene.technicalNegative}

COMPREHENSIVE VEO 3.1 PROMPT:
${scene.veoPrompt}

═══════════════════════════════════════════════════════════
CRITICAL REQUIREMENTS:
═══════════════════════════════════════════════════════════
${artStyleAsset ? '✓ ART STYLE: Match the art style reference image EXACTLY - this is the PRIMARY visual style\n' : '✓ STYLE: Photorealistic, broadcast-quality imagery (1080p/4K)\n'}${backgroundAsset ? '✓ BACKGROUND: Incorporate elements from the background reference image\n' : ''}✓ Aspect Ratio: ${aspectRatio} (${aspectRatio === '16:9' ? 'Landscape' : 'Portrait'} format) - CRITICAL: Generate image in exact ${aspectRatio} aspect ratio
✓ Professional cinematography with proper composition, lighting, and depth
✓ Consistent visual language across the storyboard
✓ Emotional tone: ${scene.emotion}
✓ Respect Story-World boundaries: ${storyWorld.boundaries.visual}
${characterConsistencyPrompt}${logoPrompt}
${additionalCharacterAssets.length > 0 ? `✓ Additional Characters: ${additionalCharacterAssets.length} secondary characters must maintain visual consistency with their reference images\n` : ''}

NEGATIVE CONSTRAINTS: ${scene.technicalNegative}

═══════════════════════════════════════════════════════════
FINAL REMINDER:
═══════════════════════════════════════════════════════════
${artStyleAsset ? '→ The art style reference image is MANDATORY - every element must match it.\n' : ''}${backgroundAsset ? '→ The background reference image establishes the world - use its visual language.\n' : ''}${mainCharacterAsset ? '→ 🔴 THE MAIN CHARACTER REFERENCE IMAGE (REFERENCE IMAGE 3) IS ABSOLUTELY CRITICAL - THIS CHARACTER MUST BE THE PRIMARY SUBJECT IN THIS SCENE AND MUST LOOK EXACTLY LIKE THE PERSON IN THAT IMAGE. DO NOT CREATE A DIFFERENT CHARACTER. DO NOT IGNORE THIS REFERENCE. THE CHARACTER FROM REFERENCE IMAGE 3 IS THE PROTAGONIST AND MUST APPEAR AS THE MAIN SUBJECT.\n' : ''}${additionalCharacterAssets.length > 0 ? `→ The ${additionalCharacterAssets.length} additional character reference image(s) are MANDATORY - maintain consistency.\n` : ''}→ Generate the image NOW, applying ALL reference images provided above. ${mainCharacterAsset ? 'The main character from REFERENCE IMAGE 3 MUST be the primary subject.' : ''}`;
      
      // 5. LOGO INTEGRATION (Lowest Priority - subtle integration)
      if (logoAsset) {
        const logoIndex = 4 + additionalCharacterAssets.length;
        imageGenParts.push({
          text: `[REFERENCE IMAGE ${logoIndex}: BRAND LOGO]

This is the brand logo. Incorporate it naturally into the scene - on clothing, screens, products, or background elements. It should feel organic, not forced.`
        });
        imageGenParts.push({ 
          inlineData: {
            mimeType: logoAsset.mimeType,
            data: logoAsset.data
          }
        });
      }
      
      // CRITICAL: Add comprehensive text prompt LAST (after all image references)
      // This ensures the model has seen all visual references before reading instructions
      imageGenParts.push({ text: textPrompt });

      /**
       * Generate frame with retry mechanism and exponential backoff
       */
      const generateFrameWithRetry = async (
        maxRetries: number = 3,
        initialDelay: number = 1000
      ): Promise<string> => {
        let lastError: Error | null = null;
        
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            const imageResponse = await ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: { parts: imageGenParts },
              config: {
                responseModalities: [Modality.IMAGE],
                imageConfig: {
                  aspectRatio: aspectRatio,
                },
              },
            });

            logDebug(`Scene ${scene.id} image generation attempt ${attempt + 1}/${maxRetries}`, {
              category: 'GENERATION',
              sceneId: scene.id,
              attempt: attempt + 1,
              maxRetries,
              hasCandidates: !!imageResponse.candidates,
              candidatesLength: imageResponse.candidates?.length || 0,
            });

            const firstPart = imageResponse.candidates?.[0]?.content?.parts?.[0];
            if (firstPart && 'inlineData' in firstPart && firstPart.inlineData) {
              const imageUrl = `data:${firstPart.inlineData.mimeType};base64,${firstPart.inlineData.data}`;
              
              // Validate image was actually generated (not placeholder)
              if (firstPart.inlineData.data.length > 1000 && 
                  !imageUrl.includes('placehold.co') && 
                  !imageUrl.includes('Error')) {
                const imageSizeKB = (firstPart.inlineData.data.length / 1024).toFixed(1);
                logDebug(`Scene ${scene.id} image generated successfully`, {
                  category: 'GENERATION',
                  sceneId: scene.id,
                  attempt: attempt + 1,
                  imageSizeKB: `${imageSizeKB}KB`,
                });
                return imageUrl;
              }
              
              throw new Error(`Generated image appears to be invalid (size: ${firstPart.inlineData.data.length} bytes)`);
            }
            
            throw new Error('No valid image data in response');
          } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            logWarn(`Scene ${scene.id} frame generation attempt ${attempt + 1}/${maxRetries} failed`, {
              category: 'GENERATION',
              sceneId: scene.id,
              attempt: attempt + 1,
              maxRetries,
              error: lastError.message,
            });
            
            if (attempt < maxRetries - 1) {
              // Exponential backoff: 1s, 2s, 4s
              const delay = initialDelay * Math.pow(2, attempt);
              logDebug(`Scene ${scene.id} retrying in ${delay}ms`, {
                category: 'GENERATION',
                sceneId: scene.id,
                delay,
              });
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }
        
        logError(`Scene ${scene.id} frame generation failed after ${maxRetries} attempts`, lastError || new Error('Frame generation failed'), {
          category: 'GENERATION',
          sceneId: scene.id,
          maxRetries,
        });
        throw lastError || new Error('Frame generation failed');
      };
      
      /**
       * Generate frame with fallback to simplified prompt
       */
      const generateFrameWithFallback = async (): Promise<string> => {
        try {
          return await generateFrameWithRetry();
        } catch (error) {
          logWarn(`Scene ${scene.id} failed to generate frame, trying simplified prompt`, {
            category: 'GENERATION',
            sceneId: scene.id,
            error: error instanceof Error ? error.message : String(error),
          });
          
          // Fallback: Try with simplified prompt (keep only reference images)
          const simplifiedParts = imageGenParts.filter(part => 
            part.inlineData || (part.text && part.text.includes('REFERENCE IMAGE'))
          );
          
          // Add minimal text prompt
          simplifiedParts.push({
            text: `Generate a professional cinematic image for: "${scene.scriptLine}". ${scene.veoPrompt.substring(0, 500)}`
          });
          
          try {
            logDebug(`Scene ${scene.id} attempting fallback generation`, {
              category: 'GENERATION',
              sceneId: scene.id,
            });
            const imageResponse = await ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: { parts: simplifiedParts },
              config: {
                responseModalities: [Modality.IMAGE],
                imageConfig: {
                  aspectRatio: aspectRatio,
                },
              },
            });
            
            const firstPart = imageResponse.candidates?.[0]?.content?.parts?.[0];
            if (firstPart && 'inlineData' in firstPart && firstPart.inlineData) {
              const imageUrl = `data:${firstPart.inlineData.mimeType};base64,${firstPart.inlineData.data}`;
              if (firstPart.inlineData.data.length > 1000) {
                logInfo(`Scene ${scene.id} fallback generation succeeded`, {
                  category: 'GENERATION',
                  sceneId: scene.id,
                });
                return imageUrl;
              }
            }
            
            throw new Error('Fallback generation also failed');
          } catch (fallbackError) {
            logError(`Scene ${scene.id} fallback generation failed`, fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError)), {
              category: 'GENERATION',
              sceneId: scene.id,
            });
            throw new Error(`Failed to generate frame even with fallback: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
          }
        }
      };
      
      const generateFrame = generateFrameWithFallback;
      
      // Generate two frame variants with progress updates
      const frameAStartTime = Date.now();
      const frameProgressStep = progressPerScene / 2; // Half of scene progress for each frame
      updateProgress('images', sceneProgress + (frameProgressStep * 0.3), `יוצר פריים A לסצנה ${i + 1}...`, i + 1, generatedScenes.length, 'A');
      
      const imageUrlA = await generateFrame();
      const frameADuration = Date.now() - frameAStartTime;
      logDebug(`Scene ${scene.id} Frame A generated`, {
        category: 'GENERATION',
        sceneId: scene.id,
        duration: `${frameADuration}ms`,
      });
      
      const frameBStartTime = Date.now();
      updateProgress('images', sceneProgress + (frameProgressStep * 0.7), `יוצר פריים B לסצנה ${i + 1}...`, i + 1, generatedScenes.length, 'B');
      
      const imageUrlB = await generateFrame();
      const frameBDuration = Date.now() - frameBStartTime;
      logDebug(`Scene ${scene.id} Frame B generated`, {
        category: 'GENERATION',
        sceneId: scene.id,
        duration: `${frameBDuration}ms`,
      });

      // Build default metadata (will be enhanced on frontend if needed)
      const defaultMetadata: Frame['metadata'] = {
        composition: `Professional ${scene.emotion} composition`,
        palette: ["#1a1a1a", "#f5f5f5", "#4a90e2"], // Default cinematic palette
        lighting: `Cinematic lighting for ${scene.emotion} tone`,
        camera: scene.cameraComposition || "Professional cinematography based on screenplay architecture",
      };

      const frames: [Frame, Frame] = [
        {
          id: `${scene.id}A`,
          variant: 'A',
          imageUrl: imageUrlA,
          metadata: defaultMetadata,
        },
        {
          id: `${scene.id}B`,
          variant: 'B',
          imageUrl: imageUrlB,
          metadata: defaultMetadata,
        },
      ];
      
      return { ...scene, frames };
    })();
    
    scenesWithImages.push(processedScene);
    
    logInfo(`Scene ${scene.id} completed`, {
      category: 'GENERATION',
      sceneId: scene.id,
      sceneTitle: scene.title,
      sceneNumber: i + 1,
      totalScenes: generatedScenes.length,
    });
    
    updateProgress('images', sceneProgress + progressPerScene, `סצנה ${i + 1}/${generatedScenes.length} הושלמה`, i + 1, generatedScenes.length);
  }

  const totalDuration = Date.now() - generationStartTime;
  logInfo('Storyboard generation completed', {
    category: 'GENERATION',
    duration: `${totalDuration}ms`,
    totalScenes: scenesWithImages.length,
    aspectRatio,
  });
  
  updateProgress('complete', 100, 'יצירת סטוריבורד הושלמה בהצלחה!');
  
  return { 
    scenes: scenesWithImages,
    storyWorld: storyWorld,
    aspectRatio: aspectRatio
  };
};

/**
 * Continues a narrative by generating 1 new scene (2 frames) that continues from the existing storyboard
 */
export const continueStoryboard = async (
  logoAsset: Base64Asset | null,
  mainCharacterAsset: Base64Asset | null,
  additionalCharacterAssets: Base64Asset[] = [],
  backgroundAsset: Base64Asset | null = null,
  artStyleAsset: Base64Asset | null = null,
  existingStoryboard: Storyboard,
  aspectRatio: '16:9' | '9:16' = '16:9',
  apiKey: string,
  customInstruction?: string,
  onProgress?: (progress: { phase: string; progress: number; message: string; currentScene?: number; totalScenes?: number; currentFrame?: string; estimatedTimeRemaining?: number; elapsedTime?: number }) => void
): Promise<Scene[]> => {
  const generationStartTime = Date.now();
  
  // Estimate time for continuation (1 scene = 2 frames)
  const continuationEstimatedTime = 20000 + (30000 * 2); // 20s script + 30s per frame * 2 frames (in milliseconds)
  
  const updateProgress = (phase: string, progress: number, message: string, currentScene?: number, totalScenes?: number, currentFrame?: string) => {
    const elapsed = (Date.now() - generationStartTime) / 1000; // in seconds
    const progressRatio = progress / 100;
    const estimatedTotal = continuationEstimatedTime / 1000; // in seconds
    const estimatedRemaining = Math.max(0, (estimatedTotal / progressRatio) - elapsed);
    
    onProgress?.({
      phase,
      progress,
      message,
      currentScene,
      totalScenes,
      currentFrame,
      estimatedTimeRemaining: Math.round(estimatedRemaining),
      elapsedTime: Math.round(elapsed),
    });
  };
  
  if (!apiKey) {
    logError('Storyboard continuation failed: Missing API key', new Error('GEMINI_API_KEY is required'), {
      category: 'GENERATION',
    });
    throw new Error('GEMINI_API_KEY is required');
  }

  if (!existingStoryboard || !existingStoryboard.scenes || existingStoryboard.scenes.length === 0) {
    throw new Error('Existing storyboard is required to continue');
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const lastScene = existingStoryboard.scenes[existingStoryboard.scenes.length - 1];
  const storyWorld = existingStoryboard.storyWorld;
  
  logInfo('Continuing storyboard', {
    category: 'GENERATION',
    existingScenesCount: existingStoryboard.scenes.length,
    lastSceneTitle: lastScene.title,
    hasCustomInstruction: !!customInstruction,
    aspectRatio,
    hasStoryWorld: !!storyWorld,
  });

  updateProgress('story-world', 5, 'מכין המשך נרטיב...');

  // Use existing story world or create a minimal one if missing
  let effectiveStoryWorld = storyWorld;
  if (!effectiveStoryWorld) {
    logWarn('No story world found in existing storyboard, creating minimal one', {
      category: 'GENERATION',
    });
    // Create a minimal story world from the last scene
    effectiveStoryWorld = {
      premise: lastScene.scriptLine || 'Continuing narrative',
      theme: 'Narrative continuation',
      structure: {
        act1: 'Setup',
        act2: 'Confrontation',
        act3: 'Resolution',
        attractors: ['Continuation']
      },
      characterBlueprint: lastScene.subjectIdentity || 'Character from previous scene',
      coreConflict: {
        internal: lastScene.emotion || 'Emotional state',
        external: lastScene.action || 'Action'
      },
      boundaries: {
        spatial: lastScene.sceneContext || 'Same world',
        temporal: 'Continuing timeline',
        historical: 'Same period',
        visual: 'Consistent style'
      }
    };
  }

  // Enhance character blueprint if we have character assets
  updateProgress('story-world', 10, 'מנתח הפניות דמויות...');
  const { mainCharacterBlueprint, additionalCharacterBlueprints } = await enhanceCharacterBlueprint(
    effectiveStoryWorld.characterBlueprint,
    mainCharacterAsset,
    additionalCharacterAssets,
    apiKey
  );

  // Generate continuation scene
  updateProgress('script', 20, 'יוצר סצנת המשך...', 1, 1);
  
  const continuationPrompt = `You are a MASTER SCREENPLAY ARCHITECT / Complex System Regulator operating at Level 9 Broadcast Quality.

PRIMARY MISSION: Generate ONE new scene that continues the narrative from the existing storyboard. This scene should naturally progress the story forward.

EXISTING STORYBOARD CONTEXT:
- Total scenes so far: ${existingStoryboard.scenes.length}
- Last scene: "${lastScene.title}"
- Last scene script: "${lastScene.scriptLine}"
- Last scene emotion: ${lastScene.emotion}
- Last scene intent: ${lastScene.intent}

${customInstruction ? `CUSTOM CONTINUATION INSTRUCTION: "${customInstruction}"\n\nYou MUST incorporate this instruction into the continuation scene.` : 'Continue the narrative naturally from the last scene.'}

STORY-WORLD [SW] PARAMETERIZATION:
${JSON.stringify(effectiveStoryWorld, null, 2)}

CONTINUATION REQUIREMENTS:
- Create exactly ONE new scene that continues from "${lastScene.title}"
- Scene ID should be ${existingStoryboard.scenes.length + 1}
- The scene should advance the narrative logically
- Maintain consistency with the existing story world and character blueprint
- Use the same visual style and technical specifications as previous scenes

ATTENTION HIERARCHY (Tier 1-7) - Front-Loading Required:
Generate the scene with the following 8-component tier hierarchy:

TIER 1 (ARCHITECTURE - CRITICAL): Cinematography & Format
- Camera System: ARRI Alexa Mini LF / Sony Venice
- Lens: 35mm T1.5
- Aspect Ratio: ${aspectRatio} (${aspectRatio === '16:9' ? 'Landscape' : 'Portrait'} format)
- Resolution: 1080p / 4K

TIER 2 (CORE SUBJECT): Subject Identity
- Use ENHANCED VERBATIM character description: "${mainCharacterBlueprint}"
- Copy this description EXACTLY across the scene
- Include current emotional state
- The character MUST look EXACTLY like previous scenes

TIER 3 (SCENE ANCHORS): Scene & Context
- Forensic location description: exact location, architecture, props
- Primary lighting source and conditions
- Weather/time of day
- Spatial relationships

TIER 4 (MOTION): Action & Camera Composition
- Action: Separate body actions from facial actions
- Camera & Composition: Shot Type, Movement, Positioning Syntax with "(thats where the camera is)"

TIER 5 (AESTHETICS): Style & Ambiance
- Color Grading
- Lighting Ratios
- Mood

TIER 6 (AUDIO): Audio & Dialogue
- Sound Design: Ambient sounds, Foley, Music
- Dialogue Syntax: Character: "Dialogue here"

TIER 7 (QUALITY CONTROL): Technical & Negative
- Universal Quality Control Negatives: "without subtitles, without logos, without compression artifacts, without anatomical warping, exactly 5 fingers per hand, no text overlays, no watermarks"

NARRATIVE CONSISTENCY:
- Must align with the story world structure
- Character arc must reflect: ${effectiveStoryWorld.coreConflict.internal}
- External obstacles: ${effectiveStoryWorld.coreConflict.external}
- Respect boundaries: ${effectiveStoryWorld.boundaries.spatial}, ${effectiveStoryWorld.boundaries.temporal}

For the veoPrompt field, create a comprehensive prompt that integrates ALL 8 tiers optimized for Veo 3.1.

Respond ONLY with a JSON object matching the specified schema.`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      scenes: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.INTEGER },
            title: { type: Type.STRING },
            scriptLine: { type: Type.STRING },
            emotion: { type: Type.STRING },
            intent: { type: Type.STRING },
            cinematographyFormat: { type: Type.STRING },
            subjectIdentity: { type: Type.STRING },
            sceneContext: { type: Type.STRING },
            action: { type: Type.STRING },
            cameraComposition: { type: Type.STRING },
            styleAmbiance: { type: Type.STRING },
            audioDialogue: { type: Type.STRING },
            technicalNegative: { type: Type.STRING },
            veoPrompt: { type: Type.STRING },
          },
          required: ['id', 'title', 'scriptLine', 'emotion', 'intent', 'cinematographyFormat', 'subjectIdentity', 'sceneContext', 'action', 'cameraComposition', 'styleAmbiance', 'audioDialogue', 'technicalNegative', 'veoPrompt']
        }
      }
    },
    required: ['scenes']
  };

  const referenceInstructions = buildReferenceInstructions(
    artStyleAsset,
    backgroundAsset,
    mainCharacterAsset,
    additionalCharacterAssets
  );
  
  const fullPrompt = continuationPrompt + referenceInstructions;
  
  let scriptResponse;
  try {
    scriptResponse = await trackOperation(
      'continuation-script-generation',
      () => ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: fullPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        },
      }),
      { promptLength: fullPrompt.length }
    );
  } catch (error) {
    logError('Continuation script generation failed', error, {
      category: 'GENERATION',
    });
    throw new Error(`Failed to generate continuation script: ${error instanceof Error ? error.message : String(error)}`);
  }

  const responseText = scriptResponse.text || JSON.stringify(scriptResponse);
  const scriptData = JSON.parse(responseText);
  const generatedScenes: Omit<Scene, 'frames'>[] = scriptData.scenes;
  
  if (generatedScenes.length === 0) {
    throw new Error('No scenes generated for continuation');
  }

  // Take only the first scene (we want exactly 1 scene with 2 frames)
  const continuationScene = generatedScenes[0];
  continuationScene.id = existingStoryboard.scenes.length + 1;

  updateProgress('images', 40, `יוצר תמונות לסצנת המשך: ${continuationScene.title}`, 1, 1);

  // Generate images for the continuation scene (same logic as generateStoryboard)
  const imageGenParts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];
  
  // Add reference images in priority order (same as generateStoryboard)
  if (artStyleAsset) {
    imageGenParts.push({
      text: `[REFERENCE IMAGE 1: ART STYLE] CRITICAL: Match this art style EXACTLY for all elements.`
    });
    imageGenParts.push({
      inlineData: {
        mimeType: artStyleAsset.mimeType,
        data: artStyleAsset.data
      }
    });
  }
  
  if (backgroundAsset) {
    imageGenParts.push({
      text: `[REFERENCE IMAGE 2: BACKGROUND] Use this as the foundation for the environment.`
    });
    imageGenParts.push({
      inlineData: {
        mimeType: backgroundAsset.mimeType,
        data: backgroundAsset.data
      }
    });
  }
  
  if (mainCharacterAsset) {
    imageGenParts.push({
      text: `[REFERENCE IMAGE 3: MAIN CHARACTER] CRITICAL: This character MUST appear EXACTLY as shown. Use the enhanced blueprint: ${mainCharacterBlueprint}`
    });
    imageGenParts.push({
      inlineData: {
        mimeType: mainCharacterAsset.mimeType,
        data: mainCharacterAsset.data
      }
    });
  }
  
  // Add additional characters
  for (let i = 0; i < additionalCharacterAssets.length; i++) {
    const charAsset = additionalCharacterAssets[i];
    const charBlueprint = additionalCharacterBlueprints[i] || 'See reference image';
    imageGenParts.push({
      text: `[REFERENCE IMAGE ${4 + i}: ADDITIONAL CHARACTER ${i + 1}] Use blueprint: ${charBlueprint}`
    });
    imageGenParts.push({
      inlineData: {
        mimeType: charAsset.mimeType,
        data: charAsset.data
      }
    });
  }
  
  if (logoAsset) {
    imageGenParts.push({
      text: `[REFERENCE IMAGE: LOGO] Include this logo in the scene if appropriate.`
    });
    imageGenParts.push({
      inlineData: {
        mimeType: logoAsset.mimeType,
        data: logoAsset.data
      }
    });
  }

  // Add the scene prompt
  imageGenParts.push({
    text: `Generate an image for this scene:

SCENE: ${continuationScene.title}
SCRIPT: "${continuationScene.scriptLine}"
EMOTION: ${continuationScene.emotion}
INTENT: ${continuationScene.intent}

VEO PROMPT: ${continuationScene.veoPrompt}

ASPECT RATIO: ${aspectRatio}

Generate a professional, cinematic image that matches the art style references and character references provided above.`
  });

  // Generate Frame A
  updateProgress('images', 50, 'יוצר פריים A...', 1, 1, 'A');
  
  const generateFrame = async (): Promise<string> => {
    try {
      const imageResponse = await trackOperation(
        'continuation-frame-generation',
        () => ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts: imageGenParts },
          config: {
            responseModalities: [Modality.IMAGE],
            imageConfig: {
              aspectRatio: aspectRatio,
            },
          },
        }),
        { sceneId: continuationScene.id }
      );
      
      const firstPart = imageResponse.candidates?.[0]?.content?.parts?.[0];
      if (firstPart && 'inlineData' in firstPart && firstPart.inlineData) {
        const imageUrl = `data:${firstPart.inlineData.mimeType};base64,${firstPart.inlineData.data}`;
        
        // Validate image was actually generated (not placeholder)
        if (firstPart.inlineData.data.length > 1000 && 
            !imageUrl.includes('placehold.co') && 
            !imageUrl.includes('Error')) {
          return imageUrl;
        }
      }
      
      throw new Error('No valid image data in response');
    } catch (error) {
      logError('Frame generation failed', error, {
        category: 'GENERATION',
        sceneId: continuationScene.id,
      });
      throw error;
    }
  };

  const imageUrlA = await generateFrame();
  
  // Generate Frame B (slight variation)
  updateProgress('images', 75, 'יוצר פריים B...', 1, 1, 'B');
  
  const imageUrlB = await generateFrame();

  const defaultMetadata: Frame['metadata'] = {
    composition: `Professional ${continuationScene.emotion} composition`,
    palette: ["#1a1a1a", "#f5f5f5", "#4a90e2"],
    lighting: `Cinematic lighting for ${continuationScene.emotion} tone`,
    camera: continuationScene.cameraComposition || "Professional cinematography",
  };

  const frames: [Frame, Frame] = [
    {
      id: `${continuationScene.id}A`,
      variant: 'A',
      imageUrl: imageUrlA,
      metadata: defaultMetadata,
    },
    {
      id: `${continuationScene.id}B`,
      variant: 'B',
      imageUrl: imageUrlB,
      metadata: defaultMetadata,
    },
  ];

  const finalScene: Scene = { ...continuationScene, frames };

  const totalDuration = Date.now() - generationStartTime;
  logInfo('Storyboard continuation completed', {
    category: 'GENERATION',
    duration: `${totalDuration}ms`,
    newSceneTitle: finalScene.title,
  });
  
  updateProgress('complete', 100, 'המשך נרטיב הושלם בהצלחה!');

  return [finalScene];
};

