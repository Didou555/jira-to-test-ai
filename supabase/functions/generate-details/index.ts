import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getSupabaseClient, getUserApiKeys } from "../_shared/supabase-helpers.ts";
import { invokeBedrockModel } from "../_shared/aws-sig-v4.ts";

const BEDROCK_MODEL_ID = "anthropic.claude-sonnet-4-20250514-v1:0";

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

    const { selectedTestCases, storyContext } = await req.json();
    if (!selectedTestCases?.length) throw new Error("No test cases selected");

    const apiKeys = await getUserApiKeys(supabase, user.id);
    if (!apiKeys.aws_access_key_id || !apiKeys.aws_secret_access_key) {
      throw new Error("AWS credentials not configured. Go to Settings.");
    }

    const systemPrompt = `You are a senior QA engineer. Generate detailed test cases in QMetry-compatible format.
For each test case, return a JSON object with:
- testCaseId: string
- title: string
- objective: string
- preconditions: string
- priority: "P0" | "P1" | "P2" | "P3"
- testSteps: array of { stepNumber, action, expectedResult, testData }
- estimatedTime: string

Return ONLY a valid JSON array of test case objects. No markdown, no explanation.`;

    const userPrompt = `Generate detailed test cases for the following:

Story: ${storyContext.storyTitle} (${storyContext.storyId})

Test Cases to detail:
${selectedTestCases.map((tc: any) => `- ${tc.id}: ${tc.title} (Priority: ${tc.priority})`).join("\n")}

Return a JSON array with detailed test steps for each.`;

    const bedrockBody = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    };

    const response = await invokeBedrockModel({
      modelId: BEDROCK_MODEL_ID,
      body: bedrockBody,
      region: apiKeys.aws_region || "eu-west-1",
      accessKeyId: apiKeys.aws_access_key_id,
      secretAccessKey: apiKeys.aws_secret_access_key,
      sessionToken: apiKeys.aws_session_token || undefined,
    });

    const content = (response as any).content;
    const responseText = content?.map((c: any) => c.text).join("") || "[]";

    // Parse JSON from response (might be wrapped in markdown code block)
    let testCasesWithDetails;
    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      testCasesWithDetails = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      console.error("Failed to parse Bedrock response as JSON:", responseText);
      testCasesWithDetails = [];
    }

    return new Response(
      JSON.stringify({ testCasesWithDetails }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-details error:", error);
    const status = (error as Error).message?.includes("ExpiredToken") ? 401 : 500;
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
