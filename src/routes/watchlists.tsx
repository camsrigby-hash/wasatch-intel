import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { WatchlistWizard } from "@/components/WatchlistWizard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  useWatchlists,
  useWatchlistHits,
  useUpdateWatchlist,
  useDeleteWatchlist,
} from "@/lib/api-client";
import type { Watchlist } from "@/lib/types";
import { Plus, MapPin, Users, Layers, FileSearch, Bell, Mail, Trash2, ChevronDown, ChevronRight, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/watchlists")({
  head: () => ({
    meta: [
      { title: "Watchlists — Wasatch Intel" },
      { name: "description", content: "Saved geographies, parcels, applicants, and saved searches with push alerts." },
      { property: "og:title", content: "Watchlists — Wasatch Intel" },
    ],
  }),
  component: WatchlistsPage,
});

function typeIcon(type: Watchlist["type"]) {
  switch (type) {
    case "Geography":    return <MapPin    className="h-3.5 w-3.5" />;
    case "Applicant":    return <Users     className="h-3.5 w-3.5" />;
    case "Parcel Set":   return <Layers    className="h-3.5 w-3.5" />;
    case "Saved Search": return <FileSearch className="h-3.5 w-3.5" />;
  }
}

function criteriaLabel(w: Watchlist): string {
  const c = w.criteria;
  switch (c.type) {
    case "Geography":
      return c.jurisdictions.length
        ? c.jurisdictions.join(", ") + (c.polygon ? " + polygon" : "")
        : c.polygon ? "Custom polygon" : "All geographies";
    case "Applicant":
      return c.developerName || "—";
    case "Parcel Set":
      return `${c.apns.length} APN${c.apns.length !== 1 ? "s" : ""}`;
    case "Saved Search": {
      const parts: string[] = [];
      if (c.jurisdictions?.length) parts.push(c.jurisdictions.join(", "));
      if (c.signalTypes?.length)   parts.push(`${c.signalTypes.length} type${c.signalTypes.length !== 1 ? "s" : ""}`);
      if (c.minScore)              parts.push(`≥${c.minScore}`);
      return parts.join(" · ") || "All signals";
    }
  }
}

function HitsPanel({ id }: { id: string }) {
  const { data, isLoading } = useWatchlistHits(id);
  const hits = data?.data ?? [];

  if (isLoading) return <Skeleton className="h-10 w-full" />;
  if (!hits.length) return (
    <p className="text-xs text-muted-foreground py-2">No hits yet — the cron runs every hour.</p>
  );

  return (
    <ul className="space-y-1.5">
      {hits.slice(0, 10).map((h) => (
        <li key={h.id} className="flex items-start gap-2 text-xs">
          <Zap className="h-3 w-3 mt-0.5 shrink-0 text-yellow-500" />
          <div className="min-w-0">
            <p className="truncate font-medium">{h.signalHeadline ?? h.signalId}</p>
            <p className="text-muted-foreground">
              {h.signalSource} · score {h.signalScore ?? "—"} · {formatDistanceToNow(new Date(h.firedAt), { addSuffix: true })}
            </p>
          </div>
        </li>
      ))}
      {hits.length > 10 && (
        <p className="text-xs text-muted-foreground">+{hits.length - 10} more</p>
      )}
    </ul>
  );
}

