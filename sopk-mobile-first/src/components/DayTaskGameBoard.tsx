"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

import type { MealEntry } from "@/utils/types";
import { formatLitersFrFromMl, WATER_STEP_ML } from "@/utils/waterDisplay";

import { MealImage } from "./PlanViewMealImage";
import { TrackingTaskImage } from "./TrackingTaskImage";

export function taskBrickClasses(done: boolean): string {
  return done
    ? "border-emerald-300/70 bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-700 text-white shadow-[0_4px_0_0_#047857,inset_0_1px_0_0_rgba(255,255,255,0.35),0_10px_28px_rgba(16,185,129,0.45)]"
    : "border-rose-300/70 bg-gradient-to-br from-rose-400 via-rose-500 to-rose-700 text-white shadow-[0_4px_0_0_#be123c,inset_0_1px_0_0_rgba(255,255,255,0.25),0_10px_28px_rgba(244,63,94,0.42)] [animation:game-pulse-red_2.8s_ease-in-out_infinite]";
}

interface GameMealBrick {
  key: string;
  typeLabel: string;
  nom: string;
  checked: boolean;
  meal: Pick<MealEntry, "nom" | "type" | "image"> & { hideImage?: boolean };
}

interface DayTaskGameBoardProps {
  checkedToday: number;
  totalTasks: number;
  isDayValidated: boolean;
  canEdit: boolean;
  isFutureDay: boolean;
  meals: GameMealBrick[];
  onMealToggle: (key: string) => void;
  expandedMealKey: string | null;
  onMealExpand: (key: string, mode: "swap" | "portions") => void;
  expandedMealPanel: ReactNode;
  waterChecked: boolean;
  waterRawMl: number;
  waterTargetMl: number;
  waterSliderMl: number;
  waterPercent: number;
  onWaterChange: (value: number) => void;
  stepsChecked: boolean;
  stepsCurrent: number;
  stepsTarget: number;
  stepsPercent: number;
  onStepsChange: (value: number) => void;
  stepsExtra?: ReactNode;
  dateLabel: string;
  jour: number;
  showTodayButton: boolean;
  onGoToday: () => void;
}

function GameBrickShine({ done }: { done: boolean }) {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-transparent"
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute -left-full top-0 h-full w-1/2 skew-x-[-12deg] bg-gradient-to-r from-transparent ${
          done ? "via-white/20" : "via-white/12"
        } to-transparent`}
        style={{ animation: "game-board-shimmer 4.5s ease-in-out infinite" }}
        aria-hidden
      />
    </>
  );
}

function MealDoneToggleBar({ checked }: { checked: boolean }) {
  return (
    <div
      className={`flex w-full items-center justify-center gap-2 border-t border-white/20 px-2 py-2.5 text-[11px] font-bold leading-tight ${
        checked ? "bg-emerald-950/25 text-white" : "bg-white text-emerald-800"
      }`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-[2.5px] shadow-sm ${
          checked
            ? "border-white bg-white text-emerald-600"
            : "border-emerald-600 bg-white text-emerald-600"
        }`}
        aria-hidden
      >
        {checked ? (
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 0 1 0 1.414l-8 8a1 1 0 0 1-1.414 0l-4-4a1 1 0 0 1 1.414-1.414L8 12.586l7.293-7.293a1 1 0 0 1 1.414 0Z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <span className="block h-2.5 w-2.5 rounded-full bg-emerald-500/35" />
        )}
      </span>
      <span className="text-left">
        {checked ? (
          <>
            <span className="block uppercase tracking-wide">Repas terminé</span>
            <span className="block text-[9px] font-semibold normal-case text-white/75">Toucher pour annuler</span>
          </>
        ) : (
          <>
            <span className="block uppercase tracking-wide">Marquer terminé</span>
            <span className="block text-[9px] font-semibold normal-case text-emerald-700/80">
              J&apos;ai bien pris ce repas
            </span>
          </>
        )}
      </span>
    </div>
  );
}

