import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const FALLBACK_SUPABASE_PROJECT_ID = "uokiiigxdblvmhmxsdvw";
const FALLBACK_SUPABASE_URL = `https://${FALLBACK_SUPABASE_PROJECT_ID}.supabase.co`;
const FALLBACK_SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVva2lpaWd4ZGJsdm1obXhzZHZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0ODI0MDYsImV4cCI6MjA4ODA1ODQwNn0.8qn1RyhxRkAqRkAZRbRPLqsF1Vu853nmNuwT0ITOf4o";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const supabaseProjectId =
    env.VITE_SUPABASE_PROJECT_ID || FALLBACK_SUPABASE_PROJECT_ID;
  const supabaseUrl = env.VITE_SUPABASE_URL || `https://${supabaseProjectId}.supabase.co`;
  const supabasePublishableKey =
    env.VITE_SUPABASE_PUBLISHABLE_KEY || FALLBACK_SUPABASE_PUBLISHABLE_KEY;

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(supabasePublishableKey),
      "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(supabaseProjectId),
    },
  };
});
