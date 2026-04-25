import tanstack from "@tanstack/react-start/server-entry";
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
} from "./lib/d1-client";
import { runWatchlistCheck } from "./cron/watchlist-checker";
import type { CreateWatchlistPayload } from "../lib/types";

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

    if (request.method !== "GET" && !isParcelAnalyze && !isWatchlistMutation) {
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
        const result = await loadDevelopers();
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

    // ── /api/deals — empty until Phase 8 (D1) ────────────────────────────────
    if (url.pathname === "/api/deals") {
      return emptyOk("d1:deals:phase8");
    }

    return tanstack.fetch(request);
  },

  // Hourly cron: check watchlists against today's signal wire and fire alerts
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    await runWatchlistCheck(env);
  },
};
