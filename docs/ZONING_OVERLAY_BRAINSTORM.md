Zoning Color Overlay — Future Feature Brainstorm
Logged: May 2026, post 18b-2d-2 ship.
Status: Future feature, not yet phase-numbered. Slots after Phase 14 (vector tiles) and Phase 18b-3 (D1 load) at minimum.
Owner: Cameron Rigby.
Core idea
Toggleable map layer that colors every parcel by zoning intent, normalized across jurisdictions. Two modes: Current (today's zoning) and Future (GP/FLU vision). User scans the entire Wasatch Front + Tooele Valley and sees commercial corridors, industrial plans, high-density residential targets in the same color language regardless of whether the underlying code is MU-TC in Herriman or Mixed Use Activity Center in Lehi.
Why it's valuable
Prospecting power = comparing the two layers:

RR-5 parcel sitting on Future Commercial Mixed Use tile → rezone-and-flip thesis encoded visually
Agricultural corridor along Future High Density Residential → annexation/rezone pressure
Open Space current sitting in Future Light Industrial → planning conflict, watch hearings

Scoring engine already encodes spread in numbers (zoning dimension → gap score). Overlay makes it eyeballable instead of requiring you to know which parcel ID to pull.
8-bucket taxonomy (proposed)

Low-density residential — pale yellow/cream — absorbs RR-5, A-20 residential, R-1-20+, Hillside/Rural, Agricultural Residential, Low Density Residential
Medium-density residential — yellow — absorbs R-1-10, R-1-7, Single Family Residential, Medium Density Residential
High-density residential — orange — absorbs R-2, R-3, R-M, High Density Residential, multi-family
Commercial — red — absorbs C-1, C-2, CG, CC, Commercial, Commercial Mixed Use, Retail
Mixed-use — pink/magenta — absorbs MU, MU-TC, Mixed Use, Mixed Use Towne Center, Activity Center, TOD
Industrial — purple — absorbs I-1, I-2, M-1, Light Industrial, Heavy Industrial, Business Park, Manufacturing
Open/agricultural/special — green — absorbs Open Space, Parks, Agricultural (non-residential A-20), Resort/Rec
Public/institutional — blue — absorbs Public, Institutional, Schools, Military, Quasi-Public, Utilities

8 is the sweet spot. Fewer loses signal. More creates color confusion.
Mapping table (the deliverable)
Lives in tooele-land-intel as CSV or JSON. Columns: jurisdiction, raw_zone_code, normalized_bucket. Example rows: Herriman/Hillside-Rural Residential/low_density_residential; Herriman/Mixed Use - Towne Center/mixed_use; Lehi/MU-AC/mixed_use. Roughly 200–400 rows across 13 jurisdictions. Built once, audited once, then it just works. New jurisdictions plug in by adding rows.
Construction: Claude reads ordinance/GP doc, proposes draft mapping per jurisdiction, Cam reviews edge cases (mixed-use vs commercial is the most common). ~1 hour Cam-time per jurisdiction.
UX recommendation: map layer toggle, not a tab

Value lives in juxtaposition with gap-score + listings; tabs fragment attention
Slots into existing layer toggle pattern (gap-score, STIP, future listings)
Sub-toggle: Current / Future (single radio in v1; Both split-screen deferred to v2)
Collapsible legend panel with 8 swatches, same legend serves both modes
Hover/click shows raw zone code in addition to bucket: Bucket Commercial · Raw CG-2 (Herriman)

Phase positioning
Must land AFTER:

Phase 18b-3 (D1 load of GP/FLU data — currently sitting in CSVs in tooele-land-intel, app can't see it)
Phase 14 (PMTiles vector tiles — 947K parcels can't render colored individually without tile pyramid)

Realistic slot: post-18b-3, post-14, possibly Phase 20+. Number TBD when ledger pass happens.
Open questions

Parcels with missing Future zoning data (Erda excluded as regional_map_only, others may lack published GP/FLU): show as grey "no data" (simpler) or fall back to Current at lower opacity (richer)? Recommend grey.
Parcels where Current and Future are identical: same color both modes, obvious. Worth a QA pass to confirm buckets don't accidentally diverge for parcels with no intent change.
Store bucket in D1 or compute at request time? Recommend store as zoning_bucket_current and zoning_bucket_future columns alongside raw codes. Once-computed, always-fast.
Handling flu_source_jurisdiction parcels (South Jordan parcels carrying Herriman's FLU intent): default show Herriman's intended bucket in Future mode. v2 optional filter — show only parcels where source jurisdiction equals parcel's actual city.

Build order when activated

Lock 8-bucket taxonomy + jurisdiction mapping tables (~30 min chat + ~1 hr/jurisdiction Cam review)
Add zoning_bucket_current + zoning_bucket_future columns to D1 parcel_records schema via migration. Backfill from mapping table.
Bake bucket columns into PMTiles vector tile pipeline (Phase 14 dependency)
Frontend layer toggle + legend via Lovable handoff with CC scaffold

Effort post-prerequisites: ~3–5 hr CC + ~1 hr Lovable + ~30 min taxonomy review. Cost negligible.
What Lovable does and does not do

Lovable yes: UI scaffolding for layer toggle, collapsible legend panel, Current/Future radio. Pure presentation.
Lovable no: normalization mapping table, data layer logic, setFeatureState wiring. Domain decisions that need version-controlled in repo.

Handoff pattern: CC ships mapping table + D1 schema + API endpoint, then hand Lovable a working /zoning route stub for toggle/legend polish.
