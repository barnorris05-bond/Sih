import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  Database,
  FileCode2,
  Gauge,
  Gavel,
  ShieldCheck,
  Sparkles,
  TimerReset,
  TrendingUp,
} from "lucide-react";
import { buildAnalytics } from "@aicte/backend";
import { ROLE_META, ruleBook } from "@aicte/shared";
import { CountUp } from "@/components/animations/count-up";
import { FadeIn, StaggerGroup, StaggerItem } from "@/components/animations/fade-in";
import { Hero } from "@/components/landing/hero";
import { ScrollStory } from "@/components/landing/scroll-story";
import { ComplianceGauge } from "@/components/dashboard/compliance-gauge";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PORTALS = [
  {
    role: "INSTITUTION_USER" as const,
    href: "/login?role=institution&next=/institution",
    icon: Building2,
    tag: "College Portal",
    accent: "from-violet-500/25",
    borderGlow: "hover:border-violet-400/50 group-hover:shadow-[0_0_30px_-5px_rgba(99,102,241,0.3)]",
    badgeVariant: "indigo" as const,
  },
  {
    role: "SCRUTINY_MEMBER" as const,
    href: "/login?role=reviewer&next=/reviewer",
    icon: Gavel,
    tag: "Evaluation Desk",
    accent: "from-sky-500/25",
    borderGlow: "hover:border-sky-400/50 group-hover:shadow-[0_0_30px_-5px_rgba(56,189,248,0.3)]",
    badgeVariant: "info" as const,
  },
  {
    role: "AICTE_ADMIN" as const,
    href: "/login?role=admin&next=/admin",
    icon: Gauge,
    tag: "Apex Command",
    accent: "from-violet-500/25",
    borderGlow: "hover:border-violet-400/50 group-hover:shadow-[0_0_30px_-5px_rgba(168,85,247,0.3)]",
    badgeVariant: "violet" as const,
  },
];

