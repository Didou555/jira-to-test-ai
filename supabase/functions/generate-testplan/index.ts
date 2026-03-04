import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getSupabaseClient, getUserApiKeys } from "../_shared/supabase-helpers.ts";
import { invokeBedrockModel } from "../_shared/aws-sig-v4.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const { storyContext, systemPrompt, updateMode, existingTestPlan, feedback } = await req.json();
    if (!storyContext) throw new Error("storyContext is required");

    const apiKeys = await getUserApiKeys(supabase, user.id);
    if (!apiKeys.aws_access_key_id || !apiKeys.aws_secret_access_key) {
      throw new Error("AWS credentials not configured. Go to Settings.");
    }

    // Load AI config from database
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: aiConfig } = await adminClient.from("ai_config").select("*").limit(1).maybeSingle();

    const BEDROCK_MODEL_ID = aiConfig?.model_id || "anthropic.claude-sonnet-4-20250514-v1:0";
    const defaultSystemPrompt = aiConfig?.system_prompt || `You are a senior QA engineer. Generate comprehensive test plans in markdown format based on Jira story details. Include test case IDs, titles, priorities, preconditions, steps, and expected results.`;

    const userPromptParts: string[] = [];
    
    userPromptParts.push(`## Story: ${storyContext.storyTitle} (${storyContext.storyId})`);
    
    if (storyContext.renderedDescription) {
      userPromptParts.push(`## Description\n${storyContext.renderedDescription}`);
    } else if (storyContext.description) {
      userPromptParts.push(`## Description\n${JSON.stringify(storyContext.description)}`);
    }

    if (storyContext.comments?.length > 0) {
      userPromptParts.push(`## Comments\n${storyContext.comments.map((c: any) => `- ${c.author}: ${JSON.stringify(c.body)}`).join("\n")}`);
    }

    if (storyContext.figmaLinks?.length > 0) {
      userPromptParts.push(`## Figma Links\n${storyContext.figmaLinks.join("\n")}`);
    }

    if (updateMode && existingTestPlan) {
      userPromptParts.push(`## Existing Test Plan (to update)\n${existingTestPlan}`);
    }

    if (feedback) {
      userPromptParts.push(`## User Feedback for Correction\n${feedback}`);
    }

    const bedrockBody = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 8192,
      system: systemPrompt || defaultSystemPrompt,
      messages: [
        {
          role: "user",
          content: userPromptParts.join("\n\n"),
        },
      ],
    };

    const response = await invokeBedrockModel({
      modelId: BEDROCK_MODEL_ID,
      body: bedrockBody,
      region: apiKeys.aws_region || "eu-west-1",
      accessKeyId: apiKeys.aws_access_key_id,
      secretAccessKey: apiKeys.aws_secret_access_key,
      sessionToken: apiKeys.aws_session_token || undefined,
    });

    // Parse Bedrock response (Anthropic format)
    const content = (response as any).content;
    const testPlanText = content?.map((c: any) => c.text).join("") || "";

    const result = {
      testPlan: testPlanText,
      testPlanId: crypto.randomUUID(),
      storyId: storyContext.storyId,
      storyTitle: storyContext.storyTitle,
      projectKey: storyContext.projectKey,
      agentAnalysis: {
        criticalityLevel: "MEDIUM",
        securityRequired: false,
        performanceRequired: false,
        minTestCases: 5,
      },
      testCaseMetrics: {
        generated: 0,
        properlyFormatted: 0,
        target: 10,
        minimum: 5,
        percentageOfTarget: 0,
      },
      qualityMetrics: {
        score: 0,
        maxScore: 100,
        breakdown: { structure: 0, format: 0, quantity: 0, special: 0, quality: 0 },
        iterations: 1,
      },
      agentReasoning: [
        { thought: "Analyzing story context", decision: "Generate comprehensive test plan", impact: "Full coverage" },
      ],
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-testplan error:", error);
    const status = (error as Error).message?.includes("ExpiredToken") ? 401 : 500;
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
