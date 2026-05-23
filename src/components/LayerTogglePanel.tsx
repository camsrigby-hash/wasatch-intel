import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ZoningView } from "@/lib/zoning-mock";

export interface LayerState {
  gapScore: boolean;
  stip: boolean;
  zoning: boolean;
  zoningView: ZoningView;
}

interface Props {
  state: LayerState;
  onChange: (next: LayerState) => void;
}

export function LayerTogglePanel({ state, onChange }: Props) {
  return (
    <Card className="w-64 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-border shadow-lg p-3 space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
        Layers
      </div>

      <ToggleRow
        id="gap-score"
        label="Gap score"
        checked={state.gapScore}
        onChange={(v) => onChange({ ...state, gapScore: v })}
      />
      <ToggleRow
        id="stip"
        label="STIP projects"
        checked={state.stip}
        onChange={(v) => onChange({ ...state, stip: v })}
      />
      <ToggleRow
        id="zoning"
        label="Zoning"
        checked={state.zoning}
        onChange={(v) => onChange({ ...state, zoning: v })}
      />

      {state.zoning && (
        <div className="pl-3 pr-1 pb-1 pt-1 ml-1 border-l-2 border-primary/40">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
            View
          </div>
          <SegmentedToggle
            value={state.zoningView}
            onChange={(v) => onChange({ ...state, zoningView: v })}
            options={[
              { value: "current", label: "Current" },
              { value: "future", label: "Future" },
            ]}
          />
          <p className="text-[10px] text-muted-foreground mt-1.5 leading-snug">
            Future = general plan / future land use designation.
          </p>
        </div>
      )}
    </Card>
  );
}

function ToggleRow({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between px-1 py-1 rounded-md hover:bg-accent/40 transition-colors">
      <Label htmlFor={id} className="text-sm cursor-pointer">
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function SegmentedToggle<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="inline-flex w-full rounded-md bg-muted p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex-1 text-xs font-medium px-2 py-1 rounded-[5px] transition-colors",
            value === opt.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
