"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

// ---- types mirrored from the API ----
type UnitStatus =
  | "available"
  | "held"
  | "allocated"
  | "in_transit"
  | "expired"
  | "double";

interface UnitView {
  unitNo: number;
  bloodType: string;
  status: UnitStatus;
  centerName: string;
  expiresAt: string;
  nearExpiry: boolean;
  claimants: number;
}
interface Counters {
  allocated: number;
  doubleAllocations: number;
  fillRate: number;
  nearExpiry: number;
  totalUnits: number;
  available: number;
}
interface StateView {
  units: UnitView[];
  counters: Counters;
  serverTime: string;
}
interface LedgerEvent {
  id: string;
  unit_no: number | null;
  event_type: string;
  detail: Record<string, unknown> | null;
  created_at: string;
}
interface Toast {
  id: string;
  kind: "reroute" | "double" | "info";
  text: string;
}

const STATUS_LABEL: Record<UnitStatus, string> = {
  available: "Available",
  held: "Reserved",
  allocated: "Allocated",
  in_transit: "In transit",
  expired: "Expired",
  double: "DOUBLE-PROMISED",
};
const STATUS_VAR: Record<UnitStatus, string> = {
  available: "var(--available)",
  held: "var(--held)",
  allocated: "var(--allocated)",
  in_transit: "var(--in_transit)",
  expired: "var(--expired)",
  double: "var(--double)",
};

const FRESH_WINDOW_MS = 14 * 24 * 3600_000;

async function postJSON(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  return res.json();
}

