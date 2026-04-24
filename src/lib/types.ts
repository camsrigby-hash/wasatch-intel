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
