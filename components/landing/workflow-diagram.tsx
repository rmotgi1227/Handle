"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  PhoneIncoming,
  Mic,
  Layers,
  Database,
  ShieldCheck,
  Globe,
  FileText,
  PhoneOutgoing,
  CheckCircle2,
  Mail,
  Receipt,
  MessageSquareHeart,
  Play,
  Pause,
} from "lucide-react";

type Phase = "listen" | "decide" | "dispatch" | "close";

type StageKey =
  | "tenant"
  | "triage"
  | "moss"
  | "history"
  | "policy"
  | "browser"
  | "brief"
  | "dial-a"
  | "dial-b"
  | "dial-c"
  | "lock"
  | "notify"
  | "pay"
  | "survey";

type Stage = {
  key: StageKey;
  label: string;
  detail: string;
  tech: string[];
  phase: Phase;
  Icon: React.ComponentType<{ className?: string }>;
  col: number;
  row: number;
};

const PHASES: Array<{ key: Phase; n: string; name: string; tagline: string }> = [
  { key: "listen", n: "01", name: "Listen", tagline: "Pick up & understand" },
  { key: "decide", n: "02", name: "Decide", tagline: "Recall, rank, route" },
  {
    key: "dispatch",
    n: "03",
    name: "Dispatch",
    tagline: "Brief, dial in parallel, lock",
  },
  {
    key: "close",
    n: "04",
    name: "Close loop",
    tagline: "Notify, pay, learn",
  },
];

const STAGES: Stage[] = [
  // LISTEN
  {
    key: "tenant",
    label: "Tenant call",
    phase: "listen",
    col: 0,
    row: 2,
    tech: ["AgentPhone"],
    Icon: PhoneIncoming,
    detail:
      "Inbound on the property's one number. Caller ID resolves the unit and tenant, prior work-order history is pre-fetched before the first ring.",
  },
  {
    key: "triage",
    label: "Voice + visual triage",
    phase: "listen",
    col: 1,
    row: 2,
    tech: ["AgentPhone", "Gemini 2.5"],
    Icon: Mic,
    detail:
      "The voice agent talks the tenant through the issue, classifies trade and urgency live. If the caller can't describe the problem clearly, the agent requests a short video and Gemini analyses it to diagnose the damage before dispatch.",
  },

  // DECIDE
  {
    key: "moss",
    label: "Catalog recall",
    phase: "decide",
    col: 2,
    row: 0.5,
    tech: ["Moss"],
    Icon: Layers,
    detail:
      "Sub-10ms semantic search over the vetted contractor catalog and the property knowledge index. Returns ranked candidates by trade fit and SLA.",
  },
  {
    key: "history",
    label: "History recall",
    phase: "decide",
    col: 2,
    row: 3.5,
    tech: ["Supermemory"],
    Icon: Database,
    detail:
      "Cross-session memory: past jobs at this unit, owner preferences, tenant satisfaction signals — pulled in parallel with the catalog query.",
  },
  {
    key: "policy",
    label: "Owner policy",
    phase: "decide",
    col: 3,
    row: 2,
    tech: ["Supermemory"],
    Icon: ShieldCheck,
    detail:
      "Applies the owner's rules: spend ceiling, approved vendor list, licensure requirements, after-hours behaviour. Anything past threshold pings the owner first.",
  },
  {
    key: "browser",
    label: "Web fallback",
    phase: "decide",
    col: 3,
    row: 3.5,
    tech: ["Browser Use"],
    Icon: Globe,
    detail:
      "When the catalog can't fill the slate, an agent crawls live business listings for a vetted local pro and writes the result back to Moss.",
  },

  // DISPATCH
  {
    key: "brief",
    label: "Draft brief",
    phase: "dispatch",
    col: 4,
    row: 2,
    tech: ["Gemini 2.5"],
    Icon: FileText,
    detail:
      "One-paragraph contractor pitch built from the recall context: address, symptom, urgency, owner caveats, and prior fixes at this unit.",
  },
  {
    key: "dial-a",
    label: "Contractor A",
    phase: "dispatch",
    col: 5,
    row: 0.5,
    tech: ["AgentPhone"],
    Icon: PhoneOutgoing,
    detail:
      "Top-ranked vendor. Dialed simultaneously with B and C. The brief is read on connect; ETA is negotiated live by Gemini.",
  },
  {
    key: "dial-b",
    label: "Contractor B",
    phase: "dispatch",
    col: 5,
    row: 2,
    tech: ["AgentPhone"],
    Icon: PhoneOutgoing,
    detail:
      "Second-ranked vendor. Same parallel race. First clean accept wins the job, the others are released politely with thanks.",
  },
  {
    key: "dial-c",
    label: "Contractor C",
    phase: "dispatch",
    col: 5,
    row: 3.5,
    tech: ["AgentPhone"],
    Icon: PhoneOutgoing,
    detail:
      "Third-ranked vendor. The remaining lines are released the moment one peer accepts the work order.",
  },

  // CLOSE
  {
    key: "lock",
    label: "Job locked",
    phase: "close",
    col: 6,
    row: 2,
    tech: ["Gemini 2.5"],
    Icon: CheckCircle2,
    detail:
      "Accepted ETA is confirmed in writing, the work order is finalized, and the contractor receives the address and access notes.",
  },
  {
    key: "notify",
    label: "Owner notice & email fallback",
    phase: "close",
    col: 7,
    row: 0.5,
    tech: ["AgentMail"],
    Icon: Mail,
    detail:
      "One-line confirmation to the owner with the job, the vendor, and the ETA. Doubles as the email-reach fallback: if no one picks up the parallel dial, AgentMail emails the next-best candidate the same brief.",
  },
  {
    key: "pay",
    label: "Invoice & payout",
    phase: "close",
    col: 7,
    row: 2,
    tech: ["Stripe", "Sponge"],
    Icon: Receipt,
    detail:
      "Stripe generates the contractor's invoice on completion. Sponge settles it from the landlord's operating wallet — USDC on Solana, on-chain in seconds — and marks the Stripe invoice paid out-of-band. The receipt mirrors to AgentMail.",
  },
  {
    key: "survey",
    label: "Survey & learn",
    phase: "close",
    col: 7,
    row: 3.5,
    tech: ["AgentPhone", "Supermemory"],
    Icon: MessageSquareHeart,
    detail:
      "Tenant satisfaction is captured by a short follow-up, and the outcome is written back to Supermemory so next month's recall is sharper.",
  },
];

