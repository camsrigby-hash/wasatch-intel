// Wasatch Intel — parcel-centric intelligence layer.
// Adds scoring profiles, vacancy classification, spread, owners, comps, DD, LOI,
// and a per-user pipeline on top of the existing PARCELS / AGENDAS mock data.
//
// Every shape here mirrors the API contract documented in
// wasatch_intel_pipeline_lovable_prompt.md so the backend can swap fetches in 1:1.

import { z } from "zod";
import { PARCELS, AGENDAS, type Parcel as BaseParcel, type Jurisdiction } from "./mock-data";

// ─────────────────────────────────────────────────────────────────────────────
// Vacancy classification (UGRC LIR cascade — see brief §Vacancy)
// ─────────────────────────────────────────────────────────────────────────────

export type VacancyTier =
  | "vacant"
  | "ag_rezone"
  | "ag_structure"
  | "underutilized"
  | "developed_recent"
  | "older_structure"
  | "insufficient";

export const VACANCY_META: Record<VacancyTier, { label: string; color: string; description: string }> = {
  vacant:            { label: "Vacant — no building",       color: "#00e639", description: "No building footprint, no build year on record." },
  ag_rezone:         { label: "Ag / Rezone Opportunity",    color: "#ffd700", description: "Ag / vacant / greenbelt class with minimal structure." },
  ag_structure:      { label: "Ag with Structure",          color: "#ffaa00", description: "Ag class with a structure ≥ 500 sqft." },
  underutilized:     { label: "Underutilized",              color: "#ff8c00", description: "Building under 1000 sqft on a developable parcel." },
  developed_recent:  { label: "Developed (recent)",         color: "#ff3333", description: "Substantial structure built after 2000." },
  older_structure:   { label: "Older Structure",            color: "#cc4444", description: "Pre-2000 structure — possible teardown candidate." },
  insufficient:      { label: "Insufficient data",          color: "#888888", description: "Missing attributes; needs enrichment." },
};

function classifyVacancy(bldg: number, builtYr: number | null, propClass: string): VacancyTier {
  const isAg = /ag|vacant|greenbelt/i.test(propClass);
  if (bldg < 200 && builtYr === null) return "vacant";
  if (isAg && bldg < 500) return "ag_rezone";
  if (isAg && bldg >= 500) return "ag_structure";
  if (bldg < 1000) return "underutilized";
  if (builtYr && builtYr > 2000 && bldg >= 1000) return "developed_recent";
  if (builtYr && builtYr <= 2000 && bldg >= 1000) return "older_structure";
  return "insufficient";
}

// ─────────────────────────────────────────────────────────────────────────────
// Scoring profiles
// ─────────────────────────────────────────────────────────────────────────────

export const SCORE_DIMENSIONS = [
  "corner",       // Corner Detection
  "aadt",         // Traffic Volume
  "signal",       // Traffic Signal Presence
  "competition",  // Competition (negative when active)
  "zoning",       // Zoning Suitability
  "growth",       // Growth Signal
  "stip",         // STIP / Future Projects
  "corridor",     // Commute Corridor
] as const;

export type ScoreDimension = typeof SCORE_DIMENSIONS[number];
export type WeightVector = Record<ScoreDimension, number>;

export interface ScoringProfile {
  id: string;
  name: string;
  description: string;
  weights: WeightVector;
  flags: {
    competition_active: boolean;
    income_inversion: boolean;
    corner_required: boolean;
    prefer_industrial_zoning: boolean;
  };
  isCustom?: boolean;
}

export const DEFAULT_PROFILES: ScoringProfile[] = [
  {
    id: "gas-cstore",
    name: "Gas Station / C-Store",
    description: "Fuel-and-c-store retail siting — corners, traffic, signals, lower-income areas.",
    weights: { corner: 7, aadt: 8, signal: 6, competition: 5, zoning: 4, growth: 5, stip: 3, corridor: 6 },
    flags: { competition_active: true, income_inversion: true, corner_required: true, prefer_industrial_zoning: false },
  },
  {
    id: "miniflex",
    name: "Miniflex / Light Industrial",
    description: "Small-bay flex industrial. Co-location is fine; chase clusters and industrial GP.",
    weights: { corner: 4, aadt: 5, signal: 3, competition: 0, zoning: 7, growth: 6, stip: 4, corridor: 3 },
    flags: { competition_active: false, income_inversion: false, corner_required: false, prefer_industrial_zoning: true },
  },
  {
    id: "generic-commercial",
    name: "Generic Commercial",
    description: "Balanced exploratory profile — every dimension equally weighted.",
    weights: { corner: 5, aadt: 5, signal: 5, competition: 5, zoning: 5, growth: 5, stip: 5, corridor: 5 },
    flags: { competition_active: false, income_inversion: false, corner_required: false, prefer_industrial_zoning: false },
  },
];

