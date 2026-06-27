"use client";

import { motion, MotionConfig, useReducedMotion } from "framer-motion";
import { fadeUp, item, logRow, staggerContainer, VIEWPORT } from "./motion";
import {
  IconClipboard,
  IconTarget,
  IconShield,
  IconFileCheck,
  IconActivity,
} from "./icons";

const STEPS = [
  {
    n: "01",
    Icon: IconClipboard,
    title: "Request",
    body: "A hospital submits a need by blood type, component, urgency, quantity, and time window.",
    status: "Request received",
  },
  {
    n: "02",
    Icon: IconTarget,
    title: "Match",
    body: "Sanguine checks compatible inventory, prioritizes soonest-expiring usable units, and identifies the best available allocation.",
    status: "Compatible units ranked",
  },
  {
    n: "03",
    Icon: IconShield,
    title: "Reserve",
    body: "Only one facility can reserve a unit. If two teams request the same unit, one is confirmed and the other is rerouted.",
    status: "Duplicate commitment prevented",
    highlight: true,
  },
  {
    n: "04",
    Icon: IconFileCheck,
    title: "Audit",
    body: "Every request, reservation, reroute, release, and expiration is written to an operations log for review.",
    status: "Audit trail updated",
  },
];

type Tone = "muted" | "info" | "ok";
const LOG: { t: string; text: string; chip: string; tone: Tone; pulse?: boolean; check?: boolean }[] = [
  { t: "09:41:02", text: "City Hospital requested 2 O-negative units", chip: "received", tone: "muted" },
  { t: "09:41:02", text: "Memorial Hospital requested Unit #1182", chip: "matched", tone: "info" },
  { t: "09:41:03", text: "Unit #1182 reserved once", chip: "reserved", tone: "ok", pulse: true },
  { t: "09:41:03", text: "Memorial rerouted to Unit #1190", chip: "rerouted", tone: "info" },
  { t: "09:41:04", text: "Audit log updated", chip: "logged", tone: "ok", check: true },
];

const TONE: Record<Tone, string> = {
  muted: "var(--muted)",
  info: "var(--allocated)",
  ok: "var(--available)",
};

export function WorkflowSection() {
  return (
    <MotionConfig reducedMotion="user">
      <section id="workflow" className="relative z-10 mx-auto max-w-6xl scroll-mt-24 px-6 py-24">
        <motion.div initial="hidden" whileInView="show" viewport={VIEWPORT} variants={staggerContainer} className="mb-12 max-w-3xl">
          <motion.div variants={item} className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">
            The Sanguine workflow
          </motion.div>
          <motion.h2 variants={item} className="mt-3 text-3xl font-bold leading-[1.1] tracking-tight sm:text-[2.5rem]">
            One shared workflow for requests, reservations, reroutes, and audit history.
          </motion.h2>
          <motion.p variants={item} className="mt-5 text-[1.0625rem] leading-relaxed text-[var(--muted-2)]">
            Sanguine lets hospital supply teams request units, blood centers confirm availability,
            and regional coordinators resolve conflicts from the same live operations layer.
          </motion.p>
        </motion.div>

        <ConnectorRail />

        {/* workflow cards */}
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={VIEWPORT}
          variants={staggerContainer}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {STEPS.map((s) => (
            <WorkflowStepCard key={s.n} {...s} />
          ))}
        </motion.div>

        <AllocationEventLog />
      </section>
    </MotionConfig>
  );
}

