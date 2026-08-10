import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Mono, Instrument_Sans } from "next/font/google";

import { MotionProvider } from "@/components/motion/motion-provider";

import "./globals.css";

/* Three faces, three jobs, no overlap:
   display speaks, sans carries, mono reports what was measured. */

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400"],
  style: ["normal", "italic"],
  variable: "--fn-display",
  display: "swap",
});

const sans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--fn-sans",
  display: "swap",
});

const mono = DM_Mono({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--fn-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Stillnest — Nowhere. On purpose.",
  description:
    "Off-grid stays measured by how far they are from everyone else. A concept project.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">
        <MotionProvider />
        {children}
      </body>
    </html>
  );
}
