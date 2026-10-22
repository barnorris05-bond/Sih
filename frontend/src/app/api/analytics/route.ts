import { NextResponse } from "next/server";
import {
  ensurePlatformRuntime,
  getAnalytics,
  getAuditFeed,
  getSlaQueue,
  recentEvents,
} from "@aicte/backend";
import { apiError, handleRouteError } from "@/lib/api-server";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return apiError("Sign in to continue.", 401, "UNAUTHENTICATED");
    if (session.role === "INSTITUTION_USER") {
      return apiError("Executive analytics are restricted to AICTE staff.", 403, "FORBIDDEN");
    }
    ensurePlatformRuntime();
    return NextResponse.json({
      analytics: getAnalytics(),
      auditFeed: getAuditFeed(30),
      slaQueue: getSlaQueue(12),
      events: recentEvents(30),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
