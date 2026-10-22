import { NextResponse } from "next/server";
import { ensurePlatformRuntime, transitionApplication } from "@aicte/backend";
import { apiError, handleRouteError } from "@/lib/api-server";
import { getSession } from "@/lib/session";
import { transitionSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) return apiError("Sign in to continue.", 401, "UNAUTHENTICATED");
    ensurePlatformRuntime();

    const body = transitionSchema.parse(await request.json());
    const application = transitionApplication(session, params.id, {
      target: body.target,
      notes: body.notes,
    });
    return NextResponse.json({ application });
  } catch (error) {
    return handleRouteError(error);
  }
}
