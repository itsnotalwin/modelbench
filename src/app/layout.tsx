import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { LabProvider } from "@/components/lab-provider";
import { Footer, Header } from "@/components/shell";
import { challenges, runs } from "@/lib/bench";
import "./globals.css";

const runCount = runs.length;
const challengeCount = challenges.length;

export const metadata: Metadata = {
  title: { default: "ModelBench — The open benchmark lab", template: "%s · ModelBench" },
  description: `Explore real one-shot AI builds. Inspect ${runCount} model runs, compare outputs, and evaluate ${challengeCount} challenges on six scoring axes.`,
  icons: { icon: "/icon.svg" },
};
export const viewport: Viewport = { themeColor: "#f7f8f5", width: "device-width", initialScale: 1 };
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><head><link rel="preload" href="/fonts/manrope.woff2" as="font" type="font/woff2" crossOrigin="anonymous"/></head><body><a href="#main-content" className="skip-link">Skip to content</a><LabProvider><Header/>{children}<Footer/></LabProvider></body></html>;
}
