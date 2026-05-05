import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ParcelDetailPanel } from "@/components/ParcelDetailPanel";
import { ParcelThumb } from "@/components/ParcelThumb";
import { useIntel } from "@/lib/intel-context";
import { ALL_STAGES, STAGE_META, VACANCY_META, scoreFor, type Stage, type IntelParcel } from "@/lib/parcel-intel";
import { Plus, List, Map as MapIcon } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/pipeline")({
  head: () => ({
    meta: [
      { title: "Pipeline — Wasatch Intel" },
      { name: "description", content: "Parcel-centric pipeline of saved Utah land deals across Prospect, DD, LOI, and Closed stages." },
      { property: "og:title", content: "Pipeline — Wasatch Intel" },
      { property: "og:description", content: "Track Wasatch Front + Tooele Valley land acquisitions parcel by parcel." },
    ],
  }),
  component: PipelinePage,
});

type SortKey = "stage" | "score" | "spread" | "added" | "updated";

function PipelinePage() {
  const intel = useIntel();
  const [stageFilter, setStageFilter] = useState<"all" | Stage>("all");
  const [sort, setSort] = useState<SortKey>("stage");
  const [view, setView] = useState<"list" | "map">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addInput, setAddInput] = useState("");

  const pipeline = useMemo(() => intel.parcels.filter((p) => p.in_pipeline), [intel.parcels]);

  const counts = useMemo(() => {
    const out = { all: pipeline.length, prospect: 0, dd: 0, loi: 0, closed: 0 };
    pipeline.forEach((p) => { if (p.pipeline_stage) out[p.pipeline_stage]++; });
    return out;
  }, [pipeline]);

  const filtered = useMemo(() => {
    let arr = stageFilter === "all" ? pipeline : pipeline.filter((p) => p.pipeline_stage === stageFilter);
    const stageOrder: Record<Stage, number> = { prospect: 0, dd: 1, loi: 2, closed: 3 };
    arr = [...arr].sort((a, b) => {
      switch (sort) {
        case "score":   return scoreFor(b, intel.profile).total - scoreFor(a, intel.profile).total;
        case "spread":  return (b.spread.spread_amount ?? 0) - (a.spread.spread_amount ?? 0);
        case "added":   return (b.saved_at ?? "").localeCompare(a.saved_at ?? "");
        case "updated": return (b.saved_at ?? "").localeCompare(a.saved_at ?? "");
        case "stage":
        default:
          // most-advanced stage + days in stage descending
          const sa = stageOrder[a.pipeline_stage!] ?? 0;
          const sb = stageOrder[b.pipeline_stage!] ?? 0;
          if (sb !== sa) return sb - sa;
          return (b.days_in_stage ?? 0) - (a.days_in_stage ?? 0);
      }
    });
    return arr;
  }, [pipeline, stageFilter, sort, intel.profile]);

  const selected = useMemo(() => intel.parcels.find((p) => p.id === selectedId) ?? null, [intel.parcels, selectedId]);

  const lastUpdate = pipeline.reduce((acc, p) => p.saved_at && p.saved_at > acc ? p.saved_at : acc, "");

  return (
    <AppShell padded>
      <div className="px-6 py-5 max-w-[1400px] mx-auto">
        {/* Header */}
        <header className="flex flex-wrap items-end justify-between gap-3 mb-5">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Pipeline</h1>
            <p className="text-xs text-muted-foreground mt-1">
              {pipeline.length} parcels across {ALL_STAGES.length} stages
              {lastUpdate && ` · Last updated ${formatDistanceToNow(new Date(lastUpdate), { addSuffix: true })}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as "list" | "map")} className="h-8">
              <ToggleGroupItem value="list" className="h-8 px-2.5 text-xs"><List className="h-3.5 w-3.5" /> List</ToggleGroupItem>
              <ToggleGroupItem value="map" className="h-8 px-2.5 text-xs"><MapIcon className="h-3.5 w-3.5" /> Map</ToggleGroupItem>
            </ToggleGroup>
            <Select value={intel.profile.id.split("::")[0]} onValueChange={intel.setProfileById}>
              <SelectTrigger className="h-8 text-xs w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="gas-cstore" className="text-xs">Gas Station / C-Store</SelectItem>
                <SelectItem value="miniflex" className="text-xs">Miniflex / Light Industrial</SelectItem>
                <SelectItem value="generic-commercial" className="text-xs">Generic Commercial</SelectItem>
                {intel.customProfiles.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" className="h-8 text-xs" onClick={() => setAddOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Add Parcel
            </Button>
          </div>
        </header>

        {/* Filter chip row */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <ToggleGroup
            type="single" value={stageFilter}
            onValueChange={(v) => v && setStageFilter(v as typeof stageFilter)}
            className="flex-wrap"
          >
            <Chip value="all" label="All" count={counts.all} />
            <Chip value="prospect" label="Prospect" count={counts.prospect} stage="prospect" />
            <Chip value="dd" label="Due Diligence" count={counts.dd} stage="dd" />
            <Chip value="loi" label="LOI" count={counts.loi} stage="loi" />
            <Chip value="closed" label="Closed" count={counts.closed} stage="closed" />
          </ToggleGroup>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">Sort</span>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="h-7 text-xs w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="stage" className="text-xs">Stage progression + days stuck</SelectItem>
                <SelectItem value="score" className="text-xs">Score (highest)</SelectItem>
                <SelectItem value="spread" className="text-xs">Spread (highest)</SelectItem>
                <SelectItem value="added" className="text-xs">Recently added</SelectItem>
                <SelectItem value="updated" className="text-xs">Recently updated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Body */}
        {view === "list" ? (
          filtered.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-2">
              {filtered.map((p) => (
                <PipelineRow key={p.id} parcel={p} onClick={() => setSelectedId(p.id)} profileId={intel.profile.id} />
              ))}
            </div>
          )
        ) : (
          <PipelineMapView parcels={filtered} onSelect={setSelectedId} />
        )}
      </div>

      <ParcelDetailPanel
        parcel={selected}
        profile={intel.profile}
        open={!!selected}
        onClose={() => setSelectedId(null)}
        onStageChange={intel.updateStage}
        onOutcomeChange={intel.updateOutcome}
        onSavePipeline={intel.savePipeline}
        onRemovePipeline={(id) => { intel.removePipeline(id); setSelectedId(null); }}
      />

      {/* Add parcel modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Add parcel to pipeline</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">Paste a parcel ID or address. Backend will resolve via UGRC and open the detail panel.</p>
          <Input className="text-xs" placeholder="Parcel ID or address…" value={addInput} onChange={(e) => setAddInput(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button size="sm" disabled>Resolve (stub)</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Chip({ value, label, count, stage }: { value: string; label: string; count: number; stage?: Stage }) {
  return (
    <ToggleGroupItem
      value={value}
      className="h-8 px-3 text-xs gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
    >
      {stage && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STAGE_META[stage].tone }} />}
      <span>{label}</span>
      <span className="text-[10px] opacity-70 font-mono">{count}</span>
    </ToggleGroupItem>
  );
}

function PipelineRow({ parcel, onClick, profileId }: { parcel: IntelParcel; onClick: () => void; profileId: string }) {
  const { profile } = useIntel();
  void profileId;
  const score = scoreFor(parcel, profile);
  const stage = parcel.pipeline_stage!;
  const vac = VACANCY_META[parcel.vacancy_status];
  return (
    <button
      onClick={onClick}
      className="w-full flex items-stretch gap-3 p-2.5 rounded-md border border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all text-left"
    >
      <ParcelThumb parcel={parcel} size={80} />
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div className="font-medium text-sm truncate">{parcel.address || `Parcel ${parcel.id}`}</div>
        <div className="text-[11px] text-muted-foreground truncate">
          {parcel.jurisdiction} · {parcel.acres} ac · <span className="font-mono">{parcel.zoning}</span> → <span className="font-mono">{parcel.generalPlan}</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: vac.color }}>
            {vac.label}
          </span>
          {parcel.is_corner && (
            <span className="text-[10px] inline-flex items-center px-1.5 py-0.5 rounded border border-border text-muted-foreground">Corner</span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end justify-between py-0.5 shrink-0 min-w-[140px]">
        <Badge
          className="border-0 text-[10px] font-medium"
          style={{ backgroundColor: STAGE_META[stage].tone, color: "white" }}
        >
          {STAGE_META[stage].label}
        </Badge>
        <div className="text-right mt-1">
          <div className="text-[10px] text-muted-foreground font-mono">Score · {score.total} · {score.grade}</div>
          <div className="font-mono text-base font-semibold leading-tight">
            {parcel.spread.spread_amount !== null ? `$${(parcel.spread.spread_amount / 1_000_000).toFixed(1)}M` : "—"}
          </div>
          <div className="text-[10px] text-muted-foreground">{parcel.days_in_stage}d in stage</div>
        </div>
      </div>
    </button>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16 border border-dashed border-border rounded-lg bg-muted/20">
      <p className="text-sm font-medium">Your pipeline is empty.</p>
      <p className="text-xs text-muted-foreground mt-1">Save parcels from the map to start tracking deals.</p>
      <Button size="sm" className="mt-4" asChild>
        <a href="/">Open map</a>
      </Button>
    </div>
  );
}

function PipelineMapView({ parcels, onSelect }: { parcels: IntelParcel[]; onSelect: (id: string) => void }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden bg-muted/30 h-[600px] relative">
      <div className="absolute inset-0 grid grid-cols-3 gap-3 p-4 overflow-auto">
        {parcels.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className="rounded-md border border-border bg-card p-3 text-left hover:border-primary/50"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-muted-foreground">{p.apn}</span>
              <Badge className="border-0 text-[10px] text-white" style={{ backgroundColor: STAGE_META[p.pipeline_stage!].tone }}>
                {STAGE_META[p.pipeline_stage!].label}
              </Badge>
            </div>
            <div className="text-xs font-medium mt-1 truncate">{p.address}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
              {p.centroid[1].toFixed(4)}, {p.centroid[0].toFixed(4)}
            </div>
          </button>
        ))}
      </div>
      <div className="absolute bottom-2 right-3 text-[10px] text-muted-foreground bg-background/80 px-2 py-1 rounded font-mono">
        Map view stub — backend will render filtered MapLibre canvas
      </div>
    </div>
  );
}
