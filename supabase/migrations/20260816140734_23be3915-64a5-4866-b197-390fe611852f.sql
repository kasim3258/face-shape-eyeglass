CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND _user_id = auth.uid()
  );
$function$;

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

DROP POLICY IF EXISTS "Users update own images objects" ON storage.objects;
CREATE POLICY "Users update own images objects"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'user-images' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'user-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users delete own images objects" ON storage.objects;
CREATE POLICY "Users delete own images objects"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'user-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Admins delete images objects" ON storage.objects;
CREATE POLICY "Admins delete images objects"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'user-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));