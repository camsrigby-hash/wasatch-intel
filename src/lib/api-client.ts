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
  DealNote,
  DealContact,
  CreateDealPayload,
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

export function useDevelopers(opts: { includeSignage?: boolean } = {}) {
  const path = opts.includeSignage ? "/api/developers?include_signage=1" : "/api/developers";
  return useQuery<ApiEnvelope<DeveloperSummary[]>, Error>({
    queryKey:  ["developers", opts.includeSignage ? "with-signage" : "default"],
    queryFn:   () => get<DeveloperSummary[]>(path),
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

// ── /api/cron-status (Phase 12) ─────────────────────────────────────────────

export interface CronStatusEntry {
  workflow:       string;
  description:    string;
  cron:           string;
  ranAt:          string | null;
  status:         "success" | "failure" | "partial" | null;
  health:         "ok" | "warn" | "fail" | "unknown";
  durationMs:     number | null;
  itemsProcessed: number | null;
  notes:          string | null;
}

export function useCronStatus() {
  return useQuery<ApiEnvelope<CronStatusEntry[]>, Error>({
    queryKey:  ["cron-status"],
    queryFn:   () => get<CronStatusEntry[]>("/api/cron-status"),
    staleTime: STALE_5M,
    retry: 1,
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

// ── /api/deals — Phase 8 CRUD ─────────────────────────────────────────────────

export function useDeals() {
  return useQuery<ApiEnvelope<Deal[]>, Error>({
    queryKey:  ["deals"],
    queryFn:   () => get<Deal[]>("/api/deals"),
    staleTime: STALE_5M,
  });
}

export function useCreateDeal() {
  const qc = useQueryClient();
  return useMutation<ApiEnvelope<Deal>, Error, CreateDealPayload>({
    mutationFn: (payload) =>
      fetch("/api/deals", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      }).then((r) => { if (!r.ok) throw new Error(`create deal ${r.status}`); return r.json() as Promise<ApiEnvelope<Deal>>; }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["deals"] }); },
  });
}

export function useUpdateDeal() {
  const qc = useQueryClient();
  return useMutation<ApiEnvelope<Deal>, Error, { id: string; patch: Partial<Deal> }>({
    mutationFn: ({ id, patch }) =>
      fetch(`/api/deals/${encodeURIComponent(id)}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(patch),
      }).then((r) => { if (!r.ok) throw new Error(`update deal ${r.status}`); return r.json() as Promise<ApiEnvelope<Deal>>; }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["deals"] }); },
  });
}

export function useDeleteDeal() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) =>
      fetch(`/api/deals/${encodeURIComponent(id)}`, { method: "DELETE" })
        .then((r) => { if (r.status !== 204 && !r.ok) throw new Error(`delete deal ${r.status}`); }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["deals"] }); },
  });
}

export function useDealNotes(dealId: string | null) {
  return useQuery<ApiEnvelope<DealNote[]>, Error>({
    queryKey:  ["deal-notes", dealId],
    queryFn:   () => get<DealNote[]>(`/api/deals/${encodeURIComponent(dealId!)}/notes`),
    enabled:   dealId != null,
    staleTime: STALE_5M,
  });
}

export function useCreateDealNote() {
  const qc = useQueryClient();
  return useMutation<ApiEnvelope<DealNote>, Error, { dealId: string; body: string }>({
    mutationFn: ({ dealId, body }) =>
      fetch(`/api/deals/${encodeURIComponent(dealId)}/notes`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ body }),
      }).then((r) => { if (!r.ok) throw new Error(`create note ${r.status}`); return r.json() as Promise<ApiEnvelope<DealNote>>; }),
    onSuccess: (_data, { dealId }) => { void qc.invalidateQueries({ queryKey: ["deal-notes", dealId] }); },
  });
}

export function useDealContacts(dealId: string | null) {
  return useQuery<ApiEnvelope<DealContact[]>, Error>({
    queryKey:  ["deal-contacts", dealId],
    queryFn:   () => get<DealContact[]>(`/api/deals/${encodeURIComponent(dealId!)}/contacts`),
    enabled:   dealId != null,
    staleTime: STALE_5M,
  });
}

export function useCreateDealContact() {
  const qc = useQueryClient();
  return useMutation<ApiEnvelope<DealContact>, Error, { dealId: string; name: string; role?: string; phone?: string; email?: string }>({
    mutationFn: ({ dealId, ...data }) =>
      fetch(`/api/deals/${encodeURIComponent(dealId)}/contacts`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data),
      }).then((r) => { if (!r.ok) throw new Error(`create contact ${r.status}`); return r.json() as Promise<ApiEnvelope<DealContact>>; }),
    onSuccess: (_data, { dealId }) => { void qc.invalidateQueries({ queryKey: ["deal-contacts", dealId] }); },
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
