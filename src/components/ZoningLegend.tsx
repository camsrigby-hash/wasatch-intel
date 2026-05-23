import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ZONING_BUCKETS, NO_DATA_COLOR } from "@/lib/zoning";
import { cn } from "@/lib/utils";

interface Props {
  view: "current" | "future";
}

export function ZoningLegend({ view }: Props) {
  const [open, setOpen] = useState(true);

  return (
    <Card className="w-64 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-border shadow-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-accent/40 transition-colors"
      >
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Zoning legend
          <span className="ml-1.5 normal-case font-normal text-foreground/70">
            · {view === "current" ? "Current" : "Future"}
          </span>
        </div>
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <ul className="px-3 pb-3 pt-1 space-y-1.5">
            {ZONING_BUCKETS.map((b) => (
              <li key={b.id} className="flex items-center gap-2">
                <Swatch color={b.color} />
                <span className="text-xs text-foreground">{b.label}</span>
              </li>
            ))}
            <li className="flex items-center gap-2 pt-1 mt-1 border-t border-border">
              <NoDataSwatch />
              <span className="text-xs text-muted-foreground">No data</span>
            </li>
          </ul>
        </div>
      </div>
    </Card>
  );
}

function Swatch({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-3.5 w-5 rounded-sm ring-1 ring-black/20 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]"
      style={{ backgroundColor: color }}
    />
  );
}

function NoDataSwatch() {
  return (
    <span
      className="inline-block h-3.5 w-5 rounded-sm ring-1 ring-black/20"
      style={{
        backgroundColor: NO_DATA_COLOR,
        backgroundImage:
          "repeating-linear-gradient(45deg, rgba(255,255,255,0.35) 0 2px, transparent 2px 4px)",
      }}
    />
  );
}
