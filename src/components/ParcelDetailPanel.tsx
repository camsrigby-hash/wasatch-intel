import { useState, useEffect, useMemo } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  type IntelParcel, type ScoringProfile, type Stage, type Outcome,
  STAGE_META, ALL_STAGES, VACANCY_META, scoreFor, SCORE_DIMENSIONS,
} from "@/lib/parcel-intel";
import { format } from "date-fns";
import { Copy, ExternalLink, MapPin, RefreshCw, Trash2, X, Phone, Mail, FileDown, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  parcel: IntelParcel | null;
  profile: ScoringProfile;
  open: boolean;
  onClose: () => void;
  onStageChange?: (parcelId: string, stage: Stage | null) => void;
  onOutcomeChange?: (parcelId: string, outcome: Outcome | null) => void;
  onSavePipeline?: (parcelId: string) => void;
  onRemovePipeline?: (parcelId: string) => void;
}

const STAGE_LABEL: Record<Stage, string> = {
  prospect: "Prospect",
  dd: "Due Diligence",
  loi: "LOI",
  closed: "Closed",
};

export function ParcelDetailPanel({
  parcel, profile, open, onClose,
  onStageChange, onOutcomeChange, onSavePipeline, onRemovePipeline,
}: Props) {
  if (!parcel) return null;
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-none p-0 flex flex-col gap-0"
        style={{ width: 720, maxWidth: "100vw" }}
      >
        <PanelInner
          parcel={parcel}
          profile={profile}
          onClose={onClose}
          onStageChange={onStageChange}
          onOutcomeChange={onOutcomeChange}
          onSavePipeline={onSavePipeline}
          onRemovePipeline={onRemovePipeline}
        />
      </SheetContent>
    </Sheet>
  );
}

