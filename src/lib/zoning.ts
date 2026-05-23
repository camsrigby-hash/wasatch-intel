// Canonical zoning taxonomy — palette, types, and D1 bucket lookup.
// Extracted from zoning-mock.ts (Phase 14b) and wired to real D1 data (Phase 14c).

export type ZoningBucket =
  | "low_res"
  | "med_res"
  | "high_res"
  | "commercial"
  | "mixed_use"
  | "industrial"
  | "open_ag"
  | "public_inst";

export type ZoningView = "current" | "future";

export interface ZoningBucketMeta {
  id: ZoningBucket;
  label: string;
  color: string; // hex, tuned for satellite basemap + CVD distinguishability
}

// Palette tuned for: (1) deuteranopia/protanopia separation via hue+lightness ramp,
// (2) contrast against a dark satellite basemap (mid-to-high lightness),
// (3) distinguishability at low zoom where parcels are <4px.
// Residential ramp shares a warm hue family so density reads as a single axis.
// Commercial/mixed/industrial use saturated reds→magenta→purple as an "intensity" axis.
// Open and Public use cool hues to separate cleanly from the developed ramps.
export const ZONING_BUCKETS: ZoningBucketMeta[] = [
  { id: "low_res",     label: "Low-density residential",     color: "#FFF1B8" },
  { id: "med_res",     label: "Medium-density residential",  color: "#FFD166" },
  { id: "high_res",    label: "High-density residential",    color: "#F4845F" },
  { id: "commercial",  label: "Commercial",                  color: "#E63946" },
  { id: "mixed_use",   label: "Mixed-use",                   color: "#C5468C" },
  { id: "industrial",  label: "Industrial",                  color: "#8E5BD9" },
  { id: "open_ag",     label: "Open / agricultural / special", color: "#4FB477" },
  { id: "public_inst", label: "Public / institutional",      color: "#3A86FF" },
];

export const NO_DATA_COLOR = "#6B7280";

export const BUCKET_BY_ID: Record<ZoningBucket, ZoningBucketMeta> =
  ZONING_BUCKETS.reduce(
    (acc, b) => { acc[b.id] = b; return acc; },
    {} as Record<ZoningBucket, ZoningBucketMeta>,
  );

// Maps zone_current_normalized / zone_future_normalized D1 values → bucket ID.
// Covers all 15 distinct current values and 14 distinct future values in production D1
// as of Phase 14a re-bake (2026-05-23).
//
// NOTE: "Open Space/Public" maps to public_inst (conservative parent), not open_ag.
// Rationale: miscoloring a school/utility green is a higher-cost prospector error than
// miscoloring a park blue. Upstream fix: split "Open Space/Public" into two separate
// normalized values in gp_taxonomy.yaml (flagged in PROJECT_DIRECTION.md SD-note).
export const BUCKET_FROM_D1_VALUE: Record<string, ZoningBucket> = {
  "Agriculture/Rural":          "open_ag",
  "Commercial":                 "commercial",
  "Commercial-General":         "commercial",
  "Commercial-Neighborhood":    "commercial",
  "Commercial-Office":          "commercial",
  "Commercial-Recreation":      "commercial",
  "Industrial/Flex":            "industrial",
  "Mixed-Use":                  "mixed_use",
  "Open Space/Public":          "public_inst",  // conservative parent; split upstream later
  "Planned/Mixed-Use":          "mixed_use",
  "Public/Institutional":       "public_inst",
  "Residential-High":           "high_res",
  "Residential-Low":            "low_res",
  "Residential-Medium":         "med_res",
  "Residential-Townhome":       "high_res",     // attached/higher-density
};

// Parcel shape consumed by ParcelPopup (real data, no mock grid fields).
// Populated from MapLibre vector tile feature properties (all 10 zoning columns
// baked by Phase 14a into parcels.pmtiles).
export interface Parcel {
  id: string;
  current: ZoningBucket | null;       // null = no current zoning on file
  future: ZoningBucket | null;        // null = no future GP / land use on file
  rawCode: string | null;             // e.g. "Mixed Use - Towne Center"
  jurisdiction: string;               // e.g. "Salt Lake City"
  sourceMethod: "REST" | "PDF_vision_Cam_KMZ" | "manual" | null;
  vintage: string | null;             // e.g. "2025"
  currencyNote?: string;              // e.g. "NLS_source_authority_unverified"
}
