import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileWarning,
  Gauge,
  Gavel,
  Landmark,
  ScanLine,
  ShieldCheck,
  Sparkles,
  TimerReset,
} from "lucide-react";
import { buildAnalytics } from "@aicte/backend";
import { ROLE_META, ruleBook } from "@aicte/shared";
import { CountUp } from "@/components/animations/count-up";
import { FadeIn, StaggerGroup, StaggerItem } from "@/components/animations/fade-in";
import { Hero } from "@/components/landing/hero";
import { ComplianceGauge } from "@/components/dashboard/compliance-gauge";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

const WORKFLOW = [
  {
    icon: Building2,
    title: "Declare",
    body: "Institutions build the application in a guided wizard with live scoring on every field.",
  },
  {
    icon: ScanLine,
    title: "Auto-validate",
    body: "Six handbook rules evaluate the JSON payload before a human ever opens the file.",
  },
  {
    icon: ClipboardCheck,
    title: "Scrutinise",
    body: "The scrutiny desk audits documents side-by-side with the rule verdict.",
  },
  {
    icon: FileWarning,
    title: "Remediate",
    body: "Show-cause notices carry rule-level evidence and a ticking remediation window.",
  },
  {
    icon: Landmark,
    title: "Inspect",
    body: "Expert Visit Committees are scheduled with a fresh SLA and full audit context.",
  },
  {
    icon: CheckCircle2,
    title: "Decide",
    body: "Approvals issue a letter; every transition stays immutable in the audit log.",
  },
];

const PORTALS = [
  {
    role: "INSTITUTION_USER" as const,
    href: "/login?role=institution&next=/institution",
    icon: Building2,
    accent: "from-indigo-500/20",
    ring: "group-hover:border-indigo-400/40",
  },
  {
    role: "SCRUTINY_MEMBER" as const,
    href: "/login?role=reviewer&next=/reviewer",
    icon: Gavel,
    accent: "from-sky-500/20",
    ring: "group-hover:border-sky-400/40",
  },
  {
    role: "AICTE_ADMIN" as const,
    href: "/login?role=admin&next=/admin",
    icon: Gauge,
    accent: "from-violet-500/20",
    ring: "group-hover:border-violet-400/40",
  },
];

