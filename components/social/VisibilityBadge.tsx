import { Badge } from "@/components/Badge";
import type { Visibility } from "@/lib/socialTypes";

/*
 * Visibility is local-only intent in this MVP — nothing actually leaves the
 * device. The notes below say so plainly so the UI never implies real sharing.
 */
type Meta = {
  label: string;
  tone: "neutral" | "sand" | "moss" | "rust";
  icon: string;
  /** Honest, local-first explanation of what this visibility means today. */
  note: string;
};

export const VISIBILITY_META: Record<Visibility, Meta> = {
  private: {
    label: "Private",
    tone: "neutral",
    icon: "🔒",
    note: "Only you, on this device.",
  },
  unlisted: {
    label: "Unlisted",
    tone: "sand",
    icon: "🔗",
    note: "Shareable by link once cloud sync exists.",
  },
  followers: {
    label: "Followers",
    tone: "moss",
    icon: "👥",
    note: "Reserved for a future followers feature.",
  },
  public: {
    label: "Public",
    tone: "rust",
    icon: "🌐",
    note: "Public sharing requires cloud sync later.",
  },
};

export const VISIBILITY_OPTIONS: { value: Visibility; label: string }[] = (
  Object.keys(VISIBILITY_META) as Visibility[]
).map((value) => ({ value, label: VISIBILITY_META[value].label }));

export function VisibilityBadge({
  visibility,
  withNote = false,
  className,
}: {
  visibility: Visibility;
  /** When true, the explanatory note is used as the badge tooltip. */
  withNote?: boolean;
  className?: string;
}) {
  const meta = VISIBILITY_META[visibility];
  return (
    <Badge
      tone={meta.tone}
      className={className}
      title={withNote ? meta.note : undefined}
    >
      <span aria-hidden>{meta.icon}</span>
      {meta.label}
    </Badge>
  );
}
