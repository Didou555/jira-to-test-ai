import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getSupabaseClient, getUserApiKeys } from "../_shared/supabase-helpers.ts";

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

    const { testCasesWithDetails, selectedFolderId } = await req.json();
    if (!testCasesWithDetails?.length) throw new Error("No test cases to export");
    if (!selectedFolderId) throw new Error("No folder selected");

    const apiKeys = await getUserApiKeys(supabase, user.id);
    if (!apiKeys.qmetry_api_token) {
      throw new Error("QMetry API token not configured. Go to Settings.");
    }

    const results: Array<{ testCaseId: string; success: boolean; error?: string }> = [];

    for (const tc of testCasesWithDetails) {
      try {
        // Build QMetry test case payload
        const qmetryPayload = {
          name: tc.title || tc.testCaseId,
          description: tc.objective || "",
          precondition: tc.preconditions || "",
          priority: { name: tc.priority === "P0" ? "Critical" : tc.priority === "P1" ? "High" : tc.priority === "P3" ? "Low" : "Medium" },
          folder: { id: selectedFolderId },
          testScript: {
            testSteps: (tc.testSteps || []).map((step: any, idx: number) => ({
              stepNumber: step.stepNumber || idx + 1,
              description: step.action || step.description || "",
              expectedResult: step.expectedResult || "",
              testData: step.testData || "",
            })),
          },
        };

        const response = await fetch(
          "https://qtmcloud.qmetry.com/rest/api/latest/test-cases",
          {
            method: "POST",
            headers: {
              apiKey: apiKeys.qmetry_api_token,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(qmetryPayload),
          }
        );

        if (!response.ok) {
          const errText = await response.text();
          results.push({ testCaseId: tc.testCaseId || tc.id, success: false, error: errText });
        } else {
          results.push({ testCaseId: tc.testCaseId || tc.id, success: true });
        }
      } catch (err) {
        results.push({
          testCaseId: tc.testCaseId || tc.id,
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    return new Response(
      JSON.stringify({ results, successCount, totalCount: testCasesWithDetails.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("export-to-qmetry error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
