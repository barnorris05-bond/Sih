import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import {
  AUTH_SECRET_FALLBACK,
  ROLE_META,
  SESSION_COOKIE,
  type Role,
  type SessionPayload,
} from "@aicte/shared";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? AUTH_SECRET_FALLBACK);

const ROUTE_ROLES: Array<{ prefix: string; roles: Role[] }> = [
  { prefix: "/institution", roles: ["INSTITUTION_USER"] },
  { prefix: "/reviewer", roles: ["SCRUTINY_MEMBER", "AICTE_ADMIN", "REGIONAL_OFFICER"] },
  { prefix: "/admin", roles: ["AICTE_ADMIN", "REGIONAL_OFFICER"] },
];

async function readSession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: "aicte-approval-platform",
      audience: "aicte-portal",
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const session = await readSession(request.cookies.get(SESSION_COOKIE)?.value);

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  const rule = ROUTE_ROLES.find((entry) => pathname.startsWith(entry.prefix));
  if (rule && !rule.roles.includes(session.role)) {
    return NextResponse.redirect(new URL(ROLE_META[session.role].home, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/institution/:path*", "/reviewer/:path*", "/admin/:path*"],
};
