import { ReactNode } from "react";

interface SectionCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  noPadding?: boolean;
  variant?: "default" | "premium";
}

export function SectionCard({ title, subtitle, children, noPadding, variant = "default" }: SectionCardProps) {
  if (variant === "premium") {
    return (
      <section className="overflow-hidden rounded-2xl border border-brand-200/50 bg-white/95 shadow-card ring-1 ring-white/80">
        <div className="border-b border-brand-100/80 bg-gradient-to-r from-brand-50/90 via-white to-brand-50/40 px-4 py-3.5">
          <h2 className="text-section-title text-ink">{title}</h2>
          {subtitle ? <p className="text-body mt-0.5 text-ink-muted">{subtitle}</p> : null}
        </div>
        <div className={noPadding ? "" : "space-y-3 px-4 py-3.5"}>{children}</div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-brand-200/60 bg-white/90 shadow-card">
      <div className="border-b border-brand-100/80 px-4 py-3">
        <h2 className="text-section-title text-ink">{title}</h2>
        {subtitle ? <p className="text-body mt-0.5 text-ink-muted">{subtitle}</p> : null}
      </div>
      <div className={noPadding ? "" : "space-y-3 px-4 py-3.5"}>{children}</div>
    </section>
  );
}
