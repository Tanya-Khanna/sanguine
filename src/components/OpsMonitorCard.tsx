"use client";

import { useEffect, useState } from "react";

/**
 * Surge Operations Monitor — an enterprise-style live card for the hero.
 * On load it plays a short, looping workflow that explains the product without
 * extra copy: two hospitals request the same unit, one reservation is confirmed,
 * the other is rerouted, and duplicate commitments stay at zero. Respects
 * prefers-reduced-motion (jumps straight to the resolved end state).
 */

const TOTAL_PHASES = 5;
const CYCLE = TOTAL_PHASES + 3; // a few ticks of "hold" before it replays

// Inventory layout for the mini grid (deterministic, calm).
const COLS = 7;
const ROWS = 4;
const CONTESTED = 17; // the unit two hospitals fight over (#1182)
const REROUTE = 19; // the next-best match (#1190)
const LIMITED = new Set([3, 10, 24]); // amber: limited / expiring soon

export function OpsMonitorCard() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setTick(TOTAL_PHASES); // resolved end-state, no motion
      return;
    }
    const id = setInterval(() => setTick((t) => (t + 1) % CYCLE), 1100);
    return () => clearInterval(id);
  }, []);

  const phase = Math.min(tick, TOTAL_PHASES);

  return (
    <div
      className="fade-up relative"
      style={{ animationDelay: "120ms" }}
      role="img"
      aria-label="Live operations monitor: City Hospital and Memorial Hospital both request Unit 1182. Sanguine confirms one reservation and reroutes the second to Unit 1190, keeping duplicate commitments at zero."
    >
      <div className="rounded-3xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--panel)_82%,transparent)] p-5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)] backdrop-blur-xl sm:p-6">
        {/* header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand)]" />
            Surge Operations Monitor
          </div>
          <span className="flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--available)] opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--available)]" />
            </span>
            Monitoring
          </span>
        </div>

        <div className="my-4 h-px w-full bg-[var(--border)]" />

        {/* metric + status pill */}
        <div className="flex items-end justify-between gap-3">
          <HeroMetric />
          <StatusPill tone="ok" label="Allocation protected" />
        </div>

        {/* operational status chips */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          <Chip label="Reservation protected" active={phase >= 3} />
          <Chip label="Inventory synced" active={phase >= 4} />
          <Chip label="Audit log updated" active={phase >= 5} />
        </div>

        {/* inventory grid */}
        <div className="mt-4">
          <InventoryGrid phase={phase} />
          <Legend />
        </div>

        {/* workflow event stack */}
        <div className="mt-4 space-y-1.5" aria-hidden>
          <EventLogRow n={1} active={phase >= 1} text="Request received — City Hospital" />
          <EventLogRow n={2} active={phase >= 2} text="Request received — Memorial Hospital" />
          <EventLogRow
            n={3}
            active={phase >= 3}
            text="Unit #1182 reserved once"
            badge={{ label: "Confirmed", tone: "ok" }}
          />
          <EventLogRow
            n={4}
            active={phase >= 4}
            text="Memorial rerouted to Unit #1190"
            badge={{ label: "Rerouted", tone: "info" }}
          />
          <EventLogRow n={5} active={phase >= 5} text="Audit log updated" badge={{ label: "Logged", tone: "muted" }} />
        </div>

        {/* summary log line */}
        <div
          className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--background)]/60 px-3.5 py-3 text-xs leading-relaxed text-[var(--muted)] transition-opacity duration-500"
          style={{ opacity: phase >= 5 ? 1 : 0.35 }}
        >
          <span className="text-[var(--foreground)]">City Hospital</span> and{" "}
          <span className="text-[var(--foreground)]">Memorial Hospital</span> both requested{" "}
          <span className="text-[var(--foreground)]">Unit #1182</span>. Sanguine confirmed one
          reservation and rerouted the second request to{" "}
          <span className="text-[var(--foreground)]">Unit #1190</span>.
        </div>
      </div>
    </div>
  );
}

