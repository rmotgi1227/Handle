import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HandleLogo } from "@/components/preview/handle-logo";

const VARIANTS = [
  {
    id: "v1",
    name: "Light · Airy",
    description: "Cream shell, white cards, sidebar nav. Generous breathing room. The brand's natural resting state.",
    meta: "Cream bg · sidebar · spacious",
    swatches: ["#F6F4EF", "#15161A", "#3B5A78"],
  },
  {
    id: "v2",
    name: "Dark · Calm",
    description: "Near-black shell, sidebar nav, steel-blue accents. Serious, focused — like looking at a console at night.",
    meta: "Dark bg · sidebar · standard density",
    swatches: ["#15161A", "#F6F4EF", "#3B5A78"],
  },
  {
    id: "v3",
    name: "White · Dense",
    description: "Clean white, top nav, compact table-style dashboard. Maximum information per scroll.",
    meta: "White bg · top nav · compact",
    swatches: ["#FFFFFF", "#15161A", "#3B5A78"],
  },
] as const;

export default function PreviewIndexPage() {
  return (
    <main className="min-h-dvh" style={{ background: "#F6F4EF", color: "#15161A" }}>
      <div className="mx-auto max-w-5xl px-8 py-16 md:py-24">
        <div className="mb-14 flex flex-col gap-6">
          <HandleLogo variant="wordmark-on-light" width={120} height={30} priority />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "#3B5A78" }}>
              UI Preview
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">
              Pick a direction.
            </h1>
            <p className="mt-3 max-w-lg text-base leading-relaxed" style={{ color: "#5A6060" }}>
              Three layouts, one brand palette. Click into each to see the landing
              page and the PM dashboard, then tell me which one to ship.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {VARIANTS.map((v) => (
            <Link
              key={v.id}
              href={`/preview/${v.id}`}
              className="group flex flex-col overflow-hidden rounded-2xl transition-all hover:-translate-y-0.5"
              style={{
                background: "#FFFFFF",
                border: "1px solid #E8E3DA",
                boxShadow: "0 2px 8px rgba(21,22,26,0.06)",
              }}
            >
              <div
                className="flex h-44 items-center justify-center border-b"
                style={{ borderColor: "#E8E3DA", background: "#FAFAF8" }}
              >
                <Thumb id={v.id} />
              </div>
              <div className="flex flex-1 flex-col gap-3 p-6">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: "#3B5A78" }}>
                    {v.id}
                  </span>
                  <div className="flex gap-1.5">
                    {v.swatches.map((s) => (
                      <span
                        key={s}
                        className="size-3 rounded-full"
                        style={{ background: s, border: "1px solid rgba(21,22,26,0.12)" }}
                      />
                    ))}
                  </div>
                </div>
                <h2 className="text-lg font-semibold tracking-tight">{v.name}</h2>
                <p className="text-sm leading-relaxed" style={{ color: "#5A6060" }}>
                  {v.description}
                </p>
                <div className="mt-auto flex items-center justify-between pt-4">
                  <span className="text-xs" style={{ color: "#9AA0A0" }}>{v.meta}</span>
                  <span
                    className="inline-flex items-center gap-1 text-xs font-semibold"
                    style={{ color: "#15161A" }}
                  >
                    View
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div
          className="mt-8 rounded-xl p-5 text-sm"
          style={{ background: "#FFFFFF", border: "1px solid #E8E3DA", color: "#5A6060" }}
        >
          <span className="font-semibold" style={{ color: "#15161A" }}>To pick:</span>{" "}
          open each variant, click into the dashboard, then tell me which one to
          use as the new baseline. I&apos;ll replace the existing UI.
        </div>
      </div>
    </main>
  );
}

