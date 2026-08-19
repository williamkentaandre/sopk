"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { brand } from "@/styles/brand";
import type { MealEntry } from "@/utils/types";
import { formatLitersFrFromMl, WATER_STEP_ML } from "@/utils/waterDisplay";

import { MealImage } from "./PlanViewMealImage";
import { TaskWhyTodaySheet, type TaskWhyTodayImage, type TaskWhyTodaySheetState, TaskWhyTodayTrigger } from "./TaskWhyTodaySheet";
import { TrackingTaskImage } from "./TrackingTaskImage";

export function taskBrickClasses(done: boolean, awaitPulse = false): string {
  if (done) return brand.taskHonored;
  return `${brand.taskOpen}${awaitPulse ? " [animation:task-await-pulse_3.6s_ease-in-out_infinite]" : ""}`;
}

interface GameMealBrick {
  key: string;
  typeLabel: string;
  nom: string;
  checked: boolean;
  /** Aucun repas du catalogue ne respecte les allergènes / exclusions du profil. */
  unavailable?: boolean;
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
  /** Panneau ouvert en mode « changer de repas » (pas portions). */
  expandedMealSwapOpen?: boolean;
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
  /** Libellé sous le compteur (ex. synchro Santé automatique). */
  stepsStatusLabel?: string | null;
  stepsHint?: string | null;
  waterWhyToday: string;
  stepsWhyToday: string;
  dateLabel: string;
  jour: number;
  showTodayButton: boolean;
  onGoToday: () => void;
}

function GameBrickShine({ done }: { done: boolean }) {
  return (
    <>
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${
          done ? "from-white/20" : "from-white/50"
        } via-transparent to-transparent`}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute -left-full top-0 h-full w-1/2 skew-x-[-12deg] bg-gradient-to-r from-transparent ${
          done ? "via-white/20" : "via-brand-200/50"
        } to-transparent`}
        style={{ animation: "game-board-shimmer 4.5s ease-in-out infinite" }}
        aria-hidden
      />
    </>
  );
}

function TaskSeal({ checked, onHonoredCard }: { checked: boolean; onHonoredCard: boolean }) {
  return (
    <span
      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 shadow-sm ${
        checked
          ? "border-white bg-white text-accent shadow-md"
          : onHonoredCard
            ? "border-white/70 bg-white/10"
            : "border-brand-600 bg-white"
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
        <span className="block h-2.5 w-2.5 rounded-full bg-brand-200" />
      )}
    </span>
  );
}

