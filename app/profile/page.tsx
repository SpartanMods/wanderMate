"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/Badge";
import { ButtonLink } from "@/components/Button";
import { ActivityPillList } from "@/components/social/ActivityPillList";
import { EmptySocialState } from "@/components/social/EmptySocialState";
import { ProfileHeader } from "@/components/social/ProfileHeader";
import { ProfileStats } from "@/components/social/ProfileStats";
import { VisibilityBadge } from "@/components/social/VisibilityBadge";
import { ACTIVITY_LABELS } from "@/lib/constants";
import {
  getSavedTrips,
  getSocialProfile,
  getTripJournals,
} from "@/lib/socialStorage";
import type {
  ProfileStats as ProfileStatsType,
  RouteType,
  SavedTrip,
  SavedTripStatus,
  SocialProfile,
  TripJournal,
} from "@/lib/socialTypes";
import type { ActivityKey } from "@/lib/types";
import { formatDate, formatDateRange } from "@/lib/socialUtils";

const ROUTE_TYPE_LABELS: Record<RouteType, string> = {
  basecamp: "Basecamp",
  loop: "Loop",
  out_and_back: "Out & back",
  point_to_point: "Point to point",
  scenic_drive: "Scenic drive",
  ohv_route: "OHV route",
  mixed: "Mixed route",
};

const SAVED_STATUS_META: Record<
  SavedTripStatus,
  { label: string; tone: "neutral" | "sand" | "moss" }
> = {
  saved: { label: "Saved", tone: "neutral" },
  planned: { label: "Planned", tone: "sand" },
  completed: { label: "Completed", tone: "moss" },
};

/**
 * Derive the headline stats from the user's actual local data so the numbers
 * stay honest as trips are saved and journals are written. Falls back to the
 * profile's stored favoriteActivity when there isn't enough data to infer one.
 */
function deriveStats(
  profile: SocialProfile,
  savedTrips: SavedTrip[],
  journals: TripJournal[],
): ProfileStatsType {
  const taken = journals.filter((j) => j.status === "completed");

  // States are inferred from completed journals (saved trips don't carry one).
  const states = new Set<string>();
  for (const j of taken) if (j.state) states.add(j.state);

  // Most-logged activity across completed journals.
  const counts = new Map<ActivityKey, number>();
  for (const j of taken) {
    for (const a of j.activities) counts.set(a, (counts.get(a) ?? 0) + 1);
  }
  let favoriteActivity = profile.stats.favoriteActivity;
  let best = 0;
  Array.from(counts.entries()).forEach(([key, n]) => {
    if (n > best) {
      best = n;
      favoriteActivity = ACTIVITY_LABELS[key] ?? key;
    }
  });

  return {
    savedTripsCount: savedTrips.length,
    tripsTakenCount: taken.length,
    statesExploredCount: states.size,
    favoriteActivity,
  };
}

function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-bold text-sand-50">{title}</h2>
      <p className="mt-1 text-sm text-sand-200/70">{subtitle}</p>
    </div>
  );
}

function JournalCard({ journal }: { journal: TripJournal }) {
  return (
    <article className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold leading-snug text-sand-50">{journal.title}</h3>
          <p className="mt-0.5 text-sm text-sand-200/70">
            {journal.sensitiveLocation.displayArea}
            {formatDateRange(journal.startDate, journal.endDate) &&
              ` · ${formatDateRange(journal.startDate, journal.endDate)}`}
          </p>
        </div>
        <VisibilityBadge visibility={journal.visibility} withNote />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge tone="sand">{ROUTE_TYPE_LABELS[journal.routeType]}</Badge>
        {typeof journal.rating === "number" && (
          <Badge tone="amber">{"★".repeat(journal.rating)} {journal.rating}/5</Badge>
        )}
        {journal.wouldReturn && <Badge tone="moss">Would return</Badge>}
      </div>

      {journal.routeSummary && (
        <p className="mt-3 text-sm leading-relaxed text-sand-100/85">
          {journal.routeSummary}
        </p>
      )}

      <div className="mt-3">
        <ActivityPillList activities={journal.activities} tone="moss" />
      </div>

      <p className="mt-4 text-xs text-basecamp-600">
        🛡️ Sensitive places stay generalized.
      </p>
    </article>
  );
}