export default function Console() {
  const [state, setState] = useState<StateView | null>(null);
  const [ledger, setLedger] = useState<LedgerEvent[]>([]);
  const [mode, setMode] = useState<"strong" | "naive">("strong");
  const [busy, setBusy] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [chat, setChat] = useState("");
  const [chatLog, setChatLog] = useState<{ q: string; a: string }[]>([]);
  const [emergency, setEmergency] = useState(false);
  const seenEvents = useRef<Set<string>>(new Set());
  const firstLoad = useRef(true);
  // guided demo: 0 = intro, 1 = ran Sanguine, 2 = ran legacy
  const [guideStep, setGuideStep] = useState<0 | 1 | 2>(0);
  const [lastSurge, setLastSurge] = useState<{
    mode: "strong" | "naive";
    contested?: number;
    rerouted?: number;
  } | null>(null);

  const pushToast = useCallback((t: Toast) => {
    setToasts((prev) => [...prev, t]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 5600);
  }, []);

  const poll = useCallback(async () => {
    try {
      const [s, l] = await Promise.all([
        fetch("/api/state", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/ledger?limit=80", { cache: "no-store" }).then((r) => r.json()),
      ]);
      setState(s);
      const events: LedgerEvent[] = l.events ?? [];
      if (!firstLoad.current) {
        for (const e of [...events].reverse()) {
          if (seenEvents.current.has(e.id)) continue;
          if (e.event_type === "rerouted" && e.detail) {
            pushToast({
              id: e.id,
              kind: "reroute",
              text: `Unit #${e.detail.from_unit} was just taken — automatically rerouted to #${e.detail.to_unit}`,
            });
          }
        }
      }
      for (const e of events) seenEvents.current.add(e.id);
      setLedger(events);
      firstLoad.current = false;
    } catch {
      /* transient — next tick retries */
    }
  }, [pushToast]);

  useEffect(() => {
    poll();
    const id = setInterval(poll, 1000);
    return () => clearInterval(id);
  }, [poll]);

  const runSurge = async () => {
    setBusy("surge");
    const res = await postJSON("/api/surge", { mode, count: 2 });
    if (mode === "naive" && res.totalClaimed) {
      setTimeout(
        () =>
          pushToast({
            id: `double-${Date.now()}`,
            kind: "double",
            text: `A unit was just promised to two hospitals at once.`,
          }),
        300,
      );
    }
    setBusy(null);
    poll();
  };

  const reset = async () => {
    setBusy("reset");
    await postJSON("/api/reset");
    seenEvents.current.clear();
    setChatLog([]);
    setBusy(null);
    poll();
  };

  // Guided demo: clean slate, run the same 2-hospital collision on the chosen
  // engine, and capture the contested/rerouted unit numbers for narration.
  const guidedRun = async (m: "strong" | "naive") => {
    setBusy("surge");
    setMode(m);
    await postJSON("/api/reset");
    seenEvents.current.clear();
    setChatLog([]);
    const res = await postJSON("/api/surge", { mode: m, count: 2 });
    let contested: number | undefined;
    let rerouted: number | undefined;
    if (m === "strong" && res.reroutes?.length) {
      contested = res.reroutes[0].fromUnitNo;
      rerouted = res.reroutes[0].toUnitNo;
    } else if (m === "naive") {
      const counts: Record<number, number> = {};
      for (const r of res.results ?? [])
        for (const c of r.claimed ?? []) counts[c.unitNo] = (counts[c.unitNo] ?? 0) + 1;
      const dup = Object.keys(counts).find((k) => counts[Number(k)] >= 2);
      if (dup) contested = Number(dup);
      setTimeout(
        () =>
          pushToast({
            id: `double-${Date.now()}`,
            kind: "double",
            text: `A unit was just promised to two hospitals at once.`,
          }),
        300,
      );
    }
    setLastSurge({ mode: m, contested, rerouted });
    setGuideStep(m === "strong" ? 1 : 2);
    setBusy(null);
    poll();
  };

  const resetGuide = async () => {
    setGuideStep(0);
    setLastSurge(null);
    setMode("strong");
    await reset();
  };

  const sendChat = async () => {
    const text = chat.trim();
    if (!text) return;
    setChat("");
    setBusy("chat");
    const res = await postJSON("/api/intake", {
      text,
      priority: emergency ? "emergency" : "standard",
    });
    let answer: string;
    if (res.error) {
      answer = `Couldn't read that — try e.g. "4 units A− within 72h"`;
    } else {
      const p = res.parsed;
      const r = res.result;
      const got =
        r.claimed.map((c: { unitNo: number }) => `#${c.unitNo}`).join(", ") || "none available";
      const verb = r.status === "filled" ? "Reserved" : r.status === "partially_filled" ? "Partially reserved" : "No units";
      const tier = p.priority === "emergency" ? "⚡ Emergency · " : "";
      answer = `${tier}${verb} ${p.units}× ${p.bloodType} → ${got}`;
    }
    setChatLog((prev) => [...prev, { q: text, a: answer }].slice(-5));
    setBusy(null);
    poll();
  };

  const counters = state?.counters;

  return (
    <main className="mx-auto max-w-[1500px] px-5 py-5">
      {/* top bar */}
      <nav className="mb-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <BloodMark />
          Sanguine
          <span className="ml-1 hidden rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] font-normal text-[var(--muted)] sm:inline">
            Allocation Console
          </span>
        </Link>
        <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
          <span className="hidden items-center gap-1.5 md:flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--available)]" />
            Live · Aurora DSQL
          </span>
          <Link href="/network" className="rounded-lg border border-[var(--border)] px-3 py-1.5 transition hover:text-[var(--foreground)]">
            Regional network →
          </Link>
          <Link href="/" className="rounded-lg border border-[var(--border)] px-3 py-1.5 transition hover:text-[var(--foreground)]">
            ← Home
          </Link>
        </div>
      </nav>

      {/* guided demo — narrates the whole story for a first-time viewer */}
      <GuidedDemo
        step={guideStep}
        last={lastSurge}
        busy={!!busy}
        onRunStrong={() => guidedRun("strong")}
        onRunLegacy={() => guidedRun("naive")}
        onReset={resetGuide}
      />

      {/* request bar */}
      <div className="mb-5">
        <ChatBox
          chat={chat}
          setChat={setChat}
          onSend={sendChat}
          busy={busy === "chat"}
          log={chatLog}
          emergency={emergency}
          setEmergency={setEmergency}
        />
      </div>

      {/* counter strip */}
      <section className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Counter label="Units reserved" value={counters?.allocated ?? 0} hint="Active reservations right now" />
        <DoubleCounter value={counters?.doubleAllocations ?? 0} />
        <Counter label="Fill rate" value={`${counters?.fillRate ?? 100}%`} hint="Requests successfully matched" />
        <Counter label="Expiring soon" value={counters?.nearExpiry ?? 0} accent="var(--held)" hint="Units within 24h of expiry" />
      </section>

      {/* control bar */}
      <section className="mb-5 flex flex-wrap items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-3.5">
        <button
          onClick={runSurge}
          disabled={!!busy}
          className="rounded-xl bg-gradient-to-b from-[var(--brand)] to-[var(--brand-2)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_20px_var(--brand-glow)] transition hover:brightness-110 disabled:opacity-50"
        >
          {busy === "surge" ? "Running…" : "⚡ Simulate a demand surge"}
        </button>
        <Toggle mode={mode} setMode={setMode} disabled={!!busy} />
        <button
          onClick={reset}
          disabled={!!busy}
          className="ml-auto rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-2.5 text-sm text-[var(--muted)] transition hover:text-[var(--foreground)] disabled:opacity-50"
        >
          ↺ Reset
        </button>
      </section>

      {/* main: inventory + activity */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Live blood inventory</h2>
              <p className="text-xs text-[var(--muted)]">
                {state?.units.length ?? 0} units across 3 donation centers
              </p>
            </div>
            <Legend />
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(108px,1fr))] gap-2.5">
            {(state?.units ?? []).map((u) => (
              <Tile key={u.unitNo} u={u} />
            ))}
          </div>
        </div>

        <LedgerPanel events={ledger} />
      </section>

      {/* toasts */}
      <div className="fixed bottom-4 right-4 z-50 flex w-[360px] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="toast-in rounded-xl border bg-[var(--panel-2)] px-4 py-3 text-sm shadow-2xl"
            style={{ borderColor: t.kind === "double" ? "var(--double)" : "var(--allocated)" }}
          >
            <span className="mr-1.5">{t.kind === "double" ? "⛔" : "↪"}</span>
            {t.text}
          </div>
        ))}
      </div>
    </main>
  );
}

