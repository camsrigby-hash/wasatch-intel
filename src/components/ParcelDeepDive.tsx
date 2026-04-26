import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SignalBar } from "./SignalBar";
import { useParcelDetail, useParcelAdjacency, useParcelAnalyze } from "@/lib/api-client";
import { NewDealDialog } from "@/routes/pipeline";
import type { ParcelDetail, ParcelNeighbor, AnalysisResult, OpportunityStrategy } from "@/lib/types";
import { signalLabel } from "@/lib/types";
import { format } from "date-fns";
import { MapPin, Navigation, AlertTriangle, TrendingUp, BarChart3, Loader2, PlusSquare } from "lucide-react";

export function ParcelDeepDive({
  apn,
  open,
  onClose,
}: {
  apn: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const { data: detailEnvelope, isLoading: loadingDetail } = useParcelDetail(apn);
  const { data: adjEnvelope,    isLoading: loadingAdj }    = useParcelAdjacency(apn);
  const analyzeMutation = useParcelAnalyze(apn);

  const detail    = detailEnvelope?.data ?? null;
  const neighbors = adjEnvelope?.data ?? [];

  const [notes, setNotes] = useState<string>(() => {
    if (typeof window === "undefined" || !apn) return "";
    return localStorage.getItem(`parcel-notes-${apn}`) ?? "";
  });
  const [notesSaved,   setNotesSaved]   = useState(false);
  const [newDealOpen,  setNewDealOpen]  = useState(false);

  function saveNotes() {
    if (!apn) return;
    localStorage.setItem(`parcel-notes-${apn}`, notes);
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 1500);
  }

  if (!open || !apn) return null;

  return (
    <>
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col gap-0">
        <SheetHeader className="p-4 border-b border-border space-y-1">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline" className="font-mono text-[10px]">{apn}</Badge>
            <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 ml-auto" onClick={() => setNewDealOpen(true)}>
              <PlusSquare className="h-3 w-3 mr-1" /> Track deal
            </Button>
            {detail && !detail.developable && (
              <Badge variant="outline" className="text-[10px] text-muted-foreground">ROW / Public land</Badge>
            )}
            {detail?.gapScore != null && detail.gapScore >= 5 && (
              <Badge className="bg-[var(--color-gap)] text-white border-0 text-[10px]">
                Gap {detail.gapScore}/7
              </Badge>
            )}
          </div>
          {loadingDetail ? (
            <Skeleton className="h-5 w-48" />
          ) : (
            <SheetTitle className="text-base text-left">
              {detail?.jurisdiction ?? "Tooele Valley"}
              {detail?.acres != null && ` · ${detail.acres.toFixed(1)} ac`}
            </SheetTitle>
          )}
          {detail?.address && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>{detail.address}</span>
            </div>
          )}
        </SheetHeader>

        <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
          <TabsList className="rounded-none w-full justify-start border-b border-border bg-background h-9 px-2 gap-1">
            {["overview", "agendas", "adjacency", "comps", "notes"].map((v) => (
              <TabsTrigger key={v} value={v} className="text-xs h-7 capitalize data-[state=active]:bg-muted">
                {v === "agendas" ? `Agendas${detail?.agendaItems.length ? ` (${detail.agendaItems.length})` : ""}` : v}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex-1 overflow-auto">

            {/* ── Overview ── */}
            <TabsContent value="overview" className="p-4 space-y-4 mt-0">
              {loadingDetail ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : detail ? (
                <>
                  <Section title="Zoning & General Plan">
                    <KV k="Zoning"        v={detail.currentZoneLabel ?? detail.zoning ?? "—"} mono={!detail.currentZoneLabel} />
                    <KV k="Zone code"     v={detail.zoning ?? "—"} mono />
                    <KV k="Jurisdiction"  v={detail.zoningJurisdiction ?? detail.jurisdiction ?? "—"} />
                    {detail.gapScore != null ? (
                      <div className="flex justify-between items-center text-xs py-0.5">
                        <span className="text-muted-foreground">General Plan</span>
                        <span>
                          <span className="font-mono">{detail.generalPlan}</span>
                          {detail.gpDesignationLabel && (
                            <span className="text-muted-foreground ml-1">— {detail.gpDesignationLabel}</span>
                          )}
                        </span>
                      </div>
                    ) : (
                      <KV k="General Plan" v="No General Plan coverage" />
                    )}
                    {detail.gapScore != null && (
                      <div className="flex justify-between items-center text-xs py-0.5">
                        <span className="text-muted-foreground">Gap score</span>
                        <GapBadge score={detail.gapScore} />
                      </div>
                    )}
                    {detail.gapScore == null && (
                      <div className="text-[10px] text-muted-foreground/70 pt-0.5">
                        Parcel centroid falls outside the 2022 Tooele County GP layer.
                      </div>
                    )}
                  </Section>

                  <Section title="Ownership">
                    <KV k="Owner" v={detail.owner ?? "—"} />
                    <KV k="Address" v={detail.address ?? "—"} />
                  </Section>

                  {(detail.nearestArterialName || detail.isCorner != null) && (
                    <Section title="Road access">
                      {detail.nearestArterialName && (
                        <div className="flex items-start gap-1.5 text-xs py-0.5">
                          <Navigation className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                          <span>
                            {detail.nearestArterialName}
                            {detail.nearestArterialAadt != null && (
                              <span className="text-muted-foreground"> · {detail.nearestArterialAadt.toLocaleString()} AADT</span>
                            )}
                            {detail.nearestArterialDistanceMi != null && (
                              <span className="text-muted-foreground"> · {(detail.nearestArterialDistanceMi * 5280).toFixed(0)} ft</span>
                            )}
                            {detail.nearestRoadClass && (
                              <span className="text-muted-foreground"> · {detail.nearestRoadClass}</span>
                            )}
                          </span>
                        </div>
                      )}
                      {detail.isCorner && detail.cornerRoads && detail.cornerRoads.length >= 2 && (
                        <div className="flex items-center gap-1.5 text-xs py-0.5 text-muted-foreground">
                          <span>Corner: {detail.cornerRoads.join(" & ")}</span>
                        </div>
                      )}
                      {!detail.nearestArterialName && (
                        <p className="text-[11px] text-muted-foreground">
                          Road data not yet available — run enrich_roads.py.
                        </p>
                      )}
                    </Section>
                  )}

                  {/* Opportunity analysis */}
                  <Section title="Opportunity analysis">
                    {analyzeMutation.data ? (
                      <AnalysisView result={analyzeMutation.data.data} />
                    ) : (
                      <div className="space-y-2">
                        <p className="text-[11px] text-muted-foreground">
                          Simplified scoring based on this parcel's GP and zoning data.
                          Full 1-mile buffer analysis requires running analyze_opportunity.py.
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          disabled={analyzeMutation.isPending}
                          onClick={() => analyzeMutation.mutate()}
                        >
                          {analyzeMutation.isPending ? (
                            <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" />Analyzing…</>
                          ) : (
                            <><BarChart3 className="h-3 w-3 mr-1.5" />Run analysis</>
                          )}
                        </Button>
                        {analyzeMutation.isError && (
                          <p className="text-[11px] text-destructive">Analysis failed — try again.</p>
                        )}
                      </div>
                    )}
                  </Section>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Parcel {apn} not found in gap layer.</p>
              )}
            </TabsContent>

            {/* ── Agendas ── */}
            <TabsContent value="agendas" className="p-4 space-y-2 mt-0">
              {loadingDetail ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
              ) : !detail?.agendaItems.length ? (
                <p className="text-xs text-muted-foreground">
                  No agenda items linked to this parcel. Items are linked by APN text match or proximity (≤ 500m).
                </p>
              ) : (
                detail.agendaItems.map((a) => (
                  <div key={a.id} className="rounded-md border border-border p-2.5 hover:bg-muted/50">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {a.date && !isNaN(Date.parse(a.date)) ? format(new Date(a.date), "MMM d, yyyy") : a.date}
                      </span>
                      {a.agendaStatus && <Badge variant="outline" className="text-[10px]">{a.agendaStatus}</Badge>}
                    </div>
                    <div className="text-xs font-medium mt-1 line-clamp-2">{a.title}</div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[11px] text-muted-foreground">{a.developer ?? a.jurisdiction}</span>
                      {a.growthScore != null && <SignalBar value={a.growthScore} />}
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            {/* ── Adjacency ── */}
            <TabsContent value="adjacency" className="p-4 space-y-2 mt-0">
              {loadingAdj ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : !neighbors.length ? (
                <p className="text-xs text-muted-foreground">No adjacent parcels found within 500m in the gap layer.</p>
              ) : (
                <>
                  <p className="text-[10px] text-muted-foreground mb-2">{neighbors.length} parcels within 500m</p>
                  {neighbors.map((n) => <NeighborRow key={n.apn} neighbor={n} />)}
                </>
              )}
            </TabsContent>

            {/* ── Comps ── */}
            <TabsContent value="comps" className="p-4 mt-0">
              <div className="rounded-md border border-border p-4 text-center">
                <TrendingUp className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs font-medium">No comparable sales available</p>
                <p className="text-[11px] text-muted-foreground mt-1">Phase 6 feature — comparable sales will appear here once the county assessor integration is wired.</p>
              </div>
            </TabsContent>

            {/* ── Notes ── */}
            <TabsContent value="notes" className="p-4 mt-0 space-y-2">
              <textarea
                className="w-full h-40 rounded-md border border-border bg-background p-3 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Add a note about this parcel…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <Button size="sm" className="h-7 text-xs" onClick={saveNotes}>
                {notesSaved ? "Saved ✓" : "Save note"}
              </Button>
              <p className="text-[10px] text-muted-foreground">Saved locally in browser. Use "Track deal" to persist in the pipeline.</p>
            </TabsContent>

          </div>
        </Tabs>
      </SheetContent>
    </Sheet>

    <NewDealDialog
      open={newDealOpen}
      onOpenChange={setNewDealOpen}
      prefill={{
        parcelApn:    apn ?? undefined,
        jurisdiction: detail?.jurisdiction ?? undefined,
        acres:        detail?.acres ?? null,
      }}
    />
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-1.5">{title}</h3>
      <div className="space-y-0.5">{children}</div>
    </section>
  );
}

function KV({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center text-xs py-0.5 gap-4">
      <span className="text-muted-foreground shrink-0">{k}</span>
      <span className={`text-right truncate ${mono ? "font-mono" : ""}`}>{v}</span>
    </div>
  );
}

function GapBadge({ score }: { score: number }) {
  const colors =
    score >= 6 ? "bg-fuchsia-700 text-white"
    : score >= 4 ? "bg-fuchsia-500/80 text-white"
    : score >= 2 ? "bg-fuchsia-400/60 text-foreground"
    : "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${colors}`}>
      {score}/7
    </span>
  );
}

function NeighborRow({ neighbor: n }: { neighbor: ParcelNeighbor }) {
  const distLabel = n.distanceKm < 0.1
    ? `${Math.round(n.distanceKm * 1000)} m`
    : `${(n.distanceKm).toFixed(2)} km`;

  return (
    <div className="rounded-md border border-border p-2.5 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="font-mono text-[10px] text-muted-foreground">{n.apn}</div>
        <div className="text-xs truncate">{n.owner ?? "—"}</div>
        <div className="text-[11px] text-muted-foreground">
          {n.acres != null && `${n.acres.toFixed(1)} ac · `}
          {n.jurisdiction}
          {!n.developable && " · ROW"}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        {n.gapScore != null ? <GapBadge score={n.gapScore} /> : <span className="text-[10px] text-muted-foreground">no GP</span>}
        <span className="text-[10px] text-muted-foreground">{distLabel}</span>
      </div>
    </div>
  );
}

function AnalysisView({ result }: { result: AnalysisResult }) {
  return (
    <div className="space-y-3">
      {result.simplified && (
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/50 rounded px-2 py-1">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          Simplified analysis — based on this parcel's data only, no 1-mile buffer context.
        </div>
      )}
      {result.corridors.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          On corridor: {result.corridors.map(c => `${c.name} (${c.distanceM}m)`).join(", ")}
        </p>
      )}
      <div className="space-y-2">
        {result.strategiesRanked.map((s) => <StrategyRow key={s.strategy} strategy={s} />)}
      </div>
    </div>
  );
}

function StrategyRow({ strategy: s }: { strategy: OpportunityStrategy }) {
  const pct = (s.score / 5) * 100;
  const color = s.score >= 3.5 ? "bg-[var(--color-opportunity)]"
    : s.score >= 2.5 ? "bg-[var(--color-signal-med)]"
    : "bg-muted-foreground/40";
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-2 text-xs">
        <span className="flex-1 text-[11px]">{s.strategy}</span>
        <span className="font-mono text-[11px] w-8 text-right">{s.score}/5</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