function ConnectorRail() {
  const reduce = useReducedMotion();
  return (
    <div className="relative mb-5 hidden lg:block" aria-hidden>
      {/* base line between the four node centers (12.5% … 87.5%) */}
      <div className="absolute top-1/2 left-[12.5%] right-[12.5%] h-px -translate-y-1/2 bg-gradient-to-r from-[var(--border)] via-[var(--brand)]/40 to-[var(--border)]" />
      {/* moving pulse */}
      {!reduce && (
        <motion.span
          className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-[var(--brand)] shadow-[0_0_10px_2px_var(--brand-glow)]"
          initial={{ left: "12.5%" }}
          animate={{ left: ["12.5%", "87.5%"] }}
          transition={{ duration: 3.6, ease: "easeInOut", repeat: Infinity, repeatType: "loop" }}
        />
      )}
      {/* nodes aligned above each card */}
      <div className="relative grid grid-cols-4 py-2.5">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex justify-center">
            <span
              className="h-2.5 w-2.5 rounded-full ring-4 ring-[var(--background)]"
              style={{ background: i === 2 ? "var(--brand)" : "var(--border)" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkflowStepCard({
  n,
  Icon,
  title,
  body,
  status,
  highlight,
}: {
  n: string;
  Icon: (p: { className?: string }) => React.ReactNode;
  title: string;
  body: string;
  status: string;
  highlight?: boolean;
}) {
  const accent = highlight ? "var(--brand)" : "var(--muted)";
  return (
    <motion.div variants={item} whileHover={{ y: -5 }} transition={{ type: "spring", stiffness: 300, damping: 22 }}>
      <div
        className="h-full rounded-2xl p-px transition-shadow duration-300"
        style={{
          background: highlight
            ? "linear-gradient(160deg, color-mix(in srgb, var(--brand) 55%, transparent), var(--border))"
            : "var(--border)",
          boxShadow: highlight ? "0 0 44px -14px var(--brand-glow)" : undefined,
        }}
      >
        <div className="group flex h-full flex-col rounded-2xl bg-[var(--panel)] p-5 transition-colors duration-300 hover:bg-[var(--panel-2)]">
          <div className="mb-4 flex items-center justify-between">
            <span
              className="grid h-10 w-10 place-items-center rounded-xl"
              style={{ color: accent, background: `color-mix(in srgb, ${accent} 14%, transparent)` }}
            >
              <Icon />
            </span>
            <span className="font-mono text-xs text-[var(--muted)]">{n}</span>
          </div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--muted-2)]">{body}</p>
          <div
            className="mt-4 inline-flex items-center gap-1.5 self-start rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors duration-300"
            style={{
              color: highlight ? "var(--brand)" : "var(--muted)",
              borderColor: highlight ? "color-mix(in srgb, var(--brand) 40%, transparent)" : "var(--border)",
              background: highlight ? "color-mix(in srgb, var(--brand) 8%, transparent)" : "transparent",
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: highlight ? "var(--brand)" : "var(--muted)" }} />
            {status}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function AllocationEventLog() {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={VIEWPORT}
      variants={fadeUp}
      className="mt-6 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)]/80 backdrop-blur-xl"
    >
      <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3.5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="text-[var(--brand)]">
            <IconActivity />
          </span>
          Live allocation event
        </div>
        <span className="flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
          <span className="relative flex h-1.5 w-1.5">
            {!reduce && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--available)] opacity-70" />
            )}
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--available)]" />
          </span>
          Operations log
        </span>
      </div>

      <motion.div variants={staggerContainer} className="divide-y divide-[var(--border)]/60">
        {LOG.map((row, i) => (
          <motion.div
            key={i}
            variants={logRow}
            className="flex items-center gap-3 px-5 py-3 font-mono text-[12px]"
          >
            <span className="text-[var(--muted)]">{row.t}</span>
            <span className="flex-1 font-sans text-[var(--foreground)]">{row.text}</span>
            {row.pulse && !reduce ? (
              <motion.span
                className="rounded-md px-2 py-0.5 text-[10px] font-semibold"
                style={{ color: TONE[row.tone], background: `color-mix(in srgb, ${TONE[row.tone]} 14%, transparent)` }}
                initial={{ boxShadow: "0 0 0 0 rgba(52,211,153,0.0)" }}
                animate={{ boxShadow: ["0 0 0 0 rgba(52,211,153,0.35)", "0 0 0 7px rgba(52,211,153,0)"] }}
                transition={{ duration: 1.6, repeat: 2, ease: "easeOut", delay: 0.6 }}
              >
                {row.chip}
              </motion.span>
            ) : (
              <span
                className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold"
                style={{ color: TONE[row.tone], background: `color-mix(in srgb, ${TONE[row.tone]} 14%, transparent)` }}
              >
                {row.check && (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                )}
                {row.chip}
              </span>
            )}
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
