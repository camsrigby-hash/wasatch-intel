# Phase 18b-2c Pre-Screen: Deep PDF Enumeration for Future Land-Use Layers

**Author:** Manus AI  
**Date:** 2026-05-15  
**Scope:** Grantsville, Bluffdale, Draper, Herriman, and Spanish Fork

This report enumerates and classifies publicly available planning, general-plan, zoning, annexation, and overlay-related PDFs for five Utah cities. The expanded Phase 18b scope treats **future land-use maps**, **annexation maps**, and **overlay or master-planned-community maps** as separate forward-looking signals. Current zoning maps are retained as flags only, because they are not the intended extraction target for Phase 18b-2c.

> **Classification rule used here:** a PDF may receive multiple type labels when it contains more than one relevant map class. The `Page` field lists map page numbers when the source is multi-page; for one-page map PDFs, `1` is shown. Page numbers are based on direct opening, PDF metadata, text extraction, and visual inspection of rendered map pages.

| City | Total PDFs found | FLU_MAP | ANNEXATION_MAP | MPC_OVERLAY_MAP | CURRENT_ZONING_MAP | TRANSPORTATION_PLAN | NARRATIVE_CHAPTER | OTHER | Sectional GP? | Fallback flag |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
| Grantsville | 8 | 3 | 1 | 0 | 3 | 0 | 1 | 0 | **Y** — City Center, Deseret Peak, Flux | Pipeline must aggregate sectional GP maps. |
| Bluffdale | 11 | 1 | 1 | 0 | 0 | 1 | 6 | 3 | N | Growth-management PDF is usable, but general-plan extraction should be checked page-by-page. |
| Draper | 3 | 1 | 0 | 2 | 0 | 0 | 1 | 0 | N | Main current land-use and zoning surfaces are interactive ArcGIS, not exposed as simple PDFs on the main pages. |
| Herriman | 13 | 3 | 3 | 1 | 0 | 3 | 3 | 3 | N | Strong FLU coverage; current zoning is interactive ArcGIS rather than PDF. |
| Spanish Fork | 13 | 7 | 1 | 1 | 5 | 0 | 2 | 0 | N | Strong current and historical FLU PDFs; duplicate 2026 draft should be deduplicated before extraction. |

## Recommended extraction priorities

The highest-value extraction order is **Grantsville sectional FLU plus annexation first**, then **Herriman 2030 Land Use / 2025 amendment / annexation layers**, then **Spanish Fork current General Plan Map plus 2026 Land Use Element map**, followed by **Bluffdale Growth Management** and **Draper General Plan / station-area plans**. Grantsville requires the only clear pipeline modification because its future land-use map is published in multiple geographic sections rather than a single citywide sheet. Draper is the city most likely to require a non-PDF fallback for current land-use and zoning because the public planning page points to ArcGIS applications for those current layers, while the available PDFs are plan documents and station-area overlays.

## Grantsville summary

Grantsville’s public zoning map page listed eight relevant PDF map documents, including three sectional **Future Land Use** maps, a **Proposed Future Annexation Expansion** map, three current zoning maps, and one water element map.[1] The Planning & Zoning page was not accessible during browser verification, but the official document-center map links were accessible and directly verified by opening and downloading the PDFs.[2]

| Metric | Finding |
|---|---|
| Total PDFs found | 8 |
| Count by classification type | FLU_MAP: 3; ANNEXATION_MAP: 1; CURRENT_ZONING_MAP: 3; NARRATIVE_CHAPTER: 1 |
| Sectional GP? | **Yes.** Future land-use is split into City Center, Deseret Peak, and Flux sections. |
| Recommended 18b-2c approach | Extract the three FLU section PDFs first, mosaic or tag by section, then extract the Proposed Future Annexation Expansion Map as a separate forward-looking layer. Current zoning maps should be retained only as QA/reference because current zoning was already targeted in 18b-1. |
| Estimated polygon count expected | Moderate. Expect roughly **150–300** FLU polygons across the three sectional sheets plus **10–30** annexation/future-boundary polygons. |