export default function LandingPage() {
  const analytics = buildAnalytics();
  const { kpis } = analytics;

  return (
    <div>
      <Hero />

      <section className="border-y border-white/[0.06] bg-white/[0.015]">
        <div className="mx-auto grid w-full max-w-[1440px] grid-cols-2 gap-px px-4 py-8 sm:px-6 md:grid-cols-4 lg:px-8">
          {[
            { label: "Applications in pipeline", value: kpis.totalApplications, suffix: "" },
            { label: "Approval rate", value: kpis.approvalRate, suffix: "%" },
            { label: "Open deficiencies", value: kpis.activeDeficiencies, suffix: "" },
            { label: "SLA breaches", value: kpis.slaBreaches, suffix: "" },
          ].map((stat, index) => (
            <FadeIn key={stat.label} delay={index * 0.05} className="px-4 py-2">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {stat.label}
              </p>
              <p className="mt-1 font-display text-3xl font-semibold tabular-nums text-foreground">
                <CountUp value={stat.value} suffix={stat.suffix} />
              </p>
            </FadeIn>
          ))}
        </div>
      </section>

      <section id="workflow" className="mx-auto w-full max-w-[1440px] px-4 py-20 sm:px-6 lg:px-8">
        <FadeIn className="max-w-2xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-indigo-300/80">
            The workflow
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            One state machine. Zero paper chases.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Every stage is an explicit, permission-guarded transition. Nothing skips scrutiny,
            and nothing silently stalls.
          </p>
        </FadeIn>

        <StaggerGroup className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {WORKFLOW.map((step, index) => (
            <StaggerItem key={step.title}>
              <div className="group relative h-full overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-indigo-400/30 hover:bg-white/[0.04]">
                <div className="flex items-center justify-between">
                  <span className="grid h-9 w-9 place-items-center rounded-xl border border-indigo-400/20 bg-indigo-500/10 text-indigo-300">
                    <step.icon className="h-4 w-4" />
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground/60">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-4 font-display text-sm font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{step.body}</p>
                <span className="pointer-events-none absolute inset-x-8 bottom-0 h-px bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </section>

      <section id="portals" className="mx-auto w-full max-w-[1440px] px-4 pb-20 sm:px-6 lg:px-8">
        <FadeIn className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-indigo-300/80">
              Role gateways
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Three portals, one source of truth.
            </h2>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-300 transition-colors hover:text-indigo-200"
          >
            Browse demo credentials <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </FadeIn>

        <StaggerGroup className="mt-8 grid gap-4 lg:grid-cols-3">
          {PORTALS.map((portal) => {
            const meta = ROLE_META[portal.role];
            return (
              <StaggerItem key={portal.role}>
                <Link
                  href={portal.href}
                  className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 transition-all duration-300 hover:-translate-y-1 ${portal.ring}`}
                >
                  <div
                    className={`pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br ${portal.accent} to-transparent blur-2xl transition-opacity duration-500 group-hover:opacity-100`}
                  />
                  <div className="flex items-center justify-between">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.05] text-foreground">
                      <portal.icon className="h-5 w-5" />
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-foreground" />
                  </div>
                  <h3 className="mt-5 font-display text-lg font-semibold text-foreground">
                    {meta.label}
                  </h3>
                  <p className="mt-2 flex-1 text-xs leading-relaxed text-muted-foreground">
                    {meta.description}
                  </p>
                  <div className="mt-5 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <ShieldCheck className="h-3 w-3 text-emerald-400" />
                    Role-scoped access enforced at the edge
                  </div>
                </Link>
              </StaggerItem>
            );
          })}
        </StaggerGroup>
      </section>

      <section id="handbook" className="border-y border-white/[0.06] bg-white/[0.015]">
        <div className="mx-auto grid w-full max-w-[1440px] gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
          <FadeIn>
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-indigo-300/80">
              Handbook engine
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              The rules are code,
              <br />
              not a PDF.
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              {ruleBook.source}. Each constraint carries a weight, severity and remediation
              guidance, so the compliance index is explainable line by line.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-6 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
              <ComplianceGauge
                score={kpis.averageCompliance}
                size={140}
                strokeWidth={10}
                label="National avg."
              />
              <div className="space-y-3 text-xs">
                <div>
                  <p className="flex items-center gap-1.5 text-muted-foreground">
                    <TimerReset className="h-3.5 w-3.5 text-indigo-300" /> Median cycle time
                  </p>
                  <p className="mt-0.5 font-display text-lg font-semibold text-foreground">
                    {kpis.medianCycleDays} days
                  </p>
                </div>
                <div>
                  <p className="flex items-center gap-1.5 text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-300" /> Rule book version
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-foreground">{ruleBook.version}</p>
                </div>
              </div>
            </div>
          </FadeIn>

          <StaggerGroup className="grid gap-3 sm:grid-cols-2">
            {ruleBook.rules.map((rule) => (
              <StaggerItem key={rule.code}>
                <div className="flex h-full flex-col rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-foreground">{rule.title}</p>
                    <Badge variant={rule.severity === "CRITICAL" ? "danger" : "warning"}>
                      {rule.severity}
                    </Badge>
                  </div>
                  <p className="mt-2 flex-1 text-[11px] leading-relaxed text-muted-foreground">
                    {rule.description}
                  </p>
                  <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-2">
                    <span className="font-mono text-[9px] text-muted-foreground/70">
                      {rule.code}
                    </span>
                    <span className="text-[9px] font-medium text-indigo-300">
                      {Math.round(rule.weight * 100)}% weight
                    </span>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1440px] px-4 py-20 sm:px-6 lg:px-8">
        <FadeIn className="relative overflow-hidden rounded-3xl border border-indigo-400/20 bg-gradient-to-br from-indigo-500/[0.12] via-white/[0.02] to-sky-500/[0.08] p-8 sm:p-12">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-[100px]" />
          <div className="relative max-w-2xl">
            <Badge variant="indigo" dot>
              Demo dataset loaded · {formatNumber(kpis.totalApplications)} applications
            </Badge>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Walk into any role and feel the workflow move.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Seeded applications span every state, including deficient files and live SLA
              escalations. Sign in as an institution, scrutiniser or administrator.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/login">
                <ButtonLike>Open the portal</ButtonLike>
              </Link>
              <Link href="/login?role=admin&next=/admin">
                <ButtonLike variant="ghost">Jump to command center</ButtonLike>
              </Link>
            </div>
          </div>
        </FadeIn>
      </section>
    </div>
  );
}

function ButtonLike({
  children,
  variant = "primary",
}: {
  children: React.ReactNode;
  variant?: "primary" | "ghost";
}) {
  return (
    <span
      className={
        variant === "primary"
          ? "inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 px-5 text-sm font-medium text-white shadow-[0_12px_40px_-16px_rgba(99,102,241,0.9)] transition hover:brightness-110"
          : "inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 px-5 text-sm font-medium text-foreground transition hover:bg-white/[0.06]"
      }
    >
      {children}
    </span>
  );
}
