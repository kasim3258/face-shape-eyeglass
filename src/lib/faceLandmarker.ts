import modelAsset from "@/assets/face_landmarker.task.asset.json";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";

let imagePromise: Promise<FaceLandmarker> | null = null;
let videoPromise: Promise<FaceLandmarker> | null = null;

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";

async function create(runningMode: "IMAGE" | "VIDEO") {
  const vision = await import("@mediapipe/tasks-vision");
  const fileset = await vision.FilesetResolver.forVisionTasks(WASM_BASE);
  const build = (delegate: "GPU" | "CPU") =>
    vision.FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: modelAsset.url, delegate },
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
