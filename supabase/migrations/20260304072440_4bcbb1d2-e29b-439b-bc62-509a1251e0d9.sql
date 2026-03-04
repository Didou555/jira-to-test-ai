-- Add explicit admin-only SELECT policy for ai_config
CREATE POLICY "Only admins can read ai_config"
ON public.ai_config
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
