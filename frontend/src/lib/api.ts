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

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const errorPayload = payload as { error?: string; code?: string } | null;
    throw new ApiError(
      errorPayload?.error ?? "Something went wrong. Please try again.",
      response.status,
      errorPayload?.code ?? "REQUEST_FAILED",
    );
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
