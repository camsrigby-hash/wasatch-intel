# Phase 13b-5 B1 fallback list: jurisdictions without machine-readable zoning

Author: **Manus AI**  
Date: 2026-05-07

## Summary

This fallback list covers the 13 jurisdictions enumerated in `tooele-land-intel/data/jurisdictions.yaml`. During Phase 13b-5 implementation, the checked-in county parcel CSVs were profiled and no `zone_class`, `zoning`, `zone`, `zone_code`, or similar machine-readable zoning column was present in the parcel CSV headers. The scoring workflow therefore treats all 13 jurisdictions as **B1 fallback jurisdictions** for Phase 14 zoning-PDF/ordinance vision work. The current `parcel_zoning_scores.csv` is still generated with a transparent `prop_class:` fallback source string so it can be loaded and tested without representing those values as true municipal zoning.

> **B1 fallback definition.** A jurisdiction is listed here when the current parcel CSV source available to the Phase 13b-5 workflow does not provide a populated machine-readable zoning field that can be mapped directly through `data/zoning_normalizer.yaml`. These rows should be revisited in Phase 14, where municipal zoning PDFs or online zoning ordinances can be converted into geospatial zoning data.

## Fallback jurisdictions and source references

| Jurisdiction | Machine-readable parcel zoning in current CSVs | Zoning code / ordinance source | Planning contact source | Public phone | Public email | Phase 14 note |
|---|---:|---|---|---|---|---|
| Grantsville City | No | [Municipal Code Online land ordinances][1] | [Community & Economic Development][2] | (435) 884-1674; (435) 884-1661; (435) 884-4604 | bcobabe@grantsvilleut.gov; smoore@grantsvilleut.gov | Use land-ordinance text as the zoning-code source and reconcile against Tooele County zoning layers if available. |
| Erda City | No | [City codes and maps / zoning document][3] | [Planning Commission][4] | 435-243-5577 | mjensen@erda.gov | Erda publishes code and map materials online; Phase 14 should normalize the document into zone polygons or code references. |
| Tooele City | No | [Tooele City code page][5] and [Title 24 code mirror][6] | [Community Development][7] | 435.843.2132 | pcpubliccomment@tooelecity.gov | Prefer the official city code page first; use the code mirror only when the official site does not expose deep zoning links. |
| Lehi City | No | [Development Code][8] | [Planning & Zoning][9] | 385.201.1000 | Not found | Lehi’s online development code is the authoritative starting point for zoning-class extraction. |
| Saratoga Springs City | No | [Title 19 Land Development Code][10] | [Planning & Zoning][11] | 801-766-9793 | planning@saratogasprings-ut.gov | The land development code has a stable city-hosted page suitable for Phase 14 extraction. |
| Eagle Mountain City | No | [Title 17 zoning/development code][12] | [Planning Department][13] | (801) 789-6600 | info@eaglemountain.gov | Code Publishing provides the zoning/development code; confirm map boundaries separately. |
| South Jordan City | No | [Title 17 Planning and Zoning Code][14] | [Planning & Zoning][15] | 801-446-4357 | planninginfo@sjc.utah.gov | Municipal Code Online is the primary code source; pair with city GIS or PDF zoning map when available. |
| Herriman City | No | [Title 10 Land Development Code][16] | [Planning][17] | 801-727-0914 | planning@herriman.gov | Use the land development code and request a GIS zoning export if not publicly published. |
| Bluffdale City | No | [Land Use Ordinances][18] and [Municipal Code Online][19] | [Planning][20] | 801-254-2200 | info@bluffdale.gov | The city links land-use ordinances and Municipal Code Online; Phase 14 should verify current zoning-map availability. |
| Draper City | No | [American Legal code library][21] | [Contacts Directory][22] | 801-576-6399 | info@draperutah.gov | Draper code is available through American Legal; planning pages should be checked for zoning map attachments. |
| American Fork City | No | [General Plan and Code Updates][23] | [Planning Department][24] | 801-763-3060 | mwhite@americanfork.gov | Use the planning department as the contact point for current zoning-map export or PDF confirmation. |
| Vineyard City | No | [Municipal Code Online][25] | [Planning][26] | 801.226.1929 | planning@vineyardutah.gov | Municipal code and planning contact are available; Phase 14 should confirm current map boundaries. |
| Spanish Fork City | No | [Municipal Code Online ordinances][27] | [Community Development][28] | 801-804-4580 | kwoodard@spanishfork.gov | Municipal Code Online is the code source; request GIS zoning data if the city does not publish it directly. |