function LandingPage() {
  const analytics = buildAnalytics();
  const { kpis } = analytics;

  return (
    <div className="space-y-6">
      {/* SECTION 1: HERO */}
      <Hero />

      {/* SECTION 2: OPERATIONAL KPI STRIP */}
      <section className="border-y border-white/[0.08] bg-slate-950/60 py-6">
        <div className="mx-auto grid w-full max-w-[1440px] grid-cols-2 gap-4 px-4 sm:px-6 md:grid-cols-4 lg:px-8">
          {[
            {
              label: "Applications in pipeline",
              value: kpis.totalApplications,
              suffix: "",
              desc: "Processed across all stages",
              color: "text-violet-300 light:text-violet-700",
            },
            {
              label: "Approval success rate",
              value: kpis.approvalRate,
              suffix: "%",
              desc: "Based on automated checks",
              color: "text-emerald-400",
            },
            {
              label: "Active deficiencies",
              value: kpis.activeDeficiencies,
              suffix: "",
              desc: "Under active institutional cure",
              color: "text-amber-400",
            },
            {
              label: "SLA breaches logged",
              value: kpis.slaBreaches,
              suffix: "",
              desc: "Zero unescalated stalls",
              color: "text-sky-400",
            },
          ].map((stat, index) => (
            <FadeIn
              key={stat.label}
              delay={index * 0.06}
              className="group relative rounded-2xl border border-white/[0.07] bg-white/[0.04] p-4 transition-all duration-300 hover:border-white/15 hover:bg-white/[0.04]"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {stat.label}
                </p>
                <span className={`h-1.5 w-1.5 rounded-full ${stat.color} opacity-75`} />
              </div>
              <p className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl tabular-nums">
                <CountUp value={stat.value} suffix={stat.suffix} />
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground/70">{stat.desc}</p>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* SECTION 3: SIX-STAGE SCROLL STORY (WORKFLOW) */}
      <ScrollStory />

      {/* SECTION 4: ROLE GATEWAYS */}
      <section id="portals" className="mx-auto w-full max-w-[1440px] px-4 py-20 sm:px-6 lg:px-8 scroll-mt-16">
        <FadeIn className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-200 light:text-violet-700">
              Access Gateways
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Three workspaces, one single source of truth.
            </h2>
            <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed">
              Every participant operates within a purpose-built workspace guarded by role-scoped JWT tokens and statutory permissions.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-200 transition-colors hover:text-violet-100 light:text-violet-700 light:hover:text-violet-800"
          >
            Browse test credentials <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </FadeIn>

        <StaggerGroup className="mt-10 grid gap-5 lg:grid-cols-3">
          {PORTALS.map((portal) => {
            const meta = ROLE_META[portal.role];
            return (
              <StaggerItem key={portal.role}>
                <Link
                  href={portal.href}
                  className={`group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 transition-all duration-300 hover:-translate-y-1.5 ${portal.borderGlow}`}
                >
                  {/* Subtle top-right ambient blur */}
                  <div
                    className={`pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-gradient-to-br ${portal.accent} to-transparent blur-2xl transition-opacity duration-500 group-hover:opacity-100 opacity-60`}
                  />

                  <div>
                    <div className="flex items-center justify-between">
                      <span className="grid h-12 w-12 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-foreground transition-colors group-hover:border-white/20 group-hover:bg-white/[0.08]">
                        <portal.icon className="h-5 w-5 text-violet-100 light:text-violet-700" />
                      </span>
                      <Badge variant={portal.badgeVariant} dot>
                        {portal.tag}
                      </Badge>
                    </div>

                    <h3 className="mt-5 font-display text-xl font-bold text-foreground">
                      {meta.label}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {meta.description}
                    </p>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-[11px]">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                      Edge role guard active
                    </span>
                    <span className="inline-flex items-center gap-1 font-medium text-violet-200 light:text-violet-700 transition-transform group-hover:translate-x-1">
                      Enter <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              </StaggerItem>
            );
          })}
        </StaggerGroup>
      </section>

      {/* SECTION 5: HANDBOOK ENGINE & STATUTORY RULES */}
      <section id="handbook" className="border-y border-white/[0.08] bg-white/[0.03] scroll-mt-16">
        <div className="mx-auto grid w-full max-w-[1440px] gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
          <FadeIn>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-300 light:text-sky-700">
              Handbook Rules Engine
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              The statutory rules are code,
              <br />
              not a static document.
            </h2>
            <p className="mt-3.5 max-w-md text-sm leading-relaxed text-muted-foreground">
              {ruleBook.source}. Every constraint evaluates deterministically with an explicit severity weight and remediation guidelines line by line.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-6 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
              <ComplianceGauge
                score={kpis.averageCompliance}
                size={144}
                strokeWidth={10}
                label="National avg."
              />
              <div className="space-y-4 text-xs">
                <div>
                  <p className="flex items-center gap-1.5 text-muted-foreground">
                    <TimerReset className="h-3.5 w-3.5 text-violet-200 light:text-violet-700" /> Median cycle time
                  </p>
                  <p className="mt-1 font-display text-2xl font-bold text-foreground">
                    {kpis.medianCycleDays} <span className="text-sm font-normal text-muted-foreground">days</span>
                  </p>
                </div>
                <div>
                  <p className="flex items-center gap-1.5 text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-300 light:text-emerald-700" /> Active rule release
                  </p>
                  <p className="mt-0.5 font-mono text-xs font-semibold text-foreground">{ruleBook.version}</p>
                </div>
              </div>
            </div>
          </FadeIn>

          <StaggerGroup className="grid gap-3 sm:grid-cols-2">
            {ruleBook.rules.map((rule) => (
              <StaggerItem key={rule.code}>
                <div className="flex h-full flex-col justify-between rounded-xl border border-white/[0.07] bg-white/[0.04] p-4 transition-colors hover:border-white/15 hover:bg-white/[0.035]">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold text-foreground">{rule.title}</p>
                      <Badge variant={rule.severity === "CRITICAL" ? "danger" : "warning"}>
                        {rule.severity}
                      </Badge>
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                      {rule.description}
                    </p>
                  </div>
                  <div className="mt-3.5 flex items-center justify-between border-t border-white/10 pt-2.5">
                    <span className="font-mono text-[9px] text-muted-foreground/80">
                      {rule.code}
                    </span>
                    <span className="text-[10px] font-semibold text-violet-200 light:text-violet-700">
                      {Math.round(rule.weight * 100)}% evaluation weight
                    </span>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* SECTION 6: FINAL DEMO CALL TO ACTION */}
      <section className="mx-auto w-full max-w-[1440px] px-4 py-20 sm:px-6 lg:px-8">
        <FadeIn className="relative overflow-hidden rounded-3xl border border-violet-400/25 bg-gradient-to-br from-violet-500/[0.14] via-slate-900/60 to-sky-500/[0.1] p-8 sm:p-14 shadow-2xl">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-violet-500/25 blur-[120px]" />
          <div className="relative max-w-2xl">
            <Badge variant="indigo" dot>
              Demo environment initialized · {formatNumber(kpis.totalApplications)} live applications loaded
            </Badge>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
              Experience the autonomous approval workflow.
            </h2>
            <p className="mt-3.5 text-sm leading-relaxed text-muted-foreground sm:text-base">
              The seeded dataset spans draft filings, automated rule evaluations, active deficiency remediation windows, and sealed executive orders.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/login">
                <ButtonLike>Open the portal workspace</ButtonLike>
              </Link>
              <Link href="/login?role=admin&next=/admin">
                <ButtonLike variant="ghost">Jump to administrator command center</ButtonLike>
              </Link>
            </div>
          </div>
        </FadeIn>
      </section>
    </div>
  );
}

export default LandingPage;

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
          ? "inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-sky-500 px-6 text-sm font-semibold text-white shadow-[0_12px_40px_-16px_rgba(99,102,241,0.9)] transition-all hover:brightness-110 cursor-pointer"
          : "inline-flex h-12 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-6 text-sm font-semibold text-foreground transition-all hover:bg-white/[0.09] cursor-pointer"
      }
    >
      {children}
    </span>
  );
}
