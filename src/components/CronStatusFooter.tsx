import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCronStatus, type CronStatusEntry } from "@/lib/api-client";
import { formatDistanceToNow } from "date-fns";
import { Clock } from "lucide-react";

const HEALTH_TONES: Record<CronStatusEntry["health"], string> = {
  ok:      "bg-emerald-500",
  warn:    "bg-amber-500",
  fail:    "bg-destructive",
  unknown: "bg-muted-foreground/40",
};

const HEALTH_LABELS: Record<CronStatusEntry["health"], string> = {
  ok:      "Healthy",
  warn:    "Stale or partial",
  fail:    "Last run failed",
  unknown: "No run data yet",
};

export function CronStatusFooter() {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useCronStatus();
  const entries = data?.data ?? [];

  const summary = entries.reduce(
    (acc, e) => {
      acc[e.health] += 1;
      return acc;
    },
    { ok: 0, warn: 0, fail: 0, unknown: 0 } as Record<CronStatusEntry["health"], number>,
  );

  const overall: CronStatusEntry["health"] =
    summary.fail > 0   ? "fail"
    : summary.warn > 0 ? "warn"
    : summary.ok > 0   ? "ok"
    : "unknown";

  return (
    <footer className="border-t border-border bg-card/60 backdrop-blur-sm text-[10px] text-muted-foreground flex items-center justify-between px-4 py-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 hover:text-foreground transition-colors"
            aria-label="Cron job status"
          >
            <span className="flex items-center gap-1">
              <span className={`inline-block h-2 w-2 rounded-full ${HEALTH_TONES[overall]}`} />
              <Clock className="h-3 w-3" />
              {isLoading ? "Loading cron status…" : "Cron status"}
            </span>
            {!isLoading && (
              <span className="flex items-center gap-1.5 font-mono">
                {entries.map((e) => (
                  <span
                    key={e.workflow}
                    className={`inline-block h-1.5 w-1.5 rounded-full ${HEALTH_TONES[e.health]}`}
                    title={`${e.workflow}: ${HEALTH_LABELS[e.health]}`}
                  />
                ))}
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" side="top" className="w-[420px] p-0">
          <div className="px-3 py-2 border-b border-border">
            <h3 className="text-xs font-semibold">Background jobs</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Last run + cadence per workflow. Green = healthy · Yellow = stale or partial · Red = failed
            </p>
          </div>
          <div className="divide-y divide-border max-h-80 overflow-auto">
            {entries.length === 0 && (
              <div className="p-4 text-xs text-muted-foreground">
                No cron status reported yet. Workflows will populate this list after their next run.
              </div>
            )}
            {entries.map((e) => (
              <div key={e.workflow} className="px-3 py-2 flex items-start gap-2.5">
                <span
                  className={`inline-block h-2 w-2 rounded-full mt-1.5 shrink-0 ${HEALTH_TONES[e.health]}`}
                  aria-hidden
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-medium font-mono">{e.workflow}</span>
                    <span className="text-[10px] text-muted-foreground">{e.description}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {e.ranAt
                      ? `Last ran ${formatDistanceToNow(new Date(e.ranAt), { addSuffix: true })}`
                      : "No run recorded"}
                    {e.itemsProcessed != null && ` · ${e.itemsProcessed} items`}
                    {e.durationMs != null && ` · ${(e.durationMs / 1000).toFixed(1)}s`}
                  </div>
                  {e.notes && (
                    <div className="text-[10px] text-muted-foreground/80 mt-0.5 truncate">
                      {e.notes}
                    </div>
                  )}
                </div>
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground whitespace-nowrap shrink-0 mt-1">
                  {HEALTH_LABELS[e.health]}
                </span>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      <span className="font-mono text-[9px] uppercase tracking-widest">
        {summary.ok} ok · {summary.warn} warn · {summary.fail} fail · {summary.unknown} pending
      </span>
    </footer>
  );
}
