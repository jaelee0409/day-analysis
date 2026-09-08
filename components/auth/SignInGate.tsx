"use client";

import { useState } from "react";
import { Button } from "@/components/ui/primitives";
import { useAuth } from "@/lib/auth-context";
import { isSupabaseConfigured } from "@/lib/supabase";

/** Google's mark, drawn rather than fetched, so the button costs no request. */
function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

/**
 * Nothing renders until we know who is looking. The app holds one person's
 * record of their own days, so there is no useful signed-out state to show.
 */
export function SignInGate({ children }: { children: React.ReactNode }) {
  const { session, ready, signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto max-w-[520px] px-6 py-24">
        <h1 className="ask text-[28px] text-ink">This copy is not connected to a database.</h1>
        <p className="mt-3 text-[13.5px] leading-relaxed text-muted">
          Set <code className="tabular-nums">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="tabular-nums">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>, then reload. See
          supabase/README.md.
        </p>
      </div>
    );
  }

  // A blank hold rather than a spinner: the session usually resolves in a frame
  // and a flash of "loading" reads worse than a beat of nothing.
  if (!ready) return <div className="h-[60vh]" aria-hidden="true" />;

  if (!session) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-[420px] flex-col justify-center px-6">
        <p className="text-[13px] text-muted">Day Analysis</p>
        <h1 className="ask mt-1.5 text-[clamp(28px,5vw,36px)] text-ink">Where did your day go?</h1>
        <p className="mt-4 max-w-[46ch] text-[13.5px] leading-relaxed text-muted">
          Sign in and your days follow you between this browser and your phone. Nothing is shared with
          anyone else.
        </p>

        <div className="mt-7">
          <Button
            variant="primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await signInWithGoogle();
              } catch (cause) {
                setBusy(false);
                setError(cause instanceof Error ? cause.message : "Sign-in could not start.");
              }
            }}
          >
            <span className="rounded-[3px] bg-white p-[3px]">
              <GoogleMark />
            </span>
            {busy ? "Opening Google…" : "Continue with Google"}
          </Button>
        </div>

        {error ? (
          <p className="mt-4 text-[13px] font-medium text-ink" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return <>{children}</>;
}
