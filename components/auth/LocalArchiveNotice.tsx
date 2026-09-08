"use client";

import { useEffect, useState } from "react";
import { Button, Card } from "@/components/ui/primitives";
import { dismissLocalArchive, readLocalArchive, type LocalArchive } from "@/lib/local-archive";
import { useT } from "@/lib/locale-context";
import { storage } from "@/lib/storage";

/**
 * Offered once, to anyone whose browser still holds days recorded before this
 * app had accounts. Uploading replaces whatever the account holds, which is
 * why it says so and why it is a deliberate press rather than something that
 * happens on sign-in.
 */
export function LocalArchiveNotice({ onImported }: { onImported: () => void }) {
  const t = useT();
  const [archive, setArchive] = useState<LocalArchive | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setArchive(readLocalArchive()), []);

  if (!archive) return null;

  return (
    <Card className="mb-5 p-5">
      <h2 className="text-[13.5px] font-semibold tracking-[-0.01em] text-ink">{t("archive.title")}</h2>
      <p className="mt-2 max-w-[64ch] text-[13.5px] leading-relaxed text-muted">
        {t("archive.body", {
          blocks: t("settings.importBlocks", { count: archive.blocks }),
          days: t("settings.importDays", { count: archive.days }),
        })}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              await storage.replaceAll(archive.payload);
              dismissLocalArchive();
              setArchive(null);
              onImported();
            } catch (cause) {
              setBusy(false);
              setError(cause instanceof Error ? cause.message : t("archive.failed"));
            }
          }}
        >
          {busy ? t("archive.moving") : t("archive.move")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => {
            dismissLocalArchive();
            setArchive(null);
          }}
        >
          {t("archive.notNow")}
        </Button>
      </div>

      {error ? (
        <p className="mt-3 text-[13px] font-medium text-ink" role="alert">
          {error}
        </p>
      ) : null}

      <p className="mt-3 text-[12px] text-faint">{t("archive.footnote")}</p>
    </Card>
  );
}
