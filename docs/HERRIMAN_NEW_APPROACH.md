# Herriman 18b-2d-2 — Cam-KMZ + Sampling Approach

**STATUS: SHIPPED May 18 2026.** Herriman 18b-2d-2 complete via bbox+multi-city whitelist fix. 28,195 parcels sampled across Herriman/South Jordan/Bluffdale/Unincorporated SLC. Herriman-only MUT 7.4% (vs prior 8.8%), South Jordan 78% MUT reflects Olympia town center. See PROJECT_DIRECTION.md SD-21 for the canonical Cam-KMZ workflow.

**Status**: ~~New approach, ready to build.~~ SHIPPED. Replaces failed 18b-2d algorithmic georeferencing.
**Date**: May 18, 2026
**Owner**: Cam Rigby
**Cross-references**: `HERRIMAN_FOLLOWUP.md` + `PROJECT_DIRECTION.md` (SD-19, SD-20)

---

## Context — what failed and why

Phase 18b-2d shipped a raster-overlay-and-sample pipeline (`scripts/gp_raster_sample_extract.py` in tooele-land-intel). For Herriman it produced 16,408 per-parcel zone assignments. Eye-test in Google Earth Pro revealed:

1. Adjacent parcels in the same Map 7 zone got assigned ~10 different zones — variance way beyond what color-sampling noise alone could produce
2. Mixed Use Towne Center was over-represented at 26.5% of parcels
3. Diagnosis: combination of (a) algorithmic georeferencing offset from only 3 control points, AND (b) Herriman's Map 7 uses semi-transparent zoning colors over a satellite basemap in the outskirts, contaminating pixel samples

**Key insight from Cam**: he can manually overlay the source PDF map onto Google Earth Pro satellite imagery using local knowledge (Mountain View Corridor, Bangerter, city boundary, named streets) and achieve ~99% alignment confidence. The georeferencing step is something a human with local geography knowledge does dramatically better than 3 vision-picked CPs and an affine transform.

This decouples the problem: human handles georeferencing (the hard part), algorithm handles color sampling (the easy part).

---

## What Cam has already done

Cam manually georeferenced Map 7 in Google Earth Pro and exported as KMZ. The KMZ filename is `Herriman_Zoning.kmz` — note: the file is named "Zoning" but it's actually **Map 7 — Future Land Use 2025** from the 2013 GP Amendment, page 34. Misnaming is irrelevant to the work, just a label.

KMZ contents (already inspected):

- `doc.kml` — `GroundOverlay` with corner coordinates: N 40.5421°, S 40.4425°, E -111.9241°, W -112.0941°
- `files/herriman zoning map.png` — 1096×857 PNG, ~42 ft per pixel
- Alignment confidence per Cam: 99%
- Map 7 has 16 zone categories (NOT 17). Verified May 18 2026 via Cam's annotated Legend.png.

The KMZ needs to be placed at `tooele-land-intel/data/_pdf_cache/herriman/Herriman_Zoning.kmz` before CC runs the build. (See companion CC prompt for the move step.)

---

## Decisions locked before next chat

- **Map source**: Map 7 (Future Land Use 2025) from the 2013 GP Amendment, page 34. NOT Map 3 (current zoning).
- **Vintage flags** (must appear in output feature properties):
    - `flu_plan_vintage="2013_amendment_2025_horizon"`
    - `flu_currency_note="may not reflect post-2013 updates; FLU2022 exists on Herriman internal Enterprise GIS but is not publicly accessible"`
    - `source_pdf_page=34`
    - `source_pdf_filename="Herriman_GP_Amendment.pdf"`
- **Output**: per-parcel zone label column (joins to D1 later) + derived GeoJSON for visualization. Same schema v2 as 18b-2d.
- **Branch**: `phase-18b-2d-raster-sample` (continue on existing branch, do not create new)
- **Spanish Fork**: stays on 18b-2c shipped version, no refactor

---

## Build spec for next CC prompt

### Stage 1 — KMZ ingestion

