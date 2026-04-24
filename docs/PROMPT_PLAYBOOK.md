# PROMPT_PLAYBOOK.md — Wasatch Intel

**How to use this file:** Each phase below has one ready-to-paste prompt. Open Claude Code (or Manus) at home, paste the prompt for the phase you're on, walk away. Come back to a completed phase with a commit history, a deployed update, and a status summary.

**Before pasting any prompt below:** make sure the agent has access to `docs/PROJECT_STATE.md` in the repo. Every prompt assumes that file exists and has been read.

**Tool selection note:** Phases 1–5 and 7–10 are best for **Claude Code** (deep codebase work, multi-file refactors, terminal access). Phases 6 and 9-iterations (per-city expansion) are good **Manus** candidates — they're more linear data-pipeline work that doesn't need as much codebase awareness. Notes inline below.

**Model selection is baked in.** Each phase prompt begins with `/model <alias>` so Claude Code sets the right model automatically. The choices are tuned for each phase's cognitive load — `opus` for the hardest architectural work, `opusplan` for mixed planning+execution, `sonnet` for repetitive scaffolding. You can override by just swapping the `/model` line before pasting.

---

## STANDARD OPENING (prefix every prompt with this)

```
Read `docs/PROJECT_STATE.md` end to end before doing anything else. That file
is the single source of truth — its WORKING STYLE section governs how you
operate, including the autonomy level (full auto), decision-making policy
(pick sensible defaults, note in commit), and verification requirements.

Then read the specific phase brief below. Execute the phase end to end:
plan → code → test → commit → push → verify deploy → update PROJECT_STATE.md
PHASE_LOG → summarize what you did and stop.

If you encounter a blocker that meets the "When to actually stop and ask"
criteria in PROJECT_STATE.md, stop and surface it. Otherwise keep moving.
```

---

# PHASE 1 — Backend foundation + first real endpoint

**Tool:** Claude Code
**Estimated session length:** 4–6 hours of agent time, ~2 user check-ins
**Prerequisite:** Phase 0 is complete (frontend live on Cloudflare Pages with mock data)

## Prompt

```
[STANDARD OPENING]

First, set the model for this session:
  /model opusplan
Why: Architectural decisions across types contract + Workers mounting + Hono setup.

PHASE 1 BRIEF
=============

Goal: Stand up a Hono-on-Workers API inside the existing TanStack Start app
and wire ONE endpoint (/api/agendas) end-to-end with real scraped data from
the legacy tooele-land-intel repo.

Concrete deliverables:
1. New `src/server/` directory containing:
   - `index.ts` — Hono app, mounted at the Workers entry, all /api/* routes
   - `routes/agendas.ts` — GET /api/agendas, returns AgendasResponse
   - `lib/csv-loader.ts` — fetches a CSV from raw.githubusercontent.com
     (camsrigby-hash/tooele-land-intel/main/data/agenda_items_split.csv),
     parses it, transforms snake_case rows into AgendaItem objects per the
     mapping in docs/python-to-ts-field-mapping.md
2. The TanStack Start server entry must mount Hono at /api/* without
   breaking the existing frontend routes. Read the wrangler.jsonc and the
   `@tanstack/react-start/server-entry` to figure out the right pattern.
3. Frontend changes:
   - New `src/lib/api-client.ts` — TanStack Query hooks, one per endpoint.
     For Phase 1, just `useAgendas()` matters.
   - `src/routes/agendas.tsx` — replace the `import { AGENDAS } from
     "@/lib/mock-data"` with `useAgendas()`. Handle loading and error
     states gracefully (use existing Radix patterns).
4. Local dev: `npx wrangler dev` (or whatever the TanStack Start equivalent
   is) must serve both the frontend and /api/agendas locally. Verify by
   curling http://localhost:5173/api/agendas and getting real Erda +
   Grantsville data.
5. Production: push to main, watch the Cloudflare Pages deploy succeed,
   visit https://wasatch-intel.pages.dev/agendas and visually confirm the
   table shows real items (not the mock 400 fake rows).

Decisions you'll need to make and just decide (don't ask):
- Polling interval / cache freshness: 5 minutes is fine. Weekly data, no
  rush.
- Error envelope when the upstream CSV is unreachable: return
  { data: [], meta: { source: "cache", freshness: "stale" }, errors: [...] }.
  The frontend already handles empty arrays.
- Rate limiting on /api/*: skip for Phase 1. Add in Phase 7 if needed.

Verification before declaring done:
- `npm run build` clean
- `npm run lint` clean (or warnings noted in commit)
- /api/agendas returns 200 with real data locally
- Production /agendas route renders real Erda + Grantsville items
- PROJECT_STATE.md PHASE_LOG entry added
- Commit messages follow Conventional Commits

When done, STOP and write a final summary message: what was built, what
decisions were made, what surprised you, what to do next.
```

