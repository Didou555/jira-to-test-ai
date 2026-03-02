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

    const { jiraUrl } = await req.json();
    if (!jiraUrl) throw new Error("jiraUrl is required");

    const apiKeys = await getUserApiKeys(supabase, user.id);
    if (!apiKeys.jira_base_url || !apiKeys.jira_email || !apiKeys.jira_api_token) {
      throw new Error("Jira credentials not configured. Go to Settings.");
    }

    // Extract issue key from URL
    const issueKey = jiraUrl.split("/browse/").pop()?.split("?")[0];
    if (!issueKey) throw new Error("Invalid Jira URL format");

    const jiraBaseUrl = apiKeys.jira_base_url.replace(/\/$/, "");
    const jiraAuth = btoa(`${apiKeys.jira_email}:${apiKeys.jira_api_token}`);

    // Fetch issue details
    const issueResponse = await fetch(
      `https://${jiraBaseUrl}/rest/api/3/issue/${issueKey}?expand=renderedFields`,
      {
        headers: {
          Authorization: `Basic ${jiraAuth}`,
          Accept: "application/json",
        },
      }
    );

    if (!issueResponse.ok) {
      const errText = await issueResponse.text();
      throw new Error(`Jira API error (${issueResponse.status}): ${errText}`);
    }

    const issue = await issueResponse.json();

    // Fetch comments
    const commentsResponse = await fetch(
      `https://${jiraBaseUrl}/rest/api/3/issue/${issueKey}/comment`,
      {
        headers: {
          Authorization: `Basic ${jiraAuth}`,
          Accept: "application/json",
        },
      }
    );

    const commentsData = commentsResponse.ok ? await commentsResponse.json() : { comments: [] };

    // Extract attachments and Figma links
    const attachments = issue.fields.attachment || [];
    const figmaLinks: string[] = [];
    const imageAttachments: string[] = [];

    // Look for Figma links in description
    const descriptionStr = JSON.stringify(issue.fields.description || {});
    const figmaMatches = descriptionStr.match(/https:\/\/[w.]*figma\.com\/[^\s"\\)]+/g);
    if (figmaMatches) figmaLinks.push(...figmaMatches);

    // Look for Figma links in comments
    for (const comment of commentsData.comments || []) {
      const commentStr = JSON.stringify(comment.body || {});
      const commentFigmaMatches = commentStr.match(/https:\/\/[w.]*figma\.com\/[^\s"\\)]+/g);
      if (commentFigmaMatches) figmaLinks.push(...commentFigmaMatches);
    }

    // Collect image attachment URLs
    for (const att of attachments) {
      if (att.mimeType?.startsWith("image/")) {
        imageAttachments.push(att.content);
      }
    }

    // Check for existing QA subtask
    let existingSubtask = null;
    const subtasks = issue.fields.subtasks || [];
    for (const sub of subtasks) {
      if (sub.fields?.summary?.includes("[QA]") || sub.fields?.issuetype?.name === "Sub-task") {
        // Check if it's a QA test plan subtask
        const subDetail = await fetch(
          `https://${jiraBaseUrl}/rest/api/3/issue/${sub.key}`,
          {
            headers: {
              Authorization: `Basic ${jiraAuth}`,
              Accept: "application/json",
            },
          }
        );
        if (subDetail.ok) {
          const subData = await subDetail.json();
          if (subData.fields?.summary?.toLowerCase().includes("test plan") ||
              subData.fields?.summary?.toLowerCase().includes("qa")) {
            existingSubtask = {
              key: sub.key,
              summary: subData.fields.summary,
              description: subData.fields.description,
            };
            break;
          }
        }
      }
    }

    const result = {
      storyId: issueKey,
      storyTitle: issue.fields.summary,
      projectKey: issue.fields.project?.key,
      description: issue.fields.description,
      renderedDescription: issue.renderedFields?.description,
      comments: commentsData.comments?.map((c: any) => ({
        author: c.author?.displayName,
        body: c.body,
        created: c.created,
      })) || [],
      figmaLinks: [...new Set(figmaLinks)],
      imageAttachments,
      attachmentCount: attachments.length,
      existingSubtask,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("read-jira-story error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
