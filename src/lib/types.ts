// src/lib/types.ts
// Shared type contract between the Python data pipeline and the TypeScript
// frontend/backend. This file is the authoritative definition of every data
// shape that crosses the Python → CSV → API → React boundary.
//
// Field mapping from Python CSV columns to these TS fields is documented in
// docs/python-to-ts-field-mapping.md.
//
// Do NOT import from mock-data.ts for type definitions — use this file.

import { z } from "zod";

// ── Jurisdictions ────────────────────────────────────────────────────────────

export type Jurisdiction =
  | "Erda"
  | "Grantsville"
  | "Salt Lake City"
  | "Lehi"
  | "Saratoga Springs"
  | "Eagle Mountain"
  | "Vineyard"
  | "Herriman"
  | "Tooele"
  | "Draper"
  | "South Jordan"
  | "Bluffdale"
  | "Spanish Fork";

export const JURISDICTIONS: Jurisdiction[] = [
  "Erda",
  "Grantsville",
  "Salt Lake City",
  "Lehi",
  "Saratoga Springs",
  "Eagle Mountain",
  "Vineyard",
  "Herriman",
  "Tooele",
  "Draper",
  "South Jordan",
  "Bluffdale",
  "Spanish Fork",
];

// ── Signal taxonomy (CM_RE heritage — shared with Python classify) ────────────

export const SIGNAL_TYPES = [
  "REZONE",
  "NEW_SUBDIVISION",
  "COMMERCIAL_PROJECT",
  "MINIFLEX_OPPORTUNITY",
  "INFRASTRUCTURE",
  "ANNEXATION",
  "GENERAL_PLAN_AMENDMENT",
  "LARGE_PROJECT",
  "DEVELOPER_ACTIVITY",
] as const;

export type SignalType = (typeof SIGNAL_TYPES)[number];

// Human-readable labels for signal types (UI use)
export const SIGNAL_TYPE_LABELS: Record<SignalType, string> = {
  REZONE:                  "Rezone",
  NEW_SUBDIVISION:         "Subdivision",
  COMMERCIAL_PROJECT:      "Commercial",
  MINIFLEX_OPPORTUNITY:    "Miniflex",
  INFRASTRUCTURE:          "Infrastructure",
  ANNEXATION:              "Annexation",
  GENERAL_PLAN_AMENDMENT:  "GP Amendment",
  LARGE_PROJECT:           "Large Project",
  DEVELOPER_ACTIVITY:      "Developer Activity",
};

// ── Agenda item status ───────────────────────────────────────────────────────

export const AGENDA_STATUSES = [
  "PROPOSED",
  "APPROVED",
  "DENIED",
  "TABLED",
  "CONTINUED",
] as const;

export type AgendaStatus = (typeof AGENDA_STATUSES)[number];

// ── AgendaItem ───────────────────────────────────────────────────────────────
// One row in agenda_items_split.csv, mapped to camelCase.

export const AgendaItemSchema = z.object({
  // Core — always present from the scraper
  id:           z.string(),
  date:         z.string(),           // meeting_date (ISO date)
  jurisdiction: z.string(),
  body:         z.string(),           // e.g. "Erda Planning Commission"
  title:        z.string(),
  url:          z.string(),
  source:       z.string(),           // "pmn" | "web"
  scrapedAt:    z.string(),

  // Classification
  itemType:     z.string(),           // legacy keyword type from classify.py
  confidence:   z.number().nullable(),
  signalType:   z.enum(SIGNAL_TYPES).nullable(),  // CM_RE taxonomy; null pre-Phase-1
  growthScore:  z.number().nullable(), // 0-100

  // Extracted content (Phase 1 schema, null for pre-Phase-1 rows)
  description:  z.string().nullable(),
  location:     z.string().nullable(),
  acres:        z.number().nullable(),
  units:        z.number().nullable(),
  developer:    z.string().nullable(), // applicant / developer entity
  zoningFrom:   z.string().nullable(),
  zoningTo:     z.string().nullable(),
  agendaStatus: z.enum(AGENDA_STATUSES).nullable(),
  notes:        z.string().nullable(),

  // Geocoding (Phase 3 — null until geocode_items.py runs)
  lat:               z.number().nullable(),
  lng:               z.number().nullable(),
  geocodeSource:     z.string().nullable(),
  geocodeConfidence: z.number().nullable(),
});

export type AgendaItem = z.infer<typeof AgendaItemSchema>;

// ── API envelope ─────────────────────────────────────────────────────────────

export interface ApiMeta {
  source:    string;
  freshness: "live" | "stale";
  count:     number;
  fetchedAt: string;
}

export interface ApiEnvelope<T> {
  data:   T;
  meta:   ApiMeta;
  errors: string[];
}

export const AgendasResponseSchema = z.object({
  data:   z.array(AgendaItemSchema),
  meta:   z.object({
    source:    z.string(),
    freshness: z.enum(["live", "stale"]),
    count:     z.number(),
    fetchedAt: z.string(),
  }),
  errors: z.array(z.string()),
});

export type AgendasResponse = z.infer<typeof AgendasResponseSchema>;

// ── Helpers ──────────────────────────────────────────────────────────────────

export function signalScore(item: AgendaItem): number {
  return item.growthScore ?? 0;
}

export function signalLabel(score: number): "Low" | "Med" | "High" | "Critical" {
  if (score >= 80) return "Critical";
  if (score >= 60) return "High";
  if (score >= 40) return "Med";
  return "Low";
}

