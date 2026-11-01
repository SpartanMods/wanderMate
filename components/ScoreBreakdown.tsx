import { SCORE_WEIGHTS } from "@/lib/constants";
import type { ScoreBreakdown as Breakdown } from "@/lib/types";
import { cn } from "@/lib/utils";

const ROWS: { key: keyof typeof SCORE_WEIGHTS; label: string }[] = [
  { key: "activityFit", label: "Activity fit" },
  { key: "skillFit", label: "Skill fit" },
  { key: "offGridFit", label: "Off-grid fit" },
  { key: "riskFit", label: "Risk fit" },
  { key: "vehicleFit", label: "Vehicle fit" },
  { key: "driveTimeFit", label: "Drive time fit" },
  { key: "crowdFit", label: "Crowd fit" },
  { key: "campingFit", label: "Camping fit" },
  { key: "vibeFit", label: "Vibe fit" },
  { key: "seasonFit", label: "Season fit" },
  { key: "gearFit", label: "Gear fit" },
];

export function ScoreBreakdown({ breakdown }: { breakdown: Breakdown }) {
  return (
    <div className="space-y-2.5">
      {ROWS.map((row) => {
        const max = SCORE_WEIGHTS[row.key];
        const value = breakdown[row.key] as number;
        const pct = Math.max(0, Math.min(100, (value / max) * 100));
        return (
          <div key={row.key} className="grid grid-cols-[7.5rem_1fr_3rem] items-center gap-3">
            <span className="text-xs font-medium text-sand-200/80">
              {row.label}
            </span>
            <div className="h-2 overflow-hidden rounded-full bg-basecamp-800">
              <div
                className={cn(
                  "h-full rounded-full",
                  pct >= 70
                    ? "bg-moss-500"
                    : pct >= 40
                      ? "bg-sand-400"
                      : "bg-rust-500"
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-right text-xs tabular-nums text-sand-200/70">
              {value}/{max}
            </span>
          </div>
        );
      })}

      {/* Adjustments */}
      <div className="mt-3 space-y-1.5 border-t border-basecamp-800 pt-3 text-xs">
        {breakdown.hiddenGemBoost !== 0 && (
          <div className="flex justify-between">
            <span className="text-moss-300">Hidden-gem / popularity</span>
            <span
              className={cn(
                "tabular-nums",
                breakdown.hiddenGemBoost > 0 ? "text-moss-300" : "text-rust-300"
              )}
            >
              {breakdown.hiddenGemBoost > 0 ? "+" : ""}
              {breakdown.hiddenGemBoost}
            </span>
          </div>
        )}
        {breakdown.penalties !== 0 && (
          <div className="flex justify-between">
            <span className="text-rust-300">Penalties</span>
            <span className="tabular-nums text-rust-300">
              {breakdown.penalties}
            </span>
          </div>
        )}
        {breakdown.firePenalty !== 0 && (
          <div className="flex justify-between">
            <span className="text-rust-300">Fire restrictions</span>
            <span className="tabular-nums text-rust-300">
              {breakdown.firePenalty}
            </span>
          </div>
        )}
        {breakdown.riskPenalty !== 0 && (
          <div className="flex justify-between">
            <span className="text-rust-300">Risk guardrail</span>
            <span className="tabular-nums text-rust-300">
              {breakdown.riskPenalty}
            </span>
          </div>
        )}
        <div className="flex justify-between border-t border-basecamp-800 pt-1.5 font-semibold text-sand-50">
          <span>Final score</span>
          <span className="tabular-nums">{breakdown.finalScore}/100</span>
        </div>
      </div>
    </div>
  );
}
