import tanstack from "@tanstack/react-start/server-entry";
import { loadAgendas } from "./lib/csv-loader";

export default {
  async fetch(request: Request, env: unknown, ctx: unknown): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/agendas" && request.method === "GET") {
      try {
        const result = await loadAgendas();
        return new Response(
          JSON.stringify({
            data: result.data,
            meta: {
              source:
                "https://raw.githubusercontent.com/camsrigby-hash/tooele-land-intel/main/data/agenda_items_split.csv",
              freshness: result.freshness,
              count: result.count,
              fetchedAt: result.fetchedAt,
            },
            errors:
              result.freshness === "stale"
                ? ["Upstream CSV unavailable; returning empty dataset"]
                : [],
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "public, max-age=300",
            },
          },
        );
      } catch {
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    return tanstack.fetch(request, env, ctx);
  },
};
