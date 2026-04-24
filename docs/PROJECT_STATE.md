# PROJECT_STATE.md — Wasatch Intel

## REFERENCES

- `docs/CM_RE_INTEGRATION.md` — inventory of a prior related project whose scraper, parser, aggregator, and UGRC fetcher code is reusable for Phases 3–6 and 9. The code itself lives under `tooele-land-intel/vendor/cm_re/` after running `cm_re_extract.sh`. Read this before Phase 1 (parser schema upgrade), Phase 3 (UGRC patterns), and Phase 9 (per-city expansion via PMN).

---

## PHASE_LOG

### 2026-04-23 — CM_RE heritage documented — Claude (Opus 4.7) via claude.ai chat
Catalogued reusable modules from the prior CM_RE project (Davis+Weber CRE
site-selection tool). Created CM_RE_INTEGRATION.md, PROMPT_PLAYBOOK_ADDENDUM.md,
and cm_re_extract.sh. No code ported yet — extraction and porting happen in
the respective phases (Phase 1 schema upgrade, Phase 3/4/5 UGRC/STIP/polygon
work, Phase 9 PMN expansion, Phase 10 NAIP land cover). Scope boundaries
documented: do not drag CRE scorer, Google Places, owner scraping, or
rasterio into MVP.