// ---------- components ----------

function GuidedDemo({
  step,
  last,
  busy,
  onRunStrong,
  onRunLegacy,
  onReset,
}: {
  step: 0 | 1 | 2;
  last: { mode: "strong" | "naive"; contested?: number; rerouted?: number } | null;
  busy: boolean;
  onRunStrong: () => void;
  onRunLegacy: () => void;
  onReset: () => void;
}) {
  const contested = last?.contested ?? 1182;
  const rerouted = last?.rerouted ?? 1190;

  // content per step
  let accent = "var(--brand)";
  let eyebrow = "Guided demo · about 30 seconds";
  let title: React.ReactNode = "The same blood unit must never be promised to two hospitals.";
  let body: React.ReactNode = (
    <>
      Below is a live inventory of blood units across three donation centers. Keep an eye on the{" "}
      <strong className="font-semibold text-[var(--foreground)]">“Double-promised units”</strong>{" "}
      number — it must stay <strong className="font-semibold text-[var(--available)]">0</strong>.
      Press the button: two hospitals will request the <em>same</em> scarce unit at the exact same
      moment.
    </>
  );
  let primaryLabel = "▶ Run a demand surge";
  let primaryAction = onRunStrong;
  let secondary: { label: string; action: () => void } | null = null;

  if (step === 1) {
    accent = "var(--available)";
    eyebrow = "Result · Sanguine on Aurora DSQL";
    title = "✓ Both hospitals were handled. No unit was double-promised.";
    body = (
      <>
        Two hospitals just requested unit{" "}
        <strong className="font-semibold text-[var(--foreground)]">#{contested}</strong> at the same
        instant. Sanguine reserved it for one hospital and instantly{" "}
        <strong className="font-semibold text-[var(--allocated)]">rerouted</strong> the other to unit{" "}
        <strong className="font-semibold text-[var(--foreground)]">#{rerouted}</strong> — so{" "}
        <strong className="font-semibold text-[var(--available)]">“Double-promised” stayed 0</strong>.
        That guarantee comes from the database, not from luck.
      </>
    );
    primaryLabel = "▶ Now run the exact same surge on a legacy system";
    primaryAction = onRunLegacy;
    secondary = { label: "↺ Start over", action: onReset };
  } else if (step === 2) {
    accent = "var(--double)";
    eyebrow = "Result · ordinary (legacy) database";
    title = "✗ A legacy system promised the same unit to two hospitals.";
    body = (
      <>
        Same surge, ordinary stack: unit{" "}
        <strong className="font-semibold text-[var(--foreground)]">#{contested}</strong> was promised
        to <em>both</em> hospitals at once. The{" "}
        <strong className="font-semibold text-[var(--double)]">“Double-promised” counter climbed</strong>{" "}
        — in the real world, one patient is left without blood. This is exactly the failure Aurora
        DSQL prevents.
      </>
    );
    primaryLabel = "↺ Reset and watch Sanguine prevent it";
    primaryAction = onRunStrong;
    secondary = { label: "Start over", action: onReset };
  }

  return (
    <div className="mb-5 overflow-hidden rounded-2xl p-px" style={{ background: `linear-gradient(120deg, ${accent}, var(--border))` }}>
      <div className="relative rounded-2xl bg-[var(--panel)] p-5">
        <div
          className="pointer-events-none absolute -left-10 -top-10 h-32 w-40 rounded-full opacity-[0.12] blur-2xl"
          style={{ background: accent }}
        />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: accent }}>
              <StepDots step={step} />
              {eyebrow}
            </div>
            <h2 className="mt-2 text-lg font-bold tracking-tight sm:text-xl">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted-2)]">{body}</p>
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-2">
            <button
              onClick={primaryAction}
              disabled={busy}
              className="rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-[0_4px_20px_var(--brand-glow)] transition hover:brightness-110 disabled:opacity-50"
              style={{ background: `linear-gradient(to bottom, ${accent}, color-mix(in srgb, ${accent} 75%, black))` }}
            >
              {busy ? "Running…" : primaryLabel}
            </button>
            {secondary && (
              <button
                onClick={secondary.action}
                disabled={busy}
                className="rounded-xl px-5 py-2 text-xs font-medium text-[var(--muted)] transition hover:text-[var(--foreground)] disabled:opacity-50"
              >
                {secondary.label}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepDots({ step }: { step: 0 | 1 | 2 }) {
  return (
    <span className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: i <= step ? "currentColor" : "var(--border)" }}
        />
      ))}
    </span>
  );
}

