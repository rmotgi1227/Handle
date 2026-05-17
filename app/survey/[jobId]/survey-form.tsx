"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function SurveyForm({ jobId, jobTitle }: { jobId: string; jobTitle: string }) {
  const [score, setScore] = useState(0);
  const [hover, setHover] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (submitted) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="text-center space-y-2">
          <p className="text-2xl">🙏</p>
          <p className="font-semibold">Thanks for your feedback!</p>
          <p className="text-muted-foreground text-sm">Your rating helps us find better contractors.</p>
        </div>
      </main>
    );
  }

  async function handleSubmit() {
    if (score === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/survey/${jobId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, feedback: feedback.trim() || undefined }),
      });
      if (!res.ok) throw new Error(`Server error (${res.status})`);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">How was the work?</h1>
          <p className="text-muted-foreground text-sm">{jobTitle}</p>
        </div>

        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setScore(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              className="p-2 rounded focus:outline-none"
              style={{ minHeight: 44, minWidth: 44 }}
              aria-label={`${n} star${n !== 1 ? "s" : ""}`}
            >
              <Star
                className={`w-8 h-8 transition-colors ${
                  n <= (hover || score)
                    ? "fill-yellow-400 stroke-yellow-400"
                    : "stroke-muted-foreground"
                }`}
              />
            </button>
          ))}
        </div>

        <Textarea
          placeholder="Any comments? (optional)"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={3}
        />

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        <Button
          className="w-full"
          style={{ minHeight: 44 }}
          disabled={score === 0 || loading}
          onClick={handleSubmit}
        >
          {loading ? "Submitting…" : "Submit Rating"}
        </Button>
      </div>
    </main>
  );
}
