# Wasatch Intel — Project Direction

**Owner**: Cameron Rigby (camsrigby-hash). Land broker + developer, Wasatch Front + Tooele Valley, Utah.
**Last updated**: May 23, 2026 (Phase 18b-2e shipped)
**Purpose**: Canonical reference for what each phase is, why, and in what order. Read this BEFORE answering any question about "what comes next" or "what is Phase X." Replaces volatile memory entries about phase strategy.

---

## How to use this document

- **Claude (any chat in this project)**: This file is visible to you automatically as a Project file. Default to it for all phase/direction questions. If a user request implies "what's next" or "is this in scope for Phase X," consult this file before answering.
- **Claude Code (CC)**: Read on every session bootstrap. Listed in `docs/CC_BOOTSTRAP.md` doc-map.
- **Manus / Lovable**: Paste relevant sections directly into prompts. These tools don't see project files.
- **Update protocol**: When a phase ships, update its row in the Phase Ledger. When a strategic decision changes scope, append a dated entry to the Strategic Decisions log at the bottom. Don't rewrite history — append.

---

## What Wasatch Intel is

A market intelligence platform for identifying rezone-and-flip parcel opportunities across the Wasatch Front and Tooele Valley. Aggregates planning meeting notices, agenda signals, news/Reddit RSS, CRE listings, and parcel data into a scored, mapped intelligence surface for commercial land development.

**Live at**: https://wasatch-intel.cam-s-rigby.workers.dev
**Repos**: `camsrigby-hash/wasatch-intel` (frontend + Workers API), `camsrigby-hash/tooele-land-intel` (Python scrapers + data + LLM enrichment)
**Cost ceiling**: $25/mo total. Currently ~$8/mo ($5 Workers Paid + ~$3 LLM).

---

## Phase Ledger

| Phase | Description | Status | Date | Notes |
|---|---|---|---|---|
| 0–10 | MVP: PMN scrapers, signal ingestion, weekly digest, watchlists, deals, Map+Pipeline UI | Shipped | Apr 27 2026 | 13 jurisdictions, 2,136 split items, free-tier infra |
| 11 | Pipeline parcel-centric rebuild + 8-dim scoring framework | Shipped | Apr 28 2026 | Framework reuses prior Manus RE Tool. Engine exists; needed data which 13b provides |
| 12 | Geocoding improvement (Haiku reads PDF body for parcel IDs) | Shipped | May 5 2026 | 27→185/514 resolved (6.8×). Remaining 329 are procedural agenda content |
| 13a | Per-parcel enrichment architecture decisions | Shipped | Early May 2026 | Resolved B1 zoning fallback, B2 Google Places budget, B3 WFRC TAZ proxy. Expanded scope 3→7 counties |
| 13b-1 | Schema migration 0004 — `parcel_records`, `parcel_enrichment_log` | Shipped | May 5 2026 | |
| 13b-2 | UGRC LIR parcel scrape + D1 load (947,863 parcels, 7 counties) | Shipped | May 7 2026 | Established polygons-in-CSV / attributes-in-D1 pattern |
| 13b-3 | Corner detection scoring | Shipped | May 8 2026 | 100% coverage, 11.06% high-score |
| 13b-4 | AADT scoring | Shipped | May 8 2026 | 99.37% coverage |
| 13b-5 | Zoning scoring (prop_class fallback) | Shipped | May 8 2026 | 100% coverage. No source CSVs had real zone fields; prop_class fallback used. Phase 18b (zoning PDF vision) will replace with real zoning |
| 13b-6a | Census ACS block group fetch | Shipped | May 6 2026 | 1,608 BGs, 96.6% with median_income |
| 13b-6b | Spatial join (median_income → parcels) | Shipped | May 8 2026 | 98.5% match rate. 14k unmatched are real geographic edge cases |
| 13b-7 | Commute corridor scoring (proxy method) | Shipped | May 8 2026 | 98.52% coverage. All rows tagged `commute_corridor_method='proxy'` for future WFRC swap |
| 13b-8 | Vacancy classification | Shipped | May 8 2026 | UGRC LIR cascade (vacant/partial/developed/unknown) |
| **14** | **PMTiles + Tippecanoe vector tile pipeline** | **Shipped** | May 9 2026 | All 6 sub-tasks complete. 947k parcels render on map, profile recolor via paint expression, drawer opens on tile parcel click (tileFeaturesToIntelParcel). 3 bugs found+fixed in 14-6 (camera-reset ×2, drawer ×1). See SD-12, SD-13 |
| **14a** | **PMTiles re-bake — all zoning columns** | **Shipped** | May 23 2026 | Full pyramid rebuild. Dropped zoning_score (prop_class fallback). Added 10 real zoning cols (zone_current, zone_future, normalized variants — migrations 0008/0009). 94 MB, 1.2M features, 100% D1 match rate. 5-parcel smoke test passed. |
| **14b** | **Lovable zoning overlay design** | **Shipped** | May 23 2026 | Lovable design pass: LayerTogglePanel, ZoningLegend, ParcelPopup, MapCanvas SVG mockup, zoning-mock.ts. ZONING_OVERLAY_HANDOFF.md written. PR #12 merged. |
| **14c** | **MapLibre wiring — zoning overlay to real PMTiles** | **Shipped** | May 23 2026 | SVG mockup replaced with real MapLibre Map. PMTiles vector source (parcels.pmtiles, source-layer: parcels). Data-driven fill-color expression (15-value BUCKET_FROM_D1_VALUE lookup). Current/Future setPaintProperty toggle. Parcel click → Parcel from tile props (zero API latency). zoning-mock.ts deleted; zoning.ts created. Build clean. SD-24 flagged (Open Space/Public upstream split). |
| **14c-data-fix** | **Source provenance popup + taxonomy-first normalize** | **Shipped** | May 24 2026 | SD-25: Vite dev proxy required for `/tiles/` Worker route — root cause of ~5 hr debug loop; fix: `server.proxy` in vite.config.ts. SD-26: `normalize_current()` now consults gp_taxonomy.yaml BEFORE ArcGIS REST; 12,956 corrected values across Herriman/Bluffdale/Grantsville/Vineyard/South Jordan. ParcelPopup: source provenance dot, confidence badge, flu_currency_note warnings. |
| **15** | **CRE listings ingest + spread calc + Deal Heat** | **Paused** | May 10 2026 | 15a scaffolding shipped (commits aa3ca00 + 00c9869). CRE platforms blocked: CREXI JS-render returns 0 rows, Land.com 403 from GHA IPs. County recorder output was UGRC assessor fallback, not real transactions. Paused per SD-14. Resume after Phase 18b ships. |
| 16 | Pipeline parcel-centric refinement using shipped scoring | Pending | — | Iterate based on real usage of post-13b scored parcels |
| 17 | Mailto/tel/outreach UI | Pending | — | Wired but inactive in current build |
| 18 | Site plan PDF vision (Claude vision reads agenda exhibit PDFs) | Pending | — | Structured extraction first (80% value), pixel overlay second |
| **18b** | **Zoning PDF vision — SPLIT into 18b-1 / 18b-2 / 18b-3 (see SD-15)** | **Active** | May 10 2026 | Original single-shot Opus PDF attempt discarded (unanchored hallucinations). Split into REST current-zoning track + georeferenced GP future-land-use track + integration closeout. |
| 18b-1 | Current zoning via ArcGIS REST | **Shipped** | May 11 2026 | 13-city GeoJSONs merged to main. Lehi 41.8% Other/Unknown flagged in _taxonomy_review_needed.md — normalization fix needed before 18b-3 D1 load. |
| 18b-2a | Future land use REST FLU extraction (Manus) | **Shipped** | May 11 2026 | 6 cities via REST (South Jordan, Lehi, Eagle Mountain, Saratoga Springs, American Fork, Tooele City). NLS source authority caveat flagged. 7 cities → PDF path (18b-2b/c). |
| 18b-2b | GP PDF pipeline prototype on Erda (CC Sonnet) | **Shipped** | May 14 2026 | `scripts/gp_pdf_extract.py` built (8 stages, all CLI flags). Erda result: RMSE 4664 ft, 0 features — source map is regional overview, not parcel-level. Pipeline mechanics verified. Erda marked `gp_data: regional_map_only`. Blocker for 18b-2c: production API key + parcel-level PDF for each city. Branch: `phase-18b-2b-pipeline-prototype`. |
| 18b-2c | GP PDF vector-tracing rollout (Spanish Fork + REST batch) | **Shipped** | May 16 2026 | Spanish Fork RMSE 38.6 ft (14 features). REST batch: Vineyard, Grantsville, Bluffdale, Draper. Herriman vector-tracing failed eye-test → moved to 18b-2d per SD-20. PR #11 open, merge user's call. |
| 18b-2d | Raster-overlay zoning extraction (CC Opus, supersedes vector tracing) | **Shipped** | May 18 2026 | Herriman 18b-2d-2 (Cam-KMZ): 28,195 parcels sampled, Herriman-only MUT 7.4%, South Jordan 78% (Olympia Hills — correct). bbox+whitelist fix. SD-21. PR #11 merged. |
| 18b-2e | Taxonomy harmonization + quality review (CC Sonnet) | **Shipped** | May 23 2026 | gp_taxonomy.yaml (5 current + 12 future city rule-sets). Migration 0009 (zone_current_normalized, zone_future_normalized, zone_future_secondary). Lehi 0% / Grantsville 5.3% / Spanish Fork 0% / Saratoga Springs 0% Other/Unknown after fix. Eagle Mountain '17.25' deferred (ordinance decode pending). NLS caveat accepted permanently. |
| 18b-3 | 18b integration: D1 migration + STRtree join + scoring + PMTiles | **Shipped** | May 22 2026 | Migration 0008 (7 cols). 227k zone_current + 193k zone_future loaded. /api/parcel/:apn augmented. PMTiles re-bake and spread_score deferred to 18b-2e + Phase 16. |
| 19 | NAIP land-cover analyzer | Pending | Re-eval ~Jul 25 2026 | 3-month stability before re-eval |
| 21 | PMN audio mp3 transcription pipeline (Whisper or Claude API) | Pending | — | Surfaces what was *said* beyond agenda text |

---

## Free Tier Limits & Cost Ceiling

**Hard ceiling: $25/mo total.** Current run rate: ~$8/mo (Workers Paid $5 + LLM ~$3).

| Service | Free tier | Current usage | Trigger to alert |
|---|---|---|---|
| Cloudflare Workers Paid | $5/mo flat | baseline | n/a (already paid) |
| D1 storage | 10 GB (Workers Paid) | ~250 MB (947k parcel rows + signals + watchlists) | >7 GB |
| R2 storage | 10 GB | ~93 MB (parcels.pmtiles) | >7 GB |
| R2 Class A ops (writes) | 1M/mo | ~1/rebuild | >500K/mo |
| R2 Class B ops (reads) | 10M/mo | TBD post-Phase 14 use | >5M/mo |
| GitHub Actions | 2000 min/mo (private) | ~50-100 min/mo | >1500 min/mo |
| Anthropic API | n/a | ~$3/mo | >$15/mo |

**Rule for any agent (CC, Manus, Lovable, Claude.ai)**: Before proposing any phase or scope change, estimate impact against this table. If projected usage crosses any "Trigger to alert" threshold, flag it explicitly in the proposal. Do not assume "we have headroom" — check.

---

## What's Active Right Now

**Phase 14a SHIPPED (May 23, 2026).** PMTiles re-baked with all 10 real zoning columns. Next: Phase 14b — Lovable design pass + paint-expression wiring for zone color overlay.

- **18b-1 through 18b-3 and 18b-2e** — all SHIPPED. 13-city current zoning + 12-city future GP/FLU in D1. Normalization columns populated (180,518 zone_current_normalized, 172,830 zone_future_normalized, 12,927 zone_future_secondary).
- **14a** — SHIPPED (May 23 2026). parcels.pmtiles rebuilt at 94 MB with 10 real zoning cols baked in. Deployed to R2, verified via Worker (HTTP 206 + magic bytes). 5-parcel smoke test passed including rezone-flip signal parcels.
- **Phase 14b** — Paint-expression wiring in Lovable (zone_current_normalized / zone_future_normalized color overlay, legend, profile toggle). No tile changes needed.

