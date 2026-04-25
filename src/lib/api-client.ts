// src/lib/api-client.ts
// TanStack Query hooks for every /api/* endpoint.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AgendaItem,
  DigestContent,
  DeveloperSummary,
  SignalWireItem,
  Watchlist,
  WatchlistHit,
  CreateWatchlistPayload,
  Deal,
  ApiEnvelope,
  ParcelDetail,
  ParcelNeighbor,
  AnalysisResult,
} from "./types";

const STALE_5M = 5 * 60 * 1000;

async function get<T>(path: string): Promise<ApiEnvelope<T>> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json() as Promise<ApiEnvelope<T>>;
}

// ── /api/agendas ─────────────────────────────────────────────────────────────

export function useAgendas() {
  return useQuery<ApiEnvelope<AgendaItem[]>, Error>({
    queryKey:  ["agendas"],
    queryFn:   () => get<AgendaItem[]>("/api/agendas"),
    staleTime: STALE_5M,
    retry: 2,
  });
}

// ── /api/digest ───────────────────────────────────────────────────────────────

export function useDigest() {
  return useQuery<ApiEnvelope<DigestContent>, Error>({
    queryKey:  ["digest"],
    queryFn:   () => get<DigestContent>("/api/digest"),
    staleTime: STALE_5M,
    retry: 2,
  });
}

// ── /api/developers ───────────────────────────────────────────────────────────

export function useDevelopers() {
  return useQuery<ApiEnvelope<DeveloperSummary[]>, Error>({
    queryKey:  ["developers"],
    queryFn:   () => get<DeveloperSummary[]>("/api/developers"),
    staleTime: STALE_5M,
    retry: 2,
  });
}

// ── /api/signal-wire ─────────────────────────────────────────────────────────

export function useSignalWire() {
  return useQuery<ApiEnvelope<SignalWireItem[]>, Error>({
    queryKey:  ["signal-wire"],
    queryFn:   () => get<SignalWireItem[]>("/api/signal-wire"),
    staleTime: STALE_5M,
    retry: 2,
  });
}

// ── /api/gap-layer + /api/stip — Phase 4 GeoJSON layers ─────────────────────

export interface GeoJsonFC {
  type: "FeatureCollection";
  features: GeoJSON.Feature[];
}

const STALE_30M = 30 * 60 * 1000;

export function useGapLayer() {
  return useQuery<ApiEnvelope<GeoJsonFC>, Error>({
    queryKey:  ["gap-layer"],
    queryFn:   () => get<GeoJsonFC>("/api/gap-layer"),
    staleTime: STALE_30M,
    retry: 2,
  });
}

export function useStip() {
  return useQuery<ApiEnvelope<GeoJsonFC>, Error>({
    queryKey:  ["stip"],
    queryFn:   () => get<GeoJsonFC>("/api/stip"),
    staleTime: STALE_30M,
    retry: 2,
  });
}

// ── /api/parcels ─────────────────────────────────────────────────────────────

export function useParcels() {
  return useQuery<ApiEnvelope<never[]>, Error>({
    queryKey:  ["parcels"],
    queryFn:   () => get<never[]>("/api/parcels"),
    staleTime: STALE_5M,
  });
}

// ── /api/watchlists — Phase 7 CRUD ────────────────────────────────────────────

export function useWatchlists() {
  return useQuery<ApiEnvelope<Watchlist[]>, Error>({
    queryKey:  ["watchlists"],
    queryFn:   () => get<Watchlist[]>("/api/watchlists"),
    staleTime: STALE_5M,
  });
}

export function useWatchlistHits(id: string | null) {
  return useQuery<ApiEnvelope<WatchlistHit[]>, Error>({
    queryKey:  ["watchlist-hits", id],
    queryFn:   () => get<WatchlistHit[]>(`/api/watchlists/${encodeURIComponent(id!)}/hits`),
    enabled:   id != null,
    staleTime: STALE_5M,
  });
}

export function useCreateWatchlist() {
  const qc = useQueryClient();
  return useMutation<ApiEnvelope<Watchlist>, Error, CreateWatchlistPayload>({
    mutationFn: (payload) =>
      fetch("/api/watchlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((r) => { if (!r.ok) throw new Error(`create watchlist ${r.status}`); return r.json() as Promise<ApiEnvelope<Watchlist>>; }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["watchlists"] }); },
  });
}

export function useUpdateWatchlist() {
  const qc = useQueryClient();
  return useMutation<ApiEnvelope<Watchlist>, Error, { id: string; patch: Partial<CreateWatchlistPayload> }>({
    mutationFn: ({ id, patch }) =>
      fetch(`/api/watchlists/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }).then((r) => { if (!r.ok) throw new Error(`update watchlist ${r.status}`); return r.json() as Promise<ApiEnvelope<Watchlist>>; }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["watchlists"] }); },
  });
}

export function useDeleteWatchlist() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) =>
      fetch(`/api/watchlists/${encodeURIComponent(id)}`, { method: "DELETE" })
        .then((r) => { if (r.status !== 204 && !r.ok) throw new Error(`delete watchlist ${r.status}`); }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["watchlists"] }); },
  });
}

// ── /api/deals ────────────────────────────────────────────────────────────────

export function useDeals() {
  return useQuery<ApiEnvelope<Deal[]>, Error>({
    queryKey:  ["deals"],
    queryFn:   () => get<Deal[]>("/api/deals"),
    staleTime: STALE_5M,
  });
}

// ── /api/parcel/:apn — Phase 5 ───────────────────────────────────────────────

export function useParcelDetail(apn: string | null) {
  return useQuery<ApiEnvelope<ParcelDetail>, Error>({
    queryKey:  ["parcel", apn],
    queryFn:   () => get<ParcelDetail>(`/api/parcel/${encodeURIComponent(apn!)}`),
    enabled:   apn != null,
    staleTime: STALE_30M,
    retry: 1,
  });
}

export function useParcelAdjacency(apn: string | null) {
  return useQuery<ApiEnvelope<ParcelNeighbor[]>, Error>({
    queryKey:  ["parcel-adjacency", apn],
    queryFn:   () => get<ParcelNeighbor[]>(`/api/parcel/${encodeURIComponent(apn!)}/adjacency`),
    enabled:   apn != null,
    staleTime: STALE_30M,
    retry: 1,
  });
}

export function useParcelAnalyze(apn: string | null) {
  return useMutation<ApiEnvelope<AnalysisResult>, Error>({
    mutationFn: () =>
      fetch(`/api/parcel/${encodeURIComponent(apn!)}/analyze`, { method: "POST" })
        .then((r) => { if (!r.ok) throw new Error(`analyze ${r.status}`); return r.json() as Promise<ApiEnvelope<AnalysisResult>>; }),
  });
}
