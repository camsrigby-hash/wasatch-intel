import tanstack from "@tanstack/react-start/server-entry";
import {
  DEFAULT_PROFILES,
  ScoringProfileSchema,
  ParcelSchema,
  INTEL_PARCELS,
  scoreFor,
} from "../lib/parcel-intel";
import {
  loadAgendas,
  loadDevelopers,
  loadSignalWire,
  loadDigest,
  loadGapLayer,
  loadStip,
  loadParcelDetail,
  loadParcelAdjacency,
} from "./lib/csv-loader";
import { analyzeOpportunity } from "./lib/analyze";
import type { Env } from "./lib/d1-client";
import {
  getWatchlists,
  getWatchlist,
  createWatchlist,
  updateWatchlist,
  deleteWatchlist,
  getWatchlistHits,
  getDeals,
  getDeal,
  createDeal,
  updateDeal,
  deleteDeal,
  getDealNotes,
  createDealNote,
  getDealContacts,
  createDealContact,
  getLatestCronRuns,
} from "./lib/d1-client";
import { runWatchlistCheck } from "./cron/watchlist-checker";
import type { CreateWatchlistPayload, CreateDealPayload } from "../lib/types";

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=300",
} as const;

const NO_CACHE_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-cache",
} as const;

function ok<T>(data: T, meta: Record<string, unknown>, errors: string[] = []): Response {
  return new Response(JSON.stringify({ data, meta, errors }), { status: 200, headers: JSON_HEADERS });
}

function okNoCache<T>(data: T, meta: Record<string, unknown>): Response {
  return new Response(JSON.stringify({ data, meta, errors: [] }), { status: 200, headers: NO_CACHE_HEADERS });
}

