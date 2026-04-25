import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, Layers, FileSearch, ChevronLeft, ChevronRight } from "lucide-react";
import { useCreateWatchlist } from "@/lib/api-client";
import { JURISDICTIONS, SIGNAL_TYPES, SIGNAL_TYPE_LABELS } from "@/lib/types";
import type { WatchlistType, WatchlistCriteria, CreateWatchlistPayload, SignalType } from "@/lib/types";
import maplibregl from "maplibre-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";

interface Props {
  open: boolean;
  onClose: () => void;
}

const TYPE_OPTIONS: Array<{ type: WatchlistType; icon: typeof MapPin; label: string; description: string }> = [
  { type: "Geography",    icon: MapPin,     label: "Geography",    description: "Draw a polygon or pick jurisdictions" },
  { type: "Applicant",    icon: Users,      label: "Applicant",    description: "Track activity from a specific developer" },
  { type: "Parcel Set",   icon: Layers,     label: "Parcel Set",   description: "Watch a list of APNs you paste in" },
  { type: "Saved Search", icon: FileSearch, label: "Saved Search", description: "Filter by signal type, city, and score" },
];

function PolygonDrawMap({ onPolygon }: { onPolygon: (coords: number[][][]) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<maplibregl.Map | null>(null);
  const drawRef      = useRef<InstanceType<typeof MapboxDraw> | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
      center: [-112.42, 40.6],
      zoom: 9,
    });

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: true },
    });

    // maplibre-gl-draw uses mapbox-gl typings but the runtime interface is compatible
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    map.addControl(draw);

    map.on("draw.create", () => {
      const data = draw.getAll();
      const poly = data.features[0];
      if (poly?.geometry?.type === "Polygon") {
        onPolygon(poly.geometry.coordinates as number[][][]);
      }
    });

    map.on("draw.update", () => {
      const data = draw.getAll();
      const poly = data.features[0];
      if (poly?.geometry?.type === "Polygon") {
        onPolygon(poly.geometry.coordinates as number[][][]);
      }
    });

    map.on("draw.delete", () => onPolygon([]));

    mapRef.current  = map;
    drawRef.current = draw;

    return () => {
      map.remove();
      mapRef.current  = null;
      drawRef.current = null;
    };
  }, [onPolygon]);

  return <div ref={containerRef} className="w-full h-48 rounded border border-border" />;
}

