"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MessageKey } from "@/lib/i18n";
import { useT } from "@/lib/locale-context";

const NAV: { href: string; key: MessageKey }[] = [
  { href: "/", key: "nav.today" },
  { href: "/dashboard", key: "nav.dashboard" },
  { href: "/history", key: "nav.history" },
  { href: "/routines", key: "nav.routines" },
  // Experiment still lives at /experiment; it is out of the nav until it earns
  // its place back.
  { href: "/settings", key: "nav.settings" },
];

/** Three ticks of decreasing length — the measuring mark the whole app is built on. */
function RulerMark() {
  return (
    <svg width="16" height="18" viewBox="0 0 16 18" fill="none" aria-hidden="true">
      <path d="M1 2h14M1 9h9M1 16h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  );
}

/**
 * Equal bars on purpose. The wordmark beside it is three ticks of decreasing
 * length, and a menu icon echoing that shape would read as a second logo.
 */
function MenuMark({ open }: { open: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      {open ? (
        <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      ) : (
        <path d="M2 5h14M2 9h14M2 13h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      )}
    </svg>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useT();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  // Arriving somewhere new closes the menu, so it never covers the page you asked for.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1180px] items-center gap-8 px-5 sm:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-2.5 text-ink">
            <RulerMark />
            <span className="text-[15px] font-semibold tracking-[-0.02em]">Day Analysis</span>
          </Link>

          {/* Wide enough for the whole list: show it, and skip the menu entirely. */}
          <nav className="hidden flex-1 items-center justify-end gap-0.5 sm:flex">
            {NAV.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative shrink-0 rounded-md px-3 py-2 text-[13.5px] transition-colors ${
                    active ? "text-ink" : "text-muted hover:text-ink-soft"
                  }`}
                >
                  {t(item.key)}
                  {active ? (
                    <span className="absolute inset-x-3 -bottom-[9px] h-[2px] rounded-full bg-ink" />
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            aria-controls="app-menu"
            aria-label={t(open ? "nav.closeMenu" : "nav.openMenu")}
            className="-mr-2 ml-auto flex h-10 w-10 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-[#eceeee] hover:text-ink sm:hidden"
          >
            <MenuMark open={open} />
          </button>
        </div>

        {open ? (
          <nav id="app-menu" className="border-t border-hairline bg-paper sm:hidden">
            <ul className="mx-auto max-w-[1180px] px-2 py-2">
              {NAV.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-lg px-3 py-3 text-[15px] transition-colors ${
                        active ? "bg-[#eceeee] font-medium text-ink" : "text-ink-soft"
                      }`}
                    >
                      {/* The same tick the desktop nav underlines with, stood up. */}
                      <span
                        className={`h-[14px] w-[2px] rounded-full ${active ? "bg-ink" : "bg-transparent"}`}
                        aria-hidden="true"
                      />
                      {t(item.key)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        ) : null}
      </header>

      <main className="mx-auto max-w-[1180px] px-5 pb-24 pt-8 sm:px-8 sm:pt-10">{children}</main>
    </div>
  );
}
