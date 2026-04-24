import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SignalBar } from "@/components/SignalBar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { JURISDICTIONS } from "@/lib/types";
import type { AgendaItem, SignalType } from "@/lib/types";
import { useAgendas } from "@/lib/api-client";
import { format } from "date-fns";
import { Search, MapPin, AlertCircle } from "lucide-react";

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

const SIGNAL_TYPE_OPTIONS: SignalType[] = [
  "REZONE", "NEW_SUBDIVISION", "COMMERCIAL_PROJECT", "MINIFLEX_OPPORTUNITY",
  "INFRASTRUCTURE", "ANNEXATION", "GENERAL_PLAN_AMENDMENT", "LARGE_PROJECT",
  "DEVELOPER_ACTIVITY",
];

const SIGNAL_TYPE_LABELS: Record<SignalType, string> = {
  REZONE:                 "Rezone",
  NEW_SUBDIVISION:        "Subdivision",
  COMMERCIAL_PROJECT:     "Commercial",
  MINIFLEX_OPPORTUNITY:   "Miniflex",
  INFRASTRUCTURE:         "Infrastructure",
  ANNEXATION:             "Annexation",
  GENERAL_PLAN_AMENDMENT: "GP Amendment",
  LARGE_PROJECT:          "Large Project",
  DEVELOPER_ACTIVITY:     "Developer Activity",
};

