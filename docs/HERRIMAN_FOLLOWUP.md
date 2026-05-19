# Herriman GP FLU extraction — follow-up log

**RESOLVED — May 18 2026.** The tile-refinement approach documented here was superseded by the Cam-KMZ workflow (SD-21). Herriman 18b-2d-2 shipped: 28,195 parcels sampled, Herriman-only MUT 7.4%. See [PROJECT_DIRECTION.md](PROJECT_DIRECTION.md) SD-21 for the canonical workflow.

Status / ledger entries for Herriman's GP FLU extraction across the Phase 18b-2 sub-phases.

## Current state

**Shipped under 18b-2d-2 (Cam-KMZ + raster-overlay) on `phase-18b-2d-raster-sample` (tooele-land-intel). Eye-test passed.**

- 16,408 Herriman parcels labeled, 99.5% coverage (16,331 sampled / 77 unknown)
- 16-entry legend extracted via Claude vision (2 calls, cached)
- Georeference RMSE 0.0 ft (3 manual CPs = exact fit), rotation 22.47°
- Source: `data/_pdf_cache/herriman/herriman_map7_p34.pdf` (page-34 extract of `Herriman_GP_Amendment.pdf`)
- Outputs: `data/zoning/future/herriman_gp.geojson` + `data/zoning/future/herriman_gp_parcel_table.csv` + `data/zoning/future/legends/herriman_legend.json` + `data/_pdf_cache/herriman/herriman_georef.tif`
- Total cost: $0.2221
- Pipeline: `scripts/gp_raster_sample_extract.py` (new, ~700 lines)

## History

- **May 18, 2026** — Vector tracing approach abandoned per SD-20. Herriman now extracting via Phase 18b-2d raster-sample pipeline. First end-to-end run shipped; eye-test pending before PR.
- **May 16, 2026 (manual CPs path)** — Single Opus vision call ($0.0828) identified pixel coords for Main St × Pioneer St, Fort Herriman Pkwy × 13400 South, Herriman Pkwy × Rosecrest Rd from `_page_000.jpg` (3300×2550 px). Manual CPs JSON saved at `data/zoning/future/herriman_manual_cps.json`. Reused verbatim by 18b-2d.
- **May 16, 2026 (Stage 2 named-street bias)** — `CONTROL_POINT_PROMPT` updated with STREET SELECTION PRIORITY block; `CITY_CONFIGS["herriman"]["stage2_preferred_streets"]` populated with 9 named local streets. Result: 2/6 CPs survived SD-18 gate — auto path exhausted; manual CPs required.
- **May 16, 2026 (Stage 3 intersection-node refactor)** — `_overpass_intersection_lookup` added with Overpass QL named-set intersection. Direct tests confirm Herriman named streets resolvable (Rosecrest×MtnView, Main×Pioneer, Herriman Pkwy×Rosecrest, Fort Herriman×13400S). But Stage 2 vision keeps surfacing numbered arterials as primary landmarks on Map 7, so end-to-end pipeline still aborts at Stage 3.
- **May 16, 2026 (REST re-sweep)** — Negative. Herriman FLU2022 layer is firewall-blocked on internal Enterprise GIS. Public AGOL org has no FLU service. Documented as a Future Opportunity in `docs/PROJECT_DIRECTION.md` (one-time GeoJSON export via Herriman planning contact / GRAMA records request would supersede 18b-2d).
- **May 16, 2026 (SD-18 gate re-run)** — SD-18 quality gates (Rule A node-count + Rule B collinearity) implemented. Working correctly — rejected 4/5 numbered-road CPs. Only 1 surviving CP, need ≥3. Confirmed Herriman Map 7 CP composition is the bottleneck, not the gate.
- **May 16, 2026 (GP Amendment re-attempt)** — Stage 3 degenerate due to SD-18 Overpass bug → RMSE 0.0 ft false positive, 1 feature, unusable.
- **May 16, 2026 (tile-refinement)** — Stage 2b `--tile-refine` flag added. Herriman 4-CP re-run: RMSE 1051.2 ft (vs prior 1017.9 ft baseline — slightly worse). 500px tile window too small for high-residual CPs (>1000 ft residuals are >250 px out of tile center). Option (c) defer activated; superseded by SD-20.

## Open items

1. **Eye-test Herriman 18b-2d output**: overlay `herriman_gp.geojson` features colored by `sampled_zone` on Map 7. Spot-check 10–20 parcels across zones for correct color → zone assignment.
2. **Legend completeness**: 16 swatches extracted vs 17 in source map. Identify which zone collapsed.
3. **OCR typos in legend**: `Commericial`, `Utiliites` — D1 normalizer (18b-3) will canonicalize.
4. **UGRC city boundary path**: `MunicipalBoundaries/FeatureServer/0` returned 400; `SLCo_Municipal_Boundaries` has empty layer set. Fallback was `--restrict-parcel-city`. Worth investigating the AGRC parent service URL for a future polygon-filter improvement (lower priority).
5. **PR ordering**: PR #11 (18b-2c, Spanish Fork + REST) remains open. Decide whether to merge 18b-2c first, then open separate 18b-2d PR, or bundle.