function PanelInner({
  parcel, profile, onClose, onStageChange, onOutcomeChange, onSavePipeline, onRemovePipeline,
}: Omit<Props, "open">) {
  const [stage, setStage] = useState<Stage | null>(parcel!.pipeline_stage);
  const [outcome, setOutcome] = useState<Outcome | null>(parcel!.outcome);
  const [scoreOpen, setScoreOpen] = useState(false);
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    setStage(parcel!.pipeline_stage);
    setOutcome(parcel!.outcome);
  }, [parcel?.id]);

  const score = useMemo(() => scoreFor(parcel!, profile), [parcel, profile]);
  const vac = VACANCY_META[parcel!.vacancy_status] ?? VACANCY_META.insufficient;
  const spread = parcel!.spread ?? { current_psf: null, gp_psf: null, current_total: null, gp_total: null, spread_amount: null };

  const stageTabsAvailable = stage === "dd" || stage === "loi" || stage === "closed";
  const loiTabAvailable = stage === "loi";

  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 px-5 pt-4 pb-3 border-b border-border bg-background">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold tracking-tight leading-tight truncate">
              {parcel!.address || `Parcel ${parcel!.id}`}
            </h2>
            <div className="text-[11px] text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2">
              <span>{parcel!.jurisdiction}</span>
              <Dot />
              <span className="capitalize">{parcel!.county.replace("_", " ")} County</span>
              <Dot />
              <span className="font-mono">{parcel!.acres} ac</span>
              <Dot />
              <span className="font-mono">{parcel!.apn}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <Select value={stage ?? "none"} onValueChange={(v) => {
              const next = v === "none" ? null : v as Stage;
              setStage(next);
              onStageChange?.(parcel!.id, next);
            }}>
              <SelectTrigger className="h-7 text-xs w-[140px]">
                <SelectValue placeholder="Set stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-xs">— Not in pipeline</SelectItem>
                {ALL_STAGES.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">{STAGE_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!parcel!.in_pipeline && stage === null ? (
              <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => {
                setStage("prospect");
                onSavePipeline?.(parcel!.id);
              }}>
                Save to Pipeline
              </Button>
            ) : parcel!.saved_at ? (
              <span className="text-[10px] text-muted-foreground">
                Saved {format(new Date(parcel!.saved_at), "MMM d")}
              </span>
            ) : null}
            <button onClick={onClose} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-3 text-[11px] text-muted-foreground">
          <a href={`https://maps.google.com/?q=${parcel!.centroid[1]},${parcel!.centroid[0]}`}
             target="_blank" rel="noreferrer"
             className="hover:text-foreground inline-flex items-center gap-1">
            <ExternalLink className="h-3 w-3" /> Google Maps
          </a>
          <a href="#" className="hover:text-foreground inline-flex items-center gap-1">
            <ExternalLink className="h-3 w-3" /> County GIS
          </a>
          <button
            className="hover:text-foreground inline-flex items-center gap-1"
            onClick={() => navigator.clipboard?.writeText(parcel!.apn)}
          >
            <Copy className="h-3 w-3" /> Copy parcel ID
          </button>
          <Badge
            className="ml-auto border-0 text-[10px] text-white"
            style={{ backgroundColor: vac.color }}
          >
            {vac.label}
          </Badge>
        </div>
        {stage === "closed" && (
          <div className="mt-2 flex items-center gap-2 text-[11px]">
            <span className="text-muted-foreground">Outcome:</span>
            <Select value={outcome ?? ""} onValueChange={(v) => {
              const next = v as Outcome;
              setOutcome(next);
              onOutcomeChange?.(parcel!.id, next);
            }}>
              <SelectTrigger className="h-6 text-[11px] w-[120px]"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="won" className="text-xs">Won</SelectItem>
                <SelectItem value="lost" className="text-xs">Lost</SelectItem>
                <SelectItem value="abandoned" className="text-xs">Abandoned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {/* Spread headline */}
        <div className="px-5 pt-4">
          <SpreadCard spread={spread} zoning={parcel!.zoning} gp={parcel!.generalPlan} />
        </div>

        {/* Score panel */}
        <div className="px-5 mt-3">
          <button
            onClick={() => setScoreOpen((s) => !s)}
            className="w-full text-left rounded-md border border-border bg-card p-3 hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Score · {profile.name}</span>
                <span className="font-mono text-3xl font-semibold leading-none mt-1">{score.total}</span>
              </div>
              <div
                className="ml-2 flex items-center justify-center rounded-md text-2xl font-semibold font-mono px-3 py-1.5 text-white"
                style={{ backgroundColor: `var(--grade-${score.grade.toLowerCase()})` }}
              >
                {score.grade}
              </div>
              <span className="ml-auto text-[11px] text-muted-foreground">
                {scoreOpen ? "Hide" : "Show"} breakdown
              </span>
            </div>
            {scoreOpen && (
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
                {SCORE_DIMENSIONS.map((d) => (
                  <div key={d} className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground capitalize w-20 shrink-0">{d}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${score.components[d]}%` }} />
                    </div>
                    <span className="font-mono text-[11px] w-7 text-right">{score.components[d]}</span>
                  </div>
                ))}
              </div>
            )}
          </button>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab} className="mt-4">
          <TabsList className="rounded-none w-full justify-start border-y border-border bg-background h-9 px-4 gap-1 sticky top-0 z-[5]">
            <TabsTrigger value="overview" className="text-xs h-7 data-[state=active]:bg-muted">Overview</TabsTrigger>
            <TabsTrigger value="site" className="text-xs h-7 data-[state=active]:bg-muted">Site Intel</TabsTrigger>
            <TabsTrigger value="adjacent" className="text-xs h-7 data-[state=active]:bg-muted">Adjacent</TabsTrigger>
            <TabsTrigger value="comps" className="text-xs h-7 data-[state=active]:bg-muted">Comps & Valuation</TabsTrigger>
            <TabsTrigger value="owner" className="text-xs h-7 data-[state=active]:bg-muted">Owner & Outreach</TabsTrigger>
            <TabsTrigger value="dd" className="text-xs h-7 data-[state=active]:bg-muted" disabled={!stageTabsAvailable}>
              DD Checklist
            </TabsTrigger>
            <TabsTrigger value="loi" className="text-xs h-7 data-[state=active]:bg-muted" disabled={!loiTabAvailable}>
              LOI Builder
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="px-5 py-4 mt-0 space-y-4">
            <OverviewTab parcel={parcel!} />
          </TabsContent>
          <TabsContent value="site" className="px-5 py-4 mt-0 space-y-4">
            <SiteIntelTab parcel={parcel!} score={score.components} />
          </TabsContent>
          <TabsContent value="adjacent" className="px-5 py-4 mt-0 space-y-3">
            <AdjacentTab parcel={parcel!} />
          </TabsContent>
          <TabsContent value="comps" className="px-5 py-4 mt-0 space-y-4">
            <CompsTab parcel={parcel!} />
          </TabsContent>
          <TabsContent value="owner" className="px-5 py-4 mt-0 space-y-4">
            <OwnerTab parcel={parcel!} />
          </TabsContent>
          <TabsContent value="dd" className="px-5 py-4 mt-0">
            <DDTab parcel={parcel!} />
          </TabsContent>
          <TabsContent value="loi" className="px-5 py-4 mt-0">
            <LOITab parcel={parcel!} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Sticky footer */}
      <footer className="sticky bottom-0 px-5 py-2.5 border-t border-border bg-background flex items-center gap-2 text-[11px] text-muted-foreground">
        <span>Last enriched: {format(new Date(), "MMM d, yyyy h:mma")}</span>
        <Button size="sm" variant="ghost" className="h-7 text-[11px] ml-auto">
          <RefreshCw className="h-3 w-3" /> Refresh data
        </Button>
        {parcel!.in_pipeline && (
          <Button size="sm" variant="ghost" className="h-7 text-[11px] text-muted-foreground hover:text-destructive"
                  onClick={() => onRemovePipeline?.(parcel!.id)}>
            <Trash2 className="h-3 w-3" /> Remove
          </Button>
        )}
      </footer>
    </div>
  );
}

