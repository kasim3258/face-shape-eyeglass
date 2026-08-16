CREATE POLICY "Admins manage roles insert" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles delete" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
GRANT INSERT, DELETE ON public.user_roles TO authenticated;

CREATE POLICY "Admins delete logs" ON public.user_activity_logs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
GRANT DELETE ON public.user_activity_logs TO authenticated;

CREATE POLICY "Admins delete images" ON public.uploaded_images FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
GRANT DELETE ON public.uploaded_images TO authenticated;