const ALLOWED_ORIGINS = [
  "https://jira-to-test-ai.lovable.app",
  "https://id-preview--38d6b3aa-8ccb-4639-9984-97aa1f0f3e9d.lovable.app",
  "http://localhost:5173",
  "http://localhost:8080",
  ...(Deno.env.get("FRONTEND_URL") ? [Deno.env.get("FRONTEND_URL")!] : []),
];

const CORS_HEADERS_BASE = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

export function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && ALLOWED_ORIGINS.includes(origin);
  return {
    ...CORS_HEADERS_BASE,
    "Access-Control-Allow-Origin": isAllowed ? origin : ALLOWED_ORIGINS[0],
  };
}

// Backward-compatible static export (uses first allowed origin as default)
export const corsHeaders = {
  ...CORS_HEADERS_BASE,
  "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0],
};
