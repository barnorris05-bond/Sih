import type { Application, ApplicationFormData, ApplicationState, PublicUser } from "@aicte/shared";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

/** No request should leave the UI waiting indefinitely. */
const REQUEST_TIMEOUT_MS = 20_000;

async function request<T>(url: string, init?: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  // Honour a caller-supplied signal (e.g. an unmounted component) as well as our own timeout.
  init?.signal?.addEventListener("abort", () => controller.abort(), { once: true });

  let response: Response;
  let text: string;
  try {
    response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
    text = await response.text();
  } catch (error) {
    if (timedOut) {
      throw new ApiError("The server took too long to respond. Please try again.", 408, "TIMEOUT");
    }
    if (init?.signal?.aborted) throw error;
    throw new ApiError("Could not reach the server. Check your connection and try again.", 0, "NETWORK");
  } finally {
    clearTimeout(timer);
  }

  // Proxies and crashes can answer with HTML or an empty body; never let a parse error escape raw.
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const errorPayload = payload as { error?: string; code?: string } | null;
    throw new ApiError(
      errorPayload?.error ?? "Something went wrong. Please try again.",
      response.status,
      errorPayload?.code ?? "REQUEST_FAILED",
    );
  }
  if (text && payload === null) {
    throw new ApiError("The server sent an unexpected response. Please try again.", response.status, "BAD_RESPONSE");
  }

  return payload as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ user: PublicUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  logout: () => request<{ ok: true }>("/api/auth/logout", { method: "POST" }),

  applications: () => request<{ applications: Application[] }>("/api/applications"),

  saveDraft: (formData: ApplicationFormData, applicationId?: string) =>
    request<{ application: Application }>("/api/applications/draft", {
      method: "POST",
      body: JSON.stringify({ formData, applicationId }),
    }),

  submit: (formData: ApplicationFormData, applicationId?: string) =>
    request<{ application: Application }>("/api/applications/submit", {
      method: "POST",
      body: JSON.stringify({ formData, applicationId }),
    }),

  resubmit: (applicationId: string, formData: ApplicationFormData) =>
    request<{ application: Application }>(`/api/applications/${applicationId}/resubmit`, {
      method: "POST",
      body: JSON.stringify({ formData }),
    }),

  transition: (applicationId: string, target: ApplicationState, notes?: string) =>
    request<{ application: Application }>(`/api/applications/${applicationId}/transition`, {
      method: "PATCH",
      body: JSON.stringify({ target, notes }),
    }),

  resolveDeficiency: (applicationId: string, deficiencyId: string, resolved: boolean) =>
    request<{ application: Application }>(`/api/applications/${applicationId}/deficiencies`, {
      method: "PATCH",
      body: JSON.stringify({ deficiencyId, resolved }),
    }),
};
