import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getSupabaseClient } from "../_shared/supabase-helpers.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = getSupabaseClient(authHeader);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { testPlan } = await req.json();
    if (!testPlan) throw new Error("testPlan is required");

    // Parse markdown test plan to extract test case list
    const lines = testPlan.split("\n");
    const testCases: Array<{ id: string; title: string; priority: string }> = [];
    let caseCounter = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      // Match patterns like: TC-001, TC_001, |TC-001|, ## TC-001, - TC-001
      const tcMatch = trimmed.match(/(?:^|\||\s|#|-)\s*(TC[-_]?\d{1,4})\s*[:||\-]\s*(.+?)(?:\||\s*$)/i);
      if (tcMatch) {
        caseCounter++;
        const id = tcMatch[1].toUpperCase().replace("_", "-");
        let title = tcMatch[2].trim().replace(/\|/g, "").trim();
        
        // Try to detect priority
        let priority = "P2";
        if (/P0|critical|bloquant/i.test(trimmed)) priority = "P0";
        else if (/P1|high|haute/i.test(trimmed)) priority = "P1";
        else if (/P3|low|basse/i.test(trimmed)) priority = "P3";

        testCases.push({ id, title, priority });
      }
    }

    // Fallback: if no TC pattern found, try numbered list items
    if (testCases.length === 0) {
      for (const line of lines) {
        const trimmed = line.trim();
        const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
        if (numberedMatch) {
          caseCounter++;
          testCases.push({
            id: `TC-${String(caseCounter).padStart(3, "0")}`,
            title: numberedMatch[2].trim(),
            priority: "P2",
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ testCases, count: testCases.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("parse-test-cases error:", error);
    const status = error instanceof Error && error.message === "Unauthorized" ? 401 : 400;
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
