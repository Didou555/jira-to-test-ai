import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getSupabaseClient, getUserApiKeys } from "../_shared/supabase-helpers.ts";

/**
 * Parse a Figma URL and extract file_key and node IDs.
 * Supports formats like:
 *   https://www.figma.com/design/FILE_KEY/Name?node-id=1-92&focus-id=8-995
 *   https://www.figma.com/file/FILE_KEY/Name?node-id=1-92
 */
function parseFigmaUrl(url: string): { fileKey: string; nodeIds: string[] } | null {
  try {
    const parsed = new URL(url);
    // Extract file key from path: /design/FILE_KEY/... or /file/FILE_KEY/...
    const pathMatch = parsed.pathname.match(/\/(design|file|proto)\/([a-zA-Z0-9]+)/);
    if (!pathMatch) return null;

    const fileKey = pathMatch[2];
    const nodeIds: string[] = [];

    // Extract node-id (convert from URL format 1-92 to API format 1:92)
    const nodeId = parsed.searchParams.get("node-id");
    if (nodeId) {
      nodeIds.push(nodeId.replace(/-/g, ":"));
    }

    // Extract focus-id if present
    const focusId = parsed.searchParams.get("focus-id");
    if (focusId) {
      nodeIds.push(focusId.replace(/-/g, ":"));
    }

    return { fileKey, nodeIds: nodeIds.length > 0 ? nodeIds : [] };
  } catch {
    return null;
  }
}

serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = getSupabaseClient(authHeader);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { figmaLinks } = await req.json();
    if (!figmaLinks?.length) {
      return new Response(JSON.stringify({ images: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKeys = await getUserApiKeys(supabase, user.id);
    if (!apiKeys.figma_access_token) {
      console.log("No Figma token configured, skipping image fetch");
      return new Response(JSON.stringify({ images: [], skipped: true, reason: "no_token" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const figmaToken = apiKeys.figma_access_token;
    const images: Array<{ url: string; nodeId: string; base64: string; mimeType: string }> = [];

    for (const link of figmaLinks) {
      const parsed = parseFigmaUrl(link);
      if (!parsed || parsed.nodeIds.length === 0) {
        console.log(`Skipping unparseable Figma link: ${link}`);
        continue;
      }

      // Call Figma Images API - returns URLs of rendered PNGs
      const idsParam = parsed.nodeIds.join(",");
      const figmaApiUrl = `https://api.figma.com/v1/images/${parsed.fileKey}?ids=${encodeURIComponent(idsParam)}&format=png&scale=2`;

      const figmaResp = await fetch(figmaApiUrl, {
        headers: {
          "X-Figma-Token": figmaToken,
        },
      });

      if (!figmaResp.ok) {
        const errText = await figmaResp.text();
        console.error(`Figma API error for ${parsed.fileKey}: ${figmaResp.status} ${errText}`);
        continue;
      }

      const figmaData = await figmaResp.json();
      const imageUrls = figmaData.images || {};

      // Download each image and convert to base64
      for (const [nodeId, imageUrl] of Object.entries(imageUrls)) {
        if (!imageUrl) continue;

        try {
          const imgResp = await fetch(imageUrl as string);
          if (!imgResp.ok) continue;

          const imgBuffer = await imgResp.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(imgBuffer)));

          images.push({
            url: link,
            nodeId,
            base64,
            mimeType: "image/png",
          });
        } catch (err) {
          console.error(`Failed to download Figma image for node ${nodeId}:`, err);
        }
      }
    }

    return new Response(JSON.stringify({ images }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("fetch-figma-images error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
