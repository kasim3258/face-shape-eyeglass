CREATE TABLE public.uploaded_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  original_image_url TEXT,
  processed_image_url TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  file_size BIGINT,
  image_type TEXT,
  face_shape TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.uploaded_images TO authenticated;
GRANT ALL ON public.uploaded_images TO service_role;

ALTER TABLE public.uploaded_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own images" ON public.uploaded_images
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all images" ON public.uploaded_images
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own images" ON public.uploaded_images
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own images" ON public.uploaded_images
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER uploaded_images_updated_at BEFORE UPDATE ON public.uploaded_images
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_uploaded_images_user ON public.uploaded_images (user_id, uploaded_at DESC);

CREATE POLICY "Users upload own folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'user-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users read own images" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'user-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins read all user images" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'user-images' AND public.has_role(auth.uid(), 'admin'));