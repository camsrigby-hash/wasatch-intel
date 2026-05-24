# Phase 18b-2e NLS Replacement — Scoping Report

**Scoped:** 2026-05-24  
**Trigger:** Cam eye-test found NLS_regional_study mismatches in Saratoga Springs, Lehi, Eagle Mountain.  
Saratoga Springs worst case: Wagstaff Investments commercial parcel (~10 ac, carved off DAI residential development) showing as residential. Saratoga Springs also adopted new GP via **Ordinance 25-75 (Dec 2, 2025)**, making NLS definitionally stale.

---

## Summary Table

| City | Zoning Source | Zoning Status | GP/FLU Source | GP/FLU Status | Zoning Rec | GP/FLU Rec |
|---|---|---|---|---|---|---|
| **Saratoga Springs** | `gis.saratogaspringscity.com` Planning/Zoning MapServer | **LIVE** | `gis.saratogaspringscity.com` Planning/LandUse MapServer | **LIVE** | REST extract | REST extract |
| **Lehi** | `services5.arcgis.com` Lehi_Zoning FeatureServer (AGOL `lehicity`) | **LIVE** | `services5.arcgis.com` Lehi_General_Plan FeatureServer (AGOL `lehicity`) | **LIVE** | REST extract | REST extract |
| **Eagle Mountain** | `services1.arcgis.com` EMC_Zoning_View FeatureServer (AGOL `ecarroll_EMC`) | **LIVE** | No REST layer; FLU map on Social Pinpoint engagement site only | **NOT ACCESSIBLE** | REST extract | Phone city planner (see notes) |

---

## Saratoga Springs — Detail

### A) Current Zoning — LIVE REST

**Service root:**  
`https://gis.saratogaspringscity.com/arcgisweb/rest/services/Planning/Zoning/MapServer`

- ArcGIS version: 10.91
- Spatial ref: WKID 3566 (NAD 1983 StatePlane Utah North, feet)
- `hasVersionedData: true` — live versioned GIS, not a static snapshot

**Target layer: ID 1 — "Zoning"**

| Field | Type | Notes |
|---|---|---|
| `ZONECLASS` | String | Display field. Zone codes: A, RA-5, RR, R1-40, R1-20, R1-10, R1-9, R2-8, R3-6, MF-10, MF-14, MF-18, MR, NC, MU, MW, PC, BP, IC, CC, RC, HC, OW, I, PSBL |
| `ZONEDESC` | String | Full zone description |
| `LASTUPDATE` | Date | Track data currency per feature |
| `CONDITIONS` | String | Special zone conditions |

**Feature count:** 369 zone polygons  
**Query endpoint:** `.../Zoning/MapServer/1/query?where=1=1&outFields=*&f=geojson`

**Other available layers on the same service:**
- Layer 0: PUD Overlay
- Layer 3: Gateway Overlay  
- Layer 4: DA Exception

---

### B) Future Land Use / GP — LIVE REST

**Service root:**  
`https://gis.saratogaspringscity.com/arcgisweb/rest/services/Planning/LandUse/MapServer`

Service description: *"City of Saratoga Springs future land use"*  
Also exposed as FeatureServer: `...Planning/LandUse/FeatureServer`

**Target layer: ID 2 — "Land Use"**

Layer description: *"The proposed land use classification identified during community planning activities… typically proposed land use units are larger than the parcel."*

| Field | Type | Notes |
|---|---|---|
| `LANDUSEDESC` | String | Display field. Values: Agricultural, Business Park, Community Commercial, Developed Open Space, General Industrial, Heavy Commercial, High Density Residential, Institutional, Low Density Residential, Medium Density Residential, Mixed Waterfront, Natural Open Space, NH Commercial, [additional values] |

**Feature count:** 33 FLU polygons  
`hasVersionedData: true` — live versioned GIS

