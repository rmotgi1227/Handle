import { Check, Minus } from "lucide-react";
import { store } from "@/lib/store/memory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type VendorRow = {
  name: string;
  envKeys: string[];
  vendorKey: string;
};

const vendors: VendorRow[] = [
  { name: "AgentPhone", vendorKey: "agentphone", envKeys: ["AGENTPHONE_API_KEY", "AGENTPHONE_NUMBER"] },
  { name: "Gemini", vendorKey: "gemini", envKeys: ["GEMINI_API_KEY"] },
  { name: "Supermemory", vendorKey: "supermemory", envKeys: ["SUPERMEMORY_API_KEY", "SUPERMEMORY_PROJECT_ID"] },
  { name: "Browser Use", vendorKey: "browseruse", envKeys: ["BROWSERUSE_API_KEY", "BROWSERUSE_BASE_URL"] },
  { name: "Sponge", vendorKey: "sponge", envKeys: ["SPONGE_API_KEY", "SPONGE_ACCOUNT_ID"] },
  { name: "AgentMail", vendorKey: "agentmail", envKeys: ["AGENTMAIL_API_KEY", "AGENTMAIL_INBOX"] },
];

function resolveMode(vendorKey: string): "mock" | "live" {
  const override = process.env[`${vendorKey.toUpperCase()}_MODE`];
  if (override === "mock" || override === "live") return override;
  const global = process.env.INTEGRATION_MODE;
  return global === "live" ? "live" : "mock";
}

export default function SettingsPage() {
  const properties = Array.from(store.properties.values());
  const people = Array.from(store.people.values());
  const jobs = store.listJobs();
  const activeStatuses = new Set([
    "triaging",
    "sourcing_contractor",
    "scheduled",
    "in_progress",
    "awaiting_survey",
    "awaiting_payment",
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Integration modes and your property roster.
        </p>
      </div>

      <Tabs defaultValue="integrations">
        <TabsList>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="properties">Properties</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations">
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Env vars</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map((v) => {
                  const mode = resolveMode(v.vendorKey);
                  return (
                    <TableRow key={v.vendorKey}>
                      <TableCell className="font-medium tracking-tight">
                        {v.name}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            mode === "live"
                              ? "inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-2.5 py-0.5 text-xs font-medium text-white"
                              : "inline-flex items-center gap-1.5 rounded-full border border-dashed border-zinc-300 px-2.5 py-0.5 text-xs font-medium text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
                          }
                        >
                          {mode}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {v.envKeys.map((key) => {
                            const present = Boolean(process.env[key]);
                            return (
                              <div
                                key={key}
                                className="flex items-center gap-2 text-xs"
                              >
                                {present ? (
                                  <Check className="size-3.5 text-zinc-900 dark:text-zinc-100" />
                                ) : (
                                  <Minus className="size-3.5 text-zinc-400" />
                                )}
                                <span className="font-mono text-zinc-700 dark:text-zinc-300">
                                  {key}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            Set <span className="font-mono">INTEGRATION_MODE=live</span> to flip
            all vendors, or{" "}
            <span className="font-mono">&lt;VENDOR&gt;_MODE=live</span> for a
            single one. Mock mode requires no env vars.
          </p>
        </TabsContent>

        <TabsContent value="properties">
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Address</TableHead>
                  <TableHead>Managed by</TableHead>
                  <TableHead className="text-right">Active jobs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {properties.map((p) => {
                  const manager = people.find((x) => x.id === p.managerId);
                  const active = jobs.filter(
                    (j) => j.propertyId === p.id && activeStatuses.has(j.status),
                  ).length;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium tracking-tight">
                        {p.address}
                        {p.unit ? (
                          <span className="text-zinc-500 dark:text-zinc-400">
                            {" · "}Unit {p.unit}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-zinc-700 dark:text-zinc-300">
                        {manager?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {active}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
