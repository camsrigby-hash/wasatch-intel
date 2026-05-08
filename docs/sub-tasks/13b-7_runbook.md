# Phase 13b-7 Runbook: Commute Corridor Scoring for Wasatch Intel Parcels

**Author:** Manus AI  
**Branch:** `phase-13b-7-commute-corridor`  
**Repositories:** `camsrigby-hash/tooele-land-intel` and `camsrigby-hash/wasatch-intel`

## Purpose

Phase 13b-7 adds a proxy **commute corridor score** for each parcel loaded into `wasatch-intel-db.parcel_records`. The score models the business value of parcels near major Wasatch Front ramp funnels where commuters enter I-15, I-80, US-89, or SR-201 during the AM peak. Until a WFRC AM-peak skim matrix is obtained, every generated row is explicitly tagged with `commute_corridor_method='proxy'` so the same column can be replaced later without a data-model migration.

The source ramp geometry is the UGRC Utah Roads ArcGIS feature service, filtered to `POSTTYPE='RAMP'` and the major commute-route prefixes used by UDOT/UGRC road records for I-15, I-80, US-89, and SR-201.[1] The loader workflow intentionally updates only `parcel_records.commute_corridor_score` and the new `parcel_records.commute_corridor_method` field, leaving existing parcel geometry and base parcel attributes untouched.

## Deliverables

| Repository | Path | Commit status | Notes |
|---|---:|---:|---|
| `tooele-land-intel` | `scripts/score_parcel_commute_corridor.py` | Committed | Fetches UGRC ramp proxy points, scores local parcel exports, and writes one de-duplicated row per D1 `parcel_id`. |
| `tooele-land-intel` | `data/raw/parcel_commute_corridor_scores.csv` | Committed | Final score table with `parcel_id`, `commute_corridor_score`, `nearest_ramp_id`, `distance_mi`, `approach_side_bool`, and `commute_corridor_method`. |
| `tooele-land-intel` | `data/cache/ugrc_onramps.geojson` | Committed | Cached UGRC major-route ramp proxy points used for reproducible scoring. |
| `tooele-land-intel` | `.github/workflows/score_parcel_commute_corridor.yml` | **Not committed by Manus** | Full YAML is pasted in the PR body under **Workflow files for CC to commit** because the active OAuth app cannot write workflow files. |
| `wasatch-intel` | `.github/workflows/load_commute_corridor_to_d1.yml` | **Not committed by Manus** | Full YAML is pasted in the PR body under **Workflow files for CC to commit** because the active OAuth app cannot write workflow files. |
| `wasatch-intel` | `docs/sub-tasks/13b-7_runbook.md` | Committed | This runbook. |

## Scoring model

The scoring script treats each UGRC ramp feature as a proxy ramp-funnel point and assigns a score based on distance to the nearest major-route ramp and whether the parcel lies on the cardinal approach side for that ramp. Northbound ramps treat parcels south of the ramp as the AM-approach side; southbound ramps treat parcels north of the ramp as the approach side; eastbound ramps treat parcels west of the ramp as the approach side; and westbound ramps treat parcels east of the ramp as the approach side.

| Score | Rule applied by `score_parcel_commute_corridor.py` |
|---:|---|
| `1.0` | Parcel is within 0.25 miles of the nearest major-route ramp proxy point and lies on the approach side. |
| `0.7` | Parcel is within 0.5 miles and lies on the approach side. |
| `0.4` | Parcel is within 0.5 miles on the wrong side, or within 1.0 mile on the approach side. |
| `0.1` | Parcel is within 2.0 miles of a major-route ramp proxy point. |
| `0.0` | Parcel is farther than 2.0 miles from any cached major-route ramp proxy point. |

The script uses the `DOT_RTNAME` route prefixes `0015`, `0080`, `0089`, and `0201`, corresponding to I-15, I-80, US-89, and SR-201 in the local scoring map. Ramp direction is inferred first from the ramp name tokens `NB`, `SB`, `EB`, and `WB`, with a route-name fallback for positive and negative carriageway encodings. The distance calculation is a Haversine straight-line proxy in miles, which is appropriate for a first-pass ranking signal but should be replaced by an AM-peak travel-time skim once WFRC data is available.

## Local reproduction

Run the following commands from the checked-out `tooele-land-intel` repository. The Salt Lake, Utah, and Weber parcel files may need to be present as local `.csv.gz` files from the `large-parcels` release before scoring.

```bash
cd /home/ubuntu/tooele-land-intel
python3.11 scripts/score_parcel_commute_corridor.py --refresh-ramps --chunk-size 50000
```

The final Manus run generated `data/cache/ugrc_onramps.geojson` and `data/raw/parcel_commute_corridor_scores.csv` from 1,202,000 raw input rows, then de-duplicated to one row per D1 parcel identifier to match `INSERT OR REPLACE` semantics from the parcel loader.

| Validation metric | Result |
|---|---:|
| Raw parcel input rows scanned | 1,202,000 |
| Final de-duplicated score rows | 947,863 |
| Distinct `parcel_id` values | 947,863 |
| Rows with `commute_corridor_method='proxy'` | 947,863 |
| Proxy-method coverage | 100.00% |
| Rows scoring `> 0.0` | 437,283 |
| Percent scoring `> 0.0` | 46.13% |
| Rows scoring `>= 0.7` | 50,397 |
| Percent scoring `>= 0.7` | 5.32% |

The high-score share is within the requested 3–8% range, and every output row is proxy-tagged. The positive-score share is lower than the rough 60–80% expectation when measured across the full seven-county D1 parcel universe. I did **not** loosen the 2.0-mile scoring threshold to force the distribution into the expected band; CC should review whether the acceptance expectation should be interpreted across a narrower Wasatch Front subset or whether additional commute corridors, such as future WFRC skim-derived corridors, should be incorporated later.

## D1 schema note for CC

`parcel_records.commute_corridor_score` already exists, but `parcel_records.commute_corridor_method` does not exist in the current schema. CC should add migration `0007` before merge, or allow the loader workflow pre-step to add the column idempotently.

```sql
ALTER TABLE parcel_records ADD COLUMN commute_corridor_method TEXT;
```

The handoff loader YAML includes a defensive pre-step that attempts this `ALTER TABLE` and treats an existing or duplicate column message as success. A formal migration is still preferred so the repository schema matches production D1 state.

## Workflow handoff

The active OAuth app cannot create or update files under `.github/workflows`. Following `docs/MANUS_PATCH_HANDOFF.md`, Manus did **not** commit workflow files. Instead, each PR body includes a **Workflow files for CC to commit** section containing the full YAML for:

| Repository | Workflow file for CC to create |
|---|---|
| `tooele-land-intel` | `.github/workflows/score_parcel_commute_corridor.yml` |
| `wasatch-intel` | `.github/workflows/load_commute_corridor_to_d1.yml` |

CC should check out the branch, create those workflow files from the PR body, commit them to the same branch, add migration `0007`, and then merge.

## References

[1]: https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services/UtahRoads/FeatureServer/0 "UGRC Utah Roads FeatureServer Layer 0"
