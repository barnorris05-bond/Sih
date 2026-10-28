import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AmbientBackground } from "@/components/effects/ambient-background";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { LiveEventBridge } from "@/components/layout/live-event-bridge";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ToastProvider } from "@/components/providers/toast-provider";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: {
    default: "Veridion · AICTE Approval Cloud",
    template: "%s · Veridion",
  },
  description:
    "Veridion: every requirement, every stage, one clear path. AICTE Approval Cloud: rule-driven approval workflow automation with live compliance scoring, scrutiny, SLA escalation and executive analytics.",
  applicationName: "Veridion",
  authors: [{ name: "SIH26262 Team" }],
  keywords: ["Veridion", "AICTE", "approval", "compliance", "workflow", "SIH26262"],
  openGraph: {
    type: "website",
    siteName: "Veridion",
    title: "Veridion · AICTE Approval Cloud",
    description: "Every requirement. Every stage. One clear path.",
  },
};

export const viewport: Viewport = {
  themeColor: "#090d16",
  width: "device-width",
  initialScale: 1,
};

const themeScript = `(function(){try{var t=localStorage.getItem('aicte-theme')||'dark';var d=t!=='light';document.documentElement.classList.toggle('dark',d);document.documentElement.classList.toggle('light',!d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider>
          <ToastProvider>
            <AmbientBackground />
            <div className="relative flex min-h-screen flex-col">
              <SiteHeader user={session} />
              <main className="flex-1">{children}</main>
              <SiteFooter />
            </div>
            <LiveEventBridge enabled={Boolean(session)} />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