export function profileById(id: string): ScoringProfile {
  return DEFAULT_PROFILES.find((p) => p.id === id) ?? DEFAULT_PROFILES[2];
}

// Normalised weights so visible weights sum to 100 — used for the slider %.
export function normalizeWeights(w: WeightVector): WeightVector {
  const sum = SCORE_DIMENSIONS.reduce((acc, d) => acc + w[d], 0) || 1;
  const out: WeightVector = { ...w };
  SCORE_DIMENSIONS.forEach((d) => { out[d] = +(w[d] * 100 / sum).toFixed(1); });
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-parcel enrichment (deterministic from the existing PARCELS array)
// ─────────────────────────────────────────────────────────────────────────────

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0);
}
function pseudo(seed: number, salt: string): number {
  return ((hash(salt) ^ seed) % 10000) / 10000;
}

const COUNTY_MAP: Record<Jurisdiction, "davis" | "weber" | "salt_lake" | "tooele" | "utah"> = {
  "Salt Lake City": "salt_lake",
  "Lehi": "utah",
  "Saratoga Springs": "utah",
  "Eagle Mountain": "utah",
  "Vineyard": "utah",
  "Herriman": "salt_lake",
  "Tooele": "tooele",
  "Grantsville": "tooele",
  "Erda": "tooele",
  "Draper": "salt_lake",
  "South Jordan": "salt_lake",
  "Bluffdale": "salt_lake",
  "Spanish Fork": "utah",
  "American Fork": "utah",
};

export interface OwnerBlock {
  name: string;
  type: "Individual" | "LLC" | "Trust" | "Corporation";
  mailingAddress: string;
  phone?: string;
  email?: string;
}

export interface CompRecord {
  id: string;
  address: string;
  saleDate: string;
  salePrice: number;
  pricePerSqft: number;
  acres: number;
  zoningCategory: "current" | "gp";
  link: string;
}

export interface DDChecklistItem {
  id: string;
  label: string;
  done: boolean;
  notes?: string;
  custom?: boolean;
}

export interface AdjacentActivity {
  id: string;
  date: string;
  type: string;
  jurisdiction: string;
  headline: string;
  distanceMiles: number;
}

export type Stage = "prospect" | "dd" | "loi" | "closed";
export type Outcome = "won" | "lost" | "abandoned";

export const STAGE_META: Record<Stage, { label: string; tone: string; bg: string; text: string }> = {
  prospect: { label: "Prospect", tone: "var(--stage-prospect)", bg: "bg-[var(--stage-prospect-bg)]", text: "text-[var(--stage-prospect)]" },
  dd:       { label: "Due Diligence", tone: "var(--stage-dd)",  bg: "bg-[var(--stage-dd-bg)]",      text: "text-[var(--stage-dd)]" },
  loi:      { label: "LOI", tone: "var(--stage-loi)",            bg: "bg-[var(--stage-loi-bg)]",     text: "text-[var(--stage-loi)]" },
  closed:   { label: "Closed", tone: "var(--stage-closed)",      bg: "bg-[var(--stage-closed-bg)]",  text: "text-[var(--stage-closed)]" },
};

export const ALL_STAGES: Stage[] = ["prospect", "dd", "loi", "closed"];

export type Grade = "A" | "B" | "C" | "D";
export const GRADE_COLORS: Record<Grade, string> = {
  A: "var(--grade-a)",
  B: "var(--grade-b)",
  C: "var(--grade-c)",
  D: "var(--grade-d)",
};

export interface ParcelScore {
  total: number;
  grade: Grade;
  components: Record<ScoreDimension, number>;
}

export interface SpreadBlock {
  current_psf: number | null;
  gp_psf: number | null;
  current_total: number | null;
  gp_total: number | null;
  spread_amount: number | null;
}

