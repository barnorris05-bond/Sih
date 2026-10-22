import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        surface: "hsl(var(--surface))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        success: "#34d399",
        warning: "#fbbf24",
        danger: "#fb7185",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      fontFamily: {
        sans: [
          "Inter",
          "Segoe UI",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "sans-serif",
        ],
        display: ["Space Grotesk", "Inter", "Segoe UI", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Cascadia Code", "Consolas", "monospace"],
      },
      boxShadow: {
        glow: "0 0 60px -12px rgba(99, 102, 241, 0.65)",
        "glow-sm": "0 0 28px -10px rgba(99, 102, 241, 0.55)",
        panel: "0 24px 80px -32px rgba(2, 6, 23, 0.9)",
      },
      keyframes: {
        "grid-drift": {
          "0%": { transform: "translate3d(0,0,0)" },
          "100%": { transform: "translate3d(0, 48px, 0)" },
        },
        "aurora": {
          "0%, 100%": { transform: "translate3d(-4%, 0, 0) scale(1)" },
          "50%": { transform: "translate3d(6%, -4%, 0) scale(1.08)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 rgba(251, 113, 133, 0.45)" },
          "70%": { boxShadow: "0 0 0 12px rgba(251, 113, 133, 0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(251, 113, 133, 0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        "grid-drift": "grid-drift 18s linear infinite",
        aurora: "aurora 22s ease-in-out infinite",
        shimmer: "shimmer 2.4s linear infinite",
        "pulse-ring": "pulse-ring 2s ease-out infinite",
        float: "float 7s ease-in-out infinite",
      },
    },
  },
  plugins: [
    function addLightVariant({ addVariant }: { addVariant: (name: string, selector: string) => void }) {
      addVariant("light", "html.light &");
    },
  ],
};

export default config;
