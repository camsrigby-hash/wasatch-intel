// Mocked Utah real estate development intelligence data.
// Phase 2: JURISDICTIONS, CITY_CENTERS, DealStage, Deal, Watchlist, SignalWireItem
// have been moved to types.ts and are now API-backed. This file retains only the
// data that is still consumed by MapCanvas, ParcelDeepDive, and search.tsx (Phases 3–5).

import { JURISDICTIONS, CITY_CENTERS } from "./types";

export const AGENDA_TYPES = [
  "Rezone", "General Plan Amendment", "Subdivision Plat", "Site Plan",
  "Conditional Use", "Annexation", "Zoning Text Amendment", "PUD Approval",
  "Preliminary Plat", "Final Plat",
] as const;
export type AgendaType = typeof AGENDA_TYPES[number];

export const STATUSES = ["Submitted", "Under Review", "Approved", "Denied", "Tabled", "Withdrawn"] as const;
export type Status = typeof STATUSES[number];

export const ZONES = ["A-1 Agricultural", "R-1-10", "R-1-8", "R-2", "R-3", "RM-12", "C-1 Commercial", "C-2", "M-1 Industrial", "MU Mixed-Use"] as const;
export const GENERAL_PLAN = ["Agricultural", "Low-Density Res", "Med-Density Res", "High-Density Res", "Commercial", "Mixed-Use", "Industrial", "Open Space"] as const;

export interface Developer {
  id: string;
  name: string;
  type: "Builder" | "LLC" | "Investor" | "REIT";
  unitsInPipeline: number;
  parcelsOwned: number;
  jurisdictions: string[];
  founded: number;
  hq: string;
  recentActivity: number;
}

export const DEVELOPERS: Developer[] = [
  { id: "dev-1",  name: "Ivory Homes",              type: "Builder",   unitsInPipeline: 2840, parcelsOwned: 47, jurisdictions: ["Lehi","Saratoga Springs","Eagle Mountain","Herriman","South Jordan"], founded: 1988, hq: "Salt Lake City", recentActivity: 23 },
  { id: "dev-2",  name: "Fieldstone Homes",          type: "Builder",   unitsInPipeline: 1620, parcelsOwned: 28, jurisdictions: ["Eagle Mountain","Tooele","Grantsville"],                             founded: 1995, hq: "Lehi",           recentActivity: 14 },
  { id: "dev-3",  name: "Lennar Utah",               type: "Builder",   unitsInPipeline: 2210, parcelsOwned: 31, jurisdictions: ["Lehi","Vineyard","Herriman","Bluffdale"],                            founded: 2002, hq: "Draper",         recentActivity: 19 },
  { id: "dev-4",  name: "D.R. Horton",               type: "Builder",   unitsInPipeline: 1890, parcelsOwned: 26, jurisdictions: ["Saratoga Springs","Eagle Mountain","Spanish Fork"],                  founded: 1978, hq: "Lehi",           recentActivity: 16 },
  { id: "dev-5",  name: "Wasatch Land Holdings LLC",  type: "LLC",       unitsInPipeline: 0,    parcelsOwned: 64, jurisdictions: ["Tooele","Grantsville","Eagle Mountain"],                             founded: 2018, hq: "Park City",      recentActivity: 8  },
  { id: "dev-6",  name: "Edge Homes",                type: "Builder",   unitsInPipeline: 1340, parcelsOwned: 22, jurisdictions: ["Lehi","Saratoga Springs","Vineyard"],                                founded: 2007, hq: "Lehi",           recentActivity: 12 },
  { id: "dev-7",  name: "Garbett Homes",             type: "Builder",   unitsInPipeline: 720,  parcelsOwned: 13, jurisdictions: ["Salt Lake City","South Jordan","Draper"],                            founded: 1980, hq: "Salt Lake City", recentActivity: 7  },
  { id: "dev-8",  name: "Oquirrh Capital LLC",        type: "LLC",       unitsInPipeline: 0,    parcelsOwned: 38, jurisdictions: ["Tooele","Grantsville"],                                              founded: 2020, hq: "Salt Lake City", recentActivity: 5  },
  { id: "dev-9",  name: "Anderson Development",       type: "Investor",  unitsInPipeline: 540,  parcelsOwned: 19, jurisdictions: ["Spanish Fork","Vineyard"],                                           founded: 1999, hq: "Provo",          recentActivity: 9  },
  { id: "dev-10", name: "Suburban Land Reserve",      type: "LLC",       unitsInPipeline: 0,    parcelsOwned: 52, jurisdictions: ["Eagle Mountain","Bluffdale","Herriman"],                             founded: 1976, hq: "Salt Lake City", recentActivity: 6  },
  { id: "dev-11", name: "Hamlet Homes",              type: "Builder",   unitsInPipeline: 480,  parcelsOwned: 11, jurisdictions: ["South Jordan","Draper","Bluffdale"],                                 founded: 1996, hq: "South Jordan",   recentActivity: 5  },
  { id: "dev-12", name: "Brighton Homes",            type: "Builder",   unitsInPipeline: 920,  parcelsOwned: 18, jurisdictions: ["Lehi","Saratoga Springs"],                                           founded: 2001, hq: "Lehi",           recentActivity: 11 },
  { id: "dev-13", name: "Toll Brothers Utah",         type: "Builder",   unitsInPipeline: 410,  parcelsOwned: 9,  jurisdictions: ["Draper","South Jordan"],                                             founded: 2014, hq: "Draper",         recentActivity: 4  },
  { id: "dev-14", name: "Stack Real Estate",          type: "REIT",      unitsInPipeline: 1240, parcelsOwned: 16, jurisdictions: ["Salt Lake City","Vineyard"],                                         founded: 2015, hq: "Salt Lake City", recentActivity: 8  },
  { id: "dev-15", name: "Mountain View Capital LLC",  type: "LLC",       unitsInPipeline: 0,    parcelsOwned: 29, jurisdictions: ["Tooele","Spanish Fork"],                                             founded: 2019, hq: "Lehi",           recentActivity: 3  },
];

