# Wasatch Intel — Project Direction

**Owner**: Cameron Rigby (camsrigby-hash). Land broker + developer, Wasatch Front + Tooele Valley, Utah.
**Last updated**: May 16, 2026 (Phase 18b-2c in progress; Bluffdale REST confirmed; SD-16 + SD-17 appended)
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
| **15** | **CRE listings ingest + spread calc + Deal Heat** | **Paused** | May 10 2026 | 15a scaffolding shipped (commits aa3ca00 + 00c9869). CRE platforms blocked: CREXI JS-render returns 0 rows, Land.com 403 from GHA IPs. County recorder output was UGRC assessor fallback, not real transactions. Paused per SD-14. Resume after Phase 18b ships. |
| 16 | Pipeline parcel-centric refinement using shipped scoring | Pending | — | Iterate based on real usage of post-13b scored parcels |
| 17 | Mailto/tel/outreach UI | Pending | — | Wired but inactive in current build |
| 18 | Site plan PDF vision (Claude vision reads agenda exhibit PDFs) | Pending | — | Structured extraction first (80% value), pixel overlay second |
| **18b** | **Zoning PDF vision — SPLIT into 18b-1 / 18b-2 / 18b-3 (see SD-15)** | **Active** | May 10 2026 | Original single-shot Opus PDF attempt discarded (unanchored hallucinations). Split into REST current-zoning track + georeferenced GP future-land-use track + integration closeout. |
| 18b-1 | Current zoning via ArcGIS REST | **Shipped** | May 11 2026 | 13-city GeoJSONs merged to main. Lehi 41.8% Other/Unknown flagged in _taxonomy_review_needed.md — normalization fix needed before 18b-3 D1 load. |
| 18b-2a | Future land use REST FLU extraction (Manus) | **Shipped** | May 11 2026 | 6 cities via REST (South Jordan, Lehi, Eagle Mountain, Saratoga Springs, American Fork, Tooele City). NLS source authority caveat flagged. 7 cities → PDF path (18b-2b/c). |
| 18b-2b | GP PDF pipeline prototype on Erda (CC Sonnet) | **Shipped** | May 14 2026 | `scripts/gp_pdf_extract.py` built (8 stages, all CLI flags). Erda result: RMSE 4664 ft, 0 features — source map is regional overview, not parcel-level. Pipeline mechanics verified. Erda marked `gp_data: regional_map_only`. Blocker for 18b-2c: production API key + parcel-level PDF for each city. Branch: `phase-18b-2b-pipeline-prototype`. |
| 18b-2c | GP PDF rollout to remaining 5 cities (CC Sonnet) | **Next** | — | Prerequisites: confirm PDF URLs (Grantsville, Bluffdale, Draper, Herriman, Spanish Fork); obtain `sk-ant-api03-...` key; pre-screen each PDF map for parcel-level detail. Use Batch API (50% discount). Grantsville recommended first. |
| 18b-2d | Taxonomy harmonization + quality review (CC Sonnet) | Pending | — | gp_taxonomy.yaml, spot-checks, _quality_review.md. |
| 18b-3 | 18b integration: D1 migration + STRtree join + scoring + PMTiles | Pending | — | After 18b-1 + 18b-2 ship. Adds gp_zone_normalized + spread_score dimension; re-bakes PMTiles. |
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

**Phase 18b-2b ACTIVE (May 11, 2026).** 18b-1 and 18b-2a shipped; prototype pipeline phase now active.

- **Phase 18b-1 SHIPPED**: 13-city current zoning GeoJSONs on main. Lehi normalization gap (41.8% Other/Unknown) flagged in `_taxonomy_review_needed.md` — fix before 18b-3 D1 load.
- **Phase 18b-2a SHIPPED**: 6-city GP FLU GeoJSONs on main (REST path). NLS source authority caveat documented in `_source_authority_caveats.md`. 7 cities on PDF path — see `_18b-2bc_scope.md`.
- **Phase 18b-2b ACTIVE**: opusplan builds `scripts/gp_pdf_extract.py` and validates georeferenced PDF extraction end-to-end on Erda. Target: ≥4 control points, RMSE ≤100 ft, 5/5 visual spot-checks. Branch: `phase-18b-2b-pipeline-prototype`. See PROMPT_PLAYBOOK_ADDENDUM.md Phase 18b-2 section for kickoff prompt.

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

## Update history (newest first)

- **May 16, 2026** — SD-16 (Herriman deferral) + SD-17 (REST owner-enumeration pattern) appended after Phase 18b-2c Spanish Fork ship. Bluffdale REST pre-check completed (FeatureServer confirmed, moved off PDF roster; Draper is the sole remaining PDF city).
- **May 10, 2026** — Phase 18b split into 18b-1 / 18b-2 / 18b-3 (SD-15). Manus first attempt discarded (unanchored hallucinations). 18b-1 = REST current zoning; 18b-2 = georeferenced PDF future land use; 18b-3 = D1 + scoring + tiles integration.
- **May 10, 2026** — Phase 15 paused (SD-14). Phase 18b activated as next priority (replace prop_class fallback with real zoning via Opus PDF vision).
- **May 9, 2026** — Phase 14 shipped (vector tile pipeline, MapLibre wiring, click handler, drawer hydration via `tileFeaturesToIntelParcel`). Added SD-13 (push+deploy verification rule). Added Free Tier Limits & Cost Ceiling section. Phase Ledger row 14 → Shipped.
- **May 9, 2026** — Phase 14-4 fix: added `--remote` to `wrangler r2 object put` in `build_parcels_pmtiles.yml`. SD-10 logged: wrangler 4.86.0+ silently defaults R2 uploads to local Miniflare without `--remote`. Old SD-10 (Phase 14 arch decisions) renumbered to SD-12.
- **May 8, 2026** — Phase 14-2 shipped: R2 bucket `wasatch-intel-tiles`, `TILES` binding, `/tiles/:filename` Worker route with full HTTP Range support, all smoke tests passed. Worker version `f004e12c`. SD-11 logged: vite-plugin pre-build required before `wrangler deploy`.
- **May 8, 2026** — Phase 14 activated. Sub-task 14-1 shipped (operational brief written, stale Phase 14 section in PROMPT_PLAYBOOK_ADDENDUM.md replaced, 14-2..14-6 decomposed). SD-10 logged: hosting via R2 + Worker route, bake-with-feature-state-preserved attribute strategy, workflow_dispatch trigger, polygon source via SD-5 release pattern. Old "Frontend ↔ API wiring" scope folded into Phase 16.
- **May 8, 2026** — Initial creation. Triggered by memory entry #18 going stale (it framed scoring engine as "next active build" when scoring engine had shipped in Phase 11 and Phase 14 was actually vector tiles per SD-2).
