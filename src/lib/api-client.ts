// src/lib/api-client.ts
// TanStack Query hooks for every /api/* endpoint.
// Phase 1: only useAgendas is backed by real data.
// Subsequent phases add real backing; stubs return empty arrays gracefully.

import { useQuery } from "@tanstack/react-query";
import type { AgendasResponse } from "./types";

// ── /api/agendas ─────────────────────────────────────────────────────────────

async function fetchAgendas(): Promise<AgendasResponse> {
  const res = await fetch("/api/agendas");
  if (!res.ok) throw new Error(`/api/agendas ${res.status}`);
  return res.json() as Promise<AgendasResponse>;
}

export function useAgendas() {
  return useQuery<AgendasResponse, Error>({
    queryKey: ["agendas"],
    queryFn:  fetchAgendas,
    staleTime: 5 * 60 * 1000,  // 5 min — matches server cache TTL
    retry: 2,
  });
}

// ── Stub hooks (Phase 2+) ─────────────────────────────────────────────────────
// These return empty state now; real endpoints added in Phase 2.

export function useDigest() {
  return useQuery({
    queryKey: ["digest"],
    queryFn:  async () => ({ data: null, meta: { source: "stub", freshness: "stale" as const, count: 0, fetchedAt: new Date().toISOString() }, errors: [] }),
    enabled:  false,
  });
}

export function useParcels() {
  return useQuery({
    queryKey: ["parcels"],
    queryFn:  async () => ({ data: [], meta: { source: "stub", freshness: "stale" as const, count: 0, fetchedAt: new Date().toISOString() }, errors: [] }),
    enabled:  false,
  });
}

export function useDevelopers() {
  return useQuery({
    queryKey: ["developers"],
    queryFn:  async () => ({ data: [], meta: { source: "stub", freshness: "stale" as const, count: 0, fetchedAt: new Date().toISOString() }, errors: [] }),
    enabled:  false,
  });
}

export function useSignalWire() {
  return useQuery({
    queryKey: ["signal-wire"],
    queryFn:  async () => ({ data: [], meta: { source: "stub", freshness: "stale" as const, count: 0, fetchedAt: new Date().toISOString() }, errors: [] }),
    enabled:  false,
  });
}
