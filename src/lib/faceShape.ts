import aviator from "@/assets/aviator.png";
import rectangle from "@/assets/rectangle.png";
import round from "@/assets/round.png";
import square from "@/assets/square.png";
import wide from "@/assets/wide.png";

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
  Round: rectangle,
  Square: round,
  Heart: aviator,
  Oval: square,
  Oblong: wide,
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
  const at = (i: number): Point => lm[i] ?? { x: 0, y: 0 };
  const foreheadTop = at(10);
  const chin = at(152);
  const cheekL = at(234);
  const cheekR = at(454);
  const jawL = at(172);
  const jawR = at(397);
  const browL = at(21);
  const browR = at(251);

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

  const top = scores[0] ?? { shape: "Oval" as FaceShape, score: 0.5 };
  const shape = top.shape;
  const confidence = Math.round(Math.min(99, top.score * 100 + 22) * 100) / 100;
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
  // Average a ring of landmarks per eye so the anchor sits on the pupil line,
  // not on the outer corner (which rides high on the brow).
  const center = (ids: number[]) => {
    let x = 0;
    let y = 0;
    let n = 0;
    for (const id of ids) {
      const p = lm[id];
      if (!p) continue;
      x += p.x * w;
      y += p.y * h;
      n += 1;
    }
    return n ? { x: x / n, y: y / n } : null;
  };

  const eyeA = center([33, 133, 159, 145, 160, 144]);
  const eyeB = center([263, 362, 386, 374, 385, 380]);
  if (!eyeA || !eyeB) return;

  // On a mirrored (selfie) canvas the landmark sides swap, which would flip the
  // frame 180deg. Always orient from the leftmost eye to the rightmost eye.
  const [leftEye, rightEye] = eyeA.x <= eyeB.x ? [eyeA, eyeB] : [eyeB, eyeA];

  const eyeDist = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y);
  const angle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);

  // Width follows temple-to-temple distance when available, so frames don't
  // overshoot the face on wide-angle selfie cams.
  const templeL = lm[234];
  const templeR = lm[454];
  const faceWidth =
    templeL && templeR ? Math.hypot((templeR.x - templeL.x) * w, (templeR.y - templeL.y) * h) : eyeDist * 2.6;
  const gWidth = Math.min(eyeDist * 2.05, faceWidth * 0.98);
  const gHeight = (glasses.naturalHeight / glasses.naturalWidth) * gWidth;
  const cx = (leftEye.x + rightEye.x) / 2;
  const cy = (leftEye.y + rightEye.y) / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  // Slight downward nudge so lenses sit on the eyes rather than the brow line.
  ctx.drawImage(glasses, -gWidth / 2, -gHeight / 2 + gHeight * 0.06, gWidth, gHeight);
  ctx.restore();
}
