# Phase 13b-5 runbook: zoning score normalizer and D1 load

Author: **Manus AI**  
Date: 2026-05-07

## Purpose

Phase 13b-5 adds a repeatable path for assigning a generic commercial zoning-fit score to parcels and loading that score into the existing nullable `parcel_records.zoning_score` column in the `wasatch-intel-db` D1 database. The scoring source of truth lives in `tooele-land-intel`, while the D1 loading workflow lives in `wasatch-intel`.

The target output file is `tooele-land-intel/data/raw/parcel_zoning_scores.csv`, with the exact columns `parcel_id`, `zoning_score`, `normalized_class`, and `source_zone_string`. The loader updates D1 in 500-row chunks and uses 15/30/60 second retry delays for transient write failures.

## Deliverable map

| Repository | File | Purpose |
|---|---|---|
| `tooele-land-intel` | `scripts/score_parcel_zoning.py` | Streams county parcel CSVs, applies `data/zoning_normalizer.yaml`, and writes `data/raw/parcel_zoning_scores.csv`. |
| `tooele-land-intel` | `data/zoning_normalizer.yaml` | Hand-curated raw zoning string map with scores for pure commercial, mixed use, light industrial/flex, high-density residential, and low-fit noncommercial classes. |
| `tooele-land-intel` | `data/raw/parcel_zoning_scores.csv` | Generated parcel-level score file consumed by the D1 load workflow. |
| `tooele-land-intel` | `.github/workflows/score_parcel_zoning.yml` | Manual workflow that regenerates the score CSV, uploads it as an artifact, and can commit the result back to the branch. |
| `wasatch-intel` | `.github/workflows/load_zoning_scores_to_d1.yml` | Manual workflow that checks out `tooele-land-intel`, builds 500-row SQL chunks, and updates `parcel_records.zoning_score` in D1. |
| `wasatch-intel` | `docs/sub-tasks/13b-5_b1_fallback_list.md` | Lists jurisdictions whose current parcel CSVs lack machine-readable zoning and identifies zoning-code/contact sources for Phase 14. |

## Scoring semantics

The scoring model is a deliberately simple fit score for generic commercial use. It is not an entitlement opinion and should not be treated as a substitute for municipal zoning review.

| Score | Normalized fit class | Intended meaning |
|---:|---|---|
| `1.0` | `pure_commercial` | Business, commercial, general commercial, neighborhood commercial, retail, office, and related commercial designations. |
| `0.7` | `mixed_use_commercial` | Mixed-use, transit-oriented, town-center, or neighborhood mixed-use designations with a commercial component. |
| `0.4` | `light_industrial_flex` | Light industrial, industrial park, business park, flex, and similar employment/flex categories. |
| `0.2` | `high_density_residential` | Multifamily, apartment, residential mixed density, and comparable high-density residential classes. |
| `0.0` | `low_fit_noncommercial` | Single-family residential, agricultural, conservation, open space, public, exempt, vacant, heavy industrial/mining, or unknown/no-class fallback rows. |

The script first searches each input CSV for `zone_class`, `zoning_class`, `zoning`, `zone`, `zone_code`, `zonecode`, `zoning_code`, `current_zone`, `land_use_zone`, `landuse_zone`, or `base_zone`. If one of those fields exists and maps through `data/zoning_normalizer.yaml`, the output `source_zone_string` is the raw zoning string. If none exists in the current CSV, the script uses the explicit `prop_class:` fallback mappings so downstream systems can exercise the D1 column while preserving provenance in `source_zone_string` and `normalized_class`.

## Regenerating `parcel_zoning_scores.csv`

From the `tooele-land-intel` repository, run the following command on the branch `phase-13b-5-zoning-score`:

```bash
python3.11 scripts/score_parcel_zoning.py
```

The expected current output is a CSV with 1,202,000 scored rows when all county parcel files are present, including the oversized Salt Lake release asset. The scoring script is streaming and writes only the four loader-facing columns, so it does not require loading the full parcel dataset into memory.

| Validation check | Command | Expected result |
|---|---|---|
| Confirm output exists | `test -s data/raw/parcel_zoning_scores.csv` | Command exits `0`. |
| Confirm row count | `wc -l data/raw/parcel_zoning_scores.csv` | Header plus generated parcel rows. |
| Confirm schema | `head -1 data/raw/parcel_zoning_scores.csv` | `parcel_id,zoning_score,normalized_class,source_zone_string`. |
| Confirm score domain | Use a CSV profiler or `awk -F,` check | Every nonblank score is between `0.0` and `1.0`. |

The GitHub Actions workflow `.github/workflows/score_parcel_zoning.yml` performs the same regeneration and uploads the score CSV as an artifact. If `commit_output` is left enabled, it commits changes back to the workflow branch after a pull/rebase and push retry loop.

## Loading scores to D1

The `wasatch-intel` workflow `.github/workflows/load_zoning_scores_to_d1.yml` is manual. Its default `dry_run` is `true`, which only creates SQL chunks and uploads them as an artifact for inspection. To execute the D1 update, run the workflow with `dry_run=false` after CC has reviewed the SQL artifacts or the PR contents.

| Workflow input | Default | Notes |
|---|---|---|
| `tooele_ref` | `phase-13b-5-zoning-score` | The ref in `camsrigby-hash/tooele-land-intel` containing `data/raw/parcel_zoning_scores.csv`. |
| `dry_run` | `true` | Must be set to `false` to write to remote D1. |

The loader generates SQL of the form `UPDATE parcel_records SET zoning_score = CASE parcel_id ... END WHERE parcel_id IN (...)`. Each chunk contains up to 500 parcel IDs. During execution, every chunk is attempted once and then retried after 15, 30, and 60 seconds before being marked failed. The workflow writes a `cron_runs` summary row when it runs in non-dry-run mode.

## Acceptance checks

The current generated score file reports 100.00% score coverage over the local county parcel rows because `prop_class:` fallback scoring is explicit for blank, unknown, vacant, exempt, agricultural, residential, commercial, mixed-use, and industrial property classes. This satisfies the mechanical coverage acceptance threshold, but the B1 fallback list must remain attached to the phase because the current repository CSVs do not contain true machine-readable municipal zoning columns.

| Acceptance item | Current status | Evidence |
|---|---|---|
| At least 90% of parcels have `zoning_score` | Met for current local CSV output | `score_parcel_zoning.py` reported 1,202,000 scored rows out of 1,202,000 input rows. |
| No D1 direct query by this phase | Met | The workflow builds SQL and is left manual/dry-run by default; CC owns verification and execution. |
| B1 fallback list has zero false negatives | Met against current repo inputs | All 13 configured jurisdictions are listed because no current parcel CSV has a zone-class-like source column. |
| D1 writes chunked at 500 rows with 15/30/60 second retry | Met | `load_zoning_scores_to_d1.yml` emits 500-row SQL files and retries each file after 15, 30, and 60 seconds. |

## CC handoff notes

CC should review `data/zoning_normalizer.yaml` for the hand-curated mapping table, inspect a dry-run SQL artifact from `load_zoning_scores_to_d1.yml`, and then decide whether to run the D1 workflow with `dry_run=false`. CC should also decide whether the `prop_class:` fallback score should be loaded immediately or held until Phase 14 provides true zoning PDF/GIS-derived classes. The field provenance is intentionally preserved so this decision can be made without ambiguity.
