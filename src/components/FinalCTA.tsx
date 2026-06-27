"use client";

import Link from "next/link";
import { motion, MotionConfig, useReducedMotion } from "framer-motion";
import { item, staggerContainer, VIEWPORT } from "./motion";

const STEPS = [
  { label: "Request received", tone: "muted" as const },
  { label: "Reservation protected", tone: "brand" as const, pulse: true },
  { label: "Reroute completed", tone: "info" as const },
  { label: "Audit log updated", tone: "ok" as const },
];

const TONE = {
  muted: "var(--muted)",
  brand: "var(--brand)",
  info: "var(--allocated)",
  ok: "var(--available)",
};

export function FinalCTA() {
  return (
    <MotionConfig reducedMotion="user">
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-24">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={VIEWPORT}
          variants={staggerContainer}
          className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-gradient-to-br from-[var(--panel)] to-[var(--background)] p-8 text-center sm:p-12 md:p-16"
        >
          {/* restrained ambient glow */}
          <div className="hero-glow pointer-events-none absolute -bottom-32 left-1/2 h-[320px] w-[620px] -translate-x-1/2 rounded-full bg-[var(--brand)] opacity-20 blur-[120px]" />

          <motion.h2 variants={item} className="relative text-3xl font-bold tracking-tight sm:text-4xl">
            See the surge workflow in action.
          </motion.h2>
          <motion.p variants={item} className="relative mx-auto mt-4 max-w-2xl text-[1.0625rem] leading-relaxed text-[var(--muted-2)]">
            Simulate two hospitals requesting the same scarce unit and watch Sanguine confirm one
            reservation, reroute the second request, and record the decision in the operations log.
          </motion.p>

          <StatusStrip />

          <motion.div variants={item} className="relative mt-9">
            <Link
              href="/console"
              className="inline-flex rounded-xl bg-gradient-to-b from-[var(--brand)] to-[var(--brand-2)] px-7 py-4 text-sm font-semibold text-white shadow-[0_6px_26px_var(--brand-glow)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_12px_40px_var(--brand-glow)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
            >
              Launch surge simulation →
            </Link>
          </motion.div>
        </motion.div>
      </section>
    </MotionConfig>
  );
}

function StatusStrip() {
  const reduce = useReducedMotion();
  return (
    <motion.div
      variants={staggerContainer}
      className="relative mt-8 flex flex-wrap items-center justify-center gap-x-2 gap-y-3"
      aria-label="Surge workflow: request received, reservation protected, reroute completed, audit log updated"
    >
      {STEPS.map((s, i) => (
        <div key={s.label} className="flex items-center gap-2">
          <motion.span
            variants={item}
            className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium"
            style={{
              color: TONE[s.tone],
              borderColor: `color-mix(in srgb, ${TONE[s.tone]} 35%, transparent)`,
              background: `color-mix(in srgb, ${TONE[s.tone]} 9%, transparent)`,
            }}
          >
            {s.pulse && !reduce ? (
              <motion.span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: TONE[s.tone] }}
                animate={{ scale: [1, 1.55, 1], opacity: [1, 0.55, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              />
            ) : (
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: TONE[s.tone] }} />
            )}
            {s.label}
          </motion.span>
          {i < STEPS.length - 1 && (
            <motion.span variants={item} className="text-[var(--muted)]" aria-hidden>
              →
            </motion.span>
          )}
        </div>
      ))}
    </motion.div>
  );
}
