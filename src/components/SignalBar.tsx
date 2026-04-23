import { cn } from "@/lib/utils";
import { signalLabel } from "@/lib/mock-data";

export function SignalBar({ value, showLabel = true, className }: { value: number; showLabel?: boolean; className?: string }) {
  const label = signalLabel(value);
  const color =
    label === "Critical" ? "bg-[var(--color-signal-critical)]"
    : label === "High" ? "bg-[var(--color-signal-high)]"
    : label === "Med"  ? "bg-[var(--color-signal-med)]"
    : "bg-[var(--color-signal-low)]";
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative h-1.5 w-16 rounded-full bg-muted overflow-hidden">
        <div className={cn("absolute inset-y-0 left-0 rounded-full", color)} style={{ width: `${value}%` }} />
      </div>
      {showLabel && (
        <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
          {value} <span className="text-muted-foreground/60">{label}</span>
        </span>
      )}
    </div>
  );
}
