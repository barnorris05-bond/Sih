import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { ruleBook } from "@aicte/shared";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-white/[0.06] py-8">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 grid h-7 w-7 place-items-center rounded-lg border border-white/10 bg-white/[0.04]">
            <ShieldCheck className="h-3.5 w-3.5 text-indigo-300" />
          </span>
          <div>
            <p className="text-xs font-medium text-foreground">AICTE Approval Workflow & Compliance Platform</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              SIH26262 prototype · Rule book {ruleBook.version} · Effective {ruleBook.effectiveFrom}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-[10px] text-muted-foreground">
          <Link href="/" className="transition-colors hover:text-foreground">
            Home
          </Link>
          <Link href="/login" className="transition-colors hover:text-foreground">
            Portals
          </Link>
          <a href="#handbook" className="transition-colors hover:text-foreground">
            Handbook rules
          </a>
          <span className="rounded-full border border-white/10 px-2 py-0.5">Demo environment</span>
        </div>
      </div>
    </footer>
  );
}