function SavedTripCard({ trip }: { trip: SavedTrip }) {
  const status = SAVED_STATUS_META[trip.status];
  return (
    <article className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-bold leading-snug text-sand-50">{trip.tripName}</h3>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-sand-200/70">
        {trip.plannedDate && <span>📅 Planned {formatDate(trip.plannedDate)}</span>}
        {typeof trip.sourceRecommendationScore === "number" && (
          <span>🎯 Match {trip.sourceRecommendationScore}</span>
        )}
      </div>

      {trip.notes && (
        <p className="mt-3 text-sm leading-relaxed text-sand-100/85">
          {trip.notes}
        </p>
      )}
    </article>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<SocialProfile | null | undefined>(
    undefined,
  );
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);
  const [journals, setJournals] = useState<TripJournal[]>([]);

  // localStorage is client-only — load after mount to avoid hydration mismatch.
  useEffect(() => {
    setProfile(getSocialProfile());
    setSavedTrips(getSavedTrips());
    setJournals(getTripJournals());
  }, []);

  const stats = useMemo(
    () => (profile ? deriveStats(profile, savedTrips, journals) : null),
    [profile, savedTrips, journals],
  );

  const tripsTaken = useMemo(
    () => journals.filter((j) => j.status === "completed"),
    [journals],
  );

  if (profile === undefined) {
    return (
      <div className="card p-6 text-sm text-sand-200/70">Loading profile…</div>
    );
  }
  if (!profile || !stats) {
    return (
      <EmptySocialState
        title="No profile yet"
        body="Something went wrong loading your local profile. Try editing to create one."
        action={{ label: "Set up profile", href: "/profile/edit" }}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Local-only disclaimer — never imply real cloud sharing. */}
      <p className="rounded-xl border border-basecamp-700/70 bg-basecamp-900/40 px-4 py-2.5 text-xs text-sand-200/70">
        🔒 This is your local outdoor identity. Everything here is stored on this
        device only — public sharing requires cloud sync later.
      </p>

      <ProfileHeader profile={profile} />

      <ProfileStats stats={stats} />

      {/* Trips I've taken */}
      <section>
        <SectionHeading
          title="Trips I’ve taken"
          subtitle="Trips I’ve actually done."
        />
        {tripsTaken.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {tripsTaken.map((j) => (
              <JournalCard key={j.id} journal={j} />
            ))}
          </div>
        ) : (
          <EmptySocialState
            icon="🏕️"
            title="No trips logged yet"
            body="Once you’ve taken a trip, write a short journal so friends can make better outdoor decisions. Sensitive places stay generalized."
            action={{ label: "Plan a trip", href: "/planner" }}
          />
        )}
      </section>

      {/* Saved trips */}
      <section>
        <SectionHeading
          title="Saved trips"
          subtitle="Saved ideas become planned trips. Planned trips become journals."
        />
        {savedTrips.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {savedTrips.map((t) => (
              <SavedTripCard key={t.id} trip={t} />
            ))}
          </div>
        ) : (
          <EmptySocialState
            icon="🔖"
            title="Nothing saved yet"
            body="Save trips from your recommendations to build a shortlist you can plan from later."
            action={{ label: "Find trips", href: "/planner" }}
          />
        )}
      </section>

      {/* Recommended style */}
      <section>
        <SectionHeading
          title="Recommended style"
          subtitle="What this person tends to recommend outdoors."
        />
        <div className="card p-5 sm:p-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-basecamp-600">
            Goes for
          </p>
          <ActivityPillList
            activities={profile.favoriteActivities}
            tone="moss"
            emptyText="No favorite activities set yet."
          />
          <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-basecamp-600">
            Trip styles
          </p>
          <ActivityPillList
            items={profile.preferredTripStyles}
            tone="rust"
            emptyText="No trip styles set yet."
          />
          {tripsTaken.some((j) => j.wouldReturn) && (
            <p className="mt-5 text-sm text-sand-200/80">
              Would happily return to{" "}
              {tripsTaken
                .filter((j) => j.wouldReturn)
                .map((j) => j.tripName ?? j.sensitiveLocation.displayArea)
                .join(", ")}
              .
            </p>
          )}
          <div className="mt-5">
            <ButtonLink href="/profile/edit" variant="ghost" size="sm">
              Edit recommended style
            </ButtonLink>
          </div>
        </div>
      </section>

      <p className="text-center text-xs text-basecamp-600">
        Want to refine your identity card?{" "}
        <Link href="/profile/edit" className="text-moss-300 hover:underline">
          Edit profile
        </Link>
      </p>
    </div>
  );
}
