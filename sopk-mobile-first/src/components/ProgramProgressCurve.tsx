"use client";

import { useId, useMemo } from "react";

import type { ProgramWeightCurvePoint } from "@/utils/weightSummary";

interface ProgramProgressCurveProps {
  points: ProgramWeightCurvePoint[];
  /** Jour du programme actuellement « actif » (repère vertical). */
  todayJour: number;
  /** Poids de départ (affiché comme repère horizontal). */
  startWeightKg?: number;
  /** Poids objectif fin de programme (affiché comme repère horizontal). */
  goalWeightKg?: number;
  /** À false quand le titre est porté par un parent (ex. accordéon). */
  showHeading?: boolean;
  /** Met en avant le point du jour actif (ex. journée validée). */
  emphasizeToday?: boolean;
  /** Suivi estimé au-dessus du poids de départ (écarts cumulés). */
  aboveStartWeight?: boolean;
}

const W = 340;
const H = 176;
const pad = { l: 40, r: 68, t: 14, b: 34 };

/**
 * Courbe poids : trajectoire indicative vs suivi réel agrégé jour après jour.
 */
export function ProgramProgressCurve({
  points,
  todayJour,
  startWeightKg,
  goalWeightKg,
  showHeading = true,
  emphasizeToday = false,
  aboveStartWeight = false,
}: ProgramProgressCurveProps) {
  const reactId = useId().replace(/:/g, "");
  const gradRef = `${reactId}-refFill`;
  const gradAct = `${reactId}-actFill`;

  const layout = useMemo(() => {
    if (points.length === 0) return null;

    const innerW = W - pad.l - pad.r;
    const innerH = H - pad.t - pad.b;
    const G = points.length;
    const seg = Math.max(1, G - 1);

    const allKgs = points.flatMap((p) => [p.referenceKg, p.actualKg]);
    if (startWeightKg != null) allKgs.push(startWeightKg);
    if (goalWeightKg != null) allKgs.push(goalWeightKg);
    const rawMin = Math.min(...allKgs);
    const rawMax = Math.max(...allKgs);
    const padKg = Math.max(1.5, (rawMax - rawMin) * 0.08);
    const wMin = rawMin - padKg;
    const wMax = rawMax + padKg;

    const xAt = (i: number) => pad.l + (i / seg) * innerW;
    const yAt = (kg: number) => pad.t + ((wMax - kg) / (wMax - wMin)) * innerH;

    const pathRef = points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yAt(p.referenceKg).toFixed(1)}`)
      .join(" ");

    let lastIdxToday = 0;
    for (let i = 0; i < points.length; i++) {
      if (points[i]!.jour <= todayJour) lastIdxToday = i;
    }

    const pathAct = points
      .slice(0, lastIdxToday + 1)
      .map((p, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yAt(p.actualKg).toFixed(1)}`)
      .join(" ");

    const areaAct =
      lastIdxToday >= 0
        ? `${pathAct} L ${xAt(lastIdxToday).toFixed(1)} ${H - pad.b} L ${xAt(0).toFixed(1)} ${H - pad.b} Z`
        : "";

    const markerIdx = points.findIndex((p) => p.jour >= todayJour);
    const mi = markerIdx >= 0 ? Math.min(markerIdx, G - 1) : G - 1;
    const markerX = xAt(mi);

    const refArea = `${pathRef} L ${xAt(G - 1).toFixed(1)} ${H - pad.b} L ${xAt(0).toFixed(1)} ${H - pad.b} Z`;

    return {
      pathRef,
      pathAct,
      areaAct,
      refArea,
      markerX,
      wMin,
      wMax,
      lastIdxToday,
      xAt,
      yAt,
      innerH,
    };
  }, [points, todayJour, startWeightKg, goalWeightKg]);

  if (!layout || points.length === 0) return null;

  const actStroke = aboveStartWeight ? "#d97706" : "#047857";
  const actFill = aboveStartWeight ? "#d97706" : "#059669";

  const { pathRef, pathAct, areaAct, refArea, markerX, wMin, wMax, lastIdxToday, xAt, yAt } = layout;
  const startY = startWeightKg != null ? yAt(startWeightKg) : null;
  const goalY = goalWeightKg != null ? yAt(goalWeightKg) : null;
  const G = points.length;
  const ticks = [wMax, (wMax + wMin) / 2, wMin];
  const firstJ = points[0]!.jour;
  const lastJ = points[G - 1]!.jour;
  const midJ = points[Math.floor((G - 1) / 2)]!.jour;

  return (
    <div className="mt-2 rounded-xl border border-brand-100 bg-white/90 p-3 shadow-card">
      {showHeading ? (
        <p className="text-caption font-semibold text-brand-900">Courbe d&apos;avancement (poids indicatif)</p>
      ) : null}
      <p className={`text-[10px] leading-snug text-ink-muted ${showHeading ? "mt-0.5" : ""}`}>
        <span className="font-medium text-brand-700">Trait prune</span> : trajectoire si tu tiens chaque jour le
        rythme du plan.{" "}
        <span className={`font-medium ${aboveStartWeight ? "text-amber-700" : "text-emerald-700"}`}>
          Trait {aboveStartWeight ? "ambre" : "vert"}
        </span>{" "}
        : estimation à partir de ton suivi (repas, eau, pas).
        {aboveStartWeight ? " Les écarts cumulés placent l’estimation au-dessus du poids de départ." : null} Ligne
        verticale : jour actif du programme.
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-2 h-auto w-full max-w-full"
        role="img"
        aria-label={`Courbe de poids du jour ${firstJ} au jour ${lastJ}, repère jour ${todayJour}`}
      >
        <defs>
          <linearGradient id={gradRef} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6d5a7d" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#d4c6e0" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id={gradAct} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#059669" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#a7f3d0" stopOpacity="0.03" />
          </linearGradient>
        </defs>
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={pad.l}
              y1={yAt(tick)}
              x2={W - pad.r}
              y2={yAt(tick)}
              stroke="#e2e8f0"
              strokeDasharray="4 4"
              strokeWidth="1"
            />
            <text x={4} y={yAt(tick) + 4} className="fill-slate-400 text-[9px]">
              {tick.toFixed(1)} kg
            </text>
          </g>
        ))}
        <line
          x1={markerX}
          y1={pad.t}
          x2={markerX}
          y2={H - pad.b}
          stroke="#9b8ab0"
          strokeWidth="1.25"
          strokeDasharray="5 4"
          opacity={0.85}
        />
        {startY != null ? (
          <>
            <line x1={pad.l} y1={startY} x2={W - pad.r} y2={startY} stroke="#ef4444" strokeWidth="1" strokeDasharray="3 3" opacity={0.7} />
            <text x={W - pad.r + 2} y={startY + 3} className="fill-red-500 text-[8px] font-semibold">
              Départ {startWeightKg!.toFixed(1)}
            </text>
          </>
        ) : null}
        {goalY != null ? (
          <>
            <line x1={pad.l} y1={goalY} x2={W - pad.r} y2={goalY} stroke="#059669" strokeWidth="1" strokeDasharray="3 3" opacity={0.7} />
            <text x={W - pad.r + 2} y={goalY + 3} className="fill-emerald-600 text-[8px] font-semibold">
              Objectif {goalWeightKg!.toFixed(1)}
            </text>
          </>
        ) : null}
        <path d={refArea} fill={`url(#${gradRef})`} stroke="none" opacity={0.55} />
        <path d={pathRef} fill="none" stroke="#6d5a7d" strokeWidth="2" strokeLinecap="round" strokeDasharray="6 4" />
        {areaAct ? <path d={areaAct} fill={`url(#${gradAct})`} stroke="none" /> : null}
        <path d={pathAct} fill="none" stroke={actStroke} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
        <circle
          cx={xAt(lastIdxToday)}
          cy={yAt(points[lastIdxToday]!.actualKg)}
          r={emphasizeToday ? 7 : 5}
          fill={actFill}
          stroke="white"
          strokeWidth="2"
          className={emphasizeToday ? "animate-[celebration-twinkle_1.2s_ease-in-out_infinite_alternate]" : undefined}
        />
        <text x={pad.l} y={H - 10} className="fill-slate-400 text-[9px]">
          J{firstJ}
        </text>
        <text x={(pad.l + W - pad.r) / 2 - 12} y={H - 10} className="fill-slate-400 text-[9px]">
          J{midJ}
        </text>
        <text x={W - pad.r - 22} y={H - 10} className="fill-slate-400 text-[9px]">
          J{lastJ}
        </text>
      </svg>
    </div>
  );
}
