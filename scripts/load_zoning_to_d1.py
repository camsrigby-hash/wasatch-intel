#!/usr/bin/env python3
"""
Phase 18b-3 / 18b-2e: per-parcel zoning + GP/FLU join -> D1 UPDATE SQL chunks

Reads:
  $PARCEL_DIR/parcels_{salt_lake,utah,tooele}.csv   (centroid_lng/lat + parcel_id)
  $TOOELE_LAND_INTEL_DIR/data/zoning/current/*_ut_zoning.geojson
  $TOOELE_LAND_INTEL_DIR/data/zoning/future/*_gp.geojson
  $TOOELE_LAND_INTEL_DIR/data/zoning/future/herriman_gp_parcel_table.csv
  $TOOELE_LAND_INTEL_DIR/data/zoning/gp_taxonomy.yaml  (18b-2e normalization)

Writes:
  $OUT_DIR/chunk_NNNN.sql   (500-row UPDATE batches, D1-ready)
  $OUT_DIR/summary.json
"""

import csv, gzip, json, os, pathlib, sys
csv.field_size_limit(sys.maxsize)

try:
    from shapely.geometry import shape, Point
    from shapely.strtree import STRtree
except ImportError:
    sys.exit("ERROR: shapely not installed. pip install shapely")

try:
    import yaml
except ImportError:
    sys.exit("ERROR: pyyaml not installed. pip install pyyaml")

# ── Paths ─────────────────────────────────────────────────────────────────────
TOOELE_DIR = pathlib.Path(os.environ.get("TOOELE_LAND_INTEL_DIR", ""))
if not TOOELE_DIR.exists():
    sys.exit(f"ERROR: TOOELE_LAND_INTEL_DIR not set or missing: {TOOELE_DIR!r}")

PARCEL_DIR = pathlib.Path(os.environ.get("PARCEL_DIR", "/tmp/parcels"))
OUT_DIR    = pathlib.Path(os.environ.get("OUT_DIR",    "/tmp/zoning_sql_chunks"))
OUT_DIR.mkdir(parents=True, exist_ok=True)

CURRENT_DIR  = TOOELE_DIR / "data" / "zoning" / "current"
FUTURE_DIR   = TOOELE_DIR / "data" / "zoning" / "future"
TAXONOMY_FILE = TOOELE_DIR / "data" / "zoning" / "gp_taxonomy.yaml"

CHUNK_SIZE = 500
COUNTY_FILES = ["salt_lake", "utah", "tooele"]

# ── Per-GP-file metadata: (zone_future_source, flu_currency_note) ─────────────
FUTURE_GP_META = {
    "american_fork_gp":    ("REST",       None),
    "bluffdale_gp":        ("REST",       None),
    "draper_gp":           ("REST",       None),
    # eagle_mountain_gp EXCLUDED: EM FLU has no authoritative REST source (18b-2e, Prompt C pending).
    # zone_future will be NULL for EM parcels until Prompt C (Cam-KMZ overlay) populates it.
    # Restore when: tooele-land-intel/data/zoning/future/eagle_mountain_gp.kmz delivered by Cam.
    "grantsville_gp":      ("REST",       None),
    "lehi_gp":             ("REST",       None),                  # 18b-2e: NLS replaced with city REST (April 2026)
    "saratoga_springs_gp": ("REST",       "Ord 25-75 Dec 2 2025 was Water Element only; FLU layer is current adopted"),
    "south_jordan_gp":     ("REST",       None),
    "spanish_fork_gp":     ("PDF_vision", None),
    "tooele_city_gp":      ("REST",       None),
    "vineyard_gp":         ("REST",       None),
}

# 18b-2e: Lehi + SS + EM zoning NLS replaced with city REST sources.
# EM ordinance code notes (17, 17.25) removed — EMC_Zoning_View General_Zoning domain supersedes them.
CURRENT_CITY_NOTES: dict[str, str] = {}

# Per zone-code notes added to flu_currency_note when that raw code is matched.
CURRENT_CODE_NOTES: dict[tuple, str] = {}

