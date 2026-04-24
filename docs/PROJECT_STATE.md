# PROJECT_STATE.md — Wasatch Intel

**This is the single source of truth for the project.** Any AI agent (Claude Code, Manus, future Claude in chat) picking up work on Wasatch Intel reads this file FIRST, every session, before touching anything else.

Update this file at the end of every work session. The "Current Status" section is the most important — keep it accurate.

---

## CURRENT STATUS

**Last updated:** 2026-04-24
**Last agent:** Claude Code (Sonnet 4.6) — Phase 2 session
**Active phase:** Phase 3 — Geocoding backfill (NOT STARTED)
**Live URL:** https://wasatch-intel.cam-s-rigby.workers.dev (Cloudflare Workers, not Pages)
**GitHub repo:** `github.com/camsrigby-hash/wasatch-intel`
**Legacy repo:** `github.com/camsrigby-hash/tooele-land-intel` (kept as scrapers source)

### What's done
- Phase 0: Cloudflare Workers deploy pipeline live (GitHub Actions → wrangler deploy)
- Phase 1: /api/agendas endpoint live (136 items, freshness=live from tooele-land-intel CSV)
- Phase 2: /api/digest, /api/developers, /api/signal-wire live; feed.tsx, developers.tsx, pipeline.tsx, watchlists.tsx wired to real data; mock-data.ts shrunk; weighted aggregator (aggregate_city_signals.py) in tooele-land-intel
- types.ts, csv-loader.ts, api-client.ts, agendas.tsx — all wired, real data loading
- Parser schema upgraded in tooele-land-intel (CM_RE signal taxonomy, 23-col CSV)
- CM_RE reference tree at `tooele-land-intel/vendor/cm_re/`

### What's next
- Phase 3: Geocoding backfill — geocode real agenda items to lat/lng, replace mock AgendaItem on map

### Open questions / blockers
- None currently

### Open items (non-blocking, track here until resolved)
- **`growth_score` empty in CSV** — all 136 rows in `agenda_items_split.csv` have an empty `growth_score` column; the Haiku enrichment workflow has not yet run on these items. Result: `/api/signal-wire` returns `signal: 0` for every item. Fix: trigger the enrichment workflow in tooele-land-intel (Phase 5 / whenever enrichment is scheduled).
- **`meeting_date: nan` in CSV** — 1 row has an empty meeting_date ("nan" string). The `loadSignalWire()` date-filter (`a.date >= cutoff`) silently includes it (string comparison with "nan" is unpredictable). Fix: add a `!isNaN(Date.parse(a.date))` guard in `loadSignalWire()` — trivial, but deferring until enrichment is wired (Phase 5) so we know the full date quality picture.
- **`mostRecentActivity: "nan"` in city_signal_scores.json** — Grantsville's `most_recent_activity` field is "nan" (pandas NaN not serialized to null). Fix: in `aggregate_city_signals.py`, replace `pd.NaT`/`nan` with `None` before `json.dumps`. Trivial one-liner; deferring to Phase 5 sweep.

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
│  Cloudflare Pages: wasatch-intel.pages.dev                    │
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
