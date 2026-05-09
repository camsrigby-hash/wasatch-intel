import { useEffect, useRef } from "react";
import maplibregl, { Map as MLMap, LngLatBoundsLike } from "maplibre-gl";
import { Protocol } from "pmtiles";
import "maplibre-gl/dist/maplibre-gl.css";
import { PARCELS, AGENDAS, signalLabel, type Parcel, type AgendaItem as MockAgendaItem } from "@/lib/mock-data";
import type { AgendaItem as RealAgendaItem } from "@/lib/types";
import type { WeightVector } from "@/lib/parcel-intel";

// Grade hex colors for GL paint expressions — CSS variables cannot be used in WebGL expressions.
const TILE_GRADE_HEX = {
  A: "#22c55e", // emerald (matches --grade-a)
  B: "#eab308", // amber  (matches --grade-b)
  C: "#f97316", // orange (matches --grade-c)
  D: "#94a3b8", // slate  (matches --grade-d)
} as const;

// The four scoring dimensions baked into every tile feature (Phase 14-3/14-4 build pipeline).
// Growth, signal, stip, competition are dynamic/not baked — they're excluded from the expression.
const BAKED_ATTRS = {
  corner: "corner_score",
  aadt: "aadt_score",
  zoning: "zoning_score",
  corridor: "commute_corridor_score",
} as const;
type BakedDim = keyof typeof BAKED_ATTRS;
const BAKED_DIMS: BakedDim[] = ["corner", "aadt", "zoning", "corridor"];

/**
 * Build a MapLibre paint expression that maps baked tile attributes to a grade color
 * using the active profile's normalized weight vector.
 *
 * Grades: A ≥ 0.80 | B ≥ 0.70 | C ≥ 0.55 | D < 0.55
 */
function buildFillColorExpr(weights: WeightVector): maplibregl.ExpressionSpecification {
  const total = BAKED_DIMS.reduce((s, d) => s + (weights[d] || 0), 0) || 1;
  // Build one ["*", weight, ["coalesce", ["get", attr], 0.5]] term per baked dimension.
  const terms = BAKED_DIMS.map((d) => [
    "*",
    weights[d] / total,
    ["coalesce", ["get", BAKED_ATTRS[d]], 0.5],
  ]);
  const weightedSum = ["+", ...terms];
  return [
    "case",
    [">=", weightedSum, 0.80], TILE_GRADE_HEX.A,
    [">=", weightedSum, 0.70], TILE_GRADE_HEX.B,
    [">=", weightedSum, 0.55], TILE_GRADE_HEX.C,
    TILE_GRADE_HEX.D,
  ] as unknown as maplibregl.ExpressionSpecification;
}

const DEFAULT_WEIGHTS: WeightVector = {
  corner: 5, aadt: 5, signal: 5, competition: 5,
  zoning: 5, growth: 5, stip: 5, corridor: 5,
};

// ── PMTiles protocol — installed once per page load ───────────────────────────
let pmProtocolInstalled = false;
function ensurePMTilesProtocol() {
  if (pmProtocolInstalled) return;
  const proto = new Protocol();
  maplibregl.addProtocol("pmtiles", proto.tile);
  pmProtocolInstalled = true;
}

const SATELLITE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    "esri-satellite": {
      type: "raster",
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      attribution: "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics",
      maxzoom: 19,
    },
    "esri-labels": {
      type: "raster",
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      maxzoom: 19,
    },
  },
  layers: [
    { id: "satellite", type: "raster", source: "esri-satellite" },
    { id: "labels", type: "raster", source: "esri-labels", paint: { "raster-opacity": 0.85 } },
  ],
};

function colorForSignal(s: number): string {
  const l = signalLabel(s);
  if (l === "Critical") return "#dc2626";
  if (l === "High") return "#ea580c";
  if (l === "Med") return "#eab308";
  return "#60a5fa";
}

interface MapCanvasProps {
  layers: {
    parcels: boolean;
    gap: boolean;
    agendas: boolean;
    heatmap: boolean;
    sitePlans: boolean;
  };
  onParcelClick?: (parcel: Parcel) => void;
  onAgendaClick?: (agenda: MockAgendaItem | RealAgendaItem) => void;
  selectedParcelId?: string | null;
  /**
   * Active profile weight vector. MapCanvas rebuilds the fill-color paint expression
   * whenever this changes — no tile rebuild required.
   */
  profileWeights?: WeightVector;
  /** Unused in vector-tile mode. Grade coloring is handled by the paint expression. */
  parcelColors?: Record<string, string>;
  /** Polygon fill opacity 0–1. Defaults to 0.55. */
  fillOpacity?: number;
  /** Unused in vector-tile mode; kept for API compatibility. */
  dimMask?: unknown;
  // Real-data props (optional)
  agendaItems?: RealAgendaItem[];
  gapLayer?: GeoJSON.FeatureCollection;
  stipLayer?: GeoJSON.FeatureCollection;
}

