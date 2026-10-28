import { cache } from "react";
import { cookies } from "next/headers";
import { SESSION_COOKIE, type SessionPayload } from "@aicte/shared";
import { verifySessionToken } from "@aicte/backend";

/**
 * React `cache` memoises per server request: the root layout, the page and any nested component all
 * ask for the session during one render, but the JWT is verified once.
 */
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
});

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHENTICATED");
  }
  return session;
}

export function canAccess(role: SessionPayload["role"], section: string): boolean {
  if (section.startsWith("/admin")) {
    return role === "AICTE_ADMIN" || role === "REGIONAL_OFFICER";
  }
  if (section.startsWith("/reviewer")) {
    return role === "SCRUTINY_MEMBER" || role === "AICTE_ADMIN" || role === "REGIONAL_OFFICER";
  }
  if (section.startsWith("/institution")) {
    return role === "INSTITUTION_USER";
  }
  return true;
}
