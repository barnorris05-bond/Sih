import { SignJWT, jwtVerify } from "jose";
import type { SessionPayload } from "@aicte/shared";
import { authSecret, sessionTtlHours } from "../config/env";

const encoder = new TextEncoder();
const secretKey = encoder.encode(authSecret);

export async function createSessionToken(
  payload: Omit<SessionPayload, "exp" | "iat">,
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("aicte-approval-platform")
    .setAudience("aicte-portal")
    .setExpirationTime(`${sessionTtlHours}h`)
    .sign(secretKey);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey, {
      issuer: "aicte-approval-platform",
      audience: "aicte-portal",
    });
    const session = payload as unknown as SessionPayload;
    if (!session.sub || !session.role) return null;
    return session;
  } catch {
    return null;
  }
}
