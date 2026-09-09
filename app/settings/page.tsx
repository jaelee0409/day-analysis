"use client";

import { useRef, useState } from "react";
import { HabitEditor } from "@/components/habits/HabitEditor";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { useAuth } from "@/lib/auth-context";
import { LOCALES, LOCALE_LABEL, type MessageKey } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import { Button, Card, PanelTitle, Segmented } from "@/components/ui/primitives";
import { CATEGORIES } from "@/lib/categories";
import { useSettings } from "@/lib/settings-context";
import { readExport, type ImportSummary } from "@/lib/import";
import { storage } from "@/lib/storage";
import { formatDuration, toClock, toMinutes } from "@/lib/time";
import type { ActivityCategory, Interval } from "@/types/time";

const INTERVALS: Interval[] = [15, 30, 60];

export default function SettingsPage() {
  const { settings, updateSettings, ready } = useSettings();
  const { session, signOut } = useAuth();
  const { locale, setLocale, t } = useLocale();
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [pending, setPending] = useState<{ json: string; summary: ImportSummary } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!ready) return <div className="h-[60vh]" aria-hidden="true" />;

  const dayStart = toMinutes(settings.dayStartsAt);
  const dayEnd = toClock(dayStart + 1439);

  const toggleCategory = (id: ActivityCategory) => {
    const enabled = new Set(settings.enabledCategories);
    if (enabled.has(id)) {
      if (enabled.size === 1) return; // Something has to stay pickable.
      enabled.delete(id);
    } else {
      enabled.add(id);
    }
    void updateSettings({
      enabledCategories: CATEGORIES.filter((c) => enabled.has(c.id)).map((c) => c.id),
    });
  };

  return (
    <div className="max-w-[720px]">
      <header className="mb-7">
        <p className="text-[13px] text-muted">{t("settings.label")}</p>
        <h1 className="ask mt-1.5 text-[clamp(28px,4vw,38px)] text-ink">{t("settings.question")}</h1>
      </header>

      <div className="grid gap-5">
        <Card className="p-5">
          <PanelTitle>{t("settings.language")}</PanelTitle>
          <p className="mt-2 max-w-[52ch] text-[13.5px] leading-relaxed text-muted">
            {t("settings.languageBody")}
          </p>
          <div className="mt-4">
            <Segmented
              options={LOCALES.map((value) => ({ value, label: LOCALE_LABEL[value] }))}
              value={locale}
              onChange={setLocale}
              label={t("settings.language")}
            />
          </div>
        </Card>

        <Card className="p-5">
          <PanelTitle aside={t("settings.slotsADay", { count: 1440 / settings.interval })}>
            {t("settings.interval")}
          </PanelTitle>
          <p className="mt-2 max-w-[52ch] text-[13.5px] leading-relaxed text-muted">
            {t("settings.intervalBody")}
          </p>
          <div className="mt-4">
            <Segmented
              options={INTERVALS.map((value) => ({ value, label: t("settings.minutes", { count: value }) }))}
              value={settings.interval}
              onChange={(interval) => void updateSettings({ interval })}
              label={t("settings.interval")}
            />
          </div>
        </Card>

        <Card className="p-5">
          <PanelTitle aside={t("settings.runsTo", { clock: dayEnd })}>{t("settings.dayStart")}</PanelTitle>
          <p className="mt-2 max-w-[52ch] text-[13.5px] leading-relaxed text-muted">
            {t("settings.dayStartBody")}
          </p>
          <div className="mt-4 flex items-center gap-3">
            <input
              type="time"
              step={3600}
              value={settings.dayStartsAt}
              onChange={(event) => void updateSettings({ dayStartsAt: event.target.value || "06:00" })}
              className="h-10 w-[130px] rounded-lg border border-line bg-surface px-3 text-[14px] tabular-nums text-ink focus:border-ink focus:outline-none"
            />
            <span className="text-[13px] text-faint">
              {t("settings.dayRange", {
                start: settings.dayStartsAt,
                end: dayEnd,
                total: formatDuration(1440, locale),
              })}
            </span>
          </div>
        </Card>

        <Card className="p-5">
          <PanelTitle
            aside={t("settings.categoriesOn", {
              on: settings.enabledCategories.length,
              total: CATEGORIES.length,
            })}
          >
            {t("settings.categories")}
          </PanelTitle>
          <p className="mt-2 max-w-[52ch] text-[13.5px] leading-relaxed text-muted">
            {t("settings.categoriesBody")}
          </p>
          <ul className="mt-4 divide-y divide-hairline">
            {CATEGORIES.map((meta) => {
              const enabled = settings.enabledCategories.includes(meta.id);
              return (
                <li key={meta.id} className="flex items-center gap-3 py-2.5">
                  <span
                    className="shrink-0 transition-colors"
                    style={{ color: enabled ? meta.color : "#c3c8c8" }}
                  >
                    <CategoryIcon id={meta.id} size={16} />
                  </span>
                  <span className={`text-[13.5px] ${enabled ? "text-ink" : "text-faint"}`}>
                    {t(`category.${meta.id}.label` as MessageKey)}
                  </span>
                  {meta.productive ? (
                    <span className="text-[11.5px] text-faint">{t("settings.countsAsFocused")}</span>
                  ) : null}
                  <label className="ml-auto flex cursor-pointer items-center gap-2">
                    <span className="sr-only">
                      {t("settings.enableCategory", {
                        label: t(`category.${meta.id}.label` as MessageKey),
                      })}
                    </span>
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() => toggleCategory(meta.id)}
                      className="peer sr-only"
                    />
                    <span className="relative h-[22px] w-[38px] rounded-full bg-[#dde1e1] transition-colors after:absolute after:left-[3px] after:top-[3px] after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-[0_1px_2px_rgba(21,23,26,0.2)] after:transition-transform after:content-[''] peer-checked:bg-ink peer-checked:after:translate-x-[16px] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink" />
                  </label>
                </li>
              );
            })}
          </ul>
        </Card>

        <HabitEditor />

        <Card className="p-5">
          <PanelTitle aside={session?.user.email ?? undefined}>{t("settings.account")}</PanelTitle>
          <p className="mt-2 max-w-[52ch] text-[13.5px] leading-relaxed text-muted">
            {t("settings.accountBody")}
          </p>
          <div className="mt-4">
            <Button variant="secondary" size="sm" onClick={() => void signOut()}>
              {t("settings.signOut")}
            </Button>
          </div>
        </Card>

        <Card className="p-5">
          <PanelTitle>{t("settings.data")}</PanelTitle>
          <p className="mt-2 max-w-[52ch] text-[13.5px] leading-relaxed text-muted">
            {t("settings.dataBody")}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                const json = await storage.exportAll();
                const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
                const link = document.createElement("a");
                link.href = url;
                link.download = `day-analysis-${new Date().toISOString().slice(0, 10)}.json`;
                link.click();
                URL.revokeObjectURL(url);
              }}
            >
              {t("settings.export")}
            </Button>

            <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
              {t("settings.import")}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                setImportError(null);
                setPending(null);
                try {
                  const json = await file.text();
                  setPending({ json, summary: readExport(json).summary });
                } catch (error) {
                  setImportError(error instanceof Error ? error.message : t("settings.unreadable"));
                }
              }}
            />

            {confirmingReset ? (
              <>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={async () => {
                    await storage.clearAll();
                    setConfirmingReset(false);
                    window.location.reload();
                  }}
                >
                  {t("settings.deleteEverything")}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmingReset(false)}>
                  {t("settings.keepIt")}
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setConfirmingReset(true)}>
                {t("settings.clear")}
              </Button>
            )}
          </div>

          {importError ? (
            <p className="mt-3 text-[13px] font-medium text-ink" role="alert">
              {importError}
            </p>
          ) : null}

          {pending ? (
            <div className="mt-4 rounded-xl border border-line bg-[#fafbfb] p-4">
              {/* One sentence, one entry: the counts are placeholders rather
                  than English fragments spliced together in JSX. */}
              <p className="text-[13.5px] leading-relaxed text-ink-soft">
                {t("settings.importSummary", {
                  blocks: t("settings.importBlocks", { count: pending.summary.blocks }),
                  days: t("settings.importDays", { count: pending.summary.days }),
                  extra: [
                    pending.summary.todos > 0
                      ? t("settings.importTodos", { count: pending.summary.todos })
                      : "",
                    pending.summary.experiments > 0
                      ? t("settings.importRuns", { count: pending.summary.experiments })
                      : "",
                    pending.summary.habits
                      ? t("settings.importHabits", { count: pending.summary.habits })
                      : "",
                  ].join(""),
                })}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={async () => {
                    await storage.replaceAll(readExport(pending.json).payload);
                    window.location.reload();
                  }}
                >
                  {t("settings.replaceEverything")}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setPending(null)}>
                  {t("common.cancel")}
                </Button>
              </div>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
