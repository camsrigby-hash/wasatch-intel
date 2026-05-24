"""Phase 18b-2e Wagstaff parcel validation.

Queries UGRC Utah County parcel REST endpoint for parcels owned by Wagstaff Investments
in Saratoga Springs, then does a point-in-polygon lookup against the new SS zoning and
SS FLU GeoJSONs to verify the commercial parcel is correctly classified.

Expected: zone_current should be a commercial/mixed-use zone (NOT residential).
If residential is returned -> STOP, REST data has stale data, escalate.

Run from wasatch-intel repo root:
    py -3 scripts/wagstaff_validation.py
"""

import json
import sys
from pathlib import Path

import requests
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry

try:
    from shapely.geometry import shape, Point
    from shapely.strtree import STRtree
except ImportError:
    sys.exit("ERROR: shapely not installed. pip install shapely")

SS_ZONING_PATH = Path(
    r"C:\Users\camsr\code\tooele-land-intel\data\zoning\current\saratoga_springs_ut_zoning.geojson"
)
SS_FLU_PATH = Path(
    r"C:\Users\camsr\code\tooele-land-intel\data\zoning\future\saratoga_springs_gp.geojson"
)

# UGRC Utah County parcel REST endpoint (public, no auth required)
UGRC_PARCEL_URL = (
    "https://services2.arcgis.com/IM2l7PMCA2pXxGKg/arcgis/rest/services"
    "/Utah_County_Parcels/FeatureServer/0"
)

COMMERCIAL_BUCKETS = {
    "NC", "CC", "HC", "RC", "IC", "MU", "MW", "OW",  # SS zone codes
    "Commercial-General", "Commercial-Neighborhood",    # normalized values
    "Commercial-Office", "Mixed-Use", "Planned/Mixed-Use",
    "Industrial/Flex",
}
RESIDENTIAL_ZONES = {
    "R1-40", "R1-20", "R1-10", "R1-9", "R2-8", "R3-6",
    "MF-10", "MF-14", "MF-18", "MR", "A", "RA-5", "RR",
}


def make_session() -> requests.Session:
    session = requests.Session()
    retries = Retry(total=3, backoff_factor=1.0, status_forcelist=[500, 502, 503, 504])
    session.mount("https://", HTTPAdapter(max_retries=retries))
    session.headers.update({"User-Agent": "TooeleLandIntel/1.0"})
    return session


def build_zoning_tree(geojson_path: Path, zone_field: str):
    with open(geojson_path, encoding="utf-8") as f:
        fc = json.load(f)
    shapes, meta = [], []
    for feat in fc.get("features", []):
        geom = feat.get("geometry")
        if not geom:
            continue
        try:
            shp = shape(geom)
            shapes.append(shp)
            meta.append(feat.get("properties", {}))
        except Exception:
            pass
    return STRtree(shapes), shapes, meta


def lookup_point(lng: float, lat: float, tree: STRtree, meta: list) -> dict | None:
    pt = Point(lng, lat)
    for idx in tree.query(pt, predicate="within"):
        return meta[idx]
    return None


