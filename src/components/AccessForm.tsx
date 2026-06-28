"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, MotionConfig } from "framer-motion";
import { fadeUp } from "./motion";

const ROLES = [
  "Blood center",
  "Hospital supply team",
  "Regional coordinator",
] as const;

export function AccessForm() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    org: "",
    role: ROLES[0] as string,
    note: "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  if (submitted) {
    const firstName = form.name
      .trim()
      .replace(/^(dr|mr|mrs|ms|prof)\.?\s+/i, "")
      .split(/\s+/)[0];
    return (
      <MotionConfig reducedMotion="user">
        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="rounded-2xl border border-[var(--available)]/30 bg-[var(--panel)]/80 p-8 text-center backdrop-blur-xl"
        >
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[color-mix(in_srgb,var(--available)_16%,transparent)] text-[var(--available)]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12l5 5L20 7" />
            </svg>
          </div>
          <h2 className="mt-4 text-xl font-semibold">Request received</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[var(--muted-2)]">
            Thanks{firstName ? `, ${firstName}` : ""}. We&apos;ll set up a{" "}
            <span className="text-[var(--foreground)]">{form.role.toLowerCase()}</span> workspace
            {form.org ? <> for <span className="text-[var(--foreground)]">{form.org}</span></> : null} and
            reach out at <span className="text-[var(--foreground)]">{form.email}</span>.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/console"
              className="rounded-xl bg-gradient-to-b from-[var(--brand)] to-[var(--brand-2)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_18px_var(--brand-glow)] transition hover:brightness-110"
            >
              Explore the live demo →
            </Link>
            <button
              onClick={() => setSubmitted(false)}
              className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-5 py-2.5 text-sm font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
            >
              Submit another
            </button>
          </div>
        </motion.div>
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <motion.form
        initial="hidden"
        animate="show"
        variants={fadeUp}
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
        }}
        className="rounded-2xl border border-[var(--border)] bg-[var(--panel)]/80 p-6 backdrop-blur-xl sm:p-7"
      >
        <div className="space-y-4">
          <Field label="Full name">
            <input
              required
              value={form.name}
              onChange={set("name")}
              autoComplete="name"
              placeholder="Dr. Jordan Avery"
              className={inputCls}
            />
          </Field>
          <Field label="Work email">
            <input
              required
              type="email"
              value={form.email}
              onChange={set("email")}
              autoComplete="email"
              placeholder="jordan.avery@stvincent.org"
              className={inputCls}
            />
          </Field>
          <Field label="Organization">
            <input
              required
              value={form.org}
              onChange={set("org")}
              autoComplete="organization"
              placeholder="St. Vincent General"
              className={inputCls}
            />
          </Field>
          <Field label="Your role">
            <select value={form.role} onChange={set("role")} className={inputCls}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
          <Field label="What do you coordinate? (optional)">
            <textarea
              value={form.note}
              onChange={set("note")}
              rows={3}
              placeholder="e.g. 6 hospitals across the region, ~400 units/month"
              className={`${inputCls} resize-none`}
            />
          </Field>
        </div>

        <button
          type="submit"
          className="mt-6 w-full rounded-xl bg-gradient-to-b from-[var(--brand)] to-[var(--brand-2)] px-6 py-3 text-sm font-semibold text-white shadow-[0_6px_26px_var(--brand-glow)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
        >
          Request access →
        </button>
        <p className="mt-3 text-center text-[11px] text-[var(--muted)]">
          No commitment. We&apos;ll follow up to provision your workspace.
        </p>
      </motion.form>
    </MotionConfig>
  );
}

const inputCls =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--brand)]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-[var(--muted)]">{label}</span>
      {children}
    </label>
  );
}
