import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { GoogleGenAI, Type, Modality } from "npm:@google/genai@1.29.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Base64Asset {
  mimeType: string;
  data: string;
}

interface StoryboardRequest {
  logoAsset?: Base64Asset | null;
  mainCharacterAsset?: Base64Asset | null;
  characterAsset?: Base64Asset | null;
  additionalCharacterAssets?: Base64Asset[];
  backgroundAsset?: Base64Asset | null;
  artStyleAsset?: Base64Asset | null;
  story?: string;
  aspectRatio?: "16:9" | "9:16";
  frameCount?: number;
  continue?: boolean;
  existingStoryboard?: any;
  customInstruction?: string;
}

interface StoryWorld {
  premise: string;
  theme: string;
  structure: {
    act1: string;
    act2: string;
    act3: string;
    attractors: string[];
  };
  characterBlueprint: string;
  coreConflict: {
    internal: string;
    external: string;
  };
  boundaries: {
    spatial: string;
    temporal: string;
    historical: string;
    visual: string;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      console.error("GEMINI_API_KEY is missing");
      return new Response(
        JSON.stringify({
          success: false,
          error: "GEMINI_API_KEY not configured. Please add your Gemini API key to Supabase secrets using the Supabase dashboard.",
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const body: StoryboardRequest = await req.json();
    const {
      logoAsset,
      mainCharacterAsset,
      characterAsset,
      additionalCharacterAssets = [],
      backgroundAsset,
      artStyleAsset,
      story,
      aspectRatio = "16:9",
      frameCount = 4,
      continue: isContinue = false,
      existingStoryboard,
      customInstruction,
    } = body;

    if (!story && !isContinue) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Story description is required for storyboard generation.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (isContinue && !existingStoryboard) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Existing storyboard is required for continuation.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const mainCharacter = mainCharacterAsset || characterAsset || null;
    const sceneCount = [2, 4, 6, 8].includes(frameCount) ? frameCount / 2 : 2;

    console.log("Generating storyboard", {
      sceneCount,
      aspectRatio,
      isContinue,
      hasStory: !!story,
      hasMainCharacter: !!mainCharacter,
      hasBackground: !!backgroundAsset,
      hasArtStyle: !!artStyleAsset,
    });

    const ai = new GoogleGenAI({ apiKey });

    if (isContinue) {
      const lastScene = existingStoryboard.scenes[existingStoryboard.scenes.length - 1];
      const storyWorld = existingStoryboard.storyWorld || {
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

      const continuationPrompt = `You are a MASTER SCREENPLAY ARCHITECT. Generate ONE new scene continuing from:\n\nLAST SCENE: \"${lastScene.title}\" - ${lastScene.scriptLine}\n${customInstruction ? `\\n\\nCUSTOM INSTRUCTION: \"${customInstruction}\"` : ''}\n\nGenerate exactly ONE scene with 2 frames (A and B variants) that continues this narrative. The scene should match the visual style and maintain character consistency.\n\nRespond with JSON matching this structure:\n{\n  \"scenes\": [{\n    \"id\": ${existingStoryboard.scenes.length + 1},\n    \"title\": \"Scene Title\",\n    \"scriptLine\": \"Dialogue or narration\",\n    \"emotion\": \"Emotional tone\",\n    \"intent\": \"Character intent\",\n    \"frames\": [\n      { \"id\": \"${existingStoryboard.scenes.length + 1}A\", \"variant\": \"A\", \"imageUrl\": \"placeholder\", \"metadata\": {} },\n      { \"id\": \"${existingStoryboard.scenes.length + 1}B\", \"variant\": \"B\", \"imageUrl\": \"placeholder\", \"metadata\": {} }\n    ]\n  }]\n}`;

      const contResponse = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: continuationPrompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const responseText = contResponse.text || JSON.stringify(contResponse);
      const scriptData = JSON.parse(responseText);
      const newScenes = scriptData.scenes || [];

      return new Response(
        JSON.stringify({ success: true, data: { scenes: newScenes } }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const storyWorldPrompt = `Generate Story-World parameterization for: \"${story}\"\n\nProvide a JSON object with: premise, theme, structure (act1, act2, act3, attractors[]), characterBlueprint, coreConflict (internal, external), and boundaries (spatial, temporal, historical, visual).`;

    const storyWorldResponse = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: storyWorldPrompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const swText = storyWorldResponse.text || JSON.stringify(storyWorldResponse);
    const storyWorld = JSON.parse(swText) as StoryWorld;

    const scriptPrompt = `Generate EXACTLY ${sceneCount} scenes for storyboard.\n\nSTORY: \"${story}\"\nSTORY WORLD: ${JSON.stringify(storyWorld)}\n\nEach scene needs: id, title, scriptLine, emotion, intent, cinematographyFormat, subjectIdentity, sceneContext, action, cameraComposition, styleAmbiance, audioDialogue, technicalNegative, veoPrompt.\n\nRespond with JSON: { \"scenes\": [...] }`;

    const scriptResponse = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: scriptPrompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const scriptText = scriptResponse.text || JSON.stringify(scriptResponse);
    const scriptData = JSON.parse(scriptText);
    let scenes = scriptData.scenes || [];

    if (scenes.length > sceneCount) {
      scenes = scenes.slice(0, sceneCount);
    }

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const imageGenParts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

      if (artStyleAsset) {
        imageGenParts.push({
          text: `[ART STYLE REFERENCE] Match this art style exactly:`
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
          text: `[BACKGROUND REFERENCE] Use this environment:`
        });
        imageGenParts.push({
          inlineData: {
            mimeType: backgroundAsset.mimeType,
            data: backgroundAsset.data
          }
        });
      }

      if (mainCharacter) {
        imageGenParts.push({
          text: `[MAIN CHARACTER REFERENCE] This character MUST appear EXACTLY as shown:`
        });
        imageGenParts.push({
          inlineData: {
            mimeType: mainCharacter.mimeType,
            data: mainCharacter.data
          }
        });
      }

      additionalCharacterAssets.forEach((charAsset, idx) => {
        imageGenParts.push({
          text: `[CHARACTER ${idx + 2} REFERENCE]:`
        });
        imageGenParts.push({
          inlineData: {
            mimeType: charAsset.mimeType,
            data: charAsset.data
          }
        });
      });

      if (logoAsset) {
        imageGenParts.push({
          text: `[LOGO] Incorporate subtly:`
        });
        imageGenParts.push({
          inlineData: {
            mimeType: logoAsset.mimeType,
            data: logoAsset.data
          }
        });
      }

      imageGenParts.push({
        text: `Generate a professional cinematic ${aspectRatio} image for: \"${scene.scriptLine}\". ${scene.veoPrompt || scene.sceneContext || ''}

IMPORTANT: Create a CLEAN image with NO TEXT, NO SUBTITLES, NO CAPTIONS, NO WORDS, NO LETTERS in ANY language. The image must be completely free of any textual elements, titles, or written characters. Focus purely on visual storytelling without any on-screen text.`
      });

      const generateFrame = async (): Promise<string> => {
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

          const firstPart = imageResponse.candidates?.[0]?.content?.parts?.[0];
          if (firstPart && 'inlineData' in firstPart && firstPart.inlineData) {
            return `data:${firstPart.inlineData.mimeType};base64,${firstPart.inlineData.data}`;
          }
          throw new Error('No image data in response');
        } catch (error) {
          console.error(`Frame generation error for scene ${scene.id}:`, error);
          return "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0iIzMzMzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+RXJyb3I8L3RleHQ+PC9zdmc+";
        }
      };

      const [imageUrlA, imageUrlB] = await Promise.all([generateFrame(), generateFrame()]);

      scene.frames = [
        {
          id: `${scene.id}A`,
          variant: 'A',
          imageUrl: imageUrlA,
          metadata: {
            composition: `Professional ${scene.emotion || 'cinematic'} composition`,
            palette: ["#1a1a1a", "#f5f5f5", "#4a90e2"],
            lighting: `Cinematic lighting`,
            camera: scene.cameraComposition || "Professional cinematography",
          },
        },
        {
          id: `${scene.id}B`,
          variant: 'B',
          imageUrl: imageUrlB,
          metadata: {
            composition: `Professional ${scene.emotion || 'cinematic'} composition`,
            palette: ["#1a1a1a", "#f5f5f5", "#4a90e2"],
            lighting: `Cinematic lighting`,
            camera: scene.cameraComposition || "Professional cinematography",
          },
        },
      ];
    }

    const storyboard = {
      title: "Generated Storyboard",
      scenes,
      aspectRatio,
      storyWorld,
    };

    console.log(`Storyboard generation complete: ${scenes.length} scenes`);

    return new Response(
      JSON.stringify({ success: true, data: storyboard }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error("Error stack:", errorStack);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});