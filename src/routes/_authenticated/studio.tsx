import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { Sparkles, ScanFace, Glasses, ShieldCheck } from "lucide-react";
import { GlassesStudio } from "@/components/GlassesStudio";

export const Route = createFileRoute("/_authenticated/studio")({
  head: () => ({
    meta: [
      { title: "Studio · Glasses AI — Find Your Perfect Frame by Face Shape" },
      {
        name: "description",
        content:
          "Detect your face shape from a photo or live camera and instantly see the eyeglass frames that suit you best.",
      },
      { property: "og:title", content: "Studio · Glasses AI" },
      { property: "og:description", content: "AI face shape analysis with real-time virtual glasses try-on." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Studio,
});

function Studio() {
  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="animate-float-slow absolute -right-40 -top-40 size-[32rem] rounded-full bg-primary/15 blur-3xl" />
        <div className="animate-float-slow absolute -bottom-52 -left-40 size-[36rem] rounded-full bg-accent/10 blur-3xl" />
      </div>

      <header className="mx-auto w-full max-w-6xl px-4 pt-16 pb-12 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-white/5 px-4 py-1.5 text-xs font-medium tracking-wide text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" /> On-device face analysis · nothing leaves your browser
        </span>
        <h1 className="mt-6 text-5xl font-extrabold tracking-tight sm:text-7xl">
          <span className="text-gradient">GLASSES AI</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-balance text-base text-muted-foreground sm:text-lg">
          Discover your face shape and the eyewear that fits it — from a photo or live on camera.
        </p>

        <ul className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-3">
          {[
            { icon: ScanFace, title: "Face shape ID", text: "468-point facial mesh geometry" },
            { icon: Glasses, title: "Virtual try-on", text: "Frames aligned to your eyes" },
            { icon: ShieldCheck, title: "Fully private", text: "No uploads, no servers" },
          ].map(({ icon: Icon, title, text }) => (
            <li key={title} className="glass-card p-4 text-left">
              <Icon className="size-5 text-primary" />
              <p className="mt-2 text-sm font-semibold">{title}</p>
              <p className="text-xs text-muted-foreground">{text}</p>
            </li>
          ))}
        </ul>
      </header>

      <ClientOnly
        fallback={
          <div className="mx-auto max-w-6xl px-4 pb-24 text-center text-sm text-muted-foreground">
            Loading the try-on studio…
          </div>
        }
      >
        <GlassesStudio />
      </ClientOnly>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        Glasses AI · face shape analysis and frame recommendations
      </footer>
    </main>
  );
}