# Cities that carry extra raw fields in their current-zoning GeoJSON (18b-2e EM parcel layer).
# These populate zone_current_raw and current_landuse columns in D1 (migration 0010).
EM_RAW_PROPS_CITY = "eagle_mountain"


# ── Helpers ───────────────────────────────────────────────────────────────────
def _q(v):
    """SQL-quote a string value, returning NULL literal for empty/None."""
    if v is None or str(v).strip() == "":
        return "NULL"
    return "'" + str(v).replace("'", "''") + "'"


def _open_csv(path: pathlib.Path):
    if path.suffix == ".gz":
        return gzip.open(path, "rt", encoding="utf-8")
    return open(path, encoding="utf-8")


# ── Taxonomy loading ──────────────────────────────────────────────────────────
def load_taxonomy() -> tuple[dict, dict]:
    """Load gp_taxonomy.yaml; return (current_rules, future_rules)."""
    if not TAXONOMY_FILE.exists():
        print(f"  WARN: gp_taxonomy.yaml not found at {TAXONOMY_FILE}", flush=True)
        return {}, {}
    with open(TAXONOMY_FILE, encoding="utf-8") as f:
        taxonomy = yaml.safe_load(f) or {}
    current = taxonomy.get("current_zoning", {})
    future  = taxonomy.get("future_zoning",  {})
    print(
        f"  Taxonomy loaded: {len(current)} current city rule-sets, "
        f"{len(future)} future city rule-sets",
        flush=True,
    )
    return current, future


def normalize_current(city_slug: str, zone_code: str,
                      geojson_norm: str, current_rules: dict) -> str | None:
    """
    Compute zone_current_normalized for a parcel.

    SD-26: taxonomy is authoritative. Consult gp_taxonomy.yaml first; fall back
    to GeoJSON zone_class_normalized only for codes with no taxonomy entry.
    Returns None if unmapped (stored as SQL NULL).
    """
    # Taxonomy wins — overrides ArcGIS REST zone_class_normalized
    city_rules = current_rules.get(city_slug, {})
    if zone_code in city_rules:
        normalized = city_rules[zone_code]
        return None if normalized == "Other/Unknown" else normalized
    # Fall back to GeoJSON zone_class_normalized for codes not in taxonomy
    existing = (geojson_norm or "").strip()
    if existing and existing != "Other/Unknown":
        return existing
    return None


def normalize_future(gp_slug: str, zone_code: str,
                     future_rules: dict) -> str | None:
    """
    Compute zone_future_normalized for a parcel.

    gp_slug is the GP file slug (e.g. 'tooele_city_gp'); strip '_gp' suffix
    to match the taxonomy key. Returns None if unmapped.
    """
    city_key = gp_slug.replace("_gp", "")
    city_rules = future_rules.get(city_key, {})
    normalized = city_rules.get(zone_code)
    return None if normalized == "Other/Unknown" else normalized


def normalize_herriman(sampled_zone: str, future_rules: dict) -> str | None:
    city_rules = future_rules.get("herriman", {})
    normalized = city_rules.get(sampled_zone)
    return None if normalized == "Other/Unknown" else normalized


