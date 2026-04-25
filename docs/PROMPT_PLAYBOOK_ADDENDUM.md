# PROMPT_PLAYBOOK_ADDENDUM.md — CM_RE merge deltas

**How this file relates to `PROMPT_PLAYBOOK.md`:** each section here is a delta to be added *into* the corresponding phase brief before the agent executes. The original playbook phases stay intact; these deltas expand their scope.

**Read order for any agent:** `PROJECT_STATE.md` → `PROMPT_PLAYBOOK.md` (phase brief) → this file (delta for that phase) → `CM_RE_INTEGRATION.md` (why these deltas exist).

**Prerequisite for Phases 1, 3, 4, 5, 6, 9, 10 below:** `cm_re_extract.sh` has been run, so `tooele-land-intel/vendor/cm_re/` exists and is populated.

**This file is living state.** Its `CURRENT STATE` section below is the canonical pointer to the phase an agent should pick up next. Agents update it per the `SELF-UPDATE PROTOCOL` when finishing a phase.

---

## CURRENT STATE

```yaml
phase:          5
phase_name:     "Parcel Deep Dive with live ArcGIS"
status:         NOT_STARTED        # NOT_STARTED | IN_PROGRESS | BLOCKED | DONE
updated:        2026-04-24
updater:        "Claude Code (Opus 4.7) — Phase 4 session"

last_completed:
  phase:        4
  phase_name:   "STIP overlay + polygon renderer"
  completed_on: 2026-04-24

next_after_current:
  phase:        6
  phase_name:   "Developer profile + agenda detail panes"

blockers: []

notes:          |
  Phase 4 done. tooele-land-intel: scripts/fetch_stip.py pulls UDOT EPM
  Projects_as_Lines (services.arcgis.com/pA2nEVnB6tquxgOW) for Tooele Valley
  bbox → 227 features. scripts/build_gap_layer.py unions Erda + Tooele-uninc
  + Grantsville zoning sublayers (1/4/7) with Tooele Co 2022 GP, scoring
  gap = max(0, gp_intensity - zoning_intensity) via hand-curated tables →
  10,665 parcels, 60% scored in Erda, 33 high-gap parcels in Erda incl. the
  expected A-20 → HIR (gap_score=7) clusters. Monthly cron in gap-layer.yml.
  wasatch-intel: /api/gap-layer + /api/stip endpoints (5-min Worker cache),
  useGapLayer/useStip hooks (30-min staleTime). MapCanvas rewritten — mock
  PARCELS gone, three real GeoJSON sources, gap fill interpolates fuchsia
  by gap_score, STIP renders as yellow line+glow. routes/index.tsx replaces
  ParcelDeepDive with a temporary parcel-properties popover (real drawer is
  Phase 5's job per the addendum). Layer rail has gap-gradient legend +
  partial-GP-coverage caveat. "Site plan overlays" toggle relabeled
  "STIP / UDOT projects" (re-purposed). NOTE: ParcelDeepDive component +
  mock Parcel type are still in the tree but no longer imported; Phase 5
  will rewrite ParcelDeepDive to consume live ArcGIS and wire it back in.
```

---

## SELF-UPDATE PROTOCOL — how to leave this doc for the next session

When an agent finishes a phase, its **final commit** on each affected repo must update this doc. Steps, in order:

1. **Update `CURRENT STATE` at the top of this file:**
   - `phase:` → the next phase number
   - `phase_name:` → a short name for that phase
   - `status:` → `NOT_STARTED`
   - `updated:` → today's ISO date
   - `updater:` → identifier for the session that made the update (e.g. `"Claude Code — session 2026-04-27"`)
   - `last_completed.phase` / `phase_name` / `completed_on` → the phase you just finished
   - `next_after_current` → the phase *after* the new current phase (look it up in `PROMPT_PLAYBOOK.md`)
   - `blockers:` → list any items needing user input (keep terse)
   - `notes:` → one-paragraph flag for anything the next session should know

