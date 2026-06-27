"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const NAV = [
  { id: "use-case", label: "Operations" },
  { id: "workflow", label: "Workflow" },
  { id: "buyers", label: "Buyers" },
] as const;

/**
 * Sticky dark-glass command bar for the landing page. Enterprise B2B feel:
 * backdrop blur, restrained brand glow, a scroll-spy active-section indicator,
 * and a premium CTA. Logo mark is preserved as-is.
 */
export function LandingHeader() {
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    const sections = NAV.map((n) => document.getElementById(n.id)).filter(
      (el): el is HTMLElement => !!el,
    );
    if (!sections.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      // mark a section active once it reaches the upper-middle of the viewport
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return (
    <header className="sticky top-0 z-50">
      <div className="relative border-b border-[var(--border)]/70 bg-[color-mix(in_srgb,var(--background)_70%,transparent)] backdrop-blur-xl">
        {/* very soft brand glow, center-top */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-12 mx-auto h-24 w-[460px] rounded-full bg-[var(--brand)] opacity-[0.09] blur-[64px]"
        />
        <nav
          className="relative mx-auto flex max-w-6xl items-center gap-4 px-5 py-3.5 sm:px-6"
          aria-label="Primary"
        >
          {/* left: logo + descriptor */}
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-semibold tracking-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--brand)]"
            >
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-b from-[var(--brand)] to-[var(--brand-2)] shadow-[0_2px_10px_var(--brand-glow)]">
                🩸
              </span>
              Sanguine
            </Link>
            <span className="hidden items-center gap-2.5 lg:flex">
              <span className="h-4 w-px bg-[var(--border)]" />
              <span className="truncate text-xs font-medium text-[var(--muted)]">
                Regional blood coordination
              </span>
            </span>
          </div>

          {/* center: nav links with active indicator */}
          <div className="hidden flex-1 justify-center md:flex">
            <div className="flex items-center gap-9">
              {NAV.map((n) => {
                const isActive = active === n.id;
                return (
                  <a
                    key={n.id}
                    href={`#${n.id}`}
                    aria-current={isActive ? "true" : undefined}
                    className={`relative py-1 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--brand)] ${
                      isActive
                        ? "text-[var(--foreground)]"
                        : "text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {n.label}
                    <span
                      className={`absolute -bottom-0.5 left-0 h-px w-full origin-left rounded-full bg-[var(--brand)] transition-transform duration-300 ${
                        isActive ? "scale-x-100" : "scale-x-0"
                      }`}
                    />
                  </a>
                );
              })}
            </div>
          </div>

          {/* right: CTA */}
          <div className="flex flex-1 items-center justify-end">
            <Link
              href="/console"
              className="rounded-xl bg-gradient-to-b from-[var(--brand)] to-[var(--brand-2)] px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_18px_var(--brand-glow)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_8px_28px_var(--brand-glow)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
            >
              <span className="hidden sm:inline">Launch surge simulation →</span>
              <span className="sm:hidden">Launch simulation →</span>
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
