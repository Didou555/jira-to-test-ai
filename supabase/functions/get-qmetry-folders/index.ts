import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getSupabaseClient, getUserApiKeys } from "../_shared/supabase-helpers.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = getSupabaseClient(authHeader);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const apiKeys = await getUserApiKeys(supabase, user.id);
    if (!apiKeys.qmetry_api_token) {
      throw new Error("QMetry API token not configured. Go to Settings.");
    }

    const response = await fetch(
      "https://qtmcloud.qmetry.com/rest/api/latest/folders/test-case",
      {
        headers: {
          apiKey: apiKeys.qmetry_api_token,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`QMetry API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const folders = data.data || data.folders || data;

    return new Response(
      JSON.stringify({ folders: Array.isArray(folders) ? folders : [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("get-qmetry-folders error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