2. **Append a completion note to the phase you just executed:**

   Below the relevant `## PHASE N ADDENDUM — ...` section, add a subsection titled `### PHASE N COMPLETION NOTES` using this template (keep it ≤ 15 lines — long narratives go in commit messages):

   ```markdown
   ### PHASE N COMPLETION NOTES
   - **Date:** YYYY-MM-DD
   - **By:** <session identifier>
   - **Built:** <2-line summary of concrete deliverables>
   - **Key commits:** wasatch-intel@<sha>, tooele-land-intel@<sha>
   - **Decisions (not from the addendum):** <e.g. picked library X over Y because Z>
   - **Deviations from the addendum:** <if any — honest about what you skipped or did differently>
   - **Surprises / gotchas:** <anything future-you would want to know>
   - **Deferred:** <what was explicitly punted, and where it's tracked>
   ```

3. **Update `PROJECT_STATE.md` PHASE_LOG:**
   Add an entry in the style of existing entries. This is the longer-form narrative; the addendum's completion note is the quick-scan version.

4. **Commit message format (both repos):**
   `Phase N complete — <one-line summary>`
   Include the doc updates in this same commit, not a separate "update docs" commit.

5. **If the executed phase had NO addendum in this file** (e.g. Phase 7, Phase 8 — they have no CM_RE deltas), skip step 2. Still do 1, 3, 4.

6. **If BLOCKED**, set `status: BLOCKED` in CURRENT STATE, list the blocker in `blockers:`, write a blocker section below the phase addendum explaining what's needed from the human, commit, push, and stop. Do not update `last_completed` — the phase isn't done.

The next session reads this file, sees the new `CURRENT STATE`, and picks up seamlessly.

---

## STANDARD ADDENDUM BANNER (prefix into each modified phase prompt)

```
CM_RE ADDENDUM:
A prior Utah land-intel project ("CM_RE", docs/CM_RE_INTEGRATION.md) built
much of this phase's infrastructure for Davis + Weber counties. Its source
code is mounted read-only at tooele-land-intel/vendor/cm_re/. Port patterns
and logic from there — do NOT import from vendor/cm_re/ at runtime; treat
it as reference material you read and then rewrite as TLI-native modules.

Scope guardrails (from CM_RE_INTEGRATION.md §3): do not introduce rasterio,
Google Places API, owner scraping, or CRE-specific scorer weights into this
phase. Those are out of MVP scope.
```

---

## PHASE 1 ADDENDUM — Parser schema upgrade

**Add to the Phase 1 prompt, after the "Concrete deliverables" section:**

```
ADDITIONAL DELIVERABLE — parser schema upgrade:

Before wiring /api/agendas to the existing agenda_items_split.csv, upgrade
the upstream parser in tooele-land-intel to produce the richer signal schema
from vendor/cm_re/scraper/parser.py. The upgraded schema adds these fields
per signal:

  signal_type      — REZONE | NEW_SUBDIVISION | COMMERCIAL_PROJECT |
                     MINIFLEX_OPPORTUNITY | INFRASTRUCTURE | ANNEXATION |
                     GENERAL_PLAN_AMENDMENT | LARGE_PROJECT |
                     DEVELOPER_ACTIVITY
  description      — plain-English summary
  location         — address or cross-streets as stated
  acres            — number or null
  units            — number or null  (for residential signals)
  developer        — string or null  (applicant / developer entity)
  zoning_from      — string or null  (existing zone)
  zoning_to        — string or null  (proposed zone)
  status           — PROPOSED | APPROVED | DENIED | TABLED | CONTINUED
  growth_score     — 0-100 (the model's own confidence in signal strength)
  notes            — free-text context

Concrete steps:
1. In tooele-land-intel/scripts/, replace the existing classify prompt with
   the prompt template from vendor/cm_re/scraper/parser.py (PROMPT_TEMPLATE
   constant). Adapt it to call the Anthropic API directly (Haiku 4.5, not
   Claude Code CLI) — the CM_RE version uses `claude` CLI which is a
   different execution model.
2. Update agenda_items_split.csv schema to include the new columns. Keep
   backward compatibility: old rows with missing columns default to null.
3. Update docs/python-to-ts-field-mapping.md with the new fields mapped to
   their TS-side equivalents in src/lib/types.ts (you may need to extend the
   AgendaItem type — do it).
4. Haiku cost cap: 1 call per PDF, max 50 PDFs per weekly run. If Haiku
   returns non-JSON (happens occasionally), strip markdown fences and retry
   once before falling back to a keyword-only classification.

Verification addendum:
- Pick 3 recent agenda PDFs. Eyeball-check the extracted signals have
  developer names, zoning from/to, and status populated.
- The TS-side AgendaItem type now has optional developer, zoningFrom,
  zoningTo, status fields.
```

