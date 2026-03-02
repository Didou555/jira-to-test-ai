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

    const { parentIssueKey, projectKey, storyTitle, testPlan, testPlanId, action, subtaskKey } = await req.json();

    const apiKeys = await getUserApiKeys(supabase, user.id);
    if (!apiKeys.jira_base_url || !apiKeys.jira_email || !apiKeys.jira_api_token) {
      throw new Error("Jira credentials not configured. Go to Settings.");
    }

    const jiraBaseUrl = apiKeys.jira_base_url.replace(/\/$/, "");
    const jiraAuth = btoa(`${apiKeys.jira_email}:${apiKeys.jira_api_token}`);

    if (action === "update" && subtaskKey) {
      // Update existing subtask
      const updateResponse = await fetch(
        `https://${jiraBaseUrl}/rest/api/3/issue/${subtaskKey}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Basic ${jiraAuth}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fields: {
              description: {
                type: "doc",
                version: 1,
                content: [
                  {
                    type: "codeBlock",
                    attrs: { language: "markdown" },
                    content: [{ type: "text", text: testPlan }],
                  },
                ],
              },
            },
          }),
        }
      );

      if (!updateResponse.ok) {
        const errText = await updateResponse.text();
        throw new Error(`Jira update error (${updateResponse.status}): ${errText}`);
      }

      return new Response(
        JSON.stringify({ success: true, subtaskKey, action: "updated" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create new subtask
    const createResponse = await fetch(
      `https://${jiraBaseUrl}/rest/api/3/issue`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${jiraAuth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fields: {
            project: { key: projectKey },
            parent: { key: parentIssueKey },
            summary: `[QA] Test Plan - ${storyTitle}`,
            issuetype: { name: "Sub-task" },
            description: {
              type: "doc",
              version: 1,
              content: [
                {
                  type: "codeBlock",
                  attrs: { language: "markdown" },
                  content: [{ type: "text", text: testPlan }],
                },
              ],
            },
          },
        }),
      }
    );

    if (!createResponse.ok) {
      const errText = await createResponse.text();
      throw new Error(`Jira create error (${createResponse.status}): ${errText}`);
    }

    const created = await createResponse.json();
    const newKey = created.key;
    const subtaskUrl = `https://${jiraBaseUrl}/browse/${newKey}`;

    return new Response(
      JSON.stringify({ success: true, subtaskKey: newKey, subtaskUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("approve-testplan error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
