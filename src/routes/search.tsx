import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SignalBar } from "@/components/SignalBar";
import { AGENDAS, PARCELS, DEVELOPERS, TRANSCRIPT_SAMPLES } from "@/lib/mock-data";
import { Search as SearchIcon, MapPin, Building2, FileText, Quote } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search — Wasatch Intel" },
      { name: "description", content: "Search across parcels, agenda items, applicants, and meeting transcripts in one ranked feed." },
      { property: "og:title", content: "Search — Wasatch Intel" },
      { property: "og:description", content: "Cross-source search for development intelligence." },
    ],
  }),
  component: SearchPage,
});

const FACETS = ["All", "Parcels", "Agendas", "Applicants", "Transcripts"] as const;

function SearchPage() {
  const [q, setQ] = useState("Ivory");
  const [facet, setFacet] = useState<typeof FACETS[number]>("All");

  const lower = q.toLowerCase();
  const parcels = useMemo(() => PARCELS.filter(p =>
    p.apn.toLowerCase().includes(lower) || p.jurisdiction.toLowerCase().includes(lower) || p.ownerName.toLowerCase().includes(lower)
  ).slice(0,8), [lower]);
  const agendas = useMemo(() => AGENDAS.filter(a =>
    a.title.toLowerCase().includes(lower) || a.applicant.toLowerCase().includes(lower) || a.parcelApn.toLowerCase().includes(lower)
  ).slice(0,10), [lower]);
  const applicants = useMemo(() => DEVELOPERS.filter(d =>
    d.name.toLowerCase().includes(lower) || d.hq.toLowerCase().includes(lower)
  ).slice(0,6), [lower]);
  const transcripts = TRANSCRIPT_SAMPLES.default.filter(l => l.line.toLowerCase().includes(lower) || l.speaker.toLowerCase().includes(lower));

  const showParcels = facet === "All" || facet === "Parcels";
  const showAgendas = facet === "All" || facet === "Agendas";
  const showApps = facet === "All" || facet === "Applicants";
  const showTrans = facet === "All" || facet === "Transcripts";

  const total = (showParcels ? parcels.length : 0) + (showAgendas ? agendas.length : 0) + (showApps ? applicants.length : 0) + (showTrans ? transcripts.length : 0);

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto p-6 space-y-5">
        <div>
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search parcels, agendas, applicants, transcripts…" className="h-11 pl-10 text-sm" />
          </div>
          <div className="flex items-center gap-1 mt-3">
            {FACETS.map((f) => (
              <button
                key={f}
                onClick={() => setFacet(f)}
                className={`text-xs px-2.5 h-7 rounded-md transition-colors ${facet === f ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >{f}</button>
            ))}
            <span className="ml-auto text-[11px] text-muted-foreground font-mono">{total} results</span>
          </div>
        </div>

        <div className="space-y-5">
          {showParcels && parcels.length > 0 && (
            <Section title="Parcels" count={parcels.length}>
              {parcels.map((p) => (
                <div key={p.id} className="rounded-md border border-border bg-card px-3 py-2.5 hover:border-primary/30">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-mono text-xs">{p.apn}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs">{p.jurisdiction} · {p.acres} ac</span>
                    {p.hasGap && <Badge className="bg-[var(--color-gap)] text-white border-0 text-[10px] ml-auto">Gap</Badge>}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">Owner: {p.ownerName} · Zoning {p.zoning} → GP {p.generalPlan}</div>
                </div>
              ))}
            </Section>
          )}

          {showAgendas && agendas.length > 0 && (
            <Section title="Agenda items" count={agendas.length}>
              {agendas.map((a) => (
                <div key={a.id} className="rounded-md border border-border bg-card px-3 py-2.5 hover:border-primary/30">
                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <Badge variant="outline" className="text-[10px]">{a.type}</Badge>
                    <span className="text-xs font-medium truncate">{a.title}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[11px] text-muted-foreground">{a.applicant} · {a.jurisdiction} · {format(new Date(a.date),"MMM d, yyyy")}</span>
                    <SignalBar value={a.signal} />
                  </div>
                </div>
              ))}
            </Section>
          )}

          {showApps && applicants.length > 0 && (
            <Section title="Applicants" count={applicants.length}>
              {applicants.map((d) => (
                <div key={d.id} className="rounded-md border border-border bg-card px-3 py-2.5 hover:border-primary/30 flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium">{d.name}</div>
                    <div className="text-[11px] text-muted-foreground">{d.type} · HQ {d.hq} · {d.unitsInPipeline} units in pipeline</div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{d.recentActivity} recent</Badge>
                </div>
              ))}
            </Section>
          )}

          {showTrans && transcripts.length > 0 && (
            <Section title="Transcript matches" count={transcripts.length}>
              {transcripts.map((t, i) => (
                <div key={i} className="rounded-md border border-border bg-card px-3 py-2.5">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                    <Quote className="h-3 w-3" /> {t.speaker}
                  </div>
                  <p className="text-xs mt-1">{t.line}</p>
                </div>
              ))}
            </Section>
          )}

          {total === 0 && (
            <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              No matches for "{q}". Try a parcel APN, applicant name, or a phrase from a meeting.
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-2 flex items-center gap-2">
        {title}
        <span className="font-mono text-muted-foreground/60">{count}</span>
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
