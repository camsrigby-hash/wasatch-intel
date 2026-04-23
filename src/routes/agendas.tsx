import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SignalBar } from "@/components/SignalBar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AGENDAS, JURISDICTIONS, AGENDA_TYPES, STATUSES, TRANSCRIPT_SAMPLES, type AgendaItem } from "@/lib/mock-data";
import { format } from "date-fns";
import { Search, MapPin, FileText } from "lucide-react";

export const Route = createFileRoute("/agendas")({
  head: () => ({
    meta: [
      { title: "Agendas — Wasatch Intel" },
      { name: "description", content: "Searchable table of every scraped planning commission and city council agenda item across Wasatch Front cities." },
      { property: "og:title", content: "Agendas — Wasatch Intel" },
      { property: "og:description", content: "Browse 24 months of city planning and council activity." },
    ],
  }),
  component: AgendasPage,
});

function AgendasPage() {
  const [q, setQ] = useState("");
  const [jur, setJur] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [open, setOpen] = useState<AgendaItem | null>(null);

  const filtered = useMemo(() => {
    return AGENDAS.filter((a) =>
      (!q || a.title.toLowerCase().includes(q.toLowerCase()) || a.applicant.toLowerCase().includes(q.toLowerCase()) || a.parcelApn.toLowerCase().includes(q.toLowerCase())) &&
      (!jur || a.jurisdiction === jur) &&
      (!type || a.type === type) &&
      (!status || a.status === status)
    );
  }, [q, jur, type, status]);

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto p-6 space-y-4">
        <header className="flex items-baseline justify-between">
          <div>
            <h1 className="text-xl font-semibold">Agendas</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Last 24 months · {AGENDAS.length} scraped items across 12 jurisdictions</p>
          </div>
          <span className="font-mono text-xs text-muted-foreground">{filtered.length} results</span>
        </header>

        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search title, applicant, parcel APN…" className="h-8 pl-8 text-xs border-transparent bg-muted/50" />
          </div>
          <Pill value={jur} onChange={setJur} placeholder="Jurisdiction" options={JURISDICTIONS} />
          <Pill value={type} onChange={setType} placeholder="Type" options={AGENDA_TYPES as readonly string[]} />
          <Pill value={status} onChange={setStatus} placeholder="Status" options={STATUSES as readonly string[]} />
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <Th>Date</Th>
                <Th>Jurisdiction</Th>
                <Th>Type</Th>
                <Th>Applicant</Th>
                <Th>Parcel</Th>
                <Th className="text-right">Units</Th>
                <Th className="text-right">Acres</Th>
                <Th>Status</Th>
                <Th>Signal</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 80).map((a) => (
                <tr
                  key={a.id}
                  onClick={() => setOpen(a)}
                  className="border-t border-border hover:bg-muted/40 cursor-pointer transition-colors"
                >
                  <Td className="font-mono text-muted-foreground whitespace-nowrap">{format(new Date(a.date), "MMM d, yyyy")}</Td>
                  <Td>{a.jurisdiction}</Td>
                  <Td><Badge variant="outline" className="text-[10px] font-normal">{a.type}</Badge></Td>
                  <Td className="max-w-48 truncate">{a.applicant}</Td>
                  <Td className="font-mono text-muted-foreground">{a.parcelApn}</Td>
                  <Td className="text-right font-mono">{a.units ?? "—"}</Td>
                  <Td className="text-right font-mono">{a.acres}</Td>
                  <Td><StatusPill status={a.status} /></Td>
                  <Td><SignalBar value={a.signal} showLabel={false} /></Td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 80 && (
            <div className="p-3 border-t border-border text-center text-[11px] text-muted-foreground">Showing first 80 of {filtered.length}.</div>
          )}
        </div>
      </div>

      {/* Detail drawer */}
      <Sheet open={!!open} onOpenChange={(o)=>!o && setOpen(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0">
          {open && (
            <>
              <SheetHeader className="p-4 border-b border-border">
                <Badge variant="outline" className="text-[10px] w-fit">{open.type}</Badge>
                <SheetTitle className="text-base text-left">{open.title}</SheetTitle>
                <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                  <span>{open.jurisdiction}</span>·<span className="font-mono">{format(new Date(open.date), "MMM d, yyyy")}</span>·<StatusPill status={open.status} />
                </div>
              </SheetHeader>
              <div className="p-4 space-y-4 overflow-auto">
                <div className="rounded-md bg-muted/40 p-3 text-xs">{open.summary}</div>

                <div>
                  <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                    <FileText className="h-3 w-3" /> Transcript snippet
                  </h4>
                  <div className="rounded-md border border-border divide-y divide-border">
                    {TRANSCRIPT_SAMPLES.default.map((l, i) => (
                      <div key={i} className="px-3 py-2 text-xs">
                        <div className="text-[10px] uppercase tracking-wide font-medium text-muted-foreground">{l.speaker}</div>
                        <div className="mt-0.5">{l.line}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <Button size="sm" variant="outline" className="w-full">
                  <MapPin className="h-3 w-3" /> Jump to parcel on map
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`text-left font-medium px-3 py-2 ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 ${className}`}>{children}</td>;
}
function StatusPill({ status }: { status: string }) {
  const tone =
    status === "Approved" ? "bg-[var(--color-opportunity)]/15 text-[var(--color-opportunity)]"
    : status === "Denied" ? "bg-destructive/15 text-destructive"
    : status === "Tabled" ? "bg-[var(--color-signal-med)]/15 text-[var(--color-signal-med)]"
    : "bg-muted text-muted-foreground";
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${tone}`}>{status}</span>;
}

function Pill({ value, onChange, placeholder, options }: { value: string; onChange: (v: string)=>void; placeholder: string; options: readonly string[] }) {
  return (
    <select
      value={value}
      onChange={(e)=>onChange(e.target.value)}
      className="h-8 rounded-md bg-muted/50 border border-transparent px-2 text-xs hover:bg-muted focus:outline-none focus:ring-1 focus:ring-ring"
    >
      <option value="">{placeholder}: All</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
