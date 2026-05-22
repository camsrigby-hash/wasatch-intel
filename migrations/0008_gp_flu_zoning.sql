-- Phase 18b-3: per-parcel GP / Future Land Use zoning columns
-- Apply via: wrangler d1 migrations apply wasatch-intel-db --remote
-- Or: wrangler d1 execute wasatch-intel-db --remote --file migrations/0008_gp_flu_zoning.sql

ALTER TABLE parcel_records ADD COLUMN zone_current            TEXT;
ALTER TABLE parcel_records ADD COLUMN zone_current_source     TEXT;
ALTER TABLE parcel_records ADD COLUMN zone_future             TEXT;
ALTER TABLE parcel_records ADD COLUMN zone_future_source      TEXT;
ALTER TABLE parcel_records ADD COLUMN flu_source_jurisdiction TEXT;
ALTER TABLE parcel_records ADD COLUMN flu_plan_vintage        TEXT;
ALTER TABLE parcel_records ADD COLUMN flu_currency_note       TEXT;

CREATE INDEX IF NOT EXISTS idx_pr_zone_current  ON parcel_records (zone_current);
CREATE INDEX IF NOT EXISTS idx_pr_zone_future   ON parcel_records (zone_future);
