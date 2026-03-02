
-- AI configuration table (admin-managed)
CREATE TABLE public.ai_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_prompt text NOT NULL DEFAULT 'You are a senior QA engineer. Generate comprehensive test plans in markdown format based on Jira story details. Include test case IDs, titles, priorities, preconditions, steps, and expected results.',
  model_id text NOT NULL DEFAULT 'anthropic.claude-sonnet-4-20250514-v1:0',
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.ai_config ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read AI config
CREATE POLICY "Authenticated users can read ai_config"
ON public.ai_config FOR SELECT TO authenticated USING (true);

-- Only admins can modify AI config
CREATE POLICY "Admins can manage ai_config"
ON public.ai_config FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Insert default config row
INSERT INTO public.ai_config (system_prompt, model_id) VALUES (
  'You are a senior QA engineer. Generate comprehensive test plans in markdown format based on Jira story details. Include test case IDs, titles, priorities, preconditions, steps, and expected results.',
  'anthropic.claude-sonnet-4-20250514-v1:0'
);

-- Admin policies on user_api_keys (admins can view/manage all users' keys)
CREATE POLICY "Admins can view all api keys"
ON public.user_api_keys FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert api keys for users"
ON public.user_api_keys FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all api keys"
ON public.user_api_keys FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admin policy on profiles (admins can update all profiles)
CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
