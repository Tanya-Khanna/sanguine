"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BLOOD_TYPES } from "@/lib/blood";

interface Analytics {
  totals: {
    units: number;
    available: number;
    reserved: number;
    expired: number;
    nearExpiry: number;
    doublePromisesPrevented: number;
    fillRate: number;
  };
  byType: { type: string; available: number }[];
  byCenter: {
    centerId: string;
    centerName: string;
    available: number;
    reserved: number;
    nearExpiry: number;
    total: number;
  }[];
}

interface CenterMatch {
  centerId: string;
  centerName: string;
  compatibleUnits: number;
  etaMinutes: number;
  canFulfill: boolean;
  fillsPartial: boolean;
}

export default function NetworkPage() {
  const [a, setA] = useState<Analytics | null>(null);
  const [type, setType] = useState("O-");
  const [units, setUnits] = useState(4);
  const [matches, setMatches] = useState<CenterMatch[] | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/analytics", { cache: "no-store" });
      setA(await res.json());
    } catch {
      /* retry next tick */
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 2500);
    return () => clearInterval(id);
  }, [load]);

  const discover = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/discover?type=${encodeURIComponent(type)}&units=${units}`, {
      cache: "no-store",
    });
    const d = await res.json();
    setMatches(d.centers ?? []);
    setLoading(false);
  }, [type, units]);

  useEffect(() => {
    discover();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const t = a?.totals;
  const maxType = Math.max(1, ...(a?.byType.map((x) => x.available) ?? [1]));

  return (
    <main className="mx-auto max-w-[1200px] px-5 py-5">
      {/* top bar */}
      <nav className="mb-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-b from-[var(--brand)] to-[var(--brand-2)]">
            🩸
          </span>
          Sanguine
          <span className="ml-1 hidden rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] font-normal text-[var(--muted)] sm:inline">
            Regional Network
          </span>
        </Link>
        <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
          <span className="hidden items-center gap-1.5 md:flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--available)]" />
            Live · Aurora DSQL
          </span>
          <Link href="/console" className="rounded-lg border border-[var(--border)] px-3 py-1.5 transition hover:text-[var(--foreground)]">
            Allocation console →
          </Link>
        </div>
      </nav>

      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Regional supply network</h1>
        <p className="mt-1 text-sm text-[var(--muted-2)]">
          Live visibility across every connected donation center — inventory, expiry risk, and
          where to source a request in seconds.
        </p>
      </header>

      {/* headline stats */}
      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Units in network" value={t?.units ?? "—"} />
        <Stat label="Available now" value={t?.available ?? "—"} accent="var(--available)" />
        <Stat label="At expiry risk" value={t?.nearExpiry ?? "—"} accent="var(--held)" />
        <Stat label="Double-promises prevented" value={t?.doublePromisesPrevented ?? "—"} accent="var(--available)" />
        <Stat label="Fill rate" value={t ? `${t.fillRate}%` : "—"} />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_400px]">
        {/* inventory by type */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
          <h2 className="mb-4 text-sm font-semibold">Available inventory by blood type</h2>
          <div className="space-y-2.5">
            {(a?.byType ?? []).map((row) => (
              <div key={row.type} className="flex items-center gap-3">
                <span className="w-9 shrink-0 font-mono text-sm font-semibold">{row.type}</span>
                <div className="h-5 flex-1 overflow-hidden rounded bg-[var(--panel-2)]">
                  <div
                    className="h-full rounded bg-gradient-to-r from-[var(--brand-2)] to-[var(--brand)] transition-all duration-700"
                    style={{ width: `${(row.available / maxType) * 100}%` }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right text-sm tabular-nums text-[var(--muted)]">
                  {row.available}
                </span>
              </div>
            ))}
          </div>

          {/* per-center utilization */}
          <h2 className="mb-3 mt-7 text-sm font-semibold">Donation centers</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {(a?.byCenter ?? []).map((c) => (
              <div key={c.centerId} className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-3.5">
                <div className="text-sm font-medium">{c.centerName}</div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-bold tabular-nums text-[var(--available)]">{c.available}</span>
                  <span className="text-xs text-[var(--muted)]">available</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--muted)]">
                  <span>{c.reserved} reserved</span>
                  <span style={{ color: c.nearExpiry ? "var(--held)" : undefined }}>{c.nearExpiry} expiring</span>
                  <span>{c.total} total</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* discovery tool */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
          <h2 className="text-sm font-semibold">Source a request</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Rank centers that can fulfill a request — compatible stock, soonest expiry, ETA.
          </p>
          <div className="mt-4 flex items-end gap-2">
            <label className="flex-1">
              <span className="mb-1 block text-[11px] font-medium text-[var(--muted)]">Blood type</span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
              >
                {BLOOD_TYPES.map((bt) => (
                  <option key={bt} value={bt}>
                    {bt}
                  </option>
                ))}
              </select>
            </label>
            <label className="w-20">
              <span className="mb-1 block text-[11px] font-medium text-[var(--muted)]">Units</span>
              <input
                type="number"
                min={1}
                max={20}
                value={units}
                onChange={(e) => setUnits(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
              />
            </label>
            <button
              onClick={discover}
              disabled={loading}
              className="rounded-lg bg-gradient-to-b from-[var(--brand)] to-[var(--brand-2)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {loading ? "…" : "Find"}
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {(matches ?? []).map((m, i) => (
              <div
                key={m.centerId}
                className="flex items-center gap-3 rounded-xl border bg-[var(--panel-2)] px-3.5 py-3"
                style={{ borderColor: i === 0 && m.compatibleUnits > 0 ? "var(--available)" : "var(--border)" }}
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--background)] text-xs font-semibold text-[var(--muted)]">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{m.centerName}</div>
                  <div className="text-[11px] text-[var(--muted)]">
                    {m.compatibleUnits} compatible · ETA {m.etaMinutes} min
                  </div>
                </div>
                <span
                  className="rounded-md px-2 py-0.5 text-[10px] font-semibold"
                  style={{
                    color: m.canFulfill ? "var(--available)" : m.fillsPartial ? "var(--held)" : "var(--muted)",
                    background: m.canFulfill
                      ? "rgba(52,211,153,0.12)"
                      : m.fillsPartial
                        ? "rgba(245,181,68,0.12)"
                        : "transparent",
                  }}
                >
                  {m.canFulfill ? "Can fulfill" : m.fillsPartial ? "Partial" : "No stock"}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] text-[var(--muted)]">
            Ranked by ability to fulfill, then ETA — the same compatibility and FEFO logic the
            allocation engine uses.
          </p>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4">
      <div className="text-[11px] uppercase tracking-wide text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
    </div>
  );
}