---

# PHASE 2 — Wire remaining read-only routes

**Tool:** Claude Code (still — this is multi-file frontend + backend work)
**Estimated session length:** 4–6 hours
**Prerequisite:** Phase 1 done; /api/agendas is live and the Agendas route renders real data

## Prompt

```
[STANDARD OPENING]

First, set the model for this session:
  /model sonnet
Why: Repetitive endpoint scaffolding; Sonnet handles it cleanly and saves Opus budget.

PHASE 2 BRIEF
=============

Goal: Replace mock data with real data across all read-only routes.
After this phase, mock-data.ts can be deleted.

Endpoints to build (all return ApiEnvelope<T> per types.ts):
- GET /api/digest        → reads tooele-land-intel/data/latest_digest.md
                            and api_costs.csv; returns DigestResponse
- GET /api/parcels       → reads any parcel-lookup JSON outputs in
                            tooele-land-intel/data/parcels/ (may not exist
                            yet — return empty array gracefully). Will be
                            populated for real in Phase 3.
- GET /api/developers    → derive distinct applicants from agenda CSV,
                            aggregate counts and jurisdictions per applicant
- GET /api/signal-wire   → for now, return last 30 days of agenda items
                            reformatted as SignalWireItem with source:"Agenda".
                            Real news/Reddit ingestion is Phase 6.
- GET /api/watchlists    → return [] for now; backed by D1 in Phase 7
- GET /api/deals         → return [] for now; backed by D1 in Phase 8

Frontend changes:
- Add useDigest, useParcels, useDevelopers, useSignalWire, useWatchlists,
  useDeals hooks to api-client.ts
- Update each corresponding route file to use the hook
- Delete src/lib/mock-data.ts (or shrink it to only the truly static data:
  CITY_CENTERS if it's not already in types.ts)
- The Pipeline and Watchlists routes will show empty states for now —
  that's correct, not a bug. Polish the empty states with helpful copy
  ("No watchlists yet — create one to get alerts on high-signal events")

Decision policy reminder: pick sensible defaults, note in commits, keep
moving. Examples for this phase:
- Markdown rendering for digest: react-markdown is fine
- Sorting in /api/developers: by recentActivity desc
- Loading skeletons: use the shadcn Skeleton component

Verification:
- All seven routes render without console errors
- Empty states are visually polished, not broken
- mock-data.ts is gone (or shrunk to <30 lines)
- Production deploy succeeds
- PROJECT_STATE.md updated

STOP and summarize when done.
```

---

# PHASE 3 — Geocoding pipeline

**Tool:** Claude Code (touches both Python repo and TS repo)
**Estimated session length:** 4–6 hours
**Prerequisite:** Phase 2 done

## Prompt

