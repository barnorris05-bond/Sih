import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Landmark, Radio } from "lucide-react";
import { ROLE_META } from "@aicte/shared";
import {
  ensurePlatformRuntime,
  getAnalytics,
  getSlaQueue,
  listApplications,
  recentEvents,
} from "@aicte/backend";
import { CommandCenter } from "@/components/admin/command-center";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Executive command center",
};

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/admin");
  if (session.role !== "AICTE_ADMIN" && session.role !== "REGIONAL_OFFICER") {
    redirect(ROLE_META[session.role].home);
  }

  ensurePlatformRuntime();
  const analytics = getAnalytics();
  const applications = listApplications(session);
  const events = recentEvents(50);
  const slaQueue = getSlaQueue(10);
  const canDecide = session.role === "AICTE_ADMIN";

  return (
    <PageShell
      eyebrow="Executive command center"
      title="National approval intelligence"
      description="Every institution, rule gap and SLA clock in one operational picture. Final decisions remain guarded by the workflow state machine and role policy."
      actions={
        <>
          <Badge variant="success" dot>
            <Radio className="mr-0.5 h-2.5 w-2.5" /> Live
          </Badge>
          <Badge variant="neutral">
            <Landmark className="mr-1 h-3 w-3" />
            {session.role === "AICTE_ADMIN" ? "National scope" : "Regional scope"}
          </Badge>
          <Badge variant="indigo">{session.name}</Badge>
        </>
      }
    >
      <CommandCenter
        analytics={analytics}
        applications={applications}
        events={events}
        slaQueue={slaQueue}
        canDecide={canDecide}
        actorName={session.name}
        scopeLabel={session.role === "AICTE_ADMIN" ? "National" : "Regional"}
      />
    </PageShell>
  );
}
