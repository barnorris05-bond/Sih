import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ROLE_META, type Application, type ApplicationState } from "@aicte/shared";
import { ensurePlatformRuntime, listApplications } from "@aicte/backend";
import { ReviewerDesk } from "@/components/reviewer/reviewer-desk";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Scrutiny desk",
};

const PRIORITY: Record<ApplicationState, number> = {
  SUBMITTED: 0,
  UNDER_SCRUTINY: 1,
  EVC_INSPECTION: 2,
  DEFICIENCY_NOTIFIED: 3,
  RULE_VALIDATION_FAILED: 4,
  APPROVED: 5,
  REJECTED: 6,
  DRAFT: 7,
};

export default async function ReviewerPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/reviewer");
  if (session.role === "INSTITUTION_USER") redirect(ROLE_META[session.role].home);

  ensurePlatformRuntime();
  const applications: Application[] = listApplications(session)
    .filter((application) => application.currentState !== "DRAFT")
    .sort((a, b) => {
      const byPriority = (PRIORITY[a.currentState] ?? 9) - (PRIORITY[b.currentState] ?? 9);
      if (byPriority !== 0) return byPriority;
      if (a.escalated !== b.escalated) return a.escalated ? -1 : 1;
      return b.updatedAt.localeCompare(a.updatedAt);
    });

  const actionable = applications.filter((application) =>
    ["SUBMITTED", "UNDER_SCRUTINY", "EVC_INSPECTION"].includes(application.currentState),
  ).length;

  return (
    <PageShell
      eyebrow="Scrutiny desk"
      title="Document audit & verdicts"
      description="Audit declared metrics against statutory rules, verify evidence and issue rule-level show-cause notices. Final decisions are role-guarded and fully audited."
      actions={
        <>
          <Badge variant="indigo" dot>
            {actionable} awaiting action
          </Badge>
          <Badge variant="neutral">{session.name}</Badge>
        </>
      }
    >
      <ReviewerDesk initialApplications={applications} />
    </PageShell>
  );
}
