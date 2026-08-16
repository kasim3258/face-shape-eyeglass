import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getVideoLandmarker } from "@/lib/faceLandmarker";
import { analyzeLandmarks, drawGlasses, GLASSES_URL, type FaceAnalysis } from "@/lib/faceShape";
import { ResultPanel } from "@/components/ResultPanel";
import { logActivity } from "@/lib/activity";

export function LiveTryOn() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const glassesCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const shapeRef = useRef<FaceAnalysis["shape"]>("Oval");
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FaceAnalysis | null>(null);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false);
  }, []);

  useEffect(() => stop, [stop]);

  const getGlasses = (url: string) => {
    const cached = glassesCache.current.get(url);
    if (cached) return cached.complete ? cached : null;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    glassesCache.current.set(url, img);
    return null;
  };

  const start = useCallback(async () => {
    setError(null);
    setLoading(true);
    void logActivity("Button Click: Start Camera");
    try {
      const landmarker = await getVideoLandmarker();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 720 } },
      });
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setActive(true);
      setLoading(false);

      let lastTs = -1;
      let frame = 0;
      const loop = () => {
        rafRef.current = requestAnimationFrame(loop);
        const canvas = canvasRef.current;
        if (!canvas || video.readyState < 2) return;
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (!w || !h) return;
        if (canvas.width !== w) { canvas.width = w; canvas.height = h; }
        const ctx = canvas.getContext("2d")!;
        ctx.save();
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, w, h);
        ctx.restore();

        const ts = performance.now();
        if (ts === lastTs) return;
        lastTs = ts;
        const res = landmarker.detectForVideo(video, ts);
        const lm = res.faceLandmarks?.[0];
        if (!lm) return;

        const mirrored = lm.map((p) => ({ x: 1 - p.x, y: p.y }));
        if (frame++ % 8 === 0) {
          const analysis = analyzeLandmarks(mirrored);
          if (analysis.shape !== shapeRef.current) {
            void logActivity("Prediction Generated", {
              metadata: { source: "live", shape: analysis.shape, confidence: analysis.confidence },
            });
          }
          shapeRef.current = analysis.shape;
          setResult(analysis);
        }
        const glasses = getGlasses(GLASSES_URL[shapeRef.current]);
        if (glasses) drawGlasses(ctx, glasses, mirrored, w, h);
      };
      loop();
    } catch (e) {
      console.error(e);
      setLoading(false);
      setError("Camera unavailable. Allow camera access in your browser and try again.");
      void logActivity("Error: Camera Unavailable");
      stop();
    }
  }, [stop]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="glass-card p-6">
        <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold">
          <Camera className="size-5 text-primary" /> Live try-on
        </h2>
        <div className="relative overflow-hidden rounded-2xl border border-border bg-black/40">
          <video ref={videoRef} playsInline muted className="hidden" />
          <canvas ref={canvasRef} className={active ? "w-full" : "hidden"} />
          {!active && (
            <div className="flex h-64 items-center justify-center px-6 text-center text-sm text-muted-foreground">
              Start the camera to detect your face shape and see recommended frames in real time.
            </div>
          )}
        </div>
        <div className="mt-5">
          {active ? (
            <Button variant="outline" className="h-12 w-full rounded-xl" onClick={stop}>
              <CameraOff className="size-4" /> Stop camera
            </Button>
          ) : (
            <Button className="btn-hero h-12 w-full rounded-xl font-semibold hover:brightness-110" onClick={start} disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
              {loading ? "Starting…" : "Start camera"}
            </Button>
          )}
        </div>
        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      </div>

      <ResultPanel result={result} />
    </div>
  );
}
