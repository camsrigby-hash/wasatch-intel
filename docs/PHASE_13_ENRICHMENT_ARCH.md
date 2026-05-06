# Phase 13 — Enrichment Pipeline Architecture

**Status:** Architecture-only. No code in this phase.
**Author:** Claude Code (Opus 4.7), 2026-05-05.
**Branch:** `phase-13a-arch`.
**Consumers:** Phase 13b (Manus execution), Phase 14 (frontend wiring), Phase 16 (DD enrichment).

This document specifies how to populate `parcel_records` (D1 table from migration `0002_pipeline_rebuild.sql`) for all 13 jurisdictions with real scoring-component data. It is the single source-of-truth that Phase 13b sub-tasks draw from.

The 13 jurisdictions span 3 counties:

| County | Jurisdictions |
|---|---|
| Tooele | Erda, Grantsville, Tooele City |
| Salt Lake | South Jordan, Herriman, Bluffdale, Draper |
| Utah | Lehi, Saratoga Springs, Eagle Mountain, American Fork, Vineyard, Spanish Fork |

Estimated parcel volume after city-boundary clip: **~250k–300k**. Raw county totals (UGRC LIR): Tooele 45,656; Salt Lake 394,610; Utah 327,655 = **767,921 county-wide**, of which a city-boundary intersection retains roughly one-third (incorporated portions only).

---

## 1. DATA SOURCES & ENDPOINTS

### 1.1 UGRC LIR parcels (primary source)

Hosted on UGRC's AGOL tenant `services1.arcgis.com/99lidPhWCzftIe9K`. All endpoints anonymous, no API key. Confirmed live 2026-05-05.

| County | Service URL | Records | Last edit (probed) |
|---|---|---|---|
| Tooele | `/Parcels_Tooele_LIR/FeatureServer/0` | 45,656 | per UGRC update cycle |
| Salt Lake | `/Parcels_SaltLake_LIR/FeatureServer/0` | 394,610 | per UGRC update cycle |
| Utah | `/Parcels_Utah_LIR/FeatureServer/0` | 327,655 | per UGRC update cycle |

**Auth:** none (anonymous AGOL). **Rate limit:** undocumented but observed ~5 req/s sustainable; `maxRecordCount` = 1000 per page, so use `resultOffset` paging. **Cost:** free. **Robustness:** UGRC publishes update tables on the SGID Cadastre page; expect a 6–18 month lag from county recorder to LIR. Service-down events <1/year, typically <2 hours.

**Field schema** (confirmed via metadata probe — same shape as CM_RE inventory at `tooele-land-intel/vendor/cm_re/parcel/parcel_fetcher.py`):

```
PARCEL_ID, PARCEL_ADD, PARCEL_CITY, PARCEL_ACRES,
PROP_CLASS, PRIMARY_RES, HOUSE_CNT, SUBDIV_NAME,
BLDG_SQFT, BUILT_YR, EFFBUILT_YR,
TOTAL_MKT_VALUE, LAND_MKT_VALUE,
TAXEXEMPT_TYPE, TAX_DISTRICT, COUNTY_NAME
```

**Service path discovery rule:** `Parcels_<CountyName>_LIR` where `<CountyName>` is the county name in PascalCase, **with one exception**: Salt Lake is `SaltLake` (no underscore). All 29 Utah counties follow this pattern.

**Jurisdiction filter:** parcels are county-scoped, not city-scoped. To filter to a jurisdiction, intersect the `PARCEL_CITY` field (when non-null) AND/OR perform a polygon spatial filter against the city-boundary feature from `services1.arcgis.com/99lidPhWCzftIe9K/.../UtahMunicipalBoundaries/FeatureServer/0`. Use both — `PARCEL_CITY` is sometimes blank or stale.

### 1.2 UGRC Roads + DOT_AADT (already wired)

`https://services1.arcgis.com/99lidPhWCzftIe9K/ArcGIS/rest/services/UtahRoads/FeatureServer/0`

Already used by `tooele-land-intel/scripts/enrich_roads.py`. Critical fact: the UGRC roads layer **already embeds `DOT_AADT`** as a per-segment field. For arterial AADT lookup against a parcel centroid, this layer alone is sufficient — no UDOT trip needed. CARTOCODE values: 1 = interstate, 2 = US route, 3 = state route, 4 = county route major, 5 = county route minor.

**Auth:** none. **Rate limit:** as 1.1. **Cost:** free.

### 1.3 UDOT AADT 2024 (freshness boost)

`https://services.arcgis.com/pA2nEVnB6tquxgOW/ArcGIS/rest/services/AADT2024_Unrounded/FeatureServer/3`

4,574 segments, fields `AADT2024` through `AADT2002` (22 historical years), Station/RouteID/BeginPoint/EndPoint/SectionLength.

**When to prefer over 1.2:** when a parcel sits on a state or federal route and the most-recent AADT year matters (e.g., comparing growth velocity 2020→2024). For routine enrichment, UGRC roads `DOT_AADT` is a year or two stale but adequate.

**Auth:** none on this layer. **Rate limit:** maxRecordCount 2000 per page. **Cost:** free. **Robustness:** UDOT republishes annually around April; the `AADT2025_Unrounded` service will appear ~2026-04 to ~2027-04. Hard-coding `AADT2024` will rot — generalize to `AADT{currentYear-1}` and fall back if the service doesn't exist.

### 1.4 UDOT traffic signals

`https://services.arcgis.com/pA2nEVnB6tquxgOW/ArcGIS/rest/services/signalscount2_3/FeatureServer/0`

576 statewide signal records. `last edit` 2024-07-27 per the metadata probe — updates infrequently. Use `cacheMaxAge: 30` (per service config) — daily-fresh sufficient.

**Auth:** none. **Cost:** free. **Robustness:** 576 records statewide is small enough to fetch in one page.

### 1.5 UDOT STIP (already wired)

`https://services.arcgis.com/pA2nEVnB6tquxgOW/ArcGIS/rest/services/...` per `tooele-land-intel/scripts/fetch_stip.py`. Phase 4 ingestion produces `data/stip_projects.geojson` (227 features, Tooele bbox). Expand bbox to cover the full 13-jurisdiction extent in Phase 13b.

### 1.6 Google Places (Nearby Search)

`https://places.googleapis.com/v1/places:searchNearby` (Places API New, post-2024 endpoint).