| City | PDF Title | URL | Type | Page | Scale | Streets visible | Parcel lines | Adoption year | Notes |
|---|---|---|---|---|---|---|---|---|---|
| Grantsville | Future Land Use Map — City Center | https://cms9files.revize.com/grantsvilleut/Document_Center/Department/Community%20%26%20Economic%20Development/Zoning%20Map/FUTURE_LANDUSE_MAP_JAN2020_CITY_CENTER.pdf | FLU_MAP | 1 | PARCEL-DETAIL | 100+ | Some base subdivisions visible; parcel lines not consistently visible | 2020 | One-page sectional FLU map; good extraction target. |
| Grantsville | Future Land Use Map — Deseret Peak | https://cms9files.revize.com/grantsvilleut/Document_Center/Department/Community%20%26%20Economic%20Development/Zoning%20Map/FUTURE_LANDUSE_MAP_JAN2020_DESERET_PEAK.pdf | FLU_MAP | 1 | PARCEL-DETAIL | 20–50 | Limited | 2020 | Sectional FLU map; aggregate with City Center and Flux. |
| Grantsville | Future Land Use Map — Flux | https://cms9files.revize.com/grantsvilleut/Document_Center/Department/Community%20%26%20Economic%20Development/Zoning%20Map/FUTURE_LANDUSE_MAP_JAN2020_FLUX.pdf | FLU_MAP | 1 | PARCEL-DETAIL | 20–50 | Limited | 2020 | Sectional FLU map covering the Flux area. |
| Grantsville | Proposed Future Annexation Expansion Map | https://cms9files.revize.com/grantsvilleut/Document_Center/Department/Community%20%26%20Economic%20Development/Zoning%20Map/Proposed_Future_Annexation_Expansion_Map.pdf | ANNEXATION_MAP | 1 | REGIONAL-OVERVIEW | 20–50 | No | Not visible | Forward-looking annexation signal; extract as separate boundary layer. |
| Grantsville | Zoning Map — Central Area | https://cms9files.revize.com/grantsvilleut/Document_Center/Department/Community%20%26%20Economic%20Development/Zoning%20Map/Zoning_Map_Central_Area_June_2025_1.pdf | CURRENT_ZONING_MAP | 1 | PARCEL-DETAIL | 100+ | Some | 2025 | Current zoning only; flag for reference, not primary future extraction. |
| Grantsville | Zoning Map — Deseret Peak Area | https://cms9files.revize.com/grantsvilleut/Document_Center/Department/Community%20%26%20Economic%20Development/Zoning%20Map/Zoning_Map_Deseret_Peak_Area_June_2025_1.pdf | CURRENT_ZONING_MAP | 1 | PARCEL-DETAIL | 20–50 | Limited | 2025 | Current zoning only. |
| Grantsville | Zoning Map — Flux Area | https://cms9files.revize.com/grantsvilleut/Document_Center/Department/Community%20%26%20Economic%20Development/Zoning%20Map/Zoning_Map_Flux_Area_June_2025_1.pdf | CURRENT_ZONING_MAP | 1 | PARCEL-DETAIL | 20–50 | Limited | 2025 | Current zoning only. |
| Grantsville | Grantsville Water Element | https://cms9files.revize.com/grantsvilleut/Document_Center/Department/Community%20%26%20Economic%20Development/Zoning%20Map/Grantsville-Water-Element.pdf | NARRATIVE_CHAPTER | Multiple | REGIONAL-OVERVIEW | Varies | No | Not visible | Infrastructure narrative; not a direct FLU extraction source. |

## Bluffdale summary

Bluffdale’s **Master Plans** page lists the General Plan, Transportation Plan, Floodplain Management Plan, stormwater plans, moderate-income housing element, and impact-fee/facility plan PDFs.[3] The city **Maps** page lists planning reference maps including truck routes, canals, community design/aesthetics, and growth management.[4]

| Metric | Finding |
|---|---|
| Total PDFs found | 11 |
| Count by classification type | FLU_MAP: 1; ANNEXATION_MAP: 1; TRANSPORTATION_PLAN: 1; NARRATIVE_CHAPTER: 6; OTHER: 3 |
| Sectional GP? | No. |
| Recommended 18b-2c approach | Extract `Maps-Growth-Management-PDF` first because it directly signals growth/annexation direction. Inspect the General Plan for any embedded land-use or annexation map pages and use only those pages if vector or raster quality is sufficient. |
| Estimated polygon count expected | Low to moderate. Expect roughly **40–100** useful polygons if the growth-management/general-plan maps are clean; otherwise use as coarse annexation/growth boundary only. |

