"use client";

export type ActionFeedbackKind = "meal" | "water" | "steps" | "day" | "deviation";

export interface ActionFeedbackPayload {
  key: number;
  kind: ActionFeedbackKind;
  title: string;
  subtitle?: string;
  /** Ambre pour écarts / journée sans perte nette ; vert par défaut. */
  tone?: "success" | "amber";
}

const kindEmoji: Record<ActionFeedbackKind, string> = {
  meal: "🍽️",
  water: "💧",
  steps: "👟",
  day: "✨",
  deviation: "📝",
};

export function ActionFeedbackToast({ feedback }: { feedback: ActionFeedbackPayload | null }) {
  if (!feedback) return null;

  const isAmber = feedback.tone === "amber" || feedback.kind === "deviation";

  return (
    <div
      key={feedback.key}
      className="pointer-events-none fixed inset-x-0 top-[max(4.5rem,calc(env(safe-area-inset-top,0px)+3.5rem))] z-[210] flex justify-center px-4"
      aria-live="polite"
      aria-atomic
    >
      <div
        className={`flex max-w-sm items-start gap-2.5 rounded-2xl border px-4 py-3 shadow-lg animate-[action-feedback-pop_1.35s_ease-out_forwards] ${
          isAmber
            ? "border-amber-200/90 bg-amber-50/95 text-amber-950 shadow-amber-200/30"
            : "border-emerald-200/90 bg-white/95 text-slate-900 shadow-emerald-200/25"
        }`}
      >
        <span className="text-xl leading-none" aria-hidden>
          {kindEmoji[feedback.kind]}
        </span>
        <div className="min-w-0">
          <p className={`text-[15px] font-bold tracking-tight ${isAmber ? "text-amber-950" : "text-emerald-800"}`}>
            {feedback.title}
          </p>
          {feedback.subtitle ? (
            <p className={`mt-0.5 text-[12px] leading-snug ${isAmber ? "text-amber-900/90" : "text-slate-600"}`}>
              {feedback.subtitle}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
