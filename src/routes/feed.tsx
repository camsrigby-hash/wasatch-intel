import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SignalBar } from "@/components/SignalBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { JURISDICTIONS } from "@/lib/types";
import { AGENDA_TYPES } from "@/lib/mock-data";
import { useDigest, useSignalWire, useDevelopers } from "@/lib/api-client";
import type { SignalWireItem } from "@/lib/types";
import { format, formatDistanceToNow } from "date-fns";
import { ListTree, Newspaper, MessageSquareWarning, FileSignature, MapPin } from "lucide-react";

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

function FeedPage() {
  const [minSignal, setMinSignal] = useState(0);
  const [filterJurisdiction, setFilterJurisdiction] = useState("All");

  const { data: digestEnv, isLoading: digestLoading } = useDigest();
  const { data: wireEnv,   isLoading: wireLoading }   = useSignalWire();
  const { data: devEnv }                               = useDevelopers();

  const digest     = digestEnv?.data;
  const wireItems  = wireEnv?.data ?? [];
  const developers = devEnv?.data ?? [];

  const filteredWire: SignalWireItem[] = wireItems.filter((w) => {
    if (w.signal < minSignal) return false;
    if (filterJurisdiction !== "All" && w.jurisdiction !== filterJurisdiction) return false;
    return true;
  });

  const topApplicants = developers.slice(0, 6);

  return (
    <AppShell>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6 max-w-7xl mx-auto p-6">
        <div className="space-y-6 min-w-0">
          {/* Weekly Digest */}
          <header>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Weekly Digest</div>
            <h1 className="text-xl font-semibold mt-0.5">
              What moved, what matters · Week of {format(new Date(), "MMM d")}
            </h1>
            {digest?.itemCount != null && digest.totalCostUsd != null && (
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {digest.itemCount} items · ${digest.totalCostUsd.toFixed(3)} Opus cost
              </div>
            )}
          </header>

          {digestLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          ) : !digest?.markdown ? (
            <div className="rounded-lg border border-border bg-card p-4 text-xs text-muted-foreground">
              No digest available yet. The weekly pipeline hasn't run, or the digest file isn't reachable.
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card p-5 overflow-auto max-h-[28rem]">
              <MarkdownBlock text={digest.markdown} />
            </div>
          )}

          {/* Signal Wire */}
          <div>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-sm font-semibold">Signal Wire</h2>
              <span className="text-[11px] text-muted-foreground font-mono">
                {wireLoading ? "…" : `${filteredWire.length} items · last 30 days`}
              </span>
            </div>

            {wireLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
              </div>
            ) : filteredWire.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card/50 p-6 text-center text-xs text-muted-foreground">
                No signals in the last 30 days
                {filterJurisdiction !== "All" ? ` for ${filterJurisdiction}` : ""}.
              </div>
            ) : (
              <div className="space-y-2">
                {filteredWire.slice(0, 30).map((w) => <WireCard key={w.id} item={w} />)}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-3">
            <h3 className="text-xs font-semibold mb-3">Filters</h3>
            <div className="space-y-3">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
                  Signal threshold: ≥{minSignal}
                </div>
                <Slider
                  defaultValue={[0]}
                  max={100}
                  step={5}
                  onValueChange={([v]) => setMinSignal(v)}
                />
                <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-1">
                  <span>0</span><span>50</span><span>100</span>
                </div>
              </div>
              <FilterGroup
                title="Jurisdiction"
                items={["All", ...JURISDICTIONS.slice(0, 6)]}
                active={filterJurisdiction}
                onSelect={setFilterJurisdiction}
              />
              <FilterGroup title="Item type" items={[...AGENDA_TYPES].slice(0, 6)} />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-3">
            <h3 className="text-xs font-semibold mb-2">Top applicants (30d)</h3>
            {topApplicants.length === 0 ? (
              <p className="text-xs text-muted-foreground">No developer data yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {topApplicants.map((d) => (
                  <li key={d.id} className="flex items-center justify-between text-xs">
                    <span className="truncate text-muted-foreground">{d.name}</span>
                    <span className="font-mono ml-2">{d.recentActivity}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

function WireCard({ item }: { item: SignalWireItem }) {
  const SourceIcon =
    item.source === "News"   ? Newspaper :
    item.source === "Rumor"  ? MessageSquareWarning :
    item.source === "Filing" ? FileSignature :
    ListTree;

  return (
    <article className="group rounded-lg border border-border bg-card p-3.5 hover:border-primary/30 transition-colors">
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-1.5">
        <SourceIcon className="h-3 w-3" />
        <span className="uppercase tracking-wide font-medium">{item.source}</span>
        <span>·</span>
        <Badge variant="outline" className="text-[10px] h-4 px-1.5">{item.jurisdiction}</Badge>
        <span>·</span>
        <span className="font-mono">{formatDistanceToNow(new Date(item.date), { addSuffix: true })}</span>
      </div>
      <h3 className="text-sm font-medium leading-snug">{item.headline}</h3>
      {item.excerpt && (
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.excerpt}</p>
      )}
      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border">
        <SignalBar value={item.signal} />
        <Button variant="ghost" size="sm" className="h-7 text-xs">
          <MapPin className="h-3 w-3" /> View on map
        </Button>
      </div>
    </article>
  );
}

function FilterGroup({
  title, items, active, onSelect,
}: {
  title: string;
  items: readonly string[];
  active?: string;
  onSelect?: (v: string) => void;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">{title}</div>
      <div className="flex flex-wrap gap-1">
        {items.map((i) => (
          <button
            key={i}
            onClick={() => onSelect?.(i)}
            className={`text-[11px] rounded-full border px-2 py-0.5 transition-colors ${
              active === i
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:bg-muted"
            }`}
          >
            {i}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Simple markdown renderer (no new dep — our digest format is predictable) ─

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
      : part,
  );
}

function MarkdownBlock({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-0.5 text-sm">
      {lines.map((line, i) => {
        if (line.startsWith("# "))   return <h2 key={i} className="text-base font-bold mt-4 mb-1 first:mt-0">{renderInline(line.slice(2))}</h2>;
        if (line.startsWith("## "))  return <h3 key={i} className="text-sm font-semibold mt-3 mb-0.5">{renderInline(line.slice(3))}</h3>;
        if (line.startsWith("### ")) return <h4 key={i} className="text-xs font-semibold mt-2">{renderInline(line.slice(4))}</h4>;
        if (line === "---")          return <hr key={i} className="border-border my-3" />;
        if (line.trim() === "")      return <div key={i} className="h-1.5" />;
        if (line.startsWith("- "))   return <li key={i} className="text-xs text-muted-foreground leading-relaxed ml-3 list-disc">{renderInline(line.slice(2))}</li>;
        if (/^\d+\.\s/.test(line))   return <li key={i} className="text-xs text-muted-foreground leading-relaxed ml-3 list-decimal">{renderInline(line.replace(/^\d+\.\s/, ""))}</li>;
        return <p key={i} className="text-xs text-muted-foreground leading-relaxed">{renderInline(line)}</p>;
      })}
    </div>
  );
}
