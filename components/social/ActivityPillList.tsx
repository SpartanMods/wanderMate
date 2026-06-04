import { Badge } from "@/components/Badge";
import { ACTIVITY_LABELS } from "@/lib/constants";
import type { ActivityKey } from "@/lib/types";

type Tone = "moss" | "rust" | "sand" | "neutral" | "sky" | "amber";

/*
 * A small pill list used across the profile for activities and trip styles.
 * Pass `activities` (typed ActivityKey[], mapped to human labels) and/or
 * `items` (already-human-readable strings like preferred trip styles).
 */
export function ActivityPillList({
  activities,
  items,
  tone = "moss",
  emptyText,
  className,
}: {
  activities?: ActivityKey[];
  items?: string[];
  tone?: Tone;
  /** Shown (muted) when there is nothing to list. Omit to render nothing. */
  emptyText?: string;
  className?: string;
}) {
  const labels = [
    ...(activities ?? []).map((key) => ACTIVITY_LABELS[key] ?? key),
    ...(items ?? []),
  ];

  if (labels.length === 0) {
    return emptyText ? (
      <p className="text-sm text-basecamp-600">{emptyText}</p>
    ) : null;
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className ?? ""}`}>
      {labels.map((label) => (
        <Badge key={label} tone={tone}>
          {label}
        </Badge>
      ))}
    </div>
  );
}
