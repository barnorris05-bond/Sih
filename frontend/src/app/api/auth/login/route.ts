import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@aicte/shared";
import { accountKey, authenticate, createSessionToken, ensurePlatformRuntime, loginLimiters } from "@aicte/backend";
import { apiError, clientAddress, handleRouteError, readJsonBody, timed } from "@/lib/api-server";
import { loginSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const POST = timed("auth.login", async (request: Request) => {
  try {
    ensurePlatformRuntime();
    const credentials = loginSchema.parse(await readJsonBody(request));

    // Failed-attempt throttle (successful sign-ins are never counted). The per-account counter does not
    // depend on any client-supplied value; the per-source counter exists only behind a trusted proxy.
    const account = accountKey(credentials.email);
    const source = clientAddress(request);
    const { perAccount, perSource } = loginLimiters();
    const blocked = [perAccount.check(account), source ? perSource.check(source) : null].find((d) => d && !d.allowed);
    if (blocked) {
      return apiError(
        "Too many failed sign-in attempts. Please wait a few minutes and try again.",
        429,
        "RATE_LIMITED",
        { "Retry-After": String(blocked.retryAfterSeconds) },
      );
    }

    const user = await authenticate(credentials.email, credentials.password);

    if (!user) {
      perAccount.recordFailure(account);
      if (source) perSource.recordFailure(source);
      return NextResponse.json(
        { error: "Incorrect email or password.", code: "INVALID_CREDENTIALS" },
        { status: 401 },
      );
    }
    perAccount.reset(account);

    const token = await createSessionToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      institutionId: user.institutionId,
      institutionName: user.institutionName,
    });

    const response = NextResponse.json({ user });
    response.cookies.set({
      name: SESSION_COOKIE,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
});