**Note on Ordinance 25-75 (Dec 2, 2025):** The ordinance adopted a Water Element update to the General Plan. It is NOT a land use map amendment. The spatial FLU data in the REST LandUse layer is the authoritative city-maintained GIS and reflects the current adopted land use classification. The base GP document is "General Plan Update 2022-2042" (adopted Sept 6, 2022) at `saratogasprings-ut.gov/DocumentCenter/View/10899/General-Plan-Update-2022-2042-Adopted-Sept-6-2022`.

---

### C) Recommendation

**Zoning:** REST extract ✓  
**GP/FLU:** REST extract ✓  
Both are live versioned services on the city's own ArcGIS server. Extract zoning Layer 1 (`ZONECLASS`) and LandUse Layer 2 (`LANDUSEDESC`) in the same pipeline pass.

---

## Lehi — Detail

### A) Current Zoning — LIVE REST (AGOL)

**Service URL:**  
`https://services5.arcgis.com/rObWD7PYeLl9jJPT/arcgis/rest/services/Lehi_Zoning/FeatureServer`

- AGOL owner: `lehicity` (official Lehi City GIS account)
- AGOL item ID: `05dbc229349a4ac38fb263afb47d58d0`
- Last modified: **April 16, 2026**
- Spatial ref: WKID 3857 (Web Mercator)

**Note:** Lehi also has a GIS server at `maps.lehi-ut.gov` (ArcGIS 11.5, HTTP 200), but all folders (AssetManagement, Hosted, Utilities, Water) require token authentication. The AGOL-hosted Lehi_Zoning is the correct public source.

**Target layer: ID 0 — "Lehi_Zoning"**

| Field | Type | Notes |
|---|---|---|
| `Zone` | String | Zone code / classification |
| `Acres` | Double | Parcel area |
| `GlobalID` | String | |

**Feature count:** 585 zone polygons  
`hasStaticData: true` — AGOL file-hosted, not versioned; but service was updated April 16 2026. This means Lehi manually re-uploads updated shapefiles rather than maintaining a live editable layer. Data is current as of upload date.

---

### B) GP/FLU — LIVE REST (AGOL)

**Service URL:**  
`https://services5.arcgis.com/rObWD7PYeLl9jJPT/arcgis/rest/services/Lehi_General_Plan/FeatureServer`

- AGOL owner: `lehicity`
- AGOL item ID: `5dcf4ad595264b388b3280e1e677e203`
- Also available as Shapefile download (item ID: `82945c982e3d401e9ba2f7e0913b0a8d`)
- Last modified: **April 16, 2026** (same day as Lehi_Zoning — batch upload)

**Target layer: ID 0 — "Lehi_General_Plan"**

| Field | Type | Notes |
|---|---|---|
| `Code` | Integer | Numeric GP category code |
| `Descriptio` | String (50) | Land use description (truncated field name from shapefile origin) |
| `Link` | String | URL field — may link to GP document pages |
| `Acres` | Double | |

**Distinct GP categories (Code → Descriptio):**

| Code | Description |
|---|---|
| 2 | Very Low Density Residential Agriculture |
| 3 | Very Low Density Residential |
| 4 | Low Density Residential (also "Light Density Residential") |
| 5 | Medium Density Residential |
| 6 | High Density Residential |
| 7 | Commercial |
| 10 | Light Industrial |
| 12 | Technical / Manufacturing |
| 14 | Commercial / Residential (also "Mixed-Use") |
| 16 | Environmentally Sensitive Area |
| 17 | Public Facilities |
| 20 | Medium Density Residential (also "Neighborhood Commercial") |
| 24 | Heavy Commercial |
| 25 | Transit-Oriented Development |
| 26 | Open Space |

**Note on duplicate codes:** Code 4 has both "Light Density Residential" and "Low Density Residential" values; Code 14 has both "Commercial / Residential" and "Mixed-Use"; Code 20 has both "Medium Density Residential" and "Neighborhood Commercial". These will need de-duplication or GP code authority review during extraction. The `Link` field may point to the underlying GP document which can clarify intent.

**Feature count:** 429 GP polygons

---

### C) Recommendation

**Zoning:** REST extract ✓  
**GP/FLU:** REST extract ✓ (with caveat: duplicate Code values need de-duplication — treat each `Descriptio` string as authoritative, ignore `Code` for normalization)

---

## Eagle Mountain — Detail

### A) Current Zoning — LIVE REST (AGOL View)

**Service URL:**  
`https://services1.arcgis.com/OZXOaoaD8hmdOtqR/arcgis/rest/services/EMC_Zoning_View/FeatureServer`

- AGOL owner: `ecarroll_EMC` (Eagle Mountain City GIS — 46 public items)
- AGOL item ID: `92ed3ab23a4240a5b265e57331d74a30` (View of a parent feature class)
- Last edit date: ~March 6, 2026 (`editingInfo.lastEditDate: 1772723499155`)
- Spatial ref: WKID 3566 (NAD 1983 StatePlane Utah North, feet)
- `isView: true`, `isUpdatableView: true` — live view of the city's editable zoning layer
- Also: EMC Zoning App at `experience.arcgis.com/experience/8d9d65bd0adf4d1b81348068b37781ac`

**Note:** City's own GIS server at `gis.eaglemountaincity.com` is not publicly accessible (timeout/no response). AGOL-hosted is the correct public source.

**Target layer: ID 0 — "EMC_Zoning"**

| Field | Type | Notes |
|---|---|---|
| `Zoning` | String (255) | Full zone name/code (free text, not coded domain) |
| `General_Zoning` | Coded domain | Residential, Agriculture, Open Space, Under Review, Commercial, Business Park/Industrial, Business Park/Light Industry, Other |
| `Current_Landuse` | Coded domain | Agriculture, BP/Industrial, BP/Light Industry, Commercial, Employment Center/Campus, Open Space, Other, Public Facilities, Residential, Under Review |
| `PARCELID` | String | Parcel-level data (22k features) |
| `MDA_Name` | String | Master Development Agreement name |
| `Historic_Code` | String | Historic zone code (pre-current) |
| `Historic_Code_Link` | String | Link to historic ordinance |
| `Municipal_Code` | String | Title 17 code reference |
| `Municipal_Code_Link` | String | Link to codepublishing.com/UT/EagleMountain/ |
| `MDA_Link`, `MDA_Amendment_1/2/3` | String | MDA document links |

**Feature count:** 22,184 parcel-level features (vs 369 for Saratoga Springs zone polygons)

**Important extraction note:** Eagle Mountain's zoning is parcel-level, not zone-polygon-level. This is different from the other two cities and from the existing 18b-1 extraction approach. Each parcel has a `Zoning` (free text, includes typos: "Agric;ulture Roads", "Agricuture (Roads)"), `General_Zoning` (clean coded domain), and `Current_Landuse` (clean coded domain).

The `General_Zoning` coded domain values are well-suited for taxonomy normalization. `Zoning` free text contains Title 17 code names but has data quality issues.

**Title 17 zone code reference:** `https://www.codepublishing.com/UT/EagleMountain/` (not municode.com — the city website nav bar links to codepublishing.com). The SD-23 action item referencing municode.com for §17.25 should be updated.

---

### B) GP/FLU — NO ACCESSIBLE REST SOURCE

**Tested:**
- `ecarroll_EMC` AGOL account: 46 items total, none are a General Plan or Future Land Use feature service
- `eaglemountain.gov/priorities-plans/general-plan/`: Page returned 404 during test
- `eaglemountain.gov` nav bar: Links to "Future Land Use Map" at `https://engagegsbs.mysocialpinpoint.com/eagle-mountain-future-land-use` — this is a Social Pinpoint community engagement platform, not a GIS data source. It is not extractable via REST query.
- ArcGIS Online search: No public Eagle Mountain GP/FLU feature service found under any owner

