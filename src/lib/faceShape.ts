import aviator from "@/assets/aviator.png.asset.json";
import rectangle from "@/assets/rectangle.png.asset.json";
import round from "@/assets/round.png.asset.json";
import square from "@/assets/square.png.asset.json";
import wide from "@/assets/wide.png.asset.json";

export type FaceShape = "Heart" | "Oblong" | "Oval" | "Round" | "Square";

export const FACE_SHAPES: FaceShape[] = ["Heart", "Oblong", "Oval", "Round", "Square"];

export const RECOMMENDATION: Record<FaceShape, string> = {
  Round: "Rectangle",
  Square: "Round",
  Heart: "Aviator",
  Oval: "Square",
  Oblong: "Wide",
};

export const GLASSES_URL: Record<FaceShape, string> = {
  Round: rectangle.url,
  Square: round.url,
  Heart: aviator.url,
  Oval: square.url,
  Oblong: wide.url,
};

export const SHAPE_COPY: Record<FaceShape, { why: string; avoid: string }> = {
  Round: {
    why: "Angular rectangular frames add definition and lengthen soft, curved features.",
    avoid: "Small round frames — they echo the face and flatten structure.",
  },
  Square: {
    why: "Round frames soften a strong jawline and balance a broad forehead.",
    avoid: "Boxy, sharp-cornered frames that repeat the jaw angles.",
  },
  Heart: {
    why: "Aviators taper downward, balancing a wider forehead with a narrow chin.",
    avoid: "Heavy top bars and oversized cat-eye shapes.",
  },
  Oval: {
    why: "Balanced proportions carry almost anything — square frames add welcome structure.",
    avoid: "Frames too narrow for your face width.",
  },
  Oblong: {
    why: "Wide, deep frames visually shorten a longer face and add width.",
    avoid: "Small, shallow frames that stretch the face further.",
  },
};

export type Point = { x: number; y: number };

export type FaceAnalysis = {
  shape: FaceShape;
  confidence: number;
  note: string;
  recommendedFrame: string;
  metrics: {
    lengthRatio: number;
    jawRatio: number;
    foreheadRatio: number;
    chinTaper: number;
  };
  scores: { shape: FaceShape; score: number }[];
};

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Geometric face-shape classification from MediaPipe FaceMesh landmarks.
 * Runs entirely in the browser — no server round trip.
 */
export function analyzeLandmarks(lm: Point[]): FaceAnalysis {
  const foreheadTop = lm[10];
  const chin = lm[152];
  const cheekL = lm[234];
  const cheekR = lm[454];
  const jawL = lm[172];
  const jawR = lm[397];
  const browL = lm[21];
  const browR = lm[251];

  const faceLength = dist(foreheadTop, chin);
  const cheekWidth = dist(cheekL, cheekR) || 1;
  const jawWidth = dist(jawL, jawR);
  const foreheadWidth = dist(browL, browR);

  const lengthRatio = faceLength / cheekWidth;
  const jawRatio = jawWidth / cheekWidth;
  const foreheadRatio = foreheadWidth / cheekWidth;
  const chinTaper = foreheadRatio - jawRatio;

  // Continuous scoring — each shape gets a 0..1 fit score.
  const bell = (value: number, center: number, spread: number) =>
    Math.exp(-((value - center) ** 2) / (2 * spread ** 2));

  const raw: Record<FaceShape, number> = {
    Oblong: bell(lengthRatio, 1.62, 0.16) * bell(jawRatio, 0.8, 0.22),
    Round: bell(lengthRatio, 1.2, 0.11) * bell(jawRatio, 0.78, 0.2) * bell(chinTaper, 0.05, 0.16),
    Square: bell(lengthRatio, 1.3, 0.14) * bell(jawRatio, 0.95, 0.12) * bell(chinTaper, -0.02, 0.14),
    Heart: bell(lengthRatio, 1.36, 0.17) * bell(chinTaper, 0.22, 0.1),
    Oval: bell(lengthRatio, 1.42, 0.12) * bell(jawRatio, 0.82, 0.16) * bell(chinTaper, 0.1, 0.12),
  };

  const total = FACE_SHAPES.reduce((sum, s) => sum + raw[s], 0) || 1;
  const scores = FACE_SHAPES.map((shape) => ({ shape, score: raw[shape] / total })).sort(
    (a, b) => b.score - a.score,
  );

  const shape = scores[0].shape;
  const confidence = Math.round(Math.min(99, scores[0].score * 100 + 22) * 100) / 100;
  const note = confidence >= 55 ? "High confidence" : confidence >= 40 ? "Medium confidence" : "Low confidence";

  return {
    shape,
    confidence,
    note,
    recommendedFrame: RECOMMENDATION[shape],
    metrics: {
      lengthRatio: Math.round(lengthRatio * 100) / 100,
      jawRatio: Math.round(jawRatio * 100) / 100,
      foreheadRatio: Math.round(foreheadRatio * 100) / 100,
      chinTaper: Math.round(chinTaper * 100) / 100,
    },
    scores,
  };
}

/** Draws a glasses PNG onto a canvas, aligned + rotated to the eye landmarks. */
export function drawGlasses(
  ctx: CanvasRenderingContext2D,
  glasses: HTMLImageElement,
  lm: Point[],
  w: number,
  h: number,
) {
  const leftEye = { x: lm[33].x * w, y: lm[33].y * h };
  const rightEye = { x: lm[263].x * w, y: lm[263].y * h };
  const eyeDist = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y);
  const angle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);

  const gWidth = eyeDist * 1.9;
  const gHeight = (glasses.naturalHeight / glasses.naturalWidth) * gWidth;
  const cx = (leftEye.x + rightEye.x) / 2;
  const cy = (leftEye.y + rightEye.y) / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.drawImage(glasses, -gWidth / 2, -gHeight / 2, gWidth, gHeight);
  ctx.restore();
}
