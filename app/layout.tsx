import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { seedOnce } from "@/lib/store/seed";
import { seedRetrievalOnce } from "@/lib/store/seed-retrieval";
import { env } from "@/lib/env";

seedOnce();
// Supermemory.add() doesn't dedupe; cold-starts must NOT silently re-seed.
if (env.SEED_ON_BOOT) {
  void seedRetrievalOnce().catch((e) => {
    console.warn("[layout] seedRetrievalOnce failed:", e);
  });
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Call My Agent · property maintenance on autopilot",
  description:
    "Your tenants call one number. An AI agent triages, dials contractors in parallel, books the job, and pays them out — all before you've checked Slack.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
