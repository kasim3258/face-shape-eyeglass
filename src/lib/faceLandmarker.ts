import modelAsset from "@/assets/face_landmarker.task.asset.json";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";

let imagePromise: Promise<FaceLandmarker> | null = null;
let videoPromise: Promise<FaceLandmarker> | null = null;

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";

// Public mirror of the same model, used when the bundled asset URL is not
// served (e.g. the app is hosted outside Lovable).
const MODEL_FALLBACK =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

let modelUrlPromise: Promise<string> | null = null;

function resolveModelUrl() {
  if (!modelUrlPromise) {
    modelUrlPromise = (async () => {
      try {
        const res = await fetch(modelAsset.url, { method: "HEAD" });
        if (res.ok) return modelAsset.url;
      } catch {
        /* fall through */
      }
      return MODEL_FALLBACK;
    })();
  }
  return modelUrlPromise;
}

async function create(runningMode: "IMAGE" | "VIDEO") {
  const vision = await import("@mediapipe/tasks-vision");
  const [fileset, modelAssetPath] = await Promise.all([
    vision.FilesetResolver.forVisionTasks(WASM_BASE),
    resolveModelUrl(),
  ]);
  const build = (delegate: "GPU" | "CPU") =>
    vision.FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath, delegate },
      runningMode,
      numFaces: 1,
    });
  try {
    return await build("GPU");
  } catch (e) {
    console.warn("[faceLandmarker] GPU delegate unavailable, falling back to CPU", e);
    return await build("CPU");
  }
}

export function getImageLandmarker() {
  if (!imagePromise) imagePromise = create("IMAGE").catch((e) => ((imagePromise = null), Promise.reject(e)));
  return imagePromise;
}

export function getVideoLandmarker() {
  if (!videoPromise) videoPromise = create("VIDEO").catch((e) => ((videoPromise = null), Promise.reject(e)));
  return videoPromise;
}
