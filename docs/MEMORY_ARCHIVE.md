# Wasatch Intel — Memory Archive

Historical context evicted from active Claude memory or preserved from discarded work branches. Read when you need to understand why something was tried and abandoned, or to reuse research findings that aren't in the current codebase.

---

## Phase 18b first-attempt research findings (May 2026)

**Source**: `tooele-land-intel/origin/phase-18b-zoning-extraction` — Manus's first Phase 18b attempt. Branch deleted after archiving. The GeoJSON outputs were not merged (unanchored hallucinations). The source-discovery research and zone code taxonomy below are preserved as they contain useful reference data for Phase 18b-2d taxonomy work.

**Why discarded**: Opus vision was fed PDF pages with no georeferencing signal. The model approximated polygon coordinates from "known city geography" (city center, named highways, city extents) — no ground-truth anchor. All 4 cities that got polygons received `confidence: 0.4`, `extraction_quality: 'low'`, 5-coordinate bounding boxes. Not suitable for spatial joins. Phase 18b was subsequently split; 18b-2 uses a control-point + affine transform approach. See SD-15 in PROJECT_DIRECTION.md.

### Source-discovery log (from `data/zoning/_extraction_log.md`)

| City | Source found | PDF URL(s) | Polygons extracted | LLM cost | Issues |
|---|---|---|---|---|---|
| Grantsville City | Yes — 3 zoning map PDFs | `cms9files.revize.com/grantsvilleut/…/Zoning Map Central Area June 2025 (1).pdf`<br>`…/Zoning Map Deseret Peak Area June 2025 (1).pdf`<br>`…/Zoning Map Flux Area June 2025 (1).pdf` | 16 | $0.21 | All `extraction_quality: low`. No georeferencing grid. Coordinates inferred from Hwy 138, Hwy 112, city extents only. |
| Erda City | No — ArcGIS webapp | — | 0 | $0.00 | Official City Code and Maps page links zoning to an ArcGIS webapp, not a PDF. |
| Tooele City | No — interactive only | — | 0 | $0.00 | No downloadable official zoning map PDF found; sources were interactive/code documents. |
| Lehi City | Yes — 1 PDF | `lehi-ut.gov/media/ywqioi21/lehi_zoning1pdf.pdf` | 8 | $0.11 | `extraction_quality: low`. Map is highly complex (hundreds of small parcels). Only large zones extracted using I-15, Utah Lake, Thanksgiving Point as landmarks. |
| Saratoga Springs | No — interactive only | — | 0 | $0.00 | Planning/GIS pages advertise interactive city maps; no official base-zoning PDF. |
| Eagle Mountain | No — interactive only | — | 0 | $0.00 | Planning/engineering sources point to interactive ArcGIS zoning apps. |
| South Jordan | No — interactive only | — | 0 | $0.00 | FAQ states zoning is available through an interactive zoning map. |
| Herriman | No — interactive only | — | 0 | $0.00 | GIS/search sources point to interactive zoning maps. |
| Bluffdale | No — interactive only | — | 0 | $0.00 | Maps/search sources point to ArcGIS zoning web map and map-order page. |
| Draper | No — interactive only | — | 0 | $0.00 | Planning/development map collection is an ArcGIS Experience zoning map. |
| American Fork | Yes — 1 PDF | `americanfork.gov/DocumentCenter/View/4139` | 16 | $0.21 | `extraction_quality: low`. Coordinates approximated using Utah Lake, I-15 corridor, State Street. Many small parcels omitted. |
| Vineyard | No — interactive only | — | 0 | $0.00 | Planning/search sources point to public ArcGIS GIS maps and zoning feature layers. |
| Spanish Fork | Yes — 2 PDFs | `spanishfork.gov/document_center/Public Works/Maps/Planning/Zoning_Detailed_Letter.pdf`<br>`…/Zoning_Letter.pdf` | 14 | $0.19 | `extraction_quality: low`. Map lacks coordinate grid and named street labels at extraction resolution. Approximate large-area zones only. |

**Batch API usage**: 27,766 input tokens + 13,767 output tokens. Estimated cost $0.7245 (Batch API 50% discount). A first submission errored because `temperature` is deprecated for `claude-opus-4-7`; that run returned no outputs.

**Key finding for 18b-2**: The 9 "No — interactive only" cities are the ArcGIS REST candidates for both 18b-1 (current zoning) and 18b-2a (future land use). The 4 "Yes" cities have *current zoning* PDFs but Phase 18b-2 targets *future land use / general plan* maps, which are different documents. Future land use may be available via REST for some of those 4 cities; Manus 18b-2a must verify.

**Note on Grantsville**: The 3 PDFs found are current *zoning* maps (Central Area, Deseret Peak, Flux Area), dated June 2025. These are useful for 18b-1 (current zoning) if the REST path fails for Grantsville. For 18b-2 (future land use), the GP document — not these zoning maps — is the source.

### Zone code taxonomy (from `data/zoning/_taxonomy_proposal.md`)

Derived from the 54 polygon features extracted across 4 cities. Useful as a starting reference for Phase 18b-2d taxonomy harmonization — these are *current zoning* codes, not GP future land use codes, but the normalization groupings carry over.

| Normalized class | Source codes | Cities |
|---|---|---|
| `Agriculture/Rural` | A-5, A-E | Lehi, Spanish Fork |
| `Commercial-Community` | CC-1, CC-2 | American Fork |
| `Commercial-General` | GC-2, SC-1, CD, CG, C, C-D | American Fork, Grantsville, Lehi, Spanish Fork |
| `Industrial-Heavy` | MG-EX, I-3 | Grantsville, Spanish Fork |
| `Industrial-Light` | I-1, M-1 | American Fork, Spanish Fork |
| `Industrial-Medium` | MD, MG | Grantsville |
| `Mixed-Use` | MU | Grantsville, Lehi |
| `Planned/Master-Planned` | PC, PI-1, PUD, PC | American Fork, Grantsville, Lehi |
| `Public/Open-Space` | PF, S-1, P-F | American Fork, Spanish Fork |
| `Residential-Agriculture` | RA-1, RA-5 | American Fork, Lehi |
| `Residential-Low` | R1-12000, R1-7500, R1-9000, R-1-12, R-1-21, R-1-8, R-1-6, R-1-9 | American Fork, Grantsville, Lehi, Spanish Fork |
| `Residential-Medium/High` | R4-7500 | American Fork |
| `Residential-Rural` | RR-1, R-R | Grantsville, Spanish Fork |
| `Special/Employment` | RC, T-M | Lehi |

Full taxonomy table with per-city zone code + legend description is in the original `_taxonomy_proposal.md` on the deleted branch. The groupings above are sufficient for 18b-2d work since GP future land use codes use different terminology (e.g. "future commercial node" vs "CG").
