# Phase 13b-2: UGRC LIR Ingestion Runbook

This runbook documents how to execute Phase 13b-2 (UGRC LIR parcel ingestion for 7 counties) end-to-end.

**Author:** Manus AI
**Date:** May 05, 2026

## 1. Prerequisites (Gate Checks)

Before triggering the workflows, you **MUST** verify that Phase 13b-1 has completed successfully by running these three queries against production D1:

```bash
# Gate A — parcel_enrichment_log table exists:
npx wrangler d1 execute wasatch-intel-db --remote \
  --command "SELECT name FROM sqlite_master WHERE type='table' AND name='parcel_enrichment_log';"
# Expect: 1 row returned with name='parcel_enrichment_log'

# Gate B — county enum extended to 7 values:
npx wrangler d1 execute wasatch-intel-db --remote \
  --command "SELECT sql FROM sqlite_master WHERE name='parcel_records';"
# Expect: output contains 'wasatch' AND 'box_elder' in the CHECK constraint clause

# Gate C — commute_corridor_method column exists:
npx wrangler d1 execute wasatch-intel-db --remote \
  --command "PRAGMA table_info(parcel_records);"
# Expect: column named 'commute_corridor_method' present in the output
```

If any gate fails, stop and resolve Phase 13b-1 first.

## 2. Triggering the Scrape Workflow

The scrape workflow pulls data from UGRC and writes it to CSVs in the `tooele-land-intel` repo.

**Command:**
```bash
gh workflow run scrape_ugrc_lir.yml -R camsrigby-hash/tooele-land-intel -f county=all
```

**Expected Runtime:**
- Tooele: ~10 minutes
- Wasatch: ~5 minutes
- Box Elder: ~15 minutes
- Davis: ~45 minutes
- Weber: ~55 minutes
- Utah: ~1.5 hours
- Salt Lake: ~2.5 hours
*(Total wall-clock: ~2.5 hours, since counties run in parallel)*

## 3. Triggering the Load Workflow

Once the scrape workflow finishes and commits the CSVs, trigger the load workflow to write the data into D1.

**Command:**
```bash
gh workflow run load_parcels_to_d1.yml -R camsrigby-hash/wasatch-intel -f county=all
```

**Expected Runtime:**
- The load workflow chunks inserts into batches of 1,000.
- Expect ~1-2 hours total wall-clock for all 7 counties.

## 4. Verification

After the load workflow completes, verify success by running these queries against production D1:

**1. Row Counts:**
```bash
npx wrangler d1 execute wasatch-intel-db --remote \
  --command "SELECT county, COUNT(*) FROM parcel_records GROUP BY county;"
```
*Expected:* Tooele (~45k), Salt Lake (~395k), Utah (~328k), Davis (~152k), Weber (~190k), Wasatch (~25k), Box Elder (~50k). Total ~1.18M.

**2. Telemetry:**
```bash
npx wrangler d1 execute wasatch-intel-db --remote \
  --command "SELECT COUNT(*) FROM parcel_enrichment_log WHERE source_name='ugrc_lir' AND status='success';"
```
*Expected:* Matches the total row count from query 1.

**3. Spot Check (Weber Regression Target):**
```bash
npx wrangler d1 execute wasatch-intel-db --remote \
  --command "SELECT parcel_id, county, acreage, bldg_sqft FROM parcel_records WHERE parcel_id='080480106';"
```
*Expected:* 1 row, `county='weber'`, `bldg_sqft=0`.

## 5. Re-running a Single County

If a single county fails during scrape or load, you can re-run just that county by specifying its name:

```bash
# Re-run scrape for Utah county
gh workflow run scrape_ugrc_lir.yml -R camsrigby-hash/tooele-land-intel -f county=utah

# Re-run load for Utah county
gh workflow run load_parcels_to_d1.yml -R camsrigby-hash/wasatch-intel -f county=utah
```

## 6. Dry Run Support

Both workflows support a `dry_run` flag for cost/time estimation without making changes:

```bash
gh workflow run scrape_ugrc_lir.yml -R camsrigby-hash/tooele-land-intel -f dry_run=true
gh workflow run load_parcels_to_d1.yml -R camsrigby-hash/wasatch-intel -f dry_run=true
```