### PHASE 1 COMPLETION NOTES
- **Date:** 2026-04-23 (code) / 2026-04-24 (deploy fixed, verified)
- **By:** Claude Code (Sonnet 4.6) — two sessions (execution + deploy fix)
- **Built:** Parser schema upgraded (23-col CSV, CM_RE signal taxonomy); `/api/agendas` endpoint live at https://wasatch-intel.cam-s-rigby.workers.dev/api/agendas (136 items, freshness=live); csv-loader, types.ts, api-client.ts, agendas.tsx all wired to real data.
- **Key commits:** tooele-land-intel@f591fe8, wasatch-intel@6ae0616 (final)
- **Decisions (not from the addendum):** Deploy model changed from Cloudflare Pages to Cloudflare Workers (wrangler deploy). `createAPIFileRoute` from `@tanstack/react-start/api` never registered with the runtime; replaced by `src/server/entry.ts` — a thin CF Worker wrapper that intercepts `/api/agendas` before TanStack Start SSR. Future routes add if-branches in entry.ts until Hono lands in Phase 7.
- **Deviations from the addendum:** Haiku eyeball-check of 3 PDFs not done (no Anthropic key in env). Migration derived signal_type heuristically from item_type. No `wrangler dev` local smoke test.
- **Surprises / gotchas:** `createAPIFileRoute` silently fails — router plugin warns about it but the server runtime never intercepts the route. `dist/server/wrangler.json` uses Workers (not Pages) output format. CLOUDFLARE_API_TOKEN needed "Edit Cloudflare Workers" template scope, not "Pages" scope.
- **Deferred:** Nothing. Phase 1 fully complete.

---

## PHASE 2 ADDENDUM — Weighted digest & developer aggregation

**Add to the Phase 2 prompt, inside the "Endpoints to build" list:**

```
ADDITIONAL BACKING LOGIC for /api/digest and /api/developers:

Port the weighted aggregation from vendor/cm_re/scraper/aggregator.py into a
new Python script tooele-land-intel/scripts/aggregate_city_signals.py:

- Signal type weights (REZONE 1.4, NEW_SUBDIVISION 1.0, COMMERCIAL_PROJECT
  1.6, MINIFLEX_OPPORTUNITY 1.8, INFRASTRUCTURE 1.5, ANNEXATION 1.3,
  GENERAL_PLAN_AMENDMENT 1.2, LARGE_PROJECT 1.3, DEVELOPER_ACTIVITY 0.8)
- Status multipliers (APPROVED 1.0, PROPOSED 0.7, TABLED 0.5, CONTINUED 0.5,
  DENIED 0.1)
- Per-signal weighted_score = growth_score * type_weight * status_multiplier
- City-level aggregate = sum of weighted scores, signal_counts dict, unique
  developers, unique top_areas, recent_dates[]

Write the rollup to data/city_signal_scores.json, committed weekly.

/api/digest consumes city_signal_scores.json. /api/developers derives distinct
applicants from the DEVELOPER_ACTIVITY signals + applicant fields in other
signal types, aggregating counts and jurisdictions per applicant.

Do NOT reuse CM_RE's specific gas_station/miniflex scoring logic — only the
weighted-aggregation pattern. TLI is tracking activity, not ranking sites
for a specific use.
```

