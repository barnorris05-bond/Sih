"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  Gauge,
  Gavel,
  KeyRound,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { ROLE_META, type PublicUser } from "@aicte/shared";
import { ComplianceGauge } from "@/components/dashboard/compliance-gauge";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { FieldError, Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema } from "@/lib/validation";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

export type DemoRole = "institution" | "reviewer" | "officer" | "admin";

type LoginValues = z.infer<typeof loginSchema>;

const DEMO_ACCOUNTS: Record<
  DemoRole,
  { email: string; label: string; description: string; icon: typeof Building2; accent: string }
> = {
  institution: {
    email: "institution@aicte.demo",
    label: "Institution",
    description: "Draft, submit and remediate",
    icon: Building2,
    accent: "from-violet-500/25 to-violet-500/0 border-violet-400/40 text-violet-100 light:text-violet-700",
  },
  reviewer: {
    email: "reviewer@aicte.demo",
    label: "Scrutiny",
    description: "Audit documents and decide",
    icon: Gavel,
    accent: "from-sky-500/25 to-sky-500/0 border-sky-400/40 text-sky-200 light:text-sky-700",
  },
  officer: {
    email: "officer@aicte.demo",
    label: "Regional",
    description: "Monitor SLA performance",
    icon: ShieldCheck,
    accent: "from-emerald-500/20 to-emerald-500/0 border-emerald-400/40 text-emerald-200 light:text-emerald-700",
  },
  admin: {
    email: "admin@aicte.demo",
    label: "Admin",
    description: "Command the pipeline",
    icon: Gauge,
    accent: "from-violet-500/25 to-violet-500/0 border-violet-400/40 text-violet-200 light:text-violet-700",
  },
};

const ROLE_TO_DEMO: Record<PublicUser["role"], DemoRole> = {
  INSTITUTION_USER: "institution",
  SCRUTINY_MEMBER: "reviewer",
  REGIONAL_OFFICER: "officer",
  AICTE_ADMIN: "admin",
};

export function LoginForm({ initialRole, next }: { initialRole: DemoRole; next?: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [role, setRole] = useState<DemoRole>(initialRole);
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: DEMO_ACCOUNTS[initialRole].email,
      password: "demo1234",
    },
  });

  function selectRole(nextRole: DemoRole) {
    setRole(nextRole);
    setServerError(null);
    form.setValue("email", DEMO_ACCOUNTS[nextRole].email, { shouldValidate: true });
    form.setValue("password", "demo1234", { shouldValidate: true });
  }

  async function onSubmit(values: LoginValues) {
    setSubmitting(true);
    setServerError(null);
    try {
      const { user } = await api.login(values.email, values.password);
      setRole(ROLE_TO_DEMO[user.role]);
      toast({
        title: `Signed in as ${user.name}`,
        description: `${ROLE_META[user.role].label} workspace ready.`,
        variant: "success",
      });
      router.push(next ?? ROLE_META[user.role].home);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Could not sign in. Please retry.";
      setServerError(message);
      toast({ title: "Sign-in failed", description: message, variant: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  const active = DEMO_ACCOUNTS[role];
  const errors = form.formState.errors;

  return (
    <div className="mx-auto grid w-full max-w-[1440px] gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:px-8 lg:py-20">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/[0.08] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-violet-100 light:text-violet-700">
          <Sparkles className="h-3 w-3" /> Secure role gateway
        </span>
        <h1 className="mt-5 max-w-lg font-display text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-[2.6rem]">
          One workspace for every
          <span className="block text-gradient">approval decision.</span>
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
          Signed sessions carry the role and institution claim, so a screen never shows data the
          actor is not entitled to see.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <div className="glass rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Live compliance
            </p>
            <div className="mt-2 flex items-center gap-3">
              <ComplianceGauge score={84} size={84} strokeWidth={7} label="" />
              <div>
                <p className="text-xs font-medium text-foreground">Weighted rule engine</p>
                <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                  6 constraints recomputed on every field change.
                </p>
              </div>
            </div>
          </div>
          <div className="glass rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Automation
            </p>
            <div className="mt-3 space-y-2 text-[11px] text-muted-foreground">
              <p className="flex items-center gap-1.5">
                <LockKeyhole className="h-3 w-3 text-violet-200 light:text-violet-700" /> JWT + scrypt credentials
              </p>
              <p className="flex items-center gap-1.5">
                <ShieldCheck className="h-3 w-3 text-emerald-300 light:text-emerald-700" /> Guarded state transitions
              </p>
              <p className="flex items-center gap-1.5">
                <ArrowRight className="h-3 w-3 text-sky-300 light:text-sky-700" /> SLA auto-escalation
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/[0.07] bg-white/[0.04] p-4">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Every 2026-27 handbook rule is weighted
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {["SFR 1:20", "Cadre 1:2:6", "2.5 m²/student", "8,000 m² campus", "40% Ph.D.", "12 volumes/student"].map(
              (chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] text-muted-foreground"
                >
                  {chip}
                </span>
              ),
            )}
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="glass relative overflow-hidden rounded-3xl p-6 shadow-[0_50px_140px_-70px_rgba(56,189,248,0.5)] sm:p-8"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-500/20 blur-[80px]" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
                Sign in
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Demo accounts are pre-filled — just pick a role.
              </p>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.05]">
              <KeyRound className="h-4 w-4 text-violet-200 light:text-violet-700" />
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            {(Object.keys(DEMO_ACCOUNTS) as DemoRole[]).map((key) => {
              const account = DEMO_ACCOUNTS[key];
              const selected = role === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => selectRole(key)}
                  className={cn(
                    "group relative overflow-hidden rounded-xl border p-3 text-left transition-all duration-200",
                    selected
                      ? `bg-gradient-to-br ${account.accent}`
                      : "border-white/[0.08] bg-white/[0.04] text-muted-foreground hover:border-white/20 hover:bg-white/[0.04]",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <account.icon className={cn("h-4 w-4", selected ? "text-current" : "")} />
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        selected ? "bg-current" : "bg-white/20",
                      )}
                    />
                  </div>
                  <p
                    className={cn(
                      "mt-2 text-[11px] font-semibold",
                      selected ? "text-current" : "text-foreground",
                    )}
                  >
                    {account.label}
                  </p>
                  <p className="text-[9px] opacity-80">{account.description}</p>
                </button>
              );
            })}
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-5 space-y-4" noValidate>
            <div>
              <Label htmlFor="email">Official email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                className="mt-1.5"
                placeholder="name@institution.ac.in"
                {...form.register("email")}
              />
              <FieldError message={errors.email?.message} />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <span className="text-[9px] text-muted-foreground">Demo: demo1234</span>
              </div>
              <div className="relative mt-1.5">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="pr-10"
                  {...form.register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              <FieldError message={errors.password?.message} />
            </div>

            {serverError ? (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-rose-400/30 bg-rose-500/[0.08] px-3 py-2 text-[11px] text-rose-200 light:text-rose-700"
              >
                {serverError}
              </motion.p>
            ) : null}

            <Button type="submit" className="w-full" size="lg" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Authenticating…
                </>
              ) : (
                <>
                  Enter {active.label.toLowerCase()} portal
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-4 text-center text-[10px] leading-relaxed text-muted-foreground">
            Prototype environment. Credentials are seeded locally; replace the signing secret and
            identity provider before production.{" "}
            <Link href="/" className="text-violet-200 hover:text-violet-100 light:text-violet-700 light:hover:text-violet-800">
              Back to home
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
