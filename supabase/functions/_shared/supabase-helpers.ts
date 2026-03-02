import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export function getSupabaseClient(authHeader: string) {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: { headers: { Authorization: authHeader } },
    }
  );
}

export async function getUserApiKeys(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await supabase
    .from("user_api_keys")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    throw new Error("API keys not configured. Please go to Settings to add your credentials.");
  }

  return data;
}