The spread between 18b-1 (current entitlement) and 18b-2 (future planned use) is the core rezone-flip signal — neither dataset alone is sufficient.

**Phase 15 PAUSED (May 10, 2026).** 15a scaffolding shipped but CRE platforms blocked and county recorder output was UGRC assessor fallback. See SD-14 for full rationale and resume-time data source candidates. Resume after 18b-1 + 18b-2 + ~2 weeks clean-score observation.

---

## Strategic Decisions Log

Append-only. Each entry shapes scope or order.

### SD-1 — County scope: 3 → 7 (May 6, 2026)
Original arch covered Tooele + Salt Lake + Utah. Expanded to add Davis, Weber, Wasatch, Box Elder.
Rationale: prospecting features (cross-parcel ownership lookup, "matching but not listed" inverse view) require multi-county base parcel coverage. Storage cost ~$2-4/mo at D1 rates. Signal collection scope unchanged at 13 jurisdictions.
Total parcels at full coverage: ~1.1M (after dedup, 947,863 unique).

### SD-2 — Phase 14 promoted to vector tiles (May 6, 2026)
Originally "scoring/integration with vector tiles flagged as no-action concern."
Promoted to "PMTiles + Tippecanoe REQUIRED DELIVERABLE" because 1.1M parcels at scale cannot render direct GeoJSON.
This means Phase 14 = tile pipeline, NOT scoring engine. The scoring engine shipped in Phase 11.

### SD-3 — Cloudflare Workers Paid plan upgrade (May 8, 2026)
Hit D1 free-tier 500 MB cap mid-Phase 13b. Upgraded to Workers Paid ($5/mo → 10 GB D1).
Net cost increase fits inside $25/mo project ceiling. Unblocks all post-13b phases without architectural gymnastics.

### SD-4 — Listings ingest sequence (settled Apr-May 2026)
Listings BEFORE scoring = Zillow clone (no differentiator).
Listings AFTER scoring = spread calc becomes meaningful, Deal Heat badge works, inverse "matching but unlisted" surface = highest-value owner-operator use case.
Order: scoring engine (Phase 11 done) → enrichment data (Phase 13b done) → vector tiles (Phase 14) → listings ingest (Phase 15).

### SD-5 — D1 storage architecture (crystallized through 13b)
**Pattern**: D1 holds parcel attributes only. Polygons stay in CSV files in `tooele-land-intel`. Files >90 MB compressed go to GitHub Releases (`large-parcels` tag).
**Reason**: D1 has a hard 100 KB statement size cap. Single parcel polygons can be 60+ KB. Even 10-row chunks fail for large polygons.
**Implication for spatial joins**: Joins must happen in Python against CSVs, not D1 SQL.

### SD-6 — D1_RESET_DO retry pattern (Phase 13b lesson)
**Pattern**: All D1 loaders use `for delay in 15 30 60` retry-with-backoff per chunk.
**Reason**: D1 Durable Objects reset transiently under high concurrency. Single 10s retry is insufficient. Three retries with exponential backoff handles >99% of resets.
**Reference implementation**: `wasatch-intel/.github/workflows/load_acs_join_to_d1.yml`.

### SD-7 — Manus handoff: push, not patch (Phase 13b lesson)
**Default**: Manus pushes branches directly to origin.
**Carve-out**: `.github/workflows/*` files require `workflow` OAuth scope which Manus's GitHub App lacks. For these specific files, Manus inlines YAML in PR description; CC commits the workflow file separately on the same branch.
**Anti-pattern**: Manus producing `.patch` files instead of pushed branches. If unavoidable, prompt CC explicitly: "git am the patches at [path] FIRST before anything else." See `docs/MANUS_PATCH_HANDOFF.md`.

### SD-8 — Independent verification of agent reports (Phase 13b lesson)
**Rule**: Do not trust agent reports of schema/migration/load work without independent verification.
**Specifics**: CC falsely reported 13b-1 complete on May 5 2026. Caught only when downstream sub-task ran gate queries against live D1. Manus Cloudflare MCP `set_active_account` consistently hangs — D1 verification ALWAYS falls to CC/wrangler. Manus is fine for Census/HTTP cross-checks.

### SD-9 — npm install -g wrangler in GHA (Phase 13b-3 lesson)
**Rule**: GHA workflows that run wrangler MUST install it globally (`npm install -g wrangler`), not locally (`npm install --no-save wrangler@latest`).
**Reason**: `wrangler d1 execute --remote --file <multi-statement>` silently exits 0 on Ubuntu runners with locally-installed wrangler — no rows written, no error reported. Caused a 4-run debugging cycle on 13b-3 before discovery. Global install fixes immediately.

### SD-10 — wrangler r2 object put requires explicit --remote (Phase 14-4 lesson)
**Rule**: All `wrangler r2 object put` commands in GHA workflows MUST include `--remote`.
**Reason**: Wrangler 4.86.0+ defaults `r2 object put` to LOCAL mode (Miniflare simulation). Without `--remote`, the command exits 0, prints "Upload complete," and writes to ephemeral runner storage that's discarded at job end. No error, no warning above stderr — only a quiet "Resource location: local" hint in stdout. D1 commands already require `--remote` explicitly (per existing patterns), but R2 silently degrades. Caught only because Phase 14-4 included a post-upload Worker-fetch verification gate.
**Reference**: Phase 14-4 full run #25594501499 (May 9, 2026). 93MB pmtiles file uploaded "successfully" to local Miniflare; Worker 404'd because R2 was empty.

### SD-13 — CC closeout requires push + deploy verification (Phase 14-6 lesson)
**Rule**: After CC reports a phase or sub-phase "COMPLETE," verify three artifacts independently before trusting the report: (1) commits exist on `origin/main` (not just local), (2) the deployment workflow triggered and succeeded, (3) the deployed Worker timestamp is AFTER the fix commit. CC's narrative reports of "committed and pushed" have twice missed steps in Phase 14 (R2 `--remote` flag in 14-4, `git push` in 14-6). Treat "COMPLETE" as a hypothesis to verify, not a closeout.
**Reference**: Phase 14-4 silent local R2 upload (May 9 2026); Phase 14-6 ref-based fix commit not pushed (May 9 2026).