**Auth:** `X-Goog-Api-Key` header from `GOOGLE_PLACES_API_KEY` env var (not yet set; see §4).
**Rate limit:** 600 QPM per key; soft limits scale with billing.
**Cost (2026 SKU model):**
- Nearby Search **Pro** (location + place type): **~$32 / 1000** requests
- Nearby Search **Enterprise** (advanced fields like price level, reviews): **~$40 / 1000**
- $200/mo credit ended Feb 2025 — every request is billable now
- 5,000 free Pro events/mo if SKU stays in Essentials (basic fields only)

**Robustness:** Google deprecates Places API legacy quarterly. The **New** Places API is canonical post-March 2025. Do not use the legacy `https://maps.googleapis.com/maps/api/place/nearbysearch/json` endpoint — it returns degraded data and will be removed.

### 1.7 WFRC TAZ + travel demand (commute corridor)

`https://data.wfrc.org/datasets/traffic-analysis-zones-taz-wasatch-front` — TAZ polygons.
`https://data.wfrc.org/datasets/ccfa9a38332a41ca8552729aebdf8ccf_0/about` — TAZ ATO (Access to Opportunities) attributes including job counts and HH counts per TAZ.

**Auth:** none (open data hub).
**Cost:** free.
**Robustness:** WFRC publishes TDM updates roughly biennially (next: 2026 RTP cycle). Endpoint stability is good but the AGOL item ID may change between releases — query data.wfrc.org listings for `taz` and pin to a specific item ID at ingestion time, refresh annually.

The actual ArcGIS REST FeatureServer URL for each WFRC TAZ dataset must be discovered at ingest time by following the `/about` page → "View Service" → REST endpoint. Phase 13b sub-task should record the resolved URL in a config file, not hard-code it.

### 1.8 Employment node coordinates (static seed)

Hand-curated list of high-employment destinations. **No external service** — these are static lat/lng tuples committed to a config file (`tooele-land-intel/data/employment_nodes.json` or `wasatch-intel/src/server/lib/employment_nodes.ts`).

Required nodes for the 13-jurisdiction commute corridor scoring:

**Salt Lake County employment centers**
- Salt Lake CBD (downtown core, ~40.7608, -111.8910)
- Salt Lake International Airport (~40.7899, -111.9791)
- University of Utah (~40.7649, -111.8421)
- Salt Lake Intermodal Hub (~40.7505, -111.9311)
- Daybreak / South Jordan tech corridor (~40.5430, -112.0070)
- Amazon Fulfillment SLC1, West Jordan (~40.5860, -111.9750)

**Utah County (Silicon Slopes + Provo)**
- Lehi tech corridor (Adobe / Domo / NUVI campus, ~40.4256, -111.8870)
- BYU campus, Provo (~40.2518, -111.6493)
- Provo CBD (~40.2338, -111.6585)
- IHC Utah Valley Hospital (~40.3105, -111.6580)
- Vineyard tech (Geneva site, ~40.3196, -111.7508)

**Tooele County**
- Tooele Army Depot (~40.4842, -112.3505)
- US Magnesium (~40.7636, -112.6444)
- Tooele City CBD (~40.5308, -112.2983)

**Reference (north Wasatch — relevant if Phase 13b scope extends to Davis/Weber)**
- Hill AFB (~41.1240, -111.9740)
- IHC McKay-Dee (~41.1882, -111.9501)
- IHC Layton (~41.0734, -111.9581)
- Amazon Fulfillment NSL (~40.8516, -111.9180)
- FedEx Davis (~40.9300, -111.9290)
- Freeport Center, Clearfield (~41.1052, -112.0257)
- Ogden CBD (~41.2230, -111.9738)
- Weber State (~41.1991, -111.9485)

**Source for coordinates:** Google Maps / Apple Maps lookup, then verify with UGRC building footprints layer. Hand-curate to ~15–25 nodes total; over-saturating dilutes the corridor score. Seed via a one-off Python script (Phase 13b sub-task), commit the JSON to repo.

### 1.9 Freeway on-ramp coordinates (commute funnel bonus)

Static seed, same handling as 1.8. Required ramps for I-15 and US-89 between mile markers covering the 13 jurisdictions:

**I-15 northbound and southbound on-ramps** within the 13-jurisdiction window: roughly MP 240 (Spanish Fork) through MP 296 (Bluffdale). ~15–20 ramps total, each with separate north/south coords.

**US-89 on-ramps** along the Utah Valley corridor (Provo through Lehi).

**Source:** UDOT Public/UDOT_Routes FeatureServer `https://roads.udot.utah.gov/server/rest/services/Public/UDOT_Routes/FeatureServer/0` cross-referenced with OpenStreetMap `highway=motorway_link` features inside each jurisdiction polygon. Hand-curate the result to ~40 ramps total. Static JSON, refresh manually if a new ramp opens (rare — order of every 5+ years).

### 1.10 Census ACS 5-year (block-group income)

`https://api.census.gov/data/2023/acs/acs5` (latest 5-year vintage at 2026-05; Census typically releases the next vintage every December).

**Variable:** `B19013_001E` (median household income, prior 12 months in inflation-adjusted dollars).
**Geography:** block group (`for=block%20group:*&in=state:49+county:<FIPS>+tract:*`).
**FIPS codes:** Tooele = `49045`, Salt Lake = `49035`, Utah = `49049`.

**Auth:** Census API key (free, instant signup at `https://api.census.gov/data/key_signup`); recommended for >500 calls/day. Set `CENSUS_API_KEY` Workers secret.
**Rate limit:** 500 calls/day without key, effectively unlimited with key.
**Cost:** free.
**Robustness:** very stable. The API has not had a breaking change in 5+ years.

Ingestion pattern: pull all block groups for the 3 counties in one shot (~3,000 block groups), join to parcels by spatial intersection (block-group polygon contains parcel centroid). Refresh annually after Census's December release.

### 1.11 City zoning + General Plan (per-jurisdiction)

**No single endpoint covers all 13.** Each city's planning department hosts its own zoning layer on its own ArcGIS server. Discovery is per-city manual work.

Known endpoints (from CM_RE / Phase 4):
- Tooele County GIS server `https://tcgisws.tooeleco.gov/server/rest/services/` — covers Erda (sublayer 1), Tooele uninc (sublayer 4), Grantsville (sublayer 7), and the 2022 General Plan
- Salt Lake County GIS — varies by city; need to discover per-city
- Utah County GIS `https://maps.utahcounty.gov/arcgis/rest/services/` — county-level coverage; cities operate their own portals

**For Phase 13b:** sub-task 13b-zoning is to discover and document the zoning + GP service for each of the 10 non-Tooele jurisdictions, intern in `tooele-land-intel/data/jurisdiction_gis.yaml`, and intersect against parcel centroids. This is the highest-uncertainty data source — flag in §8 as a partial blocker.