export interface IntelParcel extends BaseParcel {
  address: string;
  county: "davis" | "weber" | "salt_lake" | "tooele" | "utah";
  is_corner: boolean;
  bldg_sqft: number;
  built_yr: number | null;
  prop_class: string;
  vacancy_status: VacancyTier;
  aadt_primary: number;
  has_signal: boolean;
  median_income: number;
  competitionCount: number;
  inCommuteCorridor: "Primary" | "Secondary" | "None";
  owner: OwnerBlock;
  comps: CompRecord[];
  adjacentActivity: AdjacentActivity[];
  spread: SpreadBlock;
  ddChecklist: DDChecklistItem[];
  // Pipeline overlay (mocked for ~22 parcels)
  in_pipeline: boolean;
  pipeline_stage: Stage | null;
  outcome: Outcome | null;
  days_in_stage: number | null;
  saved_at: string | null;
  notes: string;
  loi: LOIDraft | null;
}

export interface LOIDraft {
  buyer_entity: string;
  buyer_signatory_name: string;
  buyer_signatory_title: string;
  title_company: string;
  title_agent: string;
  seller_salutation_name: string;
  purchase_price_total: number;
  purchase_price_psf: number;
  earnest_money: number;
  earnest_money_days: number;
  due_diligence_days: number;
  closing_days: number;
  exclusivity_days: number;
  greenbelt_seller_pays: boolean;
  buyer_represented: boolean;
}

const DEFAULT_DD_TEMPLATE: { id: string; label: string }[] = [
  { id: "water",     label: "Water shares verified" },
  { id: "flood",     label: "Flood zone determination (FEMA)" },
  { id: "recorded",  label: "Recorded documents pulled (county recorder)" },
  { id: "soils",     label: "Soil conditions reviewed" },
  { id: "title",     label: "Title preliminary report" },
  { id: "survey",    label: "Survey ordered" },
  { id: "envi",      label: "Environmental Phase I" },
  { id: "utility",   label: "Utility availability confirmed" },
];

const STREETS = ["State St", "Main St", "Redwood Rd", "Bangerter Hwy", "Pioneer Crossing", "Center St", "Geneva Rd", "5600 W", "9000 S", "Mountain View Corridor"];
const OWNER_TYPES: OwnerBlock["type"][] = ["LLC", "Individual", "Trust", "Corporation"];
const COMMUTE_LEVELS: IntelParcel["inCommuteCorridor"][] = ["Primary", "Secondary", "None"];
const SIGNATORY_NAMES = ["David Wagstaff", "Mark Henderson", "Robert Chen", "Sarah Park"];

function buildSpread(zoning: string, gp: string, currentPsf: number, gpPsf: number, sqft: number): SpreadBlock {
  const current_total = Math.round(currentPsf * sqft);
  const gp_total      = Math.round(gpPsf * sqft);
  return {
    current_psf: +currentPsf.toFixed(2),
    gp_psf:      +gpPsf.toFixed(2),
    current_total,
    gp_total,
    spread_amount: gp_total - current_total,
  };
}

export function gradeFromTotal(total: number): Grade {
  if (total >= 80) return "A";
  if (total >= 70) return "B";
  if (total >= 55) return "C";
  return "D";
}

