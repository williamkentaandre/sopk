"use client";

import { useMemo } from "react";

const PARTICLE_COUNT = 64;
const HALF = 32;

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function DayCelebrationFireworks({ burstKey, title = "Bravo !" }: { burstKey: number; title?: string }) {
  const particles = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const seed = burstKey * 7919 + i * 17;
      const angle = seededRandom(seed) * Math.PI * 2;
      const dist = 90 + seededRandom(seed + 1) * (i < HALF ? 160 : 220);
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist * -0.92 - (i < HALF ? 20 : 60);
      const hue = Math.floor(seededRandom(seed + 2) * 330);
      const delay = i < HALF ? seededRandom(seed + 3) * 0.12 : 0.35 + seededRandom(seed + 3) * 0.25;
      const size = 3 + seededRandom(seed + 4) * 7;
      return { tx, ty, hue, delay, size };
    });
  }, [burstKey]);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[200] flex items-center justify-center overflow-hidden"
      aria-hidden
    >
      <div className="absolute inset-0 bg-gradient-to-b from-violet-950/35 via-slate-950/40 to-slate-950/55 backdrop-blur-[2px]" />
      <p className="relative z-10 max-w-[90vw] animate-[celebration-title-pop_0.75s_cubic-bezier(0.34,1.56,0.64,1)_forwards] px-4 text-center text-2xl font-black tracking-tight text-white drop-shadow-[0_0_24px_rgba(167,139,250,0.95)] sm:text-3xl">
        {title}
      </p>
      <div className="pointer-events-none absolute left-1/2 top-[40%] h-px w-px sm:top-[38%]">
        {particles.map((b, i) => (
          <span
            key={`${burstKey}-${i}`}
            className="absolute rounded-full shadow-[0_0_10px_currentColor]"
            style={{
              width: b.size,
              height: b.size,
              left: 0,
              top: 0,
              backgroundColor: `hsl(${b.hue} 92% 62%)`,
              color: `hsl(${b.hue} 92% 62%)`,
              animation: "celebration-particle-burst 1.55s cubic-bezier(0.22, 0.75, 0.32, 1) forwards",
              animationDelay: `${b.delay}s`,
              ["--tx" as string]: `${b.tx}px`,
              ["--ty" as string]: `${b.ty}px`,
            }}
          />
        ))}
      </div>
      <div className="pointer-events-none absolute bottom-[18%] left-[12%] h-2 w-2 rounded-full bg-amber-300/90 opacity-90 shadow-[0_0_20px_#fcd34d] animate-[celebration-twinkle_0.5s_ease-in-out_infinite_alternate]" />
      <div className="pointer-events-none absolute bottom-[22%] right-[14%] h-2 w-2 rounded-full bg-fuchsia-300/90 opacity-90 shadow-[0_0_18px_#f0abfc] animate-[celebration-twinkle_0.65s_ease-in-out_infinite_alternate]" />
    </div>
  );
}