**Fallback:** when a jurisdiction's zoning service is unavailable, use UGRC's statewide `LandUseStatewide` layer (coarser, ~4 categories, but 100% coverage) and mark `zoning_current = "unknown_detail"`.

### 1.12 OpenStreetMap (signal cross-reference)

`https://overpass-api.de/api/interpreter` — free Overpass API for `highway=traffic_signals` nodes within a bbox.

Used as a **second source** for signal detection (cross-reference with UDOT signalscount2_3). UDOT only reports state-route signals; OSM captures municipal signals UDOT doesn't track.

**Auth:** none. **Rate limit:** ~10k queries/day per IP; obey the 1-second-between-queries convention. **Cost:** free. **Robustness:** Overpass occasionally goes down for maintenance; cache results 30 days, retry once on failure.

### 1.13 PMN agenda data + STIP (already in WI)

These are **internal data sources**, not external APIs:

- Growth signal: `wasatch-intel-db.agenda_items` (D1) — joined via spatial proximity from each parcel centroid to the most recent agenda items in the same jurisdiction (within 0.5 mi or within the parcel's TAZ).
- STIP: `tooele-land-intel/data/stip_projects.geojson` (Phase 4 output). Read at parcel-enrichment time, score parcels by proximity to STIP project lines.

No external fetching needed for these — they're already collected by other phases. Phase 13b sub-tasks read from these existing artifacts.

---

## 2. SCHEMA MAPPING

For every column in `parcel_records` (migration `0002_pipeline_rebuild.sql`), this table specifies source path → field, type, default, freshness, and cache invalidation trigger.

### 2.1 Identity + geometry columns

| Column | Source | Path | Type | Default | Freshness | Invalidation |
|---|---|---|---|---|---|---|
| `id` | UGRC LIR | `PARCEL_ID` | TEXT | required | per-county LIR cycle | LIR re-publish |
| `jurisdiction` | UGRC LIR + UGRC Municipal Boundaries spatial join | `PARCEL_CITY` ∪ polygon containment | TEXT | required | annual | new annexation |
| `county` | derived | first 2 of PARCEL_ID, or county name | TEXT | required | static | never (county-FIPS stable) |
| `acreage` | UGRC LIR | `PARCEL_ACRES` | REAL | NULL | per-county LIR cycle | LIR re-publish |
| `centroid_lng`, `centroid_lat` | UGRC LIR geometry | computed via shapely centroid | REAL | NULL | per-county LIR cycle | LIR re-publish |
| `polygon_geojson` | UGRC LIR geometry | `?returnGeometry=true&outSR=4326` | TEXT | NULL | per-county LIR cycle | LIR re-publish |

### 2.2 Vacancy classification cascade

Already implemented in `src/lib/parcel-intel.ts:classifyVacancy(bldg, builtYr, propClass)`. The Phase 13b enrichment must populate the inputs:

| Column | Source | Path | Type | Default | Freshness | Invalidation |
|---|---|---|---|---|---|---|
| `bldg_sqft` | UGRC LIR | `BLDG_SQFT` | INT | 0 | per-county LIR cycle | LIR re-publish |
| `built_yr` | UGRC LIR | `BUILT_YR` (fallback `EFFBUILT_YR`) | INT | NULL | per-county LIR cycle | LIR re-publish |
| `prop_class` | UGRC LIR | `PROP_CLASS` | TEXT | NULL | per-county LIR cycle | LIR re-publish |
| `vacancy_status` | derived | `classifyVacancy()` output | TEXT | `'insufficient'` | derived | recompute on input change |

**Note:** the existing classifier expects strings like `"agricultural"`, `"vacant"`, `"greenbelt"`. UGRC `PROP_CLASS` returns codes like `"AG"`, `"R"`, `"C"`, `"I"` — Phase 13b sub-task `13b-vacancy` must include a code-to-string mapper. Reference Tooele's coding sheet (Tooele County Recorder → Property Class Codes).

### 2.3 Corner detection

| Column | Source | Path | Type | Default | Freshness | Invalidation |
|---|---|---|---|---|---|---|
| `is_corner` | UGRC Roads CARTOCODE 1–8 | adjacency analysis | BOOL | 0 | per UGRC roads cycle | roads re-publish |

**Algorithm** (already in `enrich_roads.py`): for each parcel polygon, find roads within `CORNER_DETECTION_RADIUS_MI = 0.025` (~40 m) of the polygon edge. If ≥ 2 distinct road centerlines are within radius and meet at <120° angle, `is_corner = true`.

### 2.4 Traffic volume

| Column | Source | Path | Type | Default | Freshness | Invalidation |
|---|---|---|---|---|---|---|
| `aadt_primary` | UGRC Roads `DOT_AADT`, OR UDOT AADT2024_Unrounded `AADT2024` | max over adjacent road segments | INT | 0 | annual | UDOT republish (~April each year) |

Strategy: compute the max `DOT_AADT` over the same radius used for corner detection. If the parcel sits on a state or federal route (CARTOCODE 1–3), prefer UDOT AADT2024 over UGRC's embedded value. If both are 0, fall back to nearest-segment search out to 0.5 mi.

### 2.5 Traffic signal presence

| Column | Source | Path | Type | Default | Freshness | Invalidation |
|---|---|---|---|---|---|---|
| `has_signal` | UDOT signalscount2_3 ∪ OSM `highway=traffic_signals` | distance from centroid to nearest signal node | BOOL | 0 | quarterly | OSM/UDOT cache TTL |

Algorithm: union UDOT signal points + OSM traffic_signals nodes inside the bbox. For each parcel centroid, `has_signal = nearest_signal_distance < 0.1 mi` (≈ 160 m).

### 2.6 Median income

| Column | Source | Path | Type | Default | Freshness | Invalidation |
|---|---|---|---|---|---|---|
| `median_income` | Census ACS 5-year | `B19013_001E` at block-group level | INT | NULL | annual (December release) | new ACS vintage |

Spatial join: parcel centroid → containing block group polygon → `B19013_001E`.

### 2.7 Competition count (Google Places)

| Column | Source | Path | Type | Default | Freshness | Invalidation |
|---|---|---|---|---|---|---|
| `competition_count` | Google Places Nearby Search | brand-tiered count within 1 mi | INT | 0 | quarterly (90-day cache) | TTL or pipeline-stage advance |

**Brand tiers** (defined in scoring profile, applies a multiplier):
- Tier 1 (full penalty, exact-format match): Maverik, Costco gas, Walmart fuel
- Tier 2 (50% penalty, similar format): Chevron, Sinclair, Phillips 66
- Tier 3 (25% penalty, dissimilar format): Smith's, c-store-only without fuel

Query `places:searchNearby` with `includedTypes: ["gas_station", "convenience_store"]` and 1-mile radius. Sum tier-weighted counts. **Only compute on parcels in the user's pipeline or when the user explicitly hits "Refresh enrichment" — never as a bulk pass** (see §4 for budget rationale).

### 2.8 Zoning + General Plan

| Column | Source | Path | Type | Default | Freshness | Invalidation |
|---|---|---|---|---|---|---|
| `zoning_current` | per-jurisdiction zoning service | spatial join centroid → zoning polygon | TEXT | `'unknown_detail'` | quarterly | jurisdiction re-publish |
| `zoning_gp` | per-jurisdiction GP service, fallback UGRC LandUseStatewide | same | TEXT | `'unknown'` | annual | GP plan adoption cycle |

See §1.11 for the partial-coverage caveat. The intensity tables in `tooele-land-intel/scripts/build_gap_layer.py` (curated for Tooele County codes) extend trivially to other jurisdictions but require new code-to-intensity tables per-jurisdiction. Phase 13b sub-task must enumerate.

### 2.9 Commute corridor tier

| Column | Source | Path | Type | Default | Freshness | Invalidation |
|---|---|---|---|---|---|---|
| `commute_corridor_tier` | WFRC TAZ + employment nodes + I-15/US-89 ramps | computed | TEXT | `'None'` | annual | WFRC republish or employment-node revision |

**Algorithm:**
1. Parcel centroid → containing TAZ.
2. For each employment node, compute drive-time from the parcel's TAZ to the node's TAZ (via WFRC's TAZ-to-TAZ skim matrix, or as a proxy: straight-line distance × 1.4 / 35 mph).
3. Funnel bonus: if the parcel is within 1 mi of an I-15 or US-89 on-ramp AND that ramp connects to a commute corridor with ≥ 2 employment nodes within a 30-minute drive, multiply tier-relevant score.
4. Tiers:
   - **Primary**: ≥ 3 employment nodes within 30 min, OR within 1 mi of an I-15 ramp
   - **Secondary**: 1–2 employment nodes within 30 min, OR within 1 mi of a US-89 ramp
   - **None**: otherwise

**Simplification for v1:** skip the WFRC skim matrix; use straight-line distance + 1.4 detour multiplier as the drive-time proxy. Document the simplification; revisit if the corridor score correlates poorly with intuition.

### 2.10 Growth signal + STIP (read internal sources)

| Column | Source | Path | Type | Default | Freshness | Invalidation |
|---|---|---|---|---|---|---|
| `growth_signal_score` | derived | join `agenda_items` D1 to parcel centroid by jurisdiction + 0.5 mi | INT (computed at score time) | 0 | weekly | weekly-digest run |
| `stip_proximity_mi` | `data/stip_projects.geojson` | nearest segment distance | REAL (computed at score time) | NULL | quarterly | gap-layer.yml run |

These are **not stored in `parcel_records`** — they are computed at score-render time by joining live D1 / static geojson to the parcel. The scoring profile in `parcel-intel.ts` already pulls from `p.adjacencyScore` and `p.agendaCount`; Phase 13b just needs to make sure those fields are populated correctly when the parcel is loaded into the IntelParcel shape.

### 2.11 `enriched_at` semantics

The current schema has a single `enriched_at TIMESTAMP`. **Recommended change:** keep it as the *last full-pass* timestamp, and add per-source columns in a separate `parcel_enrichment_log` table:

```sql
CREATE TABLE IF NOT EXISTS parcel_enrichment_log (
  parcel_id  TEXT NOT NULL REFERENCES parcel_records(id),
  source     TEXT NOT NULL,    -- 'ugrc_lir' | 'udot_aadt' | 'udot_signal' | 'google_places' | 'census_acs' | 'osm_signal' | 'wfrc_taz' | 'zoning'
  enriched_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status     TEXT NOT NULL,    -- 'ok' | 'partial' | 'failed' | 'skipped_budget'
  details    TEXT,             -- JSON; error message or hit/miss data
  PRIMARY KEY (parcel_id, source)
);
```

This is **migration 0004_parcel_enrichment_log.sql** — to be authored as part of Phase 13b sub-task 13b-schema (small, low-risk, no breaking change). The single `parcel_records.enriched_at` stays as a coarse "any field updated at this time" hint.

---

## 3. CACHE STRATEGY

Cannot refetch 250k parcels per run. Three layers of caching, each with distinct semantics.

### 3.1 Edge cache (Cloudflare Workers Cache API)

For frontend-facing API responses (`/api/parcels?bbox=`, `/api/parcels/:id`). 5-minute TTL — already in place via `csv-loader.ts` patterns from Phase 4. No change in Phase 13.

### 3.2 D1 layer (canonical store)

`parcel_records` IS the cache. The strategy is to compute enrichment in batches (off-line, GHA worker or Manus job) and write to D1. The frontend never re-fetches from upstream — it reads from D1.

**Per-source TTL:**

| Source | TTL | Rationale |
|---|---|---|
| UGRC LIR (parcel_id, polygon, county) | infinite | parcel boundaries don't move |
| UGRC LIR (acreage, prop_class) | 18 months | redrawn occasionally on subdivision |
| UGRC LIR (BUILT_YR, BLDG_SQFT) | 12 months | annual recorder update cycle |
| UGRC LIR (TOTAL_MKT_VALUE) | 12 months | reassessment cycle |
| UGRC Roads + DOT_AADT | 6 months | UGRC publishes ~biennially |
| UDOT AADT 2024 | 6 months | annual republish, +6mo grace |
| UDOT signals | 6 months | rare changes |
| OSM signals | 6 months | rare changes |
| Google Places | 90 days | competition does shift; balance budget |
| Census ACS | 12 months | annual December release |
| Zoning + GP (per-jurisdiction) | 6 months | rezone events common |
| WFRC TAZ + employment | 12 months | RTP cycle is biennial |

### 3.3 Disk cache (Manus / GHA)

For Phase 13b execution: each Manus task gets `data/cache/` for raw API responses. Pattern already proven in `tooele-land-intel/vendor/cm_re/parcel/parcel_fetcher.py` and `scripts/arcgis.py` — md5(url|where) → JSON file on disk. Survives crashes, re-runs cheap.

### 3.4 Delta-fetch strategy

For UGRC LIR re-pulls, the cheap-and-correct pattern is:

1. **First pass (cold cache):** paginated full pull of all 250k parcels per county, ~5 hours per county at 5 req/s.
2. **Subsequent passes:** UGRC LIR services do NOT expose `editFieldsInfo.dataLastEditDate` per-feature, so per-feature delta isn't possible directly. Instead:
   - Hash each parcel's enrichment-relevant fields (BLDG_SQFT, BUILT_YR, PROP_CLASS, TOTAL_MKT_VALUE) into a `field_hash` column on `parcel_records`.
   - On refresh pass, fetch the same fields from UGRC, compute the new hash, only re-classify vacancy / re-write the row if the hash changed.
   - For the polygon geometry itself: refetch only when a feature's `OBJECTID` changes (rare, indicates a parcel split / merge).

3. **Out-of-band signal:** UGRC publishes a `Parcels_Tooele_LIR/info/itemInfo` last-modified field. Check it weekly; if unchanged from last poll, skip the entire delta-pass for that county.

For non-UGRC sources, freshness comes from the per-source TTL (§3.2).

### 3.5 What's stored vs what's computed at score-time

`parcel_records` stores the **inputs**. Score computation runs in the Worker per-request (existing `parcel-intel.ts:scoreFor()` design). This means:

- Profile changes don't trigger any re-enrichment, just re-score
- New scoring profiles ship without touching the ETL
- Component scores (corner, aadt, signal, zoning, etc.) are derived **at every render** — fast (millis) for any single parcel; for bbox queries use a memoized result from D1 by parcel_id

The corollary: `parcel_records` should ONLY store source-of-truth fields, never derived scores. Migration 0002 already follows this pattern; Phase 13b must not add `score_total` or `grade` columns.

---

## 4. RATE LIMITING & BUDGET

### 4.1 Hard ceiling

**$25/mo total project spend** per `PROJECT_STATE.md` cost ceiling. Anthropic API is currently ~$5–15/mo. Phase 13 must not push total past $25/mo without explicit user approval.

### 4.2 Per-source budget caps

| Source | Per-month cap | Per-run cap | Rationale |
|---|---|---|---|
| UGRC AGOL (free) | unlimited | 5 req/s, 1000-record pages | UGRC tolerance, undocumented |
| UDOT AADT (free) | unlimited | 5 req/s, 2000-record pages | same |
| Census ACS (free w/ key) | unlimited | 1 call per county per year | tiny volume |
| OSM Overpass (free) | 1 call/day | 1 large bbox query | one fetch per refresh cycle |
| **Google Places** | **$10/mo** | **300 calls/run** | hard cap; see 4.3 |
| Anthropic (Haiku) | already budgeted | — | not a Phase 13 source |

### 4.3 Google Places — the budget killer

Naïve approach: 250k parcels × 1 nearby search per parcel = 250k requests = **$8,000 one-time** at Pro $32/1k. Even with a 90-day cache and 5% MoM growth, monthly steady-state ~80k requests = $2,560/mo. **Off the table.**

**Strategy:** Google Places must NOT run as a bulk pass. Three tiers of trigger:

1. **On parcel-detail open** (user clicks parcel → drawer opens): fire one nearby search if `competition_count` is null OR older than 90 days. Cost per click ≈ $0.032. Even with 300 clicks/day average, that's $9.60/day = $290/mo — **also too high**.

2. **On pipeline save** (user adds parcel to pipeline): fire one nearby search. The pipeline is small (~hundreds, not hundreds of thousands). Cost per save ≈ $0.032. Even with 1000 saves/mo: $32/mo — **still over the $10/mo per-source cap**.

3. **On manual refresh** (user clicks "Refresh enrichment" in detail panel): fire one nearby search. Bounded by user behavior, naturally low. **This is the only path that should auto-trigger Places**.

For (1) and (2), Phase 13b should default `competition_count` to NULL for newly-saved parcels and label the field as "—" until the user explicitly refreshes. Document this in the UX briefly.

**Per-run cap implementation:** track `places_calls_this_run` in `cron_runs.details` JSON; if it exceeds 300, the cron writes `status: 'partial-budget-cap'` and stops Places calls for the run. The frontend sees the heartbeat status (existing Phase 12 footer) and can flag.

### 4.4 Cache hit/miss telemetry

Every external fetch logs to `cron_runs.details`:

```json
{
  "source": "google_places",
  "calls": 287,
  "cache_hits": 142,
  "cache_misses": 145,
  "errors_4xx": 0,
  "errors_5xx": 2,
  "spend_dollars": 4.64,
  "circuit_breaker_tripped": false
}
```

The telemetry is consumed by `/api/cron-status` (already exists). Surface in the Phase 12 cron footer.

### 4.5 Circuit breaker

If `errors_5xx + errors_4xx > 0.10 × calls` in any run, OR if `spend_dollars > 1.5 × per-run cap`, set `circuit_breaker_tripped: true` and skip remaining calls. Resume next run.

If `spend_dollars` over a 30-day rolling window exceeds the per-month cap, Phase 13b sub-task `13b-budget-monitor` (small, recurring) emails the user and sets a `cron_runs` flag that the next scheduled run reads to abort early.

### 4.6 Backoff strategy on 429s

Standard exponential: 1s, 2s, 4s, 8s, 16s, then circuit-break. UGRC and UDOT very rarely 429; Google Places does at sustained >600 QPM.

### 4.7 Recommended cron cadence

| Job | Cadence | Rationale |
|---|---|---|
| UGRC LIR full delta-pull | weekly (Sunday 02:00 UTC) | catch any LIR re-publish |
| UDOT AADT + signals refresh | monthly (1st 03:00 UTC) | source updates rare |
| Census ACS refresh | annually (December 15 04:00 UTC) | new vintage release |
| OSM Overpass signals | quarterly | low change rate |
| Zoning/GP per-jurisdiction | weekly (each jurisdiction's zoning service polled) | rezone events common |
| WFRC TAZ + employment skim | annually (after RTP release) | RTP cycle |
| Google Places | on-demand only (no cron) | budget |
| Score recompute | continuous (per-request in Worker) | no cron needed |

---

## 5. SUB-TASK BREAKDOWN FOR MANUS (PHASE 13b)

Eight discrete, independently-runnable sub-tasks. Each must be runnable as a single Manus job (no orchestration internal to a sub-task). Aggregate orchestration (cron schedules, GHA workflows) is out of scope for any single sub-task; that's a thin Phase 13c follow-on done in CC.

Numbering: `13b-N` where N is intended sequence (see §6 for parallelism notes).

### 13b-1 — Schema migration 0004

**Description:** Author and apply migration `migrations/0004_parcel_enrichment_log.sql` adding the `parcel_enrichment_log` table (§2.11) and a `field_hash TEXT` column to `parcel_records`.

**Inputs:** existing `parcel_records` schema.
**Outputs:** `migrations/0004_parcel_enrichment_log.sql`; new GHA workflow `d1-migrate-phase13.yml` (mirror of phase11/phase12).
**Success:** migration applies cleanly to a fresh D1 + the live D1 (after user manual workflow_dispatch trigger).
**Dependencies:** none.
**Effort:** 1–2 hours.
**Parallel:** must run before any other 13b task that writes to `parcel_records`.

### 13b-2 — UGRC LIR ingestion (3 counties)

**Description:** Pull all parcels for Tooele, Salt Lake, Utah counties from UGRC LIR FeatureServer endpoints. Filter to the 13 jurisdictions via PARCEL_CITY + UGRC Municipal Boundaries spatial intersection. Compute centroids. Bulk-insert / upsert into `parcel_records` with `id`, `jurisdiction`, `county`, `acreage`, `centroid_lng`, `centroid_lat`, `polygon_geojson`, `bldg_sqft`, `built_yr`, `prop_class`, `field_hash`. Compute `vacancy_status` via the existing `classifyVacancy()` rule (port to Python).

**Inputs:** UGRC LIR endpoints (§1.1), UGRC Municipal Boundaries.
**Outputs:** `parcel_records` rows (~250k). Disk cache under `data/cache/lir/`. `parcel_enrichment_log` rows for `source='ugrc_lir'`.
**Success:** all 13 jurisdictions have non-zero parcel counts; spot-check parcel `080480106` in Erda (West Haven) appears with bldg_sqft = 0 (per regression target in §7); total parcel count between 200k and 350k.
**Dependencies:** 13b-1.
**Effort:** 8–12 hours (long fetches; budget for ~3 hours pure I/O across the 3 counties).
**Parallel:** can run concurrently with 13b-4, 13b-6, 13b-7 (no shared writes).

### 13b-3 — Roads enrichment (corner + AADT)

**Description:** For every parcel from 13b-2, compute `is_corner` and `aadt_primary` using UGRC Roads (§1.2) augmented with UDOT AADT 2024 (§1.3) for state/federal routes. Reuses `enrich_roads.py` logic from CM_RE / Phase 5 pattern; extend bbox to cover all 13 jurisdictions.

**Inputs:** `parcel_records` polygon_geojson; UGRC Roads; UDOT AADT2024_Unrounded.
**Outputs:** `parcel_records.is_corner`, `aadt_primary`. `parcel_enrichment_log` rows.
**Success:** spot-check parcel 080480106 → `is_corner = true`, `aadt_primary` near 50 (per the regression target). 95%+ of parcels have non-null aadt_primary.
**Dependencies:** 13b-2.
**Effort:** 4–6 hours.
**Parallel:** sequential after 13b-2 (reads the polygons), but parallel with 13b-4/6/7.

### 13b-4 — Traffic signal enrichment

**Description:** Fetch UDOT signalscount2_3 (§1.4) + OSM `highway=traffic_signals` via Overpass (§1.12). Union by spatial proximity (deduplicate signals within 50 ft). For each parcel centroid, compute `has_signal = nearest_signal_distance < 0.1 mi`.

**Inputs:** UDOT signal layer, Overpass Turbo bbox query, parcel centroids.
**Outputs:** `parcel_records.has_signal`. `parcel_enrichment_log` rows.
**Success:** ~5–15% of parcels have `has_signal=true` (urban-heavy jurisdictions higher); spot-check that parcel 080480106 is FALSE (rural West Haven).
**Dependencies:** 13b-2.
**Effort:** 2–3 hours.
**Parallel:** runs alongside 13b-3.

### 13b-5 — Zoning + General Plan ingestion

**Description:** **Highest-uncertainty sub-task.** Discover, document, and ingest zoning + GP layers for the 10 non-Tooele jurisdictions. Reuse Tooele's existing `build_gap_layer.py` infrastructure for Erda/Grantsville/Tooele City. For each new jurisdiction, document the ArcGIS service URL in `tooele-land-intel/data/jurisdiction_gis.yaml`, build a code-to-intensity table mapping the jurisdiction's specific zoning codes to the existing 1–10 intensity scale, then spatial-join centroids → zoning + GP polygons, write `zoning_current` and `zoning_gp`.

**Inputs:** parcel centroids; per-jurisdiction zoning + GP services (must be discovered).
**Outputs:** `parcel_records.zoning_current`, `zoning_gp`. New file `data/jurisdiction_gis.yaml`. `parcel_enrichment_log` rows.
**Success:** ≥ 70% of parcels in each of the 10 non-Tooele jurisdictions have non-null `zoning_current`. Existing 3 Tooele jurisdictions remain at 100%. Document any jurisdictions where GIS access is unavailable as a per-jurisdiction blocker in the YAML.
**Dependencies:** 13b-2.
**Effort:** 3–5 days. This is the long-tail sub-task.
**Parallel:** the discovery + intensity-table work for each jurisdiction is independent; can split into 10 sub-runs.

### 13b-6 — Census ACS income enrichment

**Description:** Pull `B19013_001E` for all block groups in the 3 counties via Census API. Spatial-join parcel centroids → block groups → median income. Write `parcel_records.median_income`.

**Inputs:** Census API key (must be set as `CENSUS_API_KEY` Workers secret + GHA secret); parcel centroids.
**Outputs:** `parcel_records.median_income`. `parcel_enrichment_log` rows.
**Success:** ≥ 99% of parcels have non-null `median_income` (block groups cover all developed land).
**Dependencies:** 13b-2.
**Effort:** 1–2 hours.
**Parallel:** runs alongside 13b-3, 13b-4, 13b-5.

### 13b-7 — Commute corridor scoring

**Description:** Build static employment-node + on-ramp seed JSON files (§1.8, §1.9). Pull WFRC TAZ polygon layer (§1.7). For each parcel centroid: identify containing TAZ → compute drive-time proxy to each employment node → assign `commute_corridor_tier` per the algorithm in §2.9.

**Inputs:** WFRC TAZ; static employment_nodes.json; static onramps.json; parcel centroids.
**Outputs:** `parcel_records.commute_corridor_tier`. `tooele-land-intel/data/employment_nodes.json`. `tooele-land-intel/data/onramps.json`. `parcel_enrichment_log` rows.
**Success:** Lehi/Saratoga Springs/American Fork parcels generally hit `Primary` (Silicon Slopes proximity); rural Tooele parcels hit `None`; spot-check passes with intuition.
**Dependencies:** 13b-2.
**Effort:** 4–6 hours including hand-curation of the static seeds.
**Parallel:** runs alongside 13b-3, 13b-4, 13b-5, 13b-6.

### 13b-8 — Telemetry + circuit breaker hookup

**Description:** Wire each enrichment script's per-source spend / errors / cache hits into `cron_runs.details` (existing Phase 12 table). Implement the circuit breaker from §4.5. Add a budget-monitor cron that emails the user via Resend when the 30-day rolling spend exceeds 80% of any per-source cap.

**Inputs:** existing `recordCronRun()` helper from Phase 12; Resend API.
**Outputs:** updated enrichment scripts; new `budget-monitor.yml` GHA cron (weekly).
**Success:** spend telemetry visible in cron status footer; test budget-monitor by setting a spike threshold to $0.01 and confirming the email fires.
**Dependencies:** 13b-1 through 13b-7 (instrumentation runs over them).
**Effort:** 3–4 hours.
**Parallel:** sequential after 13b-7 in practice, since it instruments the others.

### Sub-task summary

8 sub-tasks, ~5 of them parallelizable after 13b-2 lands. Total estimated effort: **~3–4 days of Manus runtime** (clock time; actual compute is shorter), gated by 13b-5's discovery work which is the largest unknown.

---

## 6. ROLLOUT ORDER

### Sequencing rationale (deliver visible value soonest)

1. **13b-1** (schema migration) — must land first; cheap, fast.
2. **13b-2** (UGRC LIR ingestion) — gates everything; this is where the parcels appear on the map at all. **Once 13b-2 completes, the map has 250k parcels with vacancy classification — this is the first user-visible win.**
3. **13b-6** (Census ACS) — fast, free, easy quick-win after 13b-2. Adds median_income to parcel detail panels.
4. **13b-3 + 13b-4** (roads/AADT + signals) — parallel. These light up the corner / aadt / signal scoring components.
5. **13b-7** (commute corridor) — also parallel; lights up the corridor scoring component.
6. **13b-5** (zoning + GP) — the long-tail. Ship piecewise: first re-light Tooele (already wired in Phase 4), then add Salt Lake County jurisdictions, then Utah County. Each jurisdiction shipped independently moves the map's coverage forward.
7. **13b-8** (telemetry + circuit breaker) — last; instruments the others. Critical before any Google Places call lands in Phase 13c.

### Visible-value milestones for the user

| After sub-task | What the user sees |
|---|---|
| 13b-2 | Map shows ~250k parcels in 13 jurisdictions; vacancy_status colors render; existing scoring profiles produce A/B/C/D grades using mock fallbacks for missing fields |
| 13b-3 | aadt + corner score components light up; gas-cstore profile starts producing meaningful rankings |
| 13b-6 | median_income column populates; income-inversion in c-store profile activates |
| 13b-5 (Tooele rerun) | zoning + GP gap layer matches Phase 4 output, but now persisted in D1 not just GeoJSON |
| 13b-5 (each new jurisdiction) | new city's parcels recolor with real zoning intensity |
| 13b-7 | corridor tier visible in detail panel; pipeline scoring shifts |
| 13b-4 | signal score component activates (small visible delta) |
| 13b-8 | cron status footer turns green for the new sources; budget telemetry visible |

### What's NOT in Phase 13b

- **Google Places competition** — deferred to a Phase 13c "on-demand only" sub-task (see §4.3). Lands behind a feature flag.
- **NAIP land-cover verification** — Phase 19 (separate, Manus, 3–5 days).
- **Site plan vision extraction** — Phase 18 (Opus, 1 week).
- **Deal-pipeline / DD checklist real data** — Phase 16.
- **Frontend ↔ API rewiring** — Phase 14 follows after Phase 13b is materially complete.

---

## 7. TESTING STRATEGY

### 7.1 Spot-check regression target

**Parcel 080480106** at approximately 3500 W / 4000 S in West Haven (Weber County — note: this parcel is OUTSIDE the 13 jurisdictions but documented in the prior Manus chat work as a regression target).

**For Phase 13b**: pick one regression parcel per jurisdiction. Suggested:

| Jurisdiction | Parcel ID | Address | Expected |
|---|---|---|---|
| Erda | (TBD per Phase 4 known parcels) | Erda Way | vacant or ag_rezone |
| Grantsville | (TBD) | Main St | mixed |
| Tooele City | (TBD) | Main / Vine | developed |
| Lehi | (TBD) | Thanksgiving Pt area | developed_recent |
| Saratoga Springs | (TBD) | Pioneer Crossing | underutilized or ag_rezone |
| Eagle Mountain | (TBD) | Pony Express Pkwy | ag_rezone |
| South Jordan | (TBD) | Daybreak | developed_recent |
| Herriman | (TBD) | 12600 S | mixed |
| Bluffdale | (TBD) | Bangerter Hwy | underutilized |
| Draper | (TBD) | I-15 frontage | older_structure |
| American Fork | (TBD) | Main / I-15 | developed_recent |
| Vineyard | (TBD) | Geneva Rd | mixed |
| Spanish Fork | (TBD) | Main / I-15 | mixed |

These (TBD) values must be filled in during 13b-2 by the operator inspecting the parcel layer for 1–2 well-known parcels per city. Each sub-task writes a `tests/regression_parcels.json` entry referencing the expected output for that sub-task's columns.

### 7.2 Sampling strategy

For each sub-task:

1. Pick **20 random parcels per jurisdiction** (260 total parcels for the 13).
2. For 5 of those 20 per jurisdiction, the operator manually verifies the relevant fields by:
   - Cross-referencing county GIS (e.g., `https://gis.utahcounty.gov/maps`) for parcel boundary, owner, acreage
   - Google Street View for vacancy / building presence
   - For zoning: check the city's online zoning map
3. Record the manual-verification result in `tests/manual_verification_phase13b.csv`.
4. Sub-task passes if ≥ 90% of manually-verified parcels match D1 output within a tolerance:
   - acreage: ±2%
   - bldg_sqft: ±10%
   - is_corner: exact
   - has_signal: exact
   - vacancy_status: exact for tier; ±1 tier transition allowed (e.g., `older_structure` ↔ `underutilized` within 1 sqft threshold)

### 7.3 Performance benchmarks

Each sub-task's GHA / Manus run prints a final report with:

- Parcels processed
- Wall-clock seconds
- Parcels per minute
- Cache hit rate
- Estimated per-10k-parcel runtime

Targets:

| Sub-task | Per-10k parcel runtime |
|---|---|
| 13b-2 (UGRC LIR full pull) | 12 min |
| 13b-3 (roads/AADT) | 8 min |
| 13b-4 (signals) | 2 min |
| 13b-5 (zoning + GP) | 6 min per jurisdiction |
| 13b-6 (Census) | <1 min (1 county-wide query, then in-memory join) |
| 13b-7 (corridor) | 5 min |

Any sub-task significantly over budget (≥ 2× target) indicates a missing cache or wrong batch size.

### 7.4 Pre-deploy verification

Before merging `phase-13b-*` branches to main:

1. `bun run build` clean
2. Spot-check the parcel detail panel for one regression parcel per jurisdiction — drawer renders without errors, score components have sensible values
3. `/api/parcels/:id` returns enriched data for all regression parcels
4. `/api/cron-status` shows green for all enrichment workflows
5. Map at /map renders 250k parcels at acceptable performance (vector tile cluster or fillOpacity tuning may be needed if frame rate drops)

---

## 8. RISKS & OPEN QUESTIONS

### 8.1 BLOCKERS (need user input before Phase 13b starts)

**B1. Per-jurisdiction zoning service discovery (sub-task 13b-5).**
Salt Lake and Utah county jurisdictions don't share a common GIS host. Each city operates its own portal. Discovering 10 distinct services is real work, not gluework. Some cities may not expose their zoning layer publicly — if so, the parcel `zoning_current` falls back to `'unknown_detail'` for that city. **Acceptable to user?**

**B2. Google Places budget.**
Per §4.3, even an on-demand-only Places integration will burn ~$32/mo at modest user activity. If the user wants Places enrichment to fully populate `competition_count` for any meaningfully-sized share of parcels, the budget must rise. **Confirm the user prefers (a) on-demand-only Places (current recommendation), (b) raise the cap to $50/mo, or (c) defer Places entirely until Phase 17.**

**B3. WFRC TAZ-to-TAZ skim matrix availability.**
The §2.9 algorithm calls for drive-time between TAZs. WFRC publishes the skim as a CSV (TAZ_orig, TAZ_dest, AM_drive_time_min) but it's not in the open-data hub. Sub-task 13b-7 will likely need to email `analytics@wfrc.org` to request the latest skim, or default to the straight-line × 1.4 / 35 mph proxy. **Default to proxy, and revisit later if scoring quality is poor?**

### 8.2 KNOWN-RISK items (proceed but document)

**R1. UGRC LIR field naming variance.**
Some counties have slightly different LIR schemas (e.g., Davis has `EFFBUILT_YR`, Tooele only `BUILT_YR`). Sub-task 13b-2 must probe the FeatureServer metadata at start-of-run, not hard-code field lists.

**R2. PARCEL_CITY null/stale.**
~5–15% of UGRC LIR parcels have `PARCEL_CITY = null` or stale (city annexed since LIR last update). The §1.1 fallback to UGRC Municipal Boundaries spatial join handles this, but some parcels still won't resolve cleanly to one of the 13 jurisdictions. Document as a "limbo" set in `parcel_enrichment_log` with `status='partial'`.

**R3. NAIP-vs-UGRC disagreement.**
Phase 19 will surface cases where UGRC says "vacant" but NAIP shows building presence (or vice versa). Phase 13b's vacancy_status is UGRC-only and won't catch these. Acceptable for v1; Phase 19 adds the verification overlay.

**R4. Per-county LIR update lag.**
Salt Lake updates LIR roughly quarterly; Tooele annually; Utah ~biennially. A parcel that just sold or was just split may not appear correctly for up to 18 months. Front-end should display `enriched_at` somewhere in the detail panel so the user knows the source freshness.

**R5. AADT 2024 → 2025 transition.**
Hardcoded `AADT2024_Unrounded` will break when UDOT publishes 2025 (~April 2026 already, may be close). Sub-task 13b-3 must check for `AADT2025_Unrounded` first, fall back to 2024.

**R6. Salt Lake County's huge parcel volume.**
394,610 parcels in Salt Lake County alone. The 4 SL jurisdictions (South Jordan, Herriman, Bluffdale, Draper) probably contain ~80k–100k parcels combined — a meaningful share of the 250k total. Pagination and disk-cache discipline is critical. Budget the full pull at 6+ hours.

### 8.3 OPEN QUESTIONS for user

**Q1. Is NAIP land-cover deferred entirely, partially, or rolled into 13b?**

The Phase 13a brief explicitly puts NAIP in Phase 19 (separate, Manus, 3–5 days). My recommendation is to keep it there — NAIP adds satellite-verified vacancy as a *correction* layer over UGRC, not a replacement, and v1 of `parcel_records` is fine without it. **Confirm: NAIP stays in Phase 19?**

**Q2. Are non-13 jurisdictions explicitly out of scope?**

The current playbook scope is 13 jurisdictions. Davis and Weber counties (where the CM_RE codebase originated) are NOT in this list. If Phase 13b's `Parcels_Davis_LIR` / `Parcels_Weber_LIR` ingestion happens "for free" because the same code runs against a different county, do we ingest them? **Recommendation: skip for now; add later if user requests.**

**Q3. Do we need a polygon-tile layer for 250k parcels on the frontend map?**

MapLibre choking on 250k parcel features as a single GeoJSON source is a real risk. The current `MapCanvas.tsx` from Phase 4 / Phase 11 handles ~10k features fine. At 250k it will need vector tiles (Tippecanoe + serve as PMTiles from a Cloudflare R2 bucket, or use `clustering: true` on the source). This is **a Phase 14 frontend concern, not Phase 13b**, but flag now so it doesn't surprise. Cost: a one-time Tippecanoe build (~30 min on a beefy machine) + R2 storage (negligible at 250k parcel polygons in PMTiles ~50MB).

### 8.4 Total Phase 13 estimated cost

| Source | Cost / month | Cost one-time |
|---|---|---|
| UGRC AGOL | $0 | $0 |
| UDOT AADT/signals | $0 | $0 |
| Census ACS | $0 | $0 |
| OSM Overpass | $0 | $0 |
| WFRC | $0 | $0 |
| Google Places (on-demand only, capped) | $5–10 | $0 |
| Anthropic API (no new usage in 13b — vacancy classifier is rule-based) | $0 | $0 |
| Manus credits (Phase 13b execution) | (separate billing) | (separate billing) |
| **Total Phase 13 incremental burn** | **$5–10** | **$0** |

Stays within the $25/mo project ceiling. The Anthropic API and Resend lines from prior phases are unchanged.

---

## END

Phase 13b sub-tasks may begin once this document is reviewed by the user and BLOCKERS B1–B3 in §8.1 are resolved.
