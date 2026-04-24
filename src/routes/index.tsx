import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Layers, MapPin } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { MapCanvas } from "@/components/MapCanvas";
import { ParcelDeepDive } from "@/components/ParcelDeepDive";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { JURISDICTIONS, signalLabel } from "@/lib/types";
import { AGENDA_TYPES, type Parcel, type AgendaItem } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Map — Wasatch Intel" },
      { name: "description", content: "Satellite map of Wasatch Front + Tooele Valley parcels, agenda activity, zoning gaps, and developer heatmaps." },
      { property: "og:title", content: "Map — Wasatch Intel" },
      { property: "og:description", content: "Wasatch Front development intelligence map." },
    ],
  }),
  component: MapPage,
});

const LAYER_DEFS = [
  { key: "parcels", label: "Parcels", color: "bg-[var(--color-primary)]" },
  { key: "gap", label: "Zoning vs General Plan gap", color: "bg-[var(--color-gap)]" },
  { key: "agendas", label: "Agenda pins", color: "bg-[var(--color-signal-high)]" },
  { key: "heatmap", label: "Developer activity heatmap", color: "bg-[var(--color-heat)]" },
  { key: "sitePlans", label: "Site plan overlays", color: "bg-[var(--color-opportunity)]" },
] as const;

function MapPage() {
  const [layers, setLayers] = useState({ parcels: true, gap: true, agendas: true, heatmap: false, sitePlans: false });
  const [railOpen, setRailOpen] = useState(true);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [agendaPopover, setAgendaPopover] = useState<AgendaItem | null>(null);

  return (
    <AppShell padded={false}>
      <MapCanvas
        layers={layers}
        onParcelClick={setSelectedParcel}
        onAgendaClick={setAgendaPopover}
        selectedParcelId={selectedParcel?.id ?? null}
      />

      {/* Filter bar */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-background/95 backdrop-blur border border-border rounded-md shadow-sm px-2 py-1.5">
        <FilterSelect label="Jurisdiction" options={["All", ...JURISDICTIONS]} />
        <FilterSelect label="Type" options={["All", ...AGENDA_TYPES]} />
        <FilterSelect label="Date" options={["Last 30d", "Last 90d", "Last 6mo", "Last 12mo", "Last 24mo"]} defaultValue="Last 12mo" />
        <FilterSelect label="Signal" options={["Any", "≥40 Med", "≥60 High", "≥80 Critical"]} />
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
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Signal legend</div>
                <div className="space-y-1">
                  {[
                    { label: "Critical", color: "bg-[var(--color-signal-critical)]" },
                    { label: "High",     color: "bg-[var(--color-signal-high)]" },
                    { label: "Med",      color: "bg-[var(--color-signal-med)]" },
                    { label: "Low",      color: "bg-[var(--color-signal-low)]" },
                  ].map((x) => (
                    <div key={x.label} className="flex items-center gap-2 text-[11px]">
                      <span className={cn("h-2 w-2 rounded-full", x.color)} />
                      <span className="text-muted-foreground">{x.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

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
            <Badge className="text-[10px] bg-[var(--color-signal-high)] text-white border-0">{agendaPopover.signal} {signalLabel(agendaPopover.signal)}</Badge>
          </div>
        </div>
      )}

      <ParcelDeepDive parcel={selectedParcel} open={!!selectedParcel} onClose={() => setSelectedParcel(null)} />
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
