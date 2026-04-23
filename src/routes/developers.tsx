import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DEVELOPERS, AGENDAS, type Developer } from "@/lib/mock-data";
import { format } from "date-fns";
import { Building2, MapPin, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/developers")({
  head: () => ({
    meta: [
      { title: "Developers — Wasatch Intel" },
      { name: "description", content: "Leaderboard of builders, LLCs, and investors active in Wasatch Front and Tooele Valley." },
      { property: "og:title", content: "Developers — Wasatch Intel" },
      { property: "og:description", content: "Track who is land-banking and building where." },
    ],
  }),
  component: DevelopersPage,
});

function DevelopersPage() {
  const [selected, setSelected] = useState<Developer>(DEVELOPERS[0]);
  const sorted = [...DEVELOPERS].sort((a, b) => b.recentActivity - a.recentActivity);
  const recentForSelected = AGENDAS.filter((a) => a.applicantId === selected.id).slice(0, 8);

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        {/* Leaderboard */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <h1 className="text-xl font-semibold">Developers</h1>
            <span className="text-[11px] text-muted-foreground">{DEVELOPERS.length} tracked</span>
          </div>
          <div className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
            {sorted.map((d, i) => {
              const active = d.id === selected.id;
              return (
                <button
                  key={d.id}
                  onClick={() => setSelected(d)}
                  className={`w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors flex items-center gap-3 ${active ? "bg-accent/40" : ""}`}
                >
                  <span className="font-mono text-[10px] text-muted-foreground w-5 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{d.name}</div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px] h-3.5 px-1">{d.type}</Badge>
                      <span>{d.jurisdictions.length} jurisdictions</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xs">{d.recentActivity}</div>
                    <div className="text-[9px] uppercase tracking-wide text-muted-foreground">recent</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Profile */}
        <div className="space-y-4">
          <header className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold leading-tight">{selected.name}</h2>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px]">{selected.type}</Badge>
                      <span>·</span> Founded {selected.founded}
                      <span>·</span> <MapPin className="h-3 w-3" /> {selected.hq}
                    </div>
                  </div>
                </div>
              </div>
              <Button size="sm" variant="outline">+ Add to watchlist</Button>
            </div>

            <div className="grid grid-cols-4 gap-4 mt-5 pt-5 border-t border-border">
              <Stat label="Units in pipeline" value={selected.unitsInPipeline.toLocaleString()} />
              <Stat label="Parcels owned" value={selected.parcelsOwned.toString()} />
              <Stat label="Jurisdictions" value={selected.jurisdictions.length.toString()} />
              <Stat label="Recent filings" value={selected.recentActivity.toString()} accent />
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="text-xs font-semibold mb-3">Active jurisdictions</h3>
              <div className="flex flex-wrap gap-1.5">
                {selected.jurisdictions.map((j) => (
                  <Badge key={j} variant="secondary" className="text-[11px]">{j}</Badge>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="text-xs font-semibold mb-3 flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" /> Footprint heatmap
              </h3>
              <div className="aspect-[2/1] rounded-md bg-gradient-to-br from-primary/5 via-[var(--color-heat)]/20 to-[var(--color-signal-critical)]/30 border border-border relative overflow-hidden">
                {Array.from({length: 14}).map((_, i) => (
                  <span key={i} className="absolute h-3 w-3 rounded-full bg-[var(--color-heat)] opacity-70 blur-[3px]"
                    style={{ left: `${(i*73)%90+5}%`, top: `${(i*47)%80+10}%` }} />
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-xs font-semibold">Recent agenda activity</h3>
            </div>
            <div className="divide-y divide-border">
              {recentForSelected.length === 0 && <div className="p-4 text-xs text-muted-foreground">No recent activity matched.</div>}
              {recentForSelected.map((a) => (
                <div key={a.id} className="px-4 py-2.5 text-xs flex items-center gap-3">
                  <span className="font-mono text-[10px] text-muted-foreground w-20">{format(new Date(a.date), "MMM d, yyyy")}</span>
                  <Badge variant="outline" className="text-[10px]">{a.type}</Badge>
                  <span className="flex-1 truncate">{a.title}</span>
                  <span className="text-[10px] text-muted-foreground">{a.jurisdiction}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className={`font-mono text-2xl font-semibold ${accent ? "text-primary" : ""}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
