import { useEffect, useRef } from "react";
import maplibregl, { Map as MLMap, LngLatBoundsLike } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { AgendaItem } from "@/lib/types";

interface MapCanvasProps {
  layers: {
    parcels: boolean;
    gap: boolean;
    agendas: boolean;
    heatmap: boolean;
    sitePlans: boolean;   // re-purposed in Phase 4 as the STIP overlay toggle
  };
  agendaItems?: AgendaItem[];               // real geocoded items from /api/agendas
  gapLayer?: GeoJSON.FeatureCollection;     // /api/gap-layer
  stipLayer?: GeoJSON.FeatureCollection;    // /api/stip
  onAgendaClick?: (agenda: AgendaItem) => void;
  onParcelClick?: (props: GeoJsonProperties) => void;
}

type GeoJsonProperties = NonNullable<GeoJSON.Feature["properties"]>;

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

const EMPTY_FC: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

function buildAgendaGeoJSON(items: AgendaItem[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature<GeoJSON.Point>[] = [];
  for (const a of items) {
    if (a.lat == null || a.lng == null) continue;
    features.push({
      type: "Feature",
      id: a.id,
      properties: {
        id: a.id,
        developer: a.developer ?? a.title ?? "",
        signalType: a.signalType ?? a.itemType ?? "",
        jurisdiction: a.jurisdiction,
        date: a.date,
        title: a.title,
      },
      geometry: { type: "Point", coordinates: [a.lng, a.lat] },
    });
  }
  return { type: "FeatureCollection", features };
}

export function MapCanvas({
  layers,
  agendaItems,
  gapLayer,
  stipLayer,
  onAgendaClick,
  onParcelClick,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const loadedRef = useRef(false);
  const agendaItemsRef = useRef<AgendaItem[]>(agendaItems ?? []);

  useEffect(() => { agendaItemsRef.current = agendaItems ?? []; }, [agendaItems]);

  // ── Sync GeoJSON sources when props change ──────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const src = map.getSource("agendas") as maplibregl.GeoJSONSource | undefined;
    src?.setData(buildAgendaGeoJSON(agendaItems ?? []));
  }, [agendaItems]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const src = map.getSource("parcels") as maplibregl.GeoJSONSource | undefined;
    src?.setData(gapLayer ?? EMPTY_FC);
  }, [gapLayer]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const src = map.getSource("stip") as maplibregl.GeoJSONSource | undefined;
    src?.setData(stipLayer ?? EMPTY_FC);
  }, [stipLayer]);

  // ── Map init ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: SATELLITE_STYLE,
      center: [-112.42, 40.6],     // Tooele Valley
      zoom: 10.5,
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

      // ── Parcels (real polygons from /api/gap-layer) ─────────────────────────
      map.addSource("parcels", { type: "geojson", data: gapLayer ?? EMPTY_FC });

      // Base parcel fill — uniform tint when "Parcels" is on but "Gap" is off
      map.addLayer({
        id: "parcels-fill",
        type: "fill",
        source: "parcels",
        paint: {
          "fill-color": "#6366f1",
          "fill-opacity": 0.10,
        },
      });

      // Gap-score overlay. Scores are 0–7 (integer, bimodal: most parcels are 0,
      // high-gap parcels cluster at 7). Nulls (no GP coverage) render gray.
      map.addLayer({
        id: "parcels-gap-null",
        type: "fill",
        source: "parcels",
        filter: ["any", ["!", ["has", "gap_score"]], ["==", ["get", "gap_score"], null]],
        paint: { "fill-color": "rgba(150, 150, 150, 0.20)" },
      });
      map.addLayer({
        id: "parcels-gap",
        type: "fill",
        source: "parcels",
        filter: ["all", ["has", "gap_score"], ["!=", ["get", "gap_score"], null]],
        paint: {
          "fill-color": [
            "interpolate", ["linear"], ["get", "gap_score"],
            0, "rgba(192, 38, 211, 0)",
            2, "rgba(192, 38, 211, 0.25)",
            4, "rgba(192, 38, 211, 0.45)",
            6, "rgba(168, 28, 184, 0.65)",
            7, "rgba(136, 22, 150, 0.85)",
          ],
          "fill-opacity": 0.85,
        },
      });

      map.addLayer({
        id: "parcels-outline",
        type: "line",
        source: "parcels",
        paint: { "line-color": "#a5b4fc", "line-width": 0.4, "line-opacity": 0.5 },
      });

      // ── STIP (UDOT future road projects, line features) ─────────────────────
      map.addSource("stip", { type: "geojson", data: stipLayer ?? EMPTY_FC });
      map.addLayer({
        id: "stip-lines-glow",
        type: "line",
        source: "stip",
        paint: {
          "line-color": "#facc15",
          "line-width": 6,
          "line-opacity": 0.25,
          "line-blur": 2,
        },
      });
      map.addLayer({
        id: "stip-lines",
        type: "line",
        source: "stip",
        paint: {
          "line-color": "#facc15",
          "line-width": 2.2,
          "line-opacity": 0.95,
        },
      });

      // ── Agenda pins ──────────────────────────────────────────────────────────
      map.addSource("agendas", {
        type: "geojson",
        data: buildAgendaGeoJSON(agendaItemsRef.current),
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
          "circle-color": "#4338ca",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.5,
          "circle-radius": 6,
          "circle-opacity": 0.9,
        },
      });

      map.addLayer({
        id: "agenda-heat",
        type: "heatmap",
        source: "agendas",
        maxzoom: 13,
        paint: {
          "heatmap-weight": 1,
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

      // ── Click handlers ───────────────────────────────────────────────────────
      const parcelClick = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
        const f = e.features?.[0];
        if (f && onParcelClick) onParcelClick(f.properties ?? {});
      };
      map.on("click", "parcels-gap", parcelClick);
      map.on("click", "parcels-fill", parcelClick);

      map.on("click", "agenda-points", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const a = agendaItemsRef.current.find((x) => x.id === f.properties?.id);
        if (a) onAgendaClick?.(a);
      });

      map.on("click", "agenda-clusters", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
        map.easeTo({ center: coords, zoom: (map.getZoom() || 9) + 2 });
      });

      ["parcels-gap", "parcels-fill", "agenda-points", "agenda-clusters", "stip-lines"].forEach((layerId) => {
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
  }, [onAgendaClick, onParcelClick]); // gapLayer/stipLayer set via separate effects above

  // ── Layer-toggle visibility ─────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;

    const setVis = (id: string, vis: boolean) => {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", vis ? "visible" : "none");
    };

    setVis("parcels-fill", layers.parcels && !layers.gap);
    setVis("parcels-outline", layers.parcels || layers.gap);
    setVis("parcels-gap-null", layers.gap);
    setVis("parcels-gap", layers.gap);
    setVis("agenda-points", layers.agendas);
    setVis("agenda-clusters", layers.agendas);
    setVis("agenda-heat", layers.heatmap);
    setVis("stip-lines", layers.sitePlans);
    setVis("stip-lines-glow", layers.sitePlans);
  }, [layers]);

  return <div ref={containerRef} className="absolute inset-0 min-h-full w-full bg-muted" />;
}