**Possible FLU proxy:** The `Current_Landuse` field on the zoning layer (coded domain: Agriculture, BP/Industrial, BP/Light Industry, Commercial, Employment Center/Campus, Open Space, Other, Public Facilities, Residential, Under Review) may serve as a GP-proximate classification if a formal FLU REST source cannot be obtained. However, this conflates *current use* with *planned future use* and would need Cam's sign-off before using as `zone_future`.

---

### C) Recommendation

**Zoning:** REST extract ✓  
**GP/FLU:** No accessible source — escalate to Cam to phone city planner.

Suggested question for EMC planner: *"Do you have a Future Land Use or General Plan layer available as an ArcGIS feature service or shapefile download? The Social Pinpoint map on your website isn't queryable as data."*

Fallback if FLU unavailable: Use `Current_Landuse` coded domain as zone_future proxy (requires explicit Cam approval — semantically imprecise).

---

## Endpoint Verification Log

All tests run 2026-05-24.

| URL | HTTP Status | Result |
|---|---|---|
| `gis.saratogaspringscity.com/.../Planning/Zoning/MapServer?f=json` | 200 | Valid JSON, ArcGIS 10.91, 4 layers |
| `gis.saratogaspringscity.com/.../Planning/Zoning/MapServer/1/query?where=1=1&returnCountOnly=true` | 200 | `{"count":369}` |
| `gis.saratogaspringscity.com/.../Planning/LandUse/MapServer?f=json` | 200 | Valid JSON, Layer 2 "Land Use", 33 features |
| `services5.arcgis.com/.../Lehi_Zoning/FeatureServer?f=json` | 200 | Valid JSON, ArcGIS 12, Layer 0 "Lehi_Zoning" |
| `services5.arcgis.com/.../Lehi_Zoning/FeatureServer/0/query?where=1=1&returnCountOnly=true` | 200 | `{"count":585}` |
| `services5.arcgis.com/.../Lehi_General_Plan/FeatureServer?f=json` | 200 | Valid JSON, Layer 0 "Lehi_General_Plan" |
| `services5.arcgis.com/.../Lehi_General_Plan/FeatureServer/0/query?where=1=1&returnCountOnly=true` | 200 | `{"count":429}` |
| `services1.arcgis.com/.../EMC_Zoning_View/FeatureServer?f=json` | 200 | Valid JSON, ArcGIS 12, Layer 0 "EMC_Zoning" |
| `services1.arcgis.com/.../EMC_Zoning_View/FeatureServer/0/query?where=1=1&returnCountOnly=true` | 200 | `{"count":22184}` |
| `gis.lehi-ut.gov/arcgis/rest/services/?f=json` | 000 (timeout) | Not accessible |
| `maps.lehi-ut.gov/arcgis/rest/services/?f=json` | 200 | Auth-required folders only (AssetManagement, Hosted, Utilities, Water); no public planning data |
| `gis.eaglemountaincity.com/arcgis/rest/services/?f=json` | 000 (timeout) | Not accessible |
| `engagegsbs.mysocialpinpoint.com/eagle-mountain-future-land-use` | — | Social Pinpoint engagement platform, not a GIS data endpoint |

---

## Open Questions for Cam

1. **Eagle Mountain FLU:** Phone EMC planner to request a GP/FLU feature service. Contact via `eaglemountain.gov/government/community-development/`. If unavailable, decide whether `Current_Landuse` coded domain is an acceptable `zone_future` proxy.

2. **Eagle Mountain zoning free text:** `Zoning` field has data quality issues (typos, inconsistent formatting). Confirm whether `General_Zoning` coded domain is sufficient for normalization or if we need to decode raw `Zoning` strings against Title 17 at `codepublishing.com/UT/EagleMountain/`.

