import { Badge } from "@/components/Badge";
import { ButtonLink } from "@/components/Button";
import { SKILL_LEVELS } from "@/lib/constants";
import type { SocialProfile } from "@/lib/socialTypes";
import { ActivityPillList } from "./ActivityPillList";
import { VisibilityBadge } from "./VisibilityBadge";

/*
 * Named cover themes — gradient-only, no image upload in this MVP. Exported so
 * the edit form offers exactly the themes the header knows how to render.
 */
export const COVER_THEMES: { value: string; label: string; gradient: string }[] = [
  { value: "alpine-dusk", label: "Alpine dusk", gradient: "from-moss-900 via-basecamp-850 to-basecamp-950" },
  { value: "desert-rust", label: "Desert rust", gradient: "from-rust-900 via-basecamp-850 to-basecamp-950" },
  { value: "forest-deep", label: "Forest deep", gradient: "from-moss-800 via-moss-900 to-basecamp-950" },
  { value: "canyon-shadow", label: "Canyon shadow", gradient: "from-rust-800 via-basecamp-800 to-basecamp-950" },
  { value: "golden-hour", label: "Golden hour", gradient: "from-amber-900 via-basecamp-850 to-basecamp-950" },
  { value: "high-sierra", label: "High sierra", gradient: "from-sky-900 via-basecamp-850 to-basecamp-950" },
];

const DEFAULT_GRADIENT = COVER_THEMES[0].gradient;

function coverGradient(theme: string): string {
  return COVER_THEMES.find((t) => t.value === theme)?.gradient ?? DEFAULT_GRADIENT;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const SKILL_LABELS: Record<string, string> = SKILL_LEVELS.reduce(
  (acc, s) => ({ ...acc, [s.value]: s.label }),
  {},
);

export function ProfileHeader({
  profile,
  showEdit = true,
}: {
  profile: SocialProfile;
  showEdit?: boolean;
}) {
  return (
    <section className="card overflow-hidden">
      {/* Cover band — gradient theme, no uploaded imagery in this MVP. */}
      <div
        className={`relative h-28 bg-gradient-to-br sm:h-36 ${coverGradient(
          profile.coverTheme,
        )}`}
      >
        <div className="pointer-events-none absolute inset-0 topo-texture opacity-60" />
      </div>

      <div className="px-5 pb-6 sm:px-7">
        {/* Avatar + name row, avatar overlapping the cover band. */}
        <div className="-mt-10 flex flex-col gap-4 sm:-mt-12 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <div
              aria-hidden
              className="flex h-20 w-20 flex-none items-center justify-center rounded-2xl border-4 border-basecamp-850 bg-gradient-to-br from-moss-500 to-rust-600 text-2xl font-black text-basecamp-950 shadow-lg sm:h-24 sm:w-24"
            >
              {initials(profile.displayName)}
            </div>
            <div className="pb-1">
              <h1 className="text-2xl font-black leading-tight tracking-tight text-sand-50">
                {profile.displayName}
              </h1>
              <p className="text-sm text-sand-200/70">@{profile.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <VisibilityBadge visibility={profile.visibility} withNote />
            {showEdit && (
              <ButtonLink href="/profile/edit" variant="ghost" size="sm">
                Edit profile
              </ButtonLink>
            )}
          </div>
        </div>

        {/* Identity facts */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-sand-200/80">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden>📍</span>
            {profile.homeBase}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden>🚙</span>
            {profile.vehicleOrRig}
          </span>
          <Badge tone="sand">
            {SKILL_LABELS[profile.experienceLevel] ?? profile.experienceLevel}
          </Badge>
        </div>

        {profile.bio && (
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-sand-100/90">
            {profile.bio}
          </p>
        )}

        {/* Favorite activities */}
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-basecamp-600">
            Favorite activities
          </p>
          <ActivityPillList
            activities={profile.favoriteActivities}
            tone="moss"
            emptyText="No favorite activities yet."
          />
        </div>

        {/* Preferred trip styles */}
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-basecamp-600">
            Preferred trip styles
          </p>
          <ActivityPillList
            items={profile.preferredTripStyles}
            tone="rust"
            emptyText="No trip styles set yet."
          />
        </div>
      </div>
    </section>
  );
}
