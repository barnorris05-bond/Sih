import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FileWarning } from "lucide-react";
import { ROLE_META, ruleBook } from "@aicte/shared";
import {
  blankFormData,
  ensurePlatformRuntime,
  findInstitution,
  listApplications,
} from "@aicte/backend";
import { ApplicationWizard } from "@/components/forms/application-wizard";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toFormValues } from "@/lib/form-defaults";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Application wizard",
};

export default async function ApplyPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/institution/apply");
  if (session.role !== "INSTITUTION_USER") redirect(ROLE_META[session.role].home);
  if (!session.institutionId) redirect("/institution");

  ensurePlatformRuntime();
  const applications = listApplications(session);
  const draft = applications.find((application) => application.currentState === "DRAFT") ?? null;
  const openDeficiency =
    applications.find(
      (application) =>
        application.currentState === "DEFICIENCY_NOTIFIED" ||
        application.currentState === "RULE_VALIDATION_FAILED",
    ) ?? null;
  const institution = findInstitution(session.institutionId);

  const base = blankFormData(session.institutionId);
  const fallback = {
    ...base,
    institutionName: institution?.name ?? session.institutionName ?? "",
    state: institution?.state ?? "",
    region: institution?.region ?? "",
    city: institution?.city ?? "",
    landArea: institution?.landAreaSqMeters ?? 0,
    builtUpArea: institution?.builtUpAreaSqMeters ?? 0,
  };

  const initialValues = toFormValues(draft?.formData ?? fallback);

  return (
    <PageShell
      eyebrow="Institution workspace"
      title={draft ? "Continue your application" : "2026-27 approval application"}
      description="Declare programmes, faculty and infrastructure. The compliance index is computed live and re-validated on the server at submission."
      actions={
        <>
          <Badge variant="indigo" dot>
            Handbook {ruleBook.version}
          </Badge>
          {openDeficiency ? (
            <Link href="/institution/deficiencies">
              <Button variant="danger" size="sm">
                <FileWarning className="h-3.5 w-3.5" /> Open deficiency
              </Button>
            </Link>
          ) : null}
        </>
      }
    >
      <ApplicationWizard
        initialValues={initialValues}
        applicationId={draft?.id}
        openDeficiencyId={openDeficiency?.id}
        institutionName={institution?.name ?? "your institution"}
      />
    </PageShell>
  );
}
