import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, Upload, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getImageLandmarker } from "@/lib/faceLandmarker";
import { analyzeLandmarks, drawGlasses, GLASSES_URL, type FaceAnalysis } from "@/lib/faceShape";
import { ResultPanel } from "@/components/ResultPanel";
import { logActivity } from "@/lib/activity";

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = src;
  });
}

export function UploadAnalyzer() {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FaceAnalysis | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (fileUrl) URL.revokeObjectURL(fileUrl); }, [fileUrl]);

  const pick = (file?: File | null) => {
    if (!file) return;
    setResult(null);
    setError(null);
    void logActivity("Image Upload", { metadata: { name: file.name, size: file.size } });
    setFileUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

  const analyze = useCallback(async () => {
    if (!fileUrl) return;
    setBusy(true);
    setError(null);
    void logActivity("Button Click: Analyze Photo");
    try {
      const [img, landmarker] = await Promise.all([loadImage(fileUrl), getImageLandmarker()]);
      const res = landmarker.detect(img);
      const lm = res.faceLandmarks?.[0];
      if (!lm) {
        setResult(null);
        setError("No face detected. Try a clear, front-facing photo with good lighting.");
        void logActivity("Error: No Face Detected");
        return;
      }
      const analysis = analyzeLandmarks(lm);
      setResult(analysis);
      void logActivity("Prediction Generated", {
        metadata: { source: "upload", shape: analysis.shape, confidence: analysis.confidence },
      });

      const canvas = canvasRef.current;
      if (canvas) {
        const maxW = 720;
        const scale = Math.min(1, maxW / img.naturalWidth);
        const w = Math.round(img.naturalWidth * scale);
        const h = Math.round(img.naturalHeight * scale);
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        if (analysis.confidence >= 40) {
          const glasses = await loadImage(GLASSES_URL[analysis.shape]);
          drawGlasses(ctx, glasses, lm, w, h);
        }
      }
    } catch (e) {
      console.error(e);
      setError("Analysis failed. Please try again.");
      void logActivity("Error: Analysis Failed");
    } finally {
      setBusy(false);
    }
  }, [fileUrl]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="glass-card p-6">
        <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold">
          <Upload className="size-5 text-primary" /> Upload a photo
        </h2>

        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0]); }}
          className="cursor-pointer rounded-2xl border-2 border-dashed border-border bg-white/5 p-8 text-center transition-colors hover:border-primary/60 hover:bg-primary/5"
        >
          <Upload className="mx-auto size-8 text-primary" />
          <p className="mt-3 text-sm font-medium">Drop a face photo or click to browse</p>
          <p className="mt-1 text-xs text-muted-foreground">JPG or PNG, front-facing works best</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0])}
          />
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-black/30">
          {fileUrl ? (
            <>
              <canvas ref={canvasRef} className={result ? "w-full" : "hidden"} />
              {!result && <img src={fileUrl} alt="Uploaded face preview" className="w-full" />}
            </>
          ) : (
            <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">
              Your preview appears here
            </div>
          )}
        </div>

        <div className="mt-5 flex gap-3">
          <Button onClick={analyze} disabled={!fileUrl || busy} className="btn-hero h-12 flex-1 rounded-xl text-sm font-semibold hover:brightness-110">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {busy ? "Analyzing…" : "Analyze & find matches"}
          </Button>
          {fileUrl && (
            <Button variant="outline" className="h-12 rounded-xl" onClick={() => { setFileUrl(null); setResult(null); setError(null); }}>
              <RotateCcw className="size-4" /> Reset
            </Button>
          )}
        </div>

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      </div>

      <ResultPanel result={result} />
    </div>
  );
}
