import { Check, Minus } from "lucide-react";
import { store } from "@/lib/store/memory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type VendorRow = { name: string; envKeys: string[]; vendorKey: string };

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
    "triaging", "sourcing_contractor", "scheduled",
    "in_progress", "awaiting_survey", "awaiting_payment",
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[#15161A]">Settings</h1>
        <p className="mt-1 text-sm font-medium text-[#6B7070]">
          Integration modes and your property roster.
        </p>
      </div>

      <Tabs defaultValue="integrations">
        <TabsList className="bg-[#EEEBE4]">
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="properties">Properties</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="mt-4">
          <div
            className="overflow-hidden rounded-2xl border border-[#E8E3DA] bg-white"
            style={{ boxShadow: "0 2px 8px rgba(21,22,26,0.05)" }}
          >
            <Table>
              <TableHeader>
                <TableRow className="border-[#E8E3DA] bg-[#F6F4EF]">
                  <TableHead className="font-bold uppercase tracking-[0.1em] text-[#9AA0A0] text-xs">Vendor</TableHead>
                  <TableHead className="font-bold uppercase tracking-[0.1em] text-[#9AA0A0] text-xs">Mode</TableHead>
                  <TableHead className="font-bold uppercase tracking-[0.1em] text-[#9AA0A0] text-xs">Env vars</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map((v) => {
                  const mode = resolveMode(v.vendorKey);
                  return (
                    <TableRow key={v.vendorKey} className="border-[#E8E3DA]">
                      <TableCell className="font-bold text-[#15161A]">{v.name}</TableCell>
                      <TableCell>
                        {mode === "live" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#15161A] px-2.5 py-1 text-xs font-bold text-[#F6F4EF]">
                            <span className="size-1.5 rounded-full bg-[#3B5A78]" />
                            live
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[#E8E3DA] px-2.5 py-1 text-xs font-semibold text-[#9AA0A0]">
                            <span className="size-1.5 rounded-full border border-[#9AA0A0]" />
                            mock
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {v.envKeys.map((key) => {
                            const present = Boolean(process.env[key]);
                            return (
                              <div key={key} className="flex items-center gap-2 text-xs">
                                {present ? (
                                  <Check className="size-3.5 text-[#3B5A78]" />
                                ) : (
                                  <Minus className="size-3.5 text-[#D5CFC6]" />
                                )}
                                <span className="font-mono font-medium text-[#6B7070]">{key}</span>
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
          <p className="mt-3 text-xs font-medium text-[#9AA0A0]">
            Set <span className="font-mono font-bold text-[#6B7070]">INTEGRATION_MODE=live</span> to flip all vendors,
            or <span className="font-mono font-bold text-[#6B7070]">&lt;VENDOR&gt;_MODE=live</span> for a single one.
          </p>
        </TabsContent>

        <TabsContent value="properties" className="mt-4">
          <div
            className="overflow-hidden rounded-2xl border border-[#E8E3DA] bg-white"
            style={{ boxShadow: "0 2px 8px rgba(21,22,26,0.05)" }}
          >
            <Table>
              <TableHeader>
                <TableRow className="border-[#E8E3DA] bg-[#F6F4EF]">
                  <TableHead className="font-bold uppercase tracking-[0.1em] text-[#9AA0A0] text-xs">Address</TableHead>
                  <TableHead className="font-bold uppercase tracking-[0.1em] text-[#9AA0A0] text-xs">Managed by</TableHead>
                  <TableHead className="text-right font-bold uppercase tracking-[0.1em] text-[#9AA0A0] text-xs">Active jobs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {properties.map((p) => {
                  const manager = people.find((x) => x.id === p.managerId);
                  const active = jobs.filter(
                    (j) => j.propertyId === p.id && activeStatuses.has(j.status),
                  ).length;
                  return (
                    <TableRow key={p.id} className="border-[#E8E3DA]">
                      <TableCell className="font-bold text-[#15161A]">
                        {p.address}
                        {p.unit ? (
                          <span className="font-medium text-[#9AA0A0]"> · Unit {p.unit}</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="font-medium text-[#6B7070]">{manager?.name ?? "—"}</TableCell>
                      <TableCell className="text-right font-bold tabular-nums text-[#15161A]">{active}</TableCell>
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