function buildScore(p: BaseParcel, profile: ScoringProfile, ctx: {
  is_corner: boolean; aadt: number; has_signal: boolean; competitionCount: number;
  vac: VacancyTier; medianIncome: number; corridor: IntelParcel["inCommuteCorridor"];
}): ParcelScore {
  const { is_corner, aadt, has_signal, competitionCount, vac, medianIncome, corridor } = ctx;

  // Component scores 0–100.
  const cornerScore     = is_corner ? 95 : (profile.flags.corner_required ? 0 : 35);
  const aadtScore       = Math.min(100, (aadt / 60000) * 100);
  const signalScore     = has_signal ? 90 : 25;
  const competitionRaw  = Math.max(0, 100 - competitionCount * 18);
  const competitionScore= profile.flags.competition_active ? competitionRaw : 60;

  let zoningScore =
    vac === "vacant" || vac === "ag_rezone" ? 88 :
    vac === "ag_structure" ? 70 :
    vac === "underutilized" ? 60 :
    vac === "older_structure" ? 50 :
    vac === "developed_recent" ? 25 : 40;
  if (profile.flags.prefer_industrial_zoning && /M-1|Industrial/.test(p.zoning + p.generalPlan)) zoningScore = Math.min(100, zoningScore + 12);

  // Income component for c-store inversion (lower income = higher score).
  const incomeScore = profile.flags.income_inversion
    ? Math.max(0, 100 - (medianIncome - 40000) / 600)
    : Math.min(100, (medianIncome - 35000) / 700);

  const growthScore   = Math.round(p.adjacencyScore * 0.6 + (p.agendaCount / 6) * 40);
  const stipScore     = corridor === "Primary" ? 80 : corridor === "Secondary" ? 55 : 25;
  const corridorScore = corridor === "Primary" ? 90 : corridor === "Secondary" ? 60 : 30;

  // Blend income into competition for c-store profile (where inversion matters most).
  const competitionFinal = profile.flags.income_inversion
    ? Math.round(competitionScore * 0.5 + incomeScore * 0.5)
    : competitionScore;

  const components: Record<ScoreDimension, number> = {
    corner:      Math.round(cornerScore),
    aadt:        Math.round(aadtScore),
    signal:      Math.round(signalScore),
    competition: Math.round(competitionFinal),
    zoning:      Math.round(zoningScore),
    growth:      Math.round(growthScore),
    stip:        Math.round(stipScore),
    corridor:    Math.round(corridorScore),
  };

  const norm = normalizeWeights(profile.weights);
  const total = Math.round(
    SCORE_DIMENSIONS.reduce((acc, d) => acc + components[d] * (norm[d] / 100), 0)
  );

  return { total, grade: gradeFromTotal(total), components };
}

// Percentile-based grading kicks in when sliders deviate from a saved profile.
export function recomputeGradesByPercentile(scores: number[]): Record<number, Grade> {
  const sorted = [...scores].sort((a, b) => b - a);
  const n = sorted.length || 1;
  const aCut = sorted[Math.floor(n * 0.05)] ?? 0;
  const bCut = sorted[Math.floor(n * 0.20)] ?? 0;
  const cCut = sorted[Math.floor(n * 0.50)] ?? 0;
  const map: Record<number, Grade> = {};
  scores.forEach((s) => {
    map[s] = s >= aCut ? "A" : s >= bCut ? "B" : s >= cCut ? "C" : "D";
  });
  return map;
}

// ─────────────────────────────────────────────────────────────────────────────
// Build the IntelParcels deterministically from existing mock parcels.
// ─────────────────────────────────────────────────────────────────────────────

