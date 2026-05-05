import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Layers, MapPin, Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { MapCanvas } from "@/components/MapCanvas";
import { ParcelDetailPanel } from "@/components/ParcelDetailPanel";
import { ScoringControls } from "@/components/ScoringControls";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { JURISDICTIONS, AGENDA_TYPES, type Parcel as BaseParcel, type AgendaItem, signalLabel } from "@/lib/mock-data";
import { useIntel } from "@/lib/intel-context";
import { scoreAll, GRADE_COLORS, VACANCY_META, type Grade } from "@/lib/parcel-intel";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Map — Wasatch Intel" },
      { name: "description", content: "Satellite map of Wasatch Front + Tooele Valley parcels with score grades, agenda activity, and zoning gaps." },
      { property: "og:title", content: "Map — Wasatch Intel" },
      { property: "og:description", content: "Wasatch Front development intelligence map." },
    ],
  }),
  component: MapPage,
});

const LAYER_DEFS = [
  { key: "parcels", label: "Parcels (score grade)", color: "bg-[var(--grade-a)]" },
  { key: "gap", label: "Zoning vs General Plan gap", color: "bg-[var(--color-gap)]" },
  { key: "agendas", label: "Agenda pins", color: "bg-[var(--color-signal-high)]" },
  { key: "heatmap", label: "Developer activity heatmap", color: "bg-[var(--color-heat)]" },
  { key: "sitePlans", label: "Site plan overlays", color: "bg-[var(--color-opportunity)]" },
] as const;

