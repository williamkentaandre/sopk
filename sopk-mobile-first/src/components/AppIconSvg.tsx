"use client";

function cx(...parts: (string | undefined | false)[]) {
  return parts.filter(Boolean).join(" ");
}

const sizeClass = {
  sm: "h-11 w-11",
  md: "h-16 w-16",
  lg: "h-24 w-24",
} as const;

/** Orchidée violette inline — couleurs pleines (fiable sur WKWebView, pas de url(#id)). */
export function AppIconSvg({
  size = "md",
  className,
}: {
  size?: keyof typeof sizeClass;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 512 512"
      aria-hidden
      className={cx(sizeClass[size], "shrink-0 rounded-[22%] shadow-sm ring-1 ring-violet-200/80", className)}
    >
      <rect width="512" height="512" rx="112" fill="#f5f0ff" />
      <g transform="translate(256,252)">
        <ellipse cx="0" cy="-80" rx="28" ry="72" fill="#5b21b6" />
        <path d="M-12,10 C-50,-40 -130,-60 -120,-10 C-112,30 -60,55 -12,10Z" fill="#5b21b6" />
        <path d="M12,10 C50,-40 130,-60 120,-10 C112,30 60,55 12,10Z" fill="#5b21b6" />
        <path d="M-8,-10 C-35,-70 -75,-100 -65,-50 C-58,-10 -30,20 -8,-10Z" fill="#7c3aed" />
        <path d="M8,-10 C35,-70 75,-100 65,-50 C58,-10 30,20 8,-10Z" fill="#7c3aed" />
        <path d="M0,10 C-5,40 -4,70 0,110 C4,70 5,40 0,10Z" fill="#4c1d95" opacity="0.9" />
        <path d="M0,30 C-20,15 -40,5 -48,-5" fill="none" stroke="#a78bfa" strokeWidth="5" strokeLinecap="round" />
        <path d="M0,30 C20,15 40,5 48,-5" fill="none" stroke="#a78bfa" strokeWidth="5" strokeLinecap="round" />
        <circle cx="0" cy="-8" r="10" fill="#faf8ff" />
        <circle cx="0" cy="-8" r="6" fill="#6d28d9" />
      </g>
    </svg>
  );
}