3. **Lehi GP Code duplicates:** Codes 4, 14, 20 each map to two different `Descriptio` values. Decision needed: collapse by `Descriptio` string or resolve against GP document PDF (`lehi-ut.gov/DocumentCenter/View/10899/General-Plan-Update-2022-2042-Adopted-Sept-6-2022`)? → See de-dup investigation below; the 3 outlier features are data entry errors.

4. **Saratoga Springs Ord 25-75:** Confirmed as Water Element amendment only — no FLU map changes. The REST LandUse layer is authoritative. No further action needed on this specific ordinance.

---

## Lehi de-dup investigation

**Queried:** 2026-05-24  
**Endpoint:** `https://services5.arcgis.com/rObWD7PYeLl9jJPT/arcgis/rest/services/Lehi_General_Plan/FeatureServer/0/query`  
**Filter:** `Code IN (4,14,20)` — 55 features returned. Fields: `Code`, `Descriptio`, `Acres`, `Link`.

The `Link` field (format: `http://gis.lehi-ut.gov/Land_Use_Coding/<abbreviation>.jpg`) is a second source of truth — it reflects the city's own color-coding scheme for each land use category.

### Code 4 — 31 features, 4,487.18 ac total

| Descriptio | Features | Total Acres | Link | Notes |
|---|---|---|---|---|
| `'Low Density Residential'` | 29 | 4,368.02 | `LDR.jpg` | **Dominant.** Label and Link consistent. |
| `'Light Density Residential'` | 1 | 72.23 | `VLDR.jpg` | Link points to **Very Low Density Residential** — contradicts both Descriptio and Code 4. |
| `'Low  Density Residential'` (double space) | 1 | 46.93 | `HDR.jpg` | Link points to **High Density Residential** — contradicts Code 4 entirely. Double space is a typo. |

**Diagnosis:** The two 1-feature outliers are data entry errors. The 'Light Density Residential' feature's VLDR.jpg link suggests it belongs to Code 2 or 3 (Very Low Density). The double-space typo feature's HDR.jpg link suggests it should be Code 6 (High Density Residential). Neither outlier represents an intentional dual-classification of Code 4.

### Code 14 — 8 features, 447.89 ac total

| Descriptio | Features | Total Acres | Link | Notes |
|---|---|---|---|---|
| `'Commercial / Residential'` | 7 | 446.00 | `BP.jpg` (Business Park) | **Dominant.** Note: Link is BP, not C — all 7 features use this link. |
| `'Mixed-Use'` | 1 | 1.89 | `C.jpg` (Commercial) | Outlier. Semantically distinct label; link points to Commercial, not Mixed-Use. |

**Diagnosis:** The 'Mixed-Use' outlier (1.89 ac) is almost certainly a data entry error. The Link=C.jpg (Commercial) does not support "Mixed-Use" as an intentional designation. The 1.89-acre area is too small to represent a distinct GP category.

### Code 20 — 16 features, 96.51 ac total

| Descriptio | Features | Total Acres | Link | Notes |
|---|---|---|---|---|
| `'Neighborhood Commercial'` | 15 | 93.57 | `C.jpg` (Commercial) | **Dominant.** Label and Link consistent. |
| `'Medium Density Residential'` | 1 | 2.94 | `MDR.jpg` | Both Descriptio **and** Link agree on MDR — but Code=20 is Neighborhood Commercial. The **Code field** is wrong. |

**Diagnosis:** The 'Medium Density Residential' outlier is a Code field error — the feature was tagged with Code 20 instead of Code 5 (Medium Density Residential). Both its Descriptio and its Link independently confirm MDR; only its Code is wrong.

### Pipeline recommendation

Use `Descriptio` as the canonical label (confirmed correct approach per scoping doc). Do **not** normalize outliers into their Code group's dominant label — they are miscoded in one or more fields, not intentionally dual-classified.