function MapPage() {
  const intel = useIntel();
  const [layers, setLayers] = useState({ parcels: true, gap: true, agendas: true, heatmap: false, sitePlans: false });
  const [railOpen, setRailOpen] = useState(true);
  const [scoringOpen, setScoringOpen] = useState(true);
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null);
  const [agendaPopover, setAgendaPopover] = useState<AgendaItem | null>(null);
  const [showMyPipeline, setShowMyPipeline] = useState(false);
  const [gradeFilter, setGradeFilter] = useState<Grade[]>(["A", "B", "C", "D"]);
  const [fillOpacity, setFillOpacity] = useState(0.65);

  // Compute per-parcel grade colors under the active profile.
  const { parcelColors, dimMask } = useMemo(() => {
    const map = scoreAll(intel.profile, intel.isCustom);
    const colors: Record<string, string> = {};
    const visible = new Set<string>();
    intel.parcels.forEach((p) => {
      const s = map.get(p.id);
      if (!s) return;
      if (gradeFilter.includes(s.grade)) {
        colors[p.id] = GRADE_COLORS[s.grade];
        visible.add(p.id);
      }
    });
    let dim: Set<string> | null = visible;
    if (showMyPipeline) {
      dim = new Set([...visible].filter((id) => intel.parcels.find((p) => p.id === id)?.in_pipeline));
    }
    return { parcelColors: colors, dimMask: dim };
  }, [intel.parcels, intel.profile, intel.isCustom, gradeFilter, showMyPipeline]);

  const selected = useMemo(
    () => intel.parcels.find((p) => p.id === selectedParcelId) ?? null,
    [intel.parcels, selectedParcelId],
  );

  return (
    <AppShell padded={false}>
      <MapCanvas
        layers={layers}
        onParcelClick={(p: BaseParcel) => setSelectedParcelId(p.id)}
        onAgendaClick={setAgendaPopover}
        selectedParcelId={selectedParcelId}
        parcelColors={layers.parcels ? parcelColors : undefined}
        fillOpacity={fillOpacity}
        dimMask={dimMask}
      />

      {/* Top toolbar — search + profile + chip row */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 bg-background/95 backdrop-blur border border-border rounded-md shadow-sm px-2 py-1.5">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              data-global-search="true"
              placeholder="Parcel ID or address…"
              className="h-7 pl-7 text-xs w-56 border-transparent bg-muted/50 focus-visible:bg-background"
            />
          </div>
          <Select value={intel.profile.id.split("::")[0]} onValueChange={intel.setProfileById}>
            <SelectTrigger className="h-7 text-xs w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="gas-cstore" className="text-xs">Gas Station / C-Store</SelectItem>
              <SelectItem value="miniflex" className="text-xs">Miniflex / Light Industrial</SelectItem>
              <SelectItem value="generic-commercial" className="text-xs">Generic Commercial</SelectItem>
              {intel.customProfiles.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FilterSelect label="Jurisdiction" options={["All", ...JURISDICTIONS]} />
          <FilterSelect label="Type" options={["All", ...AGENDA_TYPES]} />
          <FilterSelect label="Date" options={["Last 30d", "Last 90d", "Last 6mo", "Last 12mo", "Last 24mo"]} defaultValue="Last 12mo" />
        </div>
        {/* Chip row */}
        <div className="flex items-center gap-2 bg-background/95 backdrop-blur border border-border rounded-md shadow-sm px-2 py-1">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium pl-1">Grade</span>
          <ToggleGroup
            type="multiple"
            value={gradeFilter}
            onValueChange={(v) => v.length && setGradeFilter(v as Grade[])}
            className="gap-0.5"
          >
            {(["A", "B", "C", "D"] as Grade[]).map((g) => (
              <ToggleGroupItem
                key={g} value={g}
                className="h-6 w-7 text-[10px] font-mono data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                {g}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground font-medium">My Pipeline</span>
          <Switch checked={showMyPipeline} onCheckedChange={setShowMyPipeline} />
        </div>
      </div>

      {/* Left rail */}
      <aside className={cn(
        "absolute top-3 bottom-3 left-3 z-10 transition-all duration-200",
        railOpen ? "w-72" : "w-10"
      )}>
        <div className="h-full bg-background/95 backdrop-blur border border-border rounded-md shadow-sm flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 h-9 border-b border-border">
            {railOpen && (
              <div className="flex items-center gap-1.5 text-xs font-medium">
                <Layers className="h-3.5 w-3.5" />
                Layers
              </div>
            )}
            <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={() => setRailOpen(!railOpen)}>
              {railOpen ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </Button>
          </div>
          {railOpen && (
            <div className="flex-1 overflow-auto p-3 space-y-4">
              {LAYER_DEFS.map((l) => (
                <div key={l.key} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2.5 w-2.5 rounded-sm", l.color)} />
                    <label className="text-xs flex-1">{l.label}</label>
                    <Switch
                      checked={layers[l.key]}
                      onCheckedChange={(v) => setLayers((s) => ({ ...s, [l.key]: v }))}
                    />
                  </div>
                  {layers[l.key] && (
                    <Slider defaultValue={[80]} max={100} step={5} className="px-0.5" />
                  )}
                </div>
              ))}

              <div className="pt-3 border-t border-border">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Score grade</div>
                <div className="space-y-1">
                  {(["A", "B", "C", "D"] as Grade[]).map((g) => (
                    <div key={g} className="flex items-center gap-2 text-[11px]">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: GRADE_COLORS[g] }} />
                      <span className="text-muted-foreground">Grade {g}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-border">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Vacancy</div>
                <div className="space-y-1">
                  {Object.entries(VACANCY_META).slice(0, 5).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2 text-[11px]">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: v.color }} />
                      <span className="text-muted-foreground truncate">{v.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Right scoring controls */}
      <ScoringControls
        open={scoringOpen}
        onToggle={() => setScoringOpen((s) => !s)}
        fillOpacity={fillOpacity}
        setFillOpacity={setFillOpacity}
      />

      {/* Agenda popover */}
      {agendaPopover && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-80 bg-background border border-border rounded-md shadow-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <Badge variant="outline" className="text-[10px]">{agendaPopover.type}</Badge>
            <button className="text-muted-foreground hover:text-foreground text-xs" onClick={() => setAgendaPopover(null)}>×</button>
          </div>
          <div className="text-xs font-medium">{agendaPopover.applicant}</div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="h-3 w-3" /> {agendaPopover.jurisdiction} · {format(new Date(agendaPopover.date), "MMM d, yyyy")}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">Signal</span>
            <Badge className="text-[10px] bg-[var(--color-signal-high)] text-white border-0">
              {agendaPopover.signal} {signalLabel(agendaPopover.signal)}
            </Badge>
          </div>
        </div>
      )}

      <ParcelDetailPanel
        parcel={selected}
        profile={intel.profile}
        open={!!selected}
        onClose={() => setSelectedParcelId(null)}
        onStageChange={intel.updateStage}
        onOutcomeChange={intel.updateOutcome}
        onSavePipeline={intel.savePipeline}
        onRemovePipeline={(id) => { intel.removePipeline(id); setSelectedParcelId(null); }}
      />
    </AppShell>
  );
}

function FilterSelect({ label, options, defaultValue }: { label: string; options: string[]; defaultValue?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{label}</span>
      <Select defaultValue={defaultValue ?? options[0]}>
        <SelectTrigger className="h-7 text-xs border-transparent bg-muted/50 hover:bg-muted px-2 gap-1 [&>span]:truncate min-w-24 max-w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