function err400(msg: string): Response {
  return new Response(JSON.stringify({ error: msg }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
}

function err404(msg: string): Response {
  return new Response(JSON.stringify({ error: msg }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
}

function err500(): Response {
  return new Response(JSON.stringify({ error: "Internal server error" }), {
    status: 500,
    headers: { "Content-Type": "application/json" },
  });
}

function emptyOk(source: string): Response {
  return new Response(
    JSON.stringify({
      data: [],
      meta: { source, freshness: "live", count: 0, fetchedAt: new Date().toISOString() },
      errors: [],
    }),
    { status: 200, headers: NO_CACHE_HEADERS },
  );
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Guard: only let through GETs and specific mutation paths — everything else goes to TanStack SSR.
    // The POST parcel/analyze guard must check path (not just method) because TanStack's SSR also
    // accepts POST (form actions). The watchlist mutations likewise need explicit path checks.
    const isParcelAnalyze =
      url.pathname.startsWith("/api/parcel/") &&
      url.pathname.endsWith("/analyze") &&
      request.method === "POST";

    const isWatchlistMutation =
      url.pathname.startsWith("/api/watchlists") &&
      (request.method === "POST" || request.method === "PATCH" || request.method === "DELETE");

    const isDealMutation =
      url.pathname.startsWith("/api/deals") &&
      (request.method === "POST" || request.method === "PATCH" || request.method === "DELETE");

    const isPipelineOrProfileMutation =
      (url.pathname.startsWith("/api/pipeline") || url.pathname === "/api/profiles" ||
       (url.pathname.startsWith("/api/parcels/") && url.pathname.endsWith("/refresh"))) &&
      (request.method === "POST" || request.method === "PATCH" || request.method === "DELETE");

    const isTileRequest = url.pathname.startsWith("/tiles/");
    const isTileMethod = request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS";

    if (request.method !== "GET" && !isParcelAnalyze && !isWatchlistMutation && !isDealMutation && !isPipelineOrProfileMutation && !(isTileRequest && isTileMethod)) {
      return tanstack.fetch(request);
    }

    // ── /api/agendas ──────────────────────────────────────────────────────────
    if (url.pathname === "/api/agendas") {
      try {
        const result = await loadAgendas();
        return ok(
          result.data,
          {
            source: "https://raw.githubusercontent.com/camsrigby-hash/tooele-land-intel/main/data/agenda_items_split.csv",
            freshness: result.freshness,
            count: result.count,
            fetchedAt: result.fetchedAt,
          },
          result.freshness === "stale" ? ["Upstream CSV unavailable; returning empty dataset"] : [],
        );
      } catch { return err500(); }
    }

    // ── /api/digest ───────────────────────────────────────────────────────────
    if (url.pathname === "/api/digest") {
      try {
        const result = await loadDigest();
        return ok(
          result.data,
          {
            source: "https://raw.githubusercontent.com/camsrigby-hash/tooele-land-intel/main/data/latest_digest.md",
            freshness: result.freshness,
            count: result.count,
            fetchedAt: result.fetchedAt,
          },
          result.freshness === "stale" ? ["Digest unavailable"] : [],
        );
      } catch { return err500(); }
    }

    // ── /api/developers ───────────────────────────────────────────────────────
    if (url.pathname === "/api/developers") {
      try {
        const includeSignage = url.searchParams.get("include_signage") === "1";
        const result = await loadDevelopers({ includeSignage });
        return ok(
          result.data,
          {
            source: "derived:agenda_items_split.csv",
            freshness: result.freshness,
            count: result.count,
            fetchedAt: result.fetchedAt,
          },
          result.freshness === "stale" ? ["Developer data unavailable"] : [],
        );
      } catch { return err500(); }
    }

    // ── /api/signal-wire ──────────────────────────────────────────────────────
    if (url.pathname === "/api/signal-wire") {
      try {
        const result = await loadSignalWire();
        return ok(
          result.data,
          {
            source: "merged:agendas+signals_news+signals_reddit:last-30d",
            freshness: result.freshness,
            count: result.count,
            fetchedAt: result.fetchedAt,
          },
          result.freshness === "stale" ? ["Signal wire unavailable"] : [],
        );
      } catch { return err500(); }
    }

    // ── /api/parcels — empty list (per-parcel via /api/parcel/:apn) ───────────
    if (url.pathname === "/api/parcels") {
      return emptyOk("phase5:per-parcel-endpoint");
    }

    // ── /api/cron-status ─────────────────────────────────────────────────────
    // Aggregates: D1 cron_runs (Worker crons) + GHA heartbeat JSON files in tooele-land-intel
    if (url.pathname === "/api/cron-status") {
      try {
        const fetchedAt = new Date().toISOString();
        const expected: Record<string, { cron: string; intervalMs: number; description: string }> = {
          "watchlist-checker": { cron: "0 * * * *",  intervalMs: 60 * 60 * 1000,         description: "hourly" },
          "weekly-digest":     { cron: "0 14 * * 1", intervalMs: 7 * 24 * 60 * 60 * 1000, description: "Mondays 14:00 UTC" },
          "signals":           { cron: "0 14 * * *", intervalMs: 24 * 60 * 60 * 1000,    description: "daily 14:00 UTC" },
          "gap-layer":         { cron: "0 9 1 * *",  intervalMs: 30 * 24 * 60 * 60 * 1000, description: "monthly" },
          "geocode":           { cron: "post-digest", intervalMs: 7 * 24 * 60 * 60 * 1000, description: "after weekly-digest" },
          "extract-parcels":   { cron: "post-geocode", intervalMs: 7 * 24 * 60 * 60 * 1000, description: "after geocode" },
        };

        // Worker-cron rows from D1
        const d1Runs = env.DB ? await getLatestCronRuns(env.DB).catch(() => []) : [];

        // GHA heartbeat files from tooele-land-intel
        const heartbeatBase = "https://raw.githubusercontent.com/camsrigby-hash/tooele-land-intel/main/data/cron_status";
        const ghaWorkflows = ["weekly-digest", "signals", "gap-layer", "geocode", "extract-parcels"];
        type Heartbeat = {
          workflow_name?: string;
          ran_at: string;
          status: "success" | "failure" | "partial";
          duration_ms?: number | null;
          items_processed?: number | null;
          notes?: string | null;
        };
        const ghaPayloads = new Map<string, Heartbeat>();
        await Promise.all(
          ghaWorkflows.map(async (name) => {
            try {
              const r = await fetch(`${heartbeatBase}/${name}.json`);
              if (!r.ok) return;
              ghaPayloads.set(name, (await r.json()) as Heartbeat);
            } catch {
              // No heartbeat yet — leave unknown
            }
          }),
        );

        type Health = "ok" | "warn" | "fail" | "unknown";
        const data = Object.entries(expected).map(([name, cfg]) => {
          const d1 = d1Runs.find((r) => r.workflowName === name);
          const gha = ghaPayloads.get(name);

          const ranAt     = d1?.ranAt          ?? gha?.ran_at          ?? null;
          const rawStatus = d1?.status         ?? gha?.status          ?? null;
          const items     = d1?.itemsProcessed ?? gha?.items_processed ?? null;
          const notes     = d1?.notes          ?? gha?.notes           ?? null;
          const duration  = d1?.durationMs     ?? gha?.duration_ms     ?? null;

          let health: Health = "unknown";
          if (rawStatus === "failure") health = "fail";
          else if (ranAt) {
            const age = Date.now() - new Date(ranAt).getTime();
            if (age > cfg.intervalMs * 2) health = "warn";
            else health = rawStatus === "partial" ? "warn" : "ok";
          }

          return {
            workflow:       name,
            description:    cfg.description,
            cron:           cfg.cron,
            ranAt,
            status:         rawStatus,
            health,
            durationMs:     duration,
            itemsProcessed: items,
            notes,
          };
        });

        return ok(data, {
          source: "d1:cron_runs + gha-heartbeats",
          freshness: "live",
          count: data.length,
          fetchedAt,
        });
      } catch { return err500(); }
    }

    // ── /api/gap-layer ────────────────────────────────────────────────────────
    if (url.pathname === "/api/gap-layer") {
      try {
        const result = await loadGapLayer();
        return ok(
          result.data,
          {
            source: "https://raw.githubusercontent.com/camsrigby-hash/tooele-land-intel/main/data/gap_layer.geojson",
            freshness: result.freshness,
            count: result.count,
            fetchedAt: result.fetchedAt,
          },
          result.freshness === "stale" ? ["Gap layer unavailable upstream"] : [],
        );
      } catch { return err500(); }
    }

    // ── /api/stip ─────────────────────────────────────────────────────────────
    if (url.pathname === "/api/stip") {
      try {
        const result = await loadStip();
        return ok(
          result.data,
          {
            source: "https://raw.githubusercontent.com/camsrigby-hash/tooele-land-intel/main/data/stip_projects.geojson",
            freshness: result.freshness,
            count: result.count,
            fetchedAt: result.fetchedAt,
          },
          result.freshness === "stale" ? ["STIP unavailable upstream"] : [],
        );
      } catch { return err500(); }
    }

    // ── /api/parcel/:apn, /api/parcel/:apn/adjacency, POST /api/parcel/:apn/analyze ─
    if (url.pathname.startsWith("/api/parcel/")) {
      const parts = url.pathname.split("/").filter(Boolean); // ["api","parcel",apn,?action]
      const apn    = parts[2] ? decodeURIComponent(parts[2]) : null;
      const action = parts[3] ?? null;

      if (!apn) return err400("Missing APN");

      if (!action && request.method === "GET") {
        try {
          const detail = await loadParcelDetail(apn);
          if (!detail) return err404(`Parcel not found: ${apn}`);
          return ok(detail, { source: "gap_layer.geojson+items_geocoded.csv", freshness: "live", count: 1, fetchedAt: new Date().toISOString() });
        } catch { return err500(); }
      }

      if (action === "adjacency" && request.method === "GET") {
        try {
          const neighbors = await loadParcelAdjacency(apn);
          return ok(neighbors, { source: "gap_layer.geojson", freshness: "live", count: neighbors.length, fetchedAt: new Date().toISOString() });
        } catch { return err500(); }
      }

      if (action === "analyze" && request.method === "POST") {
        try {
          const detail = await loadParcelDetail(apn);
          if (!detail) return err404(`Parcel not found: ${apn}`);
          const analysis = analyzeOpportunity(detail);
          return ok(analysis, { source: "gap_layer.geojson:simplified-analysis", freshness: "live", count: 1, fetchedAt: new Date().toISOString() });
        } catch { return err500(); }
      }
    }

    // ── /api/watchlists — D1-backed CRUD (Phase 7) ───────────────────────────

    // GET /api/watchlists — list all
    if (url.pathname === "/api/watchlists" && request.method === "GET") {
      if (!env.DB) return emptyOk("d1:watchlists:not-configured");
      try {
        const watchlists = await getWatchlists(env.DB);
        return okNoCache(watchlists, {
          source: "d1:watchlists",
          freshness: "live",
          count: watchlists.length,
          fetchedAt: new Date().toISOString(),
        });
      } catch { return err500(); }
    }

    // POST /api/watchlists — create
    if (url.pathname === "/api/watchlists" && request.method === "POST") {
      if (!env.DB) return err500();
      try {
        const body = await request.json() as CreateWatchlistPayload;
        if (!body.name || !body.type || !body.criteria) return err400("name, type, and criteria required");
        const watchlist = await createWatchlist(env.DB, body);
        return okNoCache(watchlist, { source: "d1:watchlists", freshness: "live", count: 1, fetchedAt: new Date().toISOString() });
      } catch { return err500(); }
    }

    // PATCH/DELETE /api/watchlists/:id
    if (url.pathname.startsWith("/api/watchlists/")) {
      const parts = url.pathname.split("/").filter(Boolean); // ["api","watchlists",id,?sub]
      const id  = parts[2] ? decodeURIComponent(parts[2]) : null;
      const sub = parts[3] ?? null;

      if (!id) return err400("Missing watchlist id");

      // GET /api/watchlists/:id/hits
      if (sub === "hits" && request.method === "GET") {
        if (!env.DB) return emptyOk("d1:watchlists:not-configured");
        try {
          const limitParam = url.searchParams.get("limit");
          const limit = limitParam ? Math.min(parseInt(limitParam, 10), 200) : 50;
          const hits = await getWatchlistHits(env.DB, id, limit);
          return okNoCache(hits, { source: "d1:watchlist_hits", freshness: "live", count: hits.length, fetchedAt: new Date().toISOString() });
        } catch { return err500(); }
      }

      // PATCH /api/watchlists/:id — update
      if (request.method === "PATCH") {
        if (!env.DB) return err500();
        try {
          const patch = await request.json() as Partial<CreateWatchlistPayload>;
          const updated = await updateWatchlist(env.DB, id, patch);
          if (!updated) return err404(`Watchlist not found: ${id}`);
          return okNoCache(updated, { source: "d1:watchlists", freshness: "live", count: 1, fetchedAt: new Date().toISOString() });
        } catch { return err500(); }
      }

      // DELETE /api/watchlists/:id
      if (request.method === "DELETE") {
        if (!env.DB) return err500();
        try {
          const ok_ = await deleteWatchlist(env.DB, id);
          if (!ok_) return err404(`Watchlist not found: ${id}`);
          return new Response(null, { status: 204 });
        } catch { return err500(); }
      }

      // GET /api/watchlists/:id — single watchlist
      if (request.method === "GET") {
        if (!env.DB) return err500();
        try {
          const watchlist = await getWatchlist(env.DB, id);
          if (!watchlist) return err404(`Watchlist not found: ${id}`);
          return okNoCache(watchlist, { source: "d1:watchlists", freshness: "live", count: 1, fetchedAt: new Date().toISOString() });
        } catch { return err500(); }
      }
    }

    // ── /api/deals — D1-backed CRUD (Phase 8) ────────────────────────────────

    // GET /api/deals — list active deals
    if (url.pathname === "/api/deals" && request.method === "GET") {
      if (!env.DB) return emptyOk("d1:deals:not-configured");
      try {
        const deals = await getDeals(env.DB);
        return okNoCache(deals, { source: "d1:deals", freshness: "live", count: deals.length, fetchedAt: new Date().toISOString() });
      } catch { return err500(); }
    }

    // POST /api/deals — create
    if (url.pathname === "/api/deals" && request.method === "POST") {
      if (!env.DB) return err500();
      try {
        const body = await request.json() as CreateDealPayload;
        if (!body.parcelApn) return err400("parcelApn required");
        const deal = await createDeal(env.DB, body);
        return okNoCache(deal, { source: "d1:deals", freshness: "live", count: 1, fetchedAt: new Date().toISOString() });
      } catch { return err500(); }
    }

    // PATCH/DELETE/sub-routes on /api/deals/:id
    if (url.pathname.startsWith("/api/deals/")) {
      const parts = url.pathname.split("/").filter(Boolean); // ["api","deals",id,?sub,?subsub]
      const id  = parts[2] ? decodeURIComponent(parts[2]) : null;
      const sub = parts[3] ?? null;

      if (!id) return err400("Missing deal id");

      // GET /api/deals/:id/notes
      if (sub === "notes" && request.method === "GET") {
        if (!env.DB) return emptyOk("d1:deal_notes:not-configured");
        try {
          const notes = await getDealNotes(env.DB, id);
          return okNoCache(notes, { source: "d1:deal_notes", freshness: "live", count: notes.length, fetchedAt: new Date().toISOString() });
        } catch { return err500(); }
      }

      // POST /api/deals/:id/notes
      if (sub === "notes" && request.method === "POST") {
        if (!env.DB) return err500();
        try {
          const body = await request.json() as { body: string };
          if (!body.body?.trim()) return err400("body required");
          const note = await createDealNote(env.DB, id, body.body.trim());
          return okNoCache(note, { source: "d1:deal_notes", freshness: "live", count: 1, fetchedAt: new Date().toISOString() });
        } catch { return err500(); }
      }

      // GET /api/deals/:id/contacts
      if (sub === "contacts" && request.method === "GET") {
        if (!env.DB) return emptyOk("d1:deal_contacts:not-configured");
        try {
          const contacts = await getDealContacts(env.DB, id);
          return okNoCache(contacts, { source: "d1:deal_contacts", freshness: "live", count: contacts.length, fetchedAt: new Date().toISOString() });
        } catch { return err500(); }
      }

      // POST /api/deals/:id/contacts
      if (sub === "contacts" && request.method === "POST") {
        if (!env.DB) return err500();
        try {
          const body = await request.json() as { name: string; role?: string; phone?: string; email?: string };
          if (!body.name?.trim()) return err400("name required");
          const contact = await createDealContact(env.DB, id, body);
          return okNoCache(contact, { source: "d1:deal_contacts", freshness: "live", count: 1, fetchedAt: new Date().toISOString() });
        } catch { return err500(); }
      }

      // PATCH /api/deals/:id — update (esp. stage transitions)
      if (!sub && request.method === "PATCH") {
        if (!env.DB) return err500();
        try {
          const patch = await request.json() as Partial<Omit<import("../lib/types").Deal, "id" | "createdAt">>;
          const updated = await updateDeal(env.DB, id, patch);
          if (!updated) return err404(`Deal not found: ${id}`);
          return okNoCache(updated, { source: "d1:deals", freshness: "live", count: 1, fetchedAt: new Date().toISOString() });
        } catch { return err500(); }
      }

      // DELETE /api/deals/:id — soft delete (→ Closed/Dead)
      if (!sub && request.method === "DELETE") {
        if (!env.DB) return err500();
        try {
          const ok_ = await deleteDeal(env.DB, id);
          if (!ok_) return err404(`Deal not found: ${id}`);
          return new Response(null, { status: 204 });
        } catch { return err500(); }
      }

      // GET /api/deals/:id — single deal
      if (!sub && request.method === "GET") {
        if (!env.DB) return err500();
        try {
          const deal = await getDeal(env.DB, id);
          if (!deal) return err404(`Deal not found: ${id}`);
          return okNoCache(deal, { source: "d1:deals", freshness: "live", count: 1, fetchedAt: new Date().toISOString() });
        } catch { return err500(); }
      }
    }

    // ── Phase 11: pipeline-rebuild API stubs (mocked, Zod-validated) ─────────────
    // Frontend does NOT yet call these; IntelProvider reads in-memory mocks.
    // Phase 14 wires the frontend to these endpoints.

    // GET /api/profiles — list all scoring profiles
    if (url.pathname === "/api/profiles" && request.method === "GET") {
      const profiles = DEFAULT_PROFILES.map((p) => ScoringProfileSchema.parse(p));
      return okNoCache(profiles, { source: "mock:scoring_profiles", freshness: "live", count: profiles.length, fetchedAt: new Date().toISOString() });
    }

    // POST /api/profiles — create custom profile
    if (url.pathname === "/api/profiles" && request.method === "POST") {
      try {
        const body = await request.json();
        const parsed = ScoringProfileSchema.safeParse(body);
        if (!parsed.success) return err400("Invalid profile: " + JSON.stringify(parsed.error.flatten()));
        return okNoCache({ ...parsed.data, id: `custom-${Date.now()}` }, {
          source: "mock:scoring_profiles", freshness: "live", count: 1, fetchedAt: new Date().toISOString(),
        });
      } catch { return err400("Invalid JSON"); }
    }

    // GET /api/parcels/search?q=
    if (url.pathname === "/api/parcels/search" && request.method === "GET") {
      const q = url.searchParams.get("q")?.toLowerCase() ?? "";
      const results = INTEL_PARCELS
        .filter((p) => p.id.toLowerCase().includes(q) || p.address?.toLowerCase().includes(q) || p.jurisdiction.toLowerCase().includes(q))
        .slice(0, 20)
        .map((p) => ParcelSchema.parse({
          id: p.id, address: p.address, jurisdiction: p.jurisdiction, county: p.county,
          acreage: p.acres, centroid: p.centroid, zoning_current: p.zoning,
          zoning_gp: p.generalPlan, vacancy_status: p.vacancy_status,
          is_corner: p.is_corner, bldg_sqft: p.bldg_sqft, built_yr: p.built_yr,
          spread: p.spread, in_pipeline: p.in_pipeline, pipeline_stage: p.pipeline_stage,
          days_in_stage: p.days_in_stage,
        }));
      return okNoCache(results, { source: "mock:parcel_records:search", freshness: "live", count: results.length, fetchedAt: new Date().toISOString() });
    }

    // GET /api/parcels?bbox=&profile=&filters=
    if (url.pathname === "/api/parcels" && request.method === "GET" && url.searchParams.has("bbox")) {
      const profileId = url.searchParams.get("profile") ?? "generic-commercial";
      const profile = DEFAULT_PROFILES.find((p) => p.id === profileId) ?? DEFAULT_PROFILES[2];
      const parcels = INTEL_PARCELS.slice(0, 50).map((p) => ParcelSchema.parse({
        id: p.id, address: p.address, jurisdiction: p.jurisdiction, county: p.county,
        acreage: p.acres, centroid: p.centroid, zoning_current: p.zoning,
        zoning_gp: p.generalPlan, vacancy_status: p.vacancy_status,
        is_corner: p.is_corner, bldg_sqft: p.bldg_sqft, built_yr: p.built_yr,
        spread: p.spread, in_pipeline: p.in_pipeline, pipeline_stage: p.pipeline_stage,
        days_in_stage: p.days_in_stage,
      }));
      return okNoCache(parcels, { source: "mock:parcel_records", freshness: "live", count: parcels.length, fetchedAt: new Date().toISOString() });
    }

    // GET /api/parcels/:id?profile=
    if (url.pathname.startsWith("/api/parcels/") && request.method === "GET") {
      const pathParts = url.pathname.split("/").filter(Boolean);
      const parcelId = pathParts[2];
      // Only handle if this isn't the /search path and no further sub-resource
      if (parcelId && parcelId !== "search" && !pathParts[3]) {
        const parcel = INTEL_PARCELS.find((p) => p.id === parcelId || p.apn === parcelId);
        if (!parcel) return err404(`Parcel not found: ${parcelId}`);
        const profileId = url.searchParams.get("profile") ?? "generic-commercial";
        const profile = DEFAULT_PROFILES.find((p) => p.id === profileId) ?? DEFAULT_PROFILES[2];
        const score = scoreFor(parcel, profile);
        return okNoCache(
          { ...ParcelSchema.parse({
            id: parcel.id, address: parcel.address, jurisdiction: parcel.jurisdiction, county: parcel.county,
            acreage: parcel.acres, centroid: parcel.centroid, zoning_current: parcel.zoning,
            zoning_gp: parcel.generalPlan, vacancy_status: parcel.vacancy_status,
            is_corner: parcel.is_corner, bldg_sqft: parcel.bldg_sqft, built_yr: parcel.built_yr,
            spread: parcel.spread, in_pipeline: parcel.in_pipeline, pipeline_stage: parcel.pipeline_stage,
            days_in_stage: parcel.days_in_stage,
          }), score },
          { source: "mock:parcel_records", freshness: "live", count: 1, fetchedAt: new Date().toISOString() },
        );
      }
    }

    // GET /api/pipeline — list pipeline parcels
    if (url.pathname === "/api/pipeline" && request.method === "GET") {
      const pipeline = INTEL_PARCELS.filter((p) => p.in_pipeline).map((p) => ({
        parcel_id: p.id, stage: p.pipeline_stage, outcome: p.outcome,
        saved_at: p.saved_at, days_in_stage: p.days_in_stage, notes: p.notes,
      }));
      return okNoCache(pipeline, { source: "mock:pipeline_entries", freshness: "live", count: pipeline.length, fetchedAt: new Date().toISOString() });
    }

    // POST /api/pipeline — save parcel to pipeline
    if (url.pathname === "/api/pipeline" && request.method === "POST") {
      try {
        const body = await request.json() as { parcel_id: string; stage?: string };
        if (!body.parcel_id) return err400("parcel_id required");
        const entry = { parcel_id: body.parcel_id, stage: body.stage ?? "prospect", saved_at: new Date().toISOString() };
        return new Response(JSON.stringify({ data: entry, meta: { source: "mock:pipeline_entries", freshness: "live" }, errors: [] }), {
          status: 201, headers: { "Content-Type": "application/json" },
        });
      } catch { return err400("Invalid JSON"); }
    }

    // PATCH /api/pipeline/:parcel_id — update stage/notes
    if (url.pathname.startsWith("/api/pipeline/") && request.method === "PATCH") {
      const parcelId = url.pathname.split("/").filter(Boolean)[2];
      if (!parcelId) return err400("Missing parcel_id");
      try {
        const body = await request.json() as { stage?: string; notes?: string; outcome?: string };
        const parcel = INTEL_PARCELS.find((p) => p.id === parcelId);
        if (!parcel) return err404(`Pipeline entry not found: ${parcelId}`);
        return okNoCache({ parcel_id: parcelId, ...body }, { source: "mock:pipeline_entries", freshness: "live", count: 1, fetchedAt: new Date().toISOString() });
      } catch { return err400("Invalid JSON"); }
    }

    // DELETE /api/pipeline/:parcel_id — remove from pipeline
    if (url.pathname.startsWith("/api/pipeline/") && request.method === "DELETE") {
      const parcelId = url.pathname.split("/").filter(Boolean)[2];
      if (!parcelId) return err400("Missing parcel_id");
      const parcel = INTEL_PARCELS.find((p) => p.id === parcelId);
      if (!parcel) return err404(`Pipeline entry not found: ${parcelId}`);
      return new Response(null, { status: 204 });
    }

    // POST /api/parcels/:id/refresh — trigger enrichment (stub)
    if (url.pathname.startsWith("/api/parcels/") && url.pathname.endsWith("/refresh") && request.method === "POST") {
      const parcelId = url.pathname.split("/").filter(Boolean)[2];
      if (!parcelId) return err400("Missing parcel id");
      return okNoCache({ parcel_id: parcelId, status: "queued", message: "Enrichment stub — Phase 13 wires real data" }, {
        source: "mock:enrichment_queue", freshness: "live", count: 1, fetchedAt: new Date().toISOString(),
      });
    }

    // ── /tiles/:filename — R2-backed tile serving with HTTP Range support ────
    // Serves PMTiles archives (and any other range-served R2 objects) from the
    // wasatch-intel-tiles bucket via the TILES binding. Required for MapLibre
    // pmtiles:// protocol — pmtiles.js uses Range requests to read the archive
    // header, directory pages, and individual tile bytes without downloading
    // the full file. CORS open ('*') because the static frontend is served
    // from the same Worker, but anonymous tile fetches are safe (public data).
    if (isTileRequest) {
      if (!env.TILES) return err500();

      const key = decodeURIComponent(url.pathname.slice("/tiles/".length));
      if (!key || key.includes("..")) return err400("Invalid tile key");

      const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "Range, If-None-Match",
        "Access-Control-Expose-Headers": "Content-Range, Content-Length, ETag, Accept-Ranges",
      } as const;

      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
      }

      // Parse Range header — pmtiles only emits "bytes=start-end" (closed range).
      const rangeHeader = request.headers.get("Range");
      let range: { offset: number; length: number } | undefined;
      if (rangeHeader) {
        const match = /^bytes=(\d+)-(\d*)$/.exec(rangeHeader);
        if (!match) {
          return new Response("Invalid Range header", { status: 416, headers: corsHeaders });
        }
        const start = parseInt(match[1], 10);
        const endStr = match[2];
        if (endStr === "") {
          // Open-ended "bytes=N-" — fetch everything from N. Resolve length via head().
          const head = await env.TILES.head(key);
          if (!head) return err404(`Tile object not found: ${key}`);
          range = { offset: start, length: head.size - start };
        } else {
          const end = parseInt(endStr, 10);
          if (end < start) return new Response("Invalid Range", { status: 416, headers: corsHeaders });
          range = { offset: start, length: end - start + 1 };
        }
      }

      if (request.method === "HEAD") {
        const head = await env.TILES.head(key);
        if (!head) return err404(`Tile object not found: ${key}`);
        return new Response(null, {
          status: 200,
          headers: {
            ...corsHeaders,
            "Accept-Ranges": "bytes",
            "Content-Length": String(head.size),
            "Content-Type": head.httpMetadata?.contentType ?? "application/octet-stream",
            "Cache-Control": "public, max-age=86400",
            "ETag": head.httpEtag,
          },
        });
      }

      const obj = range
        ? await env.TILES.get(key, { range: { offset: range.offset, length: range.length } })
        : await env.TILES.get(key);

      if (!obj) return err404(`Tile object not found: ${key}`);

      const totalSize = obj.size;
      const headers: Record<string, string> = {
        ...corsHeaders,
        "Accept-Ranges": "bytes",
        "Content-Type": obj.httpMetadata?.contentType ?? "application/octet-stream",
        "Cache-Control": "public, max-age=86400",
        "ETag": obj.httpEtag,
      };

      if (range) {
        const start = range.offset;
        const end = start + range.length - 1;
        headers["Content-Range"] = `bytes ${start}-${end}/${totalSize}`;
        headers["Content-Length"] = String(range.length);
        return new Response(obj.body, { status: 206, headers });
      }

      headers["Content-Length"] = String(totalSize);
      return new Response(obj.body, { status: 200, headers });
    }

    return tanstack.fetch(request);
  },

  // Hourly cron: check watchlists against today's signal wire and fire alerts
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    await runWatchlistCheck(env);
  },
};
