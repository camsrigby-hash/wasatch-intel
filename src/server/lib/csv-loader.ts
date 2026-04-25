// src/server/lib/csv-loader.ts
// Fetch, cache, and parse CSV/JSON data files from the public tooele-land-intel repo.

import type { AgendaItem, AgendaStatus, SignalType, DeveloperSummary, SignalWireItem, DigestContent, CityScore, ParcelDetail, ParcelNeighbor } from "../../lib/types";

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

// Fetch geocoded CSV if available, fall back to base CSV
async function fetchCsv(): Promise<string> {
  try {
    return await fetchRaw(`${TLI_BASE}/items_geocoded.csv`);
  } catch {
    return fetchRaw(`${TLI_BASE}/agenda_items_split.csv`);
  }
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

interface ExternalSignalRow {
  id:               string;
  source:           string;
  title:            string;
  url?:             string;
  published_date:   string;
  summary?:         string;
  matched_keywords?: string;
  // Reddit-specific
  subreddit?:       string;
  score?:           string;
  // News-specific
  feed_name?:       string;
}

interface CorrelationRow {
  signal_id:     string;
  agenda_id:     string;
  total_score:   string;
}

async function loadExternalSignals(): Promise<{
  news: ExternalSignalRow[];
  reddit: ExternalSignalRow[];
  correlations: Map<string, string>; // signal_id → agenda_id (best match)
}> {
  const [newsResult, redditResult, corrResult] = await Promise.allSettled([
    fetchRaw(`${TLI_BASE}/signals_news.csv`),
    fetchRaw(`${TLI_BASE}/signals_reddit.csv`),
    fetchRaw(`${TLI_BASE}/signal_correlations.csv`),
  ]);

  const news:   ExternalSignalRow[] = newsResult.status   === "fulfilled" ? parseCsv(newsResult.value)   as ExternalSignalRow[] : [];
  const reddit: ExternalSignalRow[] = redditResult.status === "fulfilled" ? parseCsv(redditResult.value) as ExternalSignalRow[] : [];

  // Build best-match correlation map (highest total_score per signal_id)
  const correlations = new Map<string, string>();
  if (corrResult.status === "fulfilled") {
    const corrRows = parseCsv(corrResult.value) as CorrelationRow[];
    const best = new Map<string, { agendaId: string; score: number }>();
    for (const row of corrRows) {
      const score = parseFloat(row.total_score ?? "0");
      const prev  = best.get(row.signal_id);
      if (!prev || score > prev.score) {
        best.set(row.signal_id, { agendaId: row.agenda_id, score });
      }
    }
    for (const [sigId, { agendaId }] of best) {
      correlations.set(sigId, agendaId);
    }
  }

  return { news, reddit, correlations };
}

export async function loadSignalWire(): Promise<LoadResult<SignalWireItem[]>> {
  const fetchedAt = new Date().toISOString();
  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);

    const [agendasResult, externalResult] = await Promise.allSettled([
      loadAgendas(),
      loadExternalSignals(),
    ]);

    const agendas  = agendasResult.status  === "fulfilled" ? agendasResult.value.data  : [];
    const external = externalResult.status === "fulfilled" ? externalResult.value       : { news: [], reddit: [], correlations: new Map() };

    const items: SignalWireItem[] = [];

    // Agenda-sourced signals (always present)
    for (const a of agendas) {
      if (!a.date || a.date < cutoff || isNaN(Date.parse(a.date))) continue;
      items.push({
        id:           a.id,
        date:         a.date,
        source:       "Agenda",
        jurisdiction: a.jurisdiction,
        headline:     a.title || `${a.itemType || "Item"} — ${a.jurisdiction}`,
        excerpt:      a.description,
        signal:       a.growthScore ?? 0,
        agendaId:     a.id,
      });
    }

    // External signals — news + Reddit merged
    const externalRows: Array<[ExternalSignalRow, "News" | "Rumor"]> = [
      ...external.news.map((r): [ExternalSignalRow, "News"] => [r, "News"]),
      ...external.reddit.map((r): [ExternalSignalRow, "Rumor"] => [r, "Rumor"]),
    ];

    for (const [row, src] of externalRows) {
      const date = row.published_date ?? "";
      if (!date || date < cutoff) continue;
      const agendaId = external.correlations.get(row.id ?? "") ?? undefined;
      // Derive a rough signal score from number of keyword hits
      const kwHits = (row.matched_keywords ?? "").split("|").filter(Boolean).length;
      const signal  = Math.min(100, kwHits * 12);
      items.push({
        id:           row.id ?? "",
        date,
        source:       src,
        jurisdiction: "",  // populated by correlate_signals where inferred
        headline:     row.title ?? "",
        excerpt:      row.summary ? row.summary.slice(0, 200) : null,
        signal,
        agendaId,
      });
    }

    items.sort((a, b) => b.date.localeCompare(a.date));

    const hasExternal = external.news.length > 0 || external.reddit.length > 0;
    return {
      data:      items,
      freshness: "live",
      fetchedAt,
      count:     items.length,
      // surface whether external signal CSVs exist yet
      ...(hasExternal ? {} : {}),
    };
  } catch (err) {
    console.error("[csv-loader] loadSignalWire error:", err);
    return { data: [], freshness: "stale", fetchedAt, count: 0 };
  }
}