type EdgeMeta = { dashed?: boolean; loop?: boolean };
type EdgeDef = readonly [StageKey, StageKey, EdgeMeta?];

const EDGES: EdgeDef[] = [
  ["tenant", "triage"],
  ["triage", "moss"],
  ["triage", "history"],
  ["moss", "policy"],
  ["history", "policy"],
  ["moss", "browser", { dashed: true }],
  ["policy", "brief"],
  ["browser", "brief", { dashed: true }],
  ["brief", "dial-a"],
  ["brief", "dial-b"],
  ["brief", "dial-c"],
  ["dial-a", "lock"],
  ["dial-b", "lock"],
  ["dial-c", "lock"],
  ["lock", "notify"],
  ["lock", "pay"],
  ["lock", "survey"],
  ["survey", "history", { dashed: true, loop: true }],
];

// Each entry is a parallel beat — every stage in the array lights up together.
const TRACE_STEPS: StageKey[][] = [
  ["tenant"],
  ["triage"],
  ["moss", "history"],
  ["policy"],
  ["brief"],
  ["dial-a", "dial-b", "dial-c"],
  ["lock"],
  ["notify", "pay", "survey"],
];

const FLAT_TRACE_ORDER: StageKey[] = TRACE_STEPS.flat();

const COL_COUNT = 8;
const ROW_COUNT = 5; // 0..4 in unit terms
const VB_W = 1400;
const VB_H = 580;
const COL_W = VB_W / COL_COUNT;
const ROW_H = VB_H / ROW_COUNT;

const PHASE_TONE: Record<Phase, string> = {
  listen: "#F2EFE8",
  decide: "#EBE7DC",
  dispatch: "#F2EFE8",
  close: "#EBE7DC",
};

function nodeCenter(stage: Stage): { x: number; y: number } {
  return {
    x: COL_W * stage.col + COL_W / 2,
    y: ROW_H * stage.row + ROW_H / 2,
  };
}

function stageByKey(key: StageKey): Stage {
  const s = STAGES.find((st) => st.key === key);
  if (!s) throw new Error(`Unknown stage: ${key}`);
  return s;
}