function AgendasPage() {
  const { data: response, isLoading, isError } = useAgendas();

  const agendas = response?.data ?? [];
  const meta    = response?.meta;

  const [q,      setQ]      = useState("");
  const [jur,    setJur]    = useState("");
  const [sigType,setSigType]= useState("");
  const [open,   setOpen]   = useState<AgendaItem | null>(null);

  const filtered = useMemo(() => {
    return agendas.filter((a) =>
      (!q || a.title.toLowerCase().includes(q.toLowerCase()) ||
             (a.developer ?? "").toLowerCase().includes(q.toLowerCase()) ||
             a.id.toLowerCase().includes(q.toLowerCase())) &&
      (!jur     || a.jurisdiction === jur) &&
      (!sigType || a.signalType === sigType)
    );
  }, [agendas, q, jur, sigType]);

  if (isLoading) return <LoadingSkeleton />;

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto p-6 space-y-4">
        <header className="flex items-baseline justify-between">
          <div>
            <h1 className="text-xl font-semibold">Agendas</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {meta
                ? `${meta.count} scraped items · ${meta.freshness === "live" ? "live" : "cached"}`
                : "Loading…"}
              {" "}· {JURISDICTIONS.filter((j) => agendas.some((a) => a.jurisdiction === j)).length} jurisdictions
            </p>
          </div>
          <span className="font-mono text-xs text-muted-foreground">{filtered.length} results</span>
        </header>

        {isError && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            Could not load agendas. Retrying…
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search title, developer, ID…"
              className="h-8 pl-8 text-xs border-transparent bg-muted/50"
            />
          </div>
          <Pill value={jur}     onChange={setJur}     placeholder="Jurisdiction" options={JURISDICTIONS} />
          <Pill value={sigType} onChange={setSigType} placeholder="Signal type"  options={SIGNAL_TYPE_OPTIONS} labels={SIGNAL_TYPE_LABELS} />
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <Th>Date</Th>
                <Th>Jurisdiction</Th>
                <Th>Signal</Th>
                <Th>Developer</Th>
                <Th>Title</Th>
                <Th className="text-right">Score</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map((a) => (
                <tr
                  key={a.id}
                  onClick={() => setOpen(a)}
                  className="border-t border-border hover:bg-muted/40 cursor-pointer transition-colors"
                >
                  <Td className="font-mono text-muted-foreground whitespace-nowrap">
                    {a.date ? format(new Date(a.date), "MMM d, yyyy") : "—"}
                  </Td>
                  <Td>{a.jurisdiction}</Td>
                  <Td>
                    {a.signalType
                      ? <Badge variant="outline" className="text-[10px] font-normal">{SIGNAL_TYPE_LABELS[a.signalType]}</Badge>
                      : <span className="text-muted-foreground">—</span>}
                  </Td>
                  <Td className="max-w-40 truncate text-muted-foreground">{a.developer ?? "—"}</Td>
                  <Td className="max-w-72 truncate">{a.title}</Td>
                  <Td className="text-right">
                    {a.growthScore != null
                      ? <SignalBar value={a.growthScore} showLabel={false} />
                      : <span className="text-muted-foreground">—</span>}
                  </Td>
                  <Td><StatusPill status={a.agendaStatus} /></Td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 100 && (
            <div className="p-3 border-t border-border text-center text-[11px] text-muted-foreground">
              Showing first 100 of {filtered.length}.
            </div>
          )}
          {filtered.length === 0 && !isLoading && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No agenda items match your filters.
            </div>
          )}
        </div>
      </div>

      {/* Detail drawer */}
      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0">
          {open && (
            <>
              <SheetHeader className="p-4 border-b border-border">
                {open.signalType && (
                  <Badge variant="outline" className="text-[10px] w-fit">
                    {SIGNAL_TYPE_LABELS[open.signalType]}
                  </Badge>
                )}
                <SheetTitle className="text-base text-left">{open.title}</SheetTitle>
                <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                  <span>{open.jurisdiction}</span>·
                  <span className="font-mono">{open.date ? format(new Date(open.date), "MMM d, yyyy") : "—"}</span>·
                  <StatusPill status={open.agendaStatus} />
                </div>
              </SheetHeader>
              <div className="p-4 space-y-4 overflow-auto">
                {open.description && (
                  <div className="rounded-md bg-muted/40 p-3 text-xs">{open.description}</div>
                )}

                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  {open.developer  && <><dt className="text-muted-foreground">Developer</dt><dd>{open.developer}</dd></>}
                  {open.location   && <><dt className="text-muted-foreground">Location</dt><dd>{open.location}</dd></>}
                  {open.acres != null && <><dt className="text-muted-foreground">Acres</dt><dd>{open.acres}</dd></>}
                  {open.units != null && <><dt className="text-muted-foreground">Units</dt><dd>{open.units}</dd></>}
                  {open.zoningFrom && <><dt className="text-muted-foreground">Zone from</dt><dd>{open.zoningFrom}</dd></>}
                  {open.zoningTo   && <><dt className="text-muted-foreground">Zone to</dt><dd>{open.zoningTo}</dd></>}
                  {open.body       && <><dt className="text-muted-foreground">Body</dt><dd>{open.body}</dd></>}
                </dl>

                {open.notes && (
                  <div className="rounded-md border border-border p-3 text-xs text-muted-foreground">
                    {open.notes}
                  </div>
                )}

                {open.url && (
                  <Button size="sm" variant="outline" className="w-full" asChild>
                    <a href={open.url} target="_blank" rel="noopener noreferrer">
                      <MapPin className="h-3 w-3" /> View source
                    </a>
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}

function LoadingSkeleton() {
  return (
    <AppShell>
      <div className="max-w-7xl mx-auto p-6 space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-full" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`text-left font-medium px-3 py-2 ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 ${className}`}>{children}</td>;
}

function StatusPill({ status }: { status: string | null }) {
  if (!status) return <span className="text-muted-foreground text-[10px]">—</span>;
  const tone =
    status === "APPROVED"  ? "bg-[var(--color-opportunity)]/15 text-[var(--color-opportunity)]"
    : status === "DENIED"  ? "bg-destructive/15 text-destructive"
    : status === "TABLED"  ? "bg-[var(--color-signal-med)]/15 text-[var(--color-signal-med)]"
    : "bg-muted text-muted-foreground";
  const label =
    status === "PROPOSED"  ? "Proposed"
    : status === "APPROVED" ? "Approved"
    : status === "DENIED"  ? "Denied"
    : status === "TABLED"  ? "Tabled"
    : status === "CONTINUED" ? "Continued"
    : status;
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${tone}`}>{label}</span>;
}

function Pill({
  value, onChange, placeholder, options, labels,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: readonly string[];
  labels?: Record<string, string>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-md bg-muted/50 border border-transparent px-2 text-xs hover:bg-muted focus:outline-none focus:ring-1 focus:ring-ring"
    >
      <option value="">{placeholder}: All</option>
      {options.map((o) => (
        <option key={o} value={o}>{labels ? labels[o as SignalType] ?? o : o}</option>
      ))}
    </select>
  );
}
