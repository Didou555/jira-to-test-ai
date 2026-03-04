import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { encryptApiKeys, decryptApiKeys } from "../_shared/crypto.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // Service role client for admin operations
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (req.method === "GET") {
      // Get keys for a user (admin can specify userId query param)
      const url = new URL(req.url);
      let targetUserId = url.searchParams.get("userId") || user.id;

      // If requesting another user's keys, check admin
      if (targetUserId !== user.id) {
        const { data: isAdmin } = await serviceClient.rpc("has_role", {
          _user_id: user.id,
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

    if (req.method === "POST") {
      const body = await req.json();
      const targetUserId = body.user_id || user.id;

      // If saving for another user, check admin
      if (targetUserId !== user.id) {
        const { data: isAdmin } = await serviceClient.rpc("has_role", {
          _user_id: user.id,
          _role: "admin",
        });
        if (!isAdmin) throw new Error("Forbidden");
      }

      // Encrypt sensitive fields before saving
      const encrypted = await encryptApiKeys(body);

      const { error } = await serviceClient
        .from("user_api_keys")
        .upsert(encrypted, { onConflict: "user_id" });

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