| City | PDF Title | URL | Type | Page | Scale | Streets visible | Parcel lines | Adoption year | Notes |
|---|---|---|---|---|---|---|---|---|---|
| Bluffdale | Bluffdale General Plan | https://www.bluffdale.gov/DocumentCenter/View/5049/Bluffdale-General-Plan | FLU_MAP; NARRATIVE_CHAPTER | Embedded map pages | PARCEL-DETAIL to REGIONAL-OVERVIEW | 50–100+ on map pages | Limited | 2020s | Keep for page-level extraction; likely contains land-use/growth policy maps plus narrative chapters. |
| Bluffdale | Maps — Growth Management | https://www.bluffdale.gov/DocumentCenter/View/1030/Maps-Growth-Management-PDF | ANNEXATION_MAP; FLU_MAP | 1 | REGIONAL-OVERVIEW | 20–50 | No | Not visible | Best compact source for growth/annexation direction; likely coarse boundary extraction. |
| Bluffdale | Bluffdale Transportation Plan | https://www.bluffdale.gov/DocumentCenter/View/3650/Bluffdale-Transportation-Plan-PDF | TRANSPORTATION_PLAN | Multiple | PARCEL-DETAIL to REGIONAL-OVERVIEW | 50–100+ | Limited | Not visible | Transportation plan, not a future land-use layer. |
| Bluffdale | Truck Routes Map — February 2022 | https://www.bluffdale.gov/DocumentCenter/View/1031/Bluffdale-Truck-Routes-Map-February-2022 | TRANSPORTATION_PLAN | 1 | PARCEL-DETAIL | 50–100 | No | 2022 | Reference transportation layer only. |
| Bluffdale | Maps — Canals | https://www.bluffdale.gov/DocumentCenter/View/1028/Maps-Canals-PDF | OTHER | 1 | PARCEL-DETAIL | 50–100 | No | Not visible | Utility/canal reference, not future land use. |
| Bluffdale | Maps — Community Design/Aesthetics | https://www.bluffdale.gov/DocumentCenter/View/1029/Maps-Comm-Design-Aesthetics-PDF | MPC_OVERLAY_MAP; OTHER | 1 | REGIONAL-OVERVIEW | 20–50 | No | Not visible | Potential community-design overlay signal; use only if downstream overlay tagging is desired. |
| Bluffdale | Floodplain Management Plan 2018 | https://www.bluffdale.gov/DocumentCenter/View/3676/Floodplain-Management-Plan-2018-PDF | OTHER; NARRATIVE_CHAPTER | Multiple | REGIONAL-OVERVIEW | Varies | No | 2018 | Environmental constraint/reference; not a primary future layer. |
| Bluffdale | Storm Water Master Plan Update 2019 | https://www.bluffdale.gov/DocumentCenter/View/3651/2019-Storm-Water-Master-Plan-Update-PDF | NARRATIVE_CHAPTER | Multiple | REGIONAL-OVERVIEW | Varies | No | 2019 | Infrastructure narrative. |
| Bluffdale | Stormwater Management Plan | https://www.bluffdale.gov/DocumentCenter/View/3652/Bluffdale-Stormwater-Management-Plan-PDF | NARRATIVE_CHAPTER | Multiple | REGIONAL-OVERVIEW | Varies | No | Not visible | Infrastructure narrative. |
| Bluffdale | Moderate Income Housing Element — Amended 2022 | https://www.bluffdale.gov/DocumentCenter/View/5048/2022-AMENDED-MIHE-of-the-General-Planpdf | NARRATIVE_CHAPTER | Multiple | Not map-focused | N/A | No | 2022 | Housing policy chapter, not polygon extraction. |
| Bluffdale | Impact Fee Facility Plan and Analysis — March 2024 | https://www.bluffdale.gov/DocumentCenter/View/6197/Bluffdale-Impact-Fee-Facility-Plan-and-Analysis-March-2024-PDF | NARRATIVE_CHAPTER | Multiple | Not map-focused | N/A | No | 2024 | Facility planning narrative; keep out of 18b-2c extraction. |