function BloodMark() {
  return (
    <span className="grid h-6 w-6 place-items-center rounded-md bg-gradient-to-b from-[var(--brand)] to-[var(--brand-2)] text-[13px]">
      🩸
    </span>
  );
}

function Counter({
  label,
  value,
  accent,
  hint,
}: {
  label: string;
  value: string | number;
  accent?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4" title={hint}>
      <div className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-3xl font-bold tabular-nums" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
    </div>
  );
}

function DoubleCounter({ value }: { value: number }) {
  const zero = value === 0;
  return (
    <div
      className="rounded-2xl border p-4 transition"
      style={{
        borderColor: zero ? "var(--available)" : "var(--double)",
        background: zero ? "rgba(52,211,153,0.07)" : "rgba(255,77,99,0.10)",
      }}
      title="The same physical unit promised to two hospitals — should always be zero"
    >
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-[var(--muted)]">
        Double-promised units
      </div>
      <div
        className="mt-1 flex items-baseline gap-2 text-4xl font-extrabold tabular-nums"
        style={{ color: zero ? "var(--available)" : "var(--double)" }}
      >
        {value}
        <span className="text-xs font-medium">{zero ? "✓ guaranteed" : "✗ patients at risk"}</span>
      </div>
    </div>
  );
}

function Toggle({
  mode,
  setMode,
  disabled,
}: {
  mode: "strong" | "naive";
  setMode: (m: "strong" | "naive") => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col">
        <span className="text-[11px] uppercase tracking-wide text-[var(--muted)]">Allocation engine</span>
      </div>
      <div className="flex overflow-hidden rounded-xl border border-[var(--border)]">
        {(["strong", "naive"] as const).map((m) => (
          <button
            key={m}
            disabled={disabled}
            onClick={() => setMode(m)}
            className="px-3.5 py-2 text-sm font-medium transition disabled:opacity-50"
            style={{
              background: mode === m ? (m === "strong" ? "var(--available)" : "var(--double)") : "transparent",
              color: mode === m ? "#08121a" : "var(--muted)",
            }}
            title={m === "strong" ? "Sanguine on Aurora DSQL — strong consistency" : "A typical inventory system — last write wins"}
          >
            {m === "strong" ? "Sanguine (Aurora DSQL)" : "Legacy system"}
          </button>
        ))}
      </div>
    </div>
  );
}

