import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { SignalBar } from "@/components/SignalBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { AGENDAS, SIGNAL_WIRE, JURISDICTIONS, AGENDA_TYPES, signalLabel } from "@/lib/mock-data";
import { format, formatDistanceToNow } from "date-fns";
import { TrendingUp, FileCheck2, Building2, Bookmark, MapPin, Newspaper, MessageSquareWarning, FileSignature, ListTree } from "lucide-react";

export const Route = createFileRoute("/feed")({
  head: () => ({
    meta: [
      { title: "Feed — Wasatch Intel" },
      { name: "description", content: "Weekly digest and Signal Wire of agenda activity, news, and rumor for Wasatch Front developers." },
      { property: "og:title", content: "Feed — Wasatch Intel" },
      { property: "og:description", content: "Weekly digest and signal wire of development activity." },
    ],
  }),
  component: FeedPage,
});

const DIGEST = [
  { icon: TrendingUp, title: "12 new high-signal filings this week", body: "Mostly mixed-use rezones along the I-15 corridor. Eagle Mountain leads with 4 filings >100 units.", tone: "signal-high" },
  { icon: FileCheck2, title: "3 rezones approved", body: "Lehi approved a 248-unit townhome PUD; Saratoga Springs approved 2 GP amendments.", tone: "opportunity" },
  { icon: Building2, title: "Ivory Homes is moving", body: "Ivory filed in 4 jurisdictions in the last 14 days — Saratoga Springs, Eagle Mountain, Herriman, Lehi.", tone: "heat" },
  { icon: Bookmark, title: "5 watchlist hits", body: "Eagle Mountain growth corridor and Tooele land assembly watchlists hit signal threshold.", tone: "signal-critical" },
];

function FeedPage() {
  return (
    <AppShell>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6 max-w-7xl mx-auto p-6">
        <div className="space-y-6 min-w-0">
          <header>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Weekly Digest</div>
            <h1 className="text-xl font-semibold mt-0.5">What moved, what matters · Week of {format(new Date(), "MMM d")}</h1>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DIGEST.map((d) => {
              const Icon = d.icon;
              return (
                <div key={d.title} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-start gap-3">
                    <div className={`h-8 w-8 rounded-md flex items-center justify-center bg-[var(--color-${d.tone})]/15`}>
                      <Icon className={`h-4 w-4 text-[var(--color-${d.tone})]`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium leading-tight">{d.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{d.body}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-sm font-semibold">Signal Wire</h2>
              <span className="text-[11px] text-muted-foreground font-mono">{SIGNAL_WIRE.length} items · last 30 days</span>
            </div>
            <div className="space-y-2">
              {SIGNAL_WIRE.slice(0, 30).map((w) => {
                const SourceIcon = w.source === "News" ? Newspaper : w.source === "Rumor" ? MessageSquareWarning : w.source === "Filing" ? FileSignature : ListTree;
                return (
                  <article key={w.id} className="group rounded-lg border border-border bg-card p-3.5 hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-1.5">
                      <SourceIcon className="h-3 w-3" />
                      <span className="uppercase tracking-wide font-medium">{w.source}</span>
                      <span>·</span>
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5">{w.jurisdiction}</Badge>
                      <span>·</span>
                      <span className="font-mono">{formatDistanceToNow(new Date(w.date), { addSuffix: true })}</span>
                      <span className="ml-auto font-mono">~{w.proximity} mi to watchlist</span>
                    </div>
                    <h3 className="text-sm font-medium leading-snug">{w.headline}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{w.excerpt}</p>
                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border">
                      <SignalBar value={w.signal} />
                      <Button variant="ghost" size="sm" className="h-7 text-xs">
                        <MapPin className="h-3 w-3" /> View on map
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-3">
            <h3 className="text-xs font-semibold mb-3">Filters</h3>
            <div className="space-y-3">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Signal threshold</div>
                <Slider defaultValue={[40]} max={100} step={5} />
                <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-1">
                  <span>0</span><span>40</span><span>100</span>
                </div>
              </div>
              <FilterGroup title="Jurisdiction" items={JURISDICTIONS.slice(0,6)} />
              <FilterGroup title="Item type" items={[...AGENDA_TYPES].slice(0,6)} />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-3">
            <h3 className="text-xs font-semibold mb-2">Top applicants this week</h3>
            <ul className="space-y-1.5">
              {Array.from(new Set(AGENDAS.slice(0,40).map((a) => a.applicant))).slice(0,6).map((a, i) => (
                <li key={a} className="flex items-center justify-between text-xs">
                  <span className="truncate">{a}</span>
                  <span className="font-mono text-muted-foreground">{8 - i}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

function FilterGroup({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">{title}</div>
      <div className="flex flex-wrap gap-1">
        {items.map((i) => (
          <button key={i} className="text-[11px] rounded-full border border-border px-2 py-0.5 hover:bg-muted transition-colors">{i}</button>
        ))}
      </div>
    </div>
  );
}

// silence unused import warning if signalLabel isn't directly referenced elsewhere
void signalLabel;