// Deterministic pseudo-random
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export interface Parcel {
  id: string;
  apn: string;
  jurisdiction: string;
  acres: number;
  centroid: [number, number];
  polygon: [number, number][];
  zoning: string;
  generalPlan: string;
  hasGap: boolean;
  ownerId: string;
  ownerName: string;
  ownershipYears: number;
  utilitiesScore: number;
  adjacencyScore: number;
  politicalRisk: number;
  residualLandValue: number;
  agendaCount: number;
}

function makeParcels(): Parcel[] {
  const r = rng(42);
  const parcels: Parcel[] = [];
  let pid = 1000;
  for (const city of JURISDICTIONS) {
    const center = CITY_CENTERS[city];
    if (!center) continue;
    const count = 14 + Math.floor(r() * 6);
    for (let i = 0; i < count; i++) {
      const dx = (r() - 0.5) * 0.12;
      const dy = (r() - 0.5) * 0.08;
      const cx = center[0] + dx;
      const cy = center[1] + dy;
      const w = 0.003 + r() * 0.006;
      const h = 0.002 + r() * 0.004;
      const polygon: [number, number][] = [
        [cx - w, cy - h], [cx + w, cy - h], [cx + w, cy + h], [cx - w, cy + h], [cx - w, cy - h],
      ];
      const zoning = ZONES[Math.floor(r() * ZONES.length)];
      const generalPlan = GENERAL_PLAN[Math.floor(r() * GENERAL_PLAN.length)];
      const hasGap = (zoning.includes("A-1") && generalPlan !== "Agricultural") ||
                     (zoning.includes("R-1") && (generalPlan === "Commercial" || generalPlan === "Mixed-Use" || generalPlan === "High-Density Res"));
      const dev = DEVELOPERS[Math.floor(r() * DEVELOPERS.length)];
      parcels.push({
        id: `parcel-${pid}`,
        apn: `${city.slice(0,2).toUpperCase()}-${pid}-${Math.floor(r()*9999).toString().padStart(4,"0")}`,
        jurisdiction: city,
        acres: +(2 + r() * 80).toFixed(1),
        centroid: [cx, cy],
        polygon,
        zoning,
        generalPlan,
        hasGap,
        ownerId: dev.id,
        ownerName: dev.name,
        ownershipYears: Math.floor(r() * 25) + 1,
        utilitiesScore: Math.floor(r() * 100),
        adjacencyScore: Math.floor(r() * 100),
        politicalRisk: Math.floor(r() * 100),
        residualLandValue: Math.floor(80000 + r() * 1200000),
        agendaCount: Math.floor(r() * 6),
      });
      pid++;
    }
  }
  return parcels;
}

export const PARCELS: Parcel[] = makeParcels();

