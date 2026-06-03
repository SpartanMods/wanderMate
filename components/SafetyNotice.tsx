import { cn } from "@/lib/utils";

export const SAFETY_COPY =
  "WanderMate recommendations are planning aids, not verified real-time conditions. Always confirm weather, fire restrictions, road closures, camping rules, OHV legality, permits, and local regulations through official sources before you go.";

export function SafetyNotice({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      role="note"
      className={cn(
        "rounded-xl border border-amber-600/40 bg-amber-900/15 text-amber-100",
        compact ? "px-3 py-2 text-xs" : "px-4 py-3 text-sm",
        className
      )}
    >
      <div className="flex items-start gap-2">
        <span aria-hidden className="mt-0.5 text-amber-400">
          ⚠
        </span>
        <p className={compact ? "leading-snug" : "leading-relaxed"}>
          {compact ? (
            <span>
              Planning aid only — confirm weather, fire, road, permit &amp; OHV
              rules through official sources before you go.
            </span>
          ) : (
            SAFETY_COPY
          )}
        </p>
      </div>
    </div>
  );
}
