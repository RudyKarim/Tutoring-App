import type { Metadata, Viewport } from "next";
import { Inter, Merriweather } from "next/font/google";
import "./globals.css";
import { SiteNav } from "@/components/ui/SiteNav";
import { SmoothScroll } from "@/components/ui/SmoothScroll";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { repo } from "@/lib/server/repo";

// Same pairing as usek.edu.lb: Merriweather for headings, Inter for body text.
const display = Merriweather({ subsets: ["latin"], weight: ["300", "400", "700"], style: ["normal", "italic"], variable: "--font-display", display: "swap" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Praxis — Tutoring in Engineering, Finance & Law", template: "%s · Praxis" },
  description: "Private tutoring with engineers, financiers and lawyers who practise what they teach.",
};
export const viewport: Viewport = { themeColor: "#07070a", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await repo.currentUser();
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="grain min-h-screen">
        <SmoothScroll />
        <SiteNav user={user ? { name: user.fullName, email: user.email } : null} />
        {repo.mode() === "demo" && <DemoBanner />}
        {children}
      </body>
    </html>
  );
}
