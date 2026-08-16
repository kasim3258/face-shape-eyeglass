import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageGallery } from "@/components/admin/ImageGallery";
import { fetchAdminOverview } from "@/lib/admin-data";

export const Route = createFileRoute("/_authenticated/admin/gallery")({
  head: () => ({
    meta: [
      { title: "Image gallery · Glasses AI Admin" },
      { name: "description", content: "Browse, filter and download every image uploaded across the Glasses AI platform." },
      { property: "og:title", content: "Image gallery · Glasses AI Admin" },
      { property: "og:description", content: "Every user upload with original and processed previews." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GalleryPage,
});

function GalleryPage() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-overview"], queryFn: fetchAdminOverview });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <Button asChild variant="ghost" size="sm" className="mb-4 rounded-xl">
        <Link to="/admin">
          <ArrowLeft className="size-4" /> Back to dashboard
        </Link>
      </Button>
      <h1 className="flex items-center gap-2 text-3xl font-extrabold tracking-tight">
        <Images className="size-7 text-primary" /> Image gallery
      </h1>
      <p className="mb-8 mt-1 text-sm text-muted-foreground">
        Every upload across the platform, with original and processed results.
      </p>
      <ImageGallery images={data?.images ?? []} loading={isLoading} />
    </main>
  );
}
