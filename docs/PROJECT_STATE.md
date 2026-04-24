# PROJECT_STATE.md — Wasatch Intel

**This is the single source of truth for the project.** Any AI agent (Claude Code, Manus, future Claude in chat) picking up work on Wasatch Intel reads this file FIRST, every session, before touching anything else.

Update this file at the end of every work session. The "Current Status" section is the most important — keep it accurate.

---

## CURRENT STATUS

**Last updated:** 2026-04-23
**Last agent:** Claude (Opus 4.7) via claude.ai chat
**Active phase:** Phase 0 — Frontend deploy (in progress)
**Live URL:** Not deployed yet
**GitHub repo:** `github.com/camsrigby-hash/wasatch-intel` (to be created — see Phase 0)
**Legacy repo:** `github.com/camsrigby-hash/tooele-land-intel` (kept as scrapers source)

### What's done
- Lovable frontend exported and ready to import
- Shared `types.ts` module written and typecheck-verified (zod v3 + v4 compatible)
- Build plan written (`docs/tli-buildout-schedule-v2.md`)
- Phase 0 bash block ready to paste in Codespaces
- CM_RE heritage catalogued; vendor/cm_re/ extracted into tooele-land-intel

### What's next
- Run Phase 0 (push frontend, wire Cloudflare Pages, ship a live mock URL)
- Then Phase 1 (Workers backend + first real `/api/agendas` endpoint)

### Open questions / blockers
- None currently

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
│   ├── CC_BOOTSTRAP.md                # Claude Code session bootstrap guide
│   ├── CM_RE_INTEGRATION.md           # CM_RE heritage inventory + phase integration map
│   ├── PROMPT_PLAYBOOK_ADDENDUM.md    # per-phase delta prompts for CM_RE porting
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
Catalogued reusable modules from the prior CM_RE project (Davis+Weber CRE
site-selection tool). Created CM_RE_INTEGRATION.md, PROMPT_PLAYBOOK_ADDENDUM.md,
and cm_re_extract.sh. No code ported yet — extraction and porting happen in
the respective phases (Phase 1 schema upgrade, Phase 3/4/5 UGRC/STIP/polygon
work, Phase 9 PMN expansion, Phase 10 NAIP land cover). Scope boundaries
documented: do not drag CRE scorer, Google Places, owner scraping, or
rasterio into MVP.

---

## REFERENCES — supporting docs

- `docs/tli-full-spec.md` — every feature, current and future (the "110% complete" vision)
- `docs/tli-buildout-schedule-v2.md` — phase-by-phase build plan with effort estimates
- `docs/python-to-ts-field-mapping.md` — ETL contract from Python CSV columns to TS fields
- `docs/PROMPT_PLAYBOOK.md` — copy-paste prompts for each phase (the file you came here from, probably)
- `src/lib/types.ts` — the single source of truth for data shapes; backend MUST conform
- `docs/CM_RE_INTEGRATION.md` — inventory of a prior related project whose scraper, parser, aggregator, and UGRC fetcher code is reusable for Phases 3–6 and 9. The code itself lives under `tooele-land-intel/vendor/cm_re/` after running `cm_re_extract.sh`. Read this before Phase 1 (parser schema upgrade), Phase 3 (UGRC patterns), and Phase 9 (per-city expansion via PMN).

---

## END
