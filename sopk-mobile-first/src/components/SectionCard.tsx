import { ReactNode } from "react";

interface SectionCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  noPadding?: boolean;
}

export function SectionCard({ title, subtitle, children, noPadding }: SectionCardProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] backdrop-blur-sm">
      <div className="border-b border-slate-100/80 px-4 py-3">
        <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-[13px] text-slate-500">{subtitle}</p> : null}
      </div>
      <div className={noPadding ? "" : "space-y-3 px-4 py-3.5"}>{children}</div>
    </section>
  );
}
