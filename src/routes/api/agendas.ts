// src/routes/api/agendas.ts
// GET /api/agendas — returns real Erda + Grantsville agenda items from CSV.
//
// Uses TanStack Start API file routes (createAPIFileRoute) rather than a
// standalone Hono entry. This avoids touching the @lovable.dev/vite-tanstack-config
// entry point (KNOWN GOTCHA #4 in PROJECT_STATE.md).
//
// Decision: Hono deferred to Phase 7 when D1 bindings are wired. For the
// stateless CSV-backed endpoint, TanStack API file routes are equivalent.

import { createAPIFileRoute } from "@tanstack/react-start/api";
import { loadAgendas } from "../../server/lib/csv-loader";

export const APIRoute = createAPIFileRoute("/api/agendas")({
  GET: async () => {
    const result = await loadAgendas();

    const body = JSON.stringify({
      data:   result.data,
      meta:   {
        source:    "https://raw.githubusercontent.com/camsrigby-hash/tooele-land-intel/main/data/agenda_items_split.csv",
        freshness: result.freshness,
        count:     result.count,
        fetchedAt: result.fetchedAt,
      },
      errors: result.freshness === "stale" ? ["Upstream CSV unavailable; returning empty dataset"] : [],
    });

    return new Response(body, {
      status:  200,
      headers: {
        "Content-Type":  "application/json",
        "Cache-Control": "public, max-age=300",  // 5-min CDN cache matches in-memory TTL
      },
    });
  },
});
