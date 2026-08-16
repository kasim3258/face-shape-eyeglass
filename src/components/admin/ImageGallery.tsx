import { useEffect, useMemo, useState } from "react";
import { Download, ImageOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBytes, signedImageUrl, type UploadedImage } from "@/lib/uploads";

type Resolved = UploadedImage & { originalUrl: string | null; processedUrl: string | null };

export function ImageGallery({
  images,
  loading,
  showUserFilter = true,
}: {
  images: UploadedImage[];
  loading?: boolean;
  showUserFilter?: boolean;
}) {
  const [resolved, setResolved] = useState<Resolved[]>([]);
  const [user, setUser] = useState("all");
  const [type, setType] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [active, setActive] = useState<Resolved | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const out = await Promise.all(
        images.slice(0, 200).map(async (img) => ({
          ...img,
          originalUrl: await signedImageUrl(img.original_image_url),
          processedUrl: await signedImageUrl(img.processed_image_url),
        })),
      );
      if (!cancelled) setResolved(out);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [images]);

  const users = useMemo(
    () => Array.from(new Set(images.map((i) => i.email ?? "").filter(Boolean))).sort(),
    [images],
  );
  const types = useMemo(
    () => Array.from(new Set(images.map((i) => i.image_type ?? "").filter(Boolean))).sort(),
    [images],
  );

  const filtered = resolved.filter((img) => {
    if (user !== "all" && img.email !== user) return false;
    if (type !== "all" && img.image_type !== type) return false;
    const t = new Date(img.uploaded_at).getTime();
    if (from && t < new Date(from).getTime()) return false;
    if (to && t > new Date(to).getTime() + 86400000) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-3xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        {showUserFilter && (
          <Select value={user} onValueChange={setUser}>
            <SelectTrigger className="h-10 w-56 rounded-xl">
              <SelectValue placeholder="All users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All users</SelectItem>
              {users.map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="h-10 w-40 rounded-xl">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {types.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground" htmlFor="from">From</label>
          <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 rounded-xl" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground" htmlFor="to">To</label>
          <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 rounded-xl" />
        </div>
        <p className="ml-auto text-sm text-muted-foreground">{filtered.length} images</p>
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card flex flex-col items-center gap-2 p-12 text-center text-sm text-muted-foreground">
          <ImageOff className="size-8" />
          No images match these filters yet.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(img)}
              style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
              className="glass-card group overflow-hidden p-0 text-left duration-500 animate-in fade-in slide-in-from-bottom-2 hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="aspect-square w-full overflow-hidden bg-black/30">
                {img.processedUrl || img.originalUrl ? (
                  <img
                    src={(img.processedUrl ?? img.originalUrl)!}
                    alt={`Upload by ${img.user_name ?? img.email ?? "user"}`}
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                    Preview unavailable
                  </div>
                )}
              </div>
              <div className="space-y-1 p-3">
                <p className="truncate text-sm font-medium">{img.user_name || img.email}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(img.uploaded_at).toLocaleString()} · {formatBytes(img.file_size)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm duration-200 animate-in fade-in"
          onClick={() => setActive(null)}
        >
          <div
            className="glass-card max-h-[90vh] w-full max-w-4xl overflow-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start gap-3">
              <div>
                <h3 className="text-lg font-semibold">{active.user_name || active.email}</h3>
                <p className="text-xs text-muted-foreground">
                  {new Date(active.uploaded_at).toLocaleString()} · {active.image_type ?? "image"} ·{" "}
                  {formatBytes(active.file_size)}
                  {active.face_shape ? ` · ${active.face_shape}` : ""}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="ml-auto rounded-xl" onClick={() => setActive(null)}>
                <X className="size-4" />
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {([
                ["Original", active.originalUrl],
                ["Processed", active.processedUrl],
              ] as const).map(([label, url]) => (
                <div key={label} className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                  {url ? (
                    <>
                      <img src={url} alt={`${label} upload`} className="w-full rounded-2xl border border-border" />
                      <Button asChild variant="outline" size="sm" className="rounded-xl">
                        <a href={url} download target="_blank" rel="noreferrer">
                          <Download className="size-4" /> Download
                        </a>
                      </Button>
                    </>
                  ) : (
                    <div className="flex h-40 items-center justify-center rounded-2xl border border-border text-xs text-muted-foreground">
                      Not available
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
