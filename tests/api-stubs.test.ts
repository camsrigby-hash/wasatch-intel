// Phase 11: smoke tests for the 10 new API stubs.
// Requires a running dev server at http://localhost:5173.
// Run: bun run dev (in a separate terminal), then bun test.
// CI: skipped when SKIP_API_TESTS=1.

import { describe, it, expect, beforeAll } from "bun:test";

const BASE = process.env.API_BASE ?? "http://localhost:5173";
const SKIP = process.env.SKIP_API_TESTS === "1";

async function get(path: string) {
  const r = await fetch(`${BASE}${path}`);
  return { status: r.status, body: await r.json().catch(() => null) };
}

async function post(path: string, payload?: unknown) {
  const r = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload !== undefined ? JSON.stringify(payload) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => null) };
}

async function patch(path: string, payload: unknown) {
  const r = await fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return { status: r.status, body: await r.json().catch(() => null) };
}

async function del(path: string) {
  const r = await fetch(`${BASE}${path}`, { method: "DELETE" });
  return { status: r.status };
}

let firstParcelId: string;
let firstPipelineParcelId: string;

describe("Phase 11 API stubs", () => {
  beforeAll(async () => {
    if (SKIP) return;
    // Seed known IDs from the profiles endpoint first
    const { body } = await get("/api/profiles");
    expect(body?.data).toBeDefined();
    firstParcelId = "parcel-1000"; // deterministic from makeParcels()
    firstPipelineParcelId = "parcel-1000"; // first 22 parcels are in pipeline
  });

  it("GET /api/profiles returns default profiles", async () => {
    if (SKIP) return;
    const { status, body } = await get("/api/profiles");
    expect(status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(3);
    const ids = body.data.map((p: { id: string }) => p.id);
    expect(ids).toContain("gas-cstore");
    expect(ids).toContain("miniflex");
    expect(ids).toContain("generic-commercial");
  });

  it("POST /api/profiles creates a custom profile", async () => {
    if (SKIP) return;
    const payload = {
      id: "test-profile",
      name: "Test Profile",
      description: "Smoke test",
      weights: { corner: 5, aadt: 5, signal: 5, competition: 5, zoning: 5, growth: 5, stip: 5, corridor: 5 },
      flags: { competition_active: false, income_inversion: false, corner_required: false, prefer_industrial_zoning: false },
    };
    const { status, body } = await post("/api/profiles", payload);
    expect(status).toBe(200);
    expect(body.data.name).toBe("Test Profile");
  });

  it("GET /api/parcels/search?q= returns results", async () => {
    if (SKIP) return;
    const { status, body } = await get("/api/parcels/search?q=lehi");
    expect(status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("GET /api/parcels?bbox= returns paginated parcels", async () => {
    if (SKIP) return;
    const { status, body } = await get("/api/parcels?bbox=-112,40,-111,41&profile=generic-commercial");
    expect(status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });

  it("GET /api/parcels/:id returns a single parcel with score", async () => {
    if (SKIP) return;
    const { status, body } = await get(`/api/parcels/${firstParcelId}?profile=generic-commercial`);
    expect(status).toBe(200);
    expect(body.data.id).toBe(firstParcelId);
    expect(body.data.score).toBeDefined();
    expect(typeof body.data.score.total).toBe("number");
  });

  it("GET /api/pipeline returns pipeline entries", async () => {
    if (SKIP) return;
    const { status, body } = await get("/api/pipeline");
    expect(status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0); // first 22 parcels are in pipeline
  });

  it("POST /api/pipeline saves a parcel", async () => {
    if (SKIP) return;
    const { status, body } = await post("/api/pipeline", { parcel_id: "parcel-1050", stage: "prospect" });
    expect(status).toBe(201);
    expect(body.data.parcel_id).toBe("parcel-1050");
  });

  it("PATCH /api/pipeline/:parcel_id updates stage", async () => {
    if (SKIP) return;
    const { status, body } = await patch(`/api/pipeline/${firstPipelineParcelId}`, { stage: "dd" });
    expect(status).toBe(200);
    expect(body.data.parcel_id).toBe(firstPipelineParcelId);
  });

  it("DELETE /api/pipeline/:parcel_id removes entry", async () => {
    if (SKIP) return;
    const { status } = await del(`/api/pipeline/${firstPipelineParcelId}`);
    expect(status).toBe(204);
  });

  it("POST /api/parcels/:id/refresh queues enrichment", async () => {
    if (SKIP) return;
    const { status, body } = await post(`/api/parcels/${firstParcelId}/refresh`);
    expect(status).toBe(200);
    expect(body.data.status).toBe("queued");
  });
});
