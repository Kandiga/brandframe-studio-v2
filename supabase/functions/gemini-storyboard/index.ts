import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { GoogleGenAI, Type } from "npm:@google/genai@1.29.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface StoryboardRequest {
  logoAsset?: { mimeType: string; data: string } | null;
  mainCharacterAsset?: { mimeType: string; data: string } | null;
  characterAsset?: { mimeType: string; data: string } | null;
  additionalCharacterAssets?: { mimeType: string; data: string }[];
  backgroundAsset?: { mimeType: string; data: string } | null;
  artStyleAsset?: { mimeType: string; data: string } | null;
  story: string;
  aspectRatio?: "16:9" | "9:16";
  frameCount?: number;
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
          error: "GEMINI_API_KEY not configured. Please add your Gemini API key to Supabase secrets.",
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
    } = body;

    const mainCharacter = mainCharacterAsset || characterAsset || null;
    const sceneCount = [2, 4, 6, 8].includes(frameCount) ? frameCount / 2 : 2;

    console.log("Generating storyboard", { sceneCount, aspectRatio });

    const ai = new GoogleGenAI({ apiKey });
    
    // Simple storyboard generation - placeholder for complex logic
    const scenes = [];
    for (let i = 0; i < sceneCount; i++) {
      scenes.push({
        sceneNumber: i + 1,
        description: `Scene ${i + 1} for: ${story.substring(0, 50)}...`,
        frames: [
          {
            frameNumber: 1,
            description: `Frame 1 of scene ${i + 1}`,
            imageUrl: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0iIzMzMzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+R2VuZXJhdGluZy4uLjwvdGV4dD48L3N2Zz4=",
            voiceoverText: `Voiceover for scene ${i + 1}, frame 1`,
          },
          {
            frameNumber: 2,
            description: `Frame 2 of scene ${i + 1}`,
            imageUrl: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0iIzQ0NDQ0NCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+R2VuZXJhdGluZy4uLjwvdGV4dD48L3N2Zz4=",
            voiceoverText: `Voiceover for scene ${i + 1}, frame 2`,
          },
        ],
      });
    }

    const storyboard = {
      title: "Generated Storyboard",
      scenes,
      aspectRatio,
    };

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
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
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