// Design-only mock data for the Zoning Overlay mockup.
// Replace with real D1-backed fetcher in a later wiring pass.

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
  { id: "low_res", label: "Low-density residential", color: "#FFF1B8" },
  { id: "med_res", label: "Medium-density residential", color: "#FFD166" },
  { id: "high_res", label: "High-density residential", color: "#F4845F" },
  { id: "commercial", label: "Commercial", color: "#E63946" },
  { id: "mixed_use", label: "Mixed-use", color: "#C5468C" },
  { id: "industrial", label: "Industrial", color: "#8E5BD9" },
  { id: "open_ag", label: "Open / agricultural / special", color: "#4FB477" },
  { id: "public_inst", label: "Public / institutional", color: "#3A86FF" },
];

export const NO_DATA_COLOR = "#6B7280";

export const BUCKET_BY_ID: Record<ZoningBucket, ZoningBucketMeta> =
  ZONING_BUCKETS.reduce(
    (acc, b) => {
      acc[b.id] = b;
      return acc;
    },
    {} as Record<ZoningBucket, ZoningBucketMeta>,
  );

export interface MockParcel {
  id: string;
  // grid position in the mock canvas (0..GRID-1)
  col: number;
  row: number;
  current: ZoningBucket | null;
  future: ZoningBucket | null;
  rawCode: string | null;
  jurisdiction: string;
  sourceMethod: "REST" | "PDF_vision_Cam_KMZ" | "manual" | null;
  vintage: string | null;
  currencyNote?: string;
}

// Deterministic pseudo-random mock parcels arranged as a grid.
// Visually evokes commercial corridors, industrial pockets, residential fabric.
export const GRID_COLS = 48;
export const GRID_ROWS = 28;

function seeded(i: number) {
  // mulberry32
  let t = (i + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const JURISDICTIONS = [
  "Salt Lake City",
  "South Jordan",
  "Lehi",
  "Draper",
  "Sandy",
  "Eagle Mountain",
  "Tooele",
  "Erda",
];

const RAW_CODES_BY_BUCKET: Record<ZoningBucket, string[]> = {
  low_res: ["R-1-7000", "RR-1", "R1-10", "SF-Low"],
  med_res: ["R-2", "RM-12", "R-1-5000"],
  high_res: ["R-MU-45", "RMF-30", "TH-High"],
  commercial: ["CB", "CC", "C-2", "Regional Commercial"],
  mixed_use: ["MU-TC", "Mixed Use - Towne Center", "FB-UN2"],
  industrial: ["M-1", "BP", "Light Industrial"],
  open_ag: ["A-2", "OS", "Agricultural"],
  public_inst: ["PL", "Public Lands", "Institutional"],
};

function pickBucket(r: number): ZoningBucket {
  // Weighted: residential dominates the fabric
  if (r < 0.34) return "low_res";
  if (r < 0.52) return "med_res";
  if (r < 0.6) return "high_res";
  if (r < 0.7) return "commercial";
  if (r < 0.77) return "mixed_use";
  if (r < 0.84) return "industrial";
  if (r < 0.94) return "open_ag";
  return "public_inst";
}

export const MOCK_PARCELS: MockParcel[] = (() => {
  const out: MockParcel[] = [];
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const i = row * GRID_COLS + col;
      const r1 = seeded(i * 7 + 1);
      const r2 = seeded(i * 13 + 3);
      const r3 = seeded(i * 23 + 5);

      // Carve commercial corridors along a couple of "streets"
      const corridorRow = row === 9 || row === 19;
      const industrialPocket = row > 22 && col > 30 && col < 40;
      const openSouth = row > 24 && col < 18;

      let current: ZoningBucket | null = pickBucket(r1);
      if (corridorRow) current = r1 > 0.5 ? "commercial" : "mixed_use";
      if (industrialPocket) current = "industrial";
      if (openSouth) current = "open_ag";

      // Future generally densifies along corridors and infill
      let future: ZoningBucket | null = current;
      if (corridorRow) future = "mixed_use";
      else if (current === "low_res" && r2 < 0.25) future = "med_res";
      else if (current === "med_res" && r2 < 0.25) future = "high_res";
      else if (current === "commercial" && r2 < 0.4) future = "mixed_use";

      // Jurisdictional data gaps: Erda (cols 0-6, rows 22+) has no zoning at all.
      // Some Eagle Mountain parcels (cols 41-47, rows 0-6) have current but no future.
      const jurisdictionIdx =
        col < 12 ? 0 : col < 20 ? 1 : col < 28 ? 2 : col < 36 ? 3 : col < 42 ? 4 : col < 46 ? 5 : 6;
      let jurisdiction = JURISDICTIONS[jurisdictionIdx];

      const erda = col < 7 && row > 22;
      const eagleMtn = col > 40 && row < 7;

      if (erda) {
        jurisdiction = "Erda";
        current = null;
        future = null;
      } else if (eagleMtn) {
        jurisdiction = "Eagle Mountain";
        future = null;
      }

      const bucketForCode = current ?? future;
      const codes = bucketForCode ? RAW_CODES_BY_BUCKET[bucketForCode] : null;
      const rawCode = codes ? codes[Math.floor(r3 * codes.length)] : null;

      const sourceMethod: MockParcel["sourceMethod"] = !current && !future
        ? null
        : r3 < 0.55
          ? "REST"
          : r3 < 0.85
            ? "PDF_vision_Cam_KMZ"
            : "manual";

      const vintage = !current && !future ? null : r2 < 0.2 ? "2022" : r2 < 0.6 ? "2024" : "2025";

      const currencyNote =
        sourceMethod === "PDF_vision_Cam_KMZ" && r3 < 0.4
          ? "NLS_source_authority_unverified"
          : undefined;

      out.push({
        id: `P-${i.toString().padStart(6, "0")}`,
        col,
        row,
        current,
        future,
        rawCode,
        jurisdiction,
        sourceMethod,
        vintage,
        currencyNote,
      });
    }
  }
  return out;
})();
