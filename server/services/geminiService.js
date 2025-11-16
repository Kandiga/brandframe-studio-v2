import { GoogleGenAI, Type, Modality } from '@google/genai';

/**
 * Story-World [SW] Parameterization
 * Generates the foundational story architecture before scene generation.
 */
const generateStoryWorld = async (story, apiKey) => {
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

  const storyWorldResponse = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: storyWorldPrompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: storyWorldSchema,
    },
  });

  return JSON.parse(storyWorldResponse.text);
};

/**
 * Generates a storyboard using Gemini API
 */
export const generateStoryboard = async (
  logoAsset,
  characterAsset,
  story,
  aspectRatio = '16:9',
  apiKey
) => {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required');
  }

  const ai = new GoogleGenAI({ apiKey });
  console.log("Generating storyboard with Level 9 Master Screenplay Architect:", { story });

  // 1. Generate Story-World [SW] Parameterization first
  console.log("Phase 1: Generating Story-World Parameterization...");
  const storyWorld = await generateStoryWorld(story, apiKey);
  console.log("Story-World generated:", storyWorld);

  // 2. Generate scenes using Plot-Algorithm [PA] mechanism
  const scriptGenerationPrompt = `You are a MASTER SCREENPLAY ARCHITECT / Complex System Regulator operating at Level 9 Broadcast Quality.

PRIMARY MISSION: Generate a comprehensive 4-scene storyboard synchronized holistically through the Plot-Algorithm [PA] mechanism to ensure narrative and technical consistency at broadcast quality.

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
- Use VERBATIM character description from Story-World: "${storyWorld.characterBlueprint}"
- Copy this description EXACTLY (word-for-word) across ALL scenes where the character appears
- Include current emotional state
- Add 15+ specific physical/behavioral attributes if not already in blueprint

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

  const scriptResponse = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: scriptGenerationPrompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
    },
  });

  const scriptData = JSON.parse(scriptResponse.text);
  const generatedScenes = scriptData.scenes;

  // 3. Generate images for each scene
  const scenesWithImages = await Promise.all(
    generatedScenes.map(async (scene) => {
      const imageGenParts = [];

      let characterConsistencyPrompt = '';
      if (characterAsset) {
        characterConsistencyPrompt = `
CRITICAL CHARACTER CONSISTENCY: The main character MUST maintain complete visual consistency with the reference image provided:
- Exact facial features (face shape, eyes, nose, mouth, hair color and style)
- Same body type, proportions, and build
- Consistent skin tone, complexion, and any distinctive marks
- Identical appearance across all scenes (only pose, expression, and context may vary)
- The character must look like the exact same person throughout the entire storyboard
- Use VERBATIM description: ${scene.subjectIdentity}`;
      }

      const logoPrompt = logoAsset ? `
LOGO INTEGRATION: Subtly incorporate the provided brand logo into the scene naturally - on clothing, screens, products, or background elements. The logo should feel organic to the scene, not forced or artificial.` : '';

      const textPrompt = `Level 9 Broadcast Quality - Professional cinematic image generation for: "${scene.scriptLine}"

8-COMPONENT TIER HIERARCHY SPECIFICATIONS:
TIER 1 (Cinematography & Format): ${scene.cinematographyFormat}
TIER 2 (Subject Identity): ${scene.subjectIdentity}
TIER 3 (Scene Context): ${scene.sceneContext}
TIER 4 (Action & Camera): ${scene.action} | ${scene.cameraComposition}
TIER 5 (Style & Ambiance): ${scene.styleAmbiance}
TIER 6 (Audio & Dialogue): ${scene.audioDialogue}
TIER 7 (Technical Negative): ${scene.technicalNegative}

COMPREHENSIVE VEO 3.1 PROMPT:
${scene.veoPrompt}

STYLE REQUIREMENTS:
- Photorealistic, broadcast-quality imagery (1080p/4K)
- Aspect Ratio: ${aspectRatio} (${aspectRatio === '16:9' ? 'Landscape' : 'Portrait'} format) - CRITICAL: Generate image in exact ${aspectRatio} aspect ratio
- Professional cinematography with proper composition, lighting, and depth
- Consistent visual language across the storyboard
- Emotional tone: ${scene.emotion}
- Respect Story-World boundaries: ${storyWorld.boundaries.visual}
${characterConsistencyPrompt}${logoPrompt}

NEGATIVE CONSTRAINTS: ${scene.technicalNegative}`;

      imageGenParts.push({ text: textPrompt });

      // Always include character reference first if available
      if (characterAsset) {
        imageGenParts.push({
          inlineData: {
            mimeType: characterAsset.mimeType,
            data: characterAsset.data
          }
        });
      }
      if (logoAsset) {
        imageGenParts.push({
          inlineData: {
            mimeType: logoAsset.mimeType,
            data: logoAsset.data
          }
        });
      }

      const generateFrame = async () => {
        try {
          console.log('[Image Gen] Attempting to generate frame with model: gemini-2.5-flash-image');
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

          console.log('[Image Gen] Response received:', JSON.stringify(imageResponse, null, 2));
          const firstPart = imageResponse.candidates?.[0]?.content?.parts?.[0];
          if (firstPart && 'inlineData' in firstPart && firstPart.inlineData) {
            console.log('[Image Gen] Successfully generated image');
            return `data:${firstPart.inlineData.mimeType};base64,${firstPart.inlineData.data}`;
          }
          console.error("[Image Gen] Image generation failed - no inlineData in response");
          return "https://placehold.co/400x225/ff0000/FFFFFF?text=Error";
        } catch (error) {
          console.error("[Image Gen] Error generating frame:", error.message);
          console.error("[Image Gen] Error details:", error);
          return "https://placehold.co/400x225/ff0000/FFFFFF?text=Error";
        }
      };

      // Generate two frame variants in parallel
      const [imageUrlA, imageUrlB] = await Promise.all([generateFrame(), generateFrame()]);

      const frames = [
        {
          id: `${scene.id}A`,
          variant: 'A',
          imageUrl: imageUrlA,
          metadata: {
            composition: `Professional ${scene.emotion} composition - Variant A`,
            palette: ["#1a1a1a", "#f5f5f5", "#4a90e2"],
            lighting: `Cinematic lighting for ${scene.emotion} tone`,
            camera: "Professional cinematography based on screenplay architecture",
          },
        },
        {
          id: `${scene.id}B`,
          variant: 'B',
          imageUrl: imageUrlB,
          metadata: {
            composition: `Professional ${scene.emotion} composition - Variant B`,
            palette: ["#1a1a1a", "#f5f5f5", "#4a90e2"],
            lighting: `Cinematic lighting for ${scene.emotion} tone`,
            camera: "Professional cinematography based on screenplay architecture",
          },
        },
      ];

      return { ...scene, frames };
    })
  );

  return {
    scenes: scenesWithImages,
    storyWorld: storyWorld,
    aspectRatio: aspectRatio
  };
};
