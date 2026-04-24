# CM_RE_INTEGRATION.md — Wasatch Intel × Tooele Land Intel

**Status:** Reference doc, addendum to `PROJECT_STATE.md`
**Authored:** 2026-04-23
**Purpose:** Document a prior related project ("CM_RE Tool") whose code is reusable for several post-MVP TLI phases. This doc tells any agent (Claude Code, Manus) what to pull, what to skip, where it goes, and which phase to do the porting in.

---

## 1 · What is CM_RE?

CM_RE ("Commercial Real Estate Identification Tool") is a prior Utah land-intelligence project targeting Davis + Weber counties. It was built as two overlapping folders — `RE_Identification_Tool/` (PMN scraper + AI parser + city growth scoring) and `Manus_RE_Tool/` (parcel-level scoring + road adjacency + UGRC polygon rendering + NAIP land cover).

It is **not** the same project as Tooele Land Intel. CM_RE's goal was commercial site-selection — ranking parcels as gas-station or miniflex candidates. TLI's goal is development-intelligence — tracking what's happening on land so a human decides what to do about it.

But CM_RE's **data-collection and signal-extraction infrastructure** is ~70% of what TLI needs for Phases 3–6 and 9. The source code sits in two zips on the user's machine (`CM_RE_Tool_Code.zip`, `CM_RE_Tool_Exhibits.zip`). The extraction script in this addendum (`cm_re_extract.sh`) unpacks just the reusable files into `tooele-land-intel/vendor/cm_re/` as read-only reference. Agents port from there; they don't run it in place.

---

## 2 · What's reusable (and what isn't)

### High-value reuse — port into TLI

| CM_RE file | What it does | Where it lands in TLI | Which TLI phase |
|---|---|---|---|
| `RE_Identification_Tool/scraper.py` | Scrapes `utah.gov/pmn/sitemap/publicbody/{body_id}.html` — Utah's centralized planning-notice hub | New `scripts/scrape_pmn.py` | Phase 9 (per-city expansion) — also validate during Phase 1 whether Erda/Grantsville publish to PMN |
| `RE_Identification_Tool/config.py` (PMN_BODIES dict) | Maps body_id → city/county/body_type. 30+ Davis/Weber cities already mapped | New `data/pmn_bodies.yaml` (Tooele Valley + Wasatch Front IDs) | Phase 9 — starter template, needs Tooele Valley body ID discovery |
| `RE_Identification_Tool/parser.py` | Claude-CLI-based structured signal extraction. Rich schema: REZONE / NEW_SUBDIVISION / COMMERCIAL_PROJECT / MINIFLEX_OPPORTUNITY / INFRASTRUCTURE / ANNEXATION / GENERAL_PLAN_AMENDMENT / LARGE_PROJECT / DEVELOPER_ACTIVITY — each with acres, units, developer, zoning_from/to, status, growth_score | Upgrade existing `scripts/classify.py` (or `analyze_opportunity.py`) prompt and schema | Phase 1 addendum — schema upgrade is cheap, low-risk, high-value |
| `RE_Identification_Tool/aggregator.py` | Weighted city-level rollup. Signal weights (REZONE 1.4, MINIFLEX 1.8, COMMERCIAL 1.6, INFRASTRUCTURE 1.5, etc.) + status multipliers (APPROVED 1.0, PROPOSED 0.7, TABLED 0.5, DENIED 0.1) | New `scripts/aggregate_city_signals.py` feeding `/api/digest` and `/api/developers` | Phase 2 addendum — directly powers the stat cards and city-grouped dashboard |
| `Manus_RE_Tool/parcel_fetcher.py` | Resilient UGRC LIR fetcher: micro-batched (50 rec/page), disk-cached per page, crash-safe, confirmed working LIR field schema | Upgrade existing `scripts/arcgis.py` parcel helpers | Phase 3 + Phase 5 addendum |
| `Manus_RE_Tool/road_adjacency.py` | UGRC Utah Roads query, CARTOCODE 1–8 classification, real DOT_AADT traffic numbers, corner-lot detection | New `scripts/enrich_roads.py` | Phase 5 addendum (parcel deep dive context) |
| `RE_Identification_Tool/stip_fetcher.py` | UDOT EPM future road projects via ArcGIS, bbox-filtered | New `scripts/fetch_stip.py` (Tooele bbox) | Phase 4 addendum (infrastructure overlay on gap layer) |
| `Manus_RE_Tool/parcel_polygon_map.py` | UGRC parcel polygon fetcher + Leaflet polygon-overlay renderer. Batched fetch, rate-limited, satellite basemap | Reference for Phase 4 polygon layer; fetcher logic ports into TLI; rendering logic ports into the React MapCanvas component | Phase 4 |
| `Manus_RE_Tool/land_cover_analyzer.py` + `Manus_RE_Tool/spectral_classifier.py` | NAIP 4-band imagery via Microsoft Planetary Computer + NDVI/NDBI/BSI spectral classification. Detects "UGRC says vacant but there's a building" | New `scripts/classify_land_cover.py` | **New Phase 10** — deferred until MVP + expansion + rumor signals are all live |

