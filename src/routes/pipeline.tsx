import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DEALS, DEAL_STAGES, type DealStage } from "@/lib/mock-data";
import { Mail, FileText, Phone, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/pipeline")({
  head: () => ({
    meta: [
      { title: "Pipeline — Wasatch Intel" },
      { name: "description", content: "Kanban-style deal pipeline for land development opportunities, with notes, contacts, and outreach templates." },
      { property: "og:title", content: "Pipeline — Wasatch Intel" },
      { property: "og:description", content: "Manage your land deals from prospect to close." },
    ],
  }),
  component: PipelinePage,
});

const STAGE_TONE: Record<DealStage, string> = {
  "Prospect": "border-muted-foreground/30",
  "Diligence": "border-[var(--color-signal-med)]",
  "LOI": "border-primary",
  "Under Contract": "border-[var(--color-opportunity)]",
  "Closed/Dead": "border-muted-foreground/20",
};

function PipelinePage() {
  return (
    <AppShell>
      <div className="h-full flex flex-col">
        <header className="px-6 pt-6 pb-3 flex items-center justify-between border-b border-border">
          <div>
            <h1 className="text-xl font-semibold">Pipeline</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{DEALS.length} active deals · {DEAL_STAGES.length} stages</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline"><Mail className="h-3.5 w-3.5" /> Outreach templates</Button>
            <Button size="sm"><Plus className="h-3.5 w-3.5" /> New deal</Button>
          </div>
        </header>

        <div className="flex-1 overflow-x-auto p-4">
          <div className="grid grid-flow-col auto-cols-[280px] gap-3 h-full">
            {DEAL_STAGES.map((stage) => {
              const deals = DEALS.filter((d) => d.stage === stage);
              return (
                <div key={stage} className={`rounded-lg border-t-2 ${STAGE_TONE[stage]} bg-muted/30 flex flex-col min-h-0`}>
                  <div className="px-3 py-2.5 flex items-center justify-between">
                    <h3 className="text-xs font-semibold tracking-tight">{stage}</h3>
                    <Badge variant="outline" className="text-[10px] h-5">{deals.length}</Badge>
                  </div>
                  <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
                    {deals.map((d) => (
                      <article key={d.id} className="bg-card border border-border rounded-md p-2.5 hover:shadow-sm hover:border-primary/30 transition-all cursor-pointer">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] text-muted-foreground">{d.parcelApn}</span>
                          <span className="text-[10px] text-muted-foreground">{d.acres} ac</span>
                        </div>
                        <div className="text-xs font-medium mt-1">{d.jurisdiction}</div>
                        <div className="font-mono text-sm font-semibold mt-1">${(d.residualLandValue/1000).toFixed(0)}k</div>
                        <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2">{d.notes}</p>
                        <div className="mt-2 pt-2 border-t border-border flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground truncate">→ {d.nextAction}</span>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatDistanceToNow(new Date(d.updatedAt))}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1.5">
                          <button className="h-5 w-5 rounded hover:bg-muted flex items-center justify-center text-muted-foreground"><Mail className="h-3 w-3" /></button>
                          <button className="h-5 w-5 rounded hover:bg-muted flex items-center justify-center text-muted-foreground"><Phone className="h-3 w-3" /></button>
                          <button className="h-5 w-5 rounded hover:bg-muted flex items-center justify-center text-muted-foreground"><FileText className="h-3 w-3" /></button>
                          <span className="ml-auto text-[10px] text-muted-foreground">{d.contact}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
