import { NextResponse } from "next/server";
import { ensurePlatformRuntime, resubmitApplication } from "@aicte/backend";
import { apiError, handleRouteError } from "@/lib/api-server";
import { getSession } from "@/lib/session";
import { applicationFormSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) return apiError("Sign in to continue.", 401, "UNAUTHENTICATED");
    ensurePlatformRuntime();

    const body = (await request.json()) as { formData?: unknown };
    const formData = applicationFormSchema.parse(body.formData);
    const application = resubmitApplication(session, params.id, formData);
    return NextResponse.json({ application });
  } catch (error) {
    return handleRouteError(error);
  }
}
