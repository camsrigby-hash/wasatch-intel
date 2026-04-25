import tanstack from "@tanstack/react-start/server-entry";
import { loadAgendas, loadDevelopers, loadSignalWire, loadDigest, loadGapLayer, loadStip } from "./lib/csv-loader";

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

    if (request.method !== "GET") {
      return tanstack.fetch(request, env, ctx);
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
            source: "derived:agenda_items_split.csv:last-30d",
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

    // ── /api/watchlists — empty until Phase 7 (D1) ───────────────────────────
    if (url.pathname === "/api/watchlists") {
      return emptyOk("d1:watchlists:phase7");
    }

    // ── /api/deals — empty until Phase 8 (D1) ────────────────────────────────
    if (url.pathname === "/api/deals") {
      return emptyOk("d1:deals:phase8");
    }

    return tanstack.fetch(request, env, ctx);
  },
};
