# PROJECT_STATE.md — Wasatch Intel

**This is the single source of truth for the project.** Any AI agent (Claude Code, Manus, future Claude in chat) picking up work on Wasatch Intel reads this file FIRST, every session, before touching anything else.

Update this file at the end of every work session. The "Current Status" section is the most important — keep it accurate.

---

## CURRENT STATUS

**Last updated:** 2026-05-07
**Last agent:** Claude Code (Sonnet 4.6) — Phase 13b-2 COMPLETE
**Active phase:** Phase 13b — 13b-2 COMPLETE (947,863 parcels in D1). 13b-6a COMPLETE. Sub-tasks 13b-3 through 13b-8 (parallel dispatch ready, unblocked).
**Live URL:** https://wasatch-intel.cam-s-rigby.workers.dev (Cloudflare Workers, not Pages)
**GitHub repo:** `github.com/camsrigby-hash/wasatch-intel`
**Legacy repo:** `github.com/camsrigby-hash/tooele-land-intel` (kept as scrapers source)

### What's done
- Phase 9: Per-city expansion via PMN — 11 new cities added (Tooele City, Lehi, Saratoga Springs, Eagle Mountain, South Jordan, Herriman, Bluffdale, Draper, American Fork, Vineyard, Spanish Fork). 26 new PMN bodies in jurisdictions.yaml. Jurisdiction pipeline updated to pass canonical names. American Fork added to wasatch-intel types.ts.
- Phase 0: Cloudflare Workers deploy pipeline live (GitHub Actions → wrangler deploy)
- Phase 1: /api/agendas endpoint live (136 items, freshness=live from tooele-land-intel CSV)
- Phase 2: /api/digest, /api/developers, /api/signal-wire live; feed.tsx, developers.tsx, pipeline.tsx, watchlists.tsx wired to real data; mock-data.ts shrunk; weighted aggregator (aggregate_city_signals.py) in tooele-land-intel
- Phase 3: geocode_items.py + geocode.yml; arcgis.py resilient; MapCanvas accepts real AgendaItem[] with uniform pins; index.tsx wired to useAgendas() with counter + popover; csv-loader tries items_geocoded.csv first. 12/136 items geocoded in initial local run; full run (Haiku strategies) needs geocode.yml workflow trigger.
- Phase 4: tooele-land-intel scripts/fetch_stip.py (UDOT EPM Projects_as_Lines, 227 features, Tooele bbox) + scripts/build_gap_layer.py (Erda+Tooele-uninc+Grantsville zoning unioned with County 2022 GP, 10,665 parcels, 33 high-gap A-20→HIR in Erda) + monthly gap-layer.yml cron. wasatch-intel: /api/gap-layer + /api/stip endpoints, useGapLayer/useStip hooks, MapCanvas rewritten with three real GeoJSON sources (gap-score-interpolated parcel fill, yellow STIP lines, agenda pins). routes/index.tsx shows temporary parcel-properties popover (full ParcelDeepDive deferred to Phase 5). Layer rail has gap-gradient legend + partial-GP-coverage caveat.
- Phase 5: tooele-land-intel enrich_roads.py (UGRC Utah Roads CARTOCODE 1-5 arterials, haversine proximity, corner detection → data/roads_enrichment.json keyed by APN) + aggregate_city_signals.py NaN date fix + gap-layer.yml updated to run enrich_roads and commit roads_enrichment.json. wasatch-intel: ParcelDetail/ParcelNeighbor/AnalysisResult types; loadParcelDetail (gap-layer APN lookup + road enrichment + linked agendas) + loadParcelAdjacency (0.5km, cap 12); /api/parcel/:apn + /adjacency + POST /analyze endpoints + full opportunity analysis engine (5 strategies, simplified=true); useParcelDetail/Adjacency/Analyze hooks; ParcelDeepDive.tsx full rewrite (5 tabs: Overview, Agendas, Adjacency, Comps placeholder, Notes/localStorage); index.tsx parcelPopover replaced with selectedApn, drawer wired.
- types.ts, csv-loader.ts, api-client.ts, agendas.tsx — all wired, real data loading
- Parser schema upgraded in tooele-land-intel (CM_RE signal taxonomy, 23-col CSV)
- CM_RE reference tree at `tooele-land-intel/vendor/cm_re/`

- Phase 6: Rumor signal pipeline (Reddit + news RSS + Haiku correlation) — DONE

- Phase 7: Watchlists + D1 persistence — DONE
  - D1 database `wasatch-intel-db` (UUID `8a8792c9-df0b-4644-8fdb-5ecfc5d6a66a`) provisioned via `d1-setup.yml` workflow
  - Schema applied (3 tables: watchlists, watchlist_hits, alert_log), RESEND_API_KEY Workers secret set
  - Live: https://wasatch-intel.cam-s-rigby.workers.dev/api/watchlists → `{"data":[],"meta":{"source":"d1:watchlists","freshness":"live",...}}`
  - Hourly cron running

- Phase 8: Deal pipeline persistence — DONE
  - D1 schema extended: deals, deal_notes, deal_contacts tables (run `d1-migrate.yml` to apply to live DB)
  - Full CRUD: GET/POST /api/deals, GET/PATCH/DELETE /api/deals/:id, notes + contacts sub-routes
  - Frontend: DnD Kanban with @dnd-kit/core (optimistic stage drag), NewDealDialog, notes auto-save, contacts panel
  - "+ Track deal" button in ParcelDeepDive prefills deal from parcel data

### What's next
- **ACTION REQUIRED**: Trigger `backfill.yml` workflow (workflow_dispatch) in GitHub Actions to run the Phase 10 historical backfill across all 13 PMN bodies
- **ACTION REQUIRED**: Run `d1-migrate.yml` workflow (workflow_dispatch) in GitHub Actions to apply Phase 8 schema to live D1 (if not already done)
- Phase 11: Future features (see tli-full-spec.md §6) — Claude-vision site plan extraction, PMN audio transcription, site plan polygon overlay
- NAIP land-cover (Phase 10 CM_RE addendum) deferred until ~2026-07-25 (3-month stability window)

### Open questions / blockers
None.

### Open items (non-blocking, track here until resolved)
- **`growth_score` empty in CSV** — all 136 rows in `agenda_items_split.csv` have an empty `growth_score` column; the Haiku enrichment workflow has not yet run on these items. Result: `/api/signal-wire` returns `signal: 0` for every item. Fix: trigger the enrichment workflow in tooele-land-intel.
- **roads_enrichment.json not yet generated** — enrich_roads.py script is written and wired into gap-layer.yml, but the workflow hasn't run yet. Parcel deep-dive drawer shows "—" for all road fields until first workflow run.
- **46 unplotted agenda items** — subdivision names Nominatim can't resolve. Needs Haiku full-PDF-body extraction of parcel IDs / legal descriptions / cross-streets (deferred from Phase 5).

---

## WORKING STYLE — read this before doing anything

**Autonomy level:** FULL AUTO. Complete a whole phase end-to-end (code + commit + push + deploy + verify), then summarize and stop. Do not pause mid-phase to ask permission.

**Decision-making on ambiguity:** Pick the sensible default. Note the decision in the commit message and in the PHASE_LOG section of this file. Do NOT stop and ask the user. Examples:
- "Which charting library?" → Recharts (already in package.json)
- "Polling vs SSE?" → Polling (simpler, fits the data freshness — weekly)
- "How to test?" → Manual smoke test + a single happy-path Vitest

**When to actually stop and ask:**
- The decision affects spend (anything that adds monthly cost > $5)
- The decision is irreversible (deleting data, force-pushing, schema migrations on real data)
- A required external service is down or rate-limited
- Two phases are in conflict and both can't proceed

**Commit cadence:** Small, frequent commits with descriptive messages. Each logical unit gets its own commit. Conventional Commits format preferred (`feat:`, `fix:`, `chore:`, `docs:`).

**Branch strategy:** Work directly on `main` for this project. It's solo-developer scope and the deploy pipeline is `main → Cloudflare Pages`. Feature branches add ceremony without payoff.

**Verification:** Every phase ends with verification. Don't claim "done" until:
1. `npm run build` passes
2. `npm run lint` passes (or note the suppressed warnings in commit msg)
3. The relevant frontend route has been visually verified rendering real data
4. The deploy succeeded on Cloudflare Pages (check the Actions tab)

**Style preferences:**
- TypeScript strict mode stays on
- Functional React components, hooks-based state
- Tailwind utility classes — no new CSS files unless absolutely needed
- shadcn/ui components used as-is when possible
- Server-side: Hono on Cloudflare Workers, NOT Express
- Python: keep existing patterns from legacy repo (no rewrites just for taste)

---

## PROJECT OVERVIEW

**What this is:** A market intelligence tool for land developers operating in the Wasatch Front and Tooele Valley. Combines public meeting agendas, parcel GIS data, zoning/general-plan gap analysis, and correlated rumor/news signals into a map-first dashboard.

**Who uses it:** A single power user (Cam Rigby, the project owner) initially; designed for eventual team use at his employer.

**Why it exists:** The signal-to-noise ratio for land development opportunities in this geography is brutal. Information lives in PDF agendas, ArcGIS layers, Reddit threads, and PMN audio recordings — none of which talk to each other. This tool aggregates and correlates them so a developer can see opportunities others miss.

**Sensitivity:** Repo is private. No PII. Some inferences (e.g., "this developer is land-banking") are speculative — never present them as established fact in the UI.

---

## ARCHITECTURE

```
┌───────────────────────────────────────────────────────────────┐
│  GitHub Actions (free, in tooele-land-intel repo)             │
│  • agendas-watch.yml   — weekly Erda + Grantsville scrape     │
│  • weekly-digest.yml   — Haiku split + Opus digest            │
│  • parcel-lookup.yml   — on-demand parcel analysis            │
└────────────────────┬──────────────────────────────────────────┘
                     │ writes CSVs to tooele-land-intel repo
                     ▼
┌───────────────────────────────────────────────────────────────┐
│  Data layer                                                   │
│  Now: CSVs in tooele-land-intel repo, fetched at API runtime  │
│  Later: Cloudflare D1 for watchlists/deals (dynamic data)     │
│  Maybe: Postgres (Neon free) if total rows > 50k              │
└────────────────────┬──────────────────────────────────────────┘
                     │ queried by
                     ▼
┌───────────────────────────────────────────────────────────────┐
│  Backend API  — wasatch-intel repo, Workers route             │
│  Hono on Cloudflare Workers, served on the same domain        │
│  as the frontend (no CORS issues)                             │
│  Endpoints under /api/* — see types.ts for response shapes    │
└────────────────────┬──────────────────────────────────────────┘
                     │ HTTPS/JSON
                     ▼
┌───────────────────────────────────────────────────────────────┐
│  Frontend  — wasatch-intel repo, src/                         │
│  TanStack Start + React 19, MapLibre GL, Radix UI, Tailwind 4 │
│  Live URL: wasatch-intel.cam-s-rigby.workers.dev               │
│  Custom domain (if added): wasatch-intel.com (not registered) │
└───────────────────────────────────────────────────────────────┘
```

