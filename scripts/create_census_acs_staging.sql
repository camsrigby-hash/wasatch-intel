-- Phase 13b-6a: Census ACS block-group staging table
-- Apply via: npx wrangler d1 execute wasatch-intel-db --remote --file scripts/create_census_acs_staging.sql
-- Or inline: npx wrangler d1 execute wasatch-intel-db --remote --command "<SQL>"
-- This is a one-off staging table (NOT a migration file per spec §5 13b-6a).
-- Authoritative spec: docs/PHASE_13_ENRICHMENT_ARCH.md §1.10, §5 13b-6a

CREATE TABLE IF NOT EXISTS census_acs_blockgroups (
  geoid           TEXT PRIMARY KEY,
  state_fips      TEXT NOT NULL,
  county_fips     TEXT NOT NULL,
  tract           TEXT NOT NULL,
  block_group     TEXT NOT NULL,
  median_income   INTEGER,
  boundary_geojson TEXT,
  fetched_at      TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_acs_county ON census_acs_blockgroups(state_fips, county_fips);