function Dot() { return <span className="text-muted-foreground/40">·</span>; }

function SpreadCard({ spread, zoning, gp }: { spread: IntelParcel["spread"]; zoning: string; gp: string }) {
  const fmt = (n: number | null) => n === null ? "—" : `$${(n / 1_000_000).toFixed(2)}M`;
  const psf = (n: number | null) => n === null ? "—" : `$${n.toFixed(2)}/sqft`;
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Zoning Spread</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">
              The headline value: difference between today's land value at current zoning vs the General Plan
              upzone, before rezone costs and entitlement risk.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Current · {zoning}</div>
          <div className="font-mono text-sm mt-1">{psf(spread.current_psf)}</div>
          <div className="font-mono text-base font-semibold">{fmt(spread.current_total)}</div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">GP · {gp}</div>
          <div className="font-mono text-sm mt-1">{psf(spread.gp_psf)}</div>
          <div className="font-mono text-base font-semibold">{fmt(spread.gp_total)}</div>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-border text-center">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Spread</div>
        <div className="font-mono text-3xl font-bold mt-0.5" style={{ color: "var(--opportunity)" }}>
          {fmt(spread.spread_amount)}
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5">before rezone costs · entitlement risk applies</div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}
function KV({ k, v, mono }: { k: string; v: string | number | React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center text-xs py-0.5 gap-3">
      <span className="text-muted-foreground">{k}</span>
      <span className={cn("text-right", mono && "font-mono")}>{v}</span>
    </div>
  );
}

function OverviewTab({ parcel }: { parcel: IntelParcel }) {
  const vac = VACANCY_META[parcel.vacancy_status] ?? VACANCY_META.insufficient;
  return (
    <>
      <Section title="Vacancy Status">
        <div className="rounded-md border border-border p-3">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: vac.color }} />
            <span className="text-sm font-medium">{vac.label}</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">{vac.description}</p>
        </div>
      </Section>

      <Section title="Owner">
        <KV k="Name" v={parcel.owner.name} />
        <KV k="Type" v={parcel.owner.type} />
        <KV k="Mailing" v={parcel.owner.mailingAddress} />
        <Button size="sm" variant="outline" className="h-7 text-xs mt-2">Pull related properties</Button>
      </Section>

      <Section title="Quick metrics">
        <div className="grid grid-cols-2 gap-x-4">
          <KV k="Parcel size" v={`${parcel.acres} ac`} mono />
          <KV k="Building sqft" v={parcel.bldg_sqft.toLocaleString()} mono />
          <KV k="Current zoning" v={parcel.zoning} mono />
          <KV k="Year built" v={parcel.built_yr ?? "—"} mono />
          <KV k="GP zoning" v={parcel.generalPlan} mono />
          <KV k="Corner lot" v={parcel.is_corner ? "Yes" : "No"} />
          <KV k="Assessed value" v={`$${parcel.residualLandValue.toLocaleString()}`} mono />
          <KV k="AADT (primary)" v={parcel.aadt_primary.toLocaleString()} mono />
        </div>
      </Section>

      <Section title="Recent activity (within 0.5mi)">
        {parcel.adjacentActivity.slice(0, 3).map((a) => (
          <div key={a.id} className="rounded-md border border-border p-2 hover:bg-muted/40 cursor-pointer">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-[10px]">{a.type}</Badge>
              <span className="font-mono text-[10px] text-muted-foreground">{format(new Date(a.date), "MMM d, yyyy")}</span>
            </div>
            <div className="text-xs mt-1">{a.headline}</div>
          </div>
        ))}
      </Section>
    </>
  );
}

