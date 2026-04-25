// src/server/lib/analyze.ts
// Opportunity analysis engine — ported from analyze_opportunity.py.
// Simplified: uses parcel's own data only (no 1-mile ArcGIS buffer).
// Marked simplified=true so the UI can caveat accordingly.

import type { AnalysisResult, OpportunityStrategy, ParcelDetail } from "../../lib/types";

const MAJOR_CORRIDORS = [
  { name: "SR-36",             lon: -112.298, latMin: 40.50, latMax: 40.72 },
  { name: "SR-138 / Erda Way", lat:   40.605, lonMin: -112.46, lonMax: -112.28 },
  { name: "Midvalley Highway", lon: -112.35,  latMin: 40.50, latMax: 40.68 },
] as const;

function metersTo(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const R = 6_371_000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function detectCorridors(lon: number, lat: number): Array<{ name: string; distanceM: number }> {
  const hits: Array<{ name: string; distanceM: number }> = [];
  for (const c of MAJOR_CORRIDORS) {
    if ("lon" in c && lat >= c.latMin && lat <= c.latMax) {
      const d = metersTo(lon, lat, c.lon, lat);
      if (d <= 500) hits.push({ name: c.name, distanceM: Math.round(d) });
    } else if ("lat" in c && lon >= c.lonMin && lon <= c.lonMax) {
      const d = metersTo(lon, lat, lon, c.lat);
      if (d <= 500) hits.push({ name: c.name, distanceM: Math.round(d) });
    }
  }
  return hits;
}

function classifyZone(code: string | null): string {
  if (!code) return "unknown";
  const z = code.toUpperCase();
  if (z.startsWith("A-")) return "agricultural";
  if (z.startsWith("RR-")) return "rural_residential";
  if (z.startsWith("R-") || z === "MFR" || z === "SFR") return "residential";
  if (z.startsWith("C-") || z === "NC") return "commercial";
  if (["MD", "M-G", "M-1", "M-2", "LI", "HI", "MG", "IND"].includes(z)) return "industrial";
  if (z === "PC") return "planned_community";
  if (z === "MU") return "mixed_use";
  return "other";
}

function classifyGp(code: string | null, label: string | null): string {
  const c = (code ?? "").toUpperCase();
  const n = (label ?? "").toUpperCase();
  if (c === "HIR" || n.includes("HIGH")) return "residential_high";
  if (c === "MIR" || n.includes("MEDIUM")) return "residential_medium";
  if (n.includes("RESIDENTIAL") || ["LIR"].includes(c)) return "residential_low";
  if (c === "EMP" || n.includes("EMPLOYMENT")) return "employment";
  if (n.includes("COMMERCIAL") || n.includes("RETAIL")) return "commercial";
  if (n.includes("INDUSTRIAL") || n.includes("MANUFACTUR")) return "industrial";
  if (["CENTER", "MIXED", "VILLAGE", "TOWN"].some((k) => n.includes(k))) return "mixed_use_center";
  if (n.includes("AGRIC") || n.includes("RURAL")) return "rural_agricultural";
  if (n.includes("OPEN") || n.includes("PARK")) return "open_space";
  return "other";
}

function norm(raw: number): number {
  return Math.round((raw / 8) * 50) / 10;
}

export function analyzeOpportunity(detail: ParcelDetail): AnalysisResult {
  const acres     = detail.acres ?? 0;
  const zoneClass = classifyZone(detail.zoning);
  const gpClass   = classifyGp(detail.generalPlan, detail.gpDesignationLabel);
  const centroid  = detail.centroid;
  const corridors = centroid ? detectCorridors(centroid[0], centroid[1]) : [];
  const onCorridor = corridors.length > 0;

  const strategies: OpportunityStrategy[] = [];

  // Residential upzone
  const resGp   = ["residential_high", "residential_medium", "residential_low"].includes(gpClass) ? 2 : 0;
  const resZone = ["residential", "rural_residential"].includes(zoneClass) ? 2 : 0;
  const resSz   = acres >= 5 ? 2 : acres >= 2 ? 1 : 0;
  strategies.push({
    strategy:   "Residential upzone (Ag/RR → MIR/HIR equivalent)",
    score:      norm(resGp + resZone + 1 + resSz),
    components: { gp_alignment: resGp, zone_precedent: resZone, corridor_access: 1, size_fit: resSz },
    notes:      `GP category: ${gpClass}. Zone category: ${zoneClass}. ${detail.gpDesignationLabel ?? "No GP designation"}.`,
    unknowns:   ["sewer/water availability", "school capacity", "council appetite for density"],
  });

  // Commercial / corridor
  const comGp   = ["employment", "commercial", "mixed_use_center"].includes(gpClass) ? 2 : 0;
  const comZone = ["commercial", "mixed_use"].includes(zoneClass) ? 2 : 0;
  const comCo   = onCorridor ? 2 : 0;
  const comSz   = acres >= 2 && acres <= 40 ? 2 : acres < 80 ? 1 : 0;
  strategies.push({
    strategy:   "Commercial / highway corridor (Ag → C-G / C-H / NC)",
    score:      norm(comGp + comZone + comCo + comSz),
    components: { gp_alignment: comGp, zone_precedent: comZone, corridor_access: comCo, size_fit: comSz },
    notes:      `Corridor: ${corridors.length ? corridors.map((c) => c.name).join(", ") : "none within 500m"}. GP: ${gpClass}.`,
    unknowns:   ["traffic counts", "utility sizing", "competing retail within 3-mi trade area"],
  });

  // Manufacturing / Distribution
  const indGp   = ["industrial", "employment"].includes(gpClass) ? 2 : 0;
  const indZone = gpClass === "industrial" ? 2 : 0;
  const indCo   = onCorridor ? 2 : 1;
  const indSz   = acres >= 5 ? 2 : acres >= 2 ? 1 : 0;
  strategies.push({
    strategy:   "Manufacturing / Distribution (Ag → MD)",
    score:      norm(indGp + indZone + indCo + indSz),
    components: { gp_alignment: indGp, zone_precedent: indZone, corridor_access: indCo, size_fit: indSz },
    notes:      `Industrial GP: ${indGp > 0 ? "present" : "not found"}. Corridor: ${onCorridor ? "yes" : "no"}.`,
    unknowns:   ["proximity to airport/rail", "truck route access", "dust & noise buffers"],
  });

  // Planned Community
  const pcSz      = acres >= 40 ? 2 : acres >= 20 ? 1 : 0;
  const sizeLabel = acres >= 40 ? "well-suited" : acres >= 20 ? "borderline" : "likely under minimum";
  strategies.push({
    strategy:   "Planned Community / PC district (mixed use w/ development agreement)",
    score:      norm(1 + 0 + (onCorridor ? 1 : 0) + pcSz),
    components: { gp_alignment: 1, zone_precedent: 0, corridor_access: onCorridor ? 1 : 0, size_fit: pcSz },
    notes:      `At ${acres} ac, ${sizeLabel} for standalone PC. Erda PC framework adopted 2024.`,
    unknowns:   ["assemblage feasibility", "developer partner availability", "25% open-space yield impact"],
  });

  // Hold / baseline
  strategies.push({
    strategy:   "Hold / do nothing (baseline)",
    score:      2.5,
    components: { baseline: 2.5 },
    notes:      "Viable if carry costs are low and surrounding area is upzoning independently.",
    unknowns:   ["annual carry cost", "tax reassessment trajectory", "owner motivation"],
  });

  strategies.sort((a, b) => b.score - a.score);
  const top    = strategies[0];
  const runner = strategies[1];
  const headline =
    top && runner
      ? `Top: ${top.strategy} (${top.score}/5); runner-up: ${runner.strategy} (${runner.score}/5)`
      : top?.strategy ?? "no strategies scored";

  return { apn: detail.apn, corridors, strategiesRanked: strategies, headline, simplified: true };
}
