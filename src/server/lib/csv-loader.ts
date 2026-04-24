// src/server/lib/csv-loader.ts
// Fetch, cache, and parse CSV/JSON data files from the public tooele-land-intel repo.

import type { AgendaItem, AgendaStatus, SignalType, DeveloperSummary, SignalWireItem, DigestContent, CityScore } from "../../lib/types";

const TLI_BASE = "https://raw.githubusercontent.com/camsrigby-hash/tooele-land-intel/main/data";

const CACHE_TTL_MS = 5 * 60 * 1000;

// Generic per-URL in-memory cache for Workers (one instance per isolate)
const _urlCache = new Map<string, { text: string; at: number }>();

async function fetchRaw(url: string): Promise<string> {
  const now = Date.now();
  const hit = _urlCache.get(url);
  if (hit && now - hit.at < CACHE_TTL_MS) return hit.text;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed ${url}: ${res.status} ${res.statusText}`);
  const text = await res.text();
  _urlCache.set(url, { text, at: now });
  return text;
}

// Legacy single-file cache alias (kept for backward compat)
async function fetchCsv(): Promise<string> {
  return fetchRaw(`${TLI_BASE}/agenda_items_split.csv`);
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

export interface LoadResult<T = AgendaItem[]> {
  data:      T;
  freshness: "live" | "stale";
  fetchedAt: string;
  count:     number;
}

export async function loadAgendas(): Promise<LoadResult<AgendaItem[]>> {
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

// ── /api/developers ───────────────────────────────────────────────────────────

export async function loadDevelopers(): Promise<LoadResult<DeveloperSummary[]>> {
  const fetchedAt = new Date().toISOString();
  try {
    const { data: agendas } = await loadAgendas();
    const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000);

    type Acc = {
      name: string;
      filings: number;
      recent: number;
      jurisdictions: Set<string>;
      lastSeen: string | null;
      signalTypes: Record<string, number>;
    };
    const devMap = new Map<string, Acc>();

    for (const item of agendas) {
      const name = item.developer?.trim();
      if (!name) continue;
      const id = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      if (!devMap.has(id)) {
        devMap.set(id, { name, filings: 0, recent: 0, jurisdictions: new Set(), lastSeen: null, signalTypes: {} });
      }
      const d = devMap.get(id)!;
      d.filings++;
      if (item.date && new Date(item.date) > cutoff) d.recent++;
      if (item.jurisdiction) d.jurisdictions.add(item.jurisdiction);
      if (!d.lastSeen || (item.date && item.date > d.lastSeen)) d.lastSeen = item.date;
      if (item.signalType) d.signalTypes[item.signalType] = (d.signalTypes[item.signalType] ?? 0) + 1;
    }

    const data: DeveloperSummary[] = Array.from(devMap.entries())
      .map(([id, d]) => ({
        id,
        name: d.name,
        totalFilings: d.filings,
        recentActivity: d.recent,
        jurisdictions: Array.from(d.jurisdictions),
        lastSeen: d.lastSeen,
        signalTypes: d.signalTypes as Partial<Record<SignalType, number>>,
      }))
      .sort((a, b) => b.recentActivity - a.recentActivity || b.totalFilings - a.totalFilings);

    return { data, freshness: "live", fetchedAt, count: data.length };
  } catch (err) {
    console.error("[csv-loader] loadDevelopers error:", err);
    return { data: [], freshness: "stale", fetchedAt, count: 0 };
  }
}

// ── /api/signal-wire ─────────────────────────────────────────────────────────

export async function loadSignalWire(): Promise<LoadResult<SignalWireItem[]>> {
  const fetchedAt = new Date().toISOString();
  try {
    const { data: agendas } = await loadAgendas();
    const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

    const data: SignalWireItem[] = agendas
      .filter((a) => a.date >= cutoff)
      .map((a) => ({
        id:           a.id,
        date:         a.date,
        source:       "Agenda" as const,
        jurisdiction: a.jurisdiction,
        headline:     a.title || `${a.itemType || "Item"} — ${a.jurisdiction}`,
        excerpt:      a.description,
        signal:       a.growthScore ?? 0,
        agendaId:     a.id,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    return { data, freshness: "live", fetchedAt, count: data.length };
  } catch (err) {
    console.error("[csv-loader] loadSignalWire error:", err);
    return { data: [], freshness: "stale", fetchedAt, count: 0 };
  }
}

// ── /api/digest ───────────────────────────────────────────────────────────────

export async function loadDigest(): Promise<LoadResult<DigestContent>> {
  const fetchedAt = new Date().toISOString();
  try {
    const [mdResult, costResult, scoresResult] = await Promise.allSettled([
      fetchRaw(`${TLI_BASE}/latest_digest.md`),
      fetchRaw(`${TLI_BASE}/api_costs.csv`),
      fetchRaw(`${TLI_BASE}/city_signal_scores.json`),
    ]);

    const markdown = mdResult.status === "fulfilled" ? mdResult.value : "";

    let itemCount: number | null = null;
    let totalCostUsd: number | null = null;
    if (costResult.status === "fulfilled") {
      const rows = parseCsv(costResult.value);
      const digestRow = [...rows].reverse().find((r) => r.script === "weekly_digest");
      if (digestRow) {
        itemCount    = digestRow.items   ? parseInt(digestRow.items, 10)     : null;
        totalCostUsd = digestRow.cost_usd ? parseFloat(digestRow.cost_usd)  : null;
      }
    }

    let cityScores: CityScore[] = [];
    if (scoresResult.status === "fulfilled") {
      try {
        const payload = JSON.parse(scoresResult.value) as {
          cities: Record<string, {
            city: string; growth_score: number; grade: string;
            total_signals: number; signal_counts: Record<string, number>;
            active_developers: string[]; most_recent_activity: string | null;
          }>;
        };
        cityScores = Object.values(payload.cities ?? {}).map((c) => ({
          city:               c.city,
          growthScore:        c.growth_score,
          grade:              (c.grade || "D") as "A" | "B" | "C" | "D",
          totalSignals:       c.total_signals,
          signalCounts:       (c.signal_counts ?? {}) as Partial<Record<SignalType, number>>,
          activeDevelopers:   c.active_developers ?? [],
          mostRecentActivity: c.most_recent_activity ?? null,
        }));
      } catch {
        // malformed JSON — proceed with empty scores
      }
    }

    const freshness: "live" | "stale" = markdown ? "live" : "stale";
    const data: DigestContent = { markdown, generatedAt: fetchedAt, itemCount, totalCostUsd, cityScores };
    return { data, freshness, fetchedAt, count: 1 };
  } catch (err) {
    console.error("[csv-loader] loadDigest error:", err);
    return {
      data: { markdown: "", generatedAt: null, itemCount: null, totalCostUsd: null, cityScores: [] },
      freshness: "stale",
      fetchedAt,
      count: 0,
    };
  }
}