## Draper summary

Draper’s planning page identifies the official current **Land Use**, **Zoning Map**, and **Development Projects Map** as ArcGIS applications rather than simple PDFs, while the Master Plans page lists the city’s General Plan and multiple plan PDFs.[5] The verified PDFs include the 2019 General Plan file exposed through a 2025 URL, station-area plans, and the Town Center Station Area Plan.[6]

| Metric | Finding |
|---|---|
| Total PDFs found | 3 verified and downloaded during the time cap |
| Count by classification type | FLU_MAP: 1; MPC_OVERLAY_MAP: 2; NARRATIVE_CHAPTER: 1 |
| Sectional GP? | No. |
| Recommended 18b-2c approach | Attempt General Plan map-page extraction first. Treat station-area plan PDFs as overlay/entitlement-style layers and extract their plan boundaries only if map pages georeference cleanly. If a current FLU layer is needed, use the public ArcGIS land-use service rather than relying on the PDFs. |
| Estimated polygon count expected | Low to moderate from PDFs alone. Expect **30–80** future land-use polygons from the General Plan plus **5–20** station-area/overlay polygons. |

| City | PDF Title | URL | Type | Page | Scale | Streets visible | Parcel lines | Adoption year | Notes |
|---|---|---|---|---|---|---|---|---|---|
| Draper | Draper City General Plan | https://www.draperutah.gov/media/cvgk0fmy/draper-city-general-plan-v2025.pdf | FLU_MAP; NARRATIVE_CHAPTER | Embedded map pages | PARCEL-DETAIL to REGIONAL-OVERVIEW | 50–100+ on maps | Limited | 2019 / 2025 file path | Large plan PDF; extract only land-use/future-map pages, not full narrative. |
| Draper | Kimballs Lane / Crescent View / Vista Station Area Plans | https://www.draperutah.gov/media/ohzbvda2/draper-city-station-area-plans-2025.pdf | MPC_OVERLAY_MAP | Embedded station-area map pages | PARCEL-DETAIL | 50–100+ | Limited | 2025 | Strong overlay/station-area signal. Large PDF; use map-page selection. |
| Draper | Draper Town Center Station Area Plan | https://www.draperutah.gov/media/ajfbgevc/draper-town-center-station-area-plan-2025.pdf | MPC_OVERLAY_MAP | Embedded station-area map pages | PARCEL-DETAIL | 50–100+ | Limited | 2025 | The concept and implementation maps show rezoning/TOC-style overlay areas. |

## Herriman summary

Herriman’s **Master Plans & Capital Facility Plans** page lists the General Plan and 2030 Land Use Map directly, along with transportation, water, storm drain, parks/open-space, and impact-fee plans.[7] The GIS page separately confirms that the current Zoning Map is an interactive ArcGIS web map, while the General Plan Map link is the `LandUse203036x36.pdf` PDF.[8]

| Metric | Finding |
|---|---|
| Total PDFs found | 13 |
| Count by classification type | FLU_MAP: 3; ANNEXATION_MAP: 3; MPC_OVERLAY_MAP: 1; TRANSPORTATION_PLAN: 3; NARRATIVE_CHAPTER: 3; OTHER: 3 |
| Sectional GP? | No. |
| Recommended 18b-2c approach | Extract `LandUse203036x36.pdf` first. Then extract the Future Land Use Plan and any annexation/recent-annexation/future-annexation boundaries from the 2025 General Plan Amendment and Transportation IFFP/Parks map where the legends explicitly mention annexation areas. Use the right-of-way annexation PDF as a discrete annexation legal boundary only. |
| Estimated polygon count expected | Moderate. Expect **80–180** FLU polygons plus **5–25** annexation/future-annexation polygons and a small number of overlay/open-space polygons. |

| City | PDF Title | URL | Type | Page | Scale | Streets visible | Parcel lines | Adoption year | Notes |
|---|---|---|---|---|---|---|---|---|---|
| Herriman | Herriman City General Plan — adopted July 2022 | https://www.herriman.gov/uploads/files/5988/Herriman-General-Planadopted-July-2022web.pdf | FLU_MAP; NARRATIVE_CHAPTER | Embedded map pages | PARCEL-DETAIL to REGIONAL-OVERVIEW | 50–100+ | Limited | 2022 | Narrative plan plus future land-use map references. |
| Herriman | Land Use 2030 Map | https://www.herriman.gov/uploads/files/3174/LandUse203036x36.pdf | FLU_MAP | 1 | PARCEL-DETAIL | 100+ | Limited | 2030 horizon | Best direct FLU extraction source. |
| Herriman | Herriman City 2025 General Plan Amendment | https://www.herriman.org/uploads/files/1621/2025GPAmend.pdf | FLU_MAP; ANNEXATION_MAP; NARRATIVE_CHAPTER | Embedded map pages | PARCEL-DETAIL to REGIONAL-OVERVIEW | 50–100+ | Limited | 2025 | Includes Future Land Use Plan language and conformance with zoning map. |
| Herriman | Herriman City Right-of-Way Annexation 2019149 | https://entitiesandboundaries.utah.gov/wp-content/uploads/2020/01/Herriman-City-Right-of-Way-Annexation-2019149.pdf | ANNEXATION_MAP | Exhibit pages | PARCEL-DETAIL | 20–50 | Some legal/plat detail | 2020 filing | Legal annexation document; extract only if existing annexations are needed. |
| Herriman | March 2023 Transportation Impact Fee Facilities Plan | https://www.herriman.gov/uploads/files/5984/March-2023-Impact-Fee-Facilities-Plan.pdf | TRANSPORTATION_PLAN; ANNEXATION_MAP | Map pages | REGIONAL-OVERVIEW | 20–50 | No | 2023 | Text extraction shows Recent Annexation and Possible Future Annexation legend items. |
| Herriman | Parks Master Plan Map | https://www.herriman.gov/uploads/files/5992/ParksMPMap.pdf | MPC_OVERLAY_MAP; ANNEXATION_MAP; OTHER | 1 | REGIONAL-OVERVIEW | 20–50 | No | 2020 | Map legend includes proposed city/county open space and Proposed Annexation Area. |
| Herriman | Active Transportation Master Plan | https://herriman-website-files.s3.us-west-1.amazonaws.com/Misc+Files/Herriman+ATP+Report+2021_Final.pdf | TRANSPORTATION_PLAN | Multiple | PARCEL-DETAIL to REGIONAL-OVERVIEW | 100+ | Limited | 2021 | Transportation only. |
| Herriman | Bicycle Master Plan | https://www.herriman.gov/uploads/files/5995/Bike-Plan.pdf | TRANSPORTATION_PLAN | Multiple | PARCEL-DETAIL | 50–100+ | Limited | Not visible | Bicycle/trails plan. |
| Herriman | Transportation Master Plan — March 2023 | https://herriman-website-files.s3.us-west-1.amazonaws.com/Herriman+TMP+March+2023.pdf | TRANSPORTATION_PLAN | Multiple | PARCEL-DETAIL to REGIONAL-OVERVIEW | 100+ | Limited | 2023 | Transportation only. |
| Herriman | Herriman Hills Open Space Master Plan | https://www.herriman.gov/uploads/files/5991/HHOpenSpaceMP.pdf | OTHER; MPC_OVERLAY_MAP | Multiple | REGIONAL-OVERVIEW | 20–50 | No | Not visible | Open-space master plan; possible overlay constraint. |
| Herriman | Water Master Plan | https://www.herriman.gov/uploads/files/4820/Water-Master-Plan.pdf | NARRATIVE_CHAPTER; OTHER | Multiple | REGIONAL-OVERVIEW | Varies | No | 2020 | Infrastructure narrative; not primary future layer. |
| Herriman | Storm Drain Master Plan — adopted August 2020 | https://www.herriman.gov/uploads/files/5993/Herriman-Storm-Drain-Master-Plan-Adopted-August-2020.pdf | NARRATIVE_CHAPTER; OTHER | Multiple | REGIONAL-OVERVIEW | Varies | No | 2020 | Infrastructure plan. |
| Herriman | Roads Impact Fee Analysis — adopted March 17, 2023 | https://www.herriman.gov/uploads/files/5985/Herriman-City-Roads-Impact-Fee-Analysis-Adopted-03-17-23.pdf | NARRATIVE_CHAPTER | Multiple | Not map-focused | N/A | No | 2023 | Fee analysis narrative. |

