import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SignalBar } from "@/components/SignalBar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { JURISDICTIONS } from "@/lib/types";
import type { AgendaItem, SignalType } from "@/lib/types";
import { useAgendas } from "@/lib/api-client";
import { format } from "date-fns";
import { Search, MapPin, AlertCircle, CalendarIcon, Filter, X } from "lucide-react";

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

interface AgendasSearch {
  q?: string;
  jurisdictions?: string[];   // multi-select
  types?: string[];           // multi-select SignalType
  signal_min?: number;        // 0-100
  signal_max?: number;        // 0-100
  date_from?: string;         // ISO date
  date_to?: string;           // ISO date
}

function asStringArray(v: unknown): string[] | undefined {
  if (typeof v === "string" && v) return v.split(",").filter(Boolean);
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string" && x.length > 0);
  return undefined;
}

function asNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v && !Number.isNaN(Number(v))) return Number(v);
  return undefined;
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v ? v : undefined;
}

export const Route = createFileRoute("/agendas")({
  head: () => ({
    meta: [
      { title: "Agendas — Wasatch Intel" },
      { name: "description", content: "Searchable table of every scraped planning commission and city council agenda item across Wasatch Front cities." },
      { property: "og:title", content: "Agendas — Wasatch Intel" },
      { property: "og:description", content: "Browse 24 months of city planning and council activity." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): AgendasSearch => ({
    q:             asString(s.q),
    jurisdictions: asStringArray(s.jurisdictions),
    types:         asStringArray(s.types),
    signal_min:    asNumber(s.signal_min),
    signal_max:    asNumber(s.signal_max),
    date_from:     asString(s.date_from),
    date_to:       asString(s.date_to),
  }),
  component: AgendasPage,
});

function AgendasPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const setSearch = (next: Partial<AgendasSearch>) => {
    navigate({
      search: (old: AgendasSearch) => {
        const merged = { ...old, ...next };
        // Drop undefined keys so URL stays clean
        for (const k of Object.keys(merged) as (keyof AgendasSearch)[]) {
          const v = merged[k];
          if (v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) {
            delete merged[k];
          }
        }
        return merged;
      },
      replace: true,
    });
  };

  const { data: response, isLoading, isError } = useAgendas();
  const agendas = response?.data ?? [];
  const meta    = response?.meta;

  const q              = search.q ?? "";
  const jurisdictions  = search.jurisdictions ?? [];
  const types          = (search.types ?? []) as SignalType[];
  const signalMin      = search.signal_min ?? 0;
  const signalMax      = search.signal_max ?? 100;
  const dateFrom       = search.date_from ? new Date(search.date_from) : undefined;
  const dateTo         = search.date_to   ? new Date(search.date_to)   : undefined;

  const [open, setOpen] = useState<AgendaItem | null>(null);

  const filtered = useMemo(() => {
    const fromTime = dateFrom?.getTime();
    const toTime   = dateTo?.getTime();
    return agendas.filter((a) => {
      if (q) {
        const ql = q.toLowerCase();
        const hit =
          a.title.toLowerCase().includes(ql) ||
          (a.developer ?? "").toLowerCase().includes(ql) ||
          a.id.toLowerCase().includes(ql);
        if (!hit) return false;
      }
      if (jurisdictions.length > 0 && !jurisdictions.includes(a.jurisdiction)) return false;
      if (types.length > 0 && (!a.signalType || !types.includes(a.signalType))) return false;
      const score = a.growthScore ?? 0;
      if (score < signalMin || score > signalMax) return false;
      if (fromTime || toTime) {
        if (!a.date) return false;
        const t = new Date(a.date).getTime();
        if (Number.isNaN(t)) return false;
        if (fromTime && t < fromTime) return false;
        if (toTime   && t > toTime)   return false;
      }
      return true;
    });
  }, [agendas, q, jurisdictions, types, signalMin, signalMax, dateFrom, dateTo]);

  const activeFilterCount =
    (q ? 1 : 0) +
    (jurisdictions.length > 0 ? 1 : 0) +
    (types.length > 0 ? 1 : 0) +
    (signalMin > 0 || signalMax < 100 ? 1 : 0) +
    (dateFrom || dateTo ? 1 : 0);

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
              onChange={(e) => setSearch({ q: e.target.value || undefined })}
              placeholder="Search title, developer, ID…"
              className="h-8 pl-8 text-xs border-transparent bg-muted/50"
            />
          </div>

          <MultiSelectFilter
            label="Jurisdiction"
            options={JURISDICTIONS as readonly string[]}
            selected={jurisdictions}
            onChange={(next) => setSearch({ jurisdictions: next.length > 0 ? next : undefined })}
          />

          <MultiSelectFilter
            label="Item type"
            options={SIGNAL_TYPE_OPTIONS}
            labels={SIGNAL_TYPE_LABELS}
            selected={types}
            onChange={(next) => setSearch({ types: next.length > 0 ? next : undefined })}
          />

          <SignalRangeFilter
            min={signalMin}
            max={signalMax}
            onChange={(lo, hi) => setSearch({
              signal_min: lo > 0   ? lo : undefined,
              signal_max: hi < 100 ? hi : undefined,
            })}
          />

          <DateRangeFilter
            from={dateFrom}
            to={dateTo}
            onChange={(f, t) => setSearch({
              date_from: f ? f.toISOString().slice(0, 10) : undefined,
              date_to:   t ? t.toISOString().slice(0, 10) : undefined,
            })}
          />

          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => navigate({ search: {}, replace: true })}
            >
              <X className="h-3 w-3" /> Reset
            </Button>
          )}
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