// Mock AgendaItem — shape used by MapCanvas, ParcelDeepDive, search.tsx.
// Different from the real AgendaItem in types.ts (which is parsed from the CSV).
// Will be replaced in Phase 3 when the map is wired to real geocoded data.
export interface AgendaItem {
  id: string;
  date: string;
  jurisdiction: string;
  type: AgendaType;
  applicant: string;
  applicantId: string;
  parcelId: string;
  parcelApn: string;
  units: number | null;
  acres: number;
  status: Status;
  signal: number;
  title: string;
  summary: string;
  centroid: [number, number];
}

const APPLICANT_VARIANTS = ["LLC", "Holdings", "Land Co.", "Group", "Partners"];

function makeAgendas(): AgendaItem[] {
  const r = rng(7);
  const items: AgendaItem[] = [];
  const now = Date.now();
  const monthMs = 30 * 24 * 3600 * 1000;
  for (let i = 0; i < 400; i++) {
    const parcel = PARCELS[Math.floor(r() * PARCELS.length)];
    const dev = DEVELOPERS[Math.floor(r() * DEVELOPERS.length)];
    const type = AGENDA_TYPES[Math.floor(r() * AGENDA_TYPES.length)];
    const ageMonths = Math.floor(r() * 24);
    const date = new Date(now - ageMonths * monthMs - Math.floor(r() * monthMs)).toISOString();
    const status = STATUSES[Math.floor(r() * STATUSES.length)];
    const units = type === "Rezone" || type === "Subdivision Plat" || type === "PUD Approval" || type === "Site Plan"
      ? Math.floor(20 + r() * 480) : null;
    const baseSig = parcel.hasGap ? 55 : 25;
    const signal = Math.min(100, Math.floor(baseSig + r() * 50));
    const variant = APPLICANT_VARIANTS[Math.floor(r() * APPLICANT_VARIANTS.length)];
    const applicant = r() > 0.5 ? dev.name : `${parcel.jurisdiction.split(" ")[0]} ${variant}`;
    items.push({
      id: `agenda-${i + 1}`,
      date,
      jurisdiction: parcel.jurisdiction,
      type,
      applicant,
      applicantId: dev.id,
      parcelId: parcel.id,
      parcelApn: parcel.apn,
      units,
      acres: parcel.acres,
      status,
      signal,
      title: `${type} — ${units ? `${units} units` : `${parcel.acres} ac`} on ${parcel.apn}`,
      summary: `${applicant} requests ${type.toLowerCase()} for parcel ${parcel.apn} (${parcel.acres} ac, current zoning ${parcel.zoning}, GP ${parcel.generalPlan}).`,
      centroid: parcel.centroid,
    });
  }
  return items.sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export const AGENDAS: AgendaItem[] = makeAgendas();

export const TRANSCRIPT_SAMPLES: Record<string, { speaker: string; line: string }[]> = {
  default: [
    { speaker: "Chair Henderson",  line: "Next on the agenda: a request for general plan amendment on parcel along the corridor." },
    { speaker: "Applicant counsel", line: "We're proposing 248 townhome units consistent with the city's growth strategy. Density is 14 du/acre." },
    { speaker: "Commissioner Park", line: "I have concerns about the school capacity and traffic on the arterial." },
    { speaker: "Planning staff",   line: "Staff recommends approval with conditions related to roadway dedication and a 6-foot masonry wall." },
    { speaker: "Public comment",   line: "I live two doors down. We oppose any rezone to medium density. This neighborhood was sold to us as low-density." },
    { speaker: "Chair Henderson",  line: "Motion to table for one cycle pending traffic study." },
    { speaker: "Vote",             line: "Motion carries 4-1. Item tabled." },
  ],
};

export const SITE_PLAN_SAMPLES = [
  { id: "sp-1", name: "Ivory — Saratoga Crossing Phase 4", units: 312, density: 12.4, parcelId: PARCELS[5]?.id },
  { id: "sp-2", name: "Lennar — Vineyard Reserve",         units: 198, density: 8.1,  parcelId: PARCELS[42]?.id },
  { id: "sp-3", name: "Edge — Lehi Tech Plaza",            units: 0,   density: 0,    parcelId: PARCELS[18]?.id },
];

export function signalLabel(s: number): "Low" | "Med" | "High" | "Critical" {
  if (s >= 80) return "Critical";
  if (s >= 60) return "High";
  if (s >= 40) return "Med";
  return "Low";
}

export function signalToken(s: number): string {
  const l = signalLabel(s);
  return l === "Critical" ? "signal-critical"
    : l === "High" ? "signal-high"
    : l === "Med"  ? "signal-med"  : "signal-low";
}
