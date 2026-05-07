import { ReactNode } from "react";

interface SectionCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function SectionCard({ title, subtitle, children }: SectionCardProps) {
  return (
    <section className="rounded-2xl border border-violet-100/80 bg-white p-4 shadow-sm shadow-violet-100/30">
      <div className="border-b border-slate-100 pb-2">
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}