export function signalToken(score: number): string {
  const l = signalLabel(score);
  return l === "Critical" ? "signal-critical"
    : l === "High"   ? "signal-high"
    : l === "Med"    ? "signal-med"
    : "signal-low";
}

// ── City-level signal aggregation (Phase 2 — from city_signal_scores.json) ───

export interface CityScore {
  city:               string;
  growthScore:        number;
  grade:              "A" | "B" | "C" | "D";
  totalSignals:       number;
  signalCounts:       Partial<Record<SignalType, number>>;
  activeDevelopers:   string[];
  mostRecentActivity: string | null;
}

// ── Digest (Phase 2 — latest_digest.md + city scores) ────────────────────────

export interface DigestContent {
  markdown:     string;
  generatedAt:  string | null;
  itemCount:    number | null;
  totalCostUsd: number | null;
  cityScores:   CityScore[];
}

// ── Developer summary (Phase 2 — derived from agenda CSV) ────────────────────

export interface DeveloperSummary {
  id:             string;
  name:           string;
  totalFilings:   number;
  recentActivity: number;
  jurisdictions:  string[];
  lastSeen:       string | null;
  signalTypes:    Partial<Record<SignalType, number>>;
}

// ── Signal wire item (Phase 2 — agenda; Phase 6 — news/Reddit) ───────────────

export interface SignalWireItem {
  id:           string;
  date:         string;
  source:       "Agenda" | "News" | "Rumor" | "Filing";
  jurisdiction: string;
  headline:     string;
  excerpt:      string | null;
  signal:       number;
  agendaId?:    string;
}

// ── Watchlist (Phase 7 — D1 backed; [] for now) ──────────────────────────────

export interface Watchlist {
  id:              string;
  name:            string;
  type:            "Geography" | "Applicant" | "Parcel Set" | "Saved Search";
  hits:            number;
  lastHit:         string | null;
  signalThreshold: number;
  alerts:          { inApp: boolean; email: boolean };
}

// ── Deal pipeline (Phase 8 — D1 backed; [] for now) ──────────────────────────

export type DealStage = "Prospect" | "Diligence" | "LOI" | "Under Contract" | "Closed/Dead";
export const DEAL_STAGES: DealStage[] = ["Prospect", "Diligence", "LOI", "Under Contract", "Closed/Dead"];

export interface Deal {
  id:                string;
  parcelApn:         string;
  jurisdiction:      string;
  stage:             DealStage;
  acres:             number | null;
  residualLandValue: number | null;
  nextAction:        string;
  contact:           string;
  updatedAt:         string;
  notes:             string;
}

// ── Parcel detail (/api/parcel/:apn — Phase 5) ───────────────────────────────

export interface ParcelDetail {
  apn:                      string;
  acres:                    number | null;
  owner:                    string | null;
  address:                  string | null;
  zoning:                   string | null;
  zoningJurisdiction:       string | null;
  currentZoneLabel:         string | null;
  generalPlan:              string | null;
  gpDesignationLabel:       string | null;
  zoningIntensity:          number | null;
  gpIntensity:              number | null;
  gapScore:                 number | null;
  developable:              boolean;
  jurisdiction:             string | null;
  centroid:                 [number, number] | null;  // [lon, lat]
  // Road enrichment — null until enrich_roads.py runs
  nearestArterialName:      string | null;
  nearestArterialAadt:      number | null;
  nearestArterialDistanceMi: number | null;
  nearestRoadClass:         string | null;
  isCorner:                 boolean | null;
  cornerRoads:              string[] | null;
  // Linked agenda items (proximity + APN text match)
  agendaItems:              AgendaItem[];
}

// ── Parcel neighbor (/api/parcel/:apn/adjacency) ──────────────────────────────

export interface ParcelNeighbor {
  apn:          string;
  owner:        string | null;
  acres:        number | null;
  gapScore:     number | null;
  jurisdiction: string | null;
  developable:  boolean;
  centroid:     [number, number] | null;
  distanceKm:   number;
}

// ── Opportunity analysis (/api/parcel/:apn/analyze) ───────────────────────────

export interface OpportunityStrategy {
  strategy:   string;
  score:      number;  // 0–5
  components: Record<string, number>;
  notes:      string;
  unknowns:   string[];
}

export interface AnalysisResult {
  apn:              string;
  corridors:        Array<{ name: string; distanceM: number }>;
  strategiesRanked: OpportunityStrategy[];
  headline:         string;
  simplified:       boolean;  // true = 1-mile buffer context not included
}

// ── City center coordinates [lon, lat] (authoritative, moved from mock-data) ─

export const CITY_CENTERS: Record<string, [number, number]> = {
  "Salt Lake City":   [-111.891,  40.7608],
  "Lehi":            [-111.8508, 40.3916],
  "Saratoga Springs": [-111.9047, 40.3497],
  "Eagle Mountain":  [-112.0058, 40.3144],
  "Vineyard":        [-111.7547, 40.3169],
  "Herriman":        [-112.0330, 40.5141],
  "Tooele":          [-112.2983, 40.5308],
  "Grantsville":     [-112.4644, 40.5994],
  "Erda":            [-112.3803, 40.6086],
  "Draper":          [-111.8638, 40.5247],
  "South Jordan":    [-111.9388, 40.5621],
  "Bluffdale":       [-111.9388, 40.4837],
  "Spanish Fork":    [-111.6549, 40.1149],
};
