import Link from "next/link";
import { OpsMonitorCard } from "@/components/OpsMonitorCard";
import { LandingHeader } from "@/components/LandingHeader";
import { ProblemSection } from "@/components/ProblemSection";
import { WorkflowSection } from "@/components/WorkflowSection";

export default function Landing() {
  return (
    <>
      {/* sticky dark-glass command bar (outside the overflow-hidden wrapper so
          position: sticky works) */}
      <LandingHeader />

      <div className="relative overflow-hidden">
        {/* ambient glows */}
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" />
        <div className="hero-glow pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[var(--brand)] opacity-25 blur-[140px]" />

      {/* hero */}
      <header className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-12 lg:grid-cols-[1.1fr_0.9fr] lg:pt-20">
        <div className="fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-3.5 py-1.5 text-xs font-medium text-[var(--muted)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand)]" />
            Regional blood inventory coordination
          </span>
          <h1 className="mt-6 max-w-[18ch] text-[2.6rem] font-bold leading-[1.04] tracking-[-0.02em] sm:text-[3.4rem]">
            Prevent duplicate blood unit commitments during{" "}
            <span className="text-gradient">surge demand.</span>
          </h1>
          <p className="mt-6 max-w-xl text-[1.0625rem] leading-relaxed text-[var(--muted-2)]">
            Sanguine gives blood centers and hospital supply teams a shared reservation
            layer for scarce inventory. When multiple facilities request the same unit,
            one allocation is confirmed, the next-best match is rerouted, and every
            decision is recorded in an audit-ready operations log.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/console"
              className="rounded-xl bg-gradient-to-b from-[var(--brand)] to-[var(--brand-2)] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_6px_26px_var(--brand-glow)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
            >
              Open operations console →
            </Link>
            <Link
              href="/console"
              className="group rounded-xl border border-[var(--border)] bg-[var(--panel)] px-6 py-3.5 text-sm font-semibold transition hover:border-[var(--muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--muted)]"
            >
              <span className="text-[var(--brand)]">▶</span> Watch surge simulation
            </Link>
          </div>
          <p className="mt-6 max-w-md text-xs leading-relaxed text-[var(--muted)]">
            No login needed. Simulate competing hospital requests and see how Sanguine
            protects inventory commitments in real time.
          </p>
          <p className="mt-5 flex items-center gap-2 text-[11px] text-[var(--muted)]">
            <span className="h-1 w-1 rounded-full bg-[var(--muted)]" />
            Runs on Amazon Aurora DSQL · deployed on Vercel
          </p>
        </div>

        {/* hero visual: the surge operations monitor */}
        <OpsMonitorCard />
      </header>

      {/* stat band */}
      <section className="relative z-10 border-y border-[var(--border)] bg-[var(--panel)]/40">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-6 md:grid-cols-4">
          <Stat n="16M+" l="blood components transfused yearly" />
          <Stat n="40K+" l="components needed daily" />
          <Stat n="~35%" l="recent emergency supply drop" />
          <Stat n="0" l="duplicate commitments in simulation" accent />
        </div>
      </section>

      {/* use case */}
      <ProblemSection />

      {/* workflow */}
      <WorkflowSection />

      {/* the proof */}
      <Section id="proof" eyebrow="The proof" title="See the database choice, made visible.">
        <p className="mb-8 max-w-2xl text-lg leading-relaxed text-[var(--muted)]">
          The console ships two engines and a toggle. Fire the same surge at both —
          a legacy inventory system double-promises a unit; Sanguine on Aurora DSQL holds at zero.
        </p>
        <div className="grid gap-5 md:grid-cols-2">
          <ProofCard
            bad
            tag="Legacy system"
            big="2"
            label="hospitals promised the same unit"
            body="Last-write-wins. Under a surge, the same bag #1182 gets allocated twice. A patient is left without blood."
          />
          <ProofCard
            tag="Sanguine · Aurora DSQL"
            big="0"
            label="double-promises, guaranteed"
            body="The losing request is detected at commit and instantly rerouted to the next compatible unit. Nobody loses out."
          />
        </div>
        <div className="mt-8">
          <Link
            href="/console"
            className="inline-flex rounded-xl bg-gradient-to-b from-[var(--brand)] to-[var(--brand-2)] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_6px_26px_var(--brand-glow)] transition hover:brightness-110"
          >
            Try the live toggle →
          </Link>
        </div>
      </Section>

      {/* buyers */}
      <Section id="buyers" eyebrow="Buyers" title="A network platform, not a single-hospital tool.">
        <div className="grid gap-5 md:grid-cols-3">
          <InfoCard title="Who subscribes" body="Hospital networks and blood banks — the shared allocation layer that sits between them and guarantees no unit is promised twice across the whole network." />
          <InfoCard title="Why they pay" body="Every wrongly-failed allocation is wasted blood, missed SLAs, and patient risk. Sanguine recovers that — per-facility SaaS plus a per-allocation fee." />
          <InfoCard title="Why it's defensible" body="Network effects (more centers + hospitals = better fill rates) plus a strong-consistency guarantee that naïve stacks simply cannot make." />
        </div>
        <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-6">
          <p className="text-[var(--muted)]">
            <span className="font-semibold text-[var(--foreground)]">Beyond blood:</span> the same
            engine fits any scarce, perishable, must-not-double-allocate inventory — transplant
            organ offers, vaccine doses, clinical-trial slots, reagents. Blood is the beachhead;
            the allocation guarantee is the platform.
          </p>
        </div>
      </Section>

      {/* final CTA */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-gradient-to-br from-[var(--panel)] to-[var(--background)] p-10 text-center md:p-16">
          <div className="hero-glow pointer-events-none absolute -bottom-32 left-1/2 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-[var(--brand)] opacity-20 blur-[120px]" />
          <h2 className="relative text-3xl font-bold tracking-tight sm:text-4xl">
            The strongest sentence in the pitch is literally true.
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-lg text-[var(--muted)]">
            “The database itself guarantees the same unit can&apos;t be promised twice.” Go watch it.
          </p>
          <Link
            href="/console"
            className="relative mt-8 inline-flex rounded-xl bg-gradient-to-b from-[var(--brand)] to-[var(--brand-2)] px-7 py-4 text-sm font-semibold text-white shadow-[0_6px_26px_var(--brand-glow)] transition hover:brightness-110"
          >
            Open the live console →
          </Link>
        </div>
      </section>

      {/* footer */}
      <footer className="relative z-10 border-t border-[var(--border)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-[var(--muted)] sm:flex-row">
          <span className="flex items-center gap-2">
            <span className="grid h-5 w-5 place-items-center rounded bg-gradient-to-b from-[var(--brand)] to-[var(--brand-2)] text-[10px]">🩸</span>
            Sanguine — built for the H0 Hackathon
          </span>
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Badge>Amazon Aurora DSQL</Badge>
            <Badge>Amazon Bedrock</Badge>
            <Badge>Next.js on Vercel</Badge>
          </span>
        </div>
      </footer>
      </div>
    </>
  );
}

// ---------- pieces ----------

function Stat({ n, l, accent }: { n: string; l: string; accent?: boolean }) {
  return (
    <div className="bg-[var(--background)] px-5 py-7 text-center">
      <div className="text-3xl font-bold tabular-nums sm:text-4xl" style={{ color: accent ? "var(--available)" : undefined }}>
        {n}
      </div>
      <div className="mt-1.5 text-xs text-[var(--muted)]">{l}</div>
    </div>
  );
}

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="relative z-10 mx-auto max-w-6xl scroll-mt-20 px-6 py-20">
      <div className="mb-10">
        <div className="text-sm font-semibold uppercase tracking-wider text-[var(--brand)]">{eyebrow}</div>
        <h2 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function ProofCard({
  tag,
  big,
  label,
  body,
  bad,
}: {
  tag: string;
  big: string;
  label: string;
  body: string;
  bad?: boolean;
}) {
  const c = bad ? "var(--double)" : "var(--available)";
  return (
    <div
      className="rounded-2xl border p-6"
      style={{ borderColor: c, background: bad ? "rgba(255,77,99,0.07)" : "rgba(52,211,153,0.07)" }}
    >
      <div className="text-xs uppercase tracking-wide text-[var(--muted)]">{tag}</div>
      <div className="mt-2 flex items-baseline gap-3">
        <span className="text-5xl font-extrabold tabular-nums" style={{ color: c }}>{big}</span>
        <span className="text-sm" style={{ color: c }}>{label}</span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">{body}</p>
    </div>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-6">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{body}</p>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-2.5 py-1 text-xs">{children}</span>
  );
}
