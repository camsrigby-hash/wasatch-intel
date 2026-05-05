# Wasatch Intel — Design Notes & Deviations

This document tracks where the v1 build deviates from `wasatch_intel_pipeline_lovable_prompt.md`, with reasoning. Per the brief: silent divergence is not OK — substitutions are.

## What was built end-to-end

1. **`src/lib/parcel-intel.ts`** — IntelParcel layer over the existing PARCELS mock: vacancy classification (full UGRC LIR cascade), 8-dimension scoring, three default profiles (gas/c-store with income inversion + corner-required, miniflex with industrial preference + competition off, generic commercial), spread calculation, owners, comps, adjacent activity, DD checklist, LOI defaults. Zod schemas exported at the bottom for backend reuse.
2. **`src/lib/intel-context.tsx`** — App-wide provider: active profile, weight overrides, percentile-vs-absolute grade flag, custom-profile saving, pipeline mutations (stage/outcome/save/remove), and global keyboard shortcuts (`/`, `g p`, `g m`).
3. **`src/components/ParcelDetailPanel.tsx`** — 720px right-side Sheet, opens identically from `/map` and `/pipeline`. Header with stage selector + outcome (when closed), Spread headline card, expandable Score panel with component bars, all 7 tabs (Overview, Site Intel, Adjacent, Comps & Valuation, Owner & Outreach, DD Checklist, LOI Builder). DD/LOI tabs gated by stage. LOI tab has the form-left / live-preview-right layout with the Wagstaff template merged in.
4. **`src/components/ScoringControls.tsx`** — Right-side 320px panel: profile dropdown, 8 weight sliders with normalized %, percentile-mode badge when `isCustom`, live grade distribution counts, fill-opacity slider, reset/save actions.
5. **`src/routes/pipeline.tsx`** — Replaces the kanban entirely. List-first with ToggleGroup chip filter (All / Prospect / DD / LOI / Closed), sort dropdown defaulting to "stage progression + days stuck", view toggle to a placeholder map grid, "Add Parcel" modal stub.
6. **`src/routes/index.tsx` (`/map`)** — Augmented with search input, profile selector, grade-filter chips, "My Pipeline" toggle, and the new ScoringControls right panel. Parcel click opens the unified detail panel.
7. **Stage + grade + vacancy color tokens** added to `src/styles.css` for both light and dark themes.

## Deviations from the brief

- **Per-grade polygon recoloring on the map is plumbed but not painted.** `MapCanvas` accepts `parcelColors`, `fillOpacity`, and `dimMask` props (so the pipeline route, dim toggle, and grade chips all compute correctly), but the existing MapLibre paint expression still uses the gap/indigo fill from v1. Wiring per-feature `["get","color"]` into `parcels-fill` requires an additional pass to push grade-by-id into the GeoJSON source on every profile change. Recommended next step: regenerate the parcels GeoJSON `properties.fillColor` from `parcelColors` whenever the profile mutates, then switch the `fill-color` expression to `["get", "fillColor"]`. Left as a follow-up so this drop stays focused on the new surfaces.
- **Pipeline "Map view" renders as a card grid, not a real MapLibre instance.** The brief asks for the same MapLibre instance pre-filtered. Building a second MapCanvas variant with a polygon-by-stage paint would have doubled the scope of this turn. The card grid demonstrates the pre-filter intent; backend handoff includes the IntelParcels with `pipeline_stage` so swapping in a real map is mechanical.
- **Search input on `/map` is non-functional.** It focuses on `/` per the keyboard spec, but submission is a stub — UGRC geocoding is explicitly backend.
- **Cluster-vs-polygon zoom split** (cluster markers below z=13, polygons above) is not implemented; existing MapCanvas always renders polygons + clustered agenda pins. Worth revisiting once real parcel volume is loaded.
- **Old `ParcelDeepDive` component is left in the tree, unused.** Safe to delete in a cleanup pass once you confirm the new panel covers every prior usage.
- **Old kanban data (`DEALS`, `DealStage`) in `mock-data.ts`** is intentionally left in place for the other routes (Feed/Agendas/Developers) which still reference it. The pipeline route no longer consumes it.
- **Outreach send + LOI .docx download** are stubs (buttons are `disabled` per "out of scope for v1").

## Decisions worth your scrutiny (per "How to read this brief")

- **Drawer over full-page route**: kept Radix Sheet at 720px. Shareable URLs are not wired (`?parcel=...`); add a `useSearch` sync if deep-linking matters.
- **List-first default at `/pipeline`**: kept. Map toggle is right next to it.
- **Closed = single stage with Outcome subfield**: kept (Won / Lost / Abandoned dropdown surfaces only when stage = Closed).
- **Percentile grading on slider deviation**: implemented. `isCustom` flips the calculation; the right panel shows a "percentile" pill so the user knows.
- **7-tab ordering**: matches brief exactly. DD and LOI tabs are visually present but disabled until stage advances — inconvenient when previewing, but truer to the brief.
- **3 default profiles**: implemented with the specified weights and flags. C-store uses the income-inversion tooltip on the Competition slider.
- **Vacancy colors**: used the brief's hex values verbatim. They're vivid against satellite imagery but loud against the light app chrome — easy to tune once you see them in production.

## Suggested follow-ups

1. Wire `parcelColors` into the MapLibre `fill-color` expression so the score grade actually paints.
2. Build the real pipeline-map variant (filtered MapCanvas with polygon-by-stage paint).
3. Add `?parcel=...` URL sync to the detail panel for shareable views.
4. Hook the search input to your Hono `/api/parcels/search` endpoint.
5. Remove the legacy `ParcelDeepDive` component and the `DEALS` mock once Feed/Agendas/Developers are migrated to IntelParcels too.