function buildIntelParcels(): IntelParcel[] {
  return PARCELS.map((p, idx): IntelParcel => {
    const seed = hash(p.id);
    const r = (salt: string) => pseudo(seed, salt);

    const street = STREETS[Math.floor(r("street") * STREETS.length)];
    const num    = 100 + Math.floor(r("num") * 9800);
    const address = `${num} ${street}, ${p.jurisdiction}, UT`;

    const is_corner = r("corner") > 0.65;
    const bldg_sqft = (() => {
      const x = r("bldg");
      if (x < 0.45) return Math.floor(r("bldg2") * 180);
      if (x < 0.65) return Math.floor(400 + r("bldg2") * 600);
      return Math.floor(1200 + r("bldg2") * 22000);
    })();
    const built_yr = bldg_sqft < 200 ? null : 1955 + Math.floor(r("yr") * 70);
    const propClassPool = ["agricultural","greenbelt","vacant","commercial","residential","industrial"];
    const prop_class = bldg_sqft < 200
      ? propClassPool[Math.floor(r("pc") * 3)]
      : propClassPool[Math.floor(r("pc") * propClassPool.length)];

    const vac = classifyVacancy(bldg_sqft, built_yr, prop_class);

    const aadt_primary = Math.floor(2000 + r("aadt") * 80000);
    const has_signal = is_corner && r("sig") > 0.4;
    const median_income = Math.floor(38000 + r("inc") * 90000);
    const competitionCount = Math.floor(r("comp") * 6);
    const corridor: IntelParcel["inCommuteCorridor"] = COMMUTE_LEVELS[Math.floor(r("cor") * 3)];

    // Owner block — sometimes the existing developer LLC, sometimes individual.
    const useDev = r("ownerKind") > 0.55;
    const owner: OwnerBlock = useDev
      ? { name: p.ownerName, type: "LLC", mailingAddress: `PO Box ${100 + Math.floor(r("po") * 8000)}, Salt Lake City, UT 84101`, phone: "—", email: "—" }
      : {
          name: ["Anders Mortensen","Janet Lewis","Brian Park","Sarah Henderson","Karen Allred","Tomas Reyes"][Math.floor(r("nm") * 6)],
          type: OWNER_TYPES[Math.floor(r("ot") * OWNER_TYPES.length)],
          mailingAddress: `${100 + Math.floor(r("ad") * 8000)} ${street}, ${p.jurisdiction}, UT 84${Math.floor(r("zip") * 99).toString().padStart(2,"0")}0`,
          phone: r("phone") > 0.4 ? `(801) 555-${Math.floor(r("ph2") * 9000 + 1000)}` : undefined,
          email: r("em") > 0.5 ? `owner${idx}@example.com` : undefined,
        };

    // Comps — generate 3 under current zoning, 2 under GP.
    const sqft = p.acres * 43560;
    const basePsf = 2.5 + r("psf") * 9; // current $/sqft
    const gpUplift = 1.5 + r("uplift") * 4; // GP is 1.5–5.5x current
    const gpPsf = +(basePsf * gpUplift).toFixed(2);
    const comps: CompRecord[] = [];
    for (let i = 0; i < 3; i++) {
      const psf = basePsf * (0.85 + r(`cc${i}`) * 0.3);
      const acres = +(p.acres * (0.6 + r(`ca${i}`) * 0.8)).toFixed(2);
      comps.push({
        id: `comp-${p.id}-c${i}`,
        address: `${100 + Math.floor(r(`cad${i}`) * 9000)} ${STREETS[Math.floor(r(`cs${i}`) * STREETS.length)]}, ${p.jurisdiction}`,
        saleDate: new Date(Date.now() - Math.floor(r(`cd${i}`) * 18 * 30 * 86400 * 1000)).toISOString(),
        salePrice: Math.round(psf * acres * 43560),
        pricePerSqft: +psf.toFixed(2),
        acres,
        zoningCategory: "current",
        link: "#",
      });
    }
    for (let i = 0; i < 2; i++) {
      const psf = gpPsf * (0.85 + r(`gc${i}`) * 0.3);
      const acres = +(p.acres * (0.5 + r(`ga${i}`) * 1.0)).toFixed(2);
      comps.push({
        id: `comp-${p.id}-g${i}`,
        address: `${100 + Math.floor(r(`gad${i}`) * 9000)} ${STREETS[Math.floor(r(`gs${i}`) * STREETS.length)]}, ${p.jurisdiction}`,
        saleDate: new Date(Date.now() - Math.floor(r(`gd${i}`) * 18 * 30 * 86400 * 1000)).toISOString(),
        salePrice: Math.round(psf * acres * 43560),
        pricePerSqft: +psf.toFixed(2),
        acres,
        zoningCategory: "gp",
        link: "#",
      });
    }

    // Adjacent activity — pull nearby agendas (same jurisdiction, 6 most recent).
    const adjacentActivity: AdjacentActivity[] = AGENDAS
      .filter((a) => a.jurisdiction === p.jurisdiction && a.parcelId !== p.id)
      .slice(0, 6)
      .map((a) => ({
        id: a.id,
        date: a.date,
        type: a.type,
        jurisdiction: a.jurisdiction,
        headline: a.title,
        distanceMiles: +((Math.abs(a.centroid[0] - p.centroid[0]) + Math.abs(a.centroid[1] - p.centroid[1])) * 55).toFixed(2),
      }));

    const spread = buildSpread(p.zoning, p.generalPlan, basePsf, gpPsf, sqft);

    // Pipeline overlay — first 22 parcels are in the user's pipeline.
    const inPipeline = idx < 22;
    let pipeline_stage: Stage | null = null;
    let outcome: Outcome | null = null;
    let days_in_stage: number | null = null;
    let saved_at: string | null = null;
    let notes = "";
    if (inPipeline) {
      const stagePool: Stage[] = ["prospect","prospect","prospect","dd","dd","loi","closed"];
      pipeline_stage = stagePool[idx % stagePool.length];
      if (pipeline_stage === "closed") {
        outcome = (["won","lost","abandoned"] as Outcome[])[idx % 3];
      }
      days_in_stage = Math.floor(r("dis") * 90) + 1;
      saved_at = new Date(Date.now() - days_in_stage * 86400 * 1000).toISOString();
      notes = `Owner held ${p.ownershipYears} yrs. Spread ~$${(spread.spread_amount! / 1_000_000).toFixed(1)}M. Next: ${["Send LOI","Order title","Walk site","Call planner","Negotiate"][idx % 5]}.`;
    }

    return {
      ...p,
      address,
      county: COUNTY_MAP[p.jurisdiction],
      is_corner,
      bldg_sqft,
      built_yr,
      prop_class,
      vacancy_status: vac,
      aadt_primary,
      has_signal,
      median_income,
      competitionCount,
      inCommuteCorridor: corridor,
      owner,
      comps,
      adjacentActivity,
      spread,
      ddChecklist: DEFAULT_DD_TEMPLATE.map((t, i) => ({
        id: t.id,
        label: t.label,
        done: inPipeline && pipeline_stage !== "prospect" && i < Math.floor(r("ddc") * 5),
      })),
      in_pipeline: inPipeline,
      pipeline_stage,
      outcome,
      days_in_stage,
      saved_at,
      notes,
      loi: pipeline_stage === "loi" ? defaultLOIFor(p.acres, spread) : null,
    };
  });
}