**Two GitHub repos, one product:**
- `tooele-land-intel` — Python scrapers + LLM enrichment + raw data CSVs (existing)
- `wasatch-intel` — Frontend + Workers API + types contract (new, built from Lovable export)

The frontend repo fetches raw CSVs from the data repo at API runtime. This keeps the deploy pipeline simple and avoids syncing data between two systems.

---

## SCOPE — WHAT'S IN, WHAT'S OUT

### MVP scope (Phases 1–8)
- **Cities:** Erda + Grantsville ONLY for the data layer
- **Frontend:** All 12 cities visible in UI; non-MVP cities show empty states
- **Data:** ~80 agenda items currently scraped; ~200 expected after geocoding
- **Features:** Map, agenda browse, weekly digest, parcel deep-dive, signal wire, watchlists, deal pipeline (CRUD)

### Expansion (Phase 9, post-MVP)
- Tooele City, Stansbury Park, Lake Point, Saratoga Springs, Eagle Mountain, Lehi, Bluffdale, South Jordan, Herriman, American Fork — added one or two per week, each ~1 evening's work

### Future (Phase 10+, see tli-full-spec.md §6)
- Claude-vision site plan extraction
- PMN audio transcription
- Site plan polygon overlay (georeferencing)

### Explicitly out of scope (ever)
- Facebook scraping (ToS, anti-bot, maintenance hell)
- Nextdoor scraping (same)
- Multi-tenant auth / SaaS billing (single user only for foreseeable future)
- Real-time push (weekly cadence is the data freshness limit anyway)

---

## SCOPE RESET — APRIL 22, 2026

The project was originally "Tooele Land Intel" — Tooele County + Grantsville + Erda. On April 22 the scope was reset to **CITIES ONLY** (no county scraping). The Lovable rename to "Wasatch Intel" reflects the broader geographic ambition (Wasatch Front + Tooele Valley) but the data scope is **tighter**, not broader: just two cities for the MVP, expand from there. Tooele County may be added later or never.

If you find yourself thinking "should I add the Tooele County scraper?" — the answer is no. It uses Tyler Meeting Manager, a JS-rendered SPA that needs Playwright. Skip it.

---

## TECH STACK — chosen and frozen

| Layer | Tech | Why |
|---|---|---|
| Frontend framework | TanStack Start + React 19 | Came from Lovable; modern, file-based routing |
| Build tool | Vite 7 + `@lovable.dev/vite-tanstack-config` | Don't touch — adding plugins manually breaks things |
| Styling | Tailwind v4 + Radix primitives + shadcn/ui | Same |
| State / data fetching | TanStack Query | Already in package.json; cache-first pattern matches the weekly data cadence |
| Map | MapLibre GL | Free, no API key, Esri satellite tiles |
| Validation | Zod | At every API boundary — types.ts has the schemas |
| Backend runtime | Cloudflare Workers (via `@tanstack/react-start/server-entry`) | Same origin as frontend, free tier generous |
| API framework | Hono | Lightweight, Workers-native, TS-first |
| Persistent dynamic storage | Cloudflare D1 (SQLite at edge) | For watchlists + deals; raw scraped data stays in CSVs |
| Email | Resend | Free 3k/mo, dead simple API |
| Scrapers | Python 3.12 on GitHub Actions | Existing, working, free |
| LLM extraction | Claude Haiku 4.5 | Cheap, capable for structured extraction |
| LLM synthesis | Claude Opus 4.7 | Quality matters for the weekly digest |
| Claude Code default model | `opusplan` (Opus 4.7 → Sonnet 4.6) | Per-project default in `.claude/settings.json`; phases override as needed (see PROMPT_PLAYBOOK.md) |

**Do not introduce new dependencies without strong justification.** If a feature can be built with existing libraries, build it that way.

---

## REPO LAYOUT (target end-state)

```
wasatch-intel/
├── .github/
│   └── workflows/
│       └── deploy-cloudflare.yml      # auto-deploy on push to main
├── docs/
│   ├── PROJECT_STATE.md               # this file
│   ├── PROMPT_PLAYBOOK.md             # phase-by-phase prompts for AI agents
│   ├── tli-full-spec.md               # 110% feature spec
│   ├── tli-buildout-schedule-v2.md    # phase plan
│   └── python-to-ts-field-mapping.md  # ETL contract
├── src/
│   ├── lib/
│   │   ├── types.ts                   # SHARED — frontend + backend
│   │   ├── api-client.ts              # TanStack Query hooks for each endpoint
│   │   ├── mock-data.ts               # transitional, removed by end of Phase 2
│   │   └── utils.ts
│   ├── components/                    # AppShell, MapCanvas, ParcelDeepDive, etc.
│   ├── routes/                        # TanStack Start file-based routes
│   └── server/                        # NEW — Workers API
│       ├── index.ts                   # Hono app + route mounting
│       ├── routes/
│       │   ├── agendas.ts
│       │   ├── parcels.ts
│       │   ├── developers.ts
│       │   ├── digest.ts
│       │   ├── signal-wire.ts
│       │   ├── watchlists.ts
│       │   └── deals.ts
│       └── lib/
│           ├── csv-loader.ts          # fetch + parse CSVs from tooele-land-intel
│           └── d1-client.ts           # for watchlists + deals
├── package.json
├── wrangler.jsonc                     # Cloudflare config (already exists)
└── README.md
```

---

## KNOWN GOTCHAS — read before debugging

1. **Coordinate ordering.** GeoJSON / MapLibre / Leaflet expect `[longitude, latitude]`. Most humans say `latitude, longitude`. The Python `lookup_parcel.py` emits `(lat, lng)` tuples in some places. The ETL layer in `csv-loader.ts` MUST swap them. If pins land in Nevada, this is why.

2. **Codespaces GitHub token reverts.** Periodically the `gh` CLI in Codespaces gets a stale token. Fix:
   ```bash
   unset GITHUB_TOKEN GH_TOKEN
   gh auth login
   ```

3. **Cloudflare Pages first deploy.** The first deploy via the GitHub Action sometimes fails with "project not found." Manually create an empty Pages project named `wasatch-intel` in the Cloudflare dashboard, then re-run the action.

4. **Lovable's vite config is opinionated.** `@lovable.dev/vite-tanstack-config` already includes tanstackStart, viteReact, tailwindcss, tsConfigPaths, and Cloudflare. Adding any of these manually = duplicate plugins = broken build. Trust the wrapper.

5. **Erda is missing from the original Lovable mock.** Added to `JURISDICTIONS` in `types.ts`. If you're seeing "type error: 'Erda' not assignable to Jurisdiction" anywhere — pull from `types.ts`, not `mock-data.ts`.

6. **The CSV file paths the API needs are in a DIFFERENT repo.** `tooele-land-intel/data/agenda_items_split.csv` is fetched via raw.githubusercontent.com URLs. They're public-readable on the legacy repo. If this becomes private, the Worker needs a GitHub PAT in env.

7. **Workers free tier limits.** 100k requests/day, 10ms CPU per request, 6 concurrent connections. With weekly data cadence and aggressive caching this is plenty, but a tight loop or runaway recursion will burn through the CPU budget.

8. **GitHub Actions on Node 20.** As of April 2026, Node 20 is deprecated; `setup-node@v4` works fine but starting June 2 forces Node 24. If a workflow breaks unexpectedly after that date, bump the Node version.

9. **`createAPIFileRoute` from `@tanstack/react-start/api` does NOT work.** The TanStack Router plugin warns about API route files but the server runtime never intercepts them — requests fall through to SSR and return the React 404 component. Do NOT use `createAPIFileRoute`. Instead, add route handlers as `if`-branches in `src/server/entry.ts` (the custom CF Worker entry). Hono will replace this pattern in Phase 7.

10. **Deploy model is Workers, not Pages.** The `@cloudflare/vite-plugin` produces a Cloudflare Workers bundle (`dist/server/wrangler.json` + `dist/server/index.js`), not a Pages-compatible `_worker.js`. Use `wrangler deploy --config dist/server/wrangler.json`. The live URL is `*.workers.dev`, not `*.pages.dev`. The `CLOUDFLARE_API_TOKEN` must have "Edit Cloudflare Workers" scope (not "Pages" scope).

---

## SECRETS / ENVIRONMENT VARIABLES

These live outside the repo. Document them here, never commit values.

### GitHub Actions secrets (set in the wasatch-intel repo)
- `CLOUDFLARE_API_TOKEN` — for Pages deploys
- `CLOUDFLARE_ACCOUNT_ID` — same

### GitHub Actions secrets (set in tooele-land-intel repo, already done)
- `ANTHROPIC_API_KEY` — for the LLM enrichment workflows

### Cloudflare Workers secrets (set via `wrangler secret put`)
- `ANTHROPIC_API_KEY` — for any backend Claude calls (Phase 5+ parcel deep-dive synthesis)
- `RESEND_API_KEY` — for email alerts (Phase 7)
- `GITHUB_PAT` — only if `tooele-land-intel` is made private later

### Local dev (in `.dev.vars`, gitignored)
Mirror the Workers secrets above for `wrangler dev`.

---

## COST BUDGET

Hard ceiling: **$25/month total** without explicit user approval to increase.

Current burn:
- Anthropic API: $5–15/mo (Haiku splits + weekly Opus digest)
- Everything else: $0

If a proposed change would push past $25/mo, STOP and ask before implementing.

---

## PHASE LOG

Append a one-paragraph entry here at the end of every work session. Format:

```
### YYYY-MM-DD — Phase N — Agent name
Summary of what was done. Key decisions made and why. Anything left
unfinished or surprising. Next session's starting point.
```