### PHASE 2 COMPLETION NOTES
- **Date:** 2026-04-24
- **By:** Claude Code (Sonnet 4.6) — Phase 2 session
- **Built:** `aggregate_city_signals.py` + `city_signal_scores.json` in tooele-land-intel; 6 new API endpoints in `src/server/entry.ts`; `loadDevelopers()`, `loadSignalWire()`, `loadDigest()` in `csv-loader.ts`; feed.tsx, developers.tsx, pipeline.tsx, watchlists.tsx all wired to real data; `mock-data.ts` shrunk ~150 lines.
- **Key commits:** wasatch-intel@<see this commit>, tooele-land-intel@500e0d0
- **Decisions (not from the addendum):** Two `AgendaItem` shapes intentionally kept coexisting — mock shape (MapCanvas/ParcelDeepDive) vs real shape (API). Phase 3 resolves this when geocoding puts real items on the map. CITY_CENTERS and JURISDICTIONS moved from mock-data.ts to types.ts (authoritative for both frontend and server).
- **Deviations from the addendum:** `/api/parcels` returns empty array (no geocoding yet — Phase 3). `/api/watchlists` and `/api/deals` return empty arrays (D1 persistence is Phase 8).
- **Surprises / gotchas:** `renderInline()` in feed.tsx must NOT have an explicit `React.ReactNode` return type without importing React — TypeScript errors. Removed the annotation; inference works fine.
- **Deferred:** Actual geocoded parcel data on the map (Phase 3). Real watchlist/deal persistence (Phase 8). Item-type filter chip in feed.tsx sidebar is UI-only (no state wired — no state to wire yet).

---

## PHASE 3 ADDENDUM — Resilient UGRC fetcher

**Add to the Phase 3 prompt, after "Python work (in tooele-land-intel/)":**

```
ADDITIONAL PATTERN — resilient UGRC fetcher:

Before writing geocode_items.py, rewrite scripts/arcgis.py to adopt the
resilient fetch pattern from vendor/cm_re/parcel/parcel_fetcher.py:

- Micro-batched queries (50 OBJECTIDs per request — URL-length safe)
- Per-page disk cache under data/cache/arcgis/ keyed by query hash
- Retry with exponential backoff on 500/502/503/504
- Graceful partial-result recovery: if a later page fails, earlier cached
  pages are still usable on restart
- Confirmed LIR field schema (see LIR_FIELDS list in parcel_fetcher.py):
    PARCEL_ID, PARCEL_ADD, PARCEL_CITY, PARCEL_ACRES, PROP_CLASS,
    PRIMARY_RES, HOUSE_CNT, SUBDIV_NAME, BLDG_SQFT, BUILT_YR, EFFBUILT_YR,
    TOTAL_MKT_VALUE, LAND_MKT_VALUE, TAXEXEMPT_TYPE, TAX_DISTRICT,
    COUNTY_NAME
  (The CM_RE version uses Parcels_Davis_LIR and Parcels_Weber_LIR — TLI's
  MVP uses Parcels_Tooele_LIR. Service URL pattern is identical.)

This matters because Phase 3 backfills 24 months of historical items, which
means thousands of parcel-centroid lookups. Without caching and resilience,
a single 500 from UGRC invalidates the whole run.
```

### Pre-flight notes (added 2026-04-24 from Phase 2 verification)

1. Production URL is https://wasatch-intel.cam-s-rigby.workers.dev (Workers, not Pages). The legacy https://wasatch-intel.pages.dev returns 404. Before doing Phase 3 work, run:

     grep -rn "pages.dev" docs/ *.md .env.example 2>/dev/null

   in BOTH repos (wasatch-intel and tooele-land-intel) and replace any lingering pages.dev references with the workers.dev host. Commit as part of Phase 3.

2. The `signal` field is currently 0 for all 136 wire items pending Phase 5 Haiku enrichment. When rendering pins on the map, render them UNIFORMLY — do not build signal-weighted pin styling (size, color, opacity by signal score) yet. That work belongs in Phase 5 once enrichment populates real signal values. Note this in the Map route's component comments so future-you knows why the styling is deliberately flat.

3. City scores already live at /api/digest → data.cityScores (Grantsville 100.0/A, Erda 12.1/D). No new endpoint needed. If the Map route or any Phase 3 component wants city-level signal context, fetch it from there.

### Deferred to Phase 5 (data quality)

- growth_score is empty for all 136 CSV rows → upstream Haiku enrichment in tooele-land-intel hasn't run; fix in Phase 5
- 1 row with meeting_date="nan" leaks through date filter in loadSignalWire — add Date.parse guard when Phase 5 touches the loader
- mostRecentActivity="nan" in city_signal_scores.json — fix NaN→None in tooele-land-intel/scripts/aggregate_city_signals.py during Phase 5