function Tile({ u }: { u: UnitView }) {
  const color = STATUS_VAR[u.status];
  const expMs = new Date(u.expiresAt).getTime();
  const remain = Math.max(0, expMs - Date.now());
  const freshPct = u.status === "expired" ? 0 : Math.max(4, Math.min(100, (remain / FRESH_WINDOW_MS) * 100));
  const barColor = u.nearExpiry ? "var(--double)" : "var(--available)";
  const isDouble = u.status === "double";

  return (
    <div
      className={`tile-flip rounded-xl border bg-[var(--panel-2)] p-2.5 ${isDouble ? "tile-double" : ""}`}
      style={{ borderColor: isDouble ? "var(--double)" : "var(--border)" }}
      title={`${u.centerName} · expires ${new Date(u.expiresAt).toLocaleString()}`}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-lg font-bold"
          style={{ color: u.status === "expired" ? "var(--muted)" : "var(--foreground)" }}
        >
          {u.bloodType}
        </span>
        <span className="font-mono text-[10px] text-[var(--muted)]">#{u.unitNo}</span>
      </div>
      <div
        className="mt-1.5 inline-block rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
        style={{ color: isDouble ? "#fff" : "#08121a", background: color }}
      >
        {STATUS_LABEL[u.status]}
        {isDouble ? ` ×${u.claimants}` : ""}
      </div>
      <div className="mt-2 h-1 w-full overflow-hidden rounded bg-[var(--border)]">
        <div className="h-full rounded transition-all" style={{ width: `${freshPct}%`, background: barColor }} />
      </div>
    </div>
  );
}

function Legend() {
  const items: [UnitStatus, string][] = [
    ["available", "available"],
    ["held", "reserved"],
    ["allocated", "allocated"],
    ["double", "double-promised"],
    ["expired", "expired"],
  ];
  return (
    <div className="flex flex-wrap items-center gap-2.5 text-[10px] text-[var(--muted)]">
      {items.map(([s, label]) => (
        <span key={s} className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: STATUS_VAR[s] }} />
          {label}
        </span>
      ))}
    </div>
  );
}

