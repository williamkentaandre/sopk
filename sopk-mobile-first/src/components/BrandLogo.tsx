import { AppIconSvg } from "@/components/AppIconSvg";

function cx(...parts: (string | undefined | false)[]) {
  return parts.filter(Boolean).join(" ");
}

export type BrandLogoVariant = "hero" | "inverse" | "onboarding" | "compact" | "minimal";

const keywordsLine1 = "Endométriose · Hypothyroïdie / Hashimoto";
const keywordsLine2 = "Ménopause / périménopause · Résistance à l’insuline";

export function BrandLogo({ variant = "hero", className }: { variant?: BrandLogoVariant; className?: string }) {
  if (variant === "hero") {
    return (
      <div className={cx("flex flex-col items-center text-center", className)}>
        <AppIconSvg size="lg" className="mb-5 md:mb-6" />
        <p className="text-4xl font-black tracking-[-0.03em] text-brand-900 md:text-6xl md:leading-[1.06]">
          <span className="font-semibold text-brand-600">Régime </span>
          <span className="text-brand-900">SOPK</span>
        </p>
        <div
          className="mt-5 h-px w-14 shrink-0 rounded-full bg-gradient-to-r from-transparent via-brand-500/80 to-transparent md:mt-6 md:w-16"
          aria-hidden
        />
        <div className="mt-5 w-full max-w-lg rounded-2xl border border-brand-200/90 bg-gradient-to-b from-brand-50/80 to-white px-5 py-4 shadow-card ring-1 ring-brand-100/50 md:mt-6 md:px-8 md:py-5">
          <p className="text-body font-medium text-ink md:text-sm">{keywordsLine1}</p>
          <p className="mt-2.5 text-caption font-normal text-ink-muted md:text-sm">{keywordsLine2}</p>
        </div>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={cx("flex min-w-0 items-center gap-2.5", className)}>
        <AppIconSvg size="sm" className="h-9 w-9 shrink-0 rounded-[22%] shadow-md shadow-brand-600/20 ring-2 ring-white" />
        <div className="min-w-0">
          <p className="truncate text-section-title text-brand-900">
            <span className="font-semibold text-brand-600">Régime </span>SOPK
          </p>
          <p className="text-eyebrow mt-0.5 truncate text-brand-500/90">Programme quotidien</p>
        </div>
      </div>
    );
  }

  if (variant === "inverse") {
    return (
      <div className={cx("flex shrink-0 select-none flex-col items-center text-center", className)} aria-hidden="true">
        <AppIconSvg size="sm" className="mb-2 ring-white/30" />
        <p className="text-lg font-black leading-tight tracking-tight sm:text-xl">
          <span className="font-medium text-brand-200">Régime </span>
          <span className="text-white">SOPK</span>
        </p>
        <div className="mt-2 w-full max-w-[11rem] rounded-lg border border-white/25 bg-white/10 px-2 py-1.5 shadow-inner sm:max-w-[13rem]">
          <p className="text-[8px] font-medium leading-snug text-brand-50 sm:text-[9px]">{keywordsLine1}</p>
          <p className="mt-1 text-[7.5px] font-medium leading-snug text-brand-100/85 sm:text-[8.5px]">
            {keywordsLine2}
          </p>
        </div>
      </div>
    );
  }

  if (variant === "onboarding") {
    return (
      <div className={cx("flex min-w-0 flex-col items-center text-center", className)}>
        <AppIconSvg size="lg" className="mb-2 sm:mb-3" />
        <p className="text-base font-black leading-tight tracking-tight sm:text-lg">
          <span className="font-semibold text-brand-600">Régime </span>
          <span className="text-brand-900">SOPK</span>
        </p>
        <div className="mt-2 w-full max-w-sm rounded-xl border border-brand-200 bg-white/85 px-3 py-2 shadow-card sm:px-4 sm:py-2.5">
          <p className="text-caption font-medium leading-snug text-ink text-balance sm:text-[11px]">{keywordsLine1}</p>
          <p className="mt-1 text-[9.5px] font-normal leading-snug text-ink-muted text-balance sm:text-[10.5px]">
            {keywordsLine2}
          </p>
        </div>
      </div>
    );
  }

  if (variant === "minimal") {
    return (
      <div className={cx("flex min-w-0 items-center gap-2.5", className)}>
        <AppIconSvg size="sm" className="h-8 w-8 shrink-0 rounded-[22%] shadow-sm shadow-brand-600/15 ring-2 ring-white" />
        <div className="min-w-0 text-left">
          <p className="truncate text-sm font-black tracking-tight text-brand-900">
            <span className="font-semibold text-brand-600">Régime </span>SOPK
          </p>
          <p className="text-[10px] font-medium text-brand-500/90">Programme SOPK</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cx("flex flex-col items-center text-center", className)}>
      <p className="text-2xl font-black tracking-tight text-brand-900">
        <span className="font-semibold text-ink-muted">Régime </span>
        <span className="text-brand-800">SOPK</span>
      </p>
      <div className="mt-3 w-full max-w-md rounded-xl border border-brand-200 bg-brand-50/60 px-3 py-2">
        <p className="text-caption font-medium leading-snug text-ink-muted text-balance sm:text-xs">{keywordsLine1}</p>
        <p className="mt-1 text-[10px] font-normal leading-snug text-ink-subtle text-balance sm:text-[11px]">
          {keywordsLine2}
        </p>
      </div>
    </div>
  );
}
