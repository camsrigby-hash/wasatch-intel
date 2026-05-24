import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, AlertCircle } from "lucide-react";
import {
  BUCKET_BY_ID,
  NO_DATA_COLOR,
  SOURCE_METHOD_DISPLAY,
  type Parcel,
  type ZoningView,
} from "@/lib/zoning";

const CURRENCY_NOTE_MESSAGES: Record<string, string> = {
  "NLS_source_authority_unverified":
    "This future zoning comes from a regional study layer, not directly from city-published data. Verify with city planning before acting.",
  "lehi_zone_current_normalization_gap":
    "Some Lehi zone codes are not yet normalized in our taxonomy. Bucket may be approximate.",
  "regional_map_only":
    "Only a regional overview exists; parcel-level boundaries cannot be determined.",
};

const CONFIDENCE_DOT_CLASS: Record<"high" | "medium" | "low", string> = {
  high:   "bg-green-500",
  medium: "bg-amber-400",
  low:    "bg-red-500",
};

interface Props {
  parcel: Parcel;
  view: ZoningView;
  onClose: () => void;
}

export function ParcelPopup({ parcel, view, onClose }: Props) {
  const bucketId = view === "current" ? parcel.current : parcel.future;
  const bucket = bucketId ? BUCKET_BY_ID[bucketId] : null;
  const hasData = !!bucket;

  return (
    <Card className="w-72 bg-background/98 backdrop-blur border-border shadow-xl">
      <div className="flex items-start justify-between px-3 pt-2.5 pb-1.5 border-b border-border">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Parcel · {view === "current" ? "Current zoning" : "Future land use"}
          </div>
          <div className="text-xs font-mono text-foreground/80">{parcel.id}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors p-0.5 -mr-1 -mt-1"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="px-3 py-3 space-y-2.5">
        {hasData ? (
          <>
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-5 w-5 rounded ring-1 ring-black/20 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)] shrink-0"
                style={{ backgroundColor: bucket.color }}
              />
              <div className="text-sm font-semibold text-foreground leading-tight">
                {bucket.label}
              </div>
            </div>

            {parcel.rawCode && (
              <Field label="Raw zone code" value={parcel.rawCode} mono />
            )}
            <Field label="Source jurisdiction" value={parcel.jurisdiction} />

            {view === "future" && parcel.currencyNote && (
              <CurrencyNoteBanner note={parcel.currencyNote} />
            )}

            {parcel.sourceMethod && (
              <SourceMethodField sourceMethod={parcel.sourceMethod} />
            )}
            {parcel.vintage && <Field label="Plan vintage" value={parcel.vintage} />}
          </>
        ) : (
          <NoDataState
            jurisdiction={parcel.jurisdiction}
            view={view}
            otherViewHasData={
              (view === "current" ? parcel.future : parcel.current) !== null
            }
          />
        )}
      </div>
    </Card>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-2 items-center">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-xs text-foreground ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function SourceMethodField({ sourceMethod }: { sourceMethod: string }) {
  const display = SOURCE_METHOD_DISPLAY[sourceMethod];
  return (
    <div className="grid grid-cols-[110px_1fr] gap-2 items-center">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Data source</div>
      <div className="flex items-center gap-1.5">
        <span
          className={`inline-block h-2 w-2 rounded-full shrink-0 ${
            display ? CONFIDENCE_DOT_CLASS[display.confidence] : "bg-muted-foreground"
          }`}
        />
        <span className="text-xs text-foreground">
          {display ? display.label : (
            <Badge variant="secondary" className="font-mono text-[10px] py-0 px-1.5">
              {sourceMethod}
            </Badge>
          )}
        </span>
      </div>
    </div>
  );
}

function CurrencyNoteBanner({ note }: { note: string }) {
  const message = CURRENCY_NOTE_MESSAGES[note] ?? note;
  return (
    <div className="flex items-start gap-1.5 px-2 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/30">
      <AlertCircle className="h-3 w-3 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
      <span className="text-[10px] text-amber-700 dark:text-amber-300 leading-snug">
        {message}
      </span>
    </div>
  );
}

function NoDataState({
  jurisdiction,
  view,
  otherViewHasData,
}: {
  jurisdiction: string;
  view: ZoningView;
  otherViewHasData: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-5 w-5 rounded ring-1 ring-black/20 shrink-0"
          style={{
            backgroundColor: NO_DATA_COLOR,
            backgroundImage:
              "repeating-linear-gradient(45deg, rgba(255,255,255,0.35) 0 2px, transparent 2px 4px)",
          }}
        />
        <div className="text-sm font-semibold text-muted-foreground leading-tight">
          No {view === "current" ? "current zoning" : "future land use"} on file
        </div>
      </div>
      <div className="text-xs text-muted-foreground leading-snug">
        {jurisdiction} has not published machine-readable{" "}
        {view === "current" ? "zoning" : "general plan"} data for this parcel.
        {otherViewHasData && (
          <>
            {" "}Switch to <span className="font-medium text-foreground">
              {view === "current" ? "Future" : "Current"}
            </span> view to see what's available.
          </>
        )}
      </div>
      <Field label="Source jurisdiction" value={jurisdiction} />
    </div>
  );
}
