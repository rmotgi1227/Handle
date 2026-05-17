import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { seedOnce } from "@/lib/store/seed";
import { seedRetrievalOnce } from "@/lib/store/seed-retrieval";

seedOnce();
void seedRetrievalOnce().catch((e) => {
  console.warn("[layout] seedRetrievalOnce failed:", e);
});

const nunito = Nunito({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Handle · property maintenance on autopilot",
  description:
    "Your tenants call one number. An AI agent triages, dials contractors in parallel, books the job, and pays them out — all before you've checked Slack.",
  icons: {
    icon: [
      { url: "/logos/svg/handle-favicon.svg", type: "image/svg+xml" },
      { url: "/logos/png/favicon/handle-favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: { url: "/logos/png/favicon/handle-favicon-256.png", sizes: "256x256" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${nunito.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
