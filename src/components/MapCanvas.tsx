import { useMemo, useState } from "react";
import { LayerTogglePanel, type LayerState } from "@/components/LayerTogglePanel";
import { ZoningLegend } from "@/components/ZoningLegend";
import { ParcelPopup } from "@/components/ParcelPopup";
import {
  BUCKET_BY_ID,
  GRID_COLS,
  GRID_ROWS,
  MOCK_PARCELS,
  NO_DATA_COLOR,
  type MockParcel,
} from "@/lib/zoning-mock";

/**
 * MapCanvas — design mockup harness.
 *
 * NOTE: This is a visual-only mockup against local dummy data. The real map
 * (MapLibre/Mapbox + D1-backed parcel tiles) will be wired in a later pass.
 * Keep the layer-toggle integration shape here so it can be lifted out.
 */
export function MapCanvas() {
  const [layers, setLayers] = useState<LayerState>({
    gapScore: false,
    stip: false,
    zoning: true,
    zoningView: "future",
  });

  const [selected, setSelected] = useState<MockParcel | null>(null);

  const parcels = useMemo(() => MOCK_PARCELS, []);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#0d1117]">
      {/* Faux satellite basemap — dark terrain gradient with subtle road grid. */}
      <BasemapBackdrop />

      {/* Parcel grid */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="relative"
          style={{
            width: "min(96vw, 1600px)",
            aspectRatio: `${GRID_COLS} / ${GRID_ROWS}`,
          }}
        >
          <svg
            viewBox={`0 0 ${GRID_COLS} ${GRID_ROWS}`}
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full"
          >
            <defs>
              <pattern
                id="no-data-hatch"
                width="0.6"
                height="0.6"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
              >
                <rect width="0.6" height="0.6" fill={NO_DATA_COLOR} fillOpacity="0.55" />
                <line x1="0" y1="0" x2="0" y2="0.6" stroke="white" strokeOpacity="0.25" strokeWidth="0.15" />
              </pattern>
            </defs>
            {parcels.map((p) => {
              const bucketId = layers.zoningView === "current" ? p.current : p.future;
              const showZoning = layers.zoning;
              const hasData = bucketId !== null;
              const fill = !showZoning
                ? "rgba(255,255,255,0.04)"
                : hasData
                  ? BUCKET_BY_ID[bucketId!].color
                  : "url(#no-data-hatch)";
              const opacity = !showZoning ? 0.9 : hasData ? 0.92 : 1;
              return (
                <rect
                  key={p.id}
                  x={p.col + 0.04}
                  y={p.row + 0.04}
                  width={0.92}
                  height={0.92}
                  fill={fill}
                  fillOpacity={opacity}
                  stroke="rgba(0,0,0,0.35)"
                  strokeWidth={0.03}
                  className="cursor-pointer hover:stroke-white hover:[stroke-width:0.08] transition-[stroke,stroke-width]"
                  onClick={() => setSelected(p)}
                />
              );
            })}

            {/* Mock STIP overlay — corridor highlights */}
            {layers.stip && (
              <g>
                <rect x="0" y="9.1" width={GRID_COLS} height="0.8" fill="#22d3ee" fillOpacity="0.35" />
                <rect x="0" y="19.1" width={GRID_COLS} height="0.8" fill="#22d3ee" fillOpacity="0.35" />
              </g>
            )}

            {/* Mock gap-score heat overlay */}
            {layers.gapScore && (
              <g style={{ mixBlendMode: "screen" }}>
                {parcels.map((p, i) => (
                  <rect
                    key={`gs-${p.id}`}
                    x={p.col}
                    y={p.row}
                    width={1}
                    height={1}
                    fill="#f43f5e"
                    fillOpacity={((i * 37) % 100) / 400}
                  />
                ))}
              </g>
            )}
          </svg>
        </div>
      </div>

      {/* Top-left brand */}
      <div className="absolute top-4 left-4 z-10">
        <div className="text-xs font-semibold tracking-wider uppercase text-white/90">
          Wasatch Intel
        </div>
        <div className="text-[10px] text-white/50">
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

      {/* Footer hint */}
      <div className="absolute bottom-3 right-4 z-10 text-[10px] text-white/40 font-mono">
        Design mockup · dummy data
      </div>
    </div>
  );
}

function BasemapBackdrop() {
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 30% 40%, #1f2937 0%, #0d1117 60%, #050709 100%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
    </>
  );
}
