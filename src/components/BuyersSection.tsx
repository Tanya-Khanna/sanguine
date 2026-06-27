"use client";

import { motion, MotionConfig, useReducedMotion } from "framer-motion";
import { fadeUp, item, staggerContainer, VIEWPORT } from "./motion";
import { IconBuilding, IconHospital, IconNetwork, IconLayers } from "./icons";

const BUYERS = [
  {
    Icon: IconBuilding,
    title: "Blood centers",
    body: "Coordinate requests across participating hospitals, protect scarce inventory from duplicate commitments, and prioritize usable units before they expire.",
    chips: ["Network visibility", "Inventory protection", "Expiration-aware routing"],
  },
  {
    Icon: IconHospital,
    title: "Hospital supply teams",
    body: "Submit urgent requests, receive confirmed reservations, and see reroutes without chasing updates across calls, spreadsheets, and static inventory views.",
    chips: ["Confirmed reservations", "Real-time reroutes", "Less manual follow-up"],
  },
  {
    Icon: IconNetwork,
    title: "Regional coordinators",
    body: "Monitor surge demand, resolve conflicts, and maintain an audit-ready record of allocation activity across the network.",
    chips: ["Surge visibility", "Conflict resolution", "Audit-ready history"],
  },
];

export function BuyersSection() {
  return (
    <MotionConfig reducedMotion="user">
      <section id="buyers" className="relative z-10 mx-auto max-w-6xl scroll-mt-24 px-6 py-24">
        <motion.div initial="hidden" whileInView="show" viewport={VIEWPORT} variants={staggerContainer} className="mb-12 max-w-3xl">
          <motion.div variants={item} className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">
            Buyers
          </motion.div>
          <motion.h2 variants={item} className="mt-3 text-3xl font-bold leading-[1.1] tracking-tight sm:text-[2.5rem]">
            One shared layer for blood centers, hospitals, and emergency coordinators.
          </motion.h2>
          <motion.p variants={item} className="mt-5 text-[1.0625rem] leading-relaxed text-[var(--muted-2)]">
            Sanguine is designed for teams that need regional visibility, protected reservations,
            and audit-ready allocation history when demand changes faster than manual coordination
            can keep up.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={VIEWPORT}
          variants={staggerContainer}
          className="grid grid-cols-1 gap-4 md:grid-cols-3"
        >
          {BUYERS.map((b) => (
            <BuyerCard key={b.title} {...b} />
          ))}
        </motion.div>

        <PlatformPatternCard />
      </section>
    </MotionConfig>
  );
}

function BuyerCard({
  Icon,
  title,
  body,
  chips,
}: {
  Icon: (p: { className?: string }) => React.ReactNode;
  title: string;
  body: string;
  chips: string[];
}) {
  return (
    <motion.div variants={item} whileHover={{ y: -5 }} transition={{ type: "spring", stiffness: 300, damping: 22 }}>
      <div className="group h-full rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-6 transition-colors duration-300 hover:border-[var(--brand)]/40 hover:bg-[var(--panel-2)]">
        <span className="mb-5 grid h-11 w-11 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--brand)_12%,transparent)] text-[var(--brand)]">
          <Icon />
        </span>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted-2)]">{body}</p>
        <div className="mt-5 flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <span
              key={c}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)]/40 px-2.5 py-1 text-[11px] font-medium text-[var(--muted)] transition-colors duration-300 group-hover:border-[var(--brand)]/30 group-hover:text-[var(--foreground)]"
            >
              <span className="h-1 w-1 rounded-full bg-[var(--brand)]" />
              {c}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function PlatformPatternCard() {
  const reduce = useReducedMotion();
  return (
    <motion.div initial="hidden" whileInView="show" viewport={VIEWPORT} variants={fadeUp} className="relative mt-4">
      {/* soft ambient glow */}
      <div className="pointer-events-none absolute -inset-2 -z-10 rounded-[1.7rem] bg-[var(--brand)] opacity-[0.05] blur-2xl" />
      {/* gradient border */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-[var(--brand)]/30 via-[var(--border)] to-[var(--brand)]/30 p-px">
        <div className="relative overflow-hidden rounded-2xl bg-[var(--panel)]/90 p-6 backdrop-blur-xl">
          {/* subtle moving line implying a reusable layer */}
          {!reduce && (
            <motion.div
              className="pointer-events-none absolute top-0 h-px w-1/3 bg-gradient-to-r from-transparent via-[var(--brand)] to-transparent"
              initial={{ left: "-33%" }}
              animate={{ left: ["-33%", "100%"] }}
              transition={{ duration: 5, ease: "easeInOut", repeat: Infinity }}
            />
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-3xl">
              <h3 className="text-base font-semibold sm:text-lg">Designed for scarce, perishable inventory</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted-2)]">
                The same reservation workflow can support other must-not-double-allocate
                resources, including transplant logistics, vaccine distribution, clinical trial
                slots, reagents, and emergency medical supplies.
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-[var(--brand)]/30 bg-[color-mix(in_srgb,var(--brand)_8%,transparent)] px-3 py-1 text-[11px] font-medium text-[var(--brand)]">
              <IconLayers className="h-3.5 w-3.5" />
              Platform pattern
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
