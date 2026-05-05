import { useEffect, useRef } from "react";
import maplibregl, { Map as MLMap, LngLatBoundsLike } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { PARCELS, AGENDAS, signalLabel, type Parcel, type AgendaItem as MockAgendaItem } from "@/lib/mock-data";
import type { AgendaItem as RealAgendaItem } from "@/lib/types";

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
  /** Per-parcel fill color keyed by parcel id, e.g. from score grade. */
  parcelColors?: Record<string, string>;
  /** Polygon fill opacity 0–1. Defaults to 0.55. */
  fillOpacity?: number;
  /** When true, parcels not in parcelColors are dimmed to 0.10 opacity. */
  dimMask?: boolean;
  // Real-data props from Phase 4 (optional, ignored when using mock-data path)
  agendaItems?: RealAgendaItem[];
  gapLayer?: GeoJSON.FeatureCollection;
  stipLayer?: GeoJSON.FeatureCollection;
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

function buildParcelGeoJSON(
  parcelColors: Record<string, string>,
  fillOpacity: number,
  dimMask: boolean,
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: PARCELS.map((p) => {
      const hex = parcelColors[p.id] ?? "#6366f1";
      const opacity = dimMask
        ? (parcelColors[p.id] ? fillOpacity : 0.10)
        : fillOpacity;
      return {
        type: "Feature" as const,
        id: p.id,
        properties: {
          id: p.id,
          apn: p.apn,
          hasGap: p.hasGap,
          jurisdiction: p.jurisdiction,
          zoning: p.zoning,
          generalPlan: p.generalPlan,
          acres: p.acres,
          fillColor: hex,
          fillOpacity: opacity,
        },
        geometry: { type: "Polygon" as const, coordinates: [p.polygon] },
      };
    }),
  };
}

const DEFAULT_OPACITY = 0.55;

export function MapCanvas({
  layers,
  onParcelClick,
  onAgendaClick,
  selectedParcelId,
  parcelColors = {},
  fillOpacity = DEFAULT_OPACITY,
  dimMask = false,
  agendaItems,
  stipLayer,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const loadedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Sync parcelColors / fillOpacity / dimMask into the GeoJSON source ────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const src = map.getSource("parcels") as maplibregl.GeoJSONSource | undefined;
      if (src) src.setData(buildParcelGeoJSON(parcelColors, fillOpacity, dimMask));
    }, 50);
  }, [parcelColors, fillOpacity, dimMask]);

  // ── Sync real agenda items (Phase 4 real-data path, optional) ────────────────
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

      // ── Parcels source — mock polygons with grade colors ──────────────────────
      map.addSource("parcels", {
        type: "geojson",
        data: buildParcelGeoJSON(parcelColors, fillOpacity, dimMask),
      });

      // fill-color and fill-opacity are data-driven from GeoJSON properties
      // so profile switches only need a setData call, not a repaint expression change.
      map.addLayer({
        id: "parcels-fill",
        type: "fill",
        source: "parcels",
        paint: {
          "fill-color": ["get", "fillColor"],
          "fill-opacity": ["get", "fillOpacity"],
        },
      });

      map.addLayer({
        id: "parcels-outline",
        type: "line",
        source: "parcels",
        paint: {
          "line-color": ["case", ["get", "hasGap"], "#e879f9", "#a5b4fc"],
          "line-width": ["case", ["boolean", ["feature-state", "selected"], false], 2.5, 1],
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

      // ── Agenda pins — mock data by default, real data updates via effect ──────
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
        const p = PARCELS.find((x) => x.id === f.properties?.id);
        if (p) onParcelClick?.(p);
      });

      map.on("click", "agenda-points", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const a = AGENDAS.find((x) => x.id === f.properties?.id);
        if (a) onAgendaClick?.(a);
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
      if (debounceRef.current) clearTimeout(debounceRef.current);
      map.remove();
      mapRef.current = null;
      loadedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onParcelClick, onAgendaClick]);

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

  // ── Selection highlight ───────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;

    PARCELS.forEach((p) => {
      map.setFeatureState({ source: "parcels", id: p.id }, { selected: p.id === selectedParcelId });
    });

    if (selectedParcelId) {
      const p = PARCELS.find((x) => x.id === selectedParcelId);
      if (p) map.easeTo({ center: p.centroid, zoom: Math.max(map.getZoom(), 14), duration: 600 });
    }
  }, [selectedParcelId]);

  return <div ref={containerRef} className="absolute inset-0 min-h-full w-full bg-muted" />;
}