```
[STANDARD OPENING]

First, set the model for this session:
  /model opusplan
Why: Cross-repo work plus ArcGIS quirks need planning judgment.

PHASE 3 BRIEF
=============

Goal: Every agenda item that has a parcel ID or a usable address gets
lat/lng coordinates. Then those coordinates feed the map view.

This phase touches BOTH repos. Clone tooele-land-intel locally if not
already cloned (it's at github.com/camsrigby-hash/tooele-land-intel).

Python work (in tooele-land-intel/):
1. New script: scripts/geocode_items.py
   - Input: data/agenda_items_split.csv
   - For rows with a parcel_id matching the Tooele County pattern
     (NN-NNN-N-NNNN), call the existing scripts/arcgis.py helpers to look
     up the parcel polygon centroid
   - For rows without a parcel_id but with an extractable address, use
     Nominatim (https://nominatim.openstreetmap.org/search) — set a
     descriptive User-Agent, respect their 1 req/sec rate limit
   - Use Haiku 4.5 to extract addresses from agenda_text where regex
     fails (cap: 100 Haiku calls per run)
   - Output: data/items_geocoded.csv (same columns as input + lat, lng,
     geocode_source, geocode_confidence)
   - Append to data/api_costs.csv per existing pattern
2. New workflow: .github/workflows/geocode.yml
   - Triggered by completion of weekly-digest.yml workflow
   - Or workflow_dispatch for manual runs
   - Runs geocode_items.py, commits items_geocoded.csv

Frontend work (in wasatch-intel/):
3. Update src/server/lib/csv-loader.ts to fetch items_geocoded.csv
   instead of agenda_items_split.csv (with fallback to the older one if
   the geocoded version doesn't exist yet)
4. Update src/routes/index.tsx (the Map route):
   - Replace mock parcels/agendas with useAgendas() data
   - Pin every agenda that has a centroid
   - Cluster pins per the existing MapCanvas cluster logic (already in
     the Lovable code)
   - Show an honest counter in the layer rail: "X of Y items plotted"
5. Verify pin placement: zoom to Erda, confirm Copper Cove agenda items
   plot in roughly the right spot (NE corner of Erda, near SR-138)

Decisions to make and move on:
- Geocode confidence threshold for plotting: 0.6 (lower = noisy pins)
- Pin color logic: keep the colorForSignal function from MapCanvas
- Caching: results in CSV, no re-geocoding on subsequent runs unless
  the agenda's address text changes

Verification:
- items_geocoded.csv committed to tooele-land-intel
- Map route shows real pins in roughly the right places
- Unplotted items count is honest (don't hide them)
- Both repos pushed
- PROJECT_STATE.md updated in wasatch-intel

STOP and summarize.
```

---

# PHASE 4 — Zoning / General Plan gap layer

**Tool:** Claude Code (heavy on the Python + ArcGIS side)
**Estimated session length:** 6–8 hours (this is the most complex phase)
**Prerequisite:** Phase 3 done

## Prompt

```
[STANDARD OPENING]

First, set the model for this session:
  /model opus
Why: The single hardest phase; spatial joins, intensity-mapping logic, partial GP coverage debugging.

PHASE 4 BRIEF
=============

Goal: For every parcel in Erda + Grantsville, compute the gap between
current zoning and General Plan future land use. Render as a colored
polygon overlay on the map. THIS IS THE KILLER FEATURE — don't half-ass it.

Python work (in tooele-land-intel/):
1. New script: scripts/build_gap_layer.py
   - For each MVP city (Erda, Grantsville):
     - Pull every parcel polygon from UGRC's statewide parcel ArcGIS
       layer (filter by city boundary)
     - Pull the city's current zoning layer (use scripts/arcgis.py)
     - Pull the city's General Plan layer if available (Erda + Grantsville
       may not publish their own — see KNOWN GOTCHAS in PROJECT_STATE.md
       and tli-full-spec.md §2.3 for the partial coverage caveat)
     - Spatial join: for each parcel, what zoning applies, what GP applies
   - Compute gap_score per parcel:
     - Map zoning codes to "intensity" 1–10 (agricultural=1, dense
       residential/commercial=10) — config table in the script
     - Same mapping for GP designations
     - gap_score = max(0, gp_intensity - zoning_intensity)
     - Higher score = more "upzone potential" = more interesting
   - Output: data/gap_layer.geojson (FeatureCollection of parcel polygons,
     each with properties { apn, zoning, generalPlan, gap_score, ... })
2. Wire into weekly workflow: this is heavier than the agenda scrape;
   schedule it monthly via cron, with workflow_dispatch for manual runs.

Frontend work (in wasatch-intel/):
3. New endpoint: GET /api/gap-layer
   - Fetches gap_layer.geojson from tooele-land-intel
   - Caches aggressively (immutable until the next monthly run)
4. Update MapCanvas.tsx:
   - Add gap_layer as a new vector source
   - Color-shade fill by gap_score (transparent at 0, deep purple at 8+)
   - Wire to the existing "Zoning vs General Plan gap" layer toggle
     (already in the layer rail UI from Lovable)
   - On polygon click: show parcel detail in the existing ParcelDeepDive
     drawer (already wired for click in Phase 5 — for now just log to
     console or show a basic popup)
5. Polish:
   - Legend in the layer rail: "Low gap" → "High gap" gradient swatch
   - Honest caveat in the layer rail when GP coverage is partial:
     "Partial coverage — Erda/Grantsville don't publish GP as GIS"

Decisions and defaults:
- Zoning intensity table: hand-curated based on the existing
  skill/tooele-parcel-analysis/references/*-zoning.md files. Don't
  invent — reference them.
- For parcels where GP can't be determined: gap_score = null, not
  rendered on the gap layer
- Performance: with ~10k parcels per city this is fine as GeoJSON.
  If we expand to all 12 cities and hit 100k+, switch to vector tiles
  (separate phase).

Verification:
- gap_layer.geojson exists and validates as proper GeoJSON
- Gap toggle in the map layer rail works
- Visually inspect: at least 5 parcels should be colored "high gap"
  in Erda (we know A-20 currently zoned land has HIR future GP from
  earlier parcel lookups)
- Both repos pushed
- PROJECT_STATE.md updated

STOP and summarize. Mention specifically what % of parcels got a
gap_score vs nulled.
```

