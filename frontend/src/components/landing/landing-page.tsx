import Link from "next/link";
import { ArrowRight, BadgeCheck, BookOpenCheck, Building2, CheckCircle2, ClipboardCheck, Gavel, Gauge } from "lucide-react";
import { buildAnalytics } from "@aicte/backend";
import { ROLE_META, ruleBook } from "@aicte/shared";
import { ComplianceGauge } from "@/components/dashboard/compliance-gauge";
import { FadeIn, StaggerGroup, StaggerItem } from "@/components/animations/fade-in";
import { ApprovalJourney } from "@/components/universe/approval-journey";
import { CapabilityStory } from "@/components/landing/capability-story";
import { HandbookExplorer } from "@/components/landing/handbook-explorer";
import { MilestoneTimeline } from "@/components/landing/milestone-timeline";
import { NarrativeBridge } from "@/components/landing/narrative-bridge";
import { FinalCta } from "@/components/landing/final-cta";

const PORTALS = [
  { role: "INSTITUTION_USER" as const, href: "/login?role=institution&next=/institution", icon: Building2, tone: "indigo" },
  { role: "SCRUTINY_MEMBER" as const, href: "/login?role=reviewer&next=/reviewer", icon: Gavel, tone: "sky" },
  { role: "AICTE_ADMIN" as const, href: "/login?role=admin&next=/admin", icon: Gauge, tone: "violet" },
];

export function LandingPage() {
  const { kpis } = buildAnalytics();
  return <div className="landing-page min-h-full overflow-x-clip">
    <ApprovalJourney />
    <CapabilityStory />
    <NarrativeBridge />
    <MilestoneTimeline />
    <section id="portals" className="border-y border-white/[0.06] bg-white/[0.018]"><div className="mx-auto w-full max-w-[1440px] px-4 py-20 sm:px-6 lg:px-8"><FadeIn className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div className="max-w-2xl"><p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-indigo-300/80">Role gateways</p><h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">The right workspace for every decision-maker.</h2></div><Link href="/login" className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-300 hover:text-indigo-200">Open the portal <ArrowRight className="h-3.5 w-3.5" /></Link></FadeIn><StaggerGroup className="mt-9 grid gap-4 lg:grid-cols-3">{PORTALS.map((portal) => { const meta = ROLE_META[portal.role]; return <StaggerItem key={portal.role}><Link href={portal.href} className="group relative flex h-full min-h-[230px] flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-background/40 p-6 transition-all hover:-translate-y-1 hover:border-indigo-400/35"><div className={`absolute -right-12 -top-12 h-40 w-40 rounded-full blur-3xl ${portal.tone === "sky" ? "bg-sky-500/20" : portal.tone === "violet" ? "bg-violet-500/20" : "bg-indigo-500/20"}`} /><div className="relative flex items-center justify-between"><span className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.05] text-foreground"><portal.icon className="h-5 w-5" /></span><ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" /></div><h3 className="relative mt-6 font-display text-lg font-semibold text-foreground">{meta.label}</h3><p className="relative mt-2 flex-1 text-xs leading-relaxed text-muted-foreground">{meta.description}</p><span className="relative mt-5 inline-flex items-center gap-2 text-[10px] font-medium text-indigo-200"><BadgeCheck className="h-3.5 w-3.5" /> Enter role-scoped workspace</span></Link></StaggerItem>; })}</StaggerGroup></div></section>
    <section id="handbook" className="mx-auto grid w-full max-w-[1440px] gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8"><FadeIn><p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-indigo-300/80">Handbook engine</p><h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Rules that can be read, tested and remediated.</h2><p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">{ruleBook.source}. Search the demonstration rule book by category or reference code; the content remains illustrative, not official legal guidance.</p><div className="mt-8 flex items-center gap-5 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5"><ComplianceGauge score={kpis.averageCompliance} size={118} strokeWidth={9} label="Dataset index" /><div className="space-y-3 text-xs"><p className="flex items-center gap-2 text-muted-foreground"><BookOpenCheck className="h-3.5 w-3.5 text-indigo-300" /> Version <span className="font-mono text-foreground">{ruleBook.version}</span></p><p className="flex items-center gap-2 text-muted-foreground"><ClipboardCheck className="h-3.5 w-3.5 text-emerald-300" /> {ruleBook.rules.length} validation rules loaded</p><p className="text-[10px] text-muted-foreground/75">Illustrative seeded dataset, not a live national statistic.</p></div></div></FadeIn><HandbookExplorer /></section>
    <FinalCta />
  </div>;
}
