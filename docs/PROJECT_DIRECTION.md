# Wasatch Intel — Project Direction

**Owner**: Cameron Rigby (camsrigby-hash). Land broker + developer, Wasatch Front + Tooele Valley, Utah.
**Last updated**: May 8, 2026 (Phase 14 activated; sub-task 14-1 shipped)
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
| **14** | **PMTiles + Tippecanoe vector tile pipeline** | **Active** | — | Sub-task split 14-1..14-6 (mirrors 13b). 14-1 ✓ 2026-05-08 (brief + stale doc fix). 14-2 next: R2 bucket + Worker tile route + wrangler binding. See SD-2, SD-10 |
| 15 | CRE listings ingest + spread calc + Deal Heat | Pending | — | Replit scraper port. Listings = signal type on parcel, not separate silo. Reverse-geocode to UGRC LIR, target 70%+ match |
| 16 | Pipeline parcel-centric refinement using shipped scoring | Pending | — | Iterate based on real usage of post-13b scored parcels |
| 17 | Mailto/tel/outreach UI | Pending | — | Wired but inactive in current build |
| 18 | Site plan PDF vision (Claude vision reads agenda exhibit PDFs) | Pending | — | Structured extraction first (80% value), pixel overlay second |
| 18b | Zoning PDF vision (Opus reads city zoning PDFs → GeoJSON) | Pending | — | One-time, $5–15. Replaces prop_class fallback in 13b-5 for B1 jurisdictions |
| 19 | NAIP land-cover analyzer | Pending | Re-eval ~Jul 25 2026 | 3-month stability before re-eval |
| 21 | PMN audio mp3 transcription pipeline (Whisper or Claude API) | Pending | — | Surfaces what was *said* beyond agenda text |

---

## What's Active Right Now

**Phase 14 — Vector tile pipeline.** Renders all 947,863 parcels (with the 8 enrichment columns) on the map at acceptable performance.

**Why this is next, not the scoring engine**: The engine shipped in Phase 11. Phases 13a/13b populated the data the engine consumes. The blocker now is presentation — MapLibre cannot render 1M raw GeoJSON polygons. PMTiles + Tippecanoe converts the data to a tile pyramid so the browser only loads what's visible at the current zoom.

**User's standing principle (from Phase 10 graduation)**: USE the tool for several weeks before firing the next phase. Phase 13b deferred this principle because data ingestion was a hard prerequisite for any meaningful use. Once Phase 14 ships and parcels are visible+scored on the map, this principle reactivates — pause before Phase 15.

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

### SD-10 — Phase 14 architecture decisions (May 8, 2026)
Decisions for the PMTiles + Tippecanoe pipeline, confirmed at 14-1 kickoff:

1. **Hosting**: Cloudflare R2 bucket `wasatch-intel-tiles`, served via Worker route `/tiles/:filename` for range-request passthrough + CORS + future auth flexibility. Not a custom R2 public domain.
2. **Attribute strategy**: bake the 8 static enrichment attributes (corner_score, aadt_score, zoning_score, commute_corridor_score, vacancy_class, median_income, prop_class, acreage) into tile features so paint expressions can recolor without rebuilding tiles. Preserve `setFeatureState` channel for dynamic overlays (pipeline stage, watchlist, Deal Heat, hover, selection).
3. **Build trigger**: GHA `workflow_dispatch` only. No cron until Phase 15+ usage signals appropriate cadence (per "use the tool first" principle from Phase 10 graduation).
4. **Polygon source**: CSVs in `tooele-land-intel/data/raw/` for small files + GH Release `large-parcels` for ≥90 MB compressed (per SD-5). The build workflow uses `gh release download large-parcels`, never just `git clone`.
5. **Sub-task split**: 6 sub-tasks (14-1..14-6) mirroring the 13b decomposition pattern. Each is one CC session.
6. **Scope reassignment**: the previous "Frontend ↔ API wiring + legacy cleanup" Phase 14 (pre-SD-2) is folded into Phase 16 (pipeline parcel-centric refinement).

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
- `docs/tli-full-spec.md §6` — granular feature backlog

---

## Update history (newest first)

- **May 8, 2026** — Phase 14 activated. Sub-task 14-1 shipped (operational brief written, stale Phase 14 section in PROMPT_PLAYBOOK_ADDENDUM.md replaced, 14-2..14-6 decomposed). SD-10 logged: hosting via R2 + Worker route, bake-with-feature-state-preserved attribute strategy, workflow_dispatch trigger, polygon source via SD-5 release pattern. Old "Frontend ↔ API wiring" scope folded into Phase 16.
- **May 8, 2026** — Initial creation. Triggered by memory entry #18 going stale (it framed scoring engine as "next active build" when scoring engine had shipped in Phase 11 and Phase 14 was actually vector tiles per SD-2).
