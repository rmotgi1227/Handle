import {
  Wallet,
  CreditCard,
  ArrowUpRight,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { store } from "@/lib/store/memory";
import { sponge } from "@/lib/integrations/sponge";
import { CopyButton } from "@/components/dashboard/copy-button";

function fmtUsd(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function PaymentsPage() {
  let walletAddress = "";
  let walletUsdc = 0;
  let walletError: string | null = null;
  try {
    const balance = await sponge.checkBalance();
    walletAddress = balance.address;
    walletUsdc = balance.usdc;
  } catch (err) {
    walletError = err instanceof Error ? err.message : "Wallet unavailable";
  }

  const payouts = Array.from(store.events.values())
    .filter((e) => e.kind === "paid")
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 20)
    .map((e) => {
      const job = store.getJob(e.jobId);
      const contractor = job?.assignedContractorId
        ? store.contractors.get(job.assignedContractorId)
        : undefined;
      const property = job ? store.properties.get(job.propertyId) : undefined;
      return {
        id: e.id,
        at: e.at,
        amountCents: job?.totalCostCents ?? 0,
        txnHash: job?.paymentTxnHash ?? null,
        contractorName: contractor?.name ?? "Contractor",
        propertyAddress: property?.address ?? "—",
        jobTitle: job?.title ?? "Job",
      };
    });

  const totalPaidCents = payouts.reduce((sum, p) => sum + p.amountCents, 0);
  const completedJobs = store
    .listJobs()
    .filter((j) => j.status === "paid" || j.status === "completed").length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[#15161A]">Payments</h1>
        <p className="mt-1 text-sm font-medium text-[#6B7070]">
          Pay contractors instantly via Sponge. Bill your Handle subscription via Stripe.
        </p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Paid out (lifetime)"
          value={fmtUsd(totalPaidCents)}
          hint={`${payouts.length} payout${payouts.length === 1 ? "" : "s"}`}
        />
        <StatCard
          label="Jobs settled"
          value={completedJobs.toString()}
          hint="Paid or completed"
        />
        <StatCard
          label="USDC on hand"
          value={walletError ? "—" : `$${walletUsdc.toFixed(2)}`}
          hint={walletError ? "Wallet unavailable" : "Spendable balance"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Sponge payout method */}
        <section
          className="flex flex-col gap-5 rounded-2xl border border-[#E8E3DA] bg-white p-5"
          style={{ boxShadow: "0 2px 8px rgba(21,22,26,0.05)" }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#9AA0A0]">
                <Wallet className="size-3" />
                Contractor payouts
              </div>
              <h2 className="mt-1.5 text-base font-bold tracking-tight text-[#15161A]">
                Sponge · USDC on Solana
              </h2>
              <p className="mt-1 text-xs font-medium text-[#6B7070]">
                Funds clear to the contractor&apos;s wallet in seconds, not days.
              </p>
            </div>
            {walletError ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[#E8E3DA] px-2.5 py-1 text-[0.7rem] font-semibold text-[#9AA0A0]">
                <AlertCircle className="size-3" />
                Offline
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#15161A] px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-[0.1em] text-[#F6F4EF]">
                <ShieldCheck className="size-3" />
                Connected
              </span>
            )}
          </div>

          {walletError ? (
            <div className="rounded-xl border border-dashed border-[#E8E3DA] bg-[#F6F4EF] p-4 text-xs font-medium text-[#6B7070]">
              {walletError}. Set <span className="font-mono font-bold">SPONGE_API_KEY</span> to connect.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <div className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-[#9AA0A0]">
                  Balance
                </div>
                <div className="mt-1 text-3xl font-black tabular-nums text-[#15161A]">
                  ${walletUsdc.toFixed(2)}
                  <span className="ml-1.5 text-xs font-bold uppercase tracking-[0.1em] text-[#9AA0A0]">
                    USDC
                  </span>
                </div>
              </div>

              <div>
                <div className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-[#9AA0A0]">
                  Wallet address
                </div>
                <div className="mt-1 flex items-center gap-2 rounded-xl border border-[#E8E3DA] bg-[#F6F4EF] px-3 py-2.5">
                  <span className="flex-1 truncate font-mono text-xs font-semibold text-[#15161A]">
                    {walletAddress}
                  </span>
                  <CopyButton value={walletAddress} />
                  <a
                    href={`https://solscan.io/account/${walletAddress}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md p-1 text-[#6B7070] hover:bg-white hover:text-[#15161A]"
                    aria-label="View on Solscan"
                  >
                    <ArrowUpRight className="size-3.5" />
                  </a>
                </div>
              </div>
            </div>
          )}

          <div className="mt-auto flex items-center justify-between border-t border-[#E8E3DA] pt-4 text-xs">
            <span className="font-semibold text-[#9AA0A0]">
              Powered by{" "}
              <a
                href="https://paysponge.com"
                target="_blank"
                rel="noreferrer"
                className="font-bold text-[#15161A] hover:underline"
              >
                Sponge
              </a>
            </span>
            <button
              type="button"
              className="rounded-full border border-[#E8E3DA] bg-white px-3 py-1.5 font-semibold text-[#6B7070] hover:bg-[#F6F4EF]"
            >
              Top up
            </button>
          </div>
        </section>

        {/* Stripe billing */}
        <section
          className="flex flex-col gap-5 rounded-2xl border border-[#E8E3DA] bg-white p-5"
          style={{ boxShadow: "0 2px 8px rgba(21,22,26,0.05)" }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#9AA0A0]">
                <CreditCard className="size-3" />
                Your Handle subscription
              </div>
              <h2 className="mt-1.5 text-base font-bold tracking-tight text-[#15161A]">
                Stripe · billing & invoices
              </h2>
              <p className="mt-1 text-xs font-medium text-[#6B7070]">
                The card we charge for your monthly Handle subscription and per-job dispatch fee.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[#E8E3DA] px-2.5 py-1 text-[0.7rem] font-semibold text-[#9AA0A0]">
              Not connected
            </span>
          </div>

          <div className="rounded-xl border border-dashed border-[#E8E3DA] bg-[#F6F4EF] p-5 text-center">
            <CreditCard className="mx-auto size-7 text-[#D5CFC6]" />
            <p className="mt-3 text-sm font-bold text-[#15161A]">No card on file</p>
            <p className="mt-1 text-xs font-medium text-[#9AA0A0]">
              Add a payment method so contractor payouts never stall.
            </p>
            <button
              type="button"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#15161A] px-4 py-2 text-xs font-bold text-[#F6F4EF] hover:bg-[#2A2C30]"
            >
              <CreditCard className="size-3.5" />
              Add payment method
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-[#E8E3DA] bg-[#F6F4EF] p-3">
              <div className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-[#9AA0A0]">
                Plan
              </div>
              <div className="mt-1 font-bold text-[#15161A]">Handle Standard</div>
              <div className="mt-0.5 font-medium text-[#6B7070]">$49 / month + $2 / dispatch</div>
            </div>
            <div className="rounded-xl border border-[#E8E3DA] bg-[#F6F4EF] p-3">
              <div className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-[#9AA0A0]">
                Next invoice
              </div>
              <div className="mt-1 font-bold text-[#15161A]">—</div>
              <div className="mt-0.5 font-medium text-[#6B7070]">Connect a card to schedule</div>
            </div>
          </div>

          <div className="mt-auto flex items-center justify-between border-t border-[#E8E3DA] pt-4 text-xs">
            <span className="font-semibold text-[#9AA0A0]">
              Powered by{" "}
              <a
                href="https://stripe.com"
                target="_blank"
                rel="noreferrer"
                className="font-bold text-[#15161A] hover:underline"
              >
                Stripe
              </a>
            </span>
            <a
              href="https://stripe.com/docs/billing"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-[#E8E3DA] bg-white px-3 py-1.5 font-semibold text-[#6B7070] hover:bg-[#F6F4EF]"
            >
              Billing docs
            </a>
          </div>
        </section>
      </div>

      {/* Payout history */}
      <section
        className="overflow-hidden rounded-2xl border border-[#E8E3DA] bg-white"
        style={{ boxShadow: "0 2px 8px rgba(21,22,26,0.05)" }}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[#E8E3DA] px-5 py-4">
          <div>
            <h2 className="text-base font-bold tracking-tight text-[#15161A]">
              Recent payouts
            </h2>
            <p className="text-xs font-medium text-[#9AA0A0]">
              Every contractor payment Handle has settled on your behalf.
            </p>
          </div>
        </div>
        {payouts.length === 0 ? (
          <div className="p-10 text-center text-sm font-medium text-[#9AA0A0]">
            No payouts yet. First one shows up here as soon as a job closes.
          </div>
        ) : (
          <div className="max-h-[420px] divide-y divide-[#E8E3DA] overflow-y-auto">
            {payouts.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#F6F4EF]"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-[#15161A]">
                    {p.contractorName}
                  </div>
                  <div className="truncate text-xs font-medium text-[#9AA0A0]">
                    {p.jobTitle} · {p.propertyAddress}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black tabular-nums text-[#15161A]">
                    {fmtUsd(p.amountCents)}
                  </div>
                  <div className="text-[0.7rem] font-semibold text-[#9AA0A0]">
                    {fmtTime(p.at)}
                  </div>
                </div>
                {p.txnHash ? (
                  <a
                    href={`https://solscan.io/tx/${p.txnHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-[#E8E3DA] bg-white px-2.5 py-1 text-[0.7rem] font-semibold text-[#6B7070] hover:bg-[#F6F4EF]"
                    title={p.txnHash}
                  >
                    {fmtAddress(p.txnHash)}
                    <ArrowUpRight className="size-3" />
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-[#E8E3DA] px-2.5 py-1 text-[0.7rem] font-semibold text-[#9AA0A0]">
                    No txn
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div
      className="rounded-2xl border border-[#E8E3DA] bg-white p-4"
      style={{ boxShadow: "0 2px 8px rgba(21,22,26,0.05)" }}
    >
      <div className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[#9AA0A0]">
        {label}
      </div>
      <div className="mt-1.5 text-2xl font-black tabular-nums text-[#15161A]">
        {value}
      </div>
      <div className="mt-0.5 text-xs font-medium text-[#9AA0A0]">{hint}</div>
    </div>
  );
}
