import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { CtaStrip } from "@/components/landing/cta-strip";

export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col bg-white dark:bg-black">
      <Hero />
      <HowItWorks />
      <CtaStrip />
    </main>
  );
}