- Read `Herriman_Zoning.kmz` at `tooele-land-intel/data/_pdf_cache/herriman/Herriman_Zoning.kmz`
- Extract `doc.kml` and `files/herriman zoning map.png`
- Parse `<LatLonBox>` corners (N/S/E/W)
- Convert PNG + corners to a georeferenced GeoTIFF using `rasterio`
- Output: `data/_pdf_cache/herriman/herriman_cam_georef.tif`
- Validate: GeoTIFF opens cleanly, bounds match the KML LatLonBox

### Stage 2 — Legend extraction

- The full Map 7 image including the legend is on `Herriman_GP_Amendment.pdf` page 34. The KMZ contains the map portion only (no legend).
- If `data/zoning/future/legends/herriman_legend.json` already exists from the prior 18b-2d run, reuse it as the starting point but validate quality
- If quality is suspect, re-run legend extraction once with a tighter prompt that emphasizes color swatch RGB precision and instructs vision to enumerate all 16 categories explicitly. The prior run produced 16 categories; this matches Map 7's actual count (verified May 18 2026)
- Output: `{zone_label: [r, g, b]}` mapping, cached at the same path

### Stage 3 — Per-parcel sampling

- Reuse `gp_raster_sample_extract.py` infrastructure exactly as it works today
- Input swap: instead of the algorithmically-georeferenced TIF, use `herriman_cam_georef.tif`
- Parcel filter: `parcel_city == 'Herriman'` (16,408 parcels)
- Sampling rules unchanged: LAB nearest-color match, 5×5 window, centroid → interior_point fallback → mark unknown
- Output: `data/zoning/future/herriman_gp.geojson` (overwrites prior failed extraction) + `data/zoning/future/herriman_gp_parcel_table.csv`

### Stage 4 — Convert to KMZ for eye-test

- After sampling, run the same GeoJSON→KMZ converter we used last time (`simplekml`, polygons grouped by zone in folders, 50% opacity, colored by `sampled_zone`)
- Output: `data/zoning/future/herriman_gp.kmz`

### Stage 5 — Cam eye-test (manual, in Google Earth Pro)

- Cam opens both `Herriman_Zoning.kmz` (his overlay) AND `herriman_gp.kmz` (new output) in Google Earth Pro
- Toggle layers on/off, spot-check 10 parcels across different zones, validate Mixed Use Towne Center distribution
- Compare against his manual overlay as the alignment ground-truth

### Stage 6 — Decision routing

- **Pass**: ship Herriman; consider merging PR #11 with both 18b-2c (Spanish Fork + REST cities) AND 18b-2d-2 (Herriman) included
- **Fail**: diagnose whether residual error is color-mapping or alignment, iterate one of those stages

---

## Cost budget

$1 total. Most stages are pure file operations or one cached Claude vision call.

---

## Architectural decision to add to PROJECT_DIRECTION.md after success

### SD-21 — Cam-KMZ georeferencing for satellite-overlay PDF maps (date TBD, contingent on Herriman success)

For PDF maps with satellite-basemap underlay (Herriman Map 7 style), algorithmic georeferencing via 3 vision-picked CPs produces too much misregistration for downstream color sampling. New canonical workflow for such cities: Cam manually overlays the source PDF as a Google Earth Pro GroundOverlay using local geography knowledge, exports KMZ, hands to CC. CC extracts the georeferenced raster from the KMZ and runs the existing 18b-2d color-sampling pipeline against it. Cam-time per city: ~15 minutes. Reusable workflow for any future city whose GP map has a satellite underlay or low-contrast colors. Spanish Fork-style flat-color maps stay on fully-automated 18b-2d.

---

## Open questions (none blocking — just to surface)

1. ~~The 18b-2d run produced a 16-category legend; Map 7 has 17. Which zone was dropped?~~ **Resolved May 18 2026**: Map 7 has 16 categories. The prior run's count was correct. Verified via Cam's annotated Legend.png.
2. Polygon-grouped folders in the eye-test KMZ — keep the current folder structure or simplify?
3. How does this workflow integrate into Phase 18b-3 D1 load? Same schema, should slot in normally, but worth confirming.

---

## What the next chat should start with

Cam will paste roughly:

> "Continuing Wasatch Intel Phase 18b-2d-2. Read docs/HERRIMAN_NEW_APPROACH.md for full context. Generate the CC prompt to execute the Stage 1–4 build."

That should kick off a clean session with no prior thread drift.