function SiteIntelTab({ parcel, score }: { parcel: IntelParcel; score: Record<string, number> }) {
  return (
    <>
      <Section title="Zoning">
        <KV k="Current zoning" v={parcel.zoning} mono />
        <KV k="GP designation" v={parcel.generalPlan} mono />
        <a href="#" className="text-[11px] text-primary hover:underline inline-flex items-center gap-1 mt-1">
          <ExternalLink className="h-3 w-3" /> Open municipal code
        </a>
      </Section>

      <Section title="Traffic">
        <KV k="Primary road AADT" v={parcel.aadt_primary.toLocaleString()} mono />
        <KV k="Traffic signal at corner" v={parcel.has_signal ? "Yes" : "No"} />
        <KV k="Functional class" v={parcel.aadt_primary > 30000 ? "Principal arterial" : parcel.aadt_primary > 10000 ? "Minor arterial" : "Collector"} />
      </Section>

      <Section title="Competition">
        <KV k="Nearby brand sites" v={parcel.competitionCount} mono />
        <KV k="Competition score" v={score.competition} mono />
      </Section>

      <Section title="Commute corridor">
        <div className="rounded-md border border-border p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{parcel.inCommuteCorridor}</span>
            <span className="font-mono text-xs">{score.corridor}</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            {parcel.inCommuteCorridor === "Primary" && "On a primary commute artery connecting major employment nodes."}
            {parcel.inCommuteCorridor === "Secondary" && "Adjacent to a secondary commute connector."}
            {parcel.inCommuteCorridor === "None" && "Not on a major commute corridor."}
          </p>
        </div>
      </Section>
    </>
  );
}

function AdjacentTab({ parcel }: { parcel: IntelParcel }) {
  return (
    <>
      <div className="rounded-md border border-border h-[200px] bg-gradient-to-br from-muted via-accent/30 to-muted relative flex items-center justify-center">
        <svg viewBox="0 0 200 100" className="w-full h-full opacity-80">
          <circle cx="100" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" className="text-primary/40" />
          <rect x="96" y="46" width="8" height="8" fill="currentColor" className="text-primary" />
          {parcel.adjacentActivity.slice(0, 6).map((_, i) => {
            const angle = (i / 6) * Math.PI * 2;
            return <circle key={i} cx={100 + Math.cos(angle) * 28} cy={50 + Math.sin(angle) * 28} r="2" fill="currentColor" className="text-[var(--color-signal-high)]" />;
          })}
        </svg>
        <span className="absolute bottom-2 right-2 font-mono text-[10px] text-muted-foreground bg-background/80 px-1.5 py-0.5 rounded">
          0.5mi radius · {parcel.adjacentActivity.length} items
        </span>
      </div>
      <Section title="Activity (24-month rolling)">
        {parcel.adjacentActivity.map((a) => (
          <div key={a.id} className="rounded-md border border-border p-2.5 hover:bg-muted/40 cursor-pointer">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="outline" className="text-[10px]">{a.type}</Badge>
              <span className="font-mono text-[10px] text-muted-foreground">{format(new Date(a.date), "MMM d, yyyy")}</span>
            </div>
            <div className="text-xs mt-1">{a.headline}</div>
            <div className="text-[10px] text-muted-foreground mt-1 font-mono">{a.distanceMiles}mi · {a.jurisdiction}</div>
          </div>
        ))}
      </Section>
    </>
  );
}

