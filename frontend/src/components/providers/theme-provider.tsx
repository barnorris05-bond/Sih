"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = React.useState<Theme>("dark");

  React.useEffect(() => {
    const stored = window.localStorage.getItem("aicte-theme");
    const next: Theme = stored === "light" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  }, []);

  const toggleTheme = React.useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === "dark" ? "light" : "dark";
      window.localStorage.setItem("aicte-theme", next);
      applyTheme(next);
      return next;
    });
  }, []);

  const value = React.useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
  root.style.colorScheme = theme;
}

export function useTheme(): ThemeContextValue {
  const context = React.useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className={cn(
        "relative grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-muted-foreground transition-colors hover:border-violet-400/40 hover:text-foreground",
        className,
      )}
    >
      <motion.span
        key={theme}
        initial={{ rotate: -40, opacity: 0, scale: 0.7 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </motion.span>
    </button>
  );
}
