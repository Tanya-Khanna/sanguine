"use client";

import { useState } from "react";
import { motion, MotionConfig, useReducedMotion } from "framer-motion";
import { fadeUp, item, staggerContainer, VIEWPORT } from "./motion";
import {
  IconPhone,
  IconSheet,
  IconEye,
  IconReroute,
  IconClock,
  IconCopy,
  IconHourglass,
  IconFileWarning,
  IconShield,
} from "./icons";

const BEFORE = [
  { Icon: IconPhone, label: "Phone calls", tag: "manual" },
  { Icon: IconSheet, label: "Spreadsheet updates", tag: "manual" },
  { Icon: IconEye, label: "Static inventory checks", tag: "stale" },
  { Icon: IconReroute, label: "Manual rerouting", tag: "slow" },
  { Icon: IconClock, label: "Delayed audit trail", tag: "gaps" },
];

const RISKS = [
  {
    Icon: IconCopy,
    title: "Duplicate commitments",
    desc: "Same scarce unit promised to more than one facility",
    impact: "Patient risk",
    high: true,
  },
  {
    Icon: IconHourglass,
    title: "Expiring inventory",
    desc: "Compatible units missed before expiration",
    impact: "Wasted supply",
  },
  {
    Icon: IconFileWarning,
    title: "Manual audit gaps",
    desc: "Allocation decisions scattered across calls and notes",
    impact: "Compliance exposure",
  },
];

export function ProblemSection() {
  return (
    <MotionConfig reducedMotion="user">
      <section id="use-case" className="relative z-10 mx-auto max-w-6xl scroll-mt-24 px-6 py-24">
        <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-14">
          {/* left: copy + before-sanguine */}
          <motion.div initial="hidden" whileInView="show" viewport={VIEWPORT} variants={staggerContainer}>
            <motion.div variants={item} className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">
              The operations gap
            </motion.div>
            <motion.h2 variants={item} className="mt-3 text-3xl font-bold leading-[1.1] tracking-tight sm:text-[2.5rem]">
              Blood shortages are not only a supply problem. They are a coordination problem.
            </motion.h2>
            <motion.p variants={item} className="mt-5 max-w-xl text-[1.0625rem] leading-relaxed text-[var(--muted-2)]">
              During surges, hospitals and blood centers coordinate through fragmented calls,
              static inventory views, and manual updates. The result is avoidable risk:
              duplicate commitments, slow reroutes, expiring units, and incomplete audit trails.
            </motion.p>

            <motion.div
              variants={item}
              className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--panel)]/60 p-5"
            >
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--held)]" />
                Before Sanguine
              </div>
              <motion.ul variants={staggerContainer} className="space-y-2">
                {BEFORE.map(({ Icon, label, tag }) => (
                  <motion.li
                    key={label}
                    variants={item}
                    className="flex items-center gap-3 rounded-lg border border-[var(--border)]/60 bg-[var(--background)]/40 px-3 py-2.5"
                  >
                    <span className="text-[var(--muted)]">
                      <Icon />
                    </span>
                    <span className="flex-1 text-sm text-[var(--foreground)]">{label}</span>
                    <span className="rounded-md border border-[var(--border)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--muted)]">
                      {tag}
                    </span>
                  </motion.li>
                ))}
              </motion.ul>
            </motion.div>
          </motion.div>

          {/* right: coordination risk dashboard */}
          <RiskDashboardCard />
        </div>

        {/* callout */}
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={VIEWPORT}
          variants={fadeUp}
          className="mt-10 flex items-center gap-3 rounded-2xl border border-[var(--brand)]/30 bg-gradient-to-r from-[var(--brand)]/10 to-transparent px-5 py-4"
        >
          <span className="text-[var(--brand)]">
            <IconShield />
          </span>
          <p className="text-sm font-medium text-[var(--foreground)] sm:text-base">
            Sanguine turns scarce inventory into a shared, reservation-backed workflow.
          </p>
        </motion.div>
      </section>
    </MotionConfig>
  );
}

function RiskDashboardCard() {
  const reduce = useReducedMotion();
  const [protectedOn, setProtectedOn] = useState(false);

  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={VIEWPORT}
      variants={fadeUp}
      onViewportEnter={() => {
        if (reduce) setProtectedOn(true);
        else setTimeout(() => setProtectedOn(true), 1500);
      }}
      className="relative lg:[transform:perspective(1600px)_rotateY(-5deg)] lg:transition-transform lg:duration-700 lg:hover:[transform:perspective(1600px)_rotateY(0deg)]"
    >
      {/* ambient glow */}
      <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-[var(--brand)] opacity-[0.06] blur-3xl" />
      {/* gradient border */}
      <div className="rounded-2xl bg-gradient-to-b from-[var(--border)] via-[var(--border)] to-[var(--brand)]/30 p-px shadow-[0_28px_70px_-30px_rgba(0,0,0,0.8)]">
        <div className="rounded-2xl bg-[var(--panel)]/90 p-5 backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm font-semibold">Coordination risk</div>
            <span
              className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors duration-500"
              style={{
                color: protectedOn ? "var(--available)" : "var(--held)",
                borderColor: protectedOn ? "rgba(52,211,153,0.4)" : "rgba(245,181,68,0.4)",
                background: protectedOn ? "rgba(52,211,153,0.1)" : "rgba(245,181,68,0.08)",
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: protectedOn ? "var(--available)" : "var(--held)" }}
              />
              {protectedOn ? "With Sanguine · protected" : "Current state"}
            </span>
          </div>

          <motion.div variants={staggerContainer} className="space-y-2.5">
            {RISKS.map((r) => (
              <RiskRow key={r.title} {...r} protectedOn={protectedOn} reduce={!!reduce} />
            ))}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

function RiskRow({
  Icon,
  title,
  desc,
  impact,
  high,
  protectedOn,
  reduce,
}: {
  Icon: (p: { className?: string }) => React.ReactNode;
  title: string;
  desc: string;
  impact: string;
  high?: boolean;
  protectedOn: boolean;
  reduce: boolean;
}) {
  const riskColor = high ? "var(--double)" : "var(--held)";
  const dotColor = protectedOn ? "var(--available)" : riskColor;
  const statusLabel = protectedOn ? "Protected" : high ? "High" : "At risk";

  return (
    <motion.div
      variants={item}
      className="flex items-center gap-3 rounded-xl border bg-[var(--background)]/40 px-3.5 py-3 transition-colors duration-500"
      style={{ borderColor: protectedOn ? "rgba(52,211,153,0.25)" : "var(--border)" }}
    >
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors duration-500"
        style={{
          color: dotColor,
          background: `color-mix(in srgb, ${dotColor} 12%, transparent)`,
        }}
      >
        <Icon />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-[var(--foreground)]">{title}</div>
        <div className="truncate text-xs text-[var(--muted)]">{desc}</div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: dotColor }}>
          {high && !protectedOn && !reduce ? (
            <motion.span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: dotColor }}
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.6, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            />
          ) : (
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: dotColor }} />
          )}
          {statusLabel}
        </span>
        <span className="hidden text-[10px] uppercase tracking-wide text-[var(--muted)] sm:block">{impact}</span>
      </div>
    </motion.div>
  );
}
