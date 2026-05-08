# Phase 13b-8 Runbook: Vacancy Classification for Wasatch Intel Parcels

**Author:** Manus AI  
**Phase:** 13b-8  
**Repos:** `camsrigby-hash/tooele-land-intel` and `camsrigby-hash/wasatch-intel`  
**Branch:** `phase-13b-8-vacancy-class`

## Purpose

This runbook documents the **parcel vacancy classification** handoff for Phase 13b-8. The deliverable classifies each generated parcel row into one of four allowed values for `parcel_records.vacancy_class`: `vacant`, `partial`, `developed`, or `unknown`. The classification output is generated in `tooele-land-intel` and loaded into the D1 `parcel_records` table through the `wasatch-intel` workflow.

> CC verification is intentionally left as the final authority. This implementation does **not** perform direct D1 verification queries; the loader only generates `UPDATE` statements and, when run with `dry_run=false`, applies those statements to `parcel_records.vacancy_class`.

## Deliverables

| Repository | Path | Purpose |
|---|---|---|
| `tooele-land-intel` | `scripts/classify_parcel_vacancy.py` | Reads county parcel CSVs and assigns `vacancy_class` plus auditable `source_signal`. |
| `tooele-land-intel` | `.github/workflows/classify_parcel_vacancy.yml` | Regenerates and validates the classification CSV through GitHub Actions. |
| `tooele-land-intel` | `data/raw/parcel_vacancy_class.csv` | Final loadable CSV with columns `parcel_id`, `vacancy_class`, and `source_signal`. |
| `wasatch-intel` | `.github/workflows/load_vacancy_class_to_d1.yml` | Downloads the CSV, generates 500-row SQL chunks, and updates `parcel_records.vacancy_class` with 15/30/60-second retry backoff. |
| `wasatch-intel` | `docs/sub-tasks/13b-8_runbook.md` | This operator and verifier handoff document. |

## Classification cascade

The classifier uses a deterministic first-match cascade. It gives primary weight to UGRC LIR-style property type and land-use labels, then to improvement value relative to land value, and finally to disclosed low-confidence fallbacks where the county export omits both market-value fields.

| Order | Signal | Output class | `source_signal` |
|---:|---|---|---|
| 1 | Property type, property class, or land-use text contains labels such as `Vacant`, `Agricultural`, `Greenbelt`, `Farm`, `Ranch`, `Open Space`, or `Undeveloped`. | `vacant` | `land_use_field` |
| 2 | `improvement_value` or compatible building/improvement value field is `0` or null while a land/market value field is present. | `vacant` | `improvement_value_zero_or_null` |
| 3 | `improvement_value > 0` and `improvement_value < 0.20 × land_value`. | `partial` | `improvement_value_lt_20pct_land_value` |
| 4 | `improvement_value >= 0.20 × land_value`. | `developed` | `improvement_value_ge_20pct_land_value` |
| 5 | Both improvement and land value are missing, but building fields show physical improvements. | `developed` | `building_fields_no_values` |
| 6 | Both value fields are missing, but property type/land-use text is clearly developed, commercial, residential, industrial, mixed-use, exempt, centrally assessed, or personal property. | `developed` | `developed_land_use_no_values` |
| 7 | Both value fields are missing and the row otherwise appears to be a valid LIR parcel record with non-`Unknown` property metadata. | `developed` | `missing_values_default_developed` |
| 8 | Both value fields are missing and no usable property, land-use, or building evidence exists. | `unknown` | `missing_improvement_and_land_value` |

The fallback signals in rows 5 through 7 are intentionally visible in `source_signal` so CC can isolate them during spot checks. These fallbacks prevent county CSV exports with omitted valuation fields from inflating the `unknown` bucket, while still preserving full auditability.

## Generated output summary

The current generated CSV contains one row per distinct `parcel_id`. Duplicate parcel IDs across raw county exports are resolved by retaining the strongest `source_signal` according to the classifier priority order. This mirrors the D1 `parcel_records.id` update target, where each `parcel_id` can receive only one final `vacancy_class` value.

| Metric | Value |
|---|---:|
| Raw rows read | 276,749 |
| Distinct parcel rows written | 222,667 |
| Duplicate parcel-id rows resolved | 54,082 |
| CSV line count including header | 222,668 |

