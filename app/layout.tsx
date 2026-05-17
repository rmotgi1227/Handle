import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { seedOnce } from "@/lib/store/seed";
import { supermemory } from "@/lib/integrations/supermemory";

seedOnce();

// Seed property management guidelines into Supermemory (MOSS)
// Idempotent: only seed if no guidelines exist yet
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
      ]);
    }
  } catch {
    // Supermemory seed failures are non-fatal
  }
})();

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