---

# PHASE 5 — Parcel Deep Dive with live ArcGIS

**Tool:** Claude Code
**Estimated session length:** 4–6 hours
**Prerequisite:** Phase 4 done

## Prompt

```
[STANDARD OPENING]

First, set the model for this session:
  /model opusplan
Why: Mix of API design + UI wiring; opusplan splits the difference well.

PHASE 5 BRIEF
=============

Goal: Click any parcel on the map → ParcelDeepDive drawer opens with
real data: zoning, GP, owner, acreage, adjacency, residual land value
estimate, and any agenda items linked to it.

Backend work:
1. New endpoint: GET /api/parcel/:apn
   - Calls existing tooele-land-intel/scripts/lookup_parcel.py logic
   - Easiest path: port the script to TypeScript inside the Worker
     (it's mostly ArcGIS REST calls)
   - Harder but more maintainable: trigger a GitHub Action that runs
     the Python and returns results — but introduces 30s latency
   - DECIDE: port to TS for the lookup; keep Python for the analyzer
2. New endpoint: GET /api/parcel/:apn/adjacency
   - Spatial query against the parcel ArcGIS layer for parcels whose
     polygons share any boundary with the target parcel
   - For each, return apn, ownerName, acres, ownershipYears (if
     available; nullable), centroid
   - Cap at 12 results, ordered by shared boundary length
3. New endpoint: POST /api/parcel/:apn/analyze
   - Triggers a GitHub Action workflow (existing parcel-lookup.yml)
     with the apn as input
   - Returns immediately with a job ID
   - GET /api/parcel/:apn/analyze/:jobId polls for completion
   - When done, returns the analyze_opportunity.py output
   - Note: this is the only endpoint that takes >1s; everyone else is
     <500ms

Frontend work:
4. Wire up the existing ParcelDeepDive component (it's already built,
   just consuming mock data):
   - On parcel polygon click in MapCanvas, open the drawer with the
     parcel APN
   - useParcelDetail(apn) hook in api-client.ts
   - Tab "Overview" — shows the lookup data
   - Tab "Agendas" — agenda items where parcelId === apn (already
     filtered correctly in the Lovable code)
   - Tab "Comps" — placeholder ("No comparable sales available — Phase
     6 feature")
   - Tab "Notes" — locally persisted in browser localStorage for now;
     wire to D1 in Phase 8
   - Add a "Run analysis" button that triggers the analyze endpoint
     and shows a spinner while polling

Decisions:
- Adjacency owner-name fuzzy matching to known Developer entities:
  use simple substring match for Phase 5; refine in Phase 6
- "Held 20+ years" flag: show as a small badge if ownershipYears >= 20
- Residual land value formula: just display the analyze_opportunity.py
  output verbatim for now. A real model is post-Phase 10.

Verification:
- Click any parcel polygon, drawer opens with real data
- Test specifically with parcel 01-440-0-0019 (known Erda A-20 → HIR
  gap parcel from earlier lookups) — should show "Zoning gap" badge
- Adjacency tab shows ~6-10 neighbors with owner names
- Run analysis button works end-to-end
- PROJECT_STATE.md updated

STOP and summarize. Note any ArcGIS endpoint quirks discovered.
```

---

# PHASE 6 — Rumor signal pipeline

