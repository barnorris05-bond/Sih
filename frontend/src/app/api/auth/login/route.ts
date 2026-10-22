import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@aicte/shared";
import { authenticate, createSessionToken, ensurePlatformRuntime } from "@aicte/backend";
import { handleRouteError } from "@/lib/api-server";
import { loginSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    ensurePlatformRuntime();
    const credentials = loginSchema.parse(await request.json());
    const user = authenticate(credentials.email, credentials.password);

    if (!user) {
      return NextResponse.json(
        { error: "Incorrect email or password.", code: "INVALID_CREDENTIALS" },
        { status: 401 },
      );
    }

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
}
