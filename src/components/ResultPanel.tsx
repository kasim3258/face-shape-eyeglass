import { Diamond, Check, X } from "lucide-react";
import { GLASSES_URL, RECOMMENDATION, SHAPE_COPY, FACE_SHAPES, type FaceAnalysis } from "@/lib/faceShape";

export function ResultPanel({ result }: { result: FaceAnalysis | null }) {
  return (
    <div className="glass-card p-6">
      <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold">
        <Diamond className="size-5 text-accent" /> Your match
      </h2>

      {!result ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Analyze a photo or start the live camera to see your face shape and frame recommendation.
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-2xl bg-white/5 p-5 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Face shape</p>
            <p className="mt-1 text-4xl font-extrabold text-gradient">{result.shape}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {result.confidence}% match · {result.note}
            </p>
            <div className="mt-4 space-y-2">
              {result.scores.map((s) => (
                <div key={s.shape} className="flex items-center gap-3 text-xs">
                  <span className="w-16 text-left text-muted-foreground">{s.shape}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-700"
                      style={{ width: `${Math.round(s.score * 100)}%` }}
                    />
                  </div>
                  <span className="w-9 text-right tabular-nums text-muted-foreground">
                    {Math.round(s.score * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-primary/30 bg-primary/10 p-4">
            <img src={GLASSES_URL[result.shape]} alt={`${RECOMMENDATION[result.shape]} frames`} className="h-12 w-24 object-contain" />
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Recommended frame</p>
              <p className="text-xl font-bold">{RECOMMENDATION[result.shape]}</p>
            </div>
          </div>

          <ul className="space-y-2 text-sm">
            <li className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-primary" />{SHAPE_COPY[result.shape].why}</li>
            <li className="flex gap-2"><X className="mt-0.5 size-4 shrink-0 text-destructive" />Avoid: {SHAPE_COPY[result.shape].avoid}</li>
          </ul>

          <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground sm:grid-cols-4">
            <Metric label="Length ratio" value={result.metrics.lengthRatio} />
            <Metric label="Jaw ratio" value={result.metrics.jawRatio} />
            <Metric label="Forehead" value={result.metrics.foreheadRatio} />
            <Metric label="Chin taper" value={result.metrics.chinTaper} />
          </div>

          <div>
            <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Full frame library</p>
            <div className="grid grid-cols-5 gap-2">
              {FACE_SHAPES.map((s) => (
                <div key={s} className="rounded-xl border border-border bg-white/5 p-2 text-center">
                  <img src={GLASSES_URL[s]} alt={`${RECOMMENDATION[s]} frames`} className="h-8 w-full object-contain" />
                  <p className="mt-1 text-[10px] text-muted-foreground">{RECOMMENDATION[s]}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-white/5 p-3 text-center">
      <p className="text-sm font-semibold text-foreground tabular-nums">{value}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wide">{label}</p>
    </div>
  );
}