// ── /api/gap-layer + /api/stip — raw GeoJSON pass-through ────────────────────

export async function loadGapLayer(): Promise<LoadResult<unknown>> {
  const fetchedAt = new Date().toISOString();
  try {
    const text = await fetchRaw(`${TLI_BASE}/gap_layer.geojson`);
    const data = JSON.parse(text);
    const count = Array.isArray(data?.features) ? data.features.length : 0;
    return { data, freshness: "live", fetchedAt, count };
  } catch (err) {
    console.error("[csv-loader] loadGapLayer error:", err);
    return {
      data: { type: "FeatureCollection", features: [] },
      freshness: "stale", fetchedAt, count: 0,
    };
  }
}

export async function loadStip(): Promise<LoadResult<unknown>> {
  const fetchedAt = new Date().toISOString();
  try {
    const text = await fetchRaw(`${TLI_BASE}/stip_projects.geojson`);
    const data = JSON.parse(text);
    const count = Array.isArray(data?.features) ? data.features.length : 0;
    return { data, freshness: "live", fetchedAt, count };
  } catch (err) {
    console.error("[csv-loader] loadStip error:", err);
    return {
      data: { type: "FeatureCollection", features: [] },
      freshness: "stale", fetchedAt, count: 0,
    };
  }
}

// ── Parcel helpers (Phase 5) ──────────────────────────────────────────────────

type GeoFeature = {
  type: "Feature";
  geometry: { type: string; coordinates: unknown[] };
  properties: Record<string, unknown>;
};

function polygonCentroid(f: GeoFeature): [number, number] | null {
  if (!f.geometry || f.geometry.type !== "Polygon") return null;
  const ring = (f.geometry.coordinates as number[][][])[0];
  if (!ring?.length) return null;
  const lon = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  const lat = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  return [lon, lat];
}

