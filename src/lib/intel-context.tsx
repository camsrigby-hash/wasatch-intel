import { createContext, useContext, useState, useCallback, useMemo, useEffect, type ReactNode } from "react";
import {
  DEFAULT_PROFILES, type ScoringProfile, type WeightVector, type Stage, type Outcome,
  INTEL_PARCELS, type IntelParcel,
} from "./parcel-intel";

interface IntelCtx {
  profile: ScoringProfile;
  setProfileById: (id: string) => void;
  customProfiles: ScoringProfile[];
  saveCustomProfile: (name: string) => ScoringProfile;
  setWeights: (w: WeightVector) => void;
  resetToProfileDefaults: () => void;
  isCustom: boolean;            // weights deviate from active baseline
  parcels: IntelParcel[];       // pipeline-overlay applied
  updateStage: (parcelId: string, stage: Stage | null) => void;
  updateOutcome: (parcelId: string, outcome: Outcome | null) => void;
  savePipeline: (parcelId: string) => void;
  removePipeline: (parcelId: string) => void;
}

const Ctx = createContext<IntelCtx | null>(null);

export function IntelProvider({ children }: { children: ReactNode }) {
  const [activeProfileId, setActiveProfileId] = useState<string>("generic-commercial");
  const [customProfiles, setCustomProfiles] = useState<ScoringProfile[]>([]);
  const [weights, setWeightsState] = useState<WeightVector>(() => DEFAULT_PROFILES[2].weights);
  const [parcels, setParcels] = useState<IntelParcel[]>(() => [...INTEL_PARCELS]);

  const baseProfile = useMemo<ScoringProfile>(() => {
    const all = [...DEFAULT_PROFILES, ...customProfiles];
    return all.find((p) => p.id === activeProfileId) ?? DEFAULT_PROFILES[2];
  }, [activeProfileId, customProfiles]);

  const isCustom = useMemo(() => {
    return Object.keys(weights).some((k) => weights[k as keyof WeightVector] !== baseProfile.weights[k as keyof WeightVector]);
  }, [weights, baseProfile]);

  // Live profile = base profile with current weights overlaid.
  const profile: ScoringProfile = useMemo(() => ({
    ...baseProfile,
    weights,
    id: isCustom ? `${baseProfile.id}::custom` : baseProfile.id,
    name: isCustom ? `${baseProfile.name} (custom)` : baseProfile.name,
    isCustom,
  }), [baseProfile, weights, isCustom]);

  const setProfileById = useCallback((id: string) => {
    setActiveProfileId(id);
    const all = [...DEFAULT_PROFILES, ...customProfiles];
    const p = all.find((x) => x.id === id);
    if (p) setWeightsState(p.weights);
  }, [customProfiles]);

  const setWeights = useCallback((w: WeightVector) => setWeightsState(w), []);

  const resetToProfileDefaults = useCallback(() => {
    setWeightsState(baseProfile.weights);
  }, [baseProfile]);

  const saveCustomProfile = useCallback((name: string): ScoringProfile => {
    const np: ScoringProfile = {
      id: `custom-${Date.now()}`,
      name,
      description: `Saved from ${baseProfile.name}`,
      weights: { ...weights },
      flags: { ...baseProfile.flags },
      isCustom: true,
    };
    setCustomProfiles((c) => [...c, np]);
    setActiveProfileId(np.id);
    return np;
  }, [weights, baseProfile]);

  const updateStage = useCallback((id: string, stage: Stage | null) => {
    setParcels((arr) => arr.map((p) => p.id === id ? {
      ...p,
      pipeline_stage: stage,
      in_pipeline: stage !== null,
      saved_at: stage !== null && !p.saved_at ? new Date().toISOString() : p.saved_at,
      days_in_stage: stage !== null ? 0 : null,
    } : p));
  }, []);
  const updateOutcome = useCallback((id: string, outcome: Outcome | null) => {
    setParcels((arr) => arr.map((p) => p.id === id ? { ...p, outcome } : p));
  }, []);
  const savePipeline = useCallback((id: string) => {
    setParcels((arr) => arr.map((p) => p.id === id ? {
      ...p, in_pipeline: true, pipeline_stage: p.pipeline_stage ?? "prospect",
      saved_at: p.saved_at ?? new Date().toISOString(), days_in_stage: p.days_in_stage ?? 0,
    } : p));
  }, []);
  const removePipeline = useCallback((id: string) => {
    setParcels((arr) => arr.map((p) => p.id === id ? {
      ...p, in_pipeline: false, pipeline_stage: null, outcome: null, saved_at: null, days_in_stage: null,
    } : p));
  }, []);

  // Keyboard shortcuts: g p, g m, /
  useEffect(() => {
    let lastG = 0;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || (t as HTMLElement).isContentEditable)) return;
      if (e.key === "/") {
        e.preventDefault();
        const search = document.querySelector<HTMLInputElement>('[data-global-search="true"]');
        search?.focus();
        return;
      }
      const now = Date.now();
      if (e.key === "g") { lastG = now; return; }
      if (now - lastG < 800) {
        if (e.key === "p") window.location.assign("/pipeline");
        if (e.key === "m") window.location.assign("/");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Ctx.Provider value={{
      profile, setProfileById, customProfiles, saveCustomProfile,
      setWeights, resetToProfileDefaults, isCustom,
      parcels, updateStage, updateOutcome, savePipeline, removePipeline,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useIntel(): IntelCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useIntel must be used inside <IntelProvider>");
  return v;
}
