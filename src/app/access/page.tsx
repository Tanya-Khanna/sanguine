import type { Metadata } from "next";
import Link from "next/link";
import { LandingHeader } from "@/components/LandingHeader";
import { AccessForm } from "@/components/AccessForm";

export const metadata: Metadata = {
  title: "Request access — Sanguine",
  description:
    "Bring your blood center, hospital supply team, or regional coordination team onto the Sanguine network. Role-based workspaces for shared inventory reservation.",
};

const STEPS = [
  {
    n: "1",
    title: "Tell us about your facility",
    body: "Your role, region, and rough volume. Takes a minute — no procurement call required to start.",
  },
  {
    n: "2",
    title: "We provision a role-based workspace",
    body: "Separate views for blood-center admins, hospital supply teams, and regional coordinators, with SSO for your staff.",
  },
  {
    n: "3",
    title: "Your team coordinates on one layer",
    body: "Shared reservations, live reroutes, and an audit-ready record — across every connected facility.",
  },
];

export default function AccessPage() {
  return (
    <>
      <LandingHeader />
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" />
        <div className="hero-glow pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-[var(--brand)] opacity-20 blur-[140px]" />

        <section className="relative z-10 mx-auto grid max-w-6xl items-start gap-12 px-6 pb-24 pt-12 lg:grid-cols-[1fr_460px] lg:pt-20">
          {/* left: onboarding model */}
          <div className="fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-3.5 py-1.5 text-xs font-medium text-[var(--muted)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand)]" />
              For facilities
            </span>
            <h1 className="mt-6 max-w-[16ch] text-[2.4rem] font-bold leading-[1.05] tracking-[-0.02em] sm:text-[3rem]">
              Bring your facility onto the network.
            </h1>
            <p className="mt-5 max-w-xl text-[1.0625rem] leading-relaxed text-[var(--muted-2)]">
              Sanguine is a shared coordination network, not a single-site install. Facilities
              are onboarded with their own role-based workspace — so blood centers, hospital
              supply teams, and regional coordinators work from the same live inventory.
            </p>

            <ol className="mt-8 space-y-4">
              {STEPS.map((s) => (
                <li key={s.n} className="flex gap-4">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--panel)] text-sm font-semibold text-[var(--brand)]">
                    {s.n}
                  </span>
                  <div>
                    <div className="font-medium">{s.title}</div>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--muted-2)]">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            <p className="mt-8 text-sm text-[var(--muted)]">
              Prefer to look first?{" "}
              <Link href="/console" className="font-medium text-[var(--brand)] hover:underline">
                Explore the live demo →
              </Link>
            </p>
          </div>

          {/* right: form */}
          <div className="fade-up" style={{ animationDelay: "120ms" }}>
            <AccessForm />
          </div>
        </section>
      </div>
    </>
  );
}
