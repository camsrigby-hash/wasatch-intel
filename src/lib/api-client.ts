// src/lib/api-client.ts
// TanStack Query hooks for every /api/* endpoint.

import { useQuery } from "@tanstack/react-query";
import type {
  AgendaItem,
  DigestContent,
  DeveloperSummary,
  SignalWireItem,
  Watchlist,
  Deal,
  ApiEnvelope,
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

// ── /api/parcels ─────────────────────────────────────────────────────────────

export function useParcels() {
  return useQuery<ApiEnvelope<never[]>, Error>({
    queryKey:  ["parcels"],
    queryFn:   () => get<never[]>("/api/parcels"),
    staleTime: STALE_5M,
  });
}

// ── /api/watchlists ───────────────────────────────────────────────────────────

export function useWatchlists() {
  return useQuery<ApiEnvelope<Watchlist[]>, Error>({
    queryKey:  ["watchlists"],
    queryFn:   () => get<Watchlist[]>("/api/watchlists"),
    staleTime: STALE_5M,
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
