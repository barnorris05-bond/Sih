import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { PersistenceError, StateTransitionError, WorkflowError, getPersistenceStats } from "@aicte/backend";

export function apiError(
  message: string,
  status: number,
  code: string,
  headers?: Record<string, string>,
): NextResponse {
  return NextResponse.json({ error: message, code }, { status, headers });
}

/** Thrown for client mistakes in the raw request (size, syntax) before any validation runs. */
export class RequestError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "RequestError";
    this.status = status;
    this.code = code;
  }
}

/** Largest JSON body any endpoint accepts; the real payloads are a few KB. */
export const MAX_BODY_BYTES = 256 * 1024;

/**
 * Reads a JSON body with a hard size cap. Rejects oversized bodies (413) and malformed JSON (400) as
 * client errors rather than letting them surface as 500s.
 */
export async function readJsonBody<T = unknown>(request: Request, maxBytes = MAX_BODY_BYTES): Promise<T> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new RequestError("Request body is too large.", 413, "PAYLOAD_TOO_LARGE");
  }
  const text = await request.text();
  if (text.length > maxBytes) {
    throw new RequestError("Request body is too large.", 413, "PAYLOAD_TOO_LARGE");
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new RequestError("Request body must be valid JSON.", 400, "INVALID_JSON");
  }
}

const ADDRESS_SHAPE = /^[0-9a-fA-F:.]{2,45}$/;

/**
 * Network identity of the caller, or null when it cannot be established safely.
 *
 * `X-Forwarded-For` is just a request header: any client can send any value, and a proxy only
 * *appends* the address it saw. So by default nothing is trusted and this returns null (route handlers
 * do not expose the socket address). If, and only if, the app runs behind a known number of trusted
 * reverse proxies, set `AICTE_TRUSTED_PROXY_HOPS` to that number (e.g. 1 on Vercel or behind one load
 * balancer): the address is then the entry that many positions from the RIGHT of the header, i.e. the
 * one written by infrastructure you control. Anything further left is client-supplied and ignored.
 */
export function clientAddress(request: Request, hops: string | undefined = process.env.AICTE_TRUSTED_PROXY_HOPS): string | null {
  const trusted = Number(hops);
  if (!Number.isInteger(trusted) || trusted < 1 || trusted > 10) return null;
  const entries = (request.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const candidate = entries[entries.length - trusted];
  return candidate && ADDRESS_SHAPE.test(candidate) ? candidate : null;
}

export function handleRouteError(error: unknown): NextResponse {
  if (error instanceof RequestError) {
    return apiError(error.message, error.status, error.code);
  }
  if (error instanceof WorkflowError) {
    return apiError(error.message, error.status, error.code);
  }
  if (error instanceof PersistenceError) {
    // The write was rolled back; tell the client plainly that nothing changed and that retrying is safe.
    return apiError(error.message, error.status, error.code, { "Retry-After": "2" });
  }
  if (error instanceof StateTransitionError) {
    return apiError(error.message, 409, error.code);
  }
  if (error instanceof ZodError) {
    const first = error.issues[0];
    return NextResponse.json(
      {
        error: first?.message ?? "Validation failed",
        code: "VALIDATION_ERROR",
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 422 },
    );
  }
  if (error instanceof Error && error.message === "UNAUTHENTICATED") {
    return apiError("Sign in to continue.", 401, "UNAUTHENTICATED");
  }
  console.error("[api] unhandled error", error);
  return apiError("Unexpected server error. Please retry.", 500, "INTERNAL_ERROR");
}

const SLOW_MS = Number(process.env.AICTE_SLOW_MS ?? 750);
const LOG_ALL = process.env.AICTE_PERF_LOG === "1";

/**
 * Wraps a route handler with lightweight observability and safe defaults:
 * - `Server-Timing: app;dur=…` so latency is visible in browser devtools and load tools;
 * - `Cache-Control: no-store`, because every API response is user-scoped;
 * - one structured log line for slow (≥ AICTE_SLOW_MS) or failed requests, or all requests with
 *   AICTE_PERF_LOG=1. Only route name, method, status and duration are logged — never bodies,
 *   headers, query strings or identities.
 */
export function timed<A extends unknown[]>(
  route: string,
  handler: (request: Request, ...rest: A) => Promise<Response>,
): (request: Request, ...rest: A) => Promise<Response> {
  return async (request, ...rest) => {
    const started = performance.now();
    const response = await handler(request, ...rest);
    const ms = performance.now() - started;
    try {
      response.headers.set("Server-Timing", `app;dur=${ms.toFixed(1)}`);
      if (!response.headers.has("Cache-Control")) response.headers.set("Cache-Control", "no-store");
      // Honest signal for ephemeral deployments: writes succeed but are not durable.
      if (getPersistenceStats().mode === "memory") response.headers.set("X-Durability", "memory-only");
    } catch {
      // streaming/immutable responses keep their own headers
    }
    if (LOG_ALL || ms >= SLOW_MS || response.status >= 500) {
      console.log(
        JSON.stringify({ evt: "api", route, method: request.method, status: response.status, ms: Math.round(ms) }),
      );
    }
    return response;
  };
}
