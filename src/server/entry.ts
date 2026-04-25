import tanstack from "@tanstack/react-start/server-entry";
import { loadAgendas, loadDevelopers, loadSignalWire, loadDigest, loadGapLayer, loadStip, loadParcelDetail, loadParcelAdjacency } from "./lib/csv-loader";
import { analyzeOpportunity } from "./lib/analyze";

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
  async fetch(request: Request, env: unknown, ctx: unknown): Promise<Response> {
    const url = new URL(request.url);

    const isParcelAnalyze =
      url.pathname.startsWith("/api/parcel/") &&
      url.pathname.endsWith("/analyze") &&
      request.method === "POST";

    if (request.method !== "GET" && !isParcelAnalyze) {
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

    // ── /api/parcels — empty until Phase 5 (per-parcel deep dive) ────────────
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

      if (!apn) return new Response(JSON.stringify({ error: "Missing APN" }), { status: 400, headers: { "Content-Type": "application/json" } });

      // GET /api/parcel/:apn
      if (!action && request.method === "GET") {
        try {
          const detail = await loadParcelDetail(apn);
          if (!detail) return new Response(JSON.stringify({ error: "Parcel not found", apn }), { status: 404, headers: { "Content-Type": "application/json" } });
          return ok(detail, { source: "gap_layer.geojson+items_geocoded.csv", freshness: "live", count: 1, fetchedAt: new Date().toISOString() });
        } catch { return err500(); }
      }

      // GET /api/parcel/:apn/adjacency
      if (action === "adjacency" && request.method === "GET") {
        try {
          const neighbors = await loadParcelAdjacency(apn);
          return ok(neighbors, { source: "gap_layer.geojson", freshness: "live", count: neighbors.length, fetchedAt: new Date().toISOString() });
        } catch { return err500(); }
      }

      // POST /api/parcel/:apn/analyze
      if (action === "analyze" && request.method === "POST") {
        try {
          const detail = await loadParcelDetail(apn);
          if (!detail) return new Response(JSON.stringify({ error: "Parcel not found", apn }), { status: 404, headers: { "Content-Type": "application/json" } });
          const analysis = analyzeOpportunity(detail);
          return ok(analysis, { source: "gap_layer.geojson:simplified-analysis", freshness: "live", count: 1, fetchedAt: new Date().toISOString() });
        } catch { return err500(); }
      }
    }

    // ── /api/watchlists — empty until Phase 7 (D1) ───────────────────────────
    if (url.pathname === "/api/watchlists") {
      return emptyOk("d1:watchlists:phase7");
    }

    // ── /api/deals — empty until Phase 8 (D1) ────────────────────────────────
    if (url.pathname === "/api/deals") {
      return emptyOk("d1:deals:phase8");
    }

    return tanstack.fetch(request);
  },
};
