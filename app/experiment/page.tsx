"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, PanelTitle, Segmented } from "@/components/ui/primitives";
import { BLOCK_SIZES, bestBlockSize, experimentStats } from "@/lib/analytics";
import { useToday } from "@/lib/hooks";
import { useLocale } from "@/lib/locale-context";
import { storage } from "@/lib/storage";
import { formatDayShort, formatDuration } from "@/lib/time";
import type { ExperimentSession, Interval } from "@/types/time";

type Run = { blockSize: Interval; startedAt: number };

export default function ExperimentPage() {
  const { key: todayKey } = useToday();
  const { locale, t } = useLocale();

  const [blockSize, setBlockSize] = useState<Interval>(15);
  const [run, setRun] = useState<Run | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [sessions, setSessions] = useState<ExperimentSession[]>([]);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const runRef = useRef<Run | null>(null);
  runRef.current = run;

  useEffect(() => {
    storage.getExperimentSessions().then(setSessions);
  }, []);

  const record = useCallback(
    async (outcome: ExperimentSession["outcome"], elapsedSeconds: number, current: Run) => {
      const session = {
        date: todayKey,
        blockSize: current.blockSize,
        startedAt: new Date(current.startedAt).toISOString(),
        endedAt: new Date().toISOString(),
        elapsedMinutes: Math.max(1, Math.round(elapsedSeconds / 60)),
        outcome,
      };
      await storage.createExperimentSession(session);
      setSessions(await storage.getExperimentSessions());
      setLastResult(
        outcome === "focused"
          ? t("experiment.held", { minutes: current.blockSize })
          : t("experiment.interrupted", { duration: formatDuration(session.elapsedMinutes, locale) }),
      );
    },
    [todayKey, locale, t],
  );

  /* The tick. Completing the full block is the whole point, so it self-files. */
  useEffect(() => {
    if (!run) return;
    const id = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - run.startedAt) / 1000);
      setSeconds(elapsed);
      if (elapsed >= run.blockSize * 60) {
        setRun(null);
        setSeconds(0);
        void record("focused", run.blockSize * 60, run);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [run, record]);

  const stats = useMemo(() => experimentStats(sessions), [sessions]);
  const best = useMemo(() => bestBlockSize(stats), [stats]);
  const recent = useMemo(() => [...sessions].reverse().slice(0, 9), [sessions]);

  const totalSeconds = (run?.blockSize ?? blockSize) * 60;
  const remaining = Math.max(0, totalSeconds - seconds);
  const progress = run ? Math.min(1, seconds / totalSeconds) : 0;

  const start = () => {
    setLastResult(null);
    setSeconds(0);
    setRun({ blockSize, startedAt: Date.now() });
  };

  const interrupt = () => {
    const current = runRef.current;
    if (!current) return;
    setRun(null);
    void record("interrupted", Math.floor((Date.now() - current.startedAt) / 1000), current);
    setSeconds(0);
  };

  return (
    <div>
      <header className="mb-7">
        <p className="text-[13px] text-muted">{t("experiment.context")}</p>
        <h1 className="ask mt-1.5 text-[clamp(28px,4vw,38px)] text-ink">{t("experiment.question")}</h1>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-5">
          <Card className="p-6">
            <PanelTitle aside={t(run ? "experiment.running" : "experiment.ready")}>
              {t("experiment.run")}
            </PanelTitle>

            <div className="mt-5">
              <Segmented
                options={BLOCK_SIZES.map((size) => ({
                  value: size,
                  label: t("settings.minutes", { count: size }),
                }))}
                value={run?.blockSize ?? blockSize}
                onChange={(size) => {
                  if (run) return;
                  setBlockSize(size);
                }}
                label={t("experiment.blockSize")}
              />
            </div>

            <div className="mt-8 flex flex-wrap items-end justify-between gap-6">
              <div>
                <div className="figure text-[clamp(56px,9vw,84px)] font-normal text-ink">
                  {formatClock(run ? remaining : totalSeconds)}
                </div>
                <p className="mt-2 text-[13px] text-muted">
                  {t(run ? "experiment.holding" : "experiment.idle")}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {run ? (
                  <Button variant="secondary" onClick={interrupt}>
                    {t("experiment.distracted")}
                  </Button>
                ) : (
                  <Button variant="primary" onClick={start}>
                    {t("experiment.start")}
                  </Button>
                )}
              </div>
            </div>

            {/* A ruler again: quarter marks, so progress is read rather than guessed. */}
            <div className="relative mt-7 h-[10px] overflow-hidden rounded-full bg-[#eef0f0]">
              <div
                className="h-full rounded-full bg-ink transition-[width] duration-1000 ease-linear"
                style={{ width: `${progress * 100}%` }}
              />
              {[0.25, 0.5, 0.75].map((mark) => (
                <span
                  key={mark}
                  className="absolute inset-y-0 w-px bg-surface/70"
                  style={{ left: `${mark * 100}%` }}
                  aria-hidden="true"
                />
              ))}
            </div>

            {lastResult ? (
              <p className="mt-4 text-[13px] text-ink-soft" role="status">
                {lastResult}
              </p>
            ) : null}
          </Card>

          {recent.length > 0 ? (
            <Card className="p-5">
              <PanelTitle aside={t("experiment.recentAside")}>{t("experiment.recent")}</PanelTitle>
              <ul className="mt-2 divide-y divide-hairline">
                {recent.map((session) => (
                  <li key={session.id} className="flex items-center gap-3 py-2.5 text-[13px]">
                    <span
                      className={`h-[7px] w-[7px] shrink-0 rounded-full ${
                        session.outcome === "focused" ? "bg-ink" : "border border-[#c3c8c8]"
                      }`}
                      aria-hidden="true"
                    />
                    <span className="w-[58px] shrink-0 tabular-nums text-ink">
                      {t("settings.minutes", { count: session.blockSize })}
                    </span>
                    <span className="text-ink-soft">
                      {session.outcome === "focused"
                        ? t("experiment.heldToEnd")
                        : t("experiment.stoppedAt", {
                            duration: formatDuration(session.elapsedMinutes, locale),
                          })}
                    </span>
                    <span className="ml-auto shrink-0 text-[12px] text-faint">
                      {formatDayShort(session.date, locale)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>

        <div className="grid gap-5">
          <Card className="p-5">
            <PanelTitle aside={t("experiment.sessions", { count: sessions.length })}>
              {t("experiment.results")}
            </PanelTitle>

            <div className="mt-4 divide-y divide-hairline">
              {stats.map((entry) => (
                <div key={entry.blockSize} className="py-3.5 first:pt-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[13.5px] font-medium tabular-nums text-ink">
                      {t("settings.minutes", { count: entry.blockSize })}
                    </span>
                    <span className="figure text-[22px] font-medium text-ink">
                      {entry.sessions > 0 ? `${entry.focusRate}%` : "—"}
                    </span>
                  </div>
                  <div className="mt-2 h-[5px] overflow-hidden rounded-full bg-[#eff1f1]">
                    <div
                      className="h-full rounded-full bg-ink transition-[width] duration-500"
                      style={{ width: `${entry.focusRate}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-[12px] tabular-nums text-faint">
                    <span>
                      {t(entry.sessions === 1 ? "experiment.session" : "experiment.sessions", {
                        count: entry.sessions,
                      })}
                    </span>
                    <span>
                      {entry.minutes > 0
                        ? t("experiment.heldTotal", { duration: formatDuration(entry.minutes, locale) })
                        : t("experiment.noTimeYet")}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-4 border-t border-hairline pt-3 text-[12px] leading-relaxed text-faint">
              {t("experiment.rateNote")}
            </p>
          </Card>

          <Card className="p-5">
            <PanelTitle>{t("experiment.suggests")}</PanelTitle>
            <p className="mt-3 text-[13.5px] leading-relaxed text-ink-soft">
              {best
                ? t("experiment.best", {
                    size: best.blockSize,
                    rate: best.focusRate,
                    runs: best.sessions,
                  })
                : t("experiment.needMore")}
            </p>
            {sessions.length > 0 ? (
              <button
                type="button"
                onClick={async () => {
                  await storage.clearExperimentSessions();
                  setSessions([]);
                  setLastResult(null);
                }}
                className="mt-4 text-[12.5px] text-muted underline underline-offset-2 hover:text-ink"
              >
                {t("experiment.clear")}
              </button>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  );
}

function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
