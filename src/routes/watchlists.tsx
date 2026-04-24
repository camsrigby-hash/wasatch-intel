import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useWatchlists } from "@/lib/api-client";
import { Plus, MapPin, Users, FileSearch, Layers } from "lucide-react";

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

function WatchlistsPage() {
  const { data: env, isLoading } = useWatchlists();
  const watchlists = env?.data ?? [];

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto p-6 space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Watchlists</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Get notified when high-signal events hit places, applicants, or parcels you care about.
            </p>
          </div>
          <Button size="sm">
            <Plus className="h-3.5 w-3.5" /> New watchlist
          </Button>
        </header>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-lg" />)}
          </div>
        ) : watchlists.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {watchlists.map((w) => (
              <div key={w.id} className="rounded-lg border border-border bg-card p-4 text-xs">
                {w.name}
              </div>
            ))}
          </div>
        ) : null}

        <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center">
          <h3 className="text-sm font-medium">
            {watchlists.length === 0 ? "No watchlists yet — create one to get alerts on high-signal events" : "Create a new watchlist"}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Draw a polygon on the map, pick an applicant, or paste parcel APNs.
            Alert delivery via email lands in Phase 7 when D1 persistence is wired.
          </p>
          <div className="flex justify-center gap-2 mt-4">
            <Button size="sm" variant="outline"><MapPin className="h-3 w-3" /> Draw on map</Button>
            <Button size="sm" variant="outline"><Users className="h-3 w-3" /> Pick applicant</Button>
            <Button size="sm" variant="outline"><Layers className="h-3 w-3" /> Paste APNs</Button>
            <Button size="sm" variant="outline"><FileSearch className="h-3 w-3" /> Saved search</Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
