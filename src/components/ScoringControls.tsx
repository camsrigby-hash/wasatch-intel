import { useMemo, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useIntel } from "@/lib/intel-context";
import {
  SCORE_DIMENSIONS, type ScoreDimension, normalizeWeights, scoreAll,
  GRADE_COLORS, type Grade,
} from "@/lib/parcel-intel";
import { ChevronRight, Save, RotateCcw, Info } from "lucide-react";

const DIMENSION_LABELS: Record<ScoreDimension, string> = {
  corner: "Corner Detection",
  aadt: "AADT / Traffic Volume",
  signal: "Traffic Signal Presence",
  competition: "Competition",
  zoning: "Zoning Suitability",
  growth: "Growth Signal",
  stip: "STIP / Future Projects",
  corridor: "Commute Corridor",
};

interface Props {
  open: boolean;
  onToggle: () => void;
  fillOpacity: number;
  setFillOpacity: (n: number) => void;
}

export function ScoringControls({ open, onToggle, fillOpacity, setFillOpacity }: Props) {
  const intel = useIntel();
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");

  const norm = useMemo(() => normalizeWeights(intel.profile.weights), [intel.profile.weights]);

  // Live grade distribution under current settings.
  const distribution = useMemo(() => {
    const map = scoreAll(intel.profile, intel.isCustom);
    const dist: Record<Grade, number> = { A: 0, B: 0, C: 0, D: 0 };
    map.forEach((s) => { dist[s.grade]++; });
    return dist;
  }, [intel.profile, intel.isCustom]);

  if (!open) {
    return (
      <button
        onClick={onToggle}
        className="absolute top-3 right-3 z-10 h-8 w-8 rounded-md bg-background/95 border border-border shadow-sm flex items-center justify-center hover:bg-muted"
      >
        <ChevronRight className="h-3.5 w-3.5 rotate-180" />
      </button>
    );
  }

  const updateWeight = (dim: ScoreDimension, value: number) => {
    intel.setWeights({ ...intel.profile.weights, [dim]: value });
  };

  return (
    <>
      <aside className="absolute top-3 right-3 bottom-3 z-10 w-80 bg-background/95 backdrop-blur border border-border rounded-md shadow-sm flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-3 h-9 border-b border-border">
          <div className="text-xs font-medium truncate">Scoring · {intel.profile.name}</div>
          <button onClick={onToggle} className="text-muted-foreground hover:text-foreground">
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Active profile */}
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Active profile</div>
            <Select value={intel.profile.id.split("::")[0]} onValueChange={intel.setProfileById}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="gas-cstore" className="text-xs">Gas Station / C-Store</SelectItem>
                <SelectItem value="miniflex" className="text-xs">Miniflex / Light Industrial</SelectItem>
                <SelectItem value="generic-commercial" className="text-xs">Generic Commercial</SelectItem>
                {intel.customProfiles.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                ))}
                {intel.isCustom && <SelectItem value={intel.profile.id} className="text-xs italic" disabled>{intel.profile.name}</SelectItem>}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground italic leading-tight">{intel.profile.description}</p>
          </div>

          {/* Weights */}
          <div className="space-y-3">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Weights</div>
            {SCORE_DIMENSIONS.map((d) => {
              const tooltip = d === "competition" && intel.profile.flags.income_inversion
                ? "C-store performance is inversely correlated with median household income — lower income → higher score."
                : null;
              return (
                <div key={d} className="space-y-1">
                  <div className="flex items-center gap-1 text-[11px]">
                    <span className="flex-1 truncate">{DIMENSION_LABELS[d]}</span>
                    {tooltip && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger><Info className="h-2.5 w-2.5 text-muted-foreground" /></TooltipTrigger>
                          <TooltipContent className="max-w-[240px] text-[11px]">{tooltip}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    <span className="font-mono text-[10px] text-muted-foreground tabular-nums">{intel.profile.weights[d]}</span>
                    <span className="font-mono text-[10px] text-muted-foreground tabular-nums w-10 text-right">{norm[d]}%</span>
                  </div>
                  <Slider
                    value={[intel.profile.weights[d]]}
                    onValueChange={(v) => updateWeight(d, v[0])}
                    min={0} max={10} step={1}
                  />
                </div>
              );
            })}
          </div>

          {/* Grade distribution */}
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold flex items-center gap-1">
              Live grade distribution
              {intel.isCustom && <span className="ml-auto px-1.5 py-0.5 rounded bg-muted text-[9px] normal-case tracking-normal">percentile</span>}
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {(Object.keys(distribution) as Grade[]).map((g) => (
                <div key={g} className="rounded border border-border p-1.5 text-center">
                  <div className="font-mono text-base font-semibold leading-none" style={{ color: GRADE_COLORS[g] }}>{g}</div>
                  <div className="font-mono text-[10px] text-muted-foreground mt-1">{distribution[g]}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Fill opacity */}
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Polygon fill opacity</div>
            <Slider value={[fillOpacity * 100]} onValueChange={(v) => setFillOpacity(v[0] / 100)} min={20} max={90} step={5} />
            <div className="text-[10px] text-muted-foreground text-right font-mono">{Math.round(fillOpacity * 100)}%</div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-2 border-t border-border">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={intel.resetToProfileDefaults}>
              <RotateCcw className="h-3 w-3" /> Reset to profile defaults
            </Button>
            <Button size="sm" className="h-7 text-xs" onClick={() => setSaveOpen(true)} disabled={!intel.isCustom}>
              <Save className="h-3 w-3" /> Save as new profile
            </Button>
          </div>
        </div>
      </aside>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="text-base">Save scoring profile</DialogTitle></DialogHeader>
          <Input className="text-xs" placeholder="Profile name" value={saveName} onChange={(e) => setSaveName(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSaveOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={() => {
              if (!saveName.trim()) return;
              intel.saveCustomProfile(saveName.trim());
              setSaveOpen(false);
              setSaveName("");
            }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
