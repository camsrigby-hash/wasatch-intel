# Phase 13b-3: Corner Detection Scoring Runbook

This runbook covers the end-to-end execution of the Phase 13b-3 corner detection pipeline. The pipeline computes parcel-level `corner_score` values from parcel polygons and UGRC road centerlines, then loads those scores into `parcel_records.corner_score` in D1. The generated CSV is intentionally narrow and contains only `parcel_id`, `corner_score`, `road_count`, and `top_road_class`, so the D1 loader can update records in safe 500-row chunks.

## 1. Dependency Gate Checks

**MUST run before triggering any workflow.** This sub-task depends on the Phase 13b parcel records table being present and on `parcel_records.corner_score` already existing as a nullable numeric column. The scoring job itself runs from CSV files in `tooele-land-intel`; the D1 job only reads the generated score CSV and performs `UPDATE` statements.

```bash
# Gate A — parcel_records table exists
npx wrangler d1 execute wasatch-intel-db --remote \
  --command "SELECT name FROM sqlite_master WHERE type='table' AND name='parcel_records';"
# Expect: 1 row

# Gate B — parcel_records has corner_score column
npx wrangler d1 execute wasatch-intel-db --remote \
  --command "PRAGMA table_info(parcel_records);"
# Expect: a column named exactly corner_score, nullable, numeric/REAL-compatible

# Gate C — current parcel population
npx wrangler d1 execute wasatch-intel-db --remote \
  --command "SELECT COUNT(*) AS total_parcels FROM parcel_records;"
# Expect: 947,863 rows for the seven-county Phase 13b corpus
```

## 2. Workflow File Handoff Gate

The workflow files were not committed by Manus because the available OAuth token lacked GitHub Actions workflow write scope. This is an expected handoff condition documented in `docs/MANUS_PATCH_HANDOFF.md`. CC must copy the full workflow YAML blocks from the PR description and commit them to the same branch before merging.

| Repository | Workflow path for CC to create | Purpose |
|---|---:|---|
| `tooele-land-intel` | `.github/workflows/score_corner_parcels.yml` | Recompute `data/raw/parcel_corner_scores.csv` from parcel polygons and UGRC road centerlines. |
| `wasatch-intel` | `.github/workflows/load_corner_scores_to_d1.yml` | Download the score CSV, generate 500-row `UPDATE` chunks, and load `corner_score` into D1. |

After CC commits both workflow files, confirm they exist on the branch before triggering any workflow.

```bash
gh api repos/camsrigby-hash/tooele-land-intel/contents/.github/workflows/score_corner_parcels.yml \
  -f ref=phase-13b-3-corner-detection --jq '.path'

gh api repos/camsrigby-hash/wasatch-intel/contents/.github/workflows/load_corner_scores_to_d1.yml \
  -f ref=phase-13b-3-corner-detection --jq '.path'
```

## 3. Trigger the Scoring Workflow

The scoring workflow is optional if the committed `data/raw/parcel_corner_scores.csv` has already been reviewed and accepted. Trigger it only when the CSV should be regenerated from source parcel CSVs and the cached UGRC road extracts. The workflow downloads the large Salt Lake parcel CSV from the `large-parcels` release in `tooele-land-intel`; smaller county CSVs are expected to exist in `data/raw`.

```bash
gh workflow run score_corner_parcels.yml \
  -R camsrigby-hash/tooele-land-intel \
  --ref phase-13b-3-corner-detection \
  -f counties=all \
  -f distance_m=25 \
  -f refresh_roads=false
```

The scorer uses UGRC Utah Roads centerlines and their DOT functional class field to distinguish arterial and collector frontage from local-road frontage.[1] It writes a four-column CSV whose row key is `parcel_id`. The accepted generated file has 947,863 rows, no duplicate `parcel_id` values, and a high-score share of 11.06%, which is within the 5–15% acceptance range for corner-like parcels.

| Score bucket | Row count | Share |
|---:|---:|---:|
| `0.00` | 82,758 | 8.73% |
| `0.05` | 417,301 | 44.03% |
| `0.10` | 4,904 | 0.52% |
| `0.25` | 282,107 | 29.76% |
| `0.30` | 46,257 | 4.88% |
| `0.40` | 9,749 | 1.03% |
| `0.82` | 86,707 | 9.15% |
| `1.00` | 18,080 | 1.91% |

## 4. Trigger the D1 Load Workflow

Run the loader in dry-run mode first. The dry run downloads the CSV, generates SQL chunks, and uploads the chunks as an artifact without executing any D1 writes.

```bash
gh workflow run load_corner_scores_to_d1.yml \
  -R camsrigby-hash/wasatch-intel \
  --ref phase-13b-3-corner-detection \
  -f dry_run=true \
  -f csv_url=https://raw.githubusercontent.com/camsrigby-hash/tooele-land-intel/phase-13b-3-corner-detection/data/raw/parcel_corner_scores.csv
```