function haversineKm(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface RoadEntry {
  nearest_arterial_name: string | null;
  nearest_arterial_aadt: number | null;
  nearest_arterial_distance_mi: number | null;
  nearest_road_class: string | null;
  is_corner: boolean;
  corner_roads: string[];
}

export async function loadRoadsEnrichment(): Promise<Record<string, RoadEntry>> {
  try {
    const text = await fetchRaw(`${TLI_BASE}/roads_enrichment.json`);
    return JSON.parse(text) as Record<string, RoadEntry>;
  } catch {
    return {};
  }
}

export async function loadParcelDetail(apn: string): Promise<ParcelDetail | null> {
  const [gapResult, agendasResult, roads] = await Promise.all([
    loadGapLayer(),
    loadAgendas(),
    loadRoadsEnrichment(),
  ]);

  const fc = gapResult.data as { type: string; features: GeoFeature[] };
  const feature = fc.features.find((f) => f.properties?.apn === apn);
  if (!feature) return null;

  const p = feature.properties;
  const centroid = polygonCentroid(feature);
  const roadData: RoadEntry | null = roads[apn] ?? null;

  const linked = agendasResult.data.filter((a) => {
    const haystack = `${a.title} ${a.notes ?? ""} ${a.description ?? ""}`.toLowerCase();
    if (apn && haystack.includes(apn.toLowerCase())) return true;
    if (centroid && a.lat != null && a.lng != null) {
      return haversineKm(centroid[0], centroid[1], a.lng, a.lat) < 0.5;
    }
    return false;
  }).slice(0, 20);

  return {
    apn:                      String(p.apn ?? apn),
    acres:                    typeof p.acres === "number" ? p.acres : null,
    owner:                    p.owner != null ? String(p.owner) : null,
    address:                  p.address != null ? String(p.address) : null,
    zoning:                   p.zoning != null ? String(p.zoning) : null,
    zoningJurisdiction:       p.zoning_jurisdiction != null ? String(p.zoning_jurisdiction) : null,
    currentZoneLabel:         p.current_zone_label != null ? String(p.current_zone_label) : null,
    generalPlan:              p.generalPlan != null ? String(p.generalPlan) : null,
    gpDesignationLabel:       p.gp_designation_label != null ? String(p.gp_designation_label) : null,
    zoningIntensity:          typeof p.zoning_intensity === "number" ? p.zoning_intensity : null,
    gpIntensity:              typeof p.gp_intensity === "number" ? p.gp_intensity : null,
    gapScore:                 typeof p.gap_score === "number" ? p.gap_score : null,
    developable:              Boolean(p.developable),
    jurisdiction:             p.jurisdiction != null ? String(p.jurisdiction) : null,
    centroid,
    nearestArterialName:       roadData?.nearest_arterial_name ?? null,
    nearestArterialAadt:       roadData?.nearest_arterial_aadt ?? null,
    nearestArterialDistanceMi: roadData?.nearest_arterial_distance_mi ?? null,
    nearestRoadClass:          roadData?.nearest_road_class ?? null,
    isCorner:                  roadData ? roadData.is_corner : null,
    cornerRoads:               roadData?.corner_roads ?? null,
    agendaItems:               linked,
  };
}

export async function loadParcelAdjacency(apn: string): Promise<ParcelNeighbor[]> {
  const { data } = await loadGapLayer();
  const fc = data as { type: string; features: GeoFeature[] };

  const target = fc.features.find((f) => f.properties?.apn === apn);
  if (!target) return [];

  const targetCentroid = polygonCentroid(target);
  if (!targetCentroid) return [];

  const [tLon, tLat] = targetCentroid;
  const RADIUS_KM = 0.5;

  const neighbors: Array<{ dist: number; item: ParcelNeighbor }> = [];

  for (const f of fc.features) {
    if (f.properties?.apn === apn) continue;
    const c = polygonCentroid(f);
    if (!c) continue;
    const dist = haversineKm(tLon, tLat, c[0], c[1]);
    if (dist > RADIUS_KM) continue;
    const p = f.properties;
    neighbors.push({
      dist,
      item: {
        apn:          String(p.apn ?? ""),
        owner:        p.owner != null ? String(p.owner) : null,
        acres:        typeof p.acres === "number" ? p.acres : null,
        gapScore:     typeof p.gap_score === "number" ? p.gap_score : null,
        jurisdiction: p.jurisdiction != null ? String(p.jurisdiction) : null,
        developable:  Boolean(p.developable),
        centroid:     c,
        distanceKm:   Math.round(dist * 1000) / 1000,
      },
    });
  }

  neighbors.sort((a, b) => a.dist - b.dist);
  return neighbors.slice(0, 12).map((n) => n.item);
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