function HeroMetric() {
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-6xl font-extrabold leading-none tracking-tight tabular-nums text-[var(--available)]">
          0
        </span>
      </div>
      <div className="mt-1.5 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
        duplicate commitments
      </div>
    </div>
  );
}

function StatusPill({ tone, label }: { tone: "ok" | "info" | "muted"; label: string }) {
  const map = {
    ok: { c: "var(--available)", bg: "rgba(52,211,153,0.12)", b: "rgba(52,211,153,0.35)" },
    info: { c: "var(--allocated)", bg: "rgba(91,155,255,0.12)", b: "rgba(91,155,255,0.35)" },
    muted: { c: "var(--muted)", bg: "rgba(139,149,171,0.10)", b: "var(--border)" },
  }[tone];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
      style={{ color: map.c, background: map.bg, borderColor: map.b }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: map.c }} />
      {label}
    </span>
  );
}

function Chip({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all duration-500"
      style={{
        color: active ? "var(--available)" : "var(--muted)",
        borderColor: active ? "rgba(52,211,153,0.35)" : "var(--border)",
        background: active ? "rgba(52,211,153,0.08)" : "transparent",
        opacity: active ? 1 : 0.6,
      }}
    >
      <span
        className="grid h-3 w-3 place-items-center rounded-full text-[8px] transition-colors duration-500"
        style={{ background: active ? "var(--available)" : "var(--border)", color: "#08121a" }}
      >
        {active ? "✓" : ""}
      </span>
      {label}
    </span>
  );
}

function InventoryGrid({ phase }: { phase: number }) {
  const cells = Array.from({ length: COLS * ROWS });
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }} aria-hidden>
      {cells.map((_, i) => {
        const isContested = i === CONTESTED;
        const isReroute = i === REROUTE;
        const isLimited = LIMITED.has(i);

        let bg = "var(--available)";
        let opacity = 0.2;
        let cls = "";

        if (isContested && phase >= 2) {
          bg = "var(--double)";
          opacity = 1;
          if (phase < 4) cls = "contested-pulse";
          else opacity = 0.92; // reservation resolved, stays claimed
        } else if (isReroute && phase >= 4) {
          bg = "var(--allocated)";
          opacity = 0.95;
        } else if (isLimited) {
          bg = "var(--held)";
          opacity = 0.55;
        }

        return (
          <span
            key={i}
            className={`aspect-square rounded-[5px] transition-all duration-500 ${cls}`}
            style={{ background: bg, opacity }}
          />
        );
      })}
    </div>
  );
}

function Legend() {
  const items: [string, string][] = [
    ["var(--available)", "available"],
    ["var(--held)", "limited / expiring"],
    ["var(--double)", "contested"],
  ];
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[var(--muted)]">
      {items.map(([c, l]) => (
        <span key={l} className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-sm" style={{ background: c }} />
          {l}
        </span>
      ))}
    </div>
  );
}

function EventLogRow({
  n,
  active,
  text,
  badge,
}: {
  n: number;
  active: boolean;
  text: string;
  badge?: { label: string; tone: "ok" | "info" | "muted" };
}) {
  const badgeColor = badge
    ? { ok: "var(--available)", info: "var(--allocated)", muted: "var(--muted)" }[badge.tone]
    : undefined;
  return (
    <div
      className="flex items-center gap-2.5 transition-all duration-500"
      style={{ opacity: active ? 1 : 0.28, transform: active ? "translateY(0)" : "translateY(3px)" }}
    >
      <span
        className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold transition-colors duration-500"
        style={{
          background: active ? "var(--panel-2)" : "transparent",
          border: `1px solid ${active ? "var(--border)" : "var(--border)"}`,
          color: active ? "var(--foreground)" : "var(--muted)",
        }}
      >
        {n}
      </span>
      <span className="flex-1 truncate text-xs text-[var(--foreground)]">{text}</span>
      {badge && (
        <span
          className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold transition-opacity duration-500"
          style={{
            color: badgeColor,
            background: `color-mix(in srgb, ${badgeColor} 14%, transparent)`,
            opacity: active ? 1 : 0,
          }}
        >
          {badge.label}
        </span>
      )}
    </div>
  );
}
