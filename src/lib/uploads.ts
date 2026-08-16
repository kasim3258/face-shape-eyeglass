import { supabase } from "@/integrations/supabase/client";

export type UploadedImage = {
  id: string;
  user_id: string;
  user_name: string | null;
  email: string | null;
  original_image_url: string | null;
  processed_image_url: string | null;
  uploaded_at: string;
  file_size: number | null;
  image_type: string | null;
  face_shape: string | null;
};

const BUCKET = "user-images";

function extFor(type: string | undefined) {
  if (!type) return "png";
  if (type.includes("jpeg") || type.includes("jpg")) return "jpg";
  if (type.includes("webp")) return "webp";
  return "png";
}

/** Uploads an original (and optional processed) image to private storage and records it. Never throws. */
export async function saveUploadedImage(params: {
  file: File;
  processed?: Blob | null;
  faceShape?: string | null;
}): Promise<UploadedImage | null> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) return null;

    const stamp = Date.now();
    const base = `${user.id}/${stamp}`;
    const ext = extFor(params.file.type);

    const originalPath = `${base}-original.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(originalPath, params.file, { contentType: params.file.type || "image/png", upsert: true });
    if (upErr) throw upErr;

    let processedPath: string | null = null;
    if (params.processed) {
      processedPath = `${base}-processed.png`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(processedPath, params.processed, { contentType: "image/png", upsert: true });
      if (error) processedPath = null;
    }

    const { data, error } = await supabase
      .from("uploaded_images")
      .insert({
        user_id: user.id,
        user_name: (user.user_metadata?.["full_name"] as string | undefined) ?? user.email ?? "",
        email: user.email ?? "",
        original_image_url: originalPath,
        processed_image_url: processedPath,
        file_size: params.file.size,
        image_type: params.file.type || `image/${ext}`,
        face_shape: params.faceShape ?? null,
      })
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return (data as UploadedImage | null) ?? null;
  } catch (error) {
    console.warn("image tracking failed", error);
    return null;
  }
}

/** Attaches a processed render to an existing upload row. Never throws. */
export async function attachProcessedImage(imageId: string, userId: string, processed: Blob, faceShape?: string) {
  try {
    const path = `${userId}/${imageId}-processed.png`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, processed, { contentType: "image/png", upsert: true });
    if (error) throw error;
    await supabase
      .from("uploaded_images")
      .update({ processed_image_url: path, face_shape: faceShape ?? null })
      .eq("id", imageId);
  } catch (error) {
    console.warn("processed image save failed", error);
  }
}

const urlCache = new Map<string, string>();

export async function signedImageUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const cached = urlCache.get(path);
  if (cached) return cached;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  if (!data?.signedUrl) return null;
  urlCache.set(path, data.signedUrl);
  return data.signedUrl;
}

export function formatBytes(bytes: number | null | undefined) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
