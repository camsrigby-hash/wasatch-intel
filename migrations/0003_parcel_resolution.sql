-- Phase 12: Haiku-extracted parcel/legal-description resolutions + cron run heartbeat
-- Apply via: .github/workflows/d1-migrate-phase12.yml (workflow_dispatch)

-- Haiku extractions from full agenda-item PDF bodies. One row per agenda item processed.
CREATE TABLE IF NOT EXISTS agenda_parcel_resolutions (
  agenda_item_id        TEXT PRIMARY KEY,
  parcel_ids            TEXT NOT NULL DEFAULT '[]',          -- JSON string[]
  legal_descriptions    TEXT NOT NULL DEFAULT '[]',          -- JSON string[]
  street_addresses      TEXT NOT NULL DEFAULT '[]',          -- JSON string[]
  cross_streets         TEXT NOT NULL DEFAULT '[]',          -- JSON string[]
  confidence            TEXT NOT NULL DEFAULT 'medium'        -- 'high'|'medium'|'low'
                          CHECK(confidence IN ('high','medium','low')),
  resolved_lat          REAL,
  resolved_lng          REAL,
  resolved_via          TEXT,                                 -- 'parcel_id'|'address'|'cross_street'|'legal'|null
  extracted_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_apr_resolved_via ON agenda_parcel_resolutions(resolved_via);
CREATE INDEX IF NOT EXISTS idx_apr_extracted_at ON agenda_parcel_resolutions(extracted_at);

-- Cron run heartbeats. Worker crons (e.g. watchlist-checker) write directly via D1 binding.
-- GHA workflows write to a heartbeat JSON file in tooele-land-intel; the /api/cron-status
-- endpoint aggregates both sources.
CREATE TABLE IF NOT EXISTS cron_runs (
  id                TEXT PRIMARY KEY,
  workflow_name     TEXT NOT NULL,                            -- e.g. 'watchlist-checker','weekly-digest'
  ran_at            TEXT NOT NULL DEFAULT (datetime('now')),
  status            TEXT NOT NULL DEFAULT 'success'
                      CHECK(status IN ('success','failure','partial')),
  duration_ms       INTEGER,
  items_processed   INTEGER,
  notes             TEXT
);

CREATE INDEX IF NOT EXISTS idx_cron_runs_workflow ON cron_runs(workflow_name, ran_at);