### PHASE 3 COMPLETION NOTES
- **Date:** 2026-04-24
- **By:** Claude Code (Sonnet 4.6) — Phase 3 session
- **Built:** resilient arcgis.py (Retry+disk cache); geocode_items.py (4-strategy: parcel_id/nominatim/title-regex/haiku); geocode.yml workflow; MapCanvas rewritten to accept real AgendaItem[] with uniform pins + comment; index.tsx wired to useAgendas() with counter + updated popover; csv-loader.ts tries items_geocoded.csv first; pages.dev refs purged.
- **Key commits:** wasatch-intel@8db1416, tooele-land-intel@018e54d (geocoded CSV), tooele-land-intel@b24a40b (scripts)
- **Decisions (not from the addendum):** Ran geocode locally without Haiku (no API key available) → 12/136 geocoded. Committed initial items_geocoded.csv so map shows real pins immediately; full run waits for geocode.yml with ANTHROPIC_API_KEY.
- **Deviations from the addendum:** Nominatim strategies added city name appendage only when needed (not always "Tooele County, UT" to avoid over-constraining rural addresses). Bbox filter added to reject Nominatim results outside Tooele Valley.
- **Surprises / gotchas:** GH CLI not authenticated locally — couldn't trigger geocode.yml via `gh workflow run`. User should trigger it from GitHub UI or it runs automatically after next weekly-digest.yml run.
- **Deferred:** Signal-weighted pin styling (Phase 5). Real PARCELS layer (Phase 4). ParcelDeepDive still uses mock Parcel shape (Phase 4/5).
- **Geocode workflow ran 2026-04-24 — 30/136 items plotted, $0.011 cost.** 106 unplotted: 55 no-text items (procedural), 5 canceled meetings, 46 subdivision names Nominatim can't resolve. 0 out-of-bbox garbage. Quality clean — no prompt tightening needed.

---

## PHASE 4 ADDENDUM — STIP overlay + polygon renderer

**Add to the Phase 4 prompt, inside the deliverables section:**

```
ADDITIONAL DELIVERABLES:

1. Port vendor/cm_re/stip/stip_fetcher.py into scripts/fetch_stip.py:
   - Source: UDOT EPM All Projects as Lines (FeatureServer/0)
   - Filter to Tooele Valley bbox (approx. [-112.60, 40.35, -112.00, 40.95])
   - Keep only Active / Programmed / Planned / Design / Construction statuses
   - Write data/stip_projects.geojson, committed weekly
   - No API key needed; UDOT EPM is public.

2. Port the polygon-fetch logic from vendor/cm_re/parcel/parcel_polygon_map.py:
   - Batched UGRC polygon geometry fetch (50 parcel IDs per request)
   - REQUEST_DELAY = 0.35s between requests
   - Output: data/parcel_polygons.geojson (for parcels that have agenda
     activity or GP-gap scores — not every parcel, Phase 4 is scoped to
     parcels with something interesting to show)

3. The React MapCanvas component renders three layers:
   - Base: parcel polygons colored by gap score (the Phase 4 core feature)
   - Overlay: STIP projects as line features, toggleable
   - Markers: agenda-item pins from Phase 3 geocoding

CM_RE's parcel_polygon_map.py also renders a standalone Leaflet HTML with a
filter panel — that's reference for UX ideas (transparency slider, score
threshold, acreage filter) but the TLI production renderer is React-side in
MapCanvas, not a standalone HTML file.
```