Inspect the `corner-score-sql-chunks` artifact. The first few chunks should contain only `UPDATE parcel_records SET corner_score = CASE parcel_id ... END WHERE parcel_id IN (...);` statements, and the chunk count should be approximately 1,896 for 947,863 rows at `CHUNK_SIZE=500`.

After the dry-run artifact is acceptable, execute the load.

```bash
gh workflow run load_corner_scores_to_d1.yml \
  -R camsrigby-hash/wasatch-intel \
  --ref phase-13b-3-corner-detection \
  -f dry_run=false \
  -f csv_url=https://raw.githubusercontent.com/camsrigby-hash/tooele-land-intel/phase-13b-3-corner-detection/data/raw/parcel_corner_scores.csv
```

**Required secrets:** `wasatch-intel` must have `CLOUDFLARE_API_TOKEN` with D1 write permissions and `CLOUDFLARE_ACCOUNT_ID`. The loader follows the existing 15/30/60-second retry pattern used by the repository’s parcel and enrichment loaders.

## 5. Verification Queries

After the D1 load workflow completes, run these queries to verify the acceptance criteria. Manus must not run these D1 queries; CC should run them from an authenticated environment.

```bash
# 1. Corner-score coverage. Expect: populated >= 85%; target is near 100% if all 947,863 parcel_ids match.
npx wrangler d1 execute wasatch-intel-db --remote \
  --command "SELECT COUNT(*) AS total, SUM(CASE WHEN corner_score IS NOT NULL THEN 1 ELSE 0 END) AS populated, ROUND(100.0 * SUM(CASE WHEN corner_score IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*), 2) AS pct_populated FROM parcel_records;"

# 2. Score distribution histogram. Expect: majority in 0.00-0.30 and about 5-15% >= 0.70.
npx wrangler d1 execute wasatch-intel-db --remote \
  --command "SELECT corner_score, COUNT(*) AS count FROM parcel_records GROUP BY corner_score ORDER BY corner_score;"

# 3. High-score share. Expect: around 104,787 rows, or 11.06%, for the accepted CSV.
npx wrangler d1 execute wasatch-intel-db --remote \
  --command "SELECT COUNT(*) AS high_score_rows, ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM parcel_records), 2) AS pct_high_score FROM parcel_records WHERE corner_score >= 0.7;"

# 4. Null-score audit. Expect: 0 if all generated parcel_ids matched D1 records.
npx wrangler d1 execute wasatch-intel-db --remote \
  --command "SELECT COUNT(*) AS null_corner_scores FROM parcel_records WHERE corner_score IS NULL;"

# 5. Recent cron_runs summary.
npx wrangler d1 execute wasatch-intel-db --remote \
  --command "SELECT workflow_name, status, items_processed, notes FROM cron_runs WHERE workflow_name='load_corner_scores_to_d1' ORDER BY ran_at DESC LIMIT 3;"
```

For the required Lehi and Saratoga Springs spot check, choose ten known commercial intersection parcels from D1 by address, city, or map review, then verify their `corner_score` values. They should score at least `0.70` if they sit at named-road intersections.

```bash
# Replace the parcel_id list with 10 reviewed Lehi/Saratoga Springs commercial corner parcels.
npx wrangler d1 execute wasatch-intel-db --remote \
  --command "SELECT parcel_id, situs_address, city, corner_score FROM parcel_records WHERE parcel_id IN ('REPLACE_WITH_PARCEL_ID_1','REPLACE_WITH_PARCEL_ID_2','REPLACE_WITH_PARCEL_ID_3','REPLACE_WITH_PARCEL_ID_4','REPLACE_WITH_PARCEL_ID_5','REPLACE_WITH_PARCEL_ID_6','REPLACE_WITH_PARCEL_ID_7','REPLACE_WITH_PARCEL_ID_8','REPLACE_WITH_PARCEL_ID_9','REPLACE_WITH_PARCEL_ID_10') ORDER BY corner_score DESC;"
```

## 6. Rollback Instructions

If the loader partially writes bad scores or the scoring rubric needs to be changed, clear the `corner_score` column and rerun the dry-run/load sequence after a corrected CSV is available.

```bash
# 1. Audit current score population before rollback.
npx wrangler d1 execute wasatch-intel-db --remote \
  --command "SELECT COUNT(*) AS populated FROM parcel_records WHERE corner_score IS NOT NULL;"

# 2. Roll back the score column only. This preserves parcel_records and all other enrichment fields.
npx wrangler d1 execute wasatch-intel-db --remote \
  --command "UPDATE parcel_records SET corner_score = NULL WHERE corner_score IS NOT NULL;"

# 3. Confirm rollback.
npx wrangler d1 execute wasatch-intel-db --remote \
  --command "SELECT COUNT(*) AS populated_after_rollback FROM parcel_records WHERE corner_score IS NOT NULL;"
```

If the CSV itself is invalid, revert the `data/raw/parcel_corner_scores.csv` commit in `tooele-land-intel`, regenerate with `score_corner_parcels.yml`, and repeat the dry-run D1 load inspection before writing to D1.

## References

[1]: https://gis.utah.gov/products/sgid/transportation/road-centerlines/ "UGRC Road Centerlines"
