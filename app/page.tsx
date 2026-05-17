import { SiteHeader } from "@/components/landing/site-header";
import { Hero } from "@/components/landing/hero";
import { WorkflowDiagram } from "@/components/landing/workflow-diagram";
import { TechStack } from "@/components/landing/tech-stack";
import { DashboardPreview } from "@/components/landing/dashboard-preview";
import { Faq } from "@/components/landing/faq";
import { CtaStrip } from "@/components/landing/cta-strip";

export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col bg-white dark:bg-black">
      <SiteHeader />
      <Hero />
      <WorkflowDiagram />
      <TechStack />
      <DashboardPreview />
      <Faq />
      <CtaStrip />
    </main>
  );
}
