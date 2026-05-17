import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { seedOnce } from "@/lib/store/seed";
import { env } from "@/lib/env";
import { supermemory } from "@/lib/integrations/supermemory";

seedOnce();
// Supermemory.add() doesn't dedupe; cold-starts must NOT silently re-seed.
// Dynamic import keeps Moss (and its onnxruntime native dep) out of the
// per-route server bundles when SEED_ON_BOOT is off — otherwise Vercel
// SSR pages 500 trying to load libonnxruntime.so.1.
if (env.SEED_ON_BOOT) {
  void import("@/lib/store/seed-retrieval")
    .then((m) => m.seedRetrievalOnce())
    .catch((e) => {
      console.warn("[layout] seedRetrievalOnce failed:", e);
    });
}

// Seed property management guidelines into Supermemory on boot.
// Idempotent: only seeds if no guidelines exist yet.
void (async () => {
  try {
    const check = await supermemory.recall({
      query: "burst pipe plumbing emergency",
      topK: 1,
    });
    if (check.memories.length === 0) {
      await Promise.all([
        supermemory.remember({
          text: "Burst or leaking pipe: EMERGENCY. Dispatch licensed plumber within 2 hours. Advise tenant to shut off water main immediately.",
          tags: ["plumbing", "emergency"],
        }),
        supermemory.remember({
          text: "Electrical sparks, burning smell, or complete power loss: EMERGENCY. Dispatch licensed electrician immediately. Advise evacuation if burning smell.",
          tags: ["electrical", "emergency"],
        }),
        supermemory.remember({
          text: "HVAC failure when outdoor temp above 90°F or below 40°F: URGENT. Dispatch HVAC tech within 4 hours per lease SLA.",
          tags: ["hvac", "urgent"],
        }),
        supermemory.remember({
          text: "Appliance failure (refrigerator, stove, dishwasher, washer/dryer): STANDARD. Dispatch appliance repair within 48 hours.",
          tags: ["appliance", "standard"],
        }),
        supermemory.remember({
          text: "Lock malfunction or tenant locked out: URGENT. Dispatch locksmith within 2 hours. Tenant must never be locked out overnight.",
          tags: ["locksmith", "urgent"],
        }),
        supermemory.remember({
          text: "Drywall damage or cracking: URGENT. Inspect for water intrusion or structural issues. Dispatch general contractor within 24 hours.",
          tags: ["structural", "urgent"],
        }),
      ]);
    }
  } catch {
    // Supermemory seed failures are non-fatal
  }
})();

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