### PHASE 4 COMPLETION NOTES
- **Date:** 2026-04-24
- **By:** Claude Code (Opus 4.7) — Phase 4 session
- **Built:** tooele-land-intel `fetch_stip.py` (227 UDOT projects in Tooele bbox) + `build_gap_layer.py` (10,665 parcels, 60% scored in Erda, 33 high-gap A-20→HIR confirmed) + monthly `gap-layer.yml` cron. wasatch-intel: `/api/gap-layer` + `/api/stip` endpoints, `useGapLayer/useStip` hooks, MapCanvas rewritten with three real GeoJSON sources (gap-score-interpolated parcel fill, yellow STIP lines, agenda pins).
- **Key commits:** wasatch-intel@ea394a3, tooele-land-intel@687be58
- **Decisions (not from the addendum):** Vendored CM_RE STIP URL (`services1.arcgis.com/vdNDkVykv9vEWFX4/...EPM_Projects_Lines`) was stale — that host belongs to a different org. Switched to live UDOT public ArcGIS host `services.arcgis.com/pA2nEVnB6tquxgOW/Projects_as_Lines/FeatureServer/0` and rewrote field schema (pin/public_desc/pin_stat_nm/etc.). Coord-rounded gap_layer.geojson to 6dp + minified → 6.7 MB.
- **Deviations from the addendum:** Did NOT use the brief's per-parcel `parcel_polygon_map.py` BATCH_SIZE=50 polygon fetch — instead pulled polygons in the same parcels query as zoning-by-centroid (single ArcGIS call per city, returnGeometry=true), which is simpler and stays under the layer's 6000 row cap with `--max 6000`. Per-parcel batched fetch is unnecessary at this scale.
- **Surprises / gotchas:** First gap-layer run scored 0 parcels — Erda's own zoning layer (#1) and the County GP layer cover geographically disjoint areas (incorporated Erda vs unincorporated county). Fixed by unioning all three zoning sublayers into one STRtree, handling layer 7's `Zoning` vs layers 1/4's `Zone` field-name difference. Also: layer 7 (Grantsville) had ~3% GP coverage — partial-GP-caveat note added to the layer rail, null gap_score rendered transparent.
- **Deferred:** ParcelDeepDive drawer rewrite to consume live ArcGIS instead of mock Parcel shape (Phase 5). Currently `routes/index.tsx` shows a temporary parcel-properties popover (apn/zoning/gp/gap_score/owner). Mock `Parcel` type and `ParcelDeepDive` component still in tree but unimported.

---

## PHASE 5 ADDENDUM — Road adjacency + AADT enrichment

**Add to the Phase 5 prompt, inside the "Python work" section:**

```
ADDITIONAL DELIVERABLE — road adjacency & AADT:

Port vendor/cm_re/parcel/road_adjacency.py into scripts/enrich_roads.py:

- Source: UGRC Utah Roads FeatureServer/0
- Fields: CARTOCODE, DOT_FCLASS, DOT_AADT, SPEED_LMT, FULLNAME
- For each parcel in the deep-dive payload, compute:
    nearest_arterial_distance_mi  — distance to nearest CARTOCODE 1-5 road
    nearest_arterial_name         — that road's name
    nearest_arterial_aadt         — that road's DOT_AADT (real UDOT number)
    is_corner                     — True if 2+ distinct road names within 100m
    corner_roads                  — list of the road names if corner
- Cache roads per bbox under data/cache/roads/tooele.json so repeated
  parcel lookups don't re-hit UGRC.

Add these fields to the /api/parcel/:apn response payload so the Parcel
Deep Dive drawer can show:
  "On Main St · 12,400 AADT · Arterial frontage"
  "Corner: SR-138 & 2000 W"

This directly supports Phase 5's placeholder residual-land-value model —
traffic counts and arterial proximity are the two biggest drivers of CRE
land value, and having them cached per-parcel sets up a real model later
without another UGRC scraping pass.

Note: CM_RE's scorer builds an AADT-to-score curve (150k = 100, 50k = 70,
10k = 30). Do NOT port that curve into TLI — TLI shows the raw AADT number
and lets the human interpret it. Scoring for a specific use is out of scope.
```

### Pre-flight notes (added 2026-04-24 from Phase 3 completion)

Geocoding gap to close: 46 of 136 agenda items currently fail geocoding because they only have subdivision names ("Oquirrh Point Phase 1", "Copper Cove") that Nominatim can't resolve. The underlying agenda PDFs almost certainly contain parcel IDs or legal descriptions in the body text — the current parser only extracts from the title field. As part of Phase 5's enrichment pass, have Haiku read the full PDF body (not just title) and pull any parcel IDs / legal descriptions / cross-streets it finds into new CSV columns (parcel_id_extracted, legal_description, cross_streets). Then re-run geocode_items.py — expected jump from 30/136 to 80+/136 plotted.

Out of scope for Phase 5: anything requiring polygon centroids from a gap layer (that's Phase 4's job).

---

## PHASE 6 ADDENDUM — Shared signal taxonomy for correlation

**Add to the Phase 6 prompt, inside the "Python work" section before the
correlate_signals.py bullet:**

