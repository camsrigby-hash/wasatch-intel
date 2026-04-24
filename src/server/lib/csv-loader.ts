// src/server/lib/csv-loader.ts
// Fetch, cache, and parse agenda_items_split.csv from the public tooele-land-intel repo.

import type { AgendaItem, AgendaStatus, SignalType } from "../../lib/types";

const CSV_URL =
  "https://raw.githubusercontent.com/camsrigby-hash/tooele-land-intel/main/data/agenda_items_split.csv";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  text: string;
  at: number;
}
let _cache: CacheEntry | null = null;

async function fetchCsv(): Promise<string> {
  const now = Date.now();
  if (_cache && now - _cache.at < CACHE_TTL_MS) return _cache.text;
  const res = await fetch(CSV_URL);
  if (!res.ok) throw new Error(`CSV fetch failed: ${res.status} ${res.statusText}`);
  const text = await res.text();
  _cache = { text, at: now };
  return text;
}

// ── CSV parser (handles quoted fields with embedded commas / newlines) ────────

function parseCsv(raw: string): Record<string, string>[] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQ = false;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '"') {
      if (inQ && raw[i + 1] === '"') { field += '"'; i++; }
      else { inQ = !inQ; }
    } else if (ch === "," && !inQ) {
      cur.push(field); field = "";
    } else if ((ch === "\n" || ch === "\r") && !inQ) {
      cur.push(field); field = "";
      if (cur.some(Boolean)) rows.push(cur);
      cur = [];
      if (ch === "\r" && raw[i + 1] === "\n") i++;
    } else {
      field += ch;
    }
  }
  if (field || cur.length) { cur.push(field); if (cur.some(Boolean)) rows.push(cur); }

  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map((vals) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] ?? "").trim(); });
    return obj;
  });
}

// ── Row → AgendaItem ─────────────────────────────────────────────────────────

const VALID_SIGNAL_TYPES = new Set<SignalType>([
  "REZONE", "NEW_SUBDIVISION", "COMMERCIAL_PROJECT", "MINIFLEX_OPPORTUNITY",
  "INFRASTRUCTURE", "ANNEXATION", "GENERAL_PLAN_AMENDMENT", "LARGE_PROJECT",
  "DEVELOPER_ACTIVITY",
]);

const VALID_STATUSES = new Set<AgendaStatus>([
  "PROPOSED", "APPROVED", "DENIED", "TABLED", "CONTINUED",
]);

function num(v: string): number | null {
  if (!v || v === "nan" || v === "None" || v.trim() === "") return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function str(v: string): string | null {
  const s = (v ?? "").trim();
  return s === "" || s === "nan" || s === "None" ? null : s;
}

function toSignalType(v: string): SignalType | null {
  return VALID_SIGNAL_TYPES.has(v as SignalType) ? (v as SignalType) : null;
}

function toAgendaStatus(v: string): AgendaStatus | null {
  return VALID_STATUSES.has(v as AgendaStatus) ? (v as AgendaStatus) : null;
}

function rowToItem(r: Record<string, string>): AgendaItem {
  return {
    id:          r.id ?? "",
    date:        r.meeting_date ?? "",
    jurisdiction: r.jurisdiction ?? "",
    body:        r.body ?? "",
    title:       r.title ?? "",
    url:         r.url ?? "",
    source:      r.source ?? "",
    scrapedAt:   r.scraped_at ?? "",

    itemType:    r.item_type ?? "",
    confidence:  num(r.confidence),
    signalType:  toSignalType(r.signal_type ?? ""),
    growthScore: num(r.growth_score),

    description:  str(r.description),
    location:     str(r.location),
    acres:        num(r.acres),
    units:        num(r.units),
    developer:    str(r.developer),
    zoningFrom:   str(r.zoning_from),
    zoningTo:     str(r.zoning_to),
    agendaStatus: toAgendaStatus(r.status_enum ?? ""),
    notes:        str(r.notes),

    lat:               num(r.lat),
    lng:               num(r.lng),
    geocodeSource:     str(r.geocode_source),
    geocodeConfidence: num(r.geocode_confidence),
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

export interface LoadResult {
  data:      AgendaItem[];
  freshness: "live" | "stale";
  fetchedAt: string;
  count:     number;
}

export async function loadAgendas(): Promise<LoadResult> {
  const fetchedAt = new Date().toISOString();
  try {
    const text = await fetchCsv();
    const rows = parseCsv(text);
    const data = rows
      .map(rowToItem)
      .filter((a) => a.id && a.date && a.jurisdiction);
    return { data, freshness: "live", fetchedAt, count: data.length };
  } catch (err) {
    console.error("[csv-loader] loadAgendas error:", err);
    return { data: [], freshness: "stale", fetchedAt, count: 0 };
  }
}