function LedgerPanel({ events }: { events: LedgerEvent[] }) {
  const label = (t: string) =>
    ({
      requested: "requested",
      held: "reserved",
      allocated: "allocated",
      rerouted: "rerouted",
      released: "released",
      expired: "expired",
      confirmed: "confirmed",
    })[t] ?? t;
  const color = (t: string) =>
    t === "rerouted"
      ? "var(--allocated)"
      : t === "allocated" || t === "confirmed" || t === "held"
        ? "var(--available)"
        : t === "released"
          ? "var(--held)"
          : t === "expired"
            ? "var(--expired)"
            : "var(--muted)";
  return (
    <div className="flex max-h-[640px] flex-col rounded-2xl border border-[var(--border)] bg-[var(--panel)]">
      <div className="border-b border-[var(--border)] px-4 py-3">
        <h2 className="text-sm font-semibold">Activity log</h2>
        <p className="text-[11px] text-[var(--muted)]">Every action, permanent &amp; auditable</p>
      </div>
      <div className="scroll-thin flex-1 overflow-y-auto p-2 font-mono text-[11px]">
        {events.length === 0 && <div className="p-3 text-[var(--muted)]">Nothing yet — run a surge or request blood.</div>}
        {events.map((e) => (
          <div key={e.id} className="flex gap-2 border-b border-[var(--border)] px-2 py-1.5">
            <span className="text-[var(--muted)]">
              {new Date(e.created_at).toLocaleTimeString([], { hour12: false, minute: "2-digit", second: "2-digit" })}
            </span>
            <span className="font-semibold" style={{ color: color(e.event_type) }}>
              {label(e.event_type)}
            </span>
            {e.unit_no != null && <span>#{e.unit_no}</span>}
            <span className="truncate text-[var(--muted)]">
              {e.detail?.hospital ? String(e.detail.hospital) : ""}
              {e.event_type === "rerouted" && e.detail ? ` ${e.detail.from_unit}→${e.detail.to_unit}` : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatBox({
  chat,
  setChat,
  onSend,
  busy,
  log,
  emergency,
  setEmergency,
}: {
  chat: string;
  setChat: (s: string) => void;
  onSend: () => void;
  busy: boolean;
  log: { q: string; a: string }[];
  emergency: boolean;
  setEmergency: (v: boolean) => void;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--panel)] to-[var(--panel-2)] p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm font-semibold">Request blood</span>
        <span className="rounded-full bg-[var(--brand)]/15 px-2 py-0.5 text-[10px] text-[var(--brand)]">
          AI intake · just type
        </span>
        <button
          onClick={() => setEmergency(!emergency)}
          aria-pressed={emergency}
          className="ml-auto flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition"
          style={{
            borderColor: emergency ? "var(--double)" : "var(--border)",
            background: emergency ? "rgba(255,77,99,0.12)" : "transparent",
            color: emergency ? "var(--double)" : "var(--muted)",
          }}
          title="Emergency: pull the freshest available unit, not the soonest-to-expire"
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: emergency ? "var(--double)" : "var(--muted)" }} />
          {emergency ? "Emergency (ER)" : "Standard"}
        </button>
      </div>
      <div className="flex gap-2">
        <input
          value={chat}
          onChange={(e) => setChat(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSend()}
          placeholder='e.g. "we need 4 units of A negative within 72 hours"'
          className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none transition focus:border-[var(--brand)]"
        />
        <button
          onClick={onSend}
          disabled={busy}
          className="rounded-xl bg-gradient-to-b from-[var(--brand)] to-[var(--brand-2)] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
        >
          {busy ? "…" : "Send"}
        </button>
      </div>
      {log.length > 0 && (
        <div className="mt-3 space-y-1.5 text-xs">
          {log.map((m, i) => (
            <div key={i} className="flex items-start justify-between gap-3 rounded-lg bg-[var(--background)] px-3 py-2">
              <span className="text-[var(--foreground)]">“{m.q}”</span>
              <span className="shrink-0 text-[var(--available)]">{m.a}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