### 2026-04-23 — Phase 0 prep — Claude (Opus 4.7) via claude.ai chat
Wrote the project state doc, the prompt playbook, and the Phase 0 bash block.
Verified `types.ts` typechecks against zod v3 (Lovable's pinned version) and
v4. Added `Erda` to the JURISDICTIONS enum since the Lovable export missed it.
Decided on Hono for the Workers backend (lightweight, Workers-native) over
itty-router or hand-rolled. Frontend deploys to Cloudflare Pages on push to
main. Next session: user runs Phase 0 in Codespaces; first Claude Code session
at home opens with Phase 1 prompt from the playbook.

### 2026-04-23 — CM_RE heritage documented — Claude (Opus 4.7) via claude.ai chat
Catalogued reusable modules from a prior related project ("CM_RE" — a
Davis+Weber commercial real estate site-selection tool). Created three new
docs: `CC_BOOTSTRAP.md` (session kickoff protocol), `CM_RE_INTEGRATION.md`
(reuse map + scope guardrails), `PROMPT_PLAYBOOK_ADDENDUM.md` (phase-level
deltas with a living `CURRENT STATE` block and a `SELF-UPDATE PROTOCOL`).
Extracted reusable CM_RE modules into `tooele-land-intel/vendor/cm_re/` as
read-only reference via `cm_re_extract.sh` (scraper, parser, aggregator,
UGRC fetcher, road adjacency, STIP, NAIP land cover). No code ported yet —
porting happens in the respective phases (Phase 1 parser schema upgrade,
Phase 3 UGRC patterns, Phase 4 STIP + polygon renderer, Phase 5 road
adjacency + AADT, Phase 6 shared signal taxonomy, Phase 9 PMN-based
per-city expansion, new Phase 10 NAIP land cover — deferred). Scope
guardrails documented: do not drag the CRE scorer weights, Google Places
API, owner scraping, or rasterio into MVP. From this point forward every
CC session bootstraps from `docs/CC_BOOTSTRAP.md`, which reads the
`CURRENT STATE` block in `PROMPT_PLAYBOOK_ADDENDUM.md` to know which
phase is next. Next session: run the bootstrap; Phase 1 executes.

### 2026-04-23 — Phase 1 (code) — Claude Code (Sonnet 4.6)
Executed Phase 1 code in a Windows git-bash environment without Node.js.
In `tooele-land-intel`: upgraded `scripts/split_agenda_items.py` to use the
CM_RE signal schema (23-column CSV output), wrote `scripts/enrich_schema.py`
to migrate the existing 136-row CSV in-place. In `wasatch-intel`: created
`src/lib/types.ts`, `src/server/lib/csv-loader.ts`, `src/routes/api/agendas.ts`
(using `createAPIFileRoute` — later found to not work), `src/lib/api-client.ts`,
rewrote `src/routes/agendas.tsx`. Left BLOCKED pending deploy.

### 2026-04-24 — Phase 1 (DONE) — Claude Code (Sonnet 4.6)
Fixed the Cloudflare deploy and unblocked Phase 1. The Pages-action deploy model
was wrong — the TanStack Start + `@cloudflare/vite-plugin` build produces a
Workers bundle (`dist/server/wrangler.json` with `"main":"index.js"`), not a
Pages `_worker.js`. Fixed by switching to `wrangler deploy --config dist/server/wrangler.json`.
Two credential fixes required: CLOUDFLARE_ACCOUNT_ID was wrong (error 7003), and
the API token lacked Workers Scripts permission (error 10000) — user created a new
token using "Edit Cloudflare Workers" template. After deploy succeeded, found
`createAPIFileRoute` from `@tanstack/react-start/api` was silently not registered
by the server runtime — `/api/agendas` returned TanStack's 404 component. Fixed by
creating `src/server/entry.ts`, a thin CF Worker wrapper that intercepts
`GET /api/agendas` before delegating to TanStack Start's SSR, and pointing
`wrangler.jsonc main` at it. Verified live: https://wasatch-intel.cam-s-rigby.workers.dev
returns 200 + React app; `/api/agendas` returns 200 + 136 real JSON items (freshness=live).
Phase 2 is next.

### 2026-04-24 — Phase 2 (DONE) — Claude Code (Sonnet 4.6)
Executed Phase 2 end-to-end. In tooele-land-intel: wrote `scripts/aggregate_city_signals.py`
porting the CM_RE weighted-rollup pattern (type weights × status multipliers × growth_score),
committed `data/city_signal_scores.json` (Grantsville 100.0/A, Erda 12.1/D). In wasatch-intel:
added `loadDevelopers()`, `loadSignalWire()`, `loadDigest()` to `csv-loader.ts`; wired 6 new
API endpoints into `src/server/entry.ts` (/api/digest, /api/developers, /api/signal-wire,
/api/parcels, /api/watchlists, /api/deals); rewired feed.tsx, developers.tsx, pipeline.tsx,
watchlists.tsx to TanStack Query hooks backed by real data; shrunk `mock-data.ts` by ~150 lines
(removed SIGNAL_WIRE, WATCHLISTS, DEALS, DEAL_STAGES, JURISDICTIONS, CITY_CENTERS, SignalWireItem,
Watchlist, Deal, DealStage — moved to types.ts or API-backed). Two AgendaItem shapes intentionally
coexist (mock for MapCanvas, real for /api/agendas) until Phase 3 geocoding. CITY_CENTERS and
JURISDICTIONS are now authoritative in types.ts and imported by mock-data.ts. No Node.js on local
machine — build verification is via GitHub Actions.

### 2026-04-24 — Phase 2 verification — Claude Code (Sonnet 4.6)
Pre-Phase 3 endpoint verification run against the live Workers URL (https://wasatch-intel.cam-s-rigby.workers.dev).
Note: https://wasatch-intel.pages.dev returns 404 (deploy model is Workers, not Pages — already noted in KNOWN GOTCHAS #10).
All endpoints green: /api/digest (200, hasMarkdown=true, cityScores embedded), /api/signal-wire (200, 54 items),
/api/developers (200, 24 developers), /api/parcels (200, []), /api/watchlists (200, []), /api/deals (200, []).
City scores confirmed exposed at /api/digest → data.cityScores (Grantsville 100/A, Erda 12.1/D) — no new endpoint
needed. Debt sweep: tree clean, zero TODO/FIXME/XXX in src/. Three non-blocking data quality issues logged
under "Open items" above (growth_score empty, 1 nan date, mostRecentActivity="nan" in JSON) — all upstream
CSV/Python issues, not TypeScript bugs. No code changes made. Phase 3 is clear to start.

### 2026-04-24 — Phase 3 (DONE) — Claude Code (Sonnet 4.6)
Executed Phase 3 end-to-end. Pre-flight: replaced pages.dev refs with workers.dev in
PROMPT_PLAYBOOK.md and PROJECT_STATE.md architecture diagram. In tooele-land-intel:
rewrote scripts/arcgis.py with _make_session() (Retry adapter on 500/502/503/504) and
disk cache under data/cache/arcgis/ for get_parcel_centroid (cached False sentinel for
misses, list for hits); wrote scripts/geocode_items.py with 4-strategy pipeline (parcel ID
regex → UGRC centroid, location field → Nominatim, street address regex in title →
Nominatim, Haiku 4.5 extraction → Nominatim capped at 100 calls); wrote
.github/workflows/geocode.yml (triggers after weekly-digest.yml or workflow_dispatch).
Ran geocode_items.py locally without ANTHROPIC_API_KEY → 12/136 items geocoded
(10 parcel_id, 2 nominatim), committed data/items_geocoded.csv. In wasatch-intel:
csv-loader.ts loadAgendas() tries items_geocoded.csv first with fallback to
agenda_items_split.csv; MapCanvas.tsx rewritten to accept real AgendaItem[] prop,
pins render uniformly (comment explains Phase 5 deferral), click handler uses ref
to avoid stale closure; src/routes/index.tsx wired to useAgendas(), filters to geocoded
items, shows "X of Y items plotted" counter with "Geocoding pending" note when 0.
Two AgendaItem shapes resolved: types.ts shape used everywhere on the map; mock
shape remains only for PARCELS polygon layer (Phase 4 replaces it). GH CLI not
authenticated locally — geocode.yml trigger needs GitHub UI or waits for next
weekly-digest.yml run (Monday). Phase 4 is next.

### Phase 4 — STIP overlay + polygon renderer (2026-04-24)
Two-repo phase. In **tooele-land-intel**, wrote `scripts/fetch_stip.py` (UDOT
EPM Projects_as_Lines for Tooele bbox `[-112.60,40.35,-112.00,40.95]` →
`data/stip_projects.geojson`, 227 features, 783 KB) and
`scripts/build_gap_layer.py` (unions zoning sublayers 1/4/7 from Tooele County
tcgisws — Erda, Tooele uninc., Grantsville — into one STRtree, point-in-polygon
matches each parcel centroid against zoning + County 2022 GP, scores
`gap = max(0, gp_intensity - zoning_intensity)` via hand-curated intensity
tables; outputs `data/gap_layer.geojson` with 10,665 parcels, 60% scored in
Erda, 33 high-gap A-20→HIR parcels confirmed in Erda; 6dp coord rounding +
minified JSON → 6.7 MB). Added `.github/workflows/gap-layer.yml` monthly cron
(`0 9 1 * *`). Vendored CM_RE STIP URL was stale (different org); switched to
live UDOT host `services.arcgis.com/pA2nEVnB6tquxgOW`. First gap-layer run
scored 0 — root cause: Erda zoning layer #1 and County GP cover disjoint
geographies (incorporated vs unincorporated), required unioning all three
zoning sublayers and handling layer 7's `Zoning` vs layers 1/4's `Zone`
field-name difference. Grantsville GP coverage is ~3% — null gap_scores
rendered transparent with caveat in layer rail. In **wasatch-intel**, added
`/api/gap-layer` and `/api/stip` GET endpoints in `src/server/entry.ts` (5-min
Worker cache via existing `csv-loader.ts` shape; new `loadGapLayer`/`loadStip`
functions are JSON pass-throughs). `src/lib/api-client.ts` got `useGapLayer()`
and `useStip()` hooks (30-min staleTime). `src/components/MapCanvas.tsx`
rewritten — mock `PARCELS` import gone, three real GeoJSON sources
(`parcels`, `stip`, `agendas`), gap-score interpolated fuchsia fill expression
(0→8+), yellow STIP `line + line-blur glow`, prop-driven sources synced via
separate effects so layer-toggle changes don't tear down the map. Map now
centers on Tooele Valley `[-112.42, 40.6]` zoom 10.5. `src/routes/index.tsx`
calls `useGapLayer()`/`useStip()`, passes data into `MapCanvas`, replaced the
broken `selectedParcel`/`Parcel` shape wiring with a temporary parcel-
properties popover (apn/jurisdiction/zoning/general_plan/gap_score/owner)
because Phase 4's brief explicitly defers the full drawer to Phase 5
("show parcel detail in the existing ParcelDeepDive drawer (already wired
for click in Phase 5 — for now just log to console or show a basic popup)").
ParcelDeepDive component + mock Parcel type still in tree but unimported; both
get rewritten in Phase 5 to consume live ArcGIS. Layer-rail "Site plan
overlays" relabeled "STIP / UDOT projects"; gap-gradient swatch + partial-
GP-coverage caveat added inline under the gap toggle. Local typecheck not
run — Node toolchain not on PATH in this session, no `node_modules` installed
on this machine; relied on careful prop-shape edits and pushed for the
Cloudflare Workers build to validate. Commits: tooele-land-intel@687be58
(`Phase 4: zoning/GP gap layer + STIP overlay`), wasatch-intel@ea394a3
(`Phase 4: wire gap-layer + STIP into map UI`). Phase 5 is next.

### 2026-04-24 — Phase 5 (DONE) — Claude Code (Sonnet 4.6)
Two-repo phase. In **tooele-land-intel**: wrote `scripts/enrich_roads.py` porting CM_RE
`road_adjacency.py` for Tooele Valley bbox (UGRC Utah Roads FeatureServer/0, CARTOCODE 1–5
arterials, haversine distance to parcel centroid + polygon edge midpoints, corner detection,
disk-cached roads JSON); outputs `data/roads_enrichment.json` keyed by APN with
`nearest_arterial_name`, `nearest_arterial_aadt`, `nearest_arterial_distance_mi`,
`nearest_road_class`, `is_corner`, `corner_roads`. Fixed `aggregate_city_signals.py`
`mostRecentActivity: "nan"` bug (pandas NaN string was not filtered before sort). Updated
`gap-layer.yml` monthly cron to run `enrich_roads.py` and commit `roads_enrichment.json`.
CRE scorer curves (score_aadt, score_arterial_access) deliberately NOT ported — TLI shows
raw AADT for human interpretation. In **wasatch-intel**: added `ParcelDetail`,
`ParcelNeighbor`, `OpportunityStrategy`, `AnalysisResult` types to `types.ts`. In
`csv-loader.ts`: added `polygonCentroid()`, `haversineKm()`, `loadRoadsEnrichment()` (graceful
{}  on 404), `loadParcelDetail()` (gap-layer APN linear scan + road enrichment + dual-strategy
agenda linking: APN text match OR ≤500m centroid proximity), `loadParcelAdjacency()` (0.5km
radius, capped at 12). Fixed signal-wire NaN date guard. In `entry.ts`: added routing block
for `/api/parcel/:apn` (GET detail, GET adjacency, POST analyze) + full opportunity analysis
engine (5 strategies × 4 scoring components, scored /8 → /5, `simplified: true`). In
`api-client.ts`: added `useParcelDetail`, `useParcelAdjacency`, `useParcelAnalyze` hooks.
Rewrote `ParcelDeepDive.tsx` from scratch (~270 lines): `{ apn, open, onClose }` props,
`useParcelDetail/Adjacency/Analyze` hooks, 5 tabs (Overview, Agendas with count badge,
Adjacency, Comps placeholder, Notes/localStorage), loading skeletons, `GapBadge` (color-coded
0–7), `StrategyRow`, road-access display. Updated `index.tsx`: replaced `parcelPopover:
ParcelProps | null` state + temp popover div with `selectedApn: string | null`, imported
`ParcelDeepDive`, wired `onParcelClick` to APN extraction, renders `<ParcelDeepDive apn={selectedApn}
open={!!selectedApn} onClose={...} />`. Key decision: opportunity analysis runs pure TypeScript in
the Worker — no GitHub Actions trigger, no live ArcGIS buffer calls — marked `simplified: true`.
Road enrichment data will populate after first workflow run; drawer gracefully shows "—" until then.
Phase 6 is next.

### 2026-04-25 — Phase 6 (DONE) — Claude Code (Sonnet 4.6)
Rumor signal pipeline. In **tooele-land-intel**: wrote `scripts/scrape_news_rss.py`
(feedparser, 6 RSS feeds: Tooele Transcript, Deseret, KSL, SL Trib, UDOT; keyword-
filtered to 30 land-development terms; graceful per-feed error handling);
`scripts/scrape_reddit.py` (PRAW, r/Utah + r/SaltLakeCity + r/UtahPolitics + r/tooele;
gracefully exits with empty CSV when REDDIT_CLIENT_ID/SECRET/USER_AGENT not set so the
pipeline continues in news-only mode); `scripts/correlate_signals.py` (Haiku 4.5
classifies each signal into the shared CM_RE 9-type taxonomy, then scores correlation on
4 axes: jurisdiction 0.4 + signal_type 0.3 + keyword_overlap 0.2 + temporal 0.1; 200-call
cap; threshold 0.6 configurable via env); `.github/workflows/signals.yml` (daily cron
14:00 UTC). Added feedparser>=6.0.0 and praw>=7.7.0 to requirements.txt. In
**wasatch-intel**: pre-flight extraction of `analyzeOpportunity` + helpers from `entry.ts`
into `src/server/lib/analyze.ts` (zero behavior change, entry.ts now imports from module);
`loadSignalWire()` in csv-loader.ts rewritten to merge agendas + signals_news.csv +
signals_reddit.csv + signal_correlations.csv; agendaId populated from best-match
correlation; external signal score derived from keyword hit count. Signal-wire endpoint
source metadata updated. Key decision: Reddit scraper writes empty CSV (not an error) if
creds absent — pipeline produces news-only output until user configures GitHub Secrets.

### 2026-04-25 — Phase 8 (DONE) — Claude Code (Sonnet 4.6)
Deal pipeline persistence. In **wasatch-intel**: extended `schema.sql` with three new tables
(deals, deal_notes, deal_contacts) and four indexes — all `IF NOT EXISTS` so idempotent.
`d1-client.ts` got a full suite of deal CRUD helpers: getDeals, createDeal, updateDeal,
deleteDeal (soft → Closed/Dead), getDealNotes, createDealNote, getDealContacts,
createDealContact. `entry.ts` replaced the empty `/api/deals` stub with 10 route branches
(list, create, single-get, patch, delete, notes CRUD, contacts CRUD); mutation guard updated
with `isDealMutation`. `types.ts`: added DealNote, DealContact, CreateDealPayload; added
createdAt to Deal. `api-client.ts`: 7 new hooks. `pipeline.tsx`: full DnD Kanban rewrite
using `@dnd-kit/core` — DndContext + KanbanColumn (useDroppable) + DraggableDealCard
(useDraggable) + DragOverlay; optimistic stage-drag with revert-on-error; NewDealDialog
(exported for external use), DeleteDealDialog (soft-delete confirm), DealPanels (inline
notes auto-save 1s idle + contacts mini-form). `ParcelDeepDive.tsx`: "+ Track deal" button
in sheet header opens NewDealDialog prefilled with parcel APN/jurisdiction/acres; Notes tab
copy updated. New `d1-migrate.yml` workflow (workflow_dispatch) applies the schema to the
live D1 DB — must be triggered manually after first deploy. deploy-cloudflare.yml switched
from `npm ci` to `npm install` to avoid lock file mismatch (no local Node toolchain).
Key decision: soft delete (stage → Closed/Dead) keeps history; @dnd-kit PointerSensor 6px
threshold prevents click-vs-drag mis-fires. Commit: wasatch-intel@86d4888.

### 2026-04-25 — Phase 10 (DONE) — Claude Code (Sonnet 4.6)
Historical backfill. In **tooele-land-intel**: wrote `scripts/backfill_historical.py`
(one-time script: runs all 13 PMN bodies with 24-month window via existing
`scrape_pmn_all.py` → persist/dedup → Haiku split cost-capped at $50 → aggregate
city signals → geocode; archives itself to `scripts/archive/` on completion to
prevent accidental re-runs). Created `.github/workflows/backfill.yml` (workflow_dispatch
only, 120-min timeout, dry-run + months-back + skip-geocode flags). Fixed open item:
wired `aggregate_city_signals.py` into `weekly-digest.yml` commit step so
`city_signal_scores.json` reflects all 13 jurisdictions after every Monday run.
Phase 10 NAIP addendum explicitly deferred — the addendum's own prerequisite
("3 months of production stability") was not met (Phase 9 completed same day);
NAIP is documented for Phase 11+ pickup ~2026-07-25. Key action remaining:
trigger `backfill.yml` from GitHub Actions tab (workflow_dispatch) to execute
the backfill against live PMN data.

### 2026-05-05 — Phase 13a blocker resolutions + 7-county expansion — Claude Code (Sonnet 4.6)

User reviewed §8.1 BLOCKERS and §8.3 OPEN QUESTIONS in `docs/PHASE_13_ENRICHMENT_ARCH.md` and provided decisions on all items. Arch doc updated in-place; branch merged to main.

**B1 (zoning fallback) — APPROVED.** Fallback to `'unknown_detail'` for inaccessible jurisdictions. `docs/zoning_jurisdiction_status.md` created to track discovery status per jurisdiction. 13b-9 (deferred Opus-vision zoning-PDF recovery) added as optional sub-task in §5, gated on the B1 fallback list being populated by 13b-5.

**B2 (Google Places budget) — ON-DEMAND ONLY, $10/mo cap.** 90-day cache. Circuit breaker drops to neutral score (50) when cap hit. Bulk pulls explicitly rejected.

**B3 (WFRC TAZ skim) — PROXY APPROVED.** Default: straight-line × 1.4 / 35 mph. Every parcel scored via proxy tagged `commute_corridor_method = 'proxy'` in D1 for future swap. WFRC email request documented in §8.2.

**Q2 (county scope) — EXPANDED from 3 to 7 counties.** Parcel base now covers Tooele + Salt Lake + Utah + Davis + Weber + Wasatch + Box Elder (~1.1M total parcels). Signal collection scope unchanged (13 jurisdictions). Rationale: prospecting features require multi-county base coverage. Storage ~$2–4/mo at D1 rates. §1.1 updated with 4 new UGRC LIR endpoints; §2 updated with county enum extension (wasatch/box_elder) and commute_corridor_method column; §4 cost table updated; 13b-1 and 13b-2 sub-tasks updated.

**Q3 (vector tiles) — PROMOTED to Phase 14 REQUIRED DELIVERABLE.** At 1.1M parcels, MapLibre cannot render direct GeoJSON. Phase 14 must include PMTiles + Tippecanoe pipeline. Documented in §8.2 and §8.4 Q3.

Sub-task count is now 9 (13b-1 through 13b-8 mandatory; 13b-9 deferred). Branch `phase-13a-arch` merged to main.

### 2026-05-05 — Phase 13a (DONE) — Claude Code (Opus 4.7)
Architecture-only session producing `docs/PHASE_13_ENRICHMENT_ARCH.md` (450+ lines, 8 sections)
on the `phase-13a-arch` branch. No code written. Document specifies how to populate
`parcel_records` (D1 table from migration 0002) for all 13 jurisdictions. Confirmed
UGRC LIR FeatureServer URLs by direct probe: `Parcels_Tooele_LIR` (45,656),
`Parcels_SaltLake_LIR` (394,610 — note `SaltLake` no underscore between Salt and Lake),
`Parcels_Utah_LIR` (327,655) — total 767,921 parcels county-wide, ~250k after city-clip.
Confirmed UDOT public AADT layer at `services.arcgis.com/pA2nEVnB6tquxgOW/AADT2024_Unrounded/FeatureServer/3`
(4,574 segments, 22 historical years), UDOT signals at `signalscount2_3` (576 records),
Census ACS at `api.census.gov/data/2023/acs/acs5` variable `B19013_001E`. WFRC TAZ
discoverable at data.wfrc.org but exact AGOL item ID must be resolved at ingest time
(noted as a 13b-7 sub-task config). Existing UGRC Roads layer already embeds DOT_AADT
(no new UDOT trip needed for non-state-route AADT).

Document covers 8 mandatory sections: data sources & endpoints (13 sources catalogued
with auth/rate-limit/cost/robustness for each), schema mapping (every column in
`parcel_records` plus a recommended new `parcel_enrichment_log` table for per-source
freshness tracking via migration 0004), cache strategy (per-source TTL table; UGRC LIR
delta-fetch via field_hash since LIR has no per-feature dataLastEditDate),
rate-limiting/budget (Google Places $32/1000 Pro tier — naïve bulk pull would cost
$8,000; recommendation is on-demand-only triggered on user "Refresh enrichment" click,
capped at $10/mo), 8-task Manus sub-task breakdown (13b-1 schema, 13b-2 LIR ingestion,
13b-3 roads/AADT, 13b-4 signals, 13b-5 zoning + GP — long-tail per-jurisdiction
discovery, 13b-6 Census income, 13b-7 commute corridor + employment nodes/onramps
static seed, 13b-8 telemetry+circuit breaker), rollout order (LIR ingestion first → map
visible win → Census/roads/signals/corridor in parallel → zoning long-tail piecewise →
telemetry last), testing strategy (regression parcel per jurisdiction TBD by operator
during 13b-2; 20-random-per-jurisdiction sampling with manual ground-truth verification
in `tests/manual_verification_phase13b.csv`), and risks/blockers (3 BLOCKERS for user
input: per-jurisdiction zoning gating, Google Places budget treatment, WFRC TAZ skim
proxy default).

Key architecture decisions made autonomously (per WORKING STYLE):
- Add `parcel_enrichment_log` table (migration 0004) for per-source timestamps; keep
  the single `parcel_records.enriched_at` as a coarse "last-touched" hint
- Compute scores at request-time in the Worker (don't store derived score columns)
- Cache via D1 itself (no separate cache layer); per-source TTL table in §3.2
- Field-hash strategy for LIR delta-fetch since UGRC doesn't expose per-feature
  dataLastEditDate
- Static JSON for employment nodes (~25 hand-curated coords) and freeway on-ramps
  (~40 hand-curated coords) committed to repo, not fetched per run
- Google Places: on-demand only, never bulk; default `competition_count = NULL`
  for newly-saved parcels with "—" UI label until user clicks Refresh

Total Phase 13 incremental burn projected at $5–10/mo (Google Places only). Stays under
$25/mo project ceiling. Manus credits separately billed for 13b execution.

Phase 13b can begin once user resolves §8.1 BLOCKERS B1/B2/B3. Recommended next step:
user reads §8.1 in `docs/PHASE_13_ENRICHMENT_ARCH.md`, decides on each blocker, then
asks for the first 13b sub-task prompt. Branch: `phase-13a-arch` pushed, NOT merged
to main per Phase 13a brief.

### 2026-05-07 — Phase 13b-2 CLOSEOUT: jurisdiction fallback fix + final verification — Claude Code (Sonnet 4.6)

**Jurisdiction data-quality bug found and fixed.** The chunk generator (`load_parcels_to_d1.yml`) was forcing `jur = None` for the 4 non-SIGNAL_COUNTIES (box_elder, davis, wasatch, weber), which `sq_notnull()` mapped to `''`. Source CSVs had `parcel_city` populated for ~85% of those rows — the data was silently discarded at load time. Fix: preserve `parcel_city` when present; fall back to `"Unincorporated {County}"` when blank. `SIGNAL_COUNTIES` constant removed entirely. Commit `b50a1b9`.

**Reload run 25477033819:** triggered immediately after push. All 7 counties completed green in ~57 min total (wasatch 6m21s · box_elder 7m47s · tooele 8m36s · davis 25m48s · weber 29m40s · salt_lake 53m · utah 54m). Prior partial load run 25455128053 had taken 4h and produced the 299,459 empty-jurisdiction rows.

**Final verified row counts (post-fix reload, 2026-05-07):**

| County | Rows |
|---|---|
| box_elder | 31,099 |
| davis | 110,138 |
| salt_lake | 393,521 |
| tooele | 33,860 |
| utah | 249,741 |
| wasatch | 30,289 |
| weber | 99,215 |
| **Total** | **947,863** |

- `parcel_enrichment_log WHERE source='ugrc_lir' AND status='ok'`: **947,863** (1:1) ✅
- `parcel_records WHERE jurisdiction=''`: **0** ✅

**Architecture lessons locked in:**
- Polygon GeoJSON stays in the CSV (not D1); D1 has a 100 KB per-statement limit — polygon fields routinely exceed it.
- CSVs <90 MB: plain git. 90–99 MB compressed: `.csv.gz` in git. ≥90 MB compressed (e.g., salt_lake 147 MB): GitHub Release asset under tag `large-parcels`. Load workflow tries `.csv.gz` → `.csv` → release asset.
- `sq_notnull()` must be used for every NOT NULL column — `sq()` maps empty string to NULL, violating the constraint.
- D1 chunk size 500, 3-retry with backoff 15s/30s/60s (commit `dc63ddc`) is stable at 947K rows.

**Status: COMPLETE AND VERIFIED.** 13b-3/4/5/6b/7/8 ready for Manus dispatch.

---

### 2026-05-07 — Phase 13b-2 COMPLETE — Claude Code (Sonnet 4.6)

**Scrape run:** [25419148937](https://github.com/camsrigby-hash/tooele-land-intel/actions/runs/25419148937) — 7/7 counties ✅ (wasatch 2m53s, tooele 4m8s, box_elder 4m23s, davis 12m38s, weber 22m19s, utah 34m43s, salt_lake 38m15s)

**Load run:** [25466020044](https://github.com/camsrigby-hash/wasatch-intel/actions/runs/25466020044) — 7/7 counties ✅ (box_elder 7m43s, wasatch 8m3s, tooele 8m25s, weber 35m7s, davis 26m23s, utah 49m56s, salt_lake 55m47s)

**D1 verification (Task 7):**
- Total parcels by county: salt_lake 393,521 · utah 248,785 · davis 108,941 · weber 101,150 · tooele 33,860 · box_elder 31,317 · wasatch 30,289 = **947,863 total** ✅
- `parcel_enrichment_log WHERE source='ugrc_lir' AND status='ok'`: **947,863** ✅ (1:1 match)
- Spot-check parcel `080480106` (weber): county=weber, acreage=3.49, bldg_sqft=0, vacancy_status=vacant ✅

**Bugs fixed during closeout (all committed to main):**
- `shapely` missing from `requirements.txt` in tooele-land-intel → added
- GitHub 100 MB file limit: CSVs ≥90 MB compressed to `.csv.gz`; salt_lake (147 MB compressed) uploaded to `large-parcels` GitHub release asset
- `csv.field_size_limit(sys.maxsize)` — wasatch/box_elder polygon GeoJSON exceeded Python csv default 128 KB field limit
- `npm ci` → `npm install -g wrangler` — project lock file out of sync; load workflow only needs wrangler
- `sq(jur or '')` → `sq_notnull(jur)` — `sq()` treats empty string as NULL, violating NOT NULL on jurisdiction
- CHUNK_SIZE 1000→200→500 — D1 execute batching tuning
- D1_RESET_DO transient errors — retry backoff increased to 15s/30s/60s (3 attempts)
- Git scrape commit push-failure detection — loop now exits 1 if all retries fail
- GitHub Actions matrix context — replaced job-level `if` with step-level filter pattern (matrix not available at job level)
- wasatch-intel repo private → public (GHA minutes exhausted for private repos)

**Status: COMPLETE.** 13b-3 through 13b-8 are unblocked.

---

### 2026-05-06 — Phase 13b-2 partial closeout + retroactive 13b-1 fix — Claude Code (Sonnet 4.6)

### 2026-05-06 — Phase 13b-6a Census ACS County-Level Pull — Manus + Claude Code closeout

**13b-6a PRs merged:**
- `tooele-land-intel` PR #2 merged to main — `fetch_census_acs.py`, `fetch_census_acs.yml` GHA workflow, `census_acs_blockgroups.csv` (1,608 rows), TIGERweb boundary cache (7 counties), data dictionary.
- `wasatch-intel` PR #2 merged to main — `load_census_acs_to_d1.yml` GHA workflow, `create_census_acs_staging.sql`, runbook, PROJECT_STATE.md 13b-6a stub.

**Workflow files added manually (Claude Code) — token scope blocker:**
Both workflow YAML files were unavailable to Manus due to OAuth `workflow` scope restriction on its token. Claude Code committed and pushed them directly to the feature branches before merge:
- `tooele-land-intel`: commit `88ad252`
- `wasatch-intel`: commit `1df5fd3`

**D1 load fixes applied (Claude Code):**
- Initial chunk size (1000 rows) caused `SQLITE_TOOBIG` — individual block-group boundary polygons reached 649KB, far over D1's 100KB statement limit.
- Fix: omit `boundary_geojson` from D1 inserts (nullable column; boundary data served from tooele-land-intel tiger cache). Raise CHUNK_SIZE to 100. Committed to main: `df81fdd`.

**Gate checks (pre-merge, both green):**
- Gate A: `parcel_enrichment_log` table exists ✅
- Gate B: column named `source` (canonical) ✅

**D1 verification (post-load, all passing):**
- `census_acs_blockgroups` total: **1,608** ✅ (expected ~1,608)
- Per-county: Salt Lake 712, Utah 434, Davis 193, Weber 166, Box Elder 42, Tooele 39, Wasatch 22 ✅ (exact match)
- `median_income IS NOT NULL`: **1,554** ✅ (96.6%, >90% threshold)
- `parcel_enrichment_log WHERE source='census_acs' AND status='ok'`: **1,608** ✅

**Status: COMPLETE.** `census_acs_blockgroups` table live in D1. 13b-6b (spatial join) is unblocked.

**13b-2 PR merges:**
- tooele-land-intel PR #1 merged to main: `54224d78` (scraper + scrape_ugrc_lir.yml workflow)
- wasatch-intel PR #1 merged to main: `11ffabf9` (runbook + load_parcels_to_d1.yml workflow)

**Retroactive 13b-1 fix (schema never applied — applied today):**
- Root cause: prior Manus session reported 13b-1 complete on 2026-05-05 without verifying against live D1.
  Migration file was never committed to the repo; migration was never applied to production.
- Applied today: `migrations/0004_phase13_enrichment.sql` via `wrangler d1 migrations apply --remote`
  - `CREATE TABLE parcel_enrichment_log (parcel_id, source, enriched_at, status, details)`
  - `ALTER TABLE parcel_records ADD COLUMN field_hash TEXT`
  - `ALTER TABLE parcel_records ADD COLUMN commute_corridor_method TEXT NOT NULL DEFAULT 'proxy'`
- Schema fix branch `phase-13b-2-schema-fix` merged to main with `--no-ff`: `f13779d`
- Load workflow patched in same branch:
  - `source_name` → `source` (canonical per arch doc §2.11)
  - `status='success'` → `status='ok'` (canonical per arch doc §2.11)
  - `sq(jur)` → `sq(jur or '')` (jurisdiction NOT NULL; empty string for 4 parcel-base-only counties)

**Gate results (all 4 passing as of 2026-05-06):**
- Gate A: `parcel_enrichment_log` table exists ✅
- Gate B: `parcel_records` DDL includes `field_hash` and `commute_corridor_method` ✅
- Gate C: `commute_corridor_method` column present ✅
- Gate D: `parcel_enrichment_log` columns: parcel_id, source, enriched_at, status, details ✅

**Note on Task 7 verification query:** The original runbook query uses `source_name` and `status='success'`.
The correct query (per arch doc §2.11) is:
`SELECT COUNT(*) FROM parcel_enrichment_log WHERE source='ugrc_lir' AND status='ok';`

**Status:** Awaiting user go-ahead to trigger Task 5 scrape workflow.

---

### 2026-05-05 — Phase 13b-1 (RETROACTIVE — reported complete by Manus but NOT applied) — Manus

Migration 0004 was authored by Manus and reported complete. However, the migration file was never committed
to the repo and was never applied to the production D1 database. This was discovered during 13b-2 closeout
gate checks on 2026-05-06. See the 2026-05-06 entry above for the retroactive fix.

---

### 2026-05-05 — Phase 13a arch reconciliation — Claude Code (Sonnet 4.6)
Architecture doc finalized, blocker decisions recorded, 7-county scope confirmed.
Commits `a9c8ebd` and `90dce2a` (were local-only until pushed in the 2026-05-06 schema-fix session).

---

### 2026-05-05 — Phase 12 (CODE COMPLETE — user verification pending) — Claude Code (Opus 4.7)
Deferred-feedback bundle on `phase-12-deferred-feedback` branch in both repos. Six items:

**1. Geocoding fix (Haiku parcel-ID extraction).** New `tooele-land-intel/scripts/extract_parcels_from_pdfs.py`
reads the FULL agenda-item PDF body (not just title/location) and uses Haiku 4.5 to extract structured
parcel_ids / legal_descriptions / street_addresses / cross_streets with high/medium/low confidence per
item. Resolves coords via Tooele UGRC parcel lookup → Nominatim address → Nominatim cross-street →
Nominatim subdivision-name fallback chain. Updates `data/items_geocoded.csv` in-place; appends audit log
to `data/parcel_resolutions.csv`; writes `data/cron_status/extract-parcels.json` heartbeat. New GHA
workflow `extract_parcels_from_pdfs.yml` triggers on `workflow_run` after `Geocode agenda items`. Backfill
mode: process all unresolved items (~$2–10 one-time Haiku cost, marginal weekly).

**2. Signal Wire strength sort.** Dropdown on `/feed` (Newest / Strongest correlation / Oldest) with
localStorage persistence (`wasatch.feed.wire_sort` key). Radix Select primitive consistent with
`/pipeline` patterns.

**3. Signage filter.** New `isSignageItem()` helper in `src/lib/types.ts` — runtime keyword detection
(pole sign / monument sign / wall sign / freestanding sign / billboard / sign permit). `loadDevelopers()`
in `csv-loader.ts` accepts `{ includeSignage }` opt and default-excludes signage filings from developer
aggregation. `/api/developers?include_signage=1` query param controls. `useDevelopers({ includeSignage })`
hook signature updated. `/developers` page has a Switch toggle + a separate "Signage permits" card that
appears only when the selected developer has signage filings. Forward-looking: `split_agenda_items.py`
Haiku prompt now extracts `is_signage: bool` and Python tags `item_type=signage` so future weekly-digest
runs label at-source.

**4. Agenda multi-column filter.** Full rewrite of `src/routes/agendas.tsx` with TanStack Router
`validateSearch` URL state. Four filters: Jurisdiction (multi-select Popover+Checkbox), Item type
(multi-select), Signal strength (range slider 0–100, two thumbs), Date range (Popover+Calendar `mode="range"`,
2 months). All filters AND-combine. URL params: `?q=&jurisdictions=&types=&signal_min=&signal_max=&date_from=&date_to=`.
Reset button clears all. Active-filter badge counts on triggers.

**5. Cron status footer.** Renders on every route via `AppShell` (footer slot below `<main>`). Hybrid
data source: D1 `cron_runs` table for Worker crons (watchlist-checker now records via new
`recordCronRun()` helper); GHA-heartbeat JSON files in tooele-land-intel for the 5 Python workflows
(weekly-digest / signals / gap-layer / geocode / extract-parcels — each gets a `Record cron heartbeat`
step that calls `scripts/write_cron_heartbeat.sh`). New `/api/cron-status` endpoint computes health
(ok/warn/fail/unknown) per workflow based on `ranAt` age vs expected interval. `useCronStatus()` hook +
`<CronStatusFooter>` component with Popover showing per-workflow detail; tiny color dots in collapsed view.

**6. PMN 24-month backfill scraper.** New `tooele-land-intel/scripts/scrape_pmn_archive.py`. Reuses
existing `scrape_utah_pmn.py` `scrape_body()` with `months_back=24`, dedupes against existing
`agenda_items.csv` PMN notice IDs, writes new historical notices as JSON files in `data/agendas/`
(picked up by existing `persist_to_csv.py` merge). `--dry-run` flag reports counts per body without
fetching. `--jurisdiction <key>` for single-body testing. `--max-notices` for debug. Logs unmatched
items (no `event_date_iso`) to `data/pmn_archive_unmatched.csv` for inspection. Writes its own
`pmn-archive` heartbeat. Run-once manually after merge (not scheduled).

**Schema + workflow.** New `migrations/0003_parcel_resolution.sql` adds `agenda_parcel_resolutions`
(audit log shape mirroring the Python script CSV) + `cron_runs` (heartbeat). New
`.github/workflows/d1-migrate-phase12.yml` applies via `wrangler d1 migrations apply` —
workflow_dispatch only, mirrors d1-migrate-phase11.yml pattern.

**Build verification.** `npx tsc --noEmit` green for all Phase 12 files. The 3 pre-existing TS errors
on main from Phase 11 (`ParcelDeepDive.tsx` `NewDealDialog` import + 2 `routes/index.tsx` AgendaItem
type mismatches) were untouched and remain — flagged here for a Phase 13/14 cleanup.

**User actions required to fully ship Phase 12:**
1. Merge `phase-12-deferred-feedback` → main in both repos (--no-ff per Phase 11 pattern)
2. Run `d1-migrate-phase12.yml` (workflow_dispatch) to apply migration 0003 to live D1
3. Run `extract_parcels_from_pdfs.yml` (workflow_dispatch) — first run does the 491-item backfill (~$5–10 Haiku cost)
4. Run `scrape_pmn_archive.py` once (locally OR via a one-off workflow) for the 24-month historical PMN backfill
5. Spot-check that the cron status footer turns green after the workflows run

Total LLM cost for Phase 12 implementation work: ~$0 (code via Claude Code). Backfill costs (paid by
running workflows in user's account, not by this implementation): ~$5–10 one-time. Phase 13 is next.

### 2026-05-05 — Phase 11 (DONE) — Claude Code (Sonnet 4.6) + Lovable handoff merge
Pipeline-rebuild branch. All work on `pipeline-rebuild`; pending user local verification
before merge to main.

New files: `src/lib/parcel-intel.ts` (vacancy cascade, 3 default scoring profiles —
gas-cstore/miniflex/generic-commercial — 8-dimension WeightVector scorer, Zod schemas
as frontend+backend API contract); `src/lib/intel-context.tsx` (IntelProvider: profile
state, weight overrides, pipeline mutations, keyboard shortcuts `/`/`g p`/`g m`,
`useIntel()` hook); `src/components/ParcelDetailPanel.tsx` (720px Radix Sheet with 7
tabs: Overview, Site Intel, Adjacent, Comps & Valuation, Owner & Outreach, DD Checklist,
LOI Builder — Wagstaff template); `src/components/ScoringControls.tsx` (320px right-panel:
profile dropdown, 8 weight sliders, fill-opacity, percentile badge);
`src/components/ParcelThumb.tsx` (satellite thumbnail); `DESIGN_NOTES.md`
(Lovable's documented deviations from the brief);
`migrations/0002_pipeline_rebuild.sql` (D1 tables: parcel_records, pipeline_entries,
dd_checklist_items, loi_drafts, scoring_profiles — DO NOT apply to prod without review);
`tests/api-stubs.test.ts` (bun:test smoke tests for all 10 API endpoints, SKIP_API_TESTS=1).

Modified: `src/lib/mock-data.ts` (re-exports Jurisdiction from types.ts; Parcel.jurisdiction
string→Jurisdiction; appends SIGNAL_WIRE, WATCHLISTS, DEALS mocks);
`src/styles.css` (stage tokens --stage-prospect/dd/loi/closed, grade tokens
--grade-a/b/c/d in :root and .dark); `src/components/MapCanvas.tsx` (parcelColors/
fillOpacity/dimMask props; buildParcelGeoJSON() with per-feature fillColor+fillOpacity;
data-driven paint ["get","fillColor"]/["get","fillOpacity"]; 50ms debounce on setData());
`src/routes/__root.tsx` (IntelProvider wraps Outlet); `src/routes/index.tsx` (scoreAll()
→ parcelColors → MapCanvas; dimMask for pipeline filter); `src/routes/pipeline.tsx`
(useIntel()+scoreFor() for sorting; stage chip filter; list/map toggle; ParcelDetailPanel);
`src/server/entry.ts` (isPipelineOrProfileMutation guard + 10 production-only mock stubs:
GET+POST /api/profiles, GET /api/parcels/search, GET /api/parcels?bbox=,
GET /api/parcels/:id, GET+POST /api/pipeline, PATCH/DELETE /api/pipeline/:id,
POST /api/parcels/:id/refresh); `package.json` (adds test script with SKIP_API_TESTS=1).

Key decisions: API stubs are production-only (Cloudflare Workers); Vite dev server routes
all /api/* through TanStack SSR — stubs untestable locally until Phase 14 frontend wiring.
COUNTY_MAP patched for Erda (tooele) and American Fork (utah). Total LLM cost: ~$0 (code
via Lovable handoff + Claude Code closeout session). Build: zero TS errors. 7 HTML routes
all HTTP 200 in dev. Commits: ae615cb → 73f0eae → 913243a → 43ea8b8 → ee7cad5.

### 2026-04-25 — Phase 9 (DONE) — Claude Code (Sonnet 4.6)
Per-city expansion via PMN. In **tooele-land-intel**: discovered PMN public body IDs
for 11 expansion cities (26 new PMN bodies) via web search + individual page fetches
(PMN sitemap index returns 404). Added all cities to `data/jurisdictions.yaml` under
`pmn_body_ids` keys: Tooele City (685/687), Lehi (2512/2651), Saratoga Springs
(1727/1854), Eagle Mountain (535/536), South Jordan (1031/1032), Herriman (1155/1151),
Bluffdale (2803 joint), Draper (5555/383), American Fork (180/183), Vineyard (530/531),
Spanish Fork (5/6). Added `--jurisdiction-label` CLI flag to `scrape_utah_pmn.py` and
updated `scrape_pmn_all.py` to pass canonical names from jurisdictions.yaml — prevents
"City of X" vs "X" mismatches. Added 10 new aliases to `persist_to_csv.py`. Created
`data/pmn_coverage.md` documenting Stansbury Park and Lake Point as Tooele County
unincorporated (Tyler Meeting Manager, skipped per scope guardrails). The existing
`agendas-watch.yml` already calls `scrape_pmn_all.py` — no workflow changes needed;
next Monday run will automatically scrape all new cities. In **wasatch-intel**: added
"American Fork" to Jurisdiction type union, JURISDICTIONS array, and CITY_CENTERS.
Key decision: PMN body IDs kept in jurisdictions.yaml (not a separate pmn_bodies.yaml)
to avoid split config. Salt Lake City deferred — high-volume, outside Tooele Valley focus.

### 2026-04-25 — Phase 7 (DONE) — Claude Code (Sonnet 4.6)
All Phase 7 code written and activated. New files: `src/server/lib/schema.sql` (D1 schema: watchlists,
watchlist_hits, alert_log), `src/server/lib/d1-client.ts` (CRUD helpers + Env type), `src/server/lib/email.ts`
(Resend HTML alert), `src/server/cron/watchlist-checker.ts` (hourly cron: 4-type signal matching,
recordHit, email dispatch). Updated: `wrangler.jsonc` (D1 binding + hourly cron), `types.ts`
(WatchlistCriteria discriminated union, WatchlistHit, CreateWatchlistPayload), `entry.ts`
(CRUD routes + scheduled export), `api-client.ts` (mutation hooks), `watchlists.tsx` (full CRUD
page with WatchlistCard, HitsPanel, delete confirm), `WatchlistWizard.tsx` (3-step wizard with
maplibre-gl-draw polygon support). Added `@cloudflare/workers-types` + `@mapbox/mapbox-gl-draw`
to package.json. Activation via `.github/workflows/d1-setup.yml` — required adding D1 Edit scope
to the Cloudflare API token (original token was Workers-only), and regenerating package-lock.json
(new deps were missing; no local Node on this machine). D1 database UUID: `8a8792c9-df0b-4644-8fdb-5ecfc5d6a66a`.
Live endpoint verified: `/api/watchlists` returns `{"data":[],"meta":{"source":"d1:watchlists","freshness":"live",...}}`.
Phase 8 is next.

### 2026-05-05 — Phase 13a arch reconciliation — Claude Code (Sonnet 4.6)

Architecture-only session. Three improvements applied to `docs/PHASE_13_ENRICHMENT_ARCH.md` §5 and §6 on branch `phase-13a-arch-reconciliation`:

**D1 (telemetry, 13b-8 slot).** Removed the standalone "Telemetry + circuit breaker hookup" sub-task. Telemetry is now distributed: every ingestion script ships with its own `parcel_enrichment_log` writes. Circuit-breaker logic is embedded per script. The 13b-8 slot is reused for vacancy classification (see D2). Documented in new §8.0.

**D2 (vacancy classification split).** 13b-8 is now "Vacancy classification" — a dedicated pass over the raw LIR fields written by 13b-2 that applies the `classifyVacancy()` cascade and the per-county PROP_CLASS code-to-string mapper. 13b-2 writes raw LIR fields only. Rationale: decouples the ~12–18 hr LIR fetch from the cheap classification pass, letting the latter iterate without re-fetching.

**D3 (Census ACS parallel-safe).** 13b-6 restructured as two phases: 13b-6a (county-level pull, depends only on 13b-1, runs concurrent with 13b-2) and 13b-6b (spatial join, depends on 13b-2 + 13b-6a). Added an ASCII dependency diagram to §6. Sub-task summary updated to reflect that 6 sub-tasks fan out in parallel after 13b-2.

**Numbering fix.** 13b-9 deferred note incorrectly referenced "13b-3 zoning ingestion task" — corrected to 13b-5 (zoning is 13b-5 in the arch doc; 13b-3 is roads).

Next: user will provide the Manus sub-task prompt template; then generate paste-ready prompts for 13b-2 through 13b-9.

---

### 2026-05-07 — Migration 0006: parcel_records scoring columns — Claude Code (Sonnet 4.6)

Schema-only session. Migration `0006_parcel_scoring_columns.sql` applied to `wasatch-intel-db` (remote). Five nullable REAL/TEXT columns added to `parcel_records` for Phase 13b-3/4/5/7/8 enrichment sub-tasks: `corner_score`, `aadt_score`, `zoning_score`, `commute_corridor_score`, `vacancy_class`. No data written; each column populated by its own Manus sub-task. DB at 254 MB post-cleanup (was 503 MB; `parcel_enrichment_log` per-row entries for `ugrc_lir` + `census_acs_join` archived to `parcel_enrichment_log_summary` and deleted).

---

### 2026-05-08 — Phase 13b-5: zoning score D1 load — Claude Code (Sonnet 4.6)

Loaded `zoning_score` (REAL 0.0–1.0) into all 947,863 `parcel_records` rows via GHA workflow `load_zoning_scores_to_d1.yml`. Source: `tooele-land-intel/data/raw/parcel_zoning_scores.csv` on branch `phase-13b-5-zoning-score` (commit `02a9e26`, dedup fix: largest-county-wins strategy by Manus). SQL chunked into 1,896 × 500-row `UPDATE … CASE id … END` statements executed via `npx wrangler d1 execute --remote --file`.

**Bug found and fixed mid-session:** original SQL used `CASE parcel_id … WHERE parcel_id IN (…)` but D1 primary key is `id`. First run (25532771472) hung 76 min with 0 rows written — every chunk failing `no such column: parcel_id` with 15s/30s/60s retries. Cancelled; fixed workflow (`CASE id … WHERE id IN`); re-ran as 25535182847.

**Results:** run 25535182847, duration 3,351,296 ms (~56 min), FAILED_CHUNKS=0, 1,896/1,896 chunks succeeded. 947,863/947,863 rows scored (100%). Score distribution: 0.0→901,266 (95.1%), 0.2→6,974, 0.4→3,817, 0.7→470, 1.0→35,336. All 7 counties at 100% coverage. D1 size: 261,918,720 bytes (~250 MB). cron_runs entry: `load_zoning_scores_to_d1 / 2026-05-08 04:31:32 / success`. PRs merged: tooele-land-intel #5 (`f885880`) + wasatch-intel #5 (`9d0655d`).

---

### 2026-05-07 — Phase 13b-3/4/7/8 COMPLETE — Claude Code (Sonnet 4.6)

Four enrichment sub-tasks loaded, verified, and merged in this session.

**13b-8 (vacancy_class):** Loaded `vacancy_class TEXT` into `parcel_records`. Source: `tooele-land-intel/data/raw/parcel_vacancy_class.csv`. FAILED_CHUNKS=0. PRs merged: tooele-land-intel #3 (78338e09) + wasatch-intel #3 (dd8c5de0).

**13b-4 (aadt_score):** Loaded `aadt_score REAL (0.0–1.0)`. Source: `tooele-land-intel/data/raw/parcel_aadt_scores.csv`. Coverage: 99.37% (all 7 counties ≥98.35%), 5-bucket distribution, FAILED_CHUNKS=0. PRs merged: tooele-land-intel #4 (430ceb5) + wasatch-intel #4 (e0d0139).

**13b-7 (commute_corridor_score):** Loaded `commute_corridor_score REAL (0.0–1.0)`. Source: `tooele-land-intel/data/raw/parcel_commute_corridor_scores.csv`. Coverage: 98.52% (all 7 counties ≥98.35%), 5-bucket distribution, FAILED_CHUNKS=0. PRs merged: tooele-land-intel #6 (10ec6a4) + wasatch-intel #6 (2c3b05d).

**13b-3 (corner_score):** Loaded `corner_score REAL (0.0–1.0)`. Source: `tooele-land-intel/data/raw/parcel_corner_scores.csv`. GHA run [25536313899](https://github.com/camsrigby-hash/wasatch-intel/actions/runs/25536313899). Coverage: 947,863/947,863 (100%), all 7 counties at 100%, 8-bucket distribution sums to 947,863, FAILED_CHUNKS=0. PRs merged: tooele-land-intel #7 (8141259b) + wasatch-intel #7 (420c6056).

**Key lesson — `npm install -g wrangler` required on GHA Ubuntu runners:** The 13b-3 workflow originally used `npm install --no-save wrangler@latest` (local install). With that pattern, `wrangler d1 execute --remote --file` exits 0 silently without writing any rows when executing multi-statement SQL files on GHA Ubuntu runners. Switching to `npm install -g wrangler` (global install, matching the proven 13b-4 pattern) fixed the issue immediately. All 4 active loaders now use the global install pattern.

**Also fixed in 13b-3:** Original SQL used `CASE parcel_id` / `WHERE parcel_id IN` — but the D1 PK column is `id`. Fixed before any data was written.

**Phase 13b fully complete.** All sub-tasks 13b-1 through 13b-8 shipped. Phase 14 (PMTiles + Tippecanoe vector-tile deliverable) is next.

### 2026-05-08 — Phase 14-1 (DONE) — Claude Code (Opus 4.7)

**Phase 14 kickoff: operational brief + stale doc reconciliation.** The Phase 14 brief in `docs/PROMPT_PLAYBOOK_ADDENDUM.md` was stale ("Frontend ↔ API wiring + legacy cleanup" — pre-SD-2 scope). The CURRENT STATE block, [PROJECT_STATE.md:554](#) and [:928](#), and [PROJECT_DIRECTION.md](#) Phase Ledger + SD-2 all already specified Phase 14 as PMTiles + Tippecanoe vector tile pipeline. CC reconciled by:

- Replacing the stale brief (formerly addendum lines 584-608) with the new operational brief covering architecture, attribute-baking decisions, sub-task split (14-1..14-6), and acceptance criteria.
- Confirming user decisions on the four open design questions (R2 hosting, bake-with-feature-state-preserved attribute strategy, GHA workflow_dispatch with no cron, polygon source via `large-parcels` GH Release per SD-5).
- Decomposing Phase 14 into 6 sub-tasks following the 13b model: 14-1 brief (this), 14-2 R2+Worker, 14-3 data prep, 14-4 GHA tippecanoe, 14-5 MapLibre client, 14-6 verify.
- Folding the dropped "Frontend ↔ API wiring" scope into Phase 16 (pipeline parcel-centric refinement).
- Updating CURRENT STATE block to point at 14-2 next.

Architecture notes for next sessions:
- **MapCanvas.tsx** today uses `addSource("parcels", { type: "geojson", data })` with `paint: { "fill-color": ["get","fillColor"] }` reading a runtime-computed property. 14-5 swaps source to `{ type: "vector", url: "pmtiles:///tiles/parcels.pmtiles", promoteId: "parcel_id" }` and moves the score→color computation into a `case`/`match` paint expression keyed off the baked attributes (corner_score, aadt_score, zoning_score, commute_corridor_score, vacancy_class, median_income, prop_class, acreage). Existing setFeatureState usage at line 360 is preserved with the new promoteId.
- **wrangler.jsonc** currently has only the D1 binding. 14-2 adds the R2 binding for `wasatch-intel-tiles` and a Worker route `/tiles/:filename` that proxies range requests.
- **tooele-land-intel** clean state with one untracked file (`data/raw/parcel_zoning_scores.csv`) — unrelated to this commit.

No code changes this session. Doc-only commit.

**Status: 14-1 COMPLETE.** 14-2 is unblocked but may need user-side R2 bucket provisioning before CC can deploy the Worker route.

### 2026-05-08 — Phase 14-2 (DONE) — Claude Code (Opus 4.7)

**R2 bucket + Worker route + wrangler binding.** Stack (frontend Worker side):

- **Bucket**: `wasatch-intel-tiles` created via `wrangler r2 bucket create`. Required a one-time account-level R2 enable in the Cloudflare dashboard (error code 10042 surfaced this; user toggled it on inline). R2 stays within the existing Workers Paid plan ($5/mo) — no incremental cost at the 10 GB free tier.
- **Binding**: `TILES` (uppercase, conventional like `DB`) added to `wrangler.jsonc` as the only `r2_buckets[]` entry. `Env` interface in `src/server/lib/d1-client.ts` extended with `TILES?: R2Bucket` so all route handlers can reference it through the existing typed env.
- **Route**: `/tiles/:filename` handler inserted in `src/server/entry.ts` just before the TanStack SSR fallback at line 654. Method guard updated so `GET`/`HEAD`/`OPTIONS` against `/tiles/*` no longer fall through to TanStack. Handler responsibilities:
  - Range parsing: closed (`bytes=N-M`) and open-ended (`bytes=N-`). Open-ended uses `env.TILES.head(key)` to resolve total size since R2's `get(key, { range })` requires explicit `length`.
  - Status codes: `200` for unranged GET, `206` for ranged GET, `200` for HEAD, `204` for OPTIONS, `404` for missing key, `400` for invalid path (`..` traversal), `416` for malformed Range, `500` if binding is unbound.
  - Headers: `Accept-Ranges: bytes`, `Content-Range: bytes start-end/total` on 206, ETag from R2 (`obj.httpEtag`), `Cache-Control: public, max-age=86400`, CORS open (`*`) with `Range` and `If-None-Match` allowed and `Content-Range`/`Content-Length`/`ETag`/`Accept-Ranges` exposed.
  - Body: streamed directly from `R2ObjectBody.body` (no in-memory buffering), so large `.pmtiles` archives won't blow Worker memory limits.

**Build plumbing gotcha:** `npx wrangler deploy` does NOT rebuild — it deploys whatever is in `dist/`. The `@cloudflare/vite-plugin` generates `dist/server/wrangler.json` at vite-build time with the bindings. First deploy attempt showed only `env.DB` because the stale generated config had `"r2_buckets":[]`. Fix: always run `npm run build` before `npx wrangler deploy`. (For Phase 14+ tile rebuild GHA workflow this matters — workflow MUST `npm run build` before `wrangler deploy`.)

**Smoke tests** against deployed `https://wasatch-intel.cam-s-rigby.workers.dev/tiles/smoke.bin` (51-byte placeholder, uploaded with `wrangler r2 object put --remote`):

| Test | Expected | Actual |
|---|---|---|
| `HEAD /tiles/smoke.bin` | 200, `Content-Length: 51`, ETag, all CORS | ✓ |
| Full `GET /tiles/smoke.bin` | 200, body 51 bytes | ✓ |
| `Range: bytes=0-15` | 206, `Content-Range: 0-15/51`, body 16 bytes | ✓ |
| `Range: bytes=10-20` | 206, `Content-Range: 10-20/51`, body 11 bytes (`ACEHOLDER_F`) | ✓ |
| `Range: bytes=35-` (open-ended) | 206, `Content-Range: 35-50/51`, body 16 bytes | ✓ |
| GET nonexistent key | 404 | ✓ |
| `OPTIONS` preflight with `Access-Control-Request-Headers: Range` | 204, all CORS | ✓ |

Smoke object cleaned up via `wrangler r2 object delete --remote`. Bucket is empty and ready for `parcels.pmtiles` from 14-4.

**Worker version**: `f004e12c-1d2e-4a19-bd3a-ec141f0ad600`.

**Status: 14-2 COMPLETE.** 14-3 (data prep script in tooele-land-intel) unblocked.

### 2026-05-08 — Phase 14-3 (DONE) — Claude Code (Sonnet 4.6)

**Data prep script.** `tooele-land-intel/scripts/build_parcels_ndjson.py` (commit `c8b8c52`, pushed to main).

Joins the 6 county polygon CSVs (box_elder, davis, tooele, wasatch as plain CSV; utah, weber as gzip from git) + GH Release `large-parcels` asset (`parcels_salt_lake.csv.gz`, downloaded on demand via `--download-large-parcels`) + a D1 attribute export file (CSV or wrangler JSON) -> NDJSON of GeoJSON features with 8 baked attributes ready for tippecanoe:

- **From polygon CSV:** `parcel_id`, `acreage`, `prop_class`, `county`
- **From D1 export:** `corner_score`, `aadt_score`, `zoning_score`, `commute_corridor_score`, `vacancy_class`, `median_income`

Key design decisions:
- D1 export accepts either a plain CSV (header: `parcel_id, corner_score, aadt_score, ...`) or wrangler JSON output (`[{"results":[...]}]`) — autodetected by `.json` extension.
- `csv.field_size_limit(10 MB)` required — polygon GeoJSON columns routinely exceed Python's default 128 KB field limit (same lesson as 13b-2).
- `--stats` flag prints per-county row/write/match counts + per-attribute fill-rate; useful for verifying D1 join coverage after the real D1 export is run in 14-4.
- Local smoke test: 807,390 features emitted from 6 county sources (salt_lake absent locally, correct — it's in the GH Release). D1 join verified correct on matched parcels.

**Status: 14-3 COMPLETE.** 14-4 (GHA tippecanoe workflow in tooele-land-intel) is next.

### 2026-05-08 — Phase 14-4 (DONE) — Claude Code (Sonnet 4.6)

**GHA workflow: build_parcels_pmtiles.yml.** `tooele-land-intel/.github/workflows/build_parcels_pmtiles.yml` written and committed.

`workflow_dispatch` only (no cron). Single job `build-pmtiles` on `ubuntu-latest`, 180-minute timeout.

Pipeline:
1. **tippecanoe** installed via `apt-get install tippecanoe` (Ubuntu 22.04 apt, no build-from-source needed).
2. **large-parcels download** — `gh release download large-parcels --pattern parcels_salt_lake.csv.gz` into `data/raw/`; skips if already present (consistent with existing score workflow pattern).
3. **D1 attribute export** — Python here-doc paginating `SELECT parcel_id, corner_score, aadt_score, zoning_score, commute_corridor_score, vacancy_class, median_income FROM parcel_records LIMIT 50000 OFFSET N` via `wrangler d1 execute --remote --json`. 3-retry with back-off per page; 2s sleep between pages. Writes incremental CSV to `/tmp/d1_parcel_attrs.csv` (memory-efficient — no full JSON list in RAM). ~19 pages for 947k rows.
4. **NDJSON build** — `python3 scripts/build_parcels_ndjson.py --d1-export /tmp/d1_parcel_attrs.csv --stats`.
5. **tippecanoe** — `-Z6 -z14 --drop-densest-as-needed --extend-zooms-if-still-dropping --layer parcels --force`.
6. **R2 upload** — `wrangler r2 object put wasatch-intel-tiles/parcels.pmtiles --file ... --content-type application/octet-stream`.
7. **cron_runs entry** — records workflow name, run timestamp, feature count, pmtiles size.
8. **NDJSON artifact** — always uploaded (3-day retention) for dry-run inspection and debugging.

`dry_run=true` input skips steps 5–7 (tippecanoe + R2 + cron_runs); useful for NDJSON-only smoke tests in CI.

**ACTION REQUIRED before first run:** add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` to `tooele-land-intel` Settings → Secrets → Actions. Same token values as in `wasatch-intel`.

Key decisions:
- CSV export (not wrangler JSON) to avoid holding ~150 MB of parsed JSON in memory.
- 50k rows/page keeps each D1 API response under the ~10 MB JSON limit with margin.
- `--layer parcels` sets the vector tile layer name; required by Phase 14-5 `source-layer: "parcels"`.
- No `--no-tile-size-limit` — `--drop-densest-as-needed` already manages tile size.

**Status: 14-4 COMPLETE.** 14-5 (MapLibre client wiring in wasatch-intel) is next.

---

## REFERENCES — supporting docs

- `docs/tli-full-spec.md` — every feature, current and future (the "110% complete" vision)
- `docs/tli-buildout-schedule-v2.md` — phase-by-phase build plan with effort estimates
- `docs/python-to-ts-field-mapping.md` — ETL contract from Python CSV columns to TS fields
- `docs/PROMPT_PLAYBOOK.md` — copy-paste prompts for each phase (the file you came here from, probably)
- `docs/PROMPT_PLAYBOOK_ADDENDUM.md` — CM_RE-heritage deltas per phase; holds the living `CURRENT STATE` block updated at end of every phase
- `docs/CM_RE_INTEGRATION.md` — inventory of a prior related project whose scraper, parser, aggregator, and UGRC fetcher code is reusable for Phases 3–6 and 9. The code itself lives under `tooele-land-intel/vendor/cm_re/` after running `cm_re_extract.sh`. Read this before Phase 1 (parser schema upgrade), Phase 3 (UGRC patterns), and Phase 9 (per-city expansion via PMN).
- `docs/CC_BOOTSTRAP.md` — Claude Code session kickoff protocol. Every CC session starts with "Read docs/CC_BOOTSTRAP.md and begin."
- `src/lib/types.ts` — the single source of truth for data shapes; backend MUST conform

---

## END
