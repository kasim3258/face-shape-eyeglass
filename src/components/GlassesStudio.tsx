import { useState } from "react";
import { Image as ImageIcon, Video } from "lucide-react";
import { UploadAnalyzer } from "@/components/UploadAnalyzer";
import { LiveTryOn } from "@/components/LiveTryOn";
import { cn } from "@/lib/utils";
import { logActivity } from "@/lib/activity";

export function GlassesStudio() {
  const [tab, setTab] = useState<"upload" | "live">("upload");

  return (
    <section id="studio" className="mx-auto w-full max-w-6xl px-4 pb-24">
      <div className="mx-auto mb-8 flex w-fit gap-1 rounded-2xl border border-border bg-white/5 p-1">
        {([
          { id: "upload", label: "Upload photo", icon: ImageIcon },
          { id: "live", label: "Live camera", icon: Video },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => {
              setTab(id);
              void logActivity(`Button Click: ${label} Tab`);
            }}
            className={cn(
              "flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-colors",
              tab === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>

      {tab === "upload" ? <UploadAnalyzer /> : <LiveTryOn />}
    </section>
  );
}