function phaseRange(phase: Phase): { startCol: number; endCol: number } {
  const colsInPhase = STAGES.filter((s) => s.phase === phase).map((s) => s.col);
  return {
    startCol: Math.min(...colsInPhase),
    endCol: Math.max(...colsInPhase) + 1, // exclusive
  };
}

export function WorkflowDiagram() {
  const [active, setActive] = useState<StageKey | null>(null);
  const [hovered, setHovered] = useState<StageKey | null>(null);
  const [stepIdx, setStepIdx] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!playing) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }
    if (stepIdx >= TRACE_STEPS.length) {
      timerRef.current = setTimeout(() => setStepIdx(0), 1600);
      return;
    }
    timerRef.current = setTimeout(() => setStepIdx((p) => p + 1), 1000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [playing, stepIdx]);

  const handlePlayToggle = () => {
    if (playing) {
      setPlaying(false);
      setStepIdx(-1);
    } else {
      setStepIdx(0);
      setPlaying(true);
    }
  };

  const traceKeys: Set<StageKey> = useMemo(() => {
    if (stepIdx < 0 || stepIdx >= TRACE_STEPS.length) return new Set();
    return new Set(TRACE_STEPS[stepIdx]);
  }, [stepIdx]);

  // For "hot edges" — keep edges lit for every prior beat too.
  const reachedKeys: Set<StageKey> = useMemo(() => {
    if (stepIdx < 0) return new Set();
    const reached = new Set<StageKey>();
    for (let i = 0; i <= stepIdx && i < TRACE_STEPS.length; i++) {
      for (const k of TRACE_STEPS[i]) reached.add(k);
    }
    return reached;
  }, [stepIdx]);

  const focusedKey: StageKey | null = useMemo(() => {
    if (active) return active;
    if (hovered) return hovered;
    const arr = Array.from(traceKeys);
    return arr.length > 0 ? arr[arr.length - 1] : null;
  }, [active, hovered, traceKeys]);

  const focusedStage = focusedKey ? stageByKey(focusedKey) : null;

  return (
    <section
      id="how-it-works"
      className="w-full border-b border-[#E8E3DA] bg-[#EEEBE4] py-24 md:py-28"
    >
      <div className="mx-auto max-w-6xl px-8">
        <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#3B5A78]">
              The whole loop
            </span>
            <h2 className="mt-3 max-w-2xl text-balance text-4xl font-black tracking-tight text-[#15161A] md:text-5xl">
              Every call, end to end.
            </h2>
            <p className="mt-4 max-w-xl text-base font-medium leading-relaxed text-[#6B7070]">
              Fourteen stages across four phases. Hover any node, or hit play
              to watch a call ripple through the pipeline.
            </p>
          </div>
          <button
            type="button"
            onClick={handlePlayToggle}
            className="inline-flex h-11 shrink-0 items-center gap-2 self-start rounded-full border border-[#15161A] bg-[#15161A] px-5 text-sm font-bold uppercase tracking-[0.16em] text-[#F6F4EF] transition-colors hover:bg-[#2A2C30] md:self-end"
          >
            {playing ? (
              <>
                <Pause className="size-4" /> Pause trace
              </>
            ) : (
              <>
                <Play className="size-4" /> Play trace
              </>
            )}
          </button>
        </div>

        <DesktopDiagram
          traceKeys={traceKeys}
          reachedKeys={reachedKeys}
          focusedKey={focusedKey}
          hoveredKey={hovered}
          activeKey={active}
          onHover={setHovered}
          onActivate={(k) => setActive((prev) => (prev === k ? null : k))}
          playing={playing}
        />

        <MobileDiagram
          focusedKey={focusedKey}
          onActivate={(k) => setActive((prev) => (prev === k ? null : k))}
        />

        <DetailCard stage={focusedStage} />
      </div>
    </section>
  );
}

function DetailCard({ stage }: { stage: Stage | null }) {
  return (
    <div
      aria-live="polite"
      className="mt-8 min-h-[128px] rounded-2xl border border-[#E8E3DA] bg-white p-6 shadow-[0_2px_12px_rgba(21,22,26,0.06)]"
    >
      {stage ? (
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex size-9 items-center justify-center rounded-full bg-[#15161A] text-[#F6F4EF]">
              <stage.Icon className="size-4" />
            </span>
            <span className="inline-flex items-center rounded-full border border-[#E8E3DA] bg-[#F6F4EF] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#3B5A78]">
              {PHASES.find((p) => p.key === stage.phase)?.n} ·{" "}
              {PHASES.find((p) => p.key === stage.phase)?.name}
            </span>
            <h3 className="text-xl font-black tracking-tight text-[#15161A]">
              {stage.label}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {stage.tech.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center rounded-full border border-[#E8E3DA] bg-[#F6F4EF] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#3B5A78]"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
          <p className="mt-3 max-w-3xl text-sm font-medium leading-relaxed text-[#6B7070]">
            {stage.detail}
          </p>
        </div>
      ) : (
        <p className="text-sm font-medium text-[#9AA0A0]">
          Hover any node — or press play — to see which integrations carry
          that step.
        </p>
      )}
    </div>
  );
}

function PhaseHeaderRow() {
  return (
    <div className="mb-4 hidden grid-cols-4 gap-0 md:grid">
      {PHASES.map((p) => (
        <div
          key={p.key}
          className="flex items-baseline gap-3 border-l border-[#E8E3DA] px-4 first:border-l-0 first:pl-0"
        >
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#9AA0A0]">
            {p.n}
          </span>
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#15161A]">
              {p.name}
            </p>
            <p className="text-[11px] font-medium leading-tight text-[#6B7070]">
              {p.tagline}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function DesktopDiagram({
  traceKeys,
  reachedKeys,
  focusedKey,
  hoveredKey,
  activeKey,
  onHover,
  onActivate,
  playing,
}: {
  traceKeys: Set<StageKey>;
  reachedKeys: Set<StageKey>;
  focusedKey: StageKey | null;
  hoveredKey: StageKey | null;
  activeKey: StageKey | null;
  onHover: (k: StageKey | null) => void;
  onActivate: (k: StageKey) => void;
  playing: boolean;
}) {
  // Neighbors of the focused node (immediate edge endpoints in either direction).
  const neighborKeys: Set<StageKey> = (() => {
    if (!focusedKey) return new Set();
    const out = new Set<StageKey>();
    for (const [from, to] of EDGES) {
      if (from === focusedKey) out.add(to);
      if (to === focusedKey) out.add(from);
    }
    return out;
  })();

  // Treat the focused node + its neighbors as the active sub-graph.
  const hasFocus = focusedKey !== null;
  // When the user is hovering or clicking, dim non-related edges.
  const userFocus = hoveredKey !== null || activeKey !== null;

  return (
    <div className="relative hidden md:block">
      <PhaseHeaderRow />
      <div
        className="relative w-full overflow-hidden rounded-3xl border border-[#E8E3DA] bg-white shadow-[0_2px_24px_rgba(21,22,26,0.07)]"
        style={{ aspectRatio: `${VB_W} / ${VB_H}` }}
        onMouseLeave={() => onHover(null)}
      >
        <PhaseBands />
        <BackgroundGrid />
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="absolute inset-0 size-full"
          aria-hidden
        >
          <defs>
            <marker
              id="wf-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#C2BDB1" />
            </marker>
            <marker
              id="wf-arrow-hot"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#E8572A" />
            </marker>
            <filter id="wf-edge-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {EDGES.map(([fromKey, toKey, meta], idx) => {
            const from = nodeCenter(stageByKey(fromKey));
            const to = nodeCenter(stageByKey(toKey));
            const isLoop = !!meta?.loop;
            const isDashed = !!meta?.dashed;
            const d = isLoop ? loopPath(from, to) : standardPath(from, to);

            const isReachedEdge =
              reachedKeys.has(fromKey) && reachedKeys.has(toKey);
            const isFocusEdge =
              hasFocus && (fromKey === focusedKey || toKey === focusedKey);
            const isHot = isReachedEdge || isFocusEdge;
            // Dim edges that aren't connected to the active node when user is exploring.
            const isDimmed = userFocus && !isFocusEdge && !isReachedEdge;

            return (
              <g
                key={`${fromKey}-${toKey}-${idx}`}
                style={{
                  opacity: isDimmed ? 0.28 : 1,
                  transition: "opacity 220ms ease",
                }}
              >
                {/* Soft glow underneath when hot */}
                {isHot && (
                  <path
                    d={d}
                    fill="none"
                    stroke="#E8572A"
                    strokeWidth={9}
                    strokeLinecap="round"
                    strokeDasharray={isDashed ? "6 6" : undefined}
                    opacity={0.22}
                    filter="url(#wf-edge-glow)"
                    style={{ transition: "opacity 280ms ease" }}
                  />
                )}
                <path
                  d={d}
                  fill="none"
                  stroke={isHot ? "#E8572A" : "#D6D1C5"}
                  strokeWidth={isHot ? 2.25 : 1.5}
                  strokeLinecap="round"
                  strokeDasharray={isDashed ? "6 6" : undefined}
                  markerEnd={isHot ? "url(#wf-arrow-hot)" : "url(#wf-arrow)"}
                  style={{
                    transition:
                      "stroke 280ms ease, stroke-width 280ms ease",
                  }}
                />
                {/* Tracer dot — during trace playback, OR on hover/click for the focused edge */}
                {!isLoop && (playing || isFocusEdge) && (
                  <circle
                    r={isFocusEdge ? 4.5 : 4}
                    fill="#E8572A"
                  >
                    <animateMotion
                      dur={isDashed ? "3.6s" : isFocusEdge ? "1.8s" : "2.6s"}
                      repeatCount="indefinite"
                      begin={
                        isFocusEdge ? "0s" : `${(idx * 0.18) % 1.8}s`
                      }
                      path={d}
                    />
                  </circle>
                )}
              </g>
            );
          })}
        </svg>

        {STAGES.map((stage) => {
          const { x, y } = nodeCenter(stage);
          const isFocused =
            activeKey === stage.key || hoveredKey === stage.key;
          const isInTrace = traceKeys.has(stage.key);
          const isReached = reachedKeys.has(stage.key);
          const isNeighbor = neighborKeys.has(stage.key);
          const isDimmed =
            userFocus && !isFocused && !isNeighbor && !isReached;
          return (
            <NodeChip
              key={stage.key}
              stage={stage}
              xPct={(x / VB_W) * 100}
              yPct={(y / VB_H) * 100}
              isFocused={isFocused}
              isNeighbor={isNeighbor}
              isInTrace={isInTrace}
              isReached={isReached}
              isDimmed={isDimmed}
              onHover={onHover}
              onActivate={onActivate}
            />
          );
        })}
      </div>
    </div>
  );
}

function standardPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
): string {
  const midX = (from.x + to.x) / 2;
  return `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`;
}

function loopPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
): string {
  // Curve under the diagram from survey back to history.
  const dropY = VB_H + 28;
  return `M ${from.x} ${from.y + 18} C ${from.x} ${dropY}, ${to.x} ${dropY}, ${to.x} ${to.y + 18}`;
}

function PhaseBands() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 flex">
      {PHASES.map((p) => {
        const { startCol, endCol } = phaseRange(p.key);
        const widthPct = ((endCol - startCol) / COL_COUNT) * 100;
        return (
          <div
            key={p.key}
            style={{
              width: `${widthPct}%`,
              backgroundColor: PHASE_TONE[p.key],
            }}
            className="relative h-full"
          >
            <span className="absolute left-4 top-3 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#15161A]/40">
              {p.n} · {p.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function BackgroundGrid() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage:
          "linear-gradient(to right, #E8E3DA 1px, transparent 1px), linear-gradient(to bottom, #E8E3DA 1px, transparent 1px)",
        backgroundSize: "40px 40px",
        opacity: 0.5,
      }}
    />
  );
}

function NodeChip({
  stage,
  xPct,
  yPct,
  isFocused,
  isNeighbor,
  isInTrace,
  isReached: _isReached,
  isDimmed,
  onHover,
  onActivate,
}: {
  stage: Stage;
  xPct: number;
  yPct: number;
  isFocused: boolean;
  isNeighbor: boolean;
  isInTrace: boolean;
  isReached?: boolean;
  isDimmed: boolean;
  onHover: (k: StageKey | null) => void;
  onActivate: (k: StageKey) => void;
}) {
  const Icon = stage.Icon;
  const hot = isFocused || isInTrace;

  // Visual treatment per state:
  //   hot      → orange filled + ping
  //   neighbor → slate-blue ring (shows what connects to the focused node)
  //   reached  → dark ink (already passed in trace)
  //   default  → dark ink
  let bubbleClasses: string;
  if (hot) {
    bubbleClasses = "border-[#E8572A] bg-[#E8572A]";
  } else if (isNeighbor) {
    bubbleClasses = "border-[#3B5A78] bg-[#3B5A78]";
  } else {
    bubbleClasses =
      "border-[#15161A] bg-[#15161A] group-hover:border-[#3B5A78] group-hover:bg-[#3B5A78]";
  }
  let labelClasses: string;
  if (hot) {
    labelClasses = "border-[#E8572A] text-[#E8572A]";
  } else if (isNeighbor) {
    labelClasses = "border-[#3B5A78] text-[#3B5A78]";
  } else {
    labelClasses = "border-[#E8E3DA] text-[#15161A]";
  }

  return (
    <button
      type="button"
      onMouseEnter={() => onHover(stage.key)}
      onFocus={() => onHover(stage.key)}
      onClick={() => onActivate(stage.key)}
      aria-label={stage.label}
      className="absolute -translate-x-1/2 -translate-y-1/2 transition-opacity duration-200"
      style={{
        left: `${xPct}%`,
        top: `${yPct}%`,
        opacity: isDimmed ? 0.4 : 1,
      }}
    >
      <div
        className={`group flex flex-col items-center gap-1.5 transition-transform duration-200 ${
          hot
            ? "scale-[1.08]"
            : isNeighbor
              ? "scale-[1.03]"
              : "scale-100"
        }`}
      >
        <span
          className={`relative inline-flex size-12 items-center justify-center rounded-full border text-[#F6F4EF] transition-colors ${bubbleClasses}`}
        >
          <Icon className="size-[18px]" />
          {hot && (
            <span className="absolute inset-0 -m-1 animate-ping rounded-full border border-[#E8572A] opacity-40" />
          )}
        </span>
        <span
          className={`whitespace-nowrap rounded-full border bg-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors ${labelClasses}`}
        >
          {stage.label}
        </span>
      </div>
    </button>
  );
}

function MobileDiagram({
  focusedKey,
  onActivate,
}: {
  focusedKey: StageKey | null;
  onActivate: (k: StageKey) => void;
}) {
  return (
    <div className="md:hidden">
      {PHASES.map((p) => {
        const stagesInPhase = STAGES.filter((s) => s.phase === p.key);
        return (
          <div key={p.key} className="mb-4 last:mb-0">
            <div className="mb-2 flex items-baseline gap-2 px-1">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#9AA0A0]">
                {p.n}
              </span>
              <span className="text-sm font-black uppercase tracking-[0.18em] text-[#15161A]">
                {p.name}
              </span>
              <span className="text-[10px] font-medium text-[#6B7070]">
                {p.tagline}
              </span>
            </div>
            <ol className="grid gap-2">
              {stagesInPhase.map((stage) => {
                const Icon = stage.Icon;
                const focused = focusedKey === stage.key;
                return (
                  <li key={stage.key}>
                    <button
                      type="button"
                      onClick={() => onActivate(stage.key)}
                      className={`flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors ${
                        focused
                          ? "border-[#E8572A] bg-white"
                          : "border-[#E8E3DA] bg-white"
                      }`}
                    >
                      <span
                        className={`inline-flex size-10 shrink-0 items-center justify-center rounded-full ${
                          focused
                            ? "bg-[#E8572A] text-[#F6F4EF]"
                            : "bg-[#15161A] text-[#F6F4EF]"
                        }`}
                      >
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold tracking-tight text-[#15161A]">
                          {stage.label}
                        </h3>
                        <p className="mt-0.5 line-clamp-2 text-xs font-medium leading-snug text-[#6B7070]">
                          {stage.detail}
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {stage.tech.map((t) => (
                            <span
                              key={t}
                              className="inline-flex items-center rounded-full border border-[#E8E3DA] bg-[#F6F4EF] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[#3B5A78]"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        );
      })}
    </div>
  );
}

// FLAT_TRACE_ORDER kept for potential future use (e.g. progress indicator); silence
// the unused-variable lint by referencing it here.
void FLAT_TRACE_ORDER;