const DEFAULT_OPACITY = 0.55;

export function MapCanvas({
  layers,
  onParcelClick,
  onAgendaClick,
  selectedParcelId,
  profileWeights,
  fillOpacity = DEFAULT_OPACITY,
  agendaItems,
  stipLayer,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const loadedRef = useRef(false);
  // Track previous selection so we can clear it with removeFeatureState.
  const prevSelectedRef = useRef<string | null>(null);

  // Stable refs for callbacks — lets the map-init effect have an empty dep array
  // while always calling the latest handler without recreating the map on every render.
  const onParcelClickRef = useRef(onParcelClick);
  const onAgendaClickRef = useRef(onAgendaClick);
  useEffect(() => { onParcelClickRef.current = onParcelClick; }, [onParcelClick]);
  useEffect(() => { onAgendaClickRef.current = onAgendaClick; }, [onAgendaClick]);

  // ── Sync profileWeights → fill-color paint expression ────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    map.setPaintProperty(
      "parcels-fill",
      "fill-color",
      buildFillColorExpr(profileWeights ?? DEFAULT_WEIGHTS),
    );
  }, [profileWeights]);

  // ── Sync fillOpacity → fill-opacity ──────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    map.setPaintProperty("parcels-fill", "fill-opacity", fillOpacity);
  }, [fillOpacity]);

  // ── Sync real agenda items ────────────────────────────────────────────────────
  useEffect(() => {
    if (!agendaItems) return;
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const src = map.getSource("agendas") as maplibregl.GeoJSONSource | undefined;
    if (!src) return;
    const features = agendaItems
      .filter((a) => a.lat != null && a.lng != null)
      .map((a) => ({
        type: "Feature" as const,
        id: a.id,
        properties: { id: a.id, signal: a.growthScore ?? 0, jurisdiction: a.jurisdiction, color: colorForSignal(a.growthScore ?? 0) },
        geometry: { type: "Point" as const, coordinates: [a.lng!, a.lat!] },
      }));
    src.setData({ type: "FeatureCollection", features });
  }, [agendaItems]);

  // ── Sync STIP layer ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!stipLayer) return;
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const src = map.getSource("stip") as maplibregl.GeoJSONSource | undefined;
    src?.setData(stipLayer);
  }, [stipLayer]);

  // ── Map init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    ensurePMTilesProtocol();

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: SATELLITE_STYLE,
      center: [-111.95, 40.55],
      zoom: 9.2,
      maxBounds: [[-113.5, 39.5], [-110.5, 41.5]] as LngLatBoundsLike,
      attributionControl: { compact: true },
    });

    map.addControl(
      new maplibregl.NavigationControl({ visualizePitch: false, showZoom: true, showCompass: false }),
      "top-right",
    );
    mapRef.current = map;

    const resizeMap = () => { requestAnimationFrame(() => { map.resize(); }); };
    const resizeObserver = new ResizeObserver(() => { resizeMap(); });
    resizeObserver.observe(containerRef.current);

    map.on("load", () => {
      loadedRef.current = true;
      resizeMap();

      // ── PMTiles vector source — all 947k parcels with 8 baked attributes ──────
      // promoteId: "parcel_id" sets each feature's id from the parcel_id property,
      // enabling setFeatureState for selection, pipeline stage, and watchlist overlays.
      map.addSource("parcels", {
        type: "vector",
        url: "pmtiles:///tiles/parcels.pmtiles",
        promoteId: "parcel_id",
        attribution: "Wasatch Intel",
      } as maplibregl.VectorSourceSpecification & { promoteId: string });

      map.addLayer({
        id: "parcels-fill",
        type: "fill",
        source: "parcels",
        "source-layer": "parcels",
        paint: {
          "fill-color": buildFillColorExpr(profileWeights ?? DEFAULT_WEIGHTS),
          "fill-opacity": fillOpacity,
        },
      });

      map.addLayer({
        id: "parcels-outline",
        type: "line",
        source: "parcels",
        "source-layer": "parcels",
        paint: {
          "line-color": "#a5b4fc",
          "line-width": ["case", ["boolean", ["feature-state", "selected"], false], 2.5, 0.6],
        },
      });

      // ── STIP (optional) ───────────────────────────────────────────────────────
      map.addSource("stip", {
        type: "geojson",
        data: stipLayer ?? ({ type: "FeatureCollection", features: [] } as GeoJSON.FeatureCollection),
      });
      map.addLayer({
        id: "stip-lines-glow",
        type: "line",
        source: "stip",
        paint: { "line-color": "#facc15", "line-width": 6, "line-opacity": 0.25, "line-blur": 2 },
      });
      map.addLayer({
        id: "stip-lines",
        type: "line",
        source: "stip",
        paint: { "line-color": "#facc15", "line-width": 2.2, "line-opacity": 0.95 },
      });

      // ── Agenda pins — mock by default, real data updates via effect ───────────
      const mockAgendaFeatures = AGENDAS.map((a) => ({
        type: "Feature" as const,
        id: a.id,
        properties: {
          id: a.id,
          signal: a.signal,
          applicant: a.applicant,
          type: a.type,
          jurisdiction: a.jurisdiction,
          color: colorForSignal(a.signal),
        },
        geometry: { type: "Point" as const, coordinates: a.centroid },
      }));

      map.addSource("agendas", {
        type: "geojson",
        data: { type: "FeatureCollection", features: mockAgendaFeatures },
        cluster: true,
        clusterMaxZoom: 12,
        clusterRadius: 40,
      });

      map.addLayer({
        id: "agenda-clusters",
        type: "circle",
        source: "agendas",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#4338ca",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
          "circle-radius": ["step", ["get", "point_count"], 14, 10, 18, 30, 24],
          "circle-opacity": 0.9,
        },
      });

      map.addLayer({
        id: "agenda-points",
        type: "circle",
        source: "agendas",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": ["get", "color"],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.5,
          "circle-radius": ["interpolate", ["linear"], ["get", "signal"], 0, 4, 100, 9],
          "circle-opacity": 0.95,
        },
      });

      map.addLayer({
        id: "agenda-heat",
        type: "heatmap",
        source: "agendas",
        maxzoom: 13,
        paint: {
          "heatmap-weight": ["interpolate", ["linear"], ["get", "signal"], 0, 0, 100, 1],
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 13, 3],
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0, "rgba(0,0,0,0)",
            0.2, "rgba(99,102,241,0.4)",
            0.5, "rgba(234,179,8,0.6)",
            0.8, "rgba(234,88,12,0.75)",
            1, "rgba(220,38,38,0.85)",
          ],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 8, 13, 40],
          "heatmap-opacity": 0.7,
        },
      });

      // ── Click handlers ────────────────────────────────────────────────────────
      map.on("click", "parcels-fill", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const parcelId = (f.properties?.parcel_id ?? f.properties?.id) as string | undefined;
        if (!parcelId) return;
        const mock = PARCELS.find((x) => x.id === parcelId);
        if (mock) {
          onParcelClickRef.current?.(mock);
        } else {
          const centroid: [number, number] = [e.lngLat.lng, e.lngLat.lat];
          onParcelClickRef.current?.({ id: parcelId, ...f.properties, centroid } as unknown as Parcel);
        }
      });

      map.on("click", "agenda-points", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const a = AGENDAS.find((x) => x.id === f.properties?.id);
        if (a) onAgendaClickRef.current?.(a);
      });

      map.on("click", "agenda-clusters", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
        map.easeTo({ center: coords, zoom: (map.getZoom() || 9) + 2 });
      });

      ["parcels-fill", "agenda-points", "agenda-clusters"].forEach((layerId) => {
        map.on("mouseenter", layerId, () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", layerId, () => { map.getCanvas().style.cursor = ""; });
      });
    });

    window.addEventListener("resize", resizeMap);
    resizeMap();

    return () => {
      window.removeEventListener("resize", resizeMap);
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      loadedRef.current = false;
    };
    // Empty dep array: map is created once per mount. Callbacks are accessed via
    // refs (onParcelClickRef / onAgendaClickRef) so they never trigger a rebuild.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Layer-toggle visibility ───────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;

    const setVis = (id: string, vis: boolean) => {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", vis ? "visible" : "none");
    };

    setVis("parcels-fill", layers.parcels);
    setVis("parcels-outline", layers.parcels);
    setVis("agenda-points", layers.agendas);
    setVis("agenda-clusters", layers.agendas);
    setVis("agenda-heat", layers.heatmap);
    setVis("stip-lines", layers.sitePlans);
    setVis("stip-lines-glow", layers.sitePlans);
  }, [layers]);

  // ── Selection highlight via setFeatureState ───────────────────────────────────
  // Vector tile sources require sourceLayer in the feature identifier.
  // Use prevSelectedRef to clear the previous selection without iterating 947k features.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;

    const prev = prevSelectedRef.current;
    if (prev) {
      map.removeFeatureState({ source: "parcels", sourceLayer: "parcels", id: prev });
    }
    if (selectedParcelId) {
      map.setFeatureState(
        { source: "parcels", sourceLayer: "parcels", id: selectedParcelId },
        { selected: true },
      );
      // easeTo only for mock parcels that have a known centroid.
      const mock = PARCELS.find((x) => x.id === selectedParcelId);
      if (mock) map.easeTo({ center: mock.centroid, zoom: Math.max(map.getZoom(), 14), duration: 600 });
    }
    prevSelectedRef.current = selectedParcelId ?? null;
  }, [selectedParcelId]);

  return <div ref={containerRef} className="absolute inset-0 min-h-full w-full bg-muted" />;
}