# ── Stage 1: load Herriman per-parcel table ───────────────────────────────────
def load_herriman_table() -> dict:
    """Return {parcel_id: (sampled_zone, parcel_city)}."""
    path = FUTURE_DIR / "herriman_gp_parcel_table.csv"
    if not path.exists():
        print(f"  WARN: herriman_gp_parcel_table.csv not found at {path}", flush=True)
        return {}
    result = {}
    with open(path, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            pid  = row.get("parcel_id", "").strip()
            zone = row.get("sampled_zone", "").strip()
            city = row.get("parcel_city", "").strip()
            if pid and zone:
                result[pid] = (zone, city)
    print(f"  Herriman parcel table: {len(result):,} parcels", flush=True)
    return result


# ── Stage 2: build current-zoning STRtree ────────────────────────────────────
def build_current_tree():
    """Return (STRtree, list_of_shapes, list_of_meta_dicts)."""
    polygons, meta = [], []
    for geojson_path in sorted(CURRENT_DIR.glob("*_ut_zoning.geojson")):
        city_slug = geojson_path.stem.replace("_ut_zoning", "").replace("_ut", "")
        note = CURRENT_CITY_NOTES.get(city_slug)
        with open(geojson_path, encoding="utf-8") as f:
            fc = json.load(f)
        for feat in fc.get("features", []):
            geom = feat.get("geometry")
            if not geom:
                continue
            try:
                shp   = shape(geom)
                props = feat.get("properties", {})
                zone_code    = (props.get("zone_code") or "").strip()
                geojson_norm = (props.get("zone_class_normalized") or "").strip()
                polygons.append(shp)
                meta.append({
                    "zone_code":       zone_code,
                    "geojson_norm":    geojson_norm,
                    "source":          props.get("extraction_method") or "REST",
                    "city_slug":       city_slug,
                    "note":            note,
                    # EM parcel-level extras (18b-2e); None for all other cities
                    "zone_current_raw":  props.get("zone_current_raw") or None,
                    "current_landuse":   props.get("current_landuse") or None,
                })
            except Exception:
                pass
    print(f"  Current zoning: {len(polygons):,} polygons from {CURRENT_DIR}", flush=True)
    return STRtree(polygons), polygons, meta


# ── Stage 3: build future GP STRtree ─────────────────────────────────────────
def build_future_tree():
    """Return (STRtree, list_of_shapes, list_of_meta_dicts). Herriman excluded (uses CSV)."""
    polygons, meta = [], []
    for slug, (future_source, currency_note) in FUTURE_GP_META.items():
        geojson_path = FUTURE_DIR / f"{slug}.geojson"
        if not geojson_path.exists():
            print(f"  WARN: {geojson_path.name} not found, skipping", flush=True)
            continue
        with open(geojson_path, encoding="utf-8") as f:
            fc = json.load(f)
        count = 0
        for feat in fc.get("features", []):
            geom = feat.get("geometry")
            if not geom:
                continue
            try:
                shp   = shape(geom)
                props = feat.get("properties", {})
                raw_code = (props.get("gp_zone_code") or "").strip()

                # Tooele City: comma-separated codes — split into primary + secondary
                if raw_code and "," in raw_code:
                    tokens    = [t.strip() for t in raw_code.split(",") if t.strip()]
                    zone_code = tokens[0]
                    secondary = ",".join(tokens[1:])
                else:
                    zone_code = raw_code
                    secondary = ""

                # Per-feature provenance_note (Lehi GP miscoded features, 18b-2e)
                feat_note = (props.get("provenance_note") or "").strip() or None

                polygons.append(shp)
                meta.append({
                    "zone_code":       zone_code,
                    "zone_secondary":  secondary,
                    "source":          future_source,
                    "currency_note":   currency_note,
                    "provenance_note": feat_note,
                    "slug":            slug,
                })
                count += 1
            except Exception:
                pass
        print(f"  {slug}: {count} future GP polygons", flush=True)
    print(f"  Future GP total: {len(polygons):,} polygons", flush=True)
    return STRtree(polygons), polygons, meta


# ── Stage 4: point-in-polygon lookup ─────────────────────────────────────────
def lookup(lng: float, lat: float, tree: STRtree, shapes: list, meta: list) -> dict | None:
    """Return first meta dict where point is within polygon, or None."""
    pt = Point(lng, lat)
    for idx in tree.query(pt, predicate="within"):
        return meta[idx]
    return None


# ── Stage 5: stream parcels and generate UPDATE SQL ──────────────────────────
def process_county(
    county: str,
    current_tree: STRtree, current_shapes: list, current_meta: list,
    future_tree: STRtree, future_shapes: list, future_meta: list,
    herriman_table: dict,
    current_rules: dict,
    future_rules: dict,
    chunk_buf: list,
    chunk_num_ref: list,
    stats: dict,
):
    """Stream one county parcel CSV and extend chunk_buf with UPDATE statements."""
    path_gz  = PARCEL_DIR / f"parcels_{county}.csv.gz"
    path_csv = PARCEL_DIR / f"parcels_{county}.csv"
    if path_gz.exists():
        path = path_gz
    elif path_csv.exists():
        path = path_csv
    else:
        print(f"  ERROR: no parcel file for county={county} in {PARCEL_DIR}", flush=True)
        stats["missing_counties"].append(county)
        return

    rows_read = rows_assigned_current = rows_assigned_future = 0

    with _open_csv(path) as f:
        reader = csv.DictReader(f)
        for row in reader:
            pid = (row.get("parcel_id") or "").strip()
            if not pid:
                continue
            try:
                lng = float(row["centroid_lng"])
                lat = float(row["centroid_lat"])
            except (KeyError, ValueError, TypeError):
                stats["bad_centroid"] += 1
                continue
            rows_read += 1

            # — Current zoning —
            cur = lookup(lng, lat, current_tree, current_shapes, current_meta)
            if cur:
                zone_current        = cur["zone_code"]
                zone_current_source = cur["source"]
                current_note        = cur["note"]
                zone_current_norm   = normalize_current(
                    cur["city_slug"], zone_current, cur["geojson_norm"], current_rules
                )
                per_code_note       = CURRENT_CODE_NOTES.get((cur["city_slug"], zone_current))
                # EM parcel-level extras (18b-2e; None for all other cities)
                zone_current_raw    = cur.get("zone_current_raw")
                parcel_current_lu   = cur.get("current_landuse")
            else:
                zone_current        = None
                zone_current_source = None
                current_note        = None
                zone_current_norm   = None
                per_code_note       = None
                zone_current_raw    = None
                parcel_current_lu   = None

            # — Future GP —
            zone_future_secondary = None
            prov_note             = None
            if pid in herriman_table:
                hz, hcity          = herriman_table[pid]
                zone_future        = hz
                zone_future_source = "PDF_raster_Cam_KMZ"
                flu_source_jur     = hcity if hcity and hcity.lower() != "herriman" else None
                future_note        = None
                zone_future_norm   = normalize_herriman(hz, future_rules)
            else:
                fut = lookup(lng, lat, future_tree, future_shapes, future_meta)
                if fut:
                    zone_future        = fut["zone_code"]
                    zone_future_source = fut["source"]
                    flu_source_jur     = None
                    future_note        = fut["currency_note"]
                    zone_future_norm   = normalize_future(
                        fut["slug"], zone_future, future_rules
                    )
                    # Secondary codes (Tooele City comma-separated)
                    sec = fut.get("zone_secondary", "")
                    zone_future_secondary = sec if sec else None
                    # Per-feature provenance_note (Lehi GP miscoded features, 18b-2e)
                    prov_note = fut.get("provenance_note")
                else:
                    zone_future        = None
                    zone_future_source = None
                    flu_source_jur     = None
                    future_note        = None
                    zone_future_norm   = None
                    prov_note          = None

            # Combine all currency notes (per-city, per-code, per-future-polygon, per-provenance)
            notes = [n for n in (current_note, per_code_note, future_note, prov_note) if n]
            flu_currency_note = ";".join(notes) if notes else None

            if zone_current:
                rows_assigned_current += 1
            if zone_future:
                rows_assigned_future += 1

            # Skip parcels with no zoning data at all
            if not zone_current and not zone_future:
                continue

            stmt = (
                f"UPDATE parcel_records SET "
                f"zone_current={_q(zone_current)}, "
                f"zone_current_source={_q(zone_current_source)}, "
                f"zone_current_normalized={_q(zone_current_norm)}, "
                f"zone_current_raw={_q(zone_current_raw)}, "
                f"current_landuse={_q(parcel_current_lu)}, "
                f"zone_future={_q(zone_future)}, "
                f"zone_future_source={_q(zone_future_source)}, "
                f"zone_future_normalized={_q(zone_future_norm)}, "
                f"zone_future_secondary={_q(zone_future_secondary)}, "
                f"flu_source_jurisdiction={_q(flu_source_jur)}, "
                f"flu_currency_note={_q(flu_currency_note)} "
                f"WHERE id={_q(pid)};"
            )
            chunk_buf.append(stmt)

            if len(chunk_buf) >= CHUNK_SIZE:
                _flush_chunk(chunk_buf, chunk_num_ref)

    stats["rows_by_county"][county]             = rows_read
    stats["assigned_current_by_county"][county] = rows_assigned_current
    stats["assigned_future_by_county"][county]  = rows_assigned_future
    print(
        f"  {county}: {rows_read:,} parcels, "
        f"zone_current={rows_assigned_current:,}, zone_future={rows_assigned_future:,}",
        flush=True,
    )


def _flush_chunk(buf: list, num_ref: list):
    chunk_path = OUT_DIR / f"chunk_{num_ref[0]:04d}.sql"
    chunk_path.write_text("\n".join(buf), encoding="utf-8")
    num_ref[0] += 1
    buf.clear()


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    print("Phase 18b-3 / 18b-2e: building zoning join SQL chunks", flush=True)
    print(f"  TOOELE_LAND_INTEL_DIR = {TOOELE_DIR}", flush=True)
    print(f"  PARCEL_DIR = {PARCEL_DIR}", flush=True)
    print(f"  OUT_DIR    = {OUT_DIR}", flush=True)

    current_rules, future_rules = load_taxonomy()
    herriman_table               = load_herriman_table()
    current_tree, current_shapes, current_meta = build_current_tree()
    future_tree,  future_shapes,  future_meta  = build_future_tree()

    stats = {
        "rows_by_county":             {},
        "assigned_current_by_county": {},
        "assigned_future_by_county":  {},
        "bad_centroid":               0,
        "missing_counties":           [],
    }
    chunk_buf = []
    chunk_num = [0]

    for county in COUNTY_FILES:
        print(f"\nProcessing county: {county}", flush=True)
        process_county(
            county,
            current_tree, current_shapes, current_meta,
            future_tree,  future_shapes,  future_meta,
            herriman_table,
            current_rules,
            future_rules,
            chunk_buf, chunk_num, stats,
        )

    if chunk_buf:
        _flush_chunk(chunk_buf, chunk_num)

    total_parcels = sum(stats["rows_by_county"].values())
    total_current = sum(stats["assigned_current_by_county"].values())
    total_future  = sum(stats["assigned_future_by_county"].values())

    summary = {
        "total_parcels_processed": total_parcels,
        "zone_current_assigned":   total_current,
        "zone_future_assigned":    total_future,
        "sql_chunks":              chunk_num[0],
        "bad_centroid_rows":       stats["bad_centroid"],
        "missing_counties":        stats["missing_counties"],
        "by_county": {
            c: {
                "parcels":      stats["rows_by_county"].get(c, 0),
                "zone_current": stats["assigned_current_by_county"].get(c, 0),
                "zone_future":  stats["assigned_future_by_county"].get(c, 0),
            }
            for c in COUNTY_FILES
        },
    }
    (OUT_DIR / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")

    print("\n--- Summary -------------------------------------------------", flush=True)
    print(f"  Parcels processed : {total_parcels:,}", flush=True)
    print(f"  zone_current set  : {total_current:,} ({total_current/max(total_parcels,1)*100:.1f}%)", flush=True)
    print(f"  zone_future set   : {total_future:,}  ({total_future/max(total_parcels,1)*100:.1f}%)", flush=True)
    print(f"  SQL chunks written: {chunk_num[0]}", flush=True)

    github_env = os.environ.get("GITHUB_ENV", "")
    if github_env:
        with open(github_env, "a") as genv:
            genv.write(f"TOTAL_PARCELS={total_parcels}\n")
            genv.write(f"ZONE_CURRENT_COUNT={total_current}\n")
            genv.write(f"ZONE_FUTURE_COUNT={total_future}\n")
            genv.write(f"CHUNK_COUNT={chunk_num[0]}\n")

    if stats["missing_counties"]:
        sys.exit(f"ERROR: missing parcel files for counties: {stats['missing_counties']}")


if __name__ == "__main__":
    main()
