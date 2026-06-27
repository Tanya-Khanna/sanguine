import Link from "next/link";

export default function Landing() {
  return (
    <div className="relative overflow-hidden">
      {/* ambient glows */}
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" />
      <div className="hero-glow pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[var(--brand)] opacity-25 blur-[140px]" />

      {/* nav */}
      <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-b from-[var(--brand)] to-[var(--brand-2)]">🩸</span>
          Sanguine
        </Link>
        <div className="hidden items-center gap-7 text-sm text-[var(--muted)] md:flex">
          <a href="#problem" className="transition hover:text-[var(--foreground)]">Problem</a>
          <a href="#how" className="transition hover:text-[var(--foreground)]">How it works</a>
          <a href="#who" className="transition hover:text-[var(--foreground)]">For whom</a>
        </div>
        <Link
          href="/console"
          className="rounded-xl bg-gradient-to-b from-[var(--brand)] to-[var(--brand-2)] px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_20px_var(--brand-glow)] transition hover:brightness-110"
        >
          Open live console →
        </Link>
      </nav>

      {/* hero */}
      <header className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-12 lg:grid-cols-[1.1fr_0.9fr] lg:pt-20">
        <div className="fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1 text-xs text-[var(--muted)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--available)]" />
            Built on Amazon Aurora DSQL · deployed on Vercel
          </span>
          <h1 className="mt-5 text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            Never promise the same blood unit <span className="text-gradient">twice.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-[var(--muted)]">
            Sanguine is the shared allocation network for blood centers and hospitals.
            When demand surges, the database itself guarantees one unit goes to exactly
            one patient — and lets you watch it hold under pressure.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/console"
              className="rounded-xl bg-gradient-to-b from-[var(--brand)] to-[var(--brand-2)] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_6px_26px_var(--brand-glow)] transition hover:brightness-110"
            >
              See it live →
            </Link>
            <a
              href="#how"
              className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-6 py-3.5 text-sm font-semibold transition hover:border-[var(--muted)]"
            >
              How it works
            </a>
          </div>
          <p className="mt-6 text-xs text-[var(--muted)]">
            No login. Click <span className="text-[var(--foreground)]">Simulate a demand surge</span> and watch the guarantee.
          </p>
        </div>

        {/* hero visual: the live guarantee */}
        <HeroVisual />
      </header>

      {/* stat band */}
      <section className="relative z-10 border-y border-[var(--border)] bg-[var(--panel)]/40">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-6 md:grid-cols-4">
          <Stat n="16M+" l="units transfused / year (US)" />
          <Stat n="45,000" l="units needed every single day" />
          <Stat n="~35%" l="supply drop → Red Cross emergency, Jan 2026" />
          <Stat n="0" l="double-promises Sanguine allows" accent />
        </div>
      </section>

      {/* problem */}
      <Section id="problem" eyebrow="The problem" title="The blood usually exists. Coordination loses it.">
        <div className="grid gap-6 md:grid-cols-2">
          <p className="text-lg leading-relaxed text-[var(--muted)]">
            Shortages are rarely a pure donation problem — they&apos;re a{" "}
            <span className="text-[var(--foreground)]">coordination</span> problem. The right
            unit often exists somewhere in the network, but it can be promised to two
            hospitals at once. One patient&apos;s transfusion silently evaporates.
          </p>
          <p className="text-lg leading-relaxed text-[var(--muted)]">
            Blood is perishable and slow to ready — up to three days to test and process.
            A leading cause of <span className="text-[var(--foreground)]">waste</span> is the
            inability to move units to where they&apos;re needed before they expire. Sanguine
            closes that gap: never double-promise, always use the soonest-to-expire compatible
            unit, and keep an auditable trail of every decision.
          </p>
        </div>
      </Section>

      {/* how it works */}
      <Section id="how" eyebrow="How it works" title="Agents make it usable. The database makes it trustworthy.">
        <div className="grid gap-5 md:grid-cols-3">
          <Step
            n="01"
            title="Just ask, in plain English"
            body="A clinician types “we need 4 units of A negative within 72 hours.” An AI intake agent (Claude on Amazon Bedrock) turns it into a structured order — no forms, no training."
          />
          <Step
            n="02"
            title="The engine allocates — safely"
            body="Every request is matched against a shared pool: compatible blood types, soonest-to-expire first. Aurora DSQL’s strong consistency ensures two hospitals can never win the same unit."
            highlight
          />
          <Step
            n="03"
            title="Every action is auditable"
            body="Reserved, allocated, rerouted, released, expired — each is a permanent event in an append-only ledger you can replay. The compliance story buyers actually pay for."
          />
        </div>
      </Section>

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

      {/* who it's for */}
      <Section id="who" eyebrow="For whom" title="A network platform, not a single-hospital tool.">
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
  );
}

// ---------- pieces ----------

function HeroVisual() {
  // a small grid of "units"; one flares red (contested) but the guard holds at 0
  const cells = Array.from({ length: 35 });
  return (
    <div className="fade-up relative" style={{ animationDelay: "120ms" }}>
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel)]/80 p-6 shadow-2xl backdrop-blur">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Double-promised units</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-6xl font-extrabold tabular-nums text-[var(--available)]">0</span>
              <span className="text-sm font-medium text-[var(--available)]">✓ guaranteed</span>
            </div>
          </div>
          <span className="rounded-full border border-[var(--available)]/40 bg-[var(--available)]/10 px-3 py-1 text-xs text-[var(--available)]">
            strong consistency
          </span>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {cells.map((_, i) => {
            const contested = i === 17;
            const reserved = [4, 9, 12, 23, 28].includes(i);
            const bg = contested
              ? "var(--brand)"
              : reserved
                ? "var(--held)"
                : "var(--available)";
            return (
              <span
                key={i}
                className="aspect-square rounded-md"
                style={{
                  background: bg,
                  opacity: contested ? 1 : 0.22,
                  animation: contested ? "floatPulse 1.4s ease-in-out infinite" : undefined,
                }}
              />
            );
          })}
        </div>
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-[var(--allocated)]/30 bg-[var(--allocated)]/10 px-3 py-2.5 text-xs text-[var(--allocated)]">
          ↪ Unit #1182 contested by two hospitals — automatically rerouted to #1190.
        </div>
      </div>
    </div>
  );
}

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

function Step({ n, title, body, highlight }: { n: string; title: string; body: string; highlight?: boolean }) {
  return (
    <div
      className="rounded-2xl border bg-[var(--panel)] p-6 transition hover:-translate-y-0.5"
      style={{ borderColor: highlight ? "var(--brand)" : "var(--border)" }}
    >
      <div className="text-sm font-mono text-[var(--brand)]">{n}</div>
      <h3 className="mt-3 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{body}</p>
    </div>
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