| Vacancy class | Count | Share |
|---|---:|---:|
| `vacant` | 51,024 | 22.91% |
| `partial` | 1,475 | 0.66% |
| `developed` | 170,144 | 76.41% |
| `unknown` | 24 | 0.01% |

| Source signal | Count | Share |
|---|---:|---:|
| `improvement_value_ge_20pct_land_value` | 110,874 | 49.79% |
| `building_fields_no_values` | 39,331 | 17.66% |
| `improvement_value_zero_or_null` | 33,238 | 14.93% |
| `land_use_field` | 17,786 | 7.99% |
| `missing_values_default_developed` | 16,864 | 7.57% |
| `developed_land_use_no_values` | 3,075 | 1.38% |
| `improvement_value_lt_20pct_land_value` | 1,475 | 0.66% |
| `missing_improvement_and_land_value` | 24 | 0.01% |

The overall distribution satisfies the requested sanity bands: **vacant is 22.91%**, **developed is 76.41%**, and **unknown is 0.01%**.

## Operator procedure

The generation workflow is in `tooele-land-intel`. When manually dispatched, it runs the Python classifier, validates the schema and distribution, uploads artifacts, and can commit the regenerated output if `commit_results=true`.

```bash
cd tooele-land-intel
python scripts/classify_parcel_vacancy.py \
  --input-glob "data/raw/parcels_*.csv" \
  --output data/raw/parcel_vacancy_class.csv \
  --summary data/raw/parcel_vacancy_class_summary.txt
```

The D1 loader workflow is in `wasatch-intel`. It defaults to `dry_run=true`, which only downloads `parcel_vacancy_class.csv`, validates it, creates `/tmp/vacancy/sql/chunk_*.sql`, and uploads those chunks as artifacts. To apply changes, manually dispatch the workflow with `dry_run=false` after CC review.

| Workflow input | Default | Notes |
|---|---|---|
| `tooele_ref` | `phase-13b-8-vacancy-class` | The ref used to download `data/raw/parcel_vacancy_class.csv` from `tooele-land-intel`. |
| `dry_run` | `true` | Leave as `true` for SQL artifact generation only. Set to `false` only when authorized to write D1. |

## D1 update behavior

The loader generates 500-row SQL files. Each row is updated with a statement shaped as follows:

```sql
UPDATE parcel_records
SET vacancy_class = 'developed'
WHERE id = 'example-parcel-id';
```

The workflow applies chunks in lexical order and retries each failed chunk after **15 seconds**, **30 seconds**, and **60 seconds**. The loader does not issue post-write `SELECT` verification queries; CC should verify row coverage and distribution separately.

## CC verification checklist

CC should verify D1 state after the loader is run with `dry_run=false`. The recommended checks are listed below as handoff guidance only; they are not embedded in the workflow.

| Check | Expected outcome |
|---|---|
| Coverage | Every target parcel updated from `parcel_vacancy_class.csv` has one of `vacant`, `partial`, `developed`, or `unknown`. |
| Distribution | Overall `vacant` remains within the expected 5–25% band, `developed` remains within the 60–90% band, and `unknown` remains below 5%. |
| Erda spot checks | Known vacant parcels in Erda should resolve to `vacant`, most commonly via `land_use_field` or `improvement_value_zero_or_null`. |
| Downtown Salt Lake spot checks | Known downtown Salt Lake commercial parcels should resolve to `developed`, normally via `improvement_value_ge_20pct_land_value` when Salt Lake rows are present in the source data used by CC. |
| Fallback audit | Rows with `missing_values_default_developed`, `building_fields_no_values`, or `developed_land_use_no_values` should be sampled to ensure the fallback is acceptable for counties that omit value fields. |

## Rollback guidance

If CC identifies a material classification issue before merge, update the classifier cascade in `tooele-land-intel`, regenerate `data/raw/parcel_vacancy_class.csv`, and re-run the Wasatch dry run to produce new SQL artifacts. If a D1 load has already been applied, the safest rollback is to regenerate the previous classification CSV and run a replacement `UPDATE` workflow, because the workflow updates only `parcel_records.vacancy_class` and does not mutate parcel geometry or valuation fields.

## References

[1]: https://docs.github.com/actions/using-workflows/events-that-trigger-workflows#workflow_dispatch "GitHub Actions documentation: workflow_dispatch"  
[2]: https://developers.cloudflare.com/workers/wrangler/commands/#d1 "Cloudflare Wrangler documentation: D1 commands"