## Spanish Fork summary

Spanish Fork’s **Land Use Element** page links the current Land Use Element Draft and current Land Use Map / Land Use Plan Map.[9] Its **Maps** page lists an interactive public map, historical General Plan PDFs from 1998 through 2021, and historical Zoning PDFs from 1999 through 2021.[10]

| Metric | Finding |
|---|---|
| Total PDFs found | 13 |
| Count by classification type | FLU_MAP: 7; ANNEXATION_MAP: 1; MPC_OVERLAY_MAP: 1; CURRENT_ZONING_MAP: 5; NARRATIVE_CHAPTER: 2 |
| Sectional GP? | No. |
| Recommended 18b-2c approach | Extract `GeneralPlan_Letter.pdf` first. Use the 2026 Land Use Element Draft to identify map page(s) and overlay terminology, but deduplicate the two downloaded draft URLs because they resolve to the same March 24, 2026 draft. Use historical GP maps only for temporal comparison, not primary current extraction. |
| Estimated polygon count expected | Moderate to high. Expect **100–250** FLU polygons from the current map, **1–10** annexation/legal-boundary polygons, and a small number of overlay-related polygons from the 2026 draft. |

| City | PDF Title | URL | Type | Page | Scale | Streets visible | Parcel lines | Adoption year | Notes |
|---|---|---|---|---|---|---|---|---|---|
| Spanish Fork | General Plan Map / Land Use Plan Map | https://www.spanishfork.gov/document_center/Public%20Works/Maps/Planning/GeneralPlan_Letter.pdf | FLU_MAP | 1 | PARCEL-DETAIL | 100+ | Limited | Current file, no visible adoption year | Best direct FLU extraction target; one-page map at approximately 1 in = 3,315 ft / similar citywide scale. |
| Spanish Fork | Land Use Element Draft | https://www.spanishfork.gov/docs/CommDev/Planning/Land_Use_Element_Draft.pdf | FLU_MAP; MPC_OVERLAY_MAP; NARRATIVE_CHAPTER | Map pages, especially Land Use Map section | PARCEL-DETAIL to REGIONAL-OVERVIEW | 50–100+ | Limited | 2026 draft | Contains Land Use Map section, annexation-policy-boundary discussion, overlay district definition, and growth-management policy. |
| Spanish Fork | Land Use Element Draft — 2026-03-24 | https://www.spanishfork.gov/docs/CommDev/Planning/Land_Use_Element_Draft_2026-03-24.pdf | FLU_MAP; MPC_OVERLAY_MAP; NARRATIVE_CHAPTER | Map pages, especially Land Use Map section | PARCEL-DETAIL to REGIONAL-OVERVIEW | 50–100+ | Limited | 2026 draft | Duplicate/currented URL variant of the same 70-page draft; deduplicate in pipeline. |
| Spanish Fork | West Meadows at Spanish Fork Annexation | https://entitiesandboundaries.utah.gov/wp-content/uploads/2025/06/203001-WEST-MEADOWS-AT-SPANISH-FORK-ANNEXATION.pdf | ANNEXATION_MAP | Exhibit/plat pages | PARCEL-DETAIL | 20–50 | Some legal/plat detail | 2025 | Legal annexation document; useful for existing annexation boundary, not broad future annexation policy. |
| Spanish Fork | General Plan 2021 | https://www.spanishfork.gov/docs/CommDev/Planning/Maps/GP/General_Plan_2021.pdf | FLU_MAP | 1 | PARCEL-DETAIL | 100+ | Limited | 2021 | Historical FLU reference. |
| Spanish Fork | General Plan 2020 | https://www.spanishfork.gov/docs/CommDev/Planning/Maps/GP/General_Plan_2020.pdf | FLU_MAP | 1 | PARCEL-DETAIL | 100+ | Limited | 2020 | Historical FLU reference. |
| Spanish Fork | General Plan 2013 | https://www.spanishfork.gov/docs/CommDev/Planning/Maps/GP/General_Plan_2013.pdf | FLU_MAP | 1 | PARCEL-DETAIL | 100+ | Limited | 2013 | Historical FLU reference. |
| Spanish Fork | General Plan 2006–2011 | https://www.spanishfork.gov/docs/CommDev/Planning/Maps/GP/General_Plan_2006-2011.pdf | FLU_MAP | 1 | PARCEL-DETAIL | 100+ | Limited | 2006–2011 | Historical FLU reference. |
| Spanish Fork | Zoning Map | https://www.spanishfork.gov/document_center/Public%20Works/Maps/Planning/Zoning_Letter.pdf | CURRENT_ZONING_MAP | 1 | PARCEL-DETAIL | 100+ | Limited | 2022 file metadata | Current zoning only; retain as reference. |
| Spanish Fork | Zoning Map — Detailed | https://www.spanishfork.gov/document_center/Public%20Works/Maps/Planning/Zoning_Detailed_Letter.pdf | CURRENT_ZONING_MAP | 1 | PARCEL-DETAIL | 100+ | Limited | 2022 file metadata | Current zoning only; detailed symbology. |
| Spanish Fork | Zoning 2021 | https://www.spanishfork.gov/docs/CommDev/Planning/Maps/Zoning/Zoning_2021.pdf | CURRENT_ZONING_MAP | 1 | PARCEL-DETAIL | 100+ | Limited | 2021 | Historical zoning reference. |
| Spanish Fork | Zoning 2020 | https://www.spanishfork.gov/docs/CommDev/Planning/Maps/Zoning/Zoning_2020.pdf | CURRENT_ZONING_MAP | 1 | PARCEL-DETAIL | 100+ | Limited | 2020 | Historical zoning reference. |
| Spanish Fork | Zoning 2013 | https://www.spanishfork.gov/docs/CommDev/Planning/Maps/Zoning/Zoning_2013.pdf | CURRENT_ZONING_MAP | 1 | PARCEL-DETAIL | 100+ | Limited | 2013 | Historical zoning reference. |

