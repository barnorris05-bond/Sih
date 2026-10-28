import { NextResponse } from "next/server";
import { timed } from "@/lib/api-server";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export const GET = timed("auth.session", async () => {
  const session = await getSession();
  return NextResponse.json({ session });
});
