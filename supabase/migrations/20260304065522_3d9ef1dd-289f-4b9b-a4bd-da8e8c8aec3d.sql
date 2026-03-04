-- Remove public read access to ai_config, keep admin-only access
DROP POLICY IF EXISTS "Authenticated users can read ai_config" ON public.ai_config;