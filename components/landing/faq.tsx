"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

type Item = { q: string; a: string };

const ITEMS: Item[] = [
  {
    q: "What if no contractor picks up?",
    a: "Three contractors are dialed in parallel from the Moss catalog. If the first round comes up empty, AgentMail automatically reaches out to the next-best candidates by email, and Browser Use sources fresh vendors live from local business listings — only escalating to the property manager if the queue is still empty after the urgency window.",
  },
  {
    q: "What if the tenant can't describe the issue?",
    a: "The agent asks for a short video. Gemini analyzes the footage to diagnose the problem (severity, likely trade, visible damage) and hands that context back into the dispatch flow — so the contractor brief is accurate even when the caller can't put it in words.",
  },
  {
    q: "How does memory work?",
    a: "Moss holds the vetted contractor catalog and the property knowledge index (sub-10ms semantic search). Supermemory holds long-term history per unit: past jobs, owner preferences, contractor performance, tenant satisfaction. Both are queried in parallel on every call so the agent has full context to negotiate the right rate.",
  },
  {
    q: "Does the agent ever loop the owner in?",
    a: "Yes — for any urgent or above-threshold spend, AgentMail sends a one-line owner notice before dispatch. For standard tickets the owner gets a clean digest at the end of the day instead of a stream of pings.",
  },
  {
    q: "Who pays the contractor?",
    a: "Stripe generates the invoice on job completion (line item: the contractor's name, the work order, the amount). Sponge then settles that invoice from the landlord's operating wallet — USDC on Solana, on-chain, in seconds — and marks the Stripe invoice paid out-of-band. The owner sees the receipt in AgentMail; the contractor sees the funds same-day.",
  },
  {
    q: "Can a human override the dispatch?",
    a: "Always. Every job has a one-tap escalation in the dashboard that pauses the auto-dispatch and routes the call to your operator queue. Override events are written back to Supermemory so the agent learns the threshold for next time.",
  },
  {
    q: "How long did this take to build?",
    a: "We shipped the full loop — voice triage, visual triage, dual-tier memory, parallel dial-out, contractor payouts, surveys — at the YC Call My Agent Hackathon in less than 10 hours. The integrations are real; nothing in the demo is mocked.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section
      id="faq"
      className="w-full border-b border-[#E8E3DA] bg-[#F6F4EF] py-24 md:py-28"
    >
      <div className="mx-auto grid max-w-6xl gap-12 px-8 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#3B5A78]">
            FAQ
          </span>
          <h2 className="mt-3 text-balance text-4xl font-black tracking-tight text-[#15161A] md:text-5xl">
            Common questions, answered straight.
          </h2>
          <p className="mt-4 max-w-md text-base font-medium leading-relaxed text-[#6B7070]">
            If something here isn&apos;t covered, the dashboard is the
            fastest way to feel the loop — open it and start a sample call.
          </p>
        </div>

        <ul className="divide-y divide-[#E8E3DA] overflow-hidden rounded-2xl border border-[#E8E3DA] bg-white">
          {ITEMS.map((item, idx) => {
            const isOpen = open === idx;
            return (
              <li key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-6 px-5 py-5 text-left transition-colors hover:bg-[#F6F4EF]"
                >
                  <span className="text-base font-bold tracking-tight text-[#15161A]">
                    {item.q}
                  </span>
                  <Plus
                    className={`size-4 shrink-0 text-[#15161A] transition-transform duration-200 ${
                      isOpen ? "rotate-45" : ""
                    }`}
                  />
                </button>
                <div
                  className={`grid overflow-hidden px-5 transition-[grid-template-rows,padding] duration-200 ${
                    isOpen
                      ? "grid-rows-[1fr] pb-5"
                      : "grid-rows-[0fr] pb-0"
                  }`}
                >
                  <p className="min-h-0 text-sm font-medium leading-relaxed text-[#6B7070]">
                    {item.a}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