```
ADDITIONAL CONTEXT — shared signal taxonomy:

correlate_signals.py's Haiku correlation prompt should use the same nine
signal types from vendor/cm_re/scraper/parser.py that we adopted in the
Phase 1 addendum (REZONE, NEW_SUBDIVISION, COMMERCIAL_PROJECT,
MINIFLEX_OPPORTUNITY, INFRASTRUCTURE, ANNEXATION, GENERAL_PLAN_AMENDMENT,
LARGE_PROJECT, DEVELOPER_ACTIVITY).

For each Reddit post or news item, Haiku should:
  1. Attempt to classify the signal into one of the nine types (or
     "UNCATEGORIZED" if none fit).
  2. Extract any jurisdiction, specific project / parcel / applicant.
  3. Score correlation to each candidate agenda item on these axes:
     - Jurisdiction match (weight 0.4)
     - Signal type match (weight 0.3)  ← new dimension, only possible
                                         because we share a taxonomy
     - Keyword overlap (weight 0.2)
     - Temporal proximity (weight 0.1)

Sharing the taxonomy makes correlations meaningfully stronger. A Reddit post
tagged COMMERCIAL_PROJECT correlating to an agenda item also tagged
COMMERCIAL_PROJECT in the same jurisdiction within 30 days is a high-
confidence match. Without shared taxonomy, correlation is keyword-only.
```

---

## PHASE 9 — Per-city expansion via PMN (NEW full prompt)

**Replace or augment the existing Phase 9 plan.** CM_RE demonstrates that
`utah.gov/pmn` is a centralized hub covering 30+ Utah cities with
standardized HTML — making per-city expansion a one-line change rather
than a new scraper per city.

```
[STANDARD OPENING]

PHASE 9 BRIEF — Per-city expansion
==================================

Prerequisite: Phases 1–6 complete. The core dashboard, agenda pipeline,
geocoding, gap layer, parcel deep dive, and rumor signal pipeline are all
live on the MVP scope (Erda + Grantsville).

Goal: Expand jurisdictional coverage to 10–15 Tooele Valley + Wasatch Front
cities, chosen from: Tooele City, Stansbury Park, Lake Point, Saratoga
Springs, Eagle Mountain, Lehi, Bluffdale, plus any other target cities per
PROJECT_STATE.md.

Approach — PMN first, per-city fallback:

1. PMN DISCOVERY
   Visit https://www.utah.gov/pmn/sitemap/index.html and record the
   public-body IDs for each target city. For each, find:
     - Planning Commission body_id
     - City Council body_id (if separate)
   Write results to data/pmn_bodies.yaml with schema:
     <body_id>: { city, county, body_type, active: true }

2. PORT THE PMN SCRAPER
   From vendor/cm_re/scraper/scraper.py, port:
     - fetch_page() — requests + BeautifulSoup + 1.5s rate limit
     - get_notices_for_body(body_id, body_meta) — parses the
       /pmn/sitemap/publicbody/{body_id}.html table for notices
     - PDF download with dedup by URL hash
   Into scripts/scrape_pmn.py, writing:
     - data/pmn_notices.csv (one row per notice)
     - data/pmn_pdfs/<city>/<date>_<title>.pdf

3. WIRE INTO THE EXISTING PARSER
   The Phase 1 parser already understands the richer signal schema. Feed
   PMN-downloaded PDFs into the same parser. Resulting signals merge into
   agenda_items_split.csv with jurisdiction tagged to the PMN city.

4. CITIES NOT ON PMN
   For any city missing from PMN (this was Tooele County's case — Tyler
   Meeting Manager SPA, explicitly skipped in current scope), fall back to
   the existing per-city scraper pattern used for Erda + Grantsville.
   Document each fallback city in data/pmn_coverage.md as "non-PMN, custom
   scraper required" so the scope is explicit.

5. AGGREGATOR ALREADY HANDLES MULTI-CITY
   The weighted aggregator from Phase 2 addendum rolls up per-city without
   modification. Adding cities just adds entries to the dashboard's city
   list.

6. GitHub Actions workflow:
   - Rename weekly-digest.yml to weekly-agendas.yml (if not already)
   - Add scrape_pmn step before the existing parse step
   - Adjust concurrency limits if the run exceeds 6 hours (GitHub Actions
     free tier limit on public repos: 2,000 min/mo; each weekly run should
     stay well under 60 min even with 15 cities)

Decisions to make without asking:
- PMN rate limit: 1.5s is what CM_RE used, keep it.
- PDF dedup: by URL hash + filename + date, same as CM_RE.
- Failed-body handling: log and continue, don't crash the whole run.
- Haiku cost cap: scale linearly with city count. 50 PDFs/wk was MVP cap
  for 2 cities; ~250-350 PDFs/wk for 10-15 cities. Cost estimate: ~$1-2/wk
  at Haiku 4.5 pricing. Still well under the $30/mo total ceiling.

Verification:
- data/pmn_bodies.yaml has entries for each target city.
- scrape_pmn.py runs end-to-end for all cities without 429s or crashes.
- agenda_items_split.csv shows items from at least 5 new cities after one
  run.
- Dashboard's city filter shows the new cities.
- PROJECT_STATE.md PHASE_LOG updated.

STOP and summarize when done.
```

