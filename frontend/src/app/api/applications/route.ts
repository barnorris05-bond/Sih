import { NextResponse } from "next/server";
import { ensurePlatformRuntime, listApplications } from "@aicte/backend";
import { handleRouteError, apiError, timed } from "@/lib/api-server";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export const GET = timed("applications.list", async () => {
  try {
    const session = await getSession();
    if (!session) return apiError("Sign in to continue.", 401, "UNAUTHENTICATED");
    ensurePlatformRuntime();
    return NextResponse.json({ applications: listApplications(session) });
  } catch (error) {
    return handleRouteError(error);
  }
});
