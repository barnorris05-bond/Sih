import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, FileWarning } from "lucide-react";
import { ROLE_META, isTerminalState } from "@aicte/shared";
import { ensurePlatformRuntime, listApplications } from "@aicte/backend";
import { RemediationDesk } from "@/components/forms/remediation-desk";
import { PageShell } from "@/components/layout/page-shell";
import { StateBadge } from "@/components/dashboard/state-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Deficiency desk",
};

export default async function DeficienciesPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/institution/deficiencies");
  if (session.role !== "INSTITUTION_USER") redirect(ROLE_META[session.role].home);

  ensurePlatformRuntime();
  const applications = listApplications(session);
  const target =
    applications.find(
      (application) =>
        application.currentState === "DEFICIENCY_NOTIFIED" ||
        application.currentState === "RULE_VALIDATION_FAILED",
    ) ?? applications.find((application) => !isTerminalState(application.currentState)) ?? null;

  return (
    <PageShell
      eyebrow="Institution workspace"
      title="Deficiency & remediation desk"
      description="Every show-cause item is traceable to a handbook rule. Correct the declaration, watch the index recover, and resubmit without losing the audit trail."
      actions={
        target ? (
          <>
            <StateBadge state={target.currentState} />
            <Link href="/institution">
              <Button variant="ghost" size="sm">
                Back to overview
              </Button>
            </Link>
          </>
        ) : null
      }
    >
      {target && (target.currentState === "DEFICIENCY_NOTIFIED" || target.currentState === "RULE_VALIDATION_FAILED") ? (
        <RemediationDesk initialApplication={target} />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl border border-emerald-400/25 bg-emerald-400/10">
              <CheckCircle2 className="h-6 w-6 text-emerald-300 light:text-emerald-700" />
            </span>
            <div>
              <p className="font-display text-base font-semibold text-foreground">
                No open show-cause notices
              </p>
              <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
                {target
                  ? `Your active application is currently ${target.currentState.replaceAll("_", " ").toLowerCase()}. Notices appear here automatically if rule validation fails.`
                  : "Start an application to run automated rule validation. Any unmet requirement will land here with a remediation window."}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/institution/apply">
                <Button size="sm">
                  <FileWarning className="h-3.5 w-3.5" /> Open application wizard
                </Button>
              </Link>
              <Link href="/institution">
                <Button size="sm" variant="secondary">
                  Institution overview
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