function CompsTab({ parcel }: { parcel: IntelParcel }) {
  const current = parcel.comps.filter((c) => c.zoningCategory === "current");
  const gp = parcel.comps.filter((c) => c.zoningCategory === "gp");
  return (
    <>
      <Section title={`Comps under current zoning · ${parcel.zoning}`}>
        <CompTable rows={current} />
      </Section>
      <Section title={`Comps under GP · ${parcel.generalPlan}`}>
        <CompTable rows={gp} />
      </Section>
      <Section title="County assessed value">
        <KV k="Assessed value" v={`$${parcel.residualLandValue.toLocaleString()}`} mono />
        <KV k="$/sqft (current)" v={`$${(parcel.residualLandValue / (parcel.acres * 43560)).toFixed(2)}`} mono />
      </Section>
    </>
  );
}
function CompTable({ rows }: { rows: IntelParcel["comps"] }) {
  return (
    <div className="rounded-md border border-border overflow-hidden">
      <table className="w-full text-[11px]">
        <thead className="bg-muted/40">
          <tr className="text-left text-muted-foreground">
            <th className="px-2 py-1.5 font-medium">Address</th>
            <th className="px-2 py-1.5 font-medium">Sold</th>
            <th className="px-2 py-1.5 font-medium text-right">$/sqft</th>
            <th className="px-2 py-1.5 font-medium text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id} className="border-t border-border hover:bg-muted/20">
              <td className="px-2 py-1.5 truncate max-w-[220px]">{c.address}</td>
              <td className="px-2 py-1.5 font-mono">{format(new Date(c.saleDate), "MMM yyyy")}</td>
              <td className="px-2 py-1.5 text-right font-mono">${c.pricePerSqft.toFixed(2)}</td>
              <td className="px-2 py-1.5 text-right font-mono">${(c.salePrice / 1000).toFixed(0)}k</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OwnerTab({ parcel }: { parcel: IntelParcel }) {
  return (
    <>
      <Section title="Owner detail">
        <KV k="Name" v={parcel.owner.name} />
        <KV k="Type" v={parcel.owner.type} />
        <KV k="Mailing address" v={parcel.owner.mailingAddress} />
        <KV k="Phone" v={parcel.owner.phone ?? <span className="text-muted-foreground italic">stub</span>} />
        <KV k="Email" v={parcel.owner.email ?? <span className="text-muted-foreground italic">stub</span>} />
      </Section>
      <Section title="Related properties (same owner)">
        <p className="text-[11px] text-muted-foreground italic">No related properties pulled yet — click below to query.</p>
        <Button size="sm" variant="outline" className="h-7 text-xs mt-1">Query county records</Button>
      </Section>
      <Section title="Outreach">
        <div className="rounded-md border border-border p-3 space-y-2">
          <Select defaultValue="cold-landowner">
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cold-landowner" className="text-xs">Cold landowner letter</SelectItem>
              <SelectItem value="broker-intro" className="text-xs">Broker introduction</SelectItem>
              <SelectItem value="planner-inquiry" className="text-xs">Planner inquiry</SelectItem>
            </SelectContent>
          </Select>
          <Textarea
            className="text-xs min-h-32"
            defaultValue={`Dear ${parcel.owner.name.split(" ")[0]},\n\nI'm reaching out about your property at ${parcel.address} (parcel ${parcel.apn}, ${parcel.acres} acres). We're a Utah-based investment group actively acquiring land in ${parcel.jurisdiction} for...\n\n— The Wagstaff team`}
          />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs" disabled>
              <Mail className="h-3 w-3" /> Email (stub)
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" disabled>
              <Phone className="h-3 w-3" /> Call (stub)
            </Button>
          </div>
        </div>
      </Section>
    </>
  );
}

function DDTab({ parcel }: { parcel: IntelParcel }) {
  const [items, setItems] = useState(parcel.ddChecklist);
  const [newItem, setNewItem] = useState("");
  const done = items.filter((i) => i.done).length;
  return (
    <div className="space-y-3">
      <div className="text-[11px] text-muted-foreground">{done} of {items.length} items complete</div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-primary" style={{ width: `${(done / items.length) * 100}%` }} />
      </div>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={item.id} className="rounded-md border border-border p-2.5">
            <div className="flex items-start gap-2">
              <Checkbox
                id={`dd-${item.id}`}
                checked={item.done}
                onCheckedChange={(v) => {
                  setItems((arr) => arr.map((x, i) => i === idx ? { ...x, done: !!v } : x));
                }}
              />
              <label htmlFor={`dd-${item.id}`} className="text-xs flex-1 cursor-pointer">{item.label}</label>
              {item.id === "flood" && (
                <a href="https://msc.fema.gov" target="_blank" rel="noreferrer"
                   className="text-[10px] text-primary hover:underline inline-flex items-center gap-0.5">
                  <ExternalLink className="h-2.5 w-2.5" /> FEMA
                </a>
              )}
            </div>
            <Textarea
              className="mt-2 text-[11px] min-h-16"
              placeholder="Notes (optional)…"
              value={item.notes ?? ""}
              onChange={(e) => setItems((arr) => arr.map((x, i) => i === idx ? { ...x, notes: e.target.value } : x))}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Add custom checklist item…"
          className="h-8 text-xs"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
        />
        <Button size="sm" className="h-8 text-xs" onClick={() => {
          if (!newItem.trim()) return;
          setItems((arr) => [...arr, { id: `custom-${Date.now()}`, label: newItem.trim(), done: false, custom: true }]);
          setNewItem("");
        }}>Add</Button>
      </div>
    </div>
  );
}

function LOITab({ parcel }: { parcel: IntelParcel }) {
  const [draft, setDraft] = useState(parcel.loi ?? null);
  if (!draft) return <p className="text-xs text-muted-foreground">No LOI draft yet. Move stage to LOI to initialise.</p>;

  const update = <K extends keyof typeof draft>(k: K, v: typeof draft[K]) =>
    setDraft({ ...draft, [k]: v });

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Form */}
      <div className="space-y-4">
        <Section title="Buyer block">
          <FormRow label="Buyer entity">
            <Input className="h-7 text-xs" value={draft.buyer_entity} onChange={(e) => update("buyer_entity", e.target.value)} />
          </FormRow>
          <FormRow label="Signatory">
            <Input className="h-7 text-xs" value={draft.buyer_signatory_name} onChange={(e) => update("buyer_signatory_name", e.target.value)} />
          </FormRow>
          <FormRow label="Title">
            <Input className="h-7 text-xs" value={draft.buyer_signatory_title} onChange={(e) => update("buyer_signatory_title", e.target.value)} />
          </FormRow>
          <FormRow label="Title company">
            <Input className="h-7 text-xs" value={draft.title_company} onChange={(e) => update("title_company", e.target.value)} />
          </FormRow>
          <FormRow label="Title agent">
            <Input className="h-7 text-xs" value={draft.title_agent} onChange={(e) => update("title_agent", e.target.value)} />
          </FormRow>
        </Section>

        <Section title="Property (auto-filled)">
          <KV k="Seller" v={parcel.owner.name} />
          <FormRow label="Salutation">
            <Input className="h-7 text-xs" value={draft.seller_salutation_name} onChange={(e) => update("seller_salutation_name", e.target.value)} />
          </FormRow>
          <KV k="Acreage" v={`${parcel.acres} ac`} mono />
          <KV k="Parcel ID" v={parcel.apn} mono />
          <KV k="County" v={parcel.county} />
        </Section>

        <Section title="Deal terms">
          <FormRow label="Total price">
            <Input type="number" className="h-7 text-xs" value={draft.purchase_price_total}
                   onChange={(e) => update("purchase_price_total", +e.target.value)} />
          </FormRow>
          <FormRow label="$/sqft">
            <Input type="number" step="0.01" className="h-7 text-xs" value={draft.purchase_price_psf}
                   onChange={(e) => update("purchase_price_psf", +e.target.value)} />
          </FormRow>
          <FormRow label="Earnest money">
            <Input type="number" className="h-7 text-xs" value={draft.earnest_money}
                   onChange={(e) => update("earnest_money", +e.target.value)} />
          </FormRow>
          <FormRow label="EM days">
            <Input type="number" className="h-7 text-xs" value={draft.earnest_money_days}
                   onChange={(e) => update("earnest_money_days", +e.target.value)} />
          </FormRow>
          <FormRow label="DD period (days)">
            <Input type="number" className="h-7 text-xs" value={draft.due_diligence_days}
                   onChange={(e) => update("due_diligence_days", +e.target.value)} />
          </FormRow>
          <FormRow label="Closing (days)">
            <Input type="number" className="h-7 text-xs" value={draft.closing_days}
                   onChange={(e) => update("closing_days", +e.target.value)} />
          </FormRow>
          <FormRow label="Exclusivity (days)">
            <Input type="number" className="h-7 text-xs" value={draft.exclusivity_days}
                   onChange={(e) => update("exclusivity_days", +e.target.value)} />
          </FormRow>
        </Section>

        <Section title="Optional overrides">
          <div className="flex items-center gap-2 text-xs">
            <Checkbox id="greenbelt" checked={draft.greenbelt_seller_pays} onCheckedChange={(v) => update("greenbelt_seller_pays", !!v)} />
            <label htmlFor="greenbelt">Seller pays greenbelt rollback tax</label>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Checkbox id="rep" checked={draft.buyer_represented} onCheckedChange={(v) => update("buyer_represented", !!v)} />
            <label htmlFor="rep">Buyer is represented (commission applies)</label>
          </div>
        </Section>
      </div>

      {/* Preview */}
      <div className="rounded-md border border-border bg-card p-3 sticky top-3 self-start max-h-[600px] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">LOI Preview</span>
          <Button size="sm" variant="outline" className="h-7 text-xs" disabled>
            <FileDown className="h-3 w-3" /> Download .docx
          </Button>
        </div>
        <div className="text-[10px] leading-relaxed font-mono whitespace-pre-wrap text-foreground">
{`Letter of Intent

Date: ${format(new Date(), "MMMM d, yyyy")}

To:    ${parcel.owner.name}
       ${parcel.owner.mailingAddress}

Re:    Parcel ${parcel.apn} (${parcel.acres} acres), ${parcel.county} County, Utah

Dear ${draft.seller_salutation_name},

${draft.buyer_entity} ("Buyer") is pleased to submit this non-binding
Letter of Intent to purchase the above-referenced real property
("Property") on the following principal terms:

  Purchase Price:     $${draft.purchase_price_total.toLocaleString()}
                      (~$${draft.purchase_price_psf.toFixed(2)}/sqft)
  Earnest Money:      $${draft.earnest_money.toLocaleString()}, deposited
                      within ${draft.earnest_money_days} days of PSA execution.
  Due Diligence:      ${draft.due_diligence_days} days from PSA execution.
  Closing:            ${draft.closing_days} days following expiration of DD.
  Exclusivity:        ${draft.exclusivity_days} days from execution of this LOI.
  Title Company:      ${draft.title_company} (Agent: ${draft.title_agent})

Due Diligence Materials. Seller shall promptly deliver all surveys,
soil reports, environmental site assessments, improvement drawings,
CCRs, HOA docs, development agreements, and the title report in
Seller's possession. Buyer reserves the right to order its own studies.

Greenbelt Rollback Tax. ${draft.greenbelt_seller_pays ? "Seller shall be responsible for any rollback taxes." : "Rollback tax responsibility to be negotiated in PSA."}

Commissions. ${draft.buyer_represented ? "Buyer is represented; Seller is responsible for any commissions if applicable." : "Neither party is represented. Seller is responsible for any commissions if applicable."}

Confidentiality and Exclusivity. The terms hereof are confidential.
Seller agrees not to negotiate with any other party during the
exclusivity period above.

Non-Binding. This LOI is non-binding and intended only to facilitate
PSA negotiation in good faith.

Sincerely,

${draft.buyer_signatory_name}
${draft.buyer_signatory_title}
${draft.buyer_entity}
`}
        </div>
      </div>
    </div>
  );
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-[11px] text-muted-foreground w-32 shrink-0">{label}</label>
      <div className="flex-1">{children}</div>
    </div>
  );
}
