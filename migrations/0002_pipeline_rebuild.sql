-- Phase 11: Pipeline rebuild schema
-- DO NOT apply to prod without manual review.
-- Run: wrangler d1 migrations apply wasatch-intel-db --env production

-- Parcel records enriched from UGRC + scoring inputs
CREATE TABLE IF NOT EXISTS parcel_records (
  id                   TEXT PRIMARY KEY,
  jurisdiction         TEXT NOT NULL,
  county               TEXT NOT NULL,
  acreage              REAL,
  centroid_lng         REAL,
  centroid_lat         REAL,
  zoning_current       TEXT,
  zoning_gp            TEXT,
  vacancy_status       TEXT,
  is_corner            BOOLEAN NOT NULL DEFAULT 0,
  bldg_sqft            INTEGER NOT NULL DEFAULT 0,
  built_yr             INTEGER,
  prop_class           TEXT,
  aadt_primary         INTEGER NOT NULL DEFAULT 0,
  has_signal           BOOLEAN NOT NULL DEFAULT 0,
  median_income        INTEGER,
  competition_count    INTEGER NOT NULL DEFAULT 0,
  commute_corridor_tier TEXT,
  enriched_at          TIMESTAMP,
  polygon_geojson      TEXT
);

CREATE INDEX IF NOT EXISTS idx_parcel_records_jurisdiction
  ON parcel_records (jurisdiction, county, vacancy_status);

-- Pipeline entries: one row per tracked parcel
CREATE TABLE IF NOT EXISTS pipeline_entries (
  parcel_id        TEXT PRIMARY KEY REFERENCES parcel_records(id),
  stage            TEXT NOT NULL DEFAULT 'prospect',
  outcome          TEXT,
  saved_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  stage_changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes            TEXT NOT NULL DEFAULT '',
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Due-diligence checklist items (auto-populated + user-added)
CREATE TABLE IF NOT EXISTS dd_checklist_items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  parcel_id  TEXT NOT NULL REFERENCES parcel_records(id),
  item_id    TEXT NOT NULL,
  label      TEXT NOT NULL,
  done       BOOLEAN NOT NULL DEFAULT 0,
  notes      TEXT,
  is_custom  BOOLEAN NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (parcel_id, item_id)
);

-- LOI draft JSON blob (one per parcel)
CREATE TABLE IF NOT EXISTS loi_drafts (
  parcel_id  TEXT PRIMARY KEY REFERENCES parcel_records(id),
  draft_json TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- User-defined and default scoring profiles
CREATE TABLE IF NOT EXISTS scoring_profiles (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  weights_json TEXT NOT NULL,
  flags_json   TEXT NOT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
