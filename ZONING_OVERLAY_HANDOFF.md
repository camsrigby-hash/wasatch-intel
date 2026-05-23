# Zoning Overlay — Design Handoff

Design-only mockup of the Zoning Overlay layer for Wasatch Intel. All UI is built and visually approved against local dummy data. Your job: wire it to real D1-backed parcel data without changing the visual design.

## What exists

### New files (all design-only, dummy-data-backed)
- `src/components/MapCanvas.tsx` — mockup harness. Renders a faux satellite backdrop + SVG grid of mock parcels. **Replace the SVG grid with the real MapLibre/Mapbox canvas.** Keep the layer-state shape and the right-side panel layout.
- `src/components/LayerTogglePanel.tsx` — layer toggle card. Owns `LayerState` shape: `{ gapScore, stip, zoning, zoningView }`. "Zoning" sits alongside gap-score and STIP. When `zoning` is on, a segmented Current/Future sub-toggle appears nested under it. Defaults to `future`.
- `src/components/ZoningLegend.tsx` — collapsible legend card. Renders only when zoning layer is on. Shows the 8 buckets + a "No data" row with hatched swatch.
- `src/components/ParcelPopup.tsx` — parcel detail popup. Two states: data-present (color swatch + bucket name + raw code + jurisdiction + source method badge + plan vintage + optional currency-note callout) and no-data (hatched swatch + jurisdictional explanation + cross-view nudge).
- `src/lib/zoning-mock.ts` — **dummy data + the real palette + the canonical type contracts.** Read this file first.
- `src/routes/map.tsx` — the `/map` route. Just renders `<MapCanvas />`.

### Modified files
- `src/routes/index.tsx` — replaced placeholder with a link to `/map`. Not load-bearing.

Nothing else was touched. No routes added beyond `/map`. No API endpoints, no fetchers, no backend.

## The contracts you need to honor

### `ZoningBucket` (8 normalized buckets)
```
"low_res" | "med_res" | "high_res" | "commercial"
| "mixed_use" | "industrial" | "open_ag" | "public_inst"
```
The normalization layer (zone-code → bucket) lives outside this mockup. Whatever maps city zone codes to these 8 IDs is your responsibility — the UI just consumes the bucket ID.

### `ZoningView`
```
"current" | "future"
```
Default `future`. Single-select. The user picks one view at a time; the legend and popup both reflect the active view.

### Parcel shape consumed by the popup
```ts
{
  id: string;
  current: ZoningBucket | null;       // null = no current zoning on file
  future: ZoningBucket | null;        // null = no future GP / land use on file
  rawCode: string | null;             // e.g. "Mixed Use - Towne Center"
  jurisdiction: string;               // e.g. "Salt Lake City"
  sourceMethod: "REST" | "PDF_vision_Cam_KMZ" | "manual" | null;
  vintage: string | null;             // e.g. "2025"
  currencyNote?: string;              // e.g. "NLS_source_authority_unverified"
}
```
Drop the mock `col`/`row` fields — those are mockup-grid coordinates only. Real parcels come with geometry.

### Palette (locked, copy verbatim)
| Bucket | Hex |
|---|---|
| Low-density residential | `#FFF1B8` |
| Medium-density residential | `#FFD166` |
| High-density residential | `#F4845F` |
| Commercial | `#E63946` |
| Mixed-use | `#C5468C` |
| Industrial | `#8E5BD9` |
| Open / agricultural / special | `#4FB477` |
| Public / institutional | `#3A86FF` |
| No data | `#6B7280` + 45° white hatch pattern |

Tuned for CVD separation (warm density ramp + red-magenta-purple intensity ramp + cool open/public hues), readable contrast on dark satellite imagery, and distinguishability at low zoom. Each swatch in the UI has an inner white ring + outer dark ring for tile-agnostic contrast — preserve this when rendering on the real map (e.g. dark 0.5px parcel stroke at high zoom).

## How to wire it

1. **Replace the SVG grid in `MapCanvas.tsx`** with the real map (MapLibre/Mapbox GL). Keep the surrounding layout intact: layer panel top-right, legend below it (only when zoning is on), popup bottom-left.

2. **Style parcels by zoning bucket.** Read `ZONING_BUCKETS` / `BUCKET_BY_ID` from `src/lib/zoning-mock.ts` for the canonical color mapping. Apply fill based on `layers.zoningView` (`current` vs `future`). For parcels where the active view's bucket is `null`, use the no-data hatch — the SVG `<pattern id="no-data-hatch">` in `MapCanvas.tsx` is a reference for the visual; in MapLibre, use a fill-pattern image or a styled raster overlay.

3. **Hook up parcel click → popup.** On click, fetch the parcel detail (via the existing `/api/parcel` endpoint) and pass it into `<ParcelPopup parcel={...} view={layers.zoningView} onClose={...} />`. The popup component handles both the data-present and no-data states based on whether `current` / `future` is null for the active view.

4. **Layer toggle state stays where it is.** `LayerState` is owned by `MapCanvas` via `useState`. If you lift it to a store later, keep the shape identical so the panel and legend keep working.

5. **Move `ZONING_BUCKETS`, `BUCKET_BY_ID`, `NO_DATA_COLOR`, and the type exports out of `zoning-mock.ts`** into a real module (e.g. `src/lib/zoning.ts`). Delete `MOCK_PARCELS`, `GRID_COLS`, `GRID_ROWS`, and the `col`/`row` fields on `MockParcel`. Update imports in the three components.

6. **Performance note.** ~947k parcels. Don't render parcels as individual DOM/SVG nodes (the mockup does, which is why it tops out at ~1.3k). Use vector tiles or a single MapLibre fill layer with a data-driven `fill-color` expression keyed off the bucket ID.

## What's intentionally not in the mockup

- No basemap library — the faux satellite is a CSS gradient.
- No real geometry — parcels are a uniform grid.
- No clustering, no zoom-dependent styling, no parcel hover state (only click).
- No keyboard accessibility on parcel selection.
- No legend interaction (clicking a swatch doesn't filter). If product wants filter-by-bucket later, the legend is the natural home.
- No tooltip on raw zone code. If codes get long, add a `Tooltip` from `@/components/ui/tooltip`.

## Design decisions worth preserving

- **Future is the default view.** The prospecting signal lives in future land use; current zoning is the verification layer.
- **Segmented button, not radio.** Matches the existing toggle/switch UI register better than form-style radios.
- **Legend is collapsible but open by default.** Eight rows is borderline for always-visible; collapse lets power users reclaim space.
- **No-data is a first-class state, not an empty popup.** Jurisdictional context ("Erda has not published…") + a nudge to the other view if it has data.
- **Currency note renders as an amber callout, not buried in a field.** When `NLS_source_authority_unverified` shows up, prospectors need to see it before they act.