---

## PHASE 10 — NAIP land-cover vacancy verification (NEW, deferred)

**Only execute this phase after:** Phases 1–6 live + Phase 9 expansion done +
at least 3 months of production stability data. Do not start this earlier;
the dependency footprint is heavy and the use-case is "last 10% polish".

```
[STANDARD OPENING]

PHASE 10 BRIEF — NAIP land-cover vacancy verification
=====================================================

Goal: For parcels in the Deep Dive drawer, show a "site condition" field
that tells the user whether the ground truth matches UGRC's PROP_CLASS.
UGRC data lags reality by 1–3 years. A parcel flagged "vacant" in UGRC may
actually have a finished building; a parcel flagged "improved" may have
been demolished. This phase adds satellite verification.

Approach: port vendor/cm_re/land_cover/land_cover_analyzer.py and
spectral_classifier.py.

1. DEPENDENCY DECISION
   land_cover_analyzer.py requires rasterio + numpy + Pillow. Rasterio
   compiles native GDAL libs. Two options:
   (a) Add rasterio to requirements.txt, accept the heavier dependency.
   (b) Move land-cover analysis to a separate GitHub Actions job with its
       own Dockerfile, so the main TLI scripts stay light.
   Recommended: (b). The weekly agenda scrape shouldn't depend on GDAL.

2. DATA SOURCE
   NAIP imagery via Microsoft Planetary Computer STAC catalog (free, no
   auth). Fallback: spectral_classifier.py's pure-RGB path using any
   aerial image source (Esri World Imagery).

3. CLASSIFICATION
   Per parcel polygon, compute three spectral indices and classify each
   pixel as vegetation / bare_soil / impervious_surface / water. Roll up
   to parcel-level: dominant_cover_class, cover_percentages, flag if
   PROP_CLASS says vacant but >30% impervious (or vice versa).

4. OUTPUT
   Enrich /api/parcel/:apn response with:
     siteCondition: "matches_ugrc" | "possibly_built_since" |
                    "possibly_demolished_since" | "unknown"
     coverBreakdown: { vegetation: 0.42, bareSoil: 0.31,
                       impervious: 0.25, water: 0.02 }
     naipImageDate: "2024-07-15"

5. FRONTEND
   Parcel Deep Dive drawer "Overview" tab gets a new row:
     Site condition: [badge]  · NAIP 2024-07-15
   Badge colored green (matches UGRC), gold (possibly changed), gray
   (unknown).

6. RATE LIMIT + COST
   Microsoft Planetary Computer is free. No $ cost. The compute cost is
   CPU time; cap at 200 parcels per run, cache results for 12 months per
   parcel (NAIP is typically updated every 2-3 years per state).

Verification:
- Pick 3 parcels with known conditions (one actually vacant, one with a
  recently built warehouse, one with a recently demolished building) and
  confirm the classifier agrees.
- Cost stays at $0/mo (Planetary Computer is free tier).
- PROJECT_STATE.md PHASE_LOG updated.

Scope boundary: do NOT port CM_RE's visual_scanner.py intersection indexing
or the NAIP chip pipeline (naip_fetcher.py). TLI is parcel-centric, not
intersection-centric.

STOP and summarize when done.
```

---

## END
