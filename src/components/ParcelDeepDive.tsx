import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SignalBar } from "./SignalBar";
import { AGENDAS, DEVELOPERS, SITE_PLAN_SAMPLES, type Parcel } from "@/lib/mock-data";
import { format } from "date-fns";
import { MapPin, Zap, ShieldAlert, TrendingUp, Layers } from "lucide-react";

export function ParcelDeepDive({ parcel, open, onClose }: { parcel: Parcel | null; open: boolean; onClose: () => void }) {
  if (!parcel) return null;
  const owner = DEVELOPERS.find((d) => d.id === parcel.ownerId);
  const related = AGENDAS.filter((a) => a.parcelId === parcel.id).slice(0, 8);
  const sitePlan = SITE_PLAN_SAMPLES.find((s) => s.parcelId === parcel.id) ?? SITE_PLAN_SAMPLES[0];

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col gap-0">
        <SheetHeader className="p-4 border-b border-border space-y-1">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline" className="font-mono text-[10px]">{parcel.apn}</Badge>
            {parcel.hasGap && <Badge className="bg-[var(--color-gap)] text-white border-0">Zoning gap</Badge>}
          </div>
          <SheetTitle className="text-base text-left">{parcel.jurisdiction} · {parcel.acres} acres</SheetTitle>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="font-mono">{parcel.centroid[1].toFixed(4)}, {parcel.centroid[0].toFixed(4)}</span>
          </div>
        </SheetHeader>

        <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
          <TabsList className="rounded-none w-full justify-start border-b border-border bg-background h-9 px-2 gap-2">
            {["overview","agendas","plans","comps","notes"].map((v) => (
              <TabsTrigger key={v} value={v} className="text-xs h-7 capitalize data-[state=active]:bg-muted">
                {v === "plans" ? "Site Plans" : v}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex-1 overflow-auto">
            <TabsContent value="overview" className="p-4 space-y-4 mt-0">
              <Section title="Zoning & General Plan">
                <KV k="Current zoning" v={parcel.zoning} mono />
                <KV k="General plan" v={parcel.generalPlan} mono />
                <KV k="Gap detected" v={parcel.hasGap ? "Yes — zoning lags GP" : "No"} />
              </Section>

              <Section title="Ownership">
                <KV k="Owner" v={parcel.ownerName} />
                <KV k="Type" v={owner?.type ?? "—"} />
                <KV k="Tenure" v={`${parcel.ownershipYears} years`} />
              </Section>

              <Section title="Scores">
                <ScoreRow icon={Zap} label="Utilities access" value={parcel.utilitiesScore} />
                <ScoreRow icon={Layers} label="Adjacency quality" value={parcel.adjacencyScore} />
                <ScoreRow icon={ShieldAlert} label="Political risk" value={parcel.politicalRisk} invert />
              </Section>

              <Section title="Residual land value (modeled)">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-semibold">${parcel.residualLandValue.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground">/ ${(parcel.residualLandValue/parcel.acres).toLocaleString(undefined,{maximumFractionDigits:0})} per acre</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> Mocked output. Wire residual model to backend.
                </p>
              </Section>
            </TabsContent>

            <TabsContent value="agendas" className="p-4 space-y-2 mt-0">
              {related.length === 0 && <p className="text-xs text-muted-foreground">No agenda items linked yet.</p>}
              {related.map((a) => (
                <div key={a.id} className="rounded-md border border-border p-2.5 hover:bg-muted/50 cursor-pointer">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground">{format(new Date(a.date), "MMM d, yyyy")}</span>
                    <Badge variant="outline" className="text-[10px]">{a.status}</Badge>
                  </div>
                  <div className="text-xs font-medium mt-1">{a.title}</div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[11px] text-muted-foreground">{a.applicant}</span>
                    <SignalBar value={a.signal} />
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="plans" className="p-4 mt-0">
              <div className="rounded-md border border-border overflow-hidden">
                <div className="aspect-[4/3] bg-gradient-to-br from-muted via-accent to-muted relative flex items-center justify-center">
                  <svg viewBox="0 0 200 150" className="w-full h-full opacity-90">
                    <rect x="20" y="20" width="160" height="110" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-primary" />
                    {Array.from({length:12}).map((_,i)=>(
                      <rect key={i} x={28+(i%6)*26} y={i<6?30:90} width="20" height="30" fill="currentColor" className="text-primary/30" stroke="currentColor" strokeWidth="0.3" />
                    ))}
                    <line x1="20" y1="75" x2="180" y2="75" stroke="currentColor" strokeWidth="0.4" strokeDasharray="2,2" className="text-muted-foreground" />
                  </svg>
                  <span className="absolute bottom-2 right-2 font-mono text-[10px] text-muted-foreground bg-background/80 px-1.5 py-0.5 rounded">site plan preview</span>
                </div>
                <div className="p-3 border-t border-border">
                  <div className="text-xs font-medium">{sitePlan.name}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{sitePlan.units} units · {sitePlan.density} du/ac</div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="comps" className="p-4 mt-0 space-y-2">
              {[1,2,3].map((i) => (
                <div key={i} className="rounded-md border border-border p-3 flex justify-between items-center">
                  <div>
                    <div className="text-xs font-medium">Comp #{i}</div>
                    <div className="text-[11px] text-muted-foreground">{(parcel.acres-i).toFixed(1)} ac · sold {2024-i}</div>
                  </div>
                  <span className="font-mono text-sm">${(parcel.residualLandValue * (0.85 + i*0.07)/1000).toFixed(0)}k</span>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="notes" className="p-4 mt-0">
              <textarea className="w-full h-40 rounded-md border border-border bg-background p-3 text-xs resize-none" placeholder="Add a note about this parcel…" />
              <Button size="sm" className="mt-2">Save note</Button>
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-1.5">{title}</h3>
      <div className="space-y-1">{children}</div>
    </section>
  );
}
function KV({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center text-xs py-0.5">
      <span className="text-muted-foreground">{k}</span>
      <span className={mono ? "font-mono" : ""}>{v}</span>
    </div>
  );
}
function ScoreRow({ icon: Icon, label, value, invert }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; invert?: boolean }) {
  const display = invert ? value : value;
  const color = (invert ? value > 60 : value < 40) ? "bg-[var(--color-risk)]"
    : (invert ? value > 30 : value < 70) ? "bg-[var(--color-signal-med)]"
    : "bg-[var(--color-opportunity)]";
  return (
    <div className="flex items-center gap-2 text-xs py-0.5">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-muted-foreground flex-1">{label}</span>
      <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${display}%` }} />
      </div>
      <span className="font-mono w-7 text-right">{display}</span>
    </div>
  );
}