function Thumb({ id }: { id: "v1" | "v2" | "v3" }) {
  if (id === "v1") {
    return (
      <div
        className="flex h-28 w-56 overflow-hidden rounded-lg"
        style={{ border: "1px solid #E8E3DA", background: "#F6F4EF" }}
      >
        <div className="w-14 border-r p-2.5" style={{ borderColor: "#E8E3DA", background: "#EEEBE4" }}>
          <div className="flex items-center gap-1.5 mb-3">
            <div className="size-3.5 rounded" style={{ background: "#15161A" }} />
            <div className="h-1.5 w-10 rounded" style={{ background: "#15161A", opacity: 0.7 }} />
          </div>
          <div className="space-y-1.5">
            {["active", "", "", ""].map((a, i) => (
              <div key={i} className="h-4 w-full rounded flex items-center px-1.5" style={{ background: a ? "#DFDBD3" : "transparent" }}>
                <div className="h-1 rounded flex-1" style={{ background: "#15161A", opacity: a ? 0.5 : 0.2 }} />
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 p-2.5" style={{ background: "#F6F4EF" }}>
          <div className="grid grid-cols-2 gap-1 mb-2">
            {[0,1,2,3].map(i => (
              <div key={i} className="h-6 rounded" style={{ background: "#FFFFFF", border: "1px solid #E8E3DA" }} />
            ))}
          </div>
          <div className="space-y-1">
            <div className="h-4 rounded" style={{ background: "#FFFFFF", border: "1px solid #E8E3DA" }} />
            <div className="h-4 rounded" style={{ background: "#FFFFFF", border: "1px solid #E8E3DA" }} />
          </div>
        </div>
      </div>
    );
  }
  if (id === "v2") {
    return (
      <div
        className="flex h-28 w-56 overflow-hidden rounded-lg"
        style={{ border: "1px solid #2A2C30", background: "#15161A" }}
      >
        <div className="w-14 border-r p-2.5" style={{ borderColor: "#2A2C30" }}>
          <div className="flex items-center gap-1.5 mb-3">
            <div className="size-3.5 rounded" style={{ background: "#F6F4EF" }} />
            <div className="h-1.5 w-10 rounded" style={{ background: "#F6F4EF", opacity: 0.6 }} />
          </div>
          <div className="space-y-1.5">
            {["active", "", "", ""].map((a, i) => (
              <div key={i} className="h-4 w-full rounded flex items-center px-1.5" style={{ background: a ? "#22252B" : "transparent" }}>
                <div className="h-1 rounded flex-1" style={{ background: "#F6F4EF", opacity: a ? 0.7 : 0.25 }} />
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 p-2.5">
          <div className="grid grid-cols-2 gap-1 mb-2">
            {[0,1,2,3].map(i => (
              <div key={i} className="h-6 rounded" style={{ background: "#1E2028", border: "1px solid #2A2C30" }} />
            ))}
          </div>
          <div className="space-y-1">
            <div className="h-4 rounded" style={{ background: "#1E2028", border: "1px solid #2A2C30" }} />
            <div className="h-4 rounded" style={{ background: "#1E2028", border: "1px solid #2A2C30" }} />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div
      className="flex h-28 w-56 flex-col overflow-hidden rounded-lg"
      style={{ border: "1px solid #E5E7EB", background: "#FFFFFF" }}
    >
      <div className="flex items-center justify-between border-b px-2.5 py-2" style={{ borderColor: "#F3F4F6", background: "#F9FAFB" }}>
        <div className="flex items-center gap-1.5">
          <div className="size-3 rounded" style={{ background: "#15161A" }} />
          <div className="h-1.5 w-8 rounded" style={{ background: "#15161A", opacity: 0.7 }} />
        </div>
        <div className="flex gap-2">
          {[0,1,2].map(i => <div key={i} className="h-1.5 w-6 rounded" style={{ background: "#9CA3AF" }} />)}
        </div>
      </div>
      <div className="flex-1 p-2.5">
        <div className="grid grid-cols-4 gap-1 mb-2">
          {[0,1,2,3].map(i => (
            <div key={i} className="h-5 rounded" style={{ background: "#F9FAFB", border: "1px solid #E5E7EB" }} />
          ))}
        </div>
        <div className="space-y-0.5 rounded overflow-hidden" style={{ border: "1px solid #E5E7EB" }}>
          {[0,1,2].map(i => (
            <div key={i} className="flex gap-2 px-2 py-1" style={{ background: i % 2 === 0 ? "#FFFFFF" : "#F9FAFB" }}>
              <div className="h-1.5 flex-1 rounded" style={{ background: "#E5E7EB" }} />
              <div className="h-1.5 w-8 rounded" style={{ background: i === 0 ? "#3B5A78" : "#E5E7EB", opacity: 0.7 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
