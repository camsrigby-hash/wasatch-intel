-- Phase 18b-2e: Eagle Mountain parcel-level zoning raw fields
-- zone_current_raw: free-text Zoning field preserved for reference (EMC_Zoning_View)
-- current_landuse:  Current_Landuse coded domain preserved as FLU fallback
--   (relevant if EM FLU Cam-KMZ overlay fails or is delayed)
-- Apply via: wrangler d1 execute wasatch-intel-db --remote --file migrations/0010_em_zone_raw.sql

ALTER TABLE parcel_records ADD COLUMN zone_current_raw TEXT;
ALTER TABLE parcel_records ADD COLUMN current_landuse  TEXT;
