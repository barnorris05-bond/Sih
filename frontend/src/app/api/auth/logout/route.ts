import { NextResponse } from "next/server";
import { timed } from "@/lib/api-server";
import { SESSION_COOKIE } from "@aicte/shared";

export const dynamic = "force-dynamic";

export const POST = timed("auth.logout", async () => {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
});
