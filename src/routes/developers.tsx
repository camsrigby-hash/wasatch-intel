import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useDevelopers, useAgendas } from "@/lib/api-client";
import type { DeveloperSummary } from "@/lib/types";
import { SIGNAL_TYPE_LABELS, isSignageItem } from "@/lib/types";
import { format, formatDistanceToNow } from "date-fns";
import { Building2, MapPin, Signpost, TrendingUp } from "lucide-react";

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
  const [includeSignage, setIncludeSignage] = useState(false);

  const { data: devEnv, isLoading: devLoading } = useDevelopers({ includeSignage });
  const { data: agendaEnv } = useAgendas();

  const developers = devEnv?.data ?? [];
  const agendas    = agendaEnv?.data ?? [];

  const [selected, setSelected] = useState<DeveloperSummary | null>(null);

  useEffect(() => {
    if (!selected && developers.length > 0) setSelected(developers[0]);
  }, [developers, selected]);

  const allForSelected = selected
    ? agendas.filter((a) => a.developer === selected.name)
    : [];
  const developmentForSelected = allForSelected.filter((a) => !isSignageItem(a)).slice(0, 8);
  const signageForSelected     = allForSelected.filter((a) =>  isSignageItem(a)).slice(0, 8);

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        {/* Leaderboard */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <h1 className="text-xl font-semibold">Developers</h1>
            <span className="text-[11px] text-muted-foreground">
              {devLoading ? "—" : `${developers.length} tracked`}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2">
            <Label htmlFor="include-signage" className="text-xs text-muted-foreground cursor-pointer">
              Include signage filings
            </Label>
            <Switch
              id="include-signage"
              checked={includeSignage}
              onCheckedChange={setIncludeSignage}
            />
          </div>

          {devLoading ? (
            <div className="space-y-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-md" />
              ))}
            </div>
          ) : developers.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-4 text-xs text-muted-foreground">
              No developer activity found. Agenda CSV may not yet have enriched developer fields.
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
              {developers.map((d, i) => {
                const active = d.id === selected?.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => setSelected(d)}
                    className={`w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors flex items-center gap-3 ${active ? "bg-accent/40" : ""}`}
                  >
                    <span className="font-mono text-[10px] text-muted-foreground w-5 text-right">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{d.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {d.jurisdictions.length} jurisdiction{d.jurisdictions.length !== 1 ? "s" : ""} · {d.totalFilings} total filings
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-xs">{d.recentActivity}</div>
                      <div className="text-[9px] uppercase tracking-wide text-muted-foreground">30d</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="space-y-4">
          {!selected ? (
            <div className="rounded-lg border border-border bg-card p-8 text-center text-xs text-muted-foreground">
              {devLoading ? <Skeleton className="h-32 w-full" /> : "Select a developer to view their profile."}
            </div>
          ) : (
            <>
              <header className="rounded-lg border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold leading-tight">{selected.name}</h2>
                      {selected.lastSeen && (
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                          Last seen {formatDistanceToNow(new Date(selected.lastSeen), { addSuffix: true })}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant="outline">+ Add to watchlist</Button>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-border">
                  <Stat label="Total filings" value={selected.totalFilings.toString()} />
                  <Stat label="Jurisdictions" value={selected.jurisdictions.length.toString()} />
                  <Stat label="Last 30 days" value={selected.recentActivity.toString()} accent />
                </div>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-border bg-card p-4">
                  <h3 className="text-xs font-semibold mb-3">Active jurisdictions</h3>
                  {selected.jurisdictions.length === 0 ? (
                    <span className="text-xs text-muted-foreground">No jurisdictions recorded</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {selected.jurisdictions.map((j) => (
                        <Badge key={j} variant="secondary" className="text-[11px]">{j}</Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-border bg-card p-4">
                  <h3 className="text-xs font-semibold mb-3 flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5" /> Signal type breakdown
                  </h3>
                  {Object.keys(selected.signalTypes).length === 0 ? (
                    <span className="text-xs text-muted-foreground">No signal data yet</span>
                  ) : (
                    <div className="space-y-1.5">
                      {(Object.entries(selected.signalTypes) as [string, number][])
                        .sort(([, a], [, b]) => b - a)
                        .map(([type, count]) => (
                          <div key={type} className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{SIGNAL_TYPE_LABELS[type as keyof typeof SIGNAL_TYPE_LABELS] ?? type}</span>
                            <span className="font-mono">{count}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <h3 className="text-xs font-semibold">Recent development activity</h3>
                </div>
                <div className="divide-y divide-border">
                  {developmentForSelected.length === 0 ? (
                    <div className="p-4 text-xs text-muted-foreground">
                      No recent development filings matched for this developer.
                    </div>
                  ) : (
                    developmentForSelected.map((a) => (
                      <div key={a.id} className="px-4 py-2.5 text-xs flex items-center gap-3">
                        <span className="font-mono text-[10px] text-muted-foreground w-20">
                          {format(new Date(a.date), "MMM d, yyyy")}
                        </span>
                        {a.signalType && (
                          <Badge variant="outline" className="text-[10px]">
                            {SIGNAL_TYPE_LABELS[a.signalType]}
                          </Badge>
                        )}
                        <span className="flex-1 truncate">{a.title}</span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <MapPin className="h-2.5 w-2.5" />{a.jurisdiction}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {signageForSelected.length > 0 && (
                <div className="rounded-lg border border-border bg-card overflow-hidden">
                  <div className="px-4 py-3 border-b border-border flex items-center gap-1.5">
                    <Signpost className="h-3.5 w-3.5 text-muted-foreground" />
                    <h3 className="text-xs font-semibold">Signage permits</h3>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {signageForSelected.length} shown
                    </span>
                  </div>
                  <div className="divide-y divide-border">
                    {signageForSelected.map((a) => (
                      <div key={a.id} className="px-4 py-2.5 text-xs flex items-center gap-3">
                        <span className="font-mono text-[10px] text-muted-foreground w-20">
                          {format(new Date(a.date), "MMM d, yyyy")}
                        </span>
                        <span className="flex-1 truncate">{a.title}</span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <MapPin className="h-2.5 w-2.5" />{a.jurisdiction}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
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
