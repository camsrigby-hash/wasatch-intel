import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";
import "maplibre-gl/dist/maplibre-gl.css";
import { LayerTogglePanel, type LayerState } from "@/components/LayerTogglePanel";
import { ZoningLegend } from "@/components/ZoningLegend";
import { ParcelPopup } from "@/components/ParcelPopup";
import {
  BUCKET_BY_ID,
  BUCKET_FROM_D1_VALUE,
  NO_DATA_COLOR,
  type Parcel,
  type ZoningBucket,
  type ZoningView,
} from "@/lib/zoning";

// Register the PMTiles protocol once at module load — idempotent guard prevents
// double-registration if HMR re-evaluates this module.
let pmtilesProtocolAdded = false;
function ensurePmtilesProtocol() {
  if (pmtilesProtocolAdded) return;
  const protocol = new Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tile.bind(protocol));
  pmtilesProtocolAdded = true;
}

/** PMTiles R2 URL — served by Worker /tiles/:filename (Range request passthrough). */
const PARCEL_TILES_URL = "pmtiles:///tiles/parcels.pmtiles";

/** tippecanoe --layer name (set during Phase 14a bake). */
const PARCEL_SOURCE_LAYER = "parcels";

const SOURCE_ID = "parcels";
const FILL_LAYER_ID = "zoning-fill";
const OUTLINE_LAYER_ID = "zoning-outline";

/** Build a MapLibre case expression mapping zone_*_normalized → palette hex. */
function buildZoningFillExpr(view: ZoningView): maplibregl.ExpressionSpecification {
  const col = view === "current" ? "zone_current_normalized" : "zone_future_normalized";
  const cases: (string | maplibregl.ExpressionSpecification)[] = [];
  for (const [d1Value, bucketId] of Object.entries(BUCKET_FROM_D1_VALUE)) {
    cases.push(["==", ["get", col], d1Value] as maplibregl.ExpressionSpecification);
    cases.push(BUCKET_BY_ID[bucketId as ZoningBucket].color);
  }
  return ["case", ...cases, NO_DATA_COLOR] as maplibregl.ExpressionSpecification;
}

/** Build a Parcel from MapLibre tile feature properties. No API round-trip needed —
 *  all 10 zoning columns are baked into parcels.pmtiles (Phase 14a). */
function parcelFromFeature(
  props: Record<string, unknown>,
  view: ZoningView,
): Parcel {
  const currentNorm  = (props.zone_current_normalized as string | null) ?? null;
  const futureNorm   = (props.zone_future_normalized  as string | null) ?? null;
  const currentBucket = currentNorm ? (BUCKET_FROM_D1_VALUE[currentNorm] ?? null) : null;
  const futureBucket  = futureNorm  ? (BUCKET_FROM_D1_VALUE[futureNorm]  ?? null) : null;

  const rawCode =
    view === "current"
      ? ((props.zone_current as string | null) ?? null)
      : ((props.zone_future  as string | null) ?? null);

  const sourceRaw =
    view === "current"
      ? (props.zone_current_source as string | null)
      : (props.zone_future_source  as string | null);
  const sourceMethod = (["REST", "PDF_vision_Cam_KMZ", "manual"].includes(sourceRaw ?? "")
    ? sourceRaw
    : null) as Parcel["sourceMethod"];

  return {
    id:           String(props.parcel_id ?? props.id ?? "unknown"),
    current:      currentBucket,
    future:       futureBucket,
    rawCode:      rawCode,
    jurisdiction: String(props.jurisdiction ?? "Unknown"),
    sourceMethod,
    vintage:      (props.flu_plan_vintage as string | null) ?? null,
    currencyNote: (props.flu_currency_note as string | null) ?? undefined,
  };
}

export function MapCanvas() {
  const [layers, setLayers] = useState<LayerState>({
    gapScore:   false,
    stip:       false,
    zoning:     true,
    zoningView: "future",
  });

  const [selected, setSelected] = useState<Parcel | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef          = useRef<maplibregl.Map | null>(null);

  // Keep a ref so the click handler always reads current layer state without
  // re-running the map-init effect on every state change.
  const layersRef = useRef(layers);
  useEffect(() => { layersRef.current = layers; }, [layers]);

  // ── Map init ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    ensurePmtilesProtocol();

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
      center: [-112.1, 40.5],
      zoom: 9,
    });

    map.on("load", () => {
      // ── Parcel vector source ─────────────────────────────────────────────
      map.addSource(SOURCE_ID, {
        type: "vector",
        url: PARCEL_TILES_URL,
        promoteId: "parcel_id",
      });

      // ── Zoning fill layer ────────────────────────────────────────────────
      map.addLayer({
        id:           FILL_LAYER_ID,
        type:         "fill",
        source:       SOURCE_ID,
        "source-layer": PARCEL_SOURCE_LAYER,
        paint: {
          "fill-color":   buildZoningFillExpr(layersRef.current.zoningView),
          "fill-opacity": layersRef.current.zoning ? 0.85 : 0,
        },
      });

      // ── Parcel outline (subtle, high-zoom only) ──────────────────────────
      map.addLayer({
        id:           OUTLINE_LAYER_ID,
        type:         "line",
        source:       SOURCE_ID,
        "source-layer": PARCEL_SOURCE_LAYER,
        minzoom:      13,
        paint: {
          "line-color": "rgba(0,0,0,0.45)",
          "line-width": 0.5,
        },
      });

      // ── Parcel click → popup ─────────────────────────────────────────────
      map.on("click", FILL_LAYER_ID, (e) => {
        if (!e.features?.length) return;
        const props = e.features[0].properties as Record<string, unknown>;
        const parcel = parcelFromFeature(props, layersRef.current.zoningView);
        setSelected(parcel);
      });

      map.on("mouseenter", FILL_LAYER_ID, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", FILL_LAYER_ID, () => {
        map.getCanvas().style.cursor = "";
      });
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync zoning fill-color when view switches (current ↔ future) ─────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    if (!map.getLayer(FILL_LAYER_ID)) return;
    map.setPaintProperty(
      FILL_LAYER_ID,
      "fill-color",
      buildZoningFillExpr(layers.zoningView),
    );
  }, [layers.zoningView]);

  // ── Sync fill-opacity when zoning layer toggled on/off ───────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    if (!map.getLayer(FILL_LAYER_ID)) return;
    map.setPaintProperty(FILL_LAYER_ID, "fill-opacity", layers.zoning ? 0.85 : 0);
  }, [layers.zoning]);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#0d1117]">
      {/* MapLibre canvas */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      {/* Top-left brand */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <div className="text-xs font-semibold tracking-wider uppercase text-white/90 drop-shadow">
          Wasatch Intel
        </div>
        <div className="text-[10px] text-white/60 drop-shadow">
          ~947k parcels · Wasatch Front
        </div>
      </div>

      {/* Right panel: layer toggle + legend */}
      <div className="absolute top-4 right-4 z-10 space-y-3">
        <LayerTogglePanel state={layers} onChange={setLayers} />
        {layers.zoning && <ZoningLegend view={layers.zoningView} />}
      </div>

      {/* Popup */}
      {selected && (
        <div className="absolute bottom-4 left-4 z-20">
          <ParcelPopup
            parcel={selected}
            view={layers.zoningView}
            onClose={() => setSelected(null)}
          />
        </div>
      )}
    </div>
  );
}
