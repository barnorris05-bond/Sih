"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutDashboard, LogOut, Menu, ShieldCheck, X } from "lucide-react";
import { ROLE_META, type SessionPayload } from "@aicte/shared";
import { ThemeToggle } from "@/components/providers/theme-provider";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn, initials } from "@/lib/utils";

const NAV_BY_ROLE: Record<SessionPayload["role"], Array<{ href: string; label: string }>> = {
  INSTITUTION_USER: [
    { href: "/institution", label: "Overview" },
    { href: "/institution/apply", label: "Application" },
    { href: "/institution/deficiencies", label: "Deficiencies" },
  ],
  SCRUTINY_MEMBER: [{ href: "/reviewer", label: "Scrutiny desk" }],
  REGIONAL_OFFICER: [
    { href: "/admin", label: "Command center" },
    { href: "/reviewer", label: "Scrutiny desk" },
  ],
  AICTE_ADMIN: [
    { href: "/admin", label: "Command center" },
    { href: "/reviewer", label: "Scrutiny desk" },
  ],
};

export function SiteHeader({ user }: { user: SessionPayload | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const navItems = user ? NAV_BY_ROLE[user.role] : [];
  const landing = pathname === "/";

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 18);
      const maximum = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(maximum > 0 ? Math.min(1, window.scrollY / maximum) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await api.logout();
    } finally {
      setSigningOut(false);
      router.push("/");
      router.refresh();
    }
  }

  function isActive(href: string): boolean {
    if (href === "/institution" || href === "/admin" || href === "/reviewer") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  }

  return (
    <header className={cn("sticky top-0 z-40 px-3 pt-3 transition-all duration-300 sm:px-5", scrolled ? (landing ? "bg-[#171329]/75" : "bg-background/60") : "bg-transparent")}>
      <div className={cn("mx-auto flex h-14 w-full max-w-[1200px] items-center justify-between gap-4 rounded-2xl border px-3 transition-all duration-300 sm:px-4", scrolled ? (landing ? "border-fuchsia-200/20 bg-[#171329]/92 shadow-[0_18px_60px_-32px_rgba(118,103,200,0.45)] backdrop-blur-xl" : "border-white/[0.12] bg-background/85 shadow-[0_18px_60px_-32px_rgba(15,23,42,0.95)] backdrop-blur-xl") : (landing ? "border-white/[0.1] bg-[#171329]/60 backdrop-blur-md" : "border-white/[0.06] bg-background/45 backdrop-blur-md"))}>
        <Link href={user ? ROLE_META[user.role].home : "/"} className="group flex items-center gap-2.5">
          <motion.span
            whileHover={{ rotate: -6, scale: 1.04 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
            className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#7667C8] via-[#A7A5F5] to-[#F2BFE0] shadow-[0_8px_28px_-10px_rgba(118,103,200,0.9)]"
          >
            <ShieldCheck className="h-5 w-5 text-white" />
            <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/25" />
          </motion.span>
          <span className="leading-tight">
            <span className="block font-display text-sm font-semibold tracking-tight text-foreground">
              AICTE Approval Cloud
            </span>
            <span className="block text-[9px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Workflow · Compliance
            </span>
          </span>
        </Link>

        {user ? (
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  isActive(item.href)
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {isActive(item.href) ? (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-lg border border-white/10 bg-white/[0.06]"
                    transition={{ type: "spring", stiffness: 340, damping: 30 }}
                  />
                ) : null}
                <span className="relative">{item.label}</span>
              </Link>
            ))}
          </nav>
        ) : (
          <nav className="hidden items-center gap-6 text-xs text-muted-foreground md:flex">
            <a href="#workflow" className="transition-colors hover:text-foreground">
              Workflow
            </a>
            <a href="#portals" className="transition-colors hover:text-foreground">
              Portals
            </a>
            <a href="#handbook" className="transition-colors hover:text-foreground">
              Handbook rules
            </a>
          </nav>
        )}

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <>
              <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-2.5 py-1.5 sm:flex">
                <span className="grid h-6 w-6 place-items-center rounded-lg bg-gradient-to-br from-[#7667C8]/80 to-[#F2BFE0]/80 text-[9px] font-bold text-white">
                  {initials(user.name)}
                </span>
                <span className="leading-tight">
                  <span className="block max-w-[9rem] truncate text-[11px] font-medium text-foreground">
                    {user.name}
                  </span>
                  <span className="block text-[9px] text-muted-foreground">
                    {ROLE_META[user.role].label}
                  </span>
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                loading={signingOut}
                aria-label="Sign out"
                className="hidden sm:inline-flex"
              >
                {signingOut ? null : <LogOut className="h-4 w-4" />}
              </Button>
              <button
                type="button"
                onClick={() => setMobileOpen((open) => !open)}
                className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-muted-foreground md:hidden"
                aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
                aria-expanded={mobileOpen}
              >
                {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hidden sm:block">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link href="/login">
                <Button size="sm" className="gap-1.5">
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Open portal
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
      {landing ? <motion.div className="mx-auto mt-1 h-px w-full max-w-[1200px] origin-left rounded-full bg-gradient-to-r from-[#A7A5F5] via-[#F2BFE0] to-[#C8E5F8]" animate={{ scaleX: scrollProgress }} transition={{ duration: .12, ease: "linear" }} aria-hidden="true" /> : null}

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden border-t border-white/[0.06] md:hidden"
          >
            <div className="space-y-1 px-4 py-3">
              {!user && [
                { href: "#workflow", label: "Workflow" },
                { href: "#portals", label: "Portals" },
                { href: "#handbook", label: "Handbook rules" },
              ].map((item) => (
                <a key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-white/[0.04] hover:text-foreground">{item.label}</a>
              ))}
              {user && navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "block rounded-lg px-3 py-2 text-sm",
                    isActive(item.href)
                      ? "bg-indigo-500/10 text-indigo-200"
                      : "text-muted-foreground",
                  )}
                >
                  {item.label}
                </Link>
              ))}
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-300"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