### SD-11 — Vite-plugin pre-build required before wrangler deploy (Phase 14-2 lesson)
**Rule**: any GHA workflow or local script that calls `wrangler deploy` for `wasatch-intel` MUST run `npm run build` first.
**Reason**: `@cloudflare/vite-plugin` generates `dist/server/wrangler.json` at vite-build time, baking the current `wrangler.jsonc` bindings into the deploy artifact. `wrangler deploy` does NOT regenerate this — it deploys whatever bindings are already in `dist/`. Skipping the rebuild silently strips bindings added since the last build. Caught at 14-2 first deploy: R2 binding was in `wrangler.jsonc` but missing from the deployed Worker because `dist/server/wrangler.json` had `"r2_buckets":[]` from an earlier build.
**Reference**: 14-4 GHA workflow that uploads tiles via wrangler must include `npm run build` before any `wrangler deploy` step (the upload of `parcels.pmtiles` itself uses `wrangler r2 object put --remote`, no rebuild needed for that — but if the workflow ever redeploys the Worker, it must rebuild first).

### SD-12 — Phase 14 architecture decisions (May 8, 2026)
Decisions for the PMTiles + Tippecanoe pipeline, confirmed at 14-1 kickoff:

1. **Hosting**: Cloudflare R2 bucket `wasatch-intel-tiles`, served via Worker route `/tiles/:filename` for range-request passthrough + CORS + future auth flexibility. Not a custom R2 public domain.
2. **Attribute strategy**: bake the 8 static enrichment attributes (corner_score, aadt_score, zoning_score, commute_corridor_score, vacancy_class, median_income, prop_class, acreage) into tile features so paint expressions can recolor without rebuilding tiles. Preserve `setFeatureState` channel for dynamic overlays (pipeline stage, watchlist, Deal Heat, hover, selection).
3. **Build trigger**: GHA `workflow_dispatch` only. No cron until Phase 15+ usage signals appropriate cadence (per "use the tool first" principle from Phase 10 graduation).
4. **Polygon source**: CSVs in `tooele-land-intel/data/raw/` for small files + GH Release `large-parcels` for ≥90 MB compressed (per SD-5). The build workflow uses `gh release download large-parcels`, never just `git clone`.
5. **Sub-task split**: 6 sub-tasks (14-1..14-6) mirroring the 13b decomposition pattern. Each is one CC session.
6. **Scope reassignment**: the previous "Frontend ↔ API wiring + legacy cleanup" Phase 14 (pre-SD-2) is folded into Phase 16 (pipeline parcel-centric refinement).

### SD-14 — Phase 15 paused; scoring foundation precedes price surface (May 10, 2026)

Phase 15a shipped scraper scaffolding but produced no usable listing data: CREXI returns 0 rows
(JS-rendered SPA — requests/BeautifulSoup gets empty HTML shell), Land.com returns 403 Forbidden
from GHA Azure IPs (CoStar-owned, hard IP-reputation block). "County recorder" comps were
ugrc_lir_assessor_fallback output, not real arm's-length transaction data.

Deeper issue: building a price surface (spread calc, AVM proxy) on top of noisy parcel scoring
compounds error. 13b-5 used prop_class as a zoning fallback — this puts developed parcels and
major-highway parcels at the top of the score distribution incorrectly. Phase 18b (Opus reads
city zoning PDFs → real zoning GeoJSON) is the highest single-action fix to scoring quality.

Decision: pause Phase 15 until (1) Phase 18b ships real zoning data, (2) tool is in clean usage
for ~2 weeks to verify scores are stable, then reassess Phase 15 resume vs Phase 16 vs Phase 19.

"Comps" repositioned when Phase 15 resumes: listing-match feature → price-surface AVM proxy
(interpolate $/sqft across parcel surface from comparable sales within radius). Lower sensitivity
to match rate, coverage gaps, and ToS exposure than HTML scraping. Cleaner foundation required
first.

Resume-time data source candidates (evaluate when Phase 15 reactivates):
- License reactivation → Wasatch CMLS / IDX feeds. Structurally cleanest data path; gives sold
  comps with real transaction prices, not just asking-price proxies. Cost: CE course + reactivation fee.
- Brokerage-site reconnaissance. Buildout consolidates ~60% of Utah CRE brokerages
  (Colliers, Cushman & Wakefield, NAI, Mountain West, Marcus & Millichap, others) under one
  platform pattern. CBRE and JLL have proprietary platforms requiring separate scrapers. Recon
  task before any scraper build: catalog which platform each brokerage uses, count active
  listings per site, test which sites return 200 vs 403 from GHA Azure IPs.
- Apify CREXI actor as paid fallback (~$1.50/1k results, ~$20–80/mo realistic). Transfers ToS
  exposure to Apify; not eliminated. Lowest-effort path if recon shows brokerage scraping is
  high-cost.

Manus scripts (scrape_listings.py, scrape_comps.py) and workflow YAML remain in
tooele-land-intel as reusable scaffolding for resume.

### SD-15 — Phase 18b split: current zoning (18b-1) vs. future land use (18b-2) (May 10, 2026)

Manus's first attempt at Phase 18b (single-shot Opus PDF vision for current zoning) produced
unanchored hallucinated polygons. Verified against `tooele-land-intel/origin/phase-18b-zoning-extraction`:
4 of 13 cities (Grantsville, Lehi, American Fork, Spanish Fork) got polygons; all had
`confidence: 0.4`, `extraction_quality: 'low'`, 5-coordinate bounding boxes approximated from
"city name + named roads." Sample: American Fork RA-1 polygon = `[[-111.82, 40.405], ...]`, 5 coords.
The other 9 cities were skipped because their official sources were interactive ArcGIS web apps.

Root cause: Opus vision was fed PDF pages with no georeferencing signal. The model approximated
coordinates from "known geography" — no ground-truth anchor existed.

Split decision:

- **Phase 18b-1 (CURRENT zoning)** — Extract via ArcGIS REST endpoints. The 9 cities Manus skipped
  are the REST candidates. Standard FeatureServer query pattern from Phase 13b-5. No LLM calls.
  Tool: Manus. Output: `data/zoning/current/<city_slug>_zoning.geojson`.

