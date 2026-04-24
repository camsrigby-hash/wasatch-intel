# python-to-ts-field-mapping.md — ETL Contract

Maps every column in `tooele-land-intel/data/agenda_items_split.csv` to its
TypeScript equivalent in `wasatch-intel/src/lib/types.ts` (`AgendaItem`).

**Authoritative type:** `src/lib/types.ts` — if the Python CSV adds a column,
this doc must be updated first, then `types.ts`, then `csv-loader.ts`.

---

## AgendaItem field mapping

| CSV column         | TS field           | Type             | Notes                                     |
|--------------------|-------------------|-----------------|-------------------------------------------|
| `id`               | `id`               | `string`         | Unique per row. Format: `pmn_<id>_item<n>` for split rows |
| `jurisdiction`     | `jurisdiction`     | `string`         | Free-form city name; validated in Phase 9 |
| `body`             | `body`             | `string`         | e.g. "Erda Planning Commission"           |
| `meeting_date`     | `date`             | `string`         | ISO date `YYYY-MM-DD`                     |
| `title`            | `title`            | `string`         | Human-readable agenda item title          |
| `url`              | `url`              | `string`         | Source URL (PMN notice page or city site) |
| `source`           | `source`           | `string`         | `"pmn"` or `"web"`                        |
| `scraped_at`       | `scrapedAt`        | `string`         | ISO datetime of scrape                    |
| `item_type`        | `itemType`         | `string`         | Legacy keyword classifier output          |
| `confidence`       | `confidence`       | `number \| null` | 0–1 keyword match confidence; 0.9 = LLM  |
| `signal_type`      | `signalType`       | `SignalType \| null` | CM_RE taxonomy (Phase 1+). Null for pre-Phase-1 rows |
| `growth_score`     | `growthScore`      | `number \| null` | 0–100 LLM signal strength (Phase 1+)     |
| `description`      | `description`      | `string \| null` | Plain-English summary (Phase 1+)          |
| `location`         | `location`         | `string \| null` | Address / cross-streets (Phase 1+)        |
| `acres`            | `acres`            | `number \| null` | Acreage; may come from agenda_text blob pre-Phase-1 |
| `units`            | `units`            | `number \| null` | Residential units (Phase 1+)              |
| `developer`        | `developer`        | `string \| null` | Applicant / developer entity (Phase 1+). Pre-Phase-1: extracted from `agenda_text.applicant` |
| `zoning_from`      | `zoningFrom`       | `string \| null` | Existing zone code (Phase 1+)             |
| `zoning_to`        | `zoningTo`         | `string \| null` | Proposed zone code (Phase 1+)             |
| `status_enum`      | `agendaStatus`     | `AgendaStatus \| null` | PROPOSED \| APPROVED \| DENIED \| TABLED \| CONTINUED |
| `notes`            | `notes`            | `string \| null` | Developer-relevant context (Phase 1+)     |
| `lat`              | `lat`              | `number \| null` | Geocoded latitude (Phase 3+)              |
| `lng`              | `lng`              | `number \| null` | Geocoded longitude (Phase 3+)             |
| `geocode_source`   | `geocodeSource`    | `string \| null` | `"arcgis"` \| `"nominatim"` \| `"haiku"` |
| `geocode_confidence` | `geocodeConfidence` | `number \| null` | 0–1 geocoding confidence (Phase 3+)    |

**Columns present in CSV but NOT mapped to API response:**
- `agenda_text` — raw JSON blob used internally; excluded from API (too noisy)

---

## Signal type values (CM_RE taxonomy)

| `signal_type` value     | `SignalType` TS const       | Meaning                                     |
|------------------------|-----------------------------|---------------------------------------------|
| `REZONE`               | `"REZONE"`                  | Zone change request                          |
| `NEW_SUBDIVISION`      | `"NEW_SUBDIVISION"`         | Residential subdivision plat                 |
| `COMMERCIAL_PROJECT`   | `"COMMERCIAL_PROJECT"`      | Commercial / retail / office / industrial    |
| `MINIFLEX_OPPORTUNITY` | `"MINIFLEX_OPPORTUNITY"`    | Light industrial, flex space, storage        |
| `INFRASTRUCTURE`       | `"INFRASTRUCTURE"`          | Road / utility extension (with action verbs) |
| `ANNEXATION`           | `"ANNEXATION"`              | Land being annexed into city limits          |
| `GENERAL_PLAN_AMENDMENT` | `"GENERAL_PLAN_AMENDMENT"` | Future land use / GP change                 |
| `LARGE_PROJECT`        | `"LARGE_PROJECT"`           | 50+ units or 5+ acres                        |
| `DEVELOPER_ACTIVITY`   | `"DEVELOPER_ACTIVITY"`      | Named developer appearing, no other match    |

---

## `agendaStatus` values

| `status_enum` value | `AgendaStatus` TS const | Notes                              |
|--------------------|-------------------------|------------------------------------|
| `PROPOSED`         | `"PROPOSED"`            | Application submitted, not decided |
| `APPROVED`         | `"APPROVED"`            | Passed                             |
| `DENIED`           | `"DENIED"`              | Rejected                           |
| `TABLED`           | `"TABLED"`              | Deferred to future meeting         |
| `CONTINUED`        | `"CONTINUED"`           | Continued to next hearing          |

Default for pre-Phase-1 rows: `PROPOSED`.

---

## Phase timeline

| Field group                   | Available from | Note                                      |
|-------------------------------|---------------|-------------------------------------------|
| Core (id, jurisdiction, etc.) | Phase 0       | All scraped rows                          |
| `signal_type`, `growthScore`  | Phase 1       | LLM extraction; keyword-derived for pre-Phase-1 |
| `description`, `location`, `developer`, `zoningFrom`, `zoningTo`, `agendaStatus`, `units`, `notes` | Phase 1 | Null for pre-Phase-1 rows |
| `lat`, `lng`, geocode fields  | Phase 3       | After geocode_items.py runs              |

---

## Coordinate ordering

`[lng, lat]` in GeoJSON / MapLibre — **longitude first**. The CSV stores
`lat` and `lng` as separate columns. `csv-loader.ts` must NOT swap them when
building pins; MapLibre expects `[lng, lat]`.

**NOTE:** If pins appear in Nevada, the columns were swapped. See KNOWN GOTCHAS
in `docs/PROJECT_STATE.md`.