function defaultLOIFor(acres: number, spread: SpreadBlock): LOIDraft {
  const sqft = acres * 43560;
  const total = spread.gp_total ? Math.round(spread.gp_total * 0.55) : Math.round(sqft * 6);
  return {
    buyer_entity: "Wagstaff Investments LLC",
    buyer_signatory_name: SIGNATORY_NAMES[0],
    buyer_signatory_title: "Manager",
    title_company: "Cottonwood Title Insurance Agency",
    title_agent: "Lisa McKay",
    seller_salutation_name: "Owner",
    purchase_price_total: total,
    purchase_price_psf: +(total / sqft).toFixed(2),
    earnest_money: Math.round(total * 0.01),
    earnest_money_days: 5,
    due_diligence_days: 180,
    closing_days: 15,
    exclusivity_days: 30,
    greenbelt_seller_pays: true,
    buyer_represented: false,
  };
}

export const INTEL_PARCELS: IntelParcel[] = buildIntelParcels();

// ─────────────────────────────────────────────────────────────────────────────
// Tile feature → IntelParcel synthetic hydration (Phase 14-6 / Phase 16 ramp)
// Converts baked PMTiles vector feature properties into a renderable IntelParcel.
// Missing tile attrs get safe sentinel values so the panel opens immediately;
// Phase 16 will replace this with a D1 API fetch for full data.
// ─────────────────────────────────────────────────────────────────────────────

const NULL_SPREAD: SpreadBlock = {
  current_psf: null, gp_psf: null, current_total: null, gp_total: null, spread_amount: null,
};