**Tool:** MANUS AI (good fit — it's pipeline work, less codebase coordination)
**Estimated session length:** 4–6 hours
**Prerequisite:** Phase 5 done; /api/signal-wire returning agenda items as a stand-in

## Prompt

```
[STANDARD OPENING]

PHASE 6 BRIEF
=============

Goal: Replace the agenda-as-fake-signal /api/signal-wire with a real
multi-source pipeline: Reddit + local news RSS + Google News alerts.
Then correlate signals to specific agenda items via Haiku.

This phase is mostly Python + new GitHub Actions in tooele-land-intel.
Frontend work is minimal — just consuming the existing endpoint with
real data.

Python work (in tooele-land-intel/):
1. scripts/scrape_reddit.py
   - PRAW (Python Reddit API Wrapper)
   - Subreddits: r/Utah, r/SaltLakeCity, r/UtahPolitics, r/tooele
   - Keyword filter: ["rezone", "annexation", "subdivision", "Erda",
     "Grantsville", "Costco", "Walmart", "warehouse", "developer",
     <each MVP city name>]
   - Last 30 days
   - Output: data/signals_reddit.csv
   - Reddit API: free tier is fine, but needs an OAuth app — register
     at reddit.com/prefs/apps, store creds as GitHub Secrets
     (REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USER_AGENT)
2. scripts/scrape_news_rss.py
   - Sources: tooeletranscript.com RSS, deseret.com RSS, ksl.com RSS,
     sltrib.com RSS
   - Same keyword filter
   - Output: data/signals_news.csv
3. scripts/correlate_signals.py
   - Input: signals_reddit.csv + signals_news.csv + agenda_items_split.csv
   - For each signal, use Haiku 4.5 to:
     - Extract jurisdiction reference (which city?)
     - Extract any specific project / parcel / applicant mentioned
     - Score relevance to each candidate agenda item (jurisdiction match
       + keyword overlap + temporal proximity)
   - For matches above threshold (0.6), record signal_id ↔ agenda_id link
   - Output: data/signal_correlations.csv
4. New workflow: .github/workflows/signals.yml
   - Daily cron (signals are higher-frequency than agendas)
   - Runs all three scripts, commits the CSVs

Frontend work (in wasatch-intel/):
5. Update GET /api/signal-wire to merge:
   - Reddit signals
   - News signals
   - Agenda items (still useful as a "Filing" signal type)
   - With correlated agendaId field populated where matches exist
6. Verify the existing Feed route renders correctly — the SignalWire
   panel should show real Reddit posts, real news headlines, with
   "↳ Correlated: [agenda item title]" or "↳ Unmatched: flag for follow-up"

Decisions:
- Reddit user agent: "wasatch-intel/1.0 (cam@example.com)" — replace
  email if you have a project email; otherwise use the user's GitHub
- News RSS feeds: use feedparser, gracefully skip any feed that 404s
- Correlation threshold: 0.6 default, expose as env var so it can be
  tuned later
- Cost cap: 200 Haiku calls per signals run (~$0.20 max)

Verification:
- Three new CSVs in tooele-land-intel/data/
- Feed route shows real signals with real correlations
- API costs stay under $30/mo total even with daily signals
- PROJECT_STATE.md updated

STOP and summarize. Note the false-positive rate of correlations
(eyeball-check 10 of them).
```

---

# PHASE 7 — Watchlists + alerts

**Tool:** Claude Code (D1 schema design + multi-file work)
**Estimated session length:** 4–6 hours
**Prerequisite:** Phase 6 done

## Prompt

```
[STANDARD OPENING]

First, set the model for this session:
  /model opusplan
Why: D1 schema design needs Opus reasoning; CRUD endpoints don't.

PHASE 7 BRIEF
=============

Goal: Watchlists become persistent (D1) and trigger email alerts when
matching signals fire.

Backend work:
1. Set up Cloudflare D1:
   - `wrangler d1 create wasatch-intel-db`
   - Add binding to wrangler.jsonc
   - Schema (in src/server/lib/schema.sql):
     - watchlists table per Watchlist type in types.ts (criteria
       column as JSON)
     - watchlist_hits table (FK to watchlists, FK to signal_id, fired_at)
     - alert_log table (when emails went out, to whom, why)
2. Endpoints:
   - GET /api/watchlists — list user's watchlists
   - POST /api/watchlists — create
   - PATCH /api/watchlists/:id — update (esp. signal threshold + alert
     toggles)
   - DELETE /api/watchlists/:id
   - GET /api/watchlists/:id/hits — paginated hit history
3. Cron Worker (separate file in src/server/cron/):
   - Runs every hour
   - For each active watchlist:
     - Query signal_wire for new signals matching the criteria
     - Insert into watchlist_hits
     - If alerts.email enabled and threshold exceeded, queue an email
   - Use wrangler.jsonc cron triggers (free tier supports them)
4. Email via Resend:
   - Set up account at resend.com (free 3k/mo)
   - Add RESEND_API_KEY to Workers secrets
   - Template: simple HTML, "Watchlist [name] hit: [signal headline]
     | View on map [link]"

Frontend work:
5. Update Watchlists route:
   - Use real CRUD via the new endpoints
   - "New watchlist" wizard:
     - Type selector (Geography / Applicant / Parcel Set / Saved Search)
     - For Geography: small map for drawing a polygon (use
       maplibre-gl-draw)
     - For Applicant: dropdown from the developers list
     - For Parcel Set: paste APNs (one per line)
     - For Saved Search: form fields matching the agenda filter UI
   - Settings panel: signal threshold slider, alert toggles, email
     destination

Decisions:
- Single user, no auth: hardcode owner_user_id = "default" everywhere
- maplibre-gl-draw is the only new dep needed
- Don't build a full notification center yet — email is enough for
  Phase 7

Verification:
- D1 created, schema migrated
- Create one watchlist of each type, save it, see it persist after
  reload
- Manually fire a signal that matches a watchlist; receive an email
  within an hour (or trigger the cron manually via wrangler)
- PROJECT_STATE.md updated

STOP and summarize.
```

---

# PHASE 8 — Deal pipeline persistence

**Tool:** Claude Code
**Estimated session length:** 2–3 hours
**Prerequisite:** Phase 7 done (D1 already provisioned)

## Prompt

```
[STANDARD OPENING]

First, set the model for this session:
  /model sonnet
Why: Pure CRUD with a well-defined schema.

PHASE 8 BRIEF
=============

Goal: The Pipeline kanban becomes real CRUD. Drag-and-drop persists.

Backend:
1. D1 schema additions:
   - deals table per Deal type in types.ts
   - deal_notes table (FK to deal, body, created_at)
   - deal_contacts table (FK to deal, name, role, phone, email)
2. Endpoints:
   - GET /api/deals
   - POST /api/deals (create from a parcel APN)
   - PATCH /api/deals/:id (esp. stage transitions)
   - DELETE /api/deals/:id (soft delete — set stage to Closed/Dead)
   - GET/POST /api/deals/:id/notes
   - GET/POST /api/deals/:id/contacts

Frontend:
3. Wire the existing Kanban UI to real endpoints
4. Drag-and-drop: use @dnd-kit/core (already common, well-maintained)
5. "+New deal" button on parcel detail drawer creates a Prospect-stage
   deal seeded with parcel info
6. Notes panel + contacts panel inside each deal card

Decisions:
- Optimistic updates on stage drag (revert on API failure)
- Auto-save notes after 1s idle

Verification:
- Drag a card across stages, refresh, position persists
- Delete a deal, refresh, gone
- Create from parcel detail, verify it appears in pipeline
- PROJECT_STATE.md updated

STOP and summarize.
```

---

# PHASE 9 — Jurisdiction expansion (rolling, one or two cities per session)

**Tool:** MANUS AI (great fit — repetitive scraper config work, low coordination)
**Estimated session length:** 1–2 hours per city
**Prerequisite:** Phase 8 done; the architecture is stable

## Prompt (run once per city, substitute CITY_NAME)

```
[STANDARD OPENING]

First, set the model for this session:
  /model sonnet
Why: Repetitive scraper config work, one city at a time.

PHASE 9 BRIEF — Add jurisdiction: CITY_NAME
============================================

Goal: Get CITY_NAME into the data pipeline. Whether via PMN, the city
website, or a scraper-specific approach, end up with rows in
data/agenda_items.csv tagged with jurisdiction = "CITY_NAME".

Steps:
1. Research where CITY_NAME publishes its agendas:
   - First check Utah PMN: utah.gov/pmn → search for CITY_NAME
   - Look for both "CITY_NAME City Council" and "CITY_NAME Planning
     Commission" body IDs
   - If on PMN: easy. If not: investigate the city's official website
     for an agenda archive URL pattern
2. Update tooele-land-intel/data/jurisdictions.yaml:
   - Add CITY_NAME entry following the existing pattern
   - Include pmn_body_ids if available, agenda_url if scraping the
     city site directly
3. Update the JURISDICTIONS enum in wasatch-intel/src/lib/types.ts
   if CITY_NAME isn't already in there
4. Test scrape locally (or trigger the workflow manually):
   - Should produce 5+ agenda items if the city is even moderately active
   - If 0 results, debug before declaring done
5. Verify the city appears in the wasatch-intel frontend:
   - Map: pins should appear once geocoded (next weekly run)
   - Agendas: city should be selectable in the filter
   - Developers: any new applicants should show up
6. Append to PROJECT_STATE.md PHASE_LOG with city name + body IDs found

Decisions:
- If a city uses Granicus or Civic Plus instead of PMN, add a new
  scraper class in scripts/ and document the pattern
- If a city has zero scrapable presence (rare), mark it as "blocked,
  manual entry only" in jurisdictions.yaml and move on

STOP and summarize after one city. Don't batch.
```

**Repeat for each city:** Tooele City → Stansbury Park → Lake Point → Saratoga Springs → Eagle Mountain → Lehi → Bluffdale → South Jordan → Herriman → American Fork

---

# PHASE 10 — Historical backfill

**Tool:** MANUS AI or Claude Code (either works; mostly Python)
**Estimated session length:** 6–8 hours of agent time, mostly waiting on rate-limited scrapes
**Prerequisite:** Phase 9 mostly done

## Prompt

```
[STANDARD OPENING]

First, set the model for this session:
  /model sonnet
Why: Batch processing, no novel architecture.

PHASE 10 BRIEF
==============

Goal: Backfill 24 months of historical agenda items for every active
jurisdiction. One-time script. Then archive the script.

Steps:
1. Write tooele-land-intel/scripts/backfill_historical.py
   - For each jurisdiction in jurisdictions.yaml:
     - Paginate through PMN body archives (or city website) going back
       24 months from today
     - Download every PDF agenda
     - Parse, classify, dedupe against existing agenda_items.csv
     - Bulk-write rows
2. Run the LLM splitter on all the new rows:
   - python scripts/split_agenda_items.py --input <new_rows>
   - Cap cost at $50 for the whole backfill — Haiku is cheap, but
     5000 rows × tokens adds up
3. Run geocoding on all the new rows
4. Trigger one weekly digest run with the full corpus to test load
   characteristics

Decisions:
- If a city's historical archive only goes back 12 months: take what
  you can get, note in PROJECT_STATE.md
- If the dedupe is producing false positives: investigate the hash
  function before pushing
- Cost cap is $50 for this phase — if you'd exceed, stop and ask

Verification:
- Total agenda_items.csv rows: expect 1500-3000 across all jurisdictions
- Frontend Agendas route loads <2s with the larger dataset
- If load times degrade noticeably, this is the trigger to migrate
  data layer to D1 or Postgres (separate phase)
- PROJECT_STATE.md updated

STOP and summarize. Then archive backfill_historical.py to a
scripts/archive/ subdirectory so it doesn't get re-run accidentally.
```

---

# AFTER PHASE 10

The MVP-plus is done. From here, the next batch of work is the "future" features in `tli-full-spec.md` §6 and §7:
- Claude-vision site plan extraction
- PMN audio transcription
- Site plan polygon overlay (georeferencing)
- UDOT corridor + utility overlays
- Greenbelt/rollback tax surfacing
- Cross-jurisdiction pattern detection (developer activity heatmap algorithms)

Each of those gets its own prompt when you're ready. Treat each as a Phase 11+ — write a focused brief, paste, walk away.

---

## TROUBLESHOOTING — when an agent gets stuck

If you check in and the agent is stalled, halted, or asked an unexpected question:

1. **Read the last 20 lines of its output.** Usually the issue is one specific error.
2. **Check the PROJECT_STATE.md PHASE_LOG.** Did the agent commit anything before stalling?
3. **Check the GitHub Actions tab.** Is a workflow failing?
4. **Most common stalls:**
   - Cloudflare API token expired → regenerate, update GitHub secret
   - GitHub Codespaces token reverted → `unset GITHUB_TOKEN GH_TOKEN && gh auth login`
   - Lovable's vite plugin conflict → don't add tanstackStart/cloudflare/tailwind manually
   - Type errors after Phase 1 — `mock-data.ts` shim left orphan lines → just delete the orphaned exports

5. **Recovery prompt:**
   ```
   You hit a blocker on Phase N. Read the last commit and the current state
   of the affected files. Diagnose what went wrong, fix it, and continue
   from where you stopped. Do not redo work that's already committed.
   ```

---

## END
