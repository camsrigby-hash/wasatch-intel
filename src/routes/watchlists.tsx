import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { WATCHLISTS } from "@/lib/mock-data";
import { Plus, MapPin, Users, FileSearch, Layers } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/watchlists")({
  head: () => ({
    meta: [
      { title: "Watchlists — Wasatch Intel" },
      { name: "description", content: "Saved geographies, parcels, applicants, and saved searches with push alerts." },
      { property: "og:title", content: "Watchlists — Wasatch Intel" },
      { property: "og:description", content: "Track parcels, geographies, and applicants with signal-based alerts." },
    ],
  }),
  component: WatchlistsPage,
});

const ICON_BY_TYPE = {
  Geography: MapPin,
  Applicant: Users,
  "Parcel Set": Layers,
  "Saved Search": FileSearch,
} as const;

function WatchlistsPage() {
  return (
    <AppShell>
      <div className="max-w-6xl mx-auto p-6 space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Watchlists</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Get notified when high-signal events hit places, applicants, or parcels you care about.</p>
          </div>
          <Button size="sm">
            <Plus className="h-3.5 w-3.5" /> New watchlist
          </Button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {WATCHLISTS.map((w) => {
            const Icon = ICON_BY_TYPE[w.type];
            return (
              <div key={w.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold truncate">{w.name}</h3>
                      <Badge variant="outline" className="text-[10px]">{w.type}</Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {w.hits} hits · last hit {formatDistanceToNow(new Date(w.lastHit), { addSuffix: true })}
                    </div>
                  </div>
                </div>

                {/* Sparkline */}
                <div className="h-12 flex items-end gap-0.5">
                  {Array.from({length: 30}).map((_, i) => {
                    const h = 20 + ((i * 17 + w.id.length * 13) % 70);
                    return <div key={i} className="flex-1 bg-primary/30 rounded-sm" style={{ height: `${h}%` }} />;
                  })}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
                  <span className="text-muted-foreground">Signal threshold</span>
                  <span className="font-mono">≥ {w.signalThreshold}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 text-muted-foreground">In-app alerts</label>
                  <Switch defaultChecked={w.alerts.inApp} />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 text-muted-foreground">Email alerts</label>
                  <Switch defaultChecked={w.alerts.email} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-lg border border-dashed border-border bg-card/50 p-6 text-center">
          <h3 className="text-sm font-medium">Create a new watchlist</h3>
          <p className="text-xs text-muted-foreground mt-1">Draw a polygon on the map, pick an applicant, or paste parcel APNs.</p>
          <div className="flex justify-center gap-2 mt-3">
            <Button size="sm" variant="outline"><MapPin className="h-3 w-3" /> Draw on map</Button>
            <Button size="sm" variant="outline"><Users className="h-3 w-3" /> Pick applicant</Button>
            <Button size="sm" variant="outline"><Layers className="h-3 w-3" /> Paste APNs</Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