- **Phase 18b-2 (FUTURE land use / general plan)** — Extract via georeferenced vision pipeline:
  PDF → pdf2image (300 DPI) → Opus identifies labeled street intersections in pixel space →
  resolve to lat/lng via OSM/UGRC → fit 6-parameter affine transform (numpy.linalg.lstsq) →
  project polygons drawn in pixel space into EPSG:4326. Reject any city where RMSE > 100 ft.
  Tool: Manus 18b-2a (REST FLU discovery) + opusplan 18b-2b (pipeline prototype on Erda) +
  CC Sonnet 18b-2c (batch rollout). Output: `data/zoning/future/<city_slug>_gp.geojson`
  with `confidence: 'anchored_approximation'`, `transform_residual_ft`, `n_control_points`.

- **Phase 18b-3 (integration)** — After 18b-1 + 18b-2 ship: D1 migration 0006_gp_zoning.sql,
  STRtree join, scoring re-run with new `spread_score` dimension, PMTiles re-bake. CC Sonnet.

Why the split matters for the rezone-flip thesis: the product surfaces parcels where current
zoning entitlement (18b-1) diverges from the GP's planned use (18b-2). A parcel zoned R-1-21
today + "future commercial" in the GP is the exact rezone-flip signal. Both data points are
required; neither alone is sufficient. Future land use (18b-2) is the higher-value half because
it is the leading indicator of rezoning pressure. Quality is non-negotiable — hallucinated polygons
actively mislead the scoring engine and degrade trust in the spread signal.

Cost ceiling: $15 for 18b-2 LLM (estimated actual ~$6–8). Checkpoint if projection exceeds $15.

Acceptance: ≥9 of 13 cities with `_gp.geojson` (≤4 may legitimately fail — no usable PDF source
or RMSE too high); all failures explicitly documented in `_quality_review.md` with reason.

Disposition of original 18b branch: `origin/phase-18b-zoning-extraction` on tooele-land-intel
deleted after archiving `_extraction_log.md` + `_taxonomy_proposal.md` to `docs/MEMORY_ARCHIVE.md`.
The hallucinated GeoJSONs are not mergeable. Extraction log and taxonomy table preserved as research
evidence — the zone code taxonomy is partially reusable for 18b-2d harmonization work.

Phase 15 sequencing: unchanged from SD-14. Resume after 18b-1 + 18b-2 ship + ~2 weeks clean-score
observation.

