# Phase 13b-6a: Census ACS County-Level Pull Runbook

This runbook covers the end-to-end execution of the Phase 13b-6a Census ACS ingestion pipeline.

## 1. Dependency Gate Checks

**MUST run before triggering any workflow.** This sub-task requires Phase 13b-1 to be complete.

```bash
# Gate A — parcel_enrichment_log table exists
npx wrangler d1 execute wasatch-intel-db --remote \
  --command "SELECT name FROM sqlite_master WHERE type='table' AND name='parcel_enrichment_log';"
# Expect: 1 row

# Gate B — parcel_enrichment_log has column 'source'
npx wrangler d1 execute wasatch-intel-db --remote \
  --command "PRAGMA table_info(parcel_enrichment_log);"
# Expect: 5 columns including one named exactly 'source'
```

## 2. Trigger the Scrape Workflow

The scrape workflow fetches ACS income data and TIGERweb boundaries for all 7 counties and commits the result to the `tooele-land-intel` repo.

**Trigger via GitHub CLI:**
```bash
gh workflow run fetch_census_acs.yml -R camsrigby-hash/tooele-land-intel
```

**Expected Runtime:** ~2–5 minutes. The dataset is small (1,608 block groups), but the TIGERweb boundary endpoint is sometimes slow and requires backoff retries.

**Dry-Run Option:**
```bash
gh workflow run fetch_census_acs.yml -R camsrigby-hash/tooele-land-intel -f dry_run=true
```

**Census API Key Note:**
If the workflow fails with 429 rate-limit errors, the Census API 500-call/day/IP limit has been hit. Register a free key at [https://api.census.gov/data/key_signup.html](https://api.census.gov/data/key_signup.html) and add it as a `CENSUS_API_KEY` repository secret in `tooele-land-intel`.

## 3. Trigger the D1 Load Workflow

Once the scrape workflow succeeds and commits `census_acs_blockgroups.csv` to `tooele-land-intel`'s `main` branch, run the load workflow to push the data into D1.

**Trigger via GitHub CLI:**
```bash
gh workflow run load_census_acs_to_d1.yml -R camsrigby-hash/wasatch-intel
```

**Expected Runtime:** ~2 minutes. The workflow generates chunked SQL and executes it sequentially.

**Required Secrets:**
Ensure these are set in `wasatch-intel` repo secrets:
- `CLOUDFLARE_API_TOKEN` (must have D1 write permissions)
- `CLOUDFLARE_ACCOUNT_ID`

## 4. Verification Queries

After the load workflow completes, run these queries to verify the SUCCESS CRITERIA:

```bash
# 1. Total row count (Expect: ~1,608 rows)
npx wrangler d1 execute wasatch-intel-db --remote \
  --command "SELECT COUNT(*) FROM census_acs_blockgroups;"

# 2. Per-county block group counts
npx wrangler d1 execute wasatch-intel-db --remote \
  --command "SELECT county_fips, COUNT(*) FROM census_acs_blockgroups GROUP BY county_fips;"
# Expected: Salt Lake ~712, Utah ~434, Davis ~193, Weber ~166, Box Elder ~42, Tooele ~39, Wasatch ~22

# 3. Median income coverage (Expect: >90%)
npx wrangler d1 execute wasatch-intel-db --remote \
  --command "SELECT COUNT(*) FROM census_acs_blockgroups WHERE median_income IS NOT NULL;"

# 4. Boundary GeoJSON populated (Expect: matches total row count)
npx wrangler d1 execute wasatch-intel-db --remote \
  --command "SELECT COUNT(*) FROM census_acs_blockgroups WHERE boundary_geojson IS NOT NULL;"

# 5. parcel_enrichment_log rows
npx wrangler d1 execute wasatch-intel-db --remote \
  --command "SELECT status, COUNT(*) FROM parcel_enrichment_log WHERE source='census_acs' GROUP BY status;"

# 6. cron_runs summary
npx wrangler d1 execute wasatch-intel-db --remote \
  --command "SELECT workflow_name, status, items_processed FROM cron_runs WHERE workflow_name IN ('fetch_census_acs', 'load_census_acs_to_d1') ORDER BY ran_at DESC LIMIT 4;"
```

## 5. Rollback Instructions

If 13b-6a fails after a partial write or needs to be undone:

```bash
# 1. Identify writes
npx wrangler d1 execute wasatch-intel-db --remote \
  --command "SELECT COUNT(*) FROM parcel_enrichment_log WHERE source='census_acs';"

# 2. Roll back parcel_enrichment_log
npx wrangler d1 execute wasatch-intel-db --remote \
  --command "DELETE FROM parcel_enrichment_log WHERE source='census_acs';"

# 3. Roll back staging table data (keep schema)
npx wrangler d1 execute wasatch-intel-db --remote \
  --command "DELETE FROM census_acs_blockgroups;"

# 4. Revert CSV commit in tooele-land-intel
cd tooele-land-intel
git log --oneline | grep "data: update census_acs_blockgroups.csv"
git revert <COMMIT_HASH>
git push
```
