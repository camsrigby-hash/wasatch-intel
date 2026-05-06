-- Phase 13b-1: Enrichment pipeline schema additions
-- Apply via: .github/workflows/d1-migrate-phase13.yml (workflow_dispatch)
-- Authoritative spec: docs/PHASE_13_ENRICHMENT_ARCH.md §2.11

-- Per-source enrichment freshness log (one row per parcel × source).
-- 'source' column name is canonical per §2.11.
-- REFERENCES parcel_records(id) is for documentation; D1/SQLite does not
-- enforce FK constraints without PRAGMA foreign_keys = ON.
CREATE TABLE IF NOT EXISTS parcel_enrichment_log (
  parcel_id   TEXT NOT NULL,
  source      TEXT NOT NULL,
  enriched_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status      TEXT NOT NULL CHECK(status IN ('ok', 'partial', 'failed', 'skipped_budget')),
  details     TEXT,
  PRIMARY KEY (parcel_id, source)
);

CREATE INDEX IF NOT EXISTS idx_pel_source_status
  ON parcel_enrichment_log (source, status);

-- SHA-256 hash of enrichment-relevant LIR fields (bldg_sqft|built_yr|prop_class|
-- total_market_value). Used for delta-fetch: skip re-enrichment if hash unchanged.
ALTER TABLE parcel_records ADD COLUMN field_hash TEXT;

-- Tracks which method produced commute_corridor_tier. Set to 'proxy' for all
-- rows populated by 13b-2 (straight-line drive-time proxy). Flip to 'wfrc' in a
-- future phase when real WFRC AM-peak skim matrix is incorporated.
ALTER TABLE parcel_records ADD COLUMN commute_corridor_method TEXT NOT NULL DEFAULT 'proxy';

-- NOTE: The county enum extension (adding 'wasatch' and 'box_elder') is
-- intentionally NOT enforced via CHECK constraint. SQLite cannot add a CHECK
-- constraint to an existing column post-creation (no ALTER TABLE ADD CONSTRAINT).
-- New county values will write successfully. The constraint exists only in the
-- arch doc as a design intent, not as a runtime enforcement.