function MultiSelectFilter<T extends string>({
  label, options, labels, selected, onChange,
}: {
  label: string;
  options: readonly T[];
  labels?: Record<string, string>;
  selected: T[];
  onChange: (next: T[]) => void;
}) {
  const count = selected.length;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
          <Filter className="h-3 w-3" />
          {label}
          {count > 0 && (
            <Badge variant="secondary" className="ml-0.5 text-[10px] h-4 px-1">{count}</Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-2 w-56 max-h-72 overflow-auto" align="start">
        <div className="space-y-1">
          {options.map((opt) => {
            const checked = selected.includes(opt);
            const id = `${label}-${opt}`;
            return (
              <label key={opt} htmlFor={id} className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-muted cursor-pointer">
                <Checkbox
                  id={id}
                  checked={checked}
                  onCheckedChange={(v) => {
                    if (v) onChange([...selected, opt]);
                    else   onChange(selected.filter((s) => s !== opt));
                  }}
                />
                <span className="text-xs">{labels ? labels[opt] ?? opt : opt}</span>
              </label>
            );
          })}
        </div>
        {count > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-1 h-7 text-xs"
            onClick={() => onChange([])}
          >
            Clear
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

function SignalRangeFilter({
  min, max, onChange,
}: {
  min: number;
  max: number;
  onChange: (lo: number, hi: number) => void;
}) {
  const active = min > 0 || max < 100;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
          <Filter className="h-3 w-3" />
          Signal
          {active && (
            <Badge variant="secondary" className="ml-0.5 text-[10px] h-4 px-1 font-mono">
              {min}–{max}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-3 w-64" align="start">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
          Signal strength: {min} – {max}
        </div>
        <Slider
          min={0}
          max={100}
          step={5}
          value={[min, max]}
          onValueChange={([lo, hi]) => onChange(lo, hi)}
        />
        <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-1.5">
          <span>0</span><span>50</span><span>100</span>
        </div>
        {active && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 h-7 text-xs"
            onClick={() => onChange(0, 100)}
          >
            Reset
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

function DateRangeFilter({
  from, to, onChange,
}: {
  from: Date | undefined;
  to:   Date | undefined;
  onChange: (from: Date | undefined, to: Date | undefined) => void;
}) {
  const active = !!from || !!to;
  const summary = active
    ? `${from ? format(from, "MMM d") : "…"} – ${to ? format(to, "MMM d") : "…"}`
    : null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
          <CalendarIcon className="h-3 w-3" />
          Date
          {summary && (
            <Badge variant="secondary" className="ml-0.5 text-[10px] h-4 px-1 font-mono">
              {summary}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-auto" align="start">
        <Calendar
          mode="range"
          selected={{ from, to }}
          onSelect={(range) => onChange(range?.from, range?.to)}
          numberOfMonths={2}
        />
        {active && (
          <div className="p-2 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-xs"
              onClick={() => onChange(undefined, undefined)}
            >
              Clear
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
