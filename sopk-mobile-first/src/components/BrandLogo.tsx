import { AppIconSvg } from "@/components/AppIconSvg";

function cx(...parts: (string | undefined | false)[]) {
  return parts.filter(Boolean).join(" ");
}

export type BrandLogoVariant = "hero" | "inverse" | "onboarding";

const keywordsLine1 = "Endométriose · Hypothyroïdie / Hashimoto";
const keywordsLine2 = "Ménopause / périménopause · Résistance à l’insuline";

export function BrandLogo({ variant = "hero", className }: { variant?: BrandLogoVariant; className?: string }) {
  if (variant === "hero") {
    return (
      <div className={cx("flex flex-col items-center text-center", className)}>
        <AppIconSvg size="lg" className="mb-5 md:mb-6" />
        <p className="text-4xl font-black tracking-[-0.03em] text-violet-950 md:text-6xl md:leading-[1.06]">
          <span className="font-semibold text-violet-500">Régime </span>
          <span className="text-violet-950">SOPK</span>
        </p>
        <div
          className="mt-5 h-px w-14 shrink-0 rounded-full bg-gradient-to-r from-transparent via-violet-400/90 to-transparent md:mt-6 md:w-16"
          aria-hidden
        />
        <div className="mt-5 w-full max-w-lg rounded-2xl border border-violet-100/90 bg-gradient-to-b from-violet-50/70 to-white px-5 py-4 shadow-sm ring-1 ring-violet-100/40 md:mt-6 md:px-8 md:py-5">
          <p className="text-sm font-medium leading-relaxed text-slate-700 text-balance md:text-base">
            {keywordsLine1}
          </p>
          <p className="mt-2.5 text-xs font-normal leading-relaxed text-slate-500 text-balance md:text-sm">
            {keywordsLine2}
          </p>
        </div>
      </div>
    );
  }

  if (variant === "inverse") {
    return (
      <div className={cx("flex shrink-0 select-none flex-col items-center text-center", className)} aria-hidden="true">
        <AppIconSvg size="sm" className="mb-2 ring-white/30" />
        <p className="text-lg font-black leading-tight tracking-tight sm:text-xl">
          <span className="font-medium text-violet-200">Régime </span>
          <span className="text-white">SOPK</span>
        </p>
        <div className="mt-2 w-full max-w-[11rem] rounded-lg border border-white/25 bg-white/10 px-2 py-1.5 shadow-inner sm:max-w-[13rem]">
          <p className="text-[8px] font-medium leading-snug text-violet-50 sm:text-[9px]">{keywordsLine1}</p>
          <p className="mt-1 text-[7.5px] font-medium leading-snug text-violet-100/85 sm:text-[8.5px]">
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
          <span className="font-semibold text-[#7a7169]">Régime </span>
          <span className="text-[#4c1d95]">SOPK</span>
        </p>
        <div className="mt-2 w-full max-w-sm rounded-xl border border-[#e4dce8] bg-white/80 px-3 py-2 shadow-sm sm:px-4 sm:py-2.5">
          <p className="text-[10px] font-medium leading-snug text-[#5c534d] text-balance sm:text-[11px]">
            {keywordsLine1}
          </p>
          <p className="mt-1 text-[9.5px] font-normal leading-snug text-[#756c64] text-balance sm:text-[10.5px]">
            {keywordsLine2}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cx("flex flex-col items-center text-center", className)}>
      <p className="text-2xl font-black tracking-tight text-violet-950">
        <span className="font-semibold text-slate-500">Régime </span>
        <span className="text-violet-900">SOPK</span>
      </p>
      <div className="mt-3 w-full max-w-md rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2">
        <p className="text-[11px] font-medium leading-snug text-slate-600 text-balance sm:text-xs">{keywordsLine1}</p>
        <p className="mt-1 text-[10px] font-normal leading-snug text-slate-500 text-balance sm:text-[11px]">
          {keywordsLine2}
        </p>
      </div>
    </div>
  );
}
