"use client";

import Link from "next/link";
import { ArrowUp, Building2, ShieldCheck, Sparkles } from "lucide-react";
import { ruleBook } from "@aicte/shared";

export function SiteFooter() {
  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <footer className="mt-20 border-t border-white/[0.08] bg-slate-950/80 pt-12 pb-10">
      <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4 pb-12 border-b border-white/10">
          {/* Identity column */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 text-white shadow-md shadow-violet-500/30">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <span className="font-display text-base font-bold text-foreground">
                AICTE Approval Cloud
              </span>
            </div>
            <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
              Autonomous regulatory compliance, state machine scrutiny, and boundary-aware SLA monitoring platform engineered for the AICTE Approval Process Handbook.
            </p>
            <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground/80">
              <Sparkles className="h-3.5 w-3.5 text-violet-300 light:text-violet-700" />
              <span>Smart India Hackathon 2026 · Problem Statement SIH26262</span>
            </div>
          </div>

          {/* Navigation Column */}
          <div className="space-y-3 text-xs">
            <p className="font-semibold uppercase tracking-wider text-foreground text-[10px]">
              Platform Navigation
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <a href="#workflow" className="transition-colors hover:text-foreground">
                  Six-Stage Workflow
                </a>
              </li>
              <li>
                <a href="#portals" className="transition-colors hover:text-foreground">
                  Role Portals
                </a>
              </li>
              <li>
                <a href="#handbook" className="transition-colors hover:text-foreground">
                  Handbook Rules Engine
                </a>
              </li>
              <li>
                <Link href="/login" className="transition-colors hover:text-foreground">
                  Portal Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Governance & Rule Engine Column */}
          <div className="space-y-3 text-xs">
            <p className="font-semibold uppercase tracking-wider text-foreground text-[10px]">
              Handbook Authority
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li className="font-mono text-[11px] text-violet-300 light:text-violet-700">
                {ruleBook.version}
              </li>
              <li>Effective: {ruleBook.effectiveFrom}</li>
              <li>Source: {ruleBook.source}</li>
              <li>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300 light:text-emerald-700">
                  <span className="h-1 w-1 rounded-full bg-emerald-400" /> Demo Dataset Active
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 text-[11px] text-muted-foreground sm:flex-row">
          <p>© 2026 AICTE Approval Cloud. Public Sector Governance Engine.</p>
          <div className="flex items-center gap-4">
            <Link href="/login?role=institution&next=/institution" className="hover:text-foreground transition-colors">
              Institution Desk
            </Link>
            <Link href="/login?role=reviewer&next=/reviewer" className="hover:text-foreground transition-colors">
              Scrutiny Desk
            </Link>
            <Link href="/login?role=admin&next=/admin" className="hover:text-foreground transition-colors">
              Command Center
            </Link>
            <button
              onClick={scrollToTop}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-foreground transition-all hover:bg-white/[0.08]"
              aria-label="Scroll back to top"
            >
              <ArrowUp className="h-3 w-3" /> Top
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
