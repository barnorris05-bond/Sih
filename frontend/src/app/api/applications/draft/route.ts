import { NextResponse } from "next/server";
import { ensurePlatformRuntime, saveDraft } from "@aicte/backend";
import { apiError, handleRouteError, timed, readJsonBody } from "@/lib/api-server";
import { getSession } from "@/lib/session";
import { draftFormSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const POST = timed("applications.draft", async (request: Request) => {
  try {
    const session = await getSession();
    if (!session) return apiError("Sign in to continue.", 401, "UNAUTHENTICATED");
    ensurePlatformRuntime();

    const body = (await readJsonBody(request)) as { formData?: unknown; applicationId?: string };
    const formData = draftFormSchema.parse(body.formData);
    const application = await saveDraft(session, formData, body.applicationId);
    return NextResponse.json({ application });
  } catch (error) {
    return handleRouteError(error);
  }
});