export function WatchlistWizard({ open, onClose }: Props) {
  const [step,        setStep]        = useState(0);
  const [type,        setType]        = useState<WatchlistType>("Geography");
  const [name,        setName]        = useState("");
  const [threshold,   setThreshold]   = useState(60);
  const [alertEmail,  setAlertEmail]  = useState(false);
  const [alertInApp,  setAlertInApp]  = useState(true);

  // Geography criteria
  const [geoJurisdictions, setGeoJurisdictions] = useState<string[]>([]);
  const [geoPolygon,        setGeoPolygon]        = useState<number[][][]>([]);

  // Applicant criteria
  const [developerName, setDeveloperName] = useState("");

  // Parcel Set criteria
  const [apnText, setApnText] = useState("");

  // Saved Search criteria
  const [ssSignalTypes,    setSsSignalTypes]    = useState<string[]>([]);
  const [ssJurisdictions,  setSsJurisdictions]  = useState<string[]>([]);
  const [ssMinScore,       setSsMinScore]       = useState(50);

  const createMutation = useCreateWatchlist();

  function reset() {
    setStep(0); setType("Geography"); setName(""); setThreshold(60);
    setAlertEmail(false); setAlertInApp(true);
    setGeoJurisdictions([]); setGeoPolygon([]); setDeveloperName("");
    setApnText(""); setSsSignalTypes([]); setSsJurisdictions([]); setSsMinScore(50);
  }

  function buildCriteria(): WatchlistCriteria {
    switch (type) {
      case "Geography":
        return { type: "Geography", jurisdictions: geoJurisdictions, ...(geoPolygon.length ? { polygon: geoPolygon } : {}) };
      case "Applicant":
        return { type: "Applicant", developerName };
      case "Parcel Set":
        return { type: "Parcel Set", apns: apnText.split("\n").map((s) => s.trim()).filter(Boolean) };
      case "Saved Search":
        return {
          type: "Saved Search",
          ...(ssSignalTypes.length   ? { signalTypes:    ssSignalTypes as SignalType[] } : {}),
          ...(ssJurisdictions.length ? { jurisdictions:  ssJurisdictions } : {}),
          ...(ssMinScore > 0         ? { minScore:       ssMinScore }       : {}),
        };
    }
  }

  async function handleSave() {
    const payload: CreateWatchlistPayload = {
      name: name.trim() || defaultName(),
      type,
      criteria: buildCriteria(),
      signalThreshold: threshold,
      alerts: { inApp: alertInApp, email: alertEmail },
    };
    await createMutation.mutateAsync(payload);
    reset();
    onClose();
  }

  function defaultName(): string {
    switch (type) {
      case "Geography":    return geoJurisdictions.length ? `${geoJurisdictions[0]} area` : "New area";
      case "Applicant":    return developerName || "New applicant watch";
      case "Parcel Set":   return "Parcel set";
      case "Saved Search": return "Saved search";
    }
  }

  function canProceed(): boolean {
    if (step === 1) {
      if (type === "Applicant" && !developerName.trim()) return false;
      if (type === "Parcel Set" && !apnText.trim()) return false;
    }
    return true;
  }

  const totalSteps = 3;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">
            New watchlist
            <span className="ml-2 text-xs font-normal text-muted-foreground">Step {step + 1} of {totalSteps}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Step 0: Choose type */}
        {step === 0 && (
          <div className="space-y-2">
            {TYPE_OPTIONS.map(({ type: t, icon: Icon, label, description }) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`w-full flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                  type === t ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                }`}
              >
                <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step 1: Configure criteria */}
        {step === 1 && (
          <div className="space-y-4">
            {type === "Geography" && (
              <>
                <div>
                  <Label className="text-xs mb-2 block">Jurisdictions</Label>
                  <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {JURISDICTIONS.map((j) => (
                      <label key={j} className="flex items-center gap-2 text-xs cursor-pointer">
                        <Checkbox
                          checked={geoJurisdictions.includes(j)}
                          onCheckedChange={(checked) =>
                            setGeoJurisdictions((prev) =>
                              checked ? [...prev, j] : prev.filter((x) => x !== j),
                            )
                          }
                        />
                        {j}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs mb-2 block flex items-center gap-1">
                    Draw area on map <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <PolygonDrawMap onPolygon={setGeoPolygon} />
                  {geoPolygon.length > 0 && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ Polygon with {geoPolygon[0]?.length ?? 0} vertices captured
                    </p>
                  )}
                </div>
              </>
            )}

            {type === "Applicant" && (
              <div>
                <Label htmlFor="dev-name" className="text-xs mb-1 block">Developer name</Label>
                <Input
                  id="dev-name"
                  placeholder="e.g. Ivory Homes, Woodbury Corp"
                  value={developerName}
                  onChange={(e) => setDeveloperName(e.target.value)}
                  className="text-xs"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Any signal mentioning this name will match.
                </p>
              </div>
            )}

            {type === "Parcel Set" && (
              <div>
                <Label htmlFor="apns" className="text-xs mb-1 block">Parcel APNs (one per line)</Label>
                <Textarea
                  id="apns"
                  placeholder={"01-440-0-0019\n01-440-0-0020"}
                  value={apnText}
                  onChange={(e) => setApnText(e.target.value)}
                  rows={6}
                  className="text-xs font-mono"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {apnText.split("\n").filter((s) => s.trim()).length} parcels entered
                </p>
              </div>
            )}

            {type === "Saved Search" && (
              <div className="space-y-4">
                <div>
                  <Label className="text-xs mb-2 block">Signal types <span className="text-muted-foreground font-normal">(any if none selected)</span></Label>
                  <div className="flex flex-wrap gap-1.5">
                    {SIGNAL_TYPES.map((st) => (
                      <button
                        key={st}
                        onClick={() =>
                          setSsSignalTypes((prev) =>
                            prev.includes(st) ? prev.filter((x) => x !== st) : [...prev, st],
                          )
                        }
                        className={`rounded px-2 py-0.5 text-xs transition-colors ${
                          ssSignalTypes.includes(st)
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {SIGNAL_TYPE_LABELS[st]}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs mb-2 block">Jurisdictions <span className="text-muted-foreground font-normal">(any if none selected)</span></Label>
                  <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto">
                    {JURISDICTIONS.map((j) => (
                      <label key={j} className="flex items-center gap-2 text-xs cursor-pointer">
                        <Checkbox
                          checked={ssJurisdictions.includes(j)}
                          onCheckedChange={(checked) =>
                            setSsJurisdictions((prev) =>
                              checked ? [...prev, j] : prev.filter((x) => x !== j),
                            )
                          }
                        />
                        {j}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs mb-2 block">Minimum signal score: <strong>{ssMinScore}</strong></Label>
                  <Slider min={0} max={100} step={5} value={[ssMinScore]} onValueChange={([v]) => setSsMinScore(v)} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Name + alert settings */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <Label htmlFor="wl-name" className="text-xs mb-1 block">Watchlist name</Label>
              <Input
                id="wl-name"
                placeholder={defaultName()}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-xs"
              />
            </div>

            <div>
              <Label className="text-xs mb-2 block">Alert threshold: <strong>{threshold}</strong></Label>
              <Slider min={0} max={100} step={5} value={[threshold]} onValueChange={([v]) => setThreshold(v)} />
              <p className="text-xs text-muted-foreground mt-1">Only fire alerts when signal score ≥ {threshold}</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium">In-app alerts</p>
                  <p className="text-xs text-muted-foreground">Show in watchlist hit history</p>
                </div>
                <Switch checked={alertInApp} onCheckedChange={setAlertInApp} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium">Email alerts</p>
                  <p className="text-xs text-muted-foreground">Send to cam.s.rigby@gmail.com via Resend</p>
                </div>
                <Switch checked={alertEmail} onCheckedChange={setAlertEmail} />
              </div>
            </div>

            <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
              <p><strong>Summary:</strong></p>
              <p>Type: <Badge variant="outline" className="text-[10px] ml-1">{type}</Badge></p>
              {type === "Geography" && geoJurisdictions.length > 0 && (
                <p>Cities: {geoJurisdictions.join(", ")}</p>
              )}
              {type === "Geography" && geoPolygon.length > 0 && <p>+ custom polygon</p>}
              {type === "Applicant" && <p>Developer: {developerName}</p>}
              {type === "Parcel Set" && <p>APNs: {apnText.split("\n").filter((s) => s.trim()).length} parcels</p>}
              <p>Threshold: ≥{threshold} · Email: {alertEmail ? "on" : "off"}</p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step > 0 && (
            <Button variant="outline" size="sm" onClick={() => setStep((s) => s - 1)}>
              <ChevronLeft className="h-3.5 w-3.5" /> Back
            </Button>
          )}
          {step < totalSteps - 1 ? (
            <Button size="sm" onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}>
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button size="sm" onClick={handleSave} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Saving…" : "Save watchlist"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