function MealDoneToggleBar({ checked }: { checked: boolean }) {
  return (
    <div
      className={`flex w-full items-center gap-3 border-t px-3 py-3.5 ${
        checked
          ? "border-white/20 bg-brand-900/35 text-white"
          : "border-brand-100 bg-brand-50/90 text-brand-900"
      }`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-[2.5px] shadow-sm ${
          checked ? "border-white bg-white text-accent" : "border-brand-600 bg-white text-brand-600"
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
          <span className="block h-3 w-3 rounded-full bg-brand-200" />
        )}
      </span>
      <span className="min-w-0 flex-1 text-left">
        {checked ? (
          <>
            <span className="block text-[15px] font-black leading-tight">Pris — toucher pour annuler</span>
            <span className="mt-0.5 block text-[13px] font-semibold normal-case text-white/85">Repas honoré</span>
          </>
        ) : (
          <>
            <span className="block text-[15px] font-black leading-tight text-brand-900">Marquer comme pris</span>
            <span className="mt-0.5 block text-[13px] font-semibold normal-case text-brand-600">
              Toucher la carte ou ce bandeau
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
  expandedMealSwapOpen = false,
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
  stepsStatusLabel,
  stepsHint,
  waterWhyToday,
  stepsWhyToday,
  dateLabel,
  jour,
  showTodayButton,
  onGoToday,
}: DayTaskGameBoardProps) {
  const taskProgressPercent = totalTasks > 0 ? Math.round((checkedToday / totalTasks) * 100) : 0;
  const expandedPanelRef = useRef<HTMLDivElement | null>(null);
  const [whySheet, setWhySheet] = useState<TaskWhyTodaySheetState | null>(null);
  const canPulse = canEdit && !isFutureDay;

  const openWhy = (subtitle: string, explanation: string, image?: TaskWhyTodayImage) => {
    setWhySheet({ subtitle, explanation, image });
  };

  useLayoutEffect(() => {
    if (!expandedMealKey) return;
    const frame = requestAnimationFrame(() => {
      const panel = expandedPanelRef.current;
      if (!panel) return;
      const scrollMarginTop = Number.parseFloat(window.getComputedStyle(panel).scrollMarginTop) || 0;
      const top = panel.getBoundingClientRect().top + window.scrollY - scrollMarginTop;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    });
    return () => cancelAnimationFrame(frame);
  }, [expandedMealKey]);

  return (
    <div
      className={`relative overflow-hidden rounded-[1.4rem] p-3 transition-all duration-700 ${
        isDayValidated
          ? "bg-gradient-to-b from-brand-900 via-brand-800 to-[#1a3a36] ring-2 ring-accent/50 shadow-[0_20px_60px_rgba(13,148,136,0.18),inset_0_1px_0_rgba(255,255,255,0.08)]"
          : "bg-gradient-to-b from-brand-900 via-brand-800 to-brand-900 ring-2 ring-brand-500/35 shadow-[0_20px_60px_rgba(61,42,74,0.28),inset_0_1px_0_rgba(255,255,255,0.06)]"
      }`}
    >
      <div
        className={`pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full blur-3xl ${
          isDayValidated ? "bg-accent/25" : "bg-brand-500/25"
        }`}
        aria-hidden
      />
      <div className="pointer-events-none absolute -bottom-20 -left-16 h-44 w-44 rounded-full bg-brand-600/20 blur-3xl" aria-hidden />

      <div className="relative space-y-3">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-200/85">Journée en cours</p>
            <p className="mt-0.5 truncate text-[15px] font-black tracking-tight text-white">
              {dateLabel}
              <span className="font-medium text-white/45"> · </span>
              <span className="text-brand-200">Jour {jour}</span>
            </p>
          </div>
          <div
            className={`shrink-0 rounded-2xl px-3 py-2 text-center backdrop-blur-sm ${
              isDayValidated ? "bg-accent/20 ring-1 ring-accent/40" : "bg-white/10 ring-1 ring-white/15"
            }`}
          >
            <p className="text-[22px] font-black tabular-nums leading-none text-white">
              {checkedToday}
              <span className="text-[13px] font-bold text-white/40">/{totalTasks}</span>
            </p>
            <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-white/55">pris</p>
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

        <div className="relative h-3.5 overflow-hidden rounded-full bg-brand-900/80 p-0.5 shadow-[inset_0_2px_6px_rgba(0,0,0,0.35)] ring-1 ring-white/10">
          <div
            className="relative h-full overflow-hidden rounded-full bg-gradient-to-r from-brand-500 via-brand-600 to-accent shadow-[0_0_16px_rgba(13,148,136,0.35)] transition-all duration-700 ease-out"
            style={{ width: `${taskProgressPercent}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-white/35 to-transparent" aria-hidden />
          </div>
        </div>

        {isFutureDay ? (
          <p className="rounded-xl bg-brand-500/20 px-3 py-2 text-center text-[11px] font-semibold text-brand-100 ring-1 ring-brand-200/25">
            Jour à venir - aperçu seulement
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-2.5">
          {meals.map((meal) => {
            const mealToggleDisabled = !canEdit || isFutureDay || Boolean(meal.unavailable);
            const portionsPanelOpen = expandedMealKey === meal.key && !expandedMealSwapOpen;
            const activateMealToggle = () => {
              if (mealToggleDisabled) return;
              onMealToggle(meal.key);
            };

            return (
            <div
              key={meal.key}
              className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-300 ${taskBrickClasses(
                meal.checked,
                canPulse && !meal.checked && !meal.unavailable,
              )}`}
            >
              <GameBrickShine done={meal.checked} />
              <div
                role="button"
                tabIndex={mealToggleDisabled ? -1 : 0}
                aria-pressed={meal.checked}
                aria-disabled={mealToggleDisabled}
                aria-label={
                  meal.checked
                    ? `Repas pris : ${meal.nom}. Toucher pour annuler`
                    : `Repas non pris : ${meal.nom}. Toucher pour marquer comme pris`
                }
                onClick={activateMealToggle}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  activateMealToggle();
                }}
                className={`relative z-[1] block w-full touch-manipulation select-none text-left outline-none transition active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
                  mealToggleDisabled ? "cursor-not-allowed opacity-55" : "cursor-pointer"
                }`}
              >
                <div className="pointer-events-none flex w-full items-start gap-2.5 p-2.5">
                  <div className="relative">
                    <MealImage meal={meal.meal} size="xs" hideImage={meal.meal.hideImage} />
                    {meal.checked ? (
                      <div className="pointer-events-none absolute inset-0 rounded-lg bg-brand-900/25" aria-hidden />
                    ) : null}
                  </div>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-[8px] font-black uppercase tracking-[0.14em] ${
                        meal.checked ? "text-white/75" : "text-brand-600"
                      }`}
                    >
                      {meal.typeLabel}
                    </span>
                    <span
                      className={`mt-1 line-clamp-2 block text-[11px] font-bold leading-snug ${
                        meal.checked ? "text-white drop-shadow-sm" : "text-ink"
                      }`}
                    >
                      {meal.nom}
                    </span>
                  </span>
                  <TaskSeal checked={meal.checked} onHonoredCard={meal.checked} />
                </div>
                <div className="pointer-events-none">
                  <MealDoneToggleBar checked={meal.checked} />
                </div>
              </div>
              <div
                className={`relative z-[2] border-t ${meal.checked ? "border-white/20" : "border-brand-100"}`}
              >
                {meal.unavailable ? (
                  <p
                    className={`px-2.5 py-2 text-[10px] font-semibold leading-snug ${
                      meal.checked ? "bg-black/25 text-white/90" : "bg-brand-50 text-brand-800"
                    }`}
                  >
                    Ajustez vos allergènes ou vos exclusions dans les réglages pour débloquer un repas.
                  </p>
                ) : null}
                <button
                  type="button"
                  disabled={meal.unavailable}
                  onClick={(event) => {
                    event.stopPropagation();
                    onMealExpand(meal.key, "portions");
                  }}
                  className={`w-full py-1.5 text-[10px] font-bold uppercase tracking-wide transition ${
                    meal.checked
                      ? portionsPanelOpen
                        ? "bg-white/20 text-white ring-1 ring-inset ring-white/25"
                        : "bg-black/15 text-white/90 hover:bg-black/25"
                      : portionsPanelOpen
                        ? "bg-brand-100 text-brand-900"
                        : "bg-brand-50/80 text-brand-800 hover:bg-brand-100"
                  }`}
                >
                  {portionsPanelOpen ? "Portions affichées" : "Voir les portions"}
                </button>
                {canEdit && !isFutureDay && !meal.unavailable ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onMealExpand(meal.key, "swap");
                    }}
                    className={`w-full border-t py-1.5 text-[10px] font-bold uppercase tracking-wide transition ${
                      meal.checked
                        ? expandedMealKey === meal.key
                          ? "border-white/15 bg-white/15 text-white hover:bg-white/20"
                          : "border-white/15 bg-black/10 text-white/80 hover:bg-black/20"
                        : expandedMealKey === meal.key
                          ? "border-brand-100 bg-brand-100 text-brand-900"
                          : "border-brand-100 bg-white/60 text-brand-700 hover:bg-brand-50"
                    }`}
                  >
                    Changer de repas
                  </button>
                ) : null}
              </div>
            </div>
            );
          })}

          <div
            className={`relative flex flex-col overflow-hidden rounded-2xl border-2 transition-all duration-300 ${taskBrickClasses(
              waterChecked,
              canPulse && !waterChecked,
            )}`}
          >
            <TrackingTaskImage kind="water" />
            <TaskWhyTodayTrigger
              onOpen={() =>
                openWhy(`Eau · ${formatLitersFrFromMl(waterTargetMl)} visés`, waterWhyToday, {
                  type: "tracking",
                  kind: "water",
                })
              }
              className="left-1.5 top-1.5"
            />
            <div className="relative flex min-h-[4.5rem] flex-1 flex-col justify-between p-2.5">
              <GameBrickShine done={waterChecked} />
              <div className="relative flex items-baseline justify-between gap-1">
                <span
                  className={`text-[8px] font-black uppercase tracking-[0.14em] ${
                    waterChecked ? "text-white/75" : "text-brand-600"
                  }`}
                >
                  Eau
                </span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                    waterChecked ? "bg-black/20 text-white/90" : "bg-brand-100 text-brand-800"
                  }`}
                >
                  {waterPercent}%
                </span>
              </div>
              <p
                className={`relative text-[18px] font-black tabular-nums leading-none ${
                  waterChecked ? "text-white drop-shadow-sm" : "text-ink"
                }`}
              >
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
                className={`task-range relative h-1 w-full cursor-pointer disabled:opacity-40 ${
                  waterChecked ? "task-range-honored accent-white" : "task-range-open accent-brand-600"
                }`}
              />
            </div>
          </div>

          <div
            className={`relative flex flex-col overflow-hidden rounded-2xl border-2 transition-all duration-300 ${taskBrickClasses(
              stepsChecked,
              canPulse && !stepsChecked,
            )}`}
          >
            <TrackingTaskImage kind="steps" />
            <TaskWhyTodayTrigger
              onOpen={() =>
                openWhy(
                  `Pas · ${stepsTarget.toLocaleString("fr-FR")} recommandés`,
                  stepsWhyToday,
                  { type: "tracking", kind: "steps" },
                )
              }
              className="left-1.5 top-1.5"
            />
            <div className="relative flex min-h-[4.5rem] flex-1 flex-col justify-between p-2.5">
              <GameBrickShine done={stepsChecked} />
              <div className="relative flex items-baseline justify-between gap-1">
                <span
                  className={`text-[8px] font-black uppercase tracking-[0.14em] ${
                    stepsChecked ? "text-white/75" : "text-brand-600"
                  }`}
                >
                  Pas
                </span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                    stepsChecked ? "bg-black/20 text-white/90" : "bg-brand-100 text-brand-800"
                  }`}
                >
                  {stepsPercent}%
                </span>
              </div>
              <p
                className={`relative text-[18px] font-black tabular-nums leading-none ${
                  stepsChecked ? "text-white drop-shadow-sm" : "text-ink"
                }`}
              >
                {stepsCurrent.toLocaleString("fr-FR")}
                <span
                  className={`text-[10px] font-semibold ${stepsChecked ? "text-white/75" : "text-brand-500"}`}
                >
                  {" "}
                  / {stepsTarget.toLocaleString("fr-FR")}
                </span>
              </p>
              <div
                className={`relative h-1 w-full overflow-hidden rounded-full ${
                  stepsChecked ? "bg-black/25" : "bg-brand-200"
                }`}
                role="progressbar"
                aria-valuenow={stepsCurrent}
                aria-valuemin={0}
                aria-valuemax={stepsTarget}
                aria-label="Progression des pas"
              >
                <div
                  className={`h-full rounded-full transition-[width] duration-300 ${
                    stepsChecked ? "bg-white/90" : "bg-gradient-to-r from-brand-600 to-accent"
                  }`}
                  style={{ width: `${Math.min(100, stepsPercent)}%` }}
                />
              </div>
              {stepsStatusLabel ? (
                <p
                  className={`relative text-[8px] font-bold uppercase tracking-wide ${
                    stepsChecked ? "text-white/75" : "text-brand-600"
                  }`}
                >
                  {stepsStatusLabel}
                </p>
              ) : null}
              {stepsHint ? (
                <p
                  className={`relative text-[8px] font-medium leading-snug ${
                    stepsChecked ? "text-white/80" : "text-ink-muted"
                  }`}
                >
                  {stepsHint}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {expandedMealKey && expandedMealPanel ? (
          <div
            ref={expandedPanelRef}
            className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/95 p-3.5 shadow-[0_16px_40px_rgba(61,42,74,0.28)] ring-1 ring-brand-200/50 backdrop-blur-xl scroll-mt-[max(3.5rem,calc(env(safe-area-inset-top,0px)+2.75rem))]"
          >
            {expandedMealPanel}
          </div>
        ) : null}

        {isDayValidated ? (
          <p className="relative text-center text-[13px] font-black uppercase tracking-wide text-white drop-shadow-sm">
            Journée honorée
          </p>
        ) : (
          <p className="relative text-center text-[13px] font-semibold leading-snug text-brand-100">
            Touchez une carte repas pour la marquer comme prise.
          </p>
        )}
      </div>
      <TaskWhyTodaySheet open={whySheet} onClose={() => setWhySheet(null)} />
    </div>
  );
}
