-- Phase 13b-3/4/5/7/8 scoring columns
-- Each column is written by its own enrichment sub-task; all nullable with no defaults.

ALTER TABLE parcel_records ADD COLUMN corner_score REAL;
ALTER TABLE parcel_records ADD COLUMN aadt_score REAL;
ALTER TABLE parcel_records ADD COLUMN zoning_score REAL;
ALTER TABLE parcel_records ADD COLUMN commute_corridor_score REAL;
ALTER TABLE parcel_records ADD COLUMN vacancy_class TEXT;
