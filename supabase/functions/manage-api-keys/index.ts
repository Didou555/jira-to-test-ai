import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { encryptApiKeys, decryptApiKeys } from "../_shared/crypto.ts";

async function getAuthenticatedUserId(authHeader: string): Promise<string> {
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  // Retry once to handle cold-start latency
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data: { user }, error } = await userClient.auth.getUser();
    if (user) return user.id;
    if (attempt === 0 && error) {
      await new Promise((r) => setTimeout(r, 500));
      continue;
    }
    throw new Error(error?.message || "Unauthorized");
  }
  throw new Error("Unauthorized");
}

serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    // Verify JWT signature via Supabase Auth server
    const userId = await getAuthenticatedUserId(authHeader);

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const action = body.action || "save";

    if (action === "read") {
      const targetUserId = body.userId || userId;

      if (targetUserId !== userId) {
        const { data: isAdmin } = await serviceClient.rpc("has_role", {
          _user_id: userId,
          _role: "admin",
        });
        if (!isAdmin) throw new Error("Forbidden");
      }

      const { data, error } = await serviceClient
        .from("user_api_keys")
        .select("*")
        .eq("user_id", targetUserId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const decrypted = await decryptApiKeys(data as Record<string, string | null>);
        return new Response(JSON.stringify(decrypted), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(null), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // action === "save"
    const targetUserId = body.user_id || userId;

    if (targetUserId !== userId) {
      const { data: isAdmin } = await serviceClient.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });
      if (!isAdmin) throw new Error("Forbidden");
    }

    const { action: _a, ...keysData } = body;
    const encrypted = await encryptApiKeys(keysData);

    const { error } = await serviceClient
      .from("user_api_keys")
      .upsert(encrypted, { onConflict: "user_id" });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("manage-api-keys error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