def find_wagstaff_parcels(session: requests.Session) -> list[dict]:
    """Query UGRC Utah County parcels for Wagstaff owner in Saratoga Springs."""
    print("Querying UGRC Utah County parcel endpoint for Wagstaff...")
    params = {
        "where":          "UPPER(OWNER_NAME) LIKE '%WAGSTAFF%'",
        "outFields":      "PARCEL_ID,OWNER_NAME,TOTAL_MKT_VALUE,GIS_ACRES,CITY",
        "returnGeometry": "true",
        "returnCentroid": "true",
        "outSR":          "4326",
        "f":              "json",
    }
    resp = session.get(f"{UGRC_PARCEL_URL}/query", params=params, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    if "error" in data:
        raise RuntimeError(f"UGRC error: {data['error']}")
    features = data.get("features", [])
    print(f"  Found {len(features)} Wagstaff parcel(s) in Utah County")
    return features


def centroid_from_feature(feat: dict) -> tuple[float, float] | None:
    """Extract centroid from feature (returnCentroid or geometry mean)."""
    # Try explicit centroid first
    cent = feat.get("centroid")
    if cent and "x" in cent:
        return cent["x"], cent["y"]
    # Fall back to geometry mean
    geom = feat.get("geometry")
    if not geom:
        return None
    rings = geom.get("rings")
    if rings and rings[0]:
        pts = rings[0]
        lng = sum(p[0] for p in pts) / len(pts)
        lat = sum(p[1] for p in pts) / len(pts)
        return lng, lat
    return None


def main():
    session = make_session()

    # Load SS zoning and FLU GeoJSON trees
    print("Loading SS Zoning GeoJSON...")
    if not SS_ZONING_PATH.exists():
        sys.exit(f"ERROR: SS zoning file not found at {SS_ZONING_PATH}")
    zoning_tree, _, zoning_meta = build_zoning_tree(SS_ZONING_PATH, "zone_code")
    print(f"  Loaded {len(zoning_meta):,} SS zoning polygons")

    print("Loading SS FLU GeoJSON...")
    flu_tree, _, flu_meta = build_zoning_tree(SS_FLU_PATH, "gp_zone_code")
    print(f"  Loaded {len(flu_meta):,} SS FLU polygons")

    # Query UGRC for Wagstaff parcels
    try:
        wagstaff_features = find_wagstaff_parcels(session)
    except Exception as e:
        print(f"UGRC query failed: {e}")
        print("Falling back to manual spatial query at approximate Wagstaff location...")
        # Approximate coords of the commercial area in central SS (from scoping doc description)
        # Based on SS zoning map showing commercial zone in central city near SR-73
        wagstaff_features = []

    if not wagstaff_features:
        print("\nNo UGRC results — trying direct SS REST spatial query at central SS commercial area...")
        # Query SS zoning REST at approximate central SS commercial location
        # Saratoga Springs commercial core near Redwood Rd / Pioneer Crossing
        approx_lngs_lats = [
            (-111.8972, 40.3366),  # central SS near commercial corridor
            (-111.9012, 40.3421),
            (-111.9050, 40.3450),
        ]
        print("\n--- SPATIAL PROBE AT APPROXIMATE WAGSTAFF LOCATION ---")
        for lng, lat in approx_lngs_lats:
            z = lookup_point(lng, lat, zoning_tree, zoning_meta)
            f = lookup_point(lng, lat, flu_tree, flu_meta)
            print(f"  Point ({lng:.4f}, {lat:.4f}):")
            print(f"    zone_current = {z.get('zone_code') if z else 'OUTSIDE ALL POLYGONS'}")
            print(f"    zone_future  = {f.get('gp_zone_code') if f else 'OUTSIDE ALL POLYGONS'}")
        print("\nWARN: Could not locate Wagstaff parcel via UGRC — manual verification required.")
        print("      Query D1: SELECT id, owner_name, centroid_lng, centroid_lat FROM parcel_records")
        print("                WHERE owner_name LIKE '%Wagstaff%' AND jurisdiction='saratoga_springs_ut'")
        return

    # Process Wagstaff parcels in Saratoga Springs
    ss_parcels = []
    for feat in wagstaff_features:
        attrs = feat.get("attributes", {})
        city  = (attrs.get("CITY") or "").upper()
        if "SARATOGA" in city or not city:
            ss_parcels.append(feat)

    if not ss_parcels:
        print(f"\nNo Wagstaff parcels found in Saratoga Springs (all {len(wagstaff_features)} were in other cities).")
        print("Cities found:", [f.get("attributes", {}).get("CITY") for f in wagstaff_features])
        return

    print(f"\n--- WAGSTAFF EYE-TEST RESULTS (Saratoga Springs) ---")
    any_residential = False
    for feat in ss_parcels:
        attrs   = feat.get("attributes", {})
        apn     = attrs.get("PARCEL_ID", "UNKNOWN")
        owner   = attrs.get("OWNER_NAME", "UNKNOWN")
        acres   = attrs.get("GIS_ACRES")
        city    = attrs.get("CITY")
        mkt_val = attrs.get("TOTAL_MKT_VALUE")

        ctr = centroid_from_feature(feat)
        if not ctr:
            print(f"  APN {apn}: no centroid available — skipping spatial lookup")
            continue
        lng, lat = ctr

        z = lookup_point(lng, lat, zoning_tree, zoning_meta)
        f = lookup_point(lng, lat, flu_tree, flu_meta)

        zone_current = z.get("zone_code") if z else None
        zone_norm    = z.get("zone_class_normalized") if z else None
        zone_future  = f.get("gp_zone_code") if f else None

        is_residential = zone_current in RESIDENTIAL_ZONES
        if is_residential:
            any_residential = True

        print(f"\n  APN:          {apn}")
        print(f"  Owner:        {owner}")
        print(f"  City:         {city}")
        print(f"  Acres:        {acres:.2f}" if acres else "  Acres:        N/A")
        print(f"  Market Value: ${mkt_val:,.0f}" if mkt_val else "  Market Value: N/A")
        print(f"  Centroid:     ({lng:.6f}, {lat:.6f})")
        print(f"  zone_current: {zone_current or 'NOT IN ZONING DATA'}")
        print(f"  zone_norm:    {zone_norm or 'N/A'}")
        print(f"  zone_future:  {zone_future or 'NOT IN FLU DATA'}")

        if is_residential:
            print(f"  *** HALT: zone_current={zone_current} is RESIDENTIAL")
            print(f"      This means the SS REST endpoint has stale data for Wagstaff parcel.")
            print(f"      DO NOT PROCEED with D1 load until this is resolved.")
        else:
            print(f"  VALIDATION: {'PASS' if zone_current else 'WARN — parcel outside SS zoning polygons'}")

    if any_residential:
        print("\n\n=== CRITICAL HALT: WAGSTAFF PARCEL SHOWS RESIDENTIAL IN SS REST DATA ===")
        print("The REST endpoint does NOT reflect the commercial rezoning.")
        print("Escalate to Cam before D1 load.")
        sys.exit(1)
    else:
        print("\n\nWagstaff validation: PASS — no residential classification found for Wagstaff parcel(s).")


if __name__ == "__main__":
    main()
