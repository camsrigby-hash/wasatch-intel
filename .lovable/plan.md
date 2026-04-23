
# Utah Real Estate Development Intelligence — Frontend Shell

A full frontend shell for a Wasatch Front + Tooele Valley development intelligence product. Every screen is built end-to-end with realistic mocked data so you can demo the full vision and wire your scraper backend in piece by piece.

## Design direction
- **Style**: Light, modern mapping-app aesthetic (think Regrid / Reonomy / Mapbox Studio). Clean white panels, generous whitespace, sharp typography, color reserved for data — heat, signal strength, zoning gaps.
- **Type**: Inter for UI, JBM Mono for numbers/parcel IDs/coordinates.
- **Color**: Neutral grays for chrome, a single deep indigo as primary action color, a calibrated semantic palette (gap / signal / risk / opportunity) so map overlays stay legible.
- **Density**: Information-dense without feeling cramped — small type, tight tables, but breathing room around panels.

## Map stack
**MapLibre GL** (open-source, no API key friction) with **Esri World Imagery** as the satellite basemap and **Protomaps / OSM** for vector context. Wrapped in a thin `<MapCanvas>` abstraction so we can swap to Mapbox GL later without touching feature code. Parcels render as vector polygons, agenda items as clustered pins, heatmaps as native MapLibre heatmap layers, site plans as raster overlays anchored to parcel bounds.

## Information architecture — tabbed workspace

Persistent top bar: logo, global parcel/address/applicant search, jurisdiction filter, date-range, user menu. Tabs underneath:

### 1. Map
The headline view. Full-bleed satellite map of Wasatch Front + Tooele Valley.
- **Left rail (collapsible)**: Layer toggles — Parcels, Zoning vs General Plan gap (color-shaded), Agenda pins (filterable by type/applicant/jurisdiction/date), Developer activity heatmap (which LLCs are land-banking where), Site plan overlays, Utilities/adjacency. Each layer has an opacity slider and legend.
- **Filter bar (top of map)**: Jurisdiction, agenda type, applicant, date range, project size (units/acres), signal strength.
- **Click a parcel → right slide-over "Parcel Deep-Dive"**: zoning + GP, utilities, adjacency, ownership tenure, comps, residual land value calculator, political risk score, related agenda items, site plan preview. Tabs inside the panel: Overview · Agendas · Site Plans · Comps · Notes.
- **Click an agenda pin → compact popover**: applicant, item type, date, jurisdiction, signal score, "open in feed" link.

### 2. Feed (Weekly Digest + Signal Wire)
- **Weekly Digest** at top: "What moved, what matters" — auto-generated summary cards (new high-signal filings, rezones approved, big applicants active, watchlist hits).
- **Signal Wire** below: chronological stream of agenda items + correlated rumor/news chatter, each with proximity-to-your-watchlist math, signal strength bar, jurisdiction tag, "view on map" button. Filterable sidebar (signal threshold, jurisdiction, item type, applicant).

### 3. Agendas
Searchable, filterable table of every scraped agenda item (last 24 months). Columns: date, jurisdiction, item type, applicant/owner, parcel, units/density, status, signal. Row click → detail drawer with full meeting context, transcript snippet (searchable by speaker/topic/outcome), linked site plan, map jump.

### 4. Developers
Leaderboard of builders/LLCs (Ivory Homes, etc.) ranked by activity. Per-developer profile: total units in pipeline, jurisdictions active, parcels owned/optioned, timeline of filings, heatmap of their footprint, recent agenda activity.

### 5. Watchlists
Saved geographies, parcels, applicants, and saved searches. Each watchlist shows recent hits, signal trend chart, and alert preferences (in-app + email push toggle, signal threshold). "New watchlist" wizard: draw on map, pick applicant, or paste parcel IDs.

### 6. Pipeline
Kanban-style deal pipeline (Prospect · Diligence · LOI · Under Contract · Closed/Dead). Cards link back to parcels, carry notes, contacts, residual land value, next action. Side panel for outreach templates (cold landowner letter, broker intro, planner inquiry) with merge fields.

### 7. Search
Global search results page: parcels, agendas, applicants, transcripts, all in one ranked list with facet filters.

## Mocked data
Realistic seed data covering ~12 Wasatch Front + Tooele cities (SLC, Lehi, Saratoga Springs, Eagle Mountain, Vineyard, Herriman, Tooele, Grantsville, Draper, South Jordan, Bluffdale, Spanish Fork): ~200 parcels with geometry, ~400 agenda items across the last 24 months, ~15 named developers/LLCs with footprints, sample site plans, sample transcripts, sample news/rumor items for the Signal Wire. Enough to make every screen feel alive and demoable.

## Routing & SSR
Each tab is a separate TanStack route (`/`, `/feed`, `/agendas`, `/developers`, `/watchlists`, `/pipeline`, `/search`) with its own SEO metadata. Parcel deep-dives use search params (`?parcel=...`) so they're shareable URLs. Map filter state lives in search params too — bookmarkable views.

## Out of scope for v1 (deliberately)
- Real backend wiring (you'll connect your scraper later via a thin data-access layer we'll stub)
- Auth (single-user demo mode; we'll add Lovable Cloud auth when you're ready)
- Real polygon-matching / residual-value math (mocked outputs, real UI)
- Audio playback for transcripts (text only for v1)

After this shell lands, the natural next steps are: (1) wire real scraper data into the agendas + parcels endpoints, (2) add Lovable Cloud auth + per-user watchlists/pipeline, (3) plug the polygon-matching service for site plan overlays, (4) turn on alerting.
