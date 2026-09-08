"use client";

import { useEffect, useState } from "react";
import { Button, Card } from "@/components/ui/primitives";
import { dismissLocalArchive, readLocalArchive, type LocalArchive } from "@/lib/local-archive";
import { storage } from "@/lib/storage";

/**
 * Offered once, to anyone whose browser still holds days recorded before this
 * app had accounts. Uploading replaces whatever the account holds, which is
 * why it says so and why it is a deliberate press rather than something that
 * happens on sign-in.
 */
export function LocalArchiveNotice({ onImported }: { onImported: () => void }) {
  const [archive, setArchive] = useState<LocalArchive | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setArchive(readLocalArchive()), []);

  if (!archive) return null;

  return (
    <Card className="mb-5 p-5">
      <h2 className="text-[13.5px] font-semibold tracking-[-0.01em] text-ink">
        Days recorded in this browser
      </h2>
      <p className="mt-2 max-w-[64ch] text-[13.5px] leading-relaxed text-muted">
        This browser still holds{" "}
        <span className="font-medium tabular-nums text-ink">
          {archive.blocks} {archive.blocks === 1 ? "block" : "blocks"}
        </span>{" "}
        across{" "}
        <span className="font-medium tabular-nums text-ink">
          {archive.days} {archive.days === 1 ? "day" : "days"}
        </span>{" "}
        from before you signed in. Move them into your account and they follow you to your phone.
        Anything already in the account is replaced.
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
              setError(cause instanceof Error ? cause.message : "The upload did not finish.");
            }
          }}
        >
          {busy ? "Moving…" : "Move them in"}
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
          Not now
        </Button>
      </div>

      {error ? (
        <p className="mt-3 text-[13px] font-medium text-ink" role="alert">
          {error}
        </p>
      ) : null}

      <p className="mt-3 text-[12px] text-faint">
        Dismissing leaves the browser copy untouched, so nothing is lost either way.
      </p>
    </Card>
  );
}