### SD-16 — Herriman deferred, 18b-2c proceeds without it (May 16, 2026)
Spanish Fork PDF extraction shipped at RMSE 38.6 ft, validating the pipeline-v2 methodology on standard-size maps. Herriman remained at RMSE 1017 ft due to large-format pixel-uncertainty in Claude vision; shipping at that error would tell users wrong zoning. Decision: defer Herriman (flag analogous to Erda's `regional_map_only`), proceed through remaining roster, then evaluate whether tile-refinement two-pass (~45–60 min CC work, documented in `docs/HERRIMAN_FOLLOWUP.md`) is worth the build vs. eye-test acceptance at 1017 ft. Bad data is worse than missing data.

### SD-17 — REST discovery pattern: owner-enumeration after planning-page check (May 16, 2026)
18b-2a Manus sweep missed Vineyard's and Grantsville's FeatureServers because it only checked planning pages, not ArcGIS Online owner catalogs. New canonical pre-check sequence for any "PDF-assumed" city: (1) probe planning page for embedded Experience apps → if found, query owner's public AGOL items; (2) even if planning page is PDF-only, search AGOL for org owners matching city name (e.g. `gis2_grantsville`, `Justin_JonesCivil` for Vineyard); (3) only after both come up empty, commit to PDF roster. Reduced 18b-2c PDF batch from ~7 cities to 2 (Bluffdale, Draper) without an Opus call.

### SD-18 — Stage 3 Overpass node-count quality gate needed (May 16, 2026)
Documented during Spanish Fork run: `Main.*St` regex within city_bbox + 0.05° buffer matches streets from adjacent cities. Documented more severely during Herriman GP Amendment re-attempt (May 16, 2026): Utah numbered-road grids (12600 S, 13400 S) return 342 shared nodes across the entire road regardless of which cross street is queried → all intersections on the same numbered road resolve to the same median point → degenerate affine transform. Fix options: (a) tighten CITY_BBOX_BUFFER_DEG to 0.01° for dense/grid cities, (b) add quality gate rejecting CPs where Overpass returns >20 nodes, (c) direct Nominatim intersection query bypassing Overpass for numbered-road intersections. Workaround: `--manual-cps`.

### SD-19 — Herriman PDF permanently deferred until Stage 3 fix (May 16, 2026)
Two extraction attempts on Herriman failed. Attempt 1 (tile-refine, 36×36 poster): RMSE 1051 ft — large-format pixel uncertainty. Attempt 2 (98-page GP Amendment, letter-format page 34): Stage 3 degenerate (SD-18 Overpass bug) → RMSE 0.0 ft false positive, 1 feature, unusable. Decision: Herriman deferred until one of the following: (a) Stage 3 SD-18 node-count fix implemented and tested, OR (b) manual pixel CPs provided for the 5100×3300 image of herriman_map7_p34.pdf (extracted from 98-page GP Amendment). Source PDF cached at `tooele-land-intel/data/_pdf_cache/herriman/`. PR #11 merge is user's call; Herriman will ship as a follow-on PR.

**Update (May 18, 2026)**: SD-19 superseded by SD-20. Herriman re-extracted under 18b-2d raster-overlay pipeline, not 18b-2c vector tracing.

### SD-20 — Raster-overlay extraction supersedes vector tracing for PDF cities (May 18, 2026)
Phase 18b-2c shipped 5 of 6 PDF cities via vector polygon tracing (Stage 2 vision identifies polygon boundaries, Stage 3 georeferences via control points, Stage 4–6 traces each polygon). Eye-test on Herriman (the one remaining city) revealed the approach is fundamentally fragile for satellite-basemap PDFs: polygons miss large areas (8-call cap), tracing accuracy depends on vision identifying boundary pixels precisely, and the validation signal (RMSE) is misleading when CP count equals affine unknowns. New approach (Phase 18b-2d): georeference the entire PDF raster, then sample pixel colors at parcel centroids and look up zone labels via a Claude-vision-extracted legend mapping. This produces per-parcel zone labels directly (which is what Wasatch Intel needs for scoring) and captures all zones automatically. Spanish Fork stays on 18b-2c (works as shipped, no refactor). Herriman + Erda + all future PDF cities go through 18b-2d. First 18b-2d run (Herriman, May 18 2026): 16,408 parcels labeled, 99.5% coverage, $0.22, 12.6 s. Pipeline: `tooele-land-intel/scripts/gp_raster_sample_extract.py`. Branch: `phase-18b-2d-raster-sample`.

### SD-22 — Release upload required for new county parcel files (May 22, 2026)
The `large-parcels` GH Release on `tooele-land-intel` is the canonical source for parcel CSV files >5 MB used by GHA workflows. When a new county parcel CSV is produced (scrape or update), it MUST be uploaded to the release before any D1 loader workflow references it:
```
gh release upload large-parcels <file.csv.gz> -R camsrigby-hash/tooele-land-intel --clobber
```
Discovered in 18b-3 pre-flight: `parcels_utah.csv.gz` (70 MB) and `parcels_tooele.csv.gz` (5.5 MB) were locally available in `data/raw/` (gitignored) but absent from the release — the load_zoning_to_d1.yml pre-flight step caught the gap and blocked execution. Added both files to the release before proceeding. All future GHA workflows that need county parcel files should check the release manifest first.

### SD-21 — Cam-KMZ georeferencing for satellite-underlay PDF maps (May 18, 2026)
For PDF zoning/GP maps that use a satellite-basemap underlay (Herriman Map 7 style), algorithmic georeferencing via 3 vision-picked control points produces too much misregistration for downstream color sampling. Phase 18b-2d failed for Herriman on this — RMSE >1000 ft, Mixed Use Towne Center over-assigned at 26.5%.
**Canonical workflow for such cities**: Cam manually overlays the source PDF as a Google Earth Pro GroundOverlay using local geography knowledge (named roads, city boundary, landmarks), exports KMZ at ~99% confidence. CC extracts the georeferenced raster from the KMZ and runs the existing 18b-2d color-sampling pipeline against it.
**Pipeline addition**: For cities whose FLU/GP map extends past city limits into planning area, CITY_CONFIGS must include a `parcel_city_whitelist` (not single-city filter) and a `bbox` matching the KMZ LatLonBox. Output features carry `flu_source_jurisdiction` to disambiguate when multiple cities' FLU maps overlap the same parcels.
**Cam-time per city**: ~15 minutes. Reusable for any future city whose GP map has satellite underlay, low-contrast colors, or rotation that defeats algorithmic CP-picking. Spanish Fork-style flat-color maps stay on fully-automated 18b-2d.
**Reference implementation**: `tooele-land-intel/scripts/herriman_cam_ingest.py`.
**Future flag**: bbox-too-tight pattern likely exists for other cities in CITY_CONFIGS. Audit before reusing Cam-KMZ workflow on next city.

### SD-24 — "Open Space/Public" normalized label needs upstream split in gp_taxonomy.yaml (May 23, 2026)

The D1 `zone_current_normalized` and `zone_future_normalized` columns contain the value `"Open Space/Public"` which conflates two distinct land-use categories that belong in separate 8-bucket slots:
- **Open space / parks / recreation** → should normalize to `open_ag`
- **Government buildings / schools / utilities / public facilities** → should normalize to `public_inst`

**Current behavior (Phase 14c):** `"Open Space/Public"` maps to `public_inst` (conservative parent). This is the safer v1 choice because miscoloring a school/utility green (open_ag) is a higher-cost prospector error than miscoloring a park blue (public_inst). However, it means some open-space parcels are colored blue instead of green.

**Upstream fix required:** Edit `gp_taxonomy.yaml` (in `tooele-land-intel`) to split `"Open Space/Public"` into two normalized values with distinct label strings (e.g. `"Open Space/Recreation"` → `open_ag` and `"Public/Government"` → `public_inst`). Re-run the normalization pipeline for the affected jurisdictions. Re-bake PMTiles. Update `BUCKET_FROM_D1_VALUE` in `src/lib/zoning.ts` to add the two new values and remove the combined one. This is a small fix (~30 min) but requires a data pipeline pass.

**Affected jurisdictions:** Any city whose GP/FLU data was classified as "Open Space/Public" — check with `SELECT zone_current_normalized, zone_future_normalized, jurisdiction FROM parcel_records WHERE zone_current_normalized='Open Space/Public' OR zone_future_normalized='Open Space/Public' GROUP BY jurisdiction ORDER BY COUNT(*) DESC`.

---

### SD-23 — D1 migration tracking must use `wrangler d1 migrations apply` (May 23, 2026)
**Rule**: All future D1 schema migrations MUST be applied via `wrangler d1 migrations apply` rather than `wrangler d1 execute --file`. The `migrations apply` command updates the `d1_migrations` tracking table; the `execute --file` path does not. If untracked migrations later collide with a tracked migration run, wrangler attempts to re-apply earlier migrations and hits duplicate-column errors.

**Recovery pattern** (if migration tracking is out of sync): Query `d1_migrations` to find which migration numbers are tracked, then insert missing rows:
```
wrangler d1 execute wasatch-intel-db --remote \
  --command="INSERT OR IGNORE INTO d1_migrations (name, applied_at) VALUES ('NNNN_filename.sql', 'YYYY-MM-DD HH:MM:SS');"
```
Do this for each untracked migration that is already applied to the schema, then re-run `migrations apply` — it will only apply the genuinely new migration.

**Reference incident**: Phase 18b-2e load, May 23 2026. Migrations 0007 and 0008 were applied via `execute --file` in phases 13b and 18b-3 respectively. When migration 0009 workflow ran `migrations apply`, wrangler tried to re-apply 0007 from scratch and hit `duplicate column name: commute_corridor_method`. Fixed by injecting tracking rows for 0007 and 0008 before re-running the workflow.

**Going forward**: All `d1-migrate-*.yml` GHA workflows must use `wrangler d1 migrations apply --remote`, never `wrangler d1 execute --file` for schema changes.

---

### SD-25 — Vite dev server ≠ Cloudflare Worker; proxy required for Worker-served endpoints (May 23, 2026)

The Vite dev server does not run Cloudflare Workers. Any endpoint served by a Worker in production (e.g. `/tiles/`) is unreachable from `localhost:5173` unless a proxy entry is added to `vite.config.ts`:

```ts
server: {
  proxy: {
    "/tiles": { target: "http://localhost:8080", changeOrigin: true },
  },
},
```

**Root cause of Phase 14c ~5-hour debug loop**: The zoning overlay showed black/missing tiles in dev because the MapLibre PMTiles source URL (`/tiles/parcels.pmtiles`) hit Vite directly and got a 404. The Worker serving the tiles was not in the Vite process. The fix was adding the proxy entry so Vite forwarded `/tiles/` requests to the local Worker process (wrangler dev, port 8080).

**Rule for future phases**: Any new Worker-backed route (`/api/`, `/export/`, etc.) added to `wrangler.jsonc` MUST have a matching `server.proxy` entry in `vite.config.ts` before attempting dev testing.

---

### SD-26 — `normalize_current()` must consult `gp_taxonomy.yaml` BEFORE trusting ArcGIS REST (May 23, 2026)

**Original (wrong) behavior**: `normalize_current()` in `scripts/load_zoning_to_d1.py` trusted the ArcGIS REST `zone_class_normalized` field first and only consulted `gp_taxonomy.yaml` for zones that returned `null` or `"Other/Unknown"`.

**Discovered failure**: Phase 14c smoke test found Herriman R-2-10 parcels (a residential zone, ~2-3 du/ac suburban SFR) classified as `Industrial/Flex` in D1. Root cause: ArcGIS REST was returning `"Industrial/Flex"` for R-2-10, and `normalize_current()` accepted it without checking the taxonomy.

**Full audit (Phase 14c)** surfaced **12,856 wrong parcel normalizations** across 5 jurisdictions:
- Herriman: R-2-10 (4,671), R-1-21 (837), R-20-43 (934), C-2 (2)
- Bluffdale: R-1-43 (2,573), R-1-10 (182), R-MF Multifamily (200), I-1 Light Industry (125), R-SL Residential (30)
- Grantsville: RM-15 (107)
- Vineyard: R-2-15 (82)
- South Jordan: R-M (3,099 total across R-M, R-M-4 through R-M-8, PD variants)

**Fix applied (Phase 14c data-fix)**: Inverted lookup order in `normalize_current()`. Taxonomy is now checked first; ArcGIS is the fallback for codes not covered by the taxonomy. Taxonomy entries added to `gp_taxonomy.yaml` for all 5 jurisdictions above.

**Rule for future phases**: Any new jurisdiction added to the current-zoning pipeline must have its common zone codes audited against the taxonomy before trusting the ArcGIS REST `zone_class_normalized` field. The ArcGIS field is a useful fallback, not a source of truth.

---

## Working Style

- **User strongly prefers agentic execution**: single bash blocks to paste, not click-by-click. Tools (gh CLI, git, file edits, GitHub API) over manual browser steps.
- **Two-tier orchestration**: User talks to Claude.ai (this chat) for planning + prompt drafting; Claude Code executes locally; Manus handles parallel sub-tasks; Lovable did initial frontend scaffolding (now dormant).
- **Session kickoff for CC** (every phase): paste exactly `cd C:/Users/camsr/code/wasatch-intel, then read docs/CC_BOOTSTRAP.md and begin.`
- **"Next prompt" workflow**: User says "next prompt please" in chat → Claude reads CURRENT STATE block at top of `docs/PROMPT_PLAYBOOK_ADDENDUM.md` → hands user paste-ready prompt + tool routing + model.
- **Windows path note**: CC opens in Desktop by default. Every CC prompt MUST start with `cd C:/Users/camsr/code/wasatch-intel`.

---

## Cross-References

This doc covers strategy and direction. For execution detail, see:

- `docs/PROJECT_STATE.md` — chronological PHASE_LOG (what shipped in each phase)
- `docs/PROMPT_PLAYBOOK.md` — original 10-phase plan briefs
- `docs/PROMPT_PLAYBOOK_ADDENDUM.md` — CURRENT STATE block (tells you the active phase) + per-phase amendments + completion notes
- `docs/CM_RE_INTEGRATION.md` — signal taxonomy + correlation guardrails
- `docs/MANUS_PATCH_HANDOFF.md` — Manus patch apply procedure (for the rare case when patches happen)
- `docs/MEMORY_ARCHIVE.md` — historical context that was evicted from Claude memory

---

## Future Opportunities

### Herriman internal FLU2022 layer (discovered May 16, 2026)
Herriman's GP Future Land Use data exists as a public-facing field `FLU2022` on their internal Enterprise GIS MapServer at `arcgis.herriman.org/arcgis/rest/services/Land_Use/MapServer/1`. The layer is firewall-blocked from external IPs and not exposed via Herriman's public AGOL org. If a Herriman City planning contact becomes available through broker network or GRAMA records request, a one-time GeoJSON export of this layer would flip Herriman from PDF-extraction to REST-grade coverage matching Vineyard/Grantsville/Bluffdale/Draper. Worth a polite email to Herriman planning: "I'm a local land broker building a market intelligence tool — would it be possible to get a one-time export of the current FLU layer in GeoJSON or shapefile format?" Land use data is public record under Utah GRAMA.

---

## Post-14c Hygiene Items

Small items surfaced during Phase 14c smoke-test debugging. None are blockers. Log here so they don't get lost before the next phase starts.

**a. Satellite basemap toggle** — Cam requested the ability to toggle the OSM basemap to satellite imagery for visual geography identification while scouting. Deferred during 14c smoke testing as scope creep. Future enhancement: small UI addition + raster source swap in MapCanvas.tsx. ~1 hr CC work.

**b. Mixed-Use Towne Center bucket split** — Herriman and other cities distinguish "Mixed Use - Towne Center" from regular "Mixed Use," but the 8-bucket taxonomy collapses both into `mixed_use`. The raw zone codes are preserved in D1; only the bucket display loses the distinction. Consider whether a 9th bucket (or sub-shade within `mixed_use`) is warranted. Defer until Cam reports prospecting friction from this collapse.

**c. NLS source authority audit** — Eagle Mountain, Lehi, and Saratoga Springs currently use `NLS_regional_study` for `zone_future_normalized`, flagged with `flu_currency_note='NLS_source_authority_unverified'`. Cam to verify each city's adopted GP matches the NLS layer by visiting each city's planning page. ~30 min Cam-time. If mismatched, queue PDF vision re-extraction for that city.

**d. SD-24 Open Space/Public upstream split** — Already in the SD log (SD-24). Reminder: split the `"Open Space/Public"` combined label into separate `"Open Space/Recreation"` and `"Public/Institutional"` normalized values in `gp_taxonomy.yaml` so parks and schools no longer share a bucket. Small fix but requires a data pipeline pass + PMTiles re-bake.

**e. flu_plan_vintage population** — Currently NULL in D1 for all parcels. Field is reserved in schema but never populated by any phase. Either populate from a future enrichment pass OR remove the field reference from ParcelPopup.tsx if not coming. Decision deferred.

**f. Phase 14a regression note** — Initial Phase 14a bake omitted the `jurisdiction` column despite the column existing in D1. Fixed in Phase 14c data-fix. Bake-script-vs-D1-schema drift is a pattern that could recur. Future column additions: always update both the load script AND the bake script in the same PR.

---

## Update history (newest first)

- **May 24, 2026** — Post-14c hygiene items logged (satellite toggle, MUT bucket split, NLS audit, SD-24 reminder, flu_plan_vintage decision, bake-script drift note). 14c-data-fix row added to Phase Ledger (SD-25 Vite proxy, SD-26 taxonomy-first normalize). CURRENT STATE → Phase 14 SHIPPED. Awaiting Cam decision on Phase 15 vs 16.
- **May 23, 2026** — Phase 14c SHIPPED. Zoning overlay wired to real PMTiles: MapLibre MapCanvas, BUCKET_FROM_D1_VALUE, zoning.ts, zoning-mock.ts deleted. SD-24 added (Open Space/Public upstream split). Phase Ledger rows 14b + 14c added. CURRENT STATE → Phase 14 complete.
- **May 23, 2026** — Phase 14b SHIPPED (Lovable). LayerTogglePanel, ZoningLegend, ParcelPopup, MapCanvas SVG mockup, ZONING_OVERLAY_HANDOFF.md. PR #12 merged.
- **May 23, 2026** — Phase 14a SHIPPED. PMTiles re-baked with all 10 real zoning columns (dropped zoning_score fallback). 94 MB, 1.2M features, 100% D1 match rate. Phase 14a row added to ledger.
- **May 18, 2026** — 18b-2d-2 (Herriman Cam-KMZ) SHIPPED. SD-21 appended (canonical Cam-KMZ workflow for satellite-underlay maps). Phase Ledger 18b-2d → Shipped. PR #11 merged (18b-2c + 18b-2d-2). herriman_gp.kmz / .geojson / _parcel_table.csv on main in tooele-land-intel.
- **May 18, 2026** — SD-20 logged. Phase 18b-2d (raster-overlay extraction) supersedes 18b-2c PDF pipeline for satellite-basemap cities. Herriman re-extracted under new approach: 16,408 parcels labeled, 99.5% coverage, $0.22, 12.6 s. Phase Ledger updated: 18b-2c → Shipped (Spanish Fork + REST batch); 18b-2d added → Active (raster-overlay); old 18b-2d (taxonomy) renumbered to 18b-2e. SD-19 marked superseded by SD-20.
- **May 16, 2026 (later still)** — Future Opportunities section added; Herriman internal FLU2022 lead documented.
- **May 16, 2026** — SD-18 (Overpass node-count bug) + SD-19 (Herriman permanent deferral) appended after Herriman GP Amendment re-attempt failed with degenerate Stage 3. SD-16 (Herriman deferral) + SD-17 (REST owner-enumeration pattern) appended after Phase 18b-2c Spanish Fork ship. Bluffdale REST pre-check completed (FeatureServer confirmed, moved off PDF roster; Draper is the sole remaining PDF city).
- **May 10, 2026** — Phase 18b split into 18b-1 / 18b-2 / 18b-3 (SD-15). Manus first attempt discarded (unanchored hallucinations). 18b-1 = REST current zoning; 18b-2 = georeferenced PDF future land use; 18b-3 = D1 + scoring + tiles integration.
- **May 10, 2026** — Phase 15 paused (SD-14). Phase 18b activated as next priority (replace prop_class fallback with real zoning via Opus PDF vision).
- **May 9, 2026** — Phase 14 shipped (vector tile pipeline, MapLibre wiring, click handler, drawer hydration via `tileFeaturesToIntelParcel`). Added SD-13 (push+deploy verification rule). Added Free Tier Limits & Cost Ceiling section. Phase Ledger row 14 → Shipped.
- **May 9, 2026** — Phase 14-4 fix: added `--remote` to `wrangler r2 object put` in `build_parcels_pmtiles.yml`. SD-10 logged: wrangler 4.86.0+ silently defaults R2 uploads to local Miniflare without `--remote`. Old SD-10 (Phase 14 arch decisions) renumbered to SD-12.
- **May 8, 2026** — Phase 14-2 shipped: R2 bucket `wasatch-intel-tiles`, `TILES` binding, `/tiles/:filename` Worker route with full HTTP Range support, all smoke tests passed. Worker version `f004e12c`. SD-11 logged: vite-plugin pre-build required before `wrangler deploy`.
- **May 8, 2026** — Phase 14 activated. Sub-task 14-1 shipped (operational brief written, stale Phase 14 section in PROMPT_PLAYBOOK_ADDENDUM.md replaced, 14-2..14-6 decomposed). SD-10 logged: hosting via R2 + Worker route, bake-with-feature-state-preserved attribute strategy, workflow_dispatch trigger, polygon source via SD-5 release pattern. Old "Frontend ↔ API wiring" scope folded into Phase 16.
- **May 8, 2026** — Initial creation. Triggered by memory entry #18 going stale (it framed scoring engine as "next active build" when scoring engine had shipped in Phase 11 and Phase 14 was actually vector tiles per SD-2).
