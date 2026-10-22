import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { StateTransitionError, WorkflowError } from "@aicte/backend";

export function apiError(
  message: string,
  status: number,
  code: string,
): NextResponse {
  return NextResponse.json({ error: message, code }, { status });
}

export function handleRouteError(error: unknown): NextResponse {
  if (error instanceof WorkflowError) {
    return apiError(error.message, error.status, error.code);
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
