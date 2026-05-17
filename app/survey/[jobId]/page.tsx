import { store } from "@/lib/store/memory";
import { SurveyForm } from "./survey-form";

interface PageProps {
  params: Promise<{ jobId: string }>;
}

export default async function SurveyPage({ params }: PageProps) {
  const { jobId } = await params;
  const job = store.getJob(jobId);

  if (!job) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p className="text-muted-foreground text-center">Survey not found.</p>
      </main>
    );
  }

  if (job.satisfactionScore !== undefined) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p className="text-muted-foreground text-center">Survey already submitted. Thank you!</p>
      </main>
    );
  }

  return <SurveyForm jobId={jobId} jobTitle={job.title} />;
}
