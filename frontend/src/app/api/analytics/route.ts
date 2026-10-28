import { NextResponse } from "next/server";
import {
  ensurePlatformRuntime,
  getAnalytics,
  getAuditFeed,
  getEventFeed,
  getSlaQueue,
} from "@aicte/backend";
import { apiError, handleRouteError, timed } from "@/lib/api-server";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export const GET = timed("analytics", async () => {
  try {
    const session = await getSession();
    if (!session) return apiError("Sign in to continue.", 401, "UNAUTHENTICATED");
    if (session.role === "INSTITUTION_USER") {
      return apiError("Executive analytics are restricted to AICTE staff.", 403, "FORBIDDEN");
    }
    ensurePlatformRuntime();
    return NextResponse.json({
      // Every aggregate is computed over the caller's scope (all / assigned region), never the whole store.
      analytics: getAnalytics(session),
      auditFeed: getAuditFeed(session, 30),
      slaQueue: getSlaQueue(session, 12),
      events: getEventFeed(session, 30),
    });
  } catch (error) {
    return handleRouteError(error);
  }
});
