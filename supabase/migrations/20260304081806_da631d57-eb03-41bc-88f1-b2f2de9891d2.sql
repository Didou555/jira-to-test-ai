
-- Fix ai_config: drop restrictive policies, recreate as permissive
DROP POLICY IF EXISTS "Admins can manage ai_config" ON public.ai_config;
DROP POLICY IF EXISTS "Only admins can read ai_config" ON public.ai_config;

CREATE POLICY "Admins can manage ai_config"
ON public.ai_config FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix profiles: drop restrictive, recreate as permissive
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix user_api_keys: drop restrictive, recreate as permissive
DROP POLICY IF EXISTS "Admins can insert api keys for users" ON public.user_api_keys;
DROP POLICY IF EXISTS "Admins can update all api keys" ON public.user_api_keys;
DROP POLICY IF EXISTS "Admins can view all api keys" ON public.user_api_keys;
DROP POLICY IF EXISTS "Users can delete own api keys" ON public.user_api_keys;
DROP POLICY IF EXISTS "Users can insert own api keys" ON public.user_api_keys;
DROP POLICY IF EXISTS "Users can update own api keys" ON public.user_api_keys;
DROP POLICY IF EXISTS "Users can view own api keys" ON public.user_api_keys;

CREATE POLICY "Users can view own api keys"
ON public.user_api_keys FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all api keys"
ON public.user_api_keys FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert own api keys"
ON public.user_api_keys FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can insert api keys for users"
ON public.user_api_keys FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update own api keys"
ON public.user_api_keys FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can update all api keys"
ON public.user_api_keys FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete own api keys"
ON public.user_api_keys FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Fix user_roles: drop restrictive, recreate as permissive
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);
