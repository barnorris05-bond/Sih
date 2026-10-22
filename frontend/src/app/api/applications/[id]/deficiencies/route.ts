import { NextResponse } from "next/server";
import { z } from "zod";
import { ensurePlatformRuntime, resolveDeficiency } from "@aicte/backend";
import { apiError, handleRouteError } from "@/lib/api-server";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const schema = z.object({
  deficiencyId: z.string().min(1),
  resolved: z.boolean(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) return apiError("Sign in to continue.", 401, "UNAUTHENTICATED");
    ensurePlatformRuntime();

    const body = schema.parse(await request.json());
    const application = resolveDeficiency(
      session,
      params.id,
      body.deficiencyId,
      body.resolved,
    );
    return NextResponse.json({ application });
  } catch (error) {
    return handleRouteError(error);
  }
}
