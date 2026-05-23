-- Phase 18b-2e: taxonomy harmonization — normalized zoning columns + Tooele secondary
-- Apply via: wrangler d1 execute wasatch-intel-db --remote --file migrations/0009_taxonomy_harmonization.sql

ALTER TABLE parcel_records ADD COLUMN zone_current_normalized TEXT;
ALTER TABLE parcel_records ADD COLUMN zone_future_normalized  TEXT;
ALTER TABLE parcel_records ADD COLUMN zone_future_secondary   TEXT;

CREATE INDEX IF NOT EXISTS idx_pr_zone_current_norm ON parcel_records (zone_current_normalized);
CREATE INDEX IF NOT EXISTS idx_pr_zone_future_norm  ON parcel_records (zone_future_normalized);
