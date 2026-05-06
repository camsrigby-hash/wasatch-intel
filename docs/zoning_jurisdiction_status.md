# Zoning Jurisdiction Status

This file tracks the status of zoning GIS service discovery for each of the 13 signal-scope jurisdictions. It is maintained by the 13b-5 operator during the zoning + General Plan ingestion sub-task.

When a jurisdiction's status is `no_service`, the parcel `zoning_current` field defaults to `'unknown_detail'` for that city. These jurisdictions are candidates for 13b-9 (deferred Opus-vision zoning-PDF recovery).

**Status values:**
- `active` — GIS service discovered, URL recorded, ingestion complete
- `discovered` — GIS service URL found, ingestion pending
- `fallback_lir` — using UGRC LandUseStatewide (coarser ~4 categories); `zoning_current = 'unknown_detail'`
- `no_service` — no publicly accessible zoning GIS service found; `zoning_current = 'unknown_detail'`
- `pending` — discovery not yet attempted

---

## Tooele County jurisdictions

| Jurisdiction | Status | GIS Service URL | Notes |
|---|---|---|---|
| Erda | active | `https://tcgisws.tooeleco.gov/server/rest/services/` sublayer 1 | Tooele County server, Phase 4 |
| Grantsville | active | `https://tcgisws.tooeleco.gov/server/rest/services/` sublayer 7 | Tooele County server, Phase 4 |
| Tooele City | active | `https://tcgisws.tooeleco.gov/server/rest/services/` sublayer 4 | Tooele County server, Phase 4 |

## Salt Lake County jurisdictions

| Jurisdiction | Status | GIS Service URL | Notes |
|---|---|---|---|
| South Jordan | pending | — | Discover during 13b-5 |
| Herriman | pending | — | Discover during 13b-5 |
| Bluffdale | pending | — | Discover during 13b-5 |
| Draper | pending | — | Discover during 13b-5 |

## Utah County jurisdictions

| Jurisdiction | Status | GIS Service URL | Notes |
|---|---|---|---|
| Lehi | pending | — | Discover during 13b-5 |
| Saratoga Springs | pending | — | Discover during 13b-5 |
| Eagle Mountain | pending | — | Discover during 13b-5 |
| American Fork | pending | — | Discover during 13b-5 |
| Vineyard | pending | — | Discover during 13b-5 |
| Spanish Fork | pending | — | Discover during 13b-5 |

---

## 13b-9 Candidates (no_service jurisdictions)

Populated by 13b-5 operator. Jurisdictions listed here are eligible for the deferred Opus-vision zoning-PDF recovery job (13b-9). Each entry should include a link to the jurisdiction's published zoning map PDF.

| Jurisdiction | Zoning Map PDF URL | Notes |
|---|---|---|
| *(populated during 13b-5)* | — | — |

---

*Last updated by 13b-5 operator: (pending)*
