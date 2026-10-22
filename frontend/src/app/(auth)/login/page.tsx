import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ROLE_META } from "@aicte/shared";
import { LoginForm, type DemoRole } from "@/components/auth/login-form";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Access the institution, scrutiny or executive portal.",
};

const ROLE_KEYS: Record<string, DemoRole> = {
  institution: "institution",
  reviewer: "reviewer",
  officer: "officer",
  admin: "admin",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { role?: string; next?: string };
}) {
  const session = await getSession();
  if (session) redirect(ROLE_META[session.role].home);

  const initialRole = ROLE_KEYS[searchParams.role ?? ""] ?? "institution";
  const requested = searchParams.next ?? "";
  const safeNext = requested.startsWith("/") && !requested.startsWith("//") ? requested : undefined;

  return <LoginForm initialRole={initialRole} next={safeNext} />;
}