export function DayTaskGameBoard({
  checkedToday,
  totalTasks,
  isDayValidated,
  canEdit,
  isFutureDay,
  meals,
  onMealToggle,
  expandedMealKey,
  onMealExpand,
  expandedMealPanel,
  waterChecked,
  waterRawMl,
  waterTargetMl,
  waterSliderMl,
  waterPercent,
  onWaterChange,
  stepsChecked,
  stepsCurrent,
  stepsTarget,
  stepsPercent,
  onStepsChange,
  stepsExtra,
  dateLabel,
  jour,
  showTodayButton,
  onGoToday,
}: DayTaskGameBoardProps) {
  const taskProgressPercent = totalTasks > 0 ? Math.round((checkedToday / totalTasks) * 100) : 0;
  const expandedPanelRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!expandedMealKey) return;
    const frame = requestAnimationFrame(() => {
      expandedPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(frame);
  }, [expandedMealKey]);

  return (
    <div
      className={`relative overflow-hidden rounded-[1.4rem] p-3 transition-all duration-700 ${
        isDayValidated
          ? "bg-gradient-to-b from-[#14121f] via-[#18162a] to-[#0f2a22] ring-2 ring-emerald-400/55 shadow-[0_20px_60px_rgba(16,185,129,0.22),inset_0_1px_0_rgba(255,255,255,0.06)]"
          : "bg-gradient-to-b from-[#14121f] via-[#18162a] to-[#2a1018] ring-2 ring-rose-500/45 shadow-[0_20px_60px_rgba(244,63,94,0.18),inset_0_1px_0_rgba(255,255,255,0.06)]"
      }`}
    >
      <div
        className={`pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full blur-3xl ${
          isDayValidated ? "bg-emerald-500/25" : "bg-rose-500/20"
        }`}
        aria-hidden
      />
      <div className="pointer-events-none absolute -bottom-20 -left-16 h-44 w-44 rounded-full bg-brand-600/15 blur-3xl" aria-hidden />

      <div className="relative space-y-3">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-300/80">Mission du jour</p>
            <p className="mt-0.5 truncate text-[15px] font-black tracking-tight text-white">
              {dateLabel}
              <span className="font-medium text-white/45"> · </span>
              <span className="text-brand-200">Jour {jour}</span>
            </p>
          </div>
          <div
            className={`shrink-0 rounded-2xl px-3 py-2 text-center backdrop-blur-sm ${
              isDayValidated
                ? "bg-emerald-500/20 ring-1 ring-emerald-400/40"
                : "bg-rose-500/15 ring-1 ring-rose-400/35"
            }`}
          >
            <p
              className={`text-[22px] font-black tabular-nums leading-none ${
                isDayValidated ? "text-emerald-300" : "text-rose-300"
              }`}
            >
              {checkedToday}
              <span className="text-[13px] font-bold text-white/40">/{totalTasks}</span>
            </p>
            <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-white/55">validés</p>
          </div>
          {showTodayButton ? (
            <button
              type="button"
              onClick={onGoToday}
              className="shrink-0 rounded-xl bg-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-white ring-1 ring-white/20 backdrop-blur-sm transition hover:bg-white/15 active:scale-95"
            >
              Aujourd&apos;hui
            </button>
          ) : null}
        </div>

        <div className="relative h-3.5 overflow-hidden rounded-full bg-rose-600/90 p-0.5 shadow-[inset_0_2px_6px_rgba(0,0,0,0.35)] ring-1 ring-black/30">
          <div
            className="relative h-full overflow-hidden rounded-full bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-500 shadow-[0_0_16px_rgba(52,211,153,0.75)] transition-all duration-700 ease-out"
            style={{ width: `${taskProgressPercent}%` }}
          >
            <div
              className="absolute inset-0 bg-gradient-to-b from-white/35 to-transparent"
              aria-hidden
            />
          </div>
        </div>

        {isFutureDay ? (
          <p className="rounded-xl bg-amber-500/15 px-3 py-2 text-center text-[11px] font-semibold text-amber-200 ring-1 ring-amber-400/30">
            Jour à venir - aperçu seulement
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-2.5">
          {meals.map((meal) => {
            const mealToggleDisabled = !canEdit || isFutureDay;
            const activateMealToggle = () => {
              if (mealToggleDisabled) return;
              onMealToggle(meal.key);
            };

            return (
            <div
              key={meal.key}
              className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-300 ${taskBrickClasses(meal.checked)}`}
            >
              <GameBrickShine done={meal.checked} />
              <div
                role="button"
                tabIndex={mealToggleDisabled ? -1 : 0}
                aria-pressed={meal.checked}
                aria-disabled={mealToggleDisabled}
                aria-label={
                  meal.checked
                    ? `Repas ${meal.nom} terminé, appuyer pour annuler`
                    : `Marquer le repas ${meal.nom} comme terminé`
                }
                onClick={activateMealToggle}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  activateMealToggle();
                }}
                className={`relative z-[1] block w-full touch-manipulation select-none text-left outline-none transition active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
                  mealToggleDisabled ? "cursor-not-allowed opacity-55" : "cursor-pointer"
                }`}
              >
                <div className="pointer-events-none flex w-full items-start gap-2.5 p-2.5">
                  <MealImage meal={meal.meal} size="xs" hideImage={meal.meal.hideImage} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[8px] font-black uppercase tracking-[0.14em] text-white/75">
                      {meal.typeLabel}
                    </span>
                    <span className="mt-1 line-clamp-2 block text-[11px] font-bold leading-snug drop-shadow-sm">
                      {meal.nom}
                    </span>
                  </span>
                  <span
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
                      meal.checked
                        ? "border-white bg-white text-emerald-600 shadow-md"
                        : "border-white/70 bg-white/10 text-white/40"
                    }`}
                    aria-hidden
                  >
                    {meal.checked ? (
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 0 1 0 1.414l-8 8a1 1 0 0 1-1.414 0l-4-4a1 1 0 0 1 1.414-1.414L8 12.586l7.293-7.293a1 1 0 0 1 1.414 0Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : null}
                  </span>
                </div>
                <div className="pointer-events-none">
                  <MealDoneToggleBar checked={meal.checked} />
                </div>
              </div>
              {expandedMealKey !== meal.key ? (
                <div className="relative z-[2] border-t border-white/20">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onMealExpand(meal.key, "portions");
                    }}
                    className="w-full bg-black/15 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white/90 transition hover:bg-black/25"
                  >
                    Voir les portions
                  </button>
                  {canEdit && !isFutureDay ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onMealExpand(meal.key, "swap");
                      }}
                      className="w-full border-t border-white/15 bg-black/10 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white/80 transition hover:bg-black/20"
                    >
                      Changer de repas
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
            );
          })}

          <div
            className={`relative flex flex-col overflow-hidden rounded-2xl border-2 transition-all duration-300 ${taskBrickClasses(waterChecked)}`}
          >
            <TrackingTaskImage kind="water" />
            <div className="relative flex min-h-[4.5rem] flex-1 flex-col justify-between p-2.5">
              <GameBrickShine done={waterChecked} />
              <div className="relative flex items-baseline justify-between gap-1">
                <span className="text-[8px] font-black uppercase tracking-[0.14em] text-white/75">Eau</span>
                <span className="rounded-full bg-black/20 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white/90">
                  {waterPercent}%
                </span>
              </div>
              <p className="relative text-[18px] font-black tabular-nums leading-none drop-shadow-sm">
                {formatLitersFrFromMl(waterRawMl)}
              </p>
              <input
                type="range"
                min={0}
                max={waterTargetMl}
                step={WATER_STEP_ML}
                value={waterSliderMl}
                disabled={!canEdit || isFutureDay}
                onChange={(e) => {
                  const next = Math.min(waterTargetMl, Math.max(0, Number(e.target.value)));
                  onWaterChange(next);
                }}
                className="game-range relative h-1 w-full cursor-pointer accent-white disabled:opacity-40"
              />
            </div>
          </div>

          <div
            className={`relative flex flex-col overflow-hidden rounded-2xl border-2 transition-all duration-300 ${taskBrickClasses(stepsChecked)}`}
          >
            <TrackingTaskImage kind="steps" />
            <div className="relative flex min-h-[4.5rem] flex-1 flex-col justify-between p-2.5">
              <GameBrickShine done={stepsChecked} />
              <div className="relative flex items-baseline justify-between gap-1">
                <span className="text-[8px] font-black uppercase tracking-[0.14em] text-white/75">Pas</span>
                <span className="rounded-full bg-black/20 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white/90">
                  {stepsPercent}%
                </span>
              </div>
              <p className="relative text-[18px] font-black tabular-nums leading-none drop-shadow-sm">
                {stepsCurrent.toLocaleString("fr-FR")}
              </p>
              <input
                type="range"
                min={0}
                max={stepsTarget}
                step={100}
                value={stepsCurrent}
                disabled={!canEdit || isFutureDay}
                onChange={(e) => onStepsChange(Number(e.target.value))}
                className="game-range relative h-1 w-full cursor-pointer accent-white disabled:opacity-40"
              />
              {stepsExtra}
            </div>
          </div>
        </div>

        {expandedMealKey && expandedMealPanel ? (
          <div
            ref={expandedPanelRef}
            className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/95 p-3.5 shadow-[0_16px_40px_rgba(0,0,0,0.35)] ring-1 ring-violet-200/50 backdrop-blur-xl scroll-mt-[max(3.5rem,calc(env(safe-area-inset-top,0px)+2.75rem))]"
          >
            {expandedMealPanel}
          </div>
        ) : null}

        {isDayValidated ? (
          <p className="relative text-center text-[13px] font-black uppercase tracking-wide text-emerald-300 drop-shadow-sm">
            Journée complète - victoire !
          </p>
        ) : (
          <p className="relative text-center text-[10px] font-semibold leading-snug text-white/50">
            Touchez la carte repas (nom, photo ou bandeau) pour cocher · vert = fait
          </p>
        )}
      </div>
    </div>
  );
}