function WatchlistCard({ w }: { w: Watchlist }) {
  const [expanded,      setExpanded]      = useState(false);
  const [showHits,      setShowHits]      = useState(false);
  const [threshold,     setThreshold]     = useState(w.signalThreshold);
  const [pendingThresh, setPendingThresh] = useState(false);
  const updateMutation = useUpdateWatchlist();
  const deleteMutation = useDeleteWatchlist();

  async function handleAlertToggle(field: "inApp" | "email", value: boolean) {
    await updateMutation.mutateAsync({
      id: w.id,
      patch: { alerts: { ...w.alerts, [field]: value } },
    });
  }

  async function handleThresholdCommit(value: number) {
    setThreshold(value);
    setPendingThresh(true);
    await updateMutation.mutateAsync({ id: w.id, patch: { signalThreshold: value } });
    setPendingThresh(false);
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-2 p-3">
        <span className="text-muted-foreground">{typeIcon(w.type)}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{w.name}</p>
          <p className="text-[10px] text-muted-foreground truncate">{criteriaLabel(w)}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {w.hits > 0 && (
            <button
              onClick={() => setShowHits((s) => !s)}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 transition-colors"
            >
              <Zap className="h-2.5 w-2.5" />
              {w.hits}
            </button>
          )}
          <button
            onClick={() => setExpanded((s) => !s)}
            className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Settings"
          >
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Hit history (when expanded via hit count badge) */}
      {showHits && (
        <div className="px-3 pb-3 pt-0 border-t border-border/50 bg-muted/20">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground py-2">Recent hits</p>
          <HitsPanel id={w.id} />
        </div>
      )}

      {/* Settings panel */}
      {expanded && (
        <div className="px-3 pb-3 pt-0 border-t border-border/50 space-y-3">
          <Separator className="mt-0" />

          <div>
            <p className="text-[10px] text-muted-foreground mb-1.5">Signal threshold: <strong>{threshold}</strong>{pendingThresh ? " (saving…)" : ""}</p>
            <Slider
              min={0} max={100} step={5}
              value={[threshold]}
              onValueChange={([v]) => setThreshold(v)}
              onValueCommit={([v]) => void handleThresholdCommit(v)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Bell className="h-3 w-3 text-muted-foreground" />
                <p className="text-xs">In-app alerts</p>
              </div>
              <Switch
                checked={w.alerts.inApp}
                onCheckedChange={(v) => void handleAlertToggle("inApp", v)}
                disabled={updateMutation.isPending}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Mail className="h-3 w-3 text-muted-foreground" />
                <p className="text-xs">Email alerts</p>
              </div>
              <Switch
                checked={w.alerts.email}
                onCheckedChange={(v) => void handleAlertToggle("email", v)}
                disabled={updateMutation.isPending}
              />
            </div>
          </div>

          {w.lastHit && (
            <p className="text-[10px] text-muted-foreground">
              Last hit {formatDistanceToNow(new Date(w.lastHit), { addSuffix: true })}
            </p>
          )}

          <div className="flex justify-end">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive h-7 px-2">
                  <Trash2 className="h-3 w-3" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete watchlist</AlertDialogTitle>
                  <AlertDialogDescription>
                    "{w.name}" and all its hit history will be permanently deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMutation.mutate(w.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}
    </div>
  );
}

function WatchlistsPage() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const { data: env, isLoading } = useWatchlists();
  const watchlists = env?.data ?? [];

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Watchlists</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Alert on high-signal events in geographies, from applicants, or on specific parcels.
            </p>
          </div>
          <Button size="sm" onClick={() => setWizardOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> New watchlist
          </Button>
        </header>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
          </div>
        ) : watchlists.length > 0 ? (
          <div className="space-y-2">
            {watchlists.map((w) => <WatchlistCard key={w.id} w={w} />)}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span>{watchlists.length} watchlist{watchlists.length !== 1 ? "s" : ""}</span>
              <span className="flex items-center gap-1">
                <Badge variant="outline" className="text-[10px]">
                  {watchlists.reduce((n, w) => n + w.hits, 0)} total hits
                </Badge>
              </span>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-card/50 p-10 text-center space-y-3">
            <p className="text-sm font-medium">No watchlists yet</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Draw a polygon on the map, track a developer, watch specific APNs, or build a saved search.
              Alerts fire via email and hit history when the hourly cron finds a match.
            </p>
            <Button size="sm" onClick={() => setWizardOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Create first watchlist
            </Button>
          </div>
        )}
      </div>

      <WatchlistWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </AppShell>
  );
}
