import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Use service role to create admin user
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { email, password, displayName } = await req.json();
    const finalPassword = password || "abc123";
    if (!email) throw new Error("email is required");

    // Check if any admin exists
    const { data: existingAdmins } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("role", "admin")
      .limit(1);
    
    const isBootstrap = !existingAdmins || existingAdmins.length === 0;

    if (!isBootstrap) {
      // Require caller to be admin
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) throw new Error("Authorization required");
      const callerClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user: caller } } = await callerClient.auth.getUser();
      if (!caller) throw new Error("Unauthorized");
      const { data: roleData } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", caller.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!roleData) throw new Error("Only admins can create users");
    }

    // Create user with auto-confirm
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName || email.split("@")[0] },
    });

    if (createError) throw createError;

    // If bootstrap, assign admin role
    if (isBootstrap) {
      await supabaseAdmin.from("user_roles").update({ role: "admin" }).eq("user_id", newUser.user.id);
    }

    return new Response(JSON.stringify({ userId: newUser.user.id, email, isAdmin: isBootstrap }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("create-admin error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