## Fallback and pipeline-modification flags

| City | Trigger condition | Recommendation |
|---|---|---|
| Grantsville | **Sectional GP requires pipeline modification.** The city publishes FLU as City Center, Deseret Peak, and Flux sheets. | Add city-level multi-sheet aggregation: extract each PDF independently, normalize category names, and merge into a single Grantsville FLU layer with a `source_section` attribute. |
| Bluffdale | Best forward-looking map appears to be a growth-management or general-plan map rather than a clean parcel-level FLU sheet. | Run extraction but allow fallback to coarse boundary tagging if polygon categories are not sufficiently legible. |
| Draper | Current land-use and zoning sources are ArcGIS apps; PDFs are plan documents and station-area plans. | Use PDF extraction for General Plan and station-area overlays, but treat current FLU/zoning as an ArcGIS-service fallback rather than a PDF target. |
| Herriman | No major fallback issue for FLU; zoning is interactive. | Use PDF workflow for FLU and annexation/open-space maps; retain ArcGIS zoning as reference only. |
| Spanish Fork | Duplicate 2026 draft URL and strong historical-map inventory. | Deduplicate the 2026 Land Use Element draft; use current General Plan Map as primary and historical maps only for QA/time-series comparison. |

## References

[1]: https://www.grantsvilleut.gov/departments/community___economic_development/zoning_map.php "Grantsville Zoning Map page"  
[2]: https://grantsvilleut.gov/departments/planning___zoning/index.php "Grantsville Planning & Zoning page"  
[3]: https://www.bluffdale.gov/218/Master-Plans "Bluffdale Master Plans"  
[4]: https://www.bluffdale.gov/272/Maps "Bluffdale Maps"  
[5]: https://www.draperutah.gov/business-development/planning-and-development/ "Draper Planning and Development"  
[6]: https://www.draperutah.gov/city-government/public-records-and-plans/master-plans/ "Draper Master Plans"  
[7]: https://www.herriman.gov/master-plans "Herriman Master Plans & Capital Facility Plans"  
[8]: https://www.herriman.gov/gis "Herriman GIS City Maps"  
[9]: https://www.spanishfork.gov/departments/community_development/planning/city_general_plan.php "Spanish Fork Land Use Element"  
[10]: https://www.spanishfork.gov/departments/community_development/planning/maps.php "Spanish Fork Planning Maps"