## Coverage conclusion

The fallback list has **zero known false negatives** against the current repository inputs because every configured Wasatch Intel jurisdiction lacks a machine-readable zoning source column in the parcel CSVs inspected for this phase. If a later upstream county CSV or release asset adds `zone_class` or an equivalent column, that jurisdiction should be removed from this B1 list only after the scoring script reports a populated zoning source column for that county/jurisdiction and the raw strings are mapped in `tooele-land-intel/data/zoning_normalizer.yaml`.

## References

[1]: https://grantsville.municipalcodeonline.com/book?type=landordinances#name=Preface "Grantsville Municipal Code Online, land ordinances"  
[2]: https://www.grantsvilleut.gov/departments/community___economic_development/index.php "Grantsville Community & Economic Development"  
[3]: https://erda.gov/city-codes-and-maps/ "Erda City codes and maps"  
[4]: https://erda.gov/city-government/planning-commission/ "Erda Planning Commission"  
[5]: https://www.tooelecity.gov/government/city_code.php "Tooele City code"  
[6]: https://www.zoneomics.com/code/tooele-UT/chapter_24 "Tooele zoning code mirror, Chapter 24"  
[7]: https://www.tooelecity.gov/services/community_development/index.php "Tooele City Community Development"  
[8]: https://www.lehi-ut.gov/government/codes-ordinances/development-code/ "Lehi Development Code"  
[9]: https://www.lehi-ut.gov/business-development/planning-zoning/ "Lehi Planning and Zoning"  
[10]: https://www.saratogasprings-ut.gov/558/Title-19---Land-Development-Code "Saratoga Springs Title 19 Land Development Code"  
[11]: https://www.saratogasprings-ut.gov/182/Planning-Zoning "Saratoga Springs Planning and Zoning"  
[12]: https://www.codepublishing.com/UT/EagleMountain/#!/EagleMountain17/EagleMountain17.html "Eagle Mountain Title 17"  
[13]: https://eaglemountain.gov/government/planning-department/ "Eagle Mountain Planning Department"  
[14]: https://southjordan.municipalcodeonline.com/book?type=ordinances#name=TITLE_17_PLANNING_AND_ZONING_CODE "South Jordan Title 17 Planning and Zoning Code"  
[15]: https://www.sjc.utah.gov/334/Planning-Zoning "South Jordan Planning and Zoning"  
[16]: https://herriman.municipalcodeonline.com/book?type=ordinances=TITLE_10_LAND_DEVELOPMENT_CODE "Herriman Title 10 Land Development Code"  
[17]: https://www.herriman.gov/planning "Herriman Planning"  
[18]: https://www.bluffdale.gov/271/Land-Use-Ordinances "Bluffdale Land Use Ordinances"  
[19]: https://bluffdale.municipalcodeonline.com/ "Bluffdale Municipal Code Online"  
[20]: https://www.bluffdale.gov/268/Planning "Bluffdale Planning"  
[21]: https://codelibrary.amlegal.com/codes/draperut/latest/overview "Draper American Legal Code Library"  
[22]: https://www.draperutah.gov/contacts-directory/ "Draper contacts directory"  
[23]: https://www.americanfork.gov/1290/General-Plan-and-Code-Updates "American Fork General Plan and Code Updates"  
[24]: https://www.americanfork.gov/276/Planning-Department "American Fork Planning Department"  
[25]: https://vineyard.municipalcodeonline.com/ "Vineyard Municipal Code Online"  
[26]: https://www.vineyardutah.gov/government/planning.php "Vineyard Planning"  
[27]: https://spanishfork.municipalcodeonline.com/book?type=ordinances#name=Preface "Spanish Fork Municipal Code Online"  
[28]: https://www.spanishfork.gov/departments/community_development/index.php "Spanish Fork Community Development"