export function tileFeaturesToIntelParcel(
  props: Record<string, unknown>,
  clickLngLat?: [number, number],
): IntelParcel {
  const id = String(props.parcel_id ?? props.id ?? "unknown");
  const acreage = typeof props.acreage === "number" ? props.acreage : 0;
  const cornerScore = typeof props.corner_score === "number" ? props.corner_score : 0;
  const aadtScore = typeof props.aadt_score === "number" ? props.aadt_score : 0;
  const corridorScore = typeof props.commute_corridor_score === "number" ? props.commute_corridor_score : 0;
  const medianIncome = typeof props.median_income === "number" ? props.median_income : 55000;
  const vacRaw = String(props.vacancy_class ?? "insufficient");
  const vacStatus: VacancyTier =
    vacRaw in VACANCY_META ? (vacRaw as VacancyTier) : "insufficient";
  const inCommute: IntelParcel["inCommuteCorridor"] =
    corridorScore >= 70 ? "Primary" : corridorScore >= 45 ? "Secondary" : "None";

  return {
    // BaseParcel fields
    id,
    apn: id,
    jurisdiction: String(props.jurisdiction ?? "Salt Lake City") as Jurisdiction,
    acres: acreage,
    centroid: clickLngLat ?? [0, 0],
    polygon: [],
    zoning: String(props.prop_class ?? ""),
    generalPlan: "",
    hasGap: false,
    ownerId: "",
    ownerName: "",
    ownershipYears: 0,
    utilitiesScore: 50,
    adjacencyScore: 50,
    politicalRisk: 50,
    residualLandValue: 0,
    agendaCount: 0,
    // IntelParcel enriched fields
    address: String(props.address ?? `Parcel ${id}`),
    county: "salt_lake",
    is_corner: cornerScore > 60,
    bldg_sqft: typeof props.bldg_sqft === "number" ? props.bldg_sqft : 0,
    built_yr: typeof props.built_yr === "number" ? props.built_yr : null,
    prop_class: String(props.prop_class ?? ""),
    vacancy_status: vacStatus,
    aadt_primary: Math.round(aadtScore * 600),
    has_signal: false,
    median_income: medianIncome,
    competitionCount: 0,
    inCommuteCorridor: inCommute,
    owner: { name: "—", type: "Individual", mailingAddress: "—" },
    comps: [],
    adjacentActivity: [],
    spread: NULL_SPREAD,
    ddChecklist: DEFAULT_DD_TEMPLATE.map((t) => ({ ...t, done: false })),
    in_pipeline: false,
    pipeline_stage: null,
    outcome: null,
    days_in_stage: null,
    saved_at: null,
    notes: "",
    loi: null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Score lookup with profile-aware caching.
// ─────────────────────────────────────────────────────────────────────────────

const SCORE_CACHE = new Map<string, ParcelScore>();

export function scoreFor(parcel: IntelParcel, profile: ScoringProfile): ParcelScore {
  const key = profile.id + "::" + parcel.id + "::" +
    SCORE_DIMENSIONS.map((d) => profile.weights[d]).join(",") + "::" +
    JSON.stringify(profile.flags);
  const cached = SCORE_CACHE.get(key);
  if (cached) return cached;
  const s = buildScore(parcel, profile, {
    is_corner: parcel.is_corner,
    aadt: parcel.aadt_primary,
    has_signal: parcel.has_signal,
    competitionCount: parcel.competitionCount,
    vac: parcel.vacancy_status,
    medianIncome: parcel.median_income,
    corridor: parcel.inCommuteCorridor,
  });
  SCORE_CACHE.set(key, s);
  return s;
}

export function scoreAll(profile: ScoringProfile, usePercentile: boolean): Map<string, ParcelScore> {
  const map = new Map<string, ParcelScore>();
  const totals: { id: string; total: number; components: ParcelScore["components"] }[] = [];
  INTEL_PARCELS.forEach((p) => {
    const s = scoreFor(p, profile);
    totals.push({ id: p.id, total: s.total, components: s.components });
  });
  if (usePercentile) {
    const grades = recomputeGradesByPercentile(totals.map((t) => t.total));
    totals.forEach((t) => map.set(t.id, { total: t.total, grade: grades[t.total], components: t.components }));
  } else {
    totals.forEach((t) => map.set(t.id, { total: t.total, grade: gradeFromTotal(t.total), components: t.components }));
  }
  return map;
}

// ─────────────────────────────────────────────────────────────────────────────
// Zod schemas (shared with backend)
// ─────────────────────────────────────────────────────────────────────────────

export const ScoringProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  weights: z.object({
    corner: z.number(), aadt: z.number(), signal: z.number(), competition: z.number(),
    zoning: z.number(), growth: z.number(), stip: z.number(), corridor: z.number(),
  }),
  flags: z.object({
    competition_active: z.boolean(),
    income_inversion: z.boolean(),
    corner_required: z.boolean(),
    prefer_industrial_zoning: z.boolean(),
  }),
  isCustom: z.boolean().optional(),
});

export const SpreadSchema = z.object({
  current_psf: z.number().nullable(),
  gp_psf: z.number().nullable(),
  current_total: z.number().nullable(),
  gp_total: z.number().nullable(),
  spread_amount: z.number().nullable(),
});

export const ParcelSchema = z.object({
  id: z.string(),
  address: z.string().nullable(),
  jurisdiction: z.string(),
  county: z.enum(["davis","weber","salt_lake","tooele","utah"]),
  acreage: z.number(),
  centroid: z.tuple([z.number(), z.number()]),
  zoning_current: z.string(),
  zoning_gp: z.string(),
  vacancy_status: z.enum(["vacant","ag_rezone","ag_structure","underutilized","developed_recent","older_structure","insufficient"]),
  is_corner: z.boolean(),
  bldg_sqft: z.number(),
  built_yr: z.number().nullable(),
  spread: SpreadSchema.nullable(),
  in_pipeline: z.boolean(),
  pipeline_stage: z.enum(["prospect","dd","loi","closed"]).nullable(),
  days_in_stage: z.number().nullable(),
});
