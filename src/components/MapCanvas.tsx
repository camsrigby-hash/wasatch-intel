import { useEffect, useRef } from "react";
import maplibregl, { Map as MLMap, LngLatBoundsLike } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { AgendaItem } from "@/lib/types";
import { PARCELS } from "@/lib/mock-data";

interface MapCanvasProps {
  layers: {
    parcels: boolean;
    gap: boolean;
    agendas: boolean;
    heatmap: boolean;
    sitePlans: boolean;
  };
  agendaItems?: AgendaItem[];          // real geocoded items from /api/agendas
  onParcelClick?: (parcel: import("@/lib/mock-data").Parcel) => void;
  onAgendaClick?: (agenda: AgendaItem) => void;
  selectedParcelId?: string | null;
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
        // growthScore intentionally not used for pin styling until Phase 5 Haiku
        // enrichment populates real values — all 136 items have growthScore=null.
        // Pins render UNIFORMLY until Phase 5 adds signal-weighted styling.
      },
      geometry: { type: "Point", coordinates: [a.lng, a.lat] },
    });
  }
  return { type: "FeatureCollection", features };
}

export function MapCanvas({ layers, agendaItems, onParcelClick, onAgendaClick, selectedParcelId }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const loadedRef = useRef(false);
  const agendaItemsRef = useRef<AgendaItem[]>(agendaItems ?? []);

  // Keep ref current so click handlers always see latest data without re-registering
  useEffect(() => {
    agendaItemsRef.current = agendaItems ?? [];
  }, [agendaItems]);

  // Update "agendas" source when real data arrives
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const src = map.getSource("agendas") as maplibregl.GeoJSONSource | undefined;
    if (src) {
      src.setData(buildAgendaGeoJSON(agendaItems ?? []));
    }
  }, [agendaItems]);

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

      // Parcel polygon layer (mock data — replaced in Phase 4)
      map.addSource("parcels", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: PARCELS.map((p) => ({
            type: "Feature",
            id: p.id,
            properties: {
              id: p.id,
              apn: p.apn,
              hasGap: p.hasGap,
              jurisdiction: p.jurisdiction,
              zoning: p.zoning,
              generalPlan: p.generalPlan,
              acres: p.acres,
            },
            geometry: { type: "Polygon", coordinates: [p.polygon] },
          })),
        },
      });

      map.addLayer({
        id: "parcels-fill",
        type: "fill",
        source: "parcels",
        paint: {
          "fill-color": ["case", ["get", "hasGap"], "#c026d3", "#6366f1"],
          "fill-opacity": ["case", ["boolean", ["feature-state", "selected"], false], 0.55, 0.18],
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

      // Agenda pins — real geocoded data from /api/agendas
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
          // Uniform styling — growthScore is 0 for all items until Phase 5 Haiku
          // enrichment runs. Signal-weighted size/color/opacity belongs in Phase 5.
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
          "heatmap-weight": 1,  // uniform weight — signal weighting deferred to Phase 5
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 13, 3],
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0,   "rgba(0,0,0,0)",
            0.2, "rgba(99,102,241,0.4)",
            0.5, "rgba(234,179,8,0.6)",
            0.8, "rgba(234,88,12,0.75)",
            1,   "rgba(220,38,38,0.85)",
          ],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 8, 13, 40],
          "heatmap-opacity": 0.7,
        },
      });

      map.on("click", "parcels-fill", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const p = PARCELS.find((x) => x.id === f.properties?.id);
        if (p) onParcelClick?.(p);
      });

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
  }, [onParcelClick, onAgendaClick]);

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

    if (map.getLayer("parcels-fill")) {
      map.setPaintProperty(
        "parcels-fill",
        "fill-color",
        layers.gap ? ["case", ["get", "hasGap"], "#c026d3", "#6366f1"] : "#6366f1",
      );
    }
  }, [layers]);

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