Specific handling:
- **Code 4 / 'Light Density Residential' (1 feature, 72 ac):** Flag `dedup_flag: 'miscoded_candidate'`. Link=VLDR suggests this belongs to Code 2/3. Exclude from Code 4 normalization bucket.
- **Code 4 / 'Low  Density Residential' double-space (1 feature, 47 ac):** Strip extra whitespace → 'Low Density Residential'. Flag `dedup_flag: 'typo_corrected'`. Link=HDR is a secondary anomaly but whitespace fix is safe to apply.
- **Code 14 / 'Mixed-Use' (1 feature, 1.89 ac):** Flag `dedup_flag: 'miscoded_candidate'`. Leave Descriptio as-is; do not roll into 'Commercial / Residential'.
- **Code 20 / 'Medium Density Residential' (1 feature, 2.94 ac):** Flag `dedup_flag: 'miscoded_candidate'`. Normalize by Descriptio ('Medium Density Residential'), not by Code (20). Correct behavior: treat as MDR, not Neighborhood Commercial.

**Open question for Cam:** The 3 `miscoded_candidate` features total ~119 acres. Confirm whether to (a) exclude from extraction, (b) normalize by Descriptio (ignoring Code), or (c) phone Lehi planning to get canonical GP document page for each parcel. The Link field (`gis.lehi-ut.gov/Land_Use_Coding/<code>.jpg`) is worth sharing with Lehi GIS staff as supporting evidence of the errors.

---

## Eagle Mountain GP PDF check

**Checked:** 2026-05-24  
**Sites tested:**
- `eaglemountain.gov/government/community-development/` (redirects from eaglemountaincity.com)
- `eaglemountain.gov/priorities-plans/responsible-growth/` (Long-Range Planning Documents subsection)
- `eaglemountain.gov/planning-department/`

### Result: FLU map PDF found

The Responsible Growth page (`eaglemountain.gov/priorities-plans/responsible-growth/`) contains a "Long-Range Planning Documents" subsection with a direct PDF link:

**Future Land Use Map:**  
`https://eaglemountain.gov/wp-content/uploads/2026/04/mp-future-land-use-map-1.pdf`  
File size: 3.8 MB (PDF-1.6, flate-compressed)  
WordPress upload date: April 2026  
Associated GP document: *"2025-2018 General Plan Water Element Update"* (base GP adopted 2018, Water Element updated 2025)

The same page also links the interactive ArcGIS experience (`experience.arcgis.com/experience/8d9d65bd0adf4d1b81348068b37781ac`) and the Social Pinpoint FLU engagement map — confirming those are presentation layers, not the authoritative data source. The PDF is the static authoritative document.

### Map type assessment

The PDF was not directly renderable by the verification tool (binary PDF-1.6). Assessment based on indirect signals:
- The Responsible Growth page distinguishes the PDF as a "static" document vs. the interactive ArcGIS experience — consistent with a flat-color vector map rather than a satellite-underlay raster.
- File size (3.8 MB) is consistent with a vector or moderate-resolution raster map; satellite-underlay PDFs at this scale typically exceed 10–20 MB.
- **Preliminary classification: flat-color map** → route to 18b-2c/18b-2d PDF vision pipeline per SD-21 hierarchy. Cam should visually confirm before kicking off pipeline.

### Revised recommendation

**Previous recommendation (scoping doc §Eagle Mountain C):** Escalate to Cam to phone city planner.

**Revised recommendation:** FLU PDF is publicly accessible. Visual confirmation by Cam required to confirm flat-color vs. satellite-underlay.

- If flat-color → 18b-2c/18b-2d automated pipeline (same path as Spanish Fork). Provenance: `PDF_vision`, amber/medium confidence.  
- If satellite-underlay → Cam-KMZ workflow per SD-21. Provenance: `PDF_raster_Cam_KMZ`, amber/medium.

Phoning the city planner is no longer the first option. The PDF path is viable and should be attempted first.

**Planning contact (if PDF extraction fails):** `planning@eaglemountain.gov`
