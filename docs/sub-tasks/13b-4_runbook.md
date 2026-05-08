# Phase 13b-4 Runbook: AADT Scoring for Wasatch Intel Parcels

**Author:** Manus AI  
**Branch:** `phase-13b-4-aadt-scoring`  
**Date:** 2026-05-07

## Purpose

Phase 13b-4 adds **Annual Average Daily Traffic (AADT) frontage scoring** to the parcel intelligence pipeline. The scoring output is a parcel-level CSV generated in `tooele-land-intel` and loaded into the existing nullable `parcel_records.aadt_score` column in the Cloudflare D1 database `wasatch-intel-db`. The loader is intentionally **UPDATE-only** so that no parcel rows are inserted or replaced while traffic scores are applied.

> UDOT’s published AADT layer describes traffic information on Utah roads and exposes both rounded and unrounded 2024 feature services through the Utah Open Data / UPlan ArcGIS Hub catalog.[1] [2]

## Data Source

The scoring script caches the official UDOT **AADT2024_Unrounded** feature service as GeoJSON at `tooele-land-intel/data/cache/udot_aadt.geojson`. The unrounded service is used because it preserves the native `AADT2024` count used by the rubric rather than a rounded display value.

| Item | Value |
|---|---:|
| Source catalog page | [AADT Unrounded][2] |
| Feature service layer | `AADT2024_Unrounded/FeatureServer/3` |
| Cached file | `tooele-land-intel/data/cache/udot_aadt.geojson` |
| Cached feature count | 4,574 |
| Current AADT field | `AADT2024` |
| Coordinate handling | WGS84 input projected to NAD83 / UTM Zone 12N meters (`EPSG:26912`) |

## Scoring Method

The generator reads centroid inputs from `tooele-land-intel/data/raw/parcels_<county>.csv*`, including large compressed release assets for Salt Lake, Utah, and Weber parcels. It de-duplicates on `parcel_id`, matching the current `parcel_records` row count of **947,863** unique parcel IDs. Each parcel centroid is projected to a meter-based Utah CRS and compared against a Shapely `STRtree` spatial index of projected UDOT AADT linework.

| Rule | Assigned `aadt_score` |
|---|---:|
| Nearest AADT segment within 100 m and `AADT2024 >= 40,000` | 1.0 |
| Nearest AADT segment within 100 m and `20,000 <= AADT2024 < 40,000` | 0.7 |
| Nearest AADT segment within 100 m and `5,000 <= AADT2024 < 20,000` | 0.4 |
| Nearest AADT segment within 100 m and `0 < AADT2024 < 5,000` | 0.1 |
| No AADT-tagged UDOT segment within 100 m | 0.0 |

The output file is `tooele-land-intel/data/raw/parcel_aadt_scores.csv` with exactly four columns: `parcel_id`, `aadt_score`, `nearest_aadt_value`, and `distance_m`. The final two columns are retained for auditability and spot checks, but only `aadt_score` is loaded into D1.

## Generated Output Validation

The generated CSV has **947,863** data rows and one header row. The high-traffic share meets the requested 5–10% expectation, while the positive-score share is lower than the stated 75% target because the official UDOT AADT layer contains AADT-tagged state highway and federal-aid road sections rather than every local residential street segment.[3]

| Metric | Result |
|---|---:|
| Unique parcel scores | 947,863 |
| AADT GeoJSON features | 4,574 |
| Parcels with score `> 0.0` | 279,751 |
| Positive-score share | 29.51% |
| Parcels with score `>= 0.7` | 52,254 |
| High-traffic share | 5.51% |

| `aadt_score` | Parcel count |
|---:|---:|
| 0.0 | 668,112 |
| 0.1 | 111,426 |
| 0.4 | 116,071 |
| 0.7 | 37,170 |
| 1.0 | 15,084 |

Representative Lehi / I-15 frontage spot checks scored as expected:

| Parcel ID | County | Latitude | Longitude | Score | Nearest AADT | Distance (m) |
|---|---|---:|---:|---:|---:|---:|
| `010910058` | Utah | 40.397457 | -111.841612 | 1.0 | 191,892 | 88.12 |
| `010900039` | Utah | 40.398066 | -111.843723 | 1.0 | 191,892 | 40.66 |
| `010900040` | Utah | 40.398228 | -111.843872 | 1.0 | 191,892 | 47.98 |
| `010900016` | Utah | 40.397525 | -111.848120 | 1.0 | 40,966 | 19.97 |
| `010900017` | Utah | 40.397758 | -111.848147 | 1.0 | 40,966 | 26.97 |

Representative low-score residential examples in the Lehi area also behaved as expected, returning `0.0` when no AADT-tagged road section was within 100 meters of the centroid.

| Parcel ID | County | Latitude | Longitude | Score |
|---|---|---:|---:|---:|
| `394010289` | Utah | 40.453378 | -111.886332 | 0.0 |
| `394010280` | Utah | 40.453170 | -111.883981 | 0.0 |
| `421171320` | Utah | 40.443382 | -111.842252 | 0.0 |

## Regeneration Procedure

From `tooele-land-intel`, regenerate the cache and score CSV with:

```bash
python -m pip install shapely pyproj
python scripts/score_parcel_aadt.py --force-download --progress-every 100000
```

For a smoke test, use:

```bash
python scripts/score_parcel_aadt.py --limit 10000 --output /tmp/parcel_aadt_scores_smoke.csv
```

The scoring workflow file could not be committed by this agent because the active OAuth token does not include GitHub’s `workflow` scope. Per `docs/MANUS_PATCH_HANDOFF.md`, the full workflow YAML is included inline in the PR description for CC to commit on the same branch.

## D1 Load Procedure

The `load_aadt_scores_to_d1.yml` workflow, included inline in the `wasatch-intel` PR description for CC to commit, downloads `data/raw/parcel_aadt_scores.csv` from `tooele-land-intel`, converts it into **500-row SQL chunks**, and applies only statements of this form:

```sql
UPDATE parcel_records SET aadt_score = 0.7 WHERE id = 'example-parcel-id';
```

The workflow retries each D1 chunk after **15, 30, and 60 seconds** before failing the run. It uploads SQL chunks as artifacts for inspection, records a `cron_runs` summary row, and emits D1 verification queries after a successful load.

## Verification Queries for CC

Do not ask this agent to query D1 directly; Cloudflare MCP authentication is unavailable in this environment. CC should run the workflow and then verify the database with these D1 queries:

```sql
SELECT
  COUNT(*) AS total,
  SUM(CASE WHEN aadt_score IS NOT NULL THEN 1 ELSE 0 END) AS with_aadt_score,
  SUM(CASE WHEN aadt_score > 0 THEN 1 ELSE 0 END) AS positive_aadt_score
FROM parcel_records;
```

```sql
SELECT aadt_score, COUNT(*) AS count
FROM parcel_records
GROUP BY aadt_score
ORDER BY aadt_score;
```

```sql
SELECT
  SUM(CASE WHEN aadt_score >= 0.7 THEN 1 ELSE 0 END) AS high_traffic,
  COUNT(*) AS total
FROM parcel_records;
```

```sql
SELECT id, aadt_score
FROM parcel_records
WHERE id IN ('010910058', '010900039', '010900040', '010900016', '010900017');
```

The expected post-load distribution should match the generated CSV unless some `parcel_records.id` values have changed after score generation.

## References

[1]: https://opendata.gis.utah.gov/datasets/uplan::aadt-rounded-1 "AADT Rounded — Utah Open Data / UPlan"
[2]: https://opendata.gis.utah.gov/datasets/uplan::aadt-unrounded-1 "AADT Unrounded — Utah Open Data / UPlan"
[3]: https://www.arcgis.com/home/item.html?id=cf41e8473956413f906cfc96172fe998 "AADT Map — ArcGIS item overview"