### Skip entirely — does not apply to TLI

- `parcel_scorer.py` — gas-station vs miniflex site scoring. TLI doesn't score sites, it tracks them.
- `competition.py` — Google Places API competitor-density scoring. Paid API; TLI is intel, not outreach.
- `commute_corridor.py` — gas-station-specific "people are already taking this route" scoring. Doesn't apply.
- `visual_scanner.py` — intersection index builder driving the CM_RE NAIP chip pipeline. TLI parcel-centric not intersection-centric.
- `scrape_owners.py` — Weber County assessor scrape (Davis is VPN-only per the module's own notes, Tooele status unknown). Parcel adjacency in TLI Phase 5 uses UGRC ownership fields directly, which is cleaner.
- `tools/generate_shortlist.py`, `tools/rank_outreach.py`, `tools/outreach_map.py` — CRE call-sheet generation. Not TLI's purpose.
- `tools/build_competitor_cache.py` — paid Google Places.
- NAIP chip pipeline (`naip_fetcher.py`) — superseded by `land_cover_analyzer.py`'s Microsoft Planetary Computer path.

### Do not copy — keep as read-only reference only

The extraction script in this addendum puts everything under `tooele-land-intel/vendor/cm_re/` (gitignored by default). Agents read it, port patterns from it, and write new TLI-native modules. Do not import directly from `vendor/cm_re/` in TLI scripts — that directory is reference material, not a package.

---

## 3 · Scope guardrails — what NOT to do

The user's MVP is explicitly scoped to **Erda + Grantsville, cities only, no counties, free infrastructure**. Several CM_RE capabilities would drag TLI out of that scope if merged naively. Any agent picking up work should honor these boundaries:

1. **Do not add rasterio / NAIP to MVP.** NAIP land-cover is a Phase 10 feature. Building it earlier bloats dependencies and delays the dashboard. rasterio compiles native libs — it's a heavy dep that's not needed until Phase 10.
2. **Do not introduce Google Places or any paid API.** TLI is intentionally on a free-tier path (GitHub Actions + Streamlit Community Cloud / Cloudflare Pages + metered Claude API).
3. **Do not port the CRE scorer weights into TLI.** TLI's "signal strength" is what agenda activity exists, not what's a good gas station. The aggregator.py *weighted rollup pattern* is reusable; the specific gas-station scoring logic is not.
4. **Do not import Davis/Weber city lists.** CM_RE's `PMN_BODIES` dict is for a different geography. Use the *pattern* (PMN body_id → metadata) but build a new dict for Tooele Valley + Wasatch Front cities as jurisdictions expand. Initial MVP doesn't need PMN at all if Erda/Grantsville aren't on it.
5. **Do not port owner scraping.** Ownership data comes from UGRC LIR parcel records in TLI. The county-assessor scraping path in CM_RE has legal/ToS/CAPTCHA rabbit holes and Davis-county VPN-only limitations.

---

## 4 · File inventory — what `cm_re_extract.sh` unpacks

The extraction script selects only the reusable files listed in §2. Everything else (CRE scorer, competition, shortlist tooling, owner scraping, NAIP chips, 287MB of exhibit PDFs) is left in the zips.

```
tooele-land-intel/vendor/cm_re/            (read-only reference, gitignored)
├── README.md                              (a generated map of what's here and why)
├── scraper/
│   ├── scraper.py                         (from RE_Identification_Tool/)
│   ├── parser.py                          (from RE_Identification_Tool/)
│   ├── aggregator.py                      (from RE_Identification_Tool/)
│   └── config.py                          (PMN_BODIES dict, Davis+Weber)
├── parcel/
│   ├── parcel_fetcher.py                  (from Manus_RE_Tool/)
│   ├── parcel_polygon_map.py              (from Manus_RE_Tool/)
│   └── road_adjacency.py                  (from Manus_RE_Tool/)
├── stip/
│   └── stip_fetcher.py                    (from RE_Identification_Tool/)
├── land_cover/                            (Phase 10 — deferred)
│   ├── land_cover_analyzer.py
│   └── spectral_classifier.py
└── docs/
    ├── README.md                          (original CM_RE readme, context)
    └── PROJECT_STATUS_v4.md               (what the CM_RE pipeline actually produced)
```

The field-schema doc `docs/python-to-ts-field-mapping.md` in wasatch-intel will need to grow to cover the extra fields that the upgraded parser.py schema produces (specifically: `developer`, `zoning_from`, `zoning_to`, `status`, `growth_score`, `units`). Note this in the Phase 1 addendum commit message.

---

## 5 · Phase integration map

| Phase | Current plan | CM_RE addendum | Effect |
|---|---|---|---|
| **1** — First real endpoint `/api/agendas` | Ship existing agenda CSV through Hono endpoint | Upgrade the CSV's upstream parser schema (parser.py prompt + fields) before Phase 1 locks the field-mapping contract | Richer agenda rows from day one; fewer mapping revisions later |
| **2** — Read-only routes | Wire `/api/digest`, `/api/developers`, `/api/signal-wire` stubs | Back `/api/digest` with aggregator.py weighted rollup; back `/api/developers` with DEVELOPER_ACTIVITY signal aggregation | Stat cards and per-city ordering become real, not placeholder |
| **3** — Geocoding pipeline | Nominatim + ArcGIS parcel-centroid lookup | Port parcel_fetcher.py's micro-batched, disk-cached, crash-safe pattern into `scripts/arcgis.py` | Dramatically more resilient on 24mo backfill runs |
| **4** — Zoning/GP gap layer | Query ArcGIS per parcel, render as polygon overlay | Port parcel_polygon_map.py's batched fetch + Leaflet renderer pattern; overlay stip_fetcher.py's UDOT projects on top | Polygon rendering + STIP infrastructure overlay both done at once |
| **5** — Parcel deep dive | `/api/parcel/:apn` + adjacency | Add road_adjacency.py AADT enrichment to the parcel detail payload | Parcel drawer shows real traffic counts and arterial proximity, which directly supports the residual-land-value placeholder model |
| **6** — Rumor signal pipeline | Reddit + news RSS + Haiku correlation | The Haiku correlation prompt can reuse parser.py's signal taxonomy (REZONE / SUBDIVISION / etc.) so signals and agenda items share a vocabulary | Correlations become more reliable because the two sides share a schema |
| **7** — Watchlists | D1 + matcher script | No CM_RE input | — |
| **8** — Deal pipeline | D1 + kanban | No CM_RE input | — |
| **9** — Per-city expansion (post-MVP) | Build per-city scrapers for Tooele City, Stansbury, Lake Point, Saratoga Springs, Eagle Mountain, Lehi, etc. | **This is the biggest CM_RE win.** Instead of a new scraper per city, discover each city's `utah.gov/pmn` body_id, add one dict entry, done | 10+ cities with one scraper, not ten scrapers |
| **10** — NAIP land-cover vacancy verification (NEW, deferred) | — | Port land_cover_analyzer.py + spectral_classifier.py. Pre-requisite: Phases 1–6 done and map is stable | "UGRC says vacant but there's a building" detection — feeds the parcel detail drawer's "site condition" field |

Phase 1, 2, 3, 4, 5, 6, 9, and 10 each get a delta prompt in `PROMPT_PLAYBOOK_ADDENDUM.md`. Phases 7 and 8 are untouched.

---

## 6 · First concrete action — PMN discovery

Before porting any CM_RE scraper code, an agent needs to answer one empirical question: **do Erda and Grantsville publish notices to `utah.gov/pmn`?**

If yes → Phase 9 becomes a one-afternoon task (borrow the CM_RE config.py pattern).
If no → PMN integration is deferred to whenever the first PMN-enabled city is added (could be Tooele City, could be Saratoga Springs — CM_RE already has the IDs for several Wasatch Front candidates).

Discovery task (can be a Phase 0.5 side-quest, or absorbed into Phase 9 kickoff):

```
1. Visit https://www.utah.gov/pmn/sitemap/index.html
2. Search for "Erda" — note body_id(s) if present
3. Search for "Grantsville" — note body_id(s) if present
4. Search for each Wasatch Front expansion city, record body_ids
5. Write results to tooele-land-intel/docs/pmn_coverage.md
```

Until this is done, treat Phase 9 as "blocked on discovery" in PROJECT_STATE.md.

---

## 7 · Heritage note for `PROJECT_STATE.md`

Drop this under the **REFERENCES** section of PROJECT_STATE.md:

> - `docs/CM_RE_INTEGRATION.md` — inventory of a prior related project whose scraper, parser, aggregator, and UGRC fetcher code is reusable for Phases 3–6 and 9. The code itself lives under `tooele-land-intel/vendor/cm_re/` after running `cm_re_extract.sh`. Read this before Phase 1 (parser schema upgrade), Phase 3 (UGRC patterns), and Phase 9 (per-city expansion via PMN).

And add this entry to **PHASE_LOG**:

```
### 2026-04-23 — CM_RE heritage documented — Claude (Opus 4.7) via claude.ai chat
Catalogued reusable modules from the prior CM_RE project (Davis+Weber CRE
site-selection tool). Created CM_RE_INTEGRATION.md, PROMPT_PLAYBOOK_ADDENDUM.md,
and cm_re_extract.sh. No code ported yet — extraction and porting happen in
the respective phases (Phase 1 schema upgrade, Phase 3/4/5 UGRC/STIP/polygon
work, Phase 9 PMN expansion, Phase 10 NAIP land cover). Scope boundaries
documented: do not drag CRE scorer, Google Places, owner scraping, or
rasterio into MVP.
```

---

## 8 · END
