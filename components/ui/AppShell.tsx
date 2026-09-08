"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Today" },
  { href: "/history", label: "History" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/experiment", label: "Experiment" },
  { href: "/settings", label: "Settings" },
];

/** Three ticks of decreasing length — the measuring mark the whole app is built on. */
function RulerMark() {
  return (
    <svg width="16" height="18" viewBox="0 0 16 18" fill="none" aria-hidden="true">
      <path d="M1 2h14M1 9h9M1 16h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1180px] items-center gap-8 px-5 sm:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-2.5 text-ink">
            <RulerMark />
            <span className="text-[15px] font-semibold tracking-[-0.02em]">Day Analysis</span>
          </Link>

          <nav className="-mx-1 flex flex-1 items-center gap-0.5 overflow-x-auto [-ms-overflow-style:none] [mask-image:linear-gradient(to_right,transparent_0,#000_12px,#000_calc(100%-24px),transparent_100%)] [scrollbar-width:none] sm:[mask-image:none] sm:justify-end">
            {NAV.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative shrink-0 rounded-md px-3 py-2 text-[13.5px] transition-colors ${
                    active ? "text-ink" : "text-muted hover:text-ink-soft"
                  }`}
                >
                  {item.label}
                  {active ? (
                    <span className="absolute inset-x-3 -bottom-[9px] h-[2px] rounded-full bg-ink" />
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-5 pb-24 pt-8 sm:px-8 sm:pt-10">{children}</main>
    </div>
  );
}
