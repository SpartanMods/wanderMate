"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { Field, OptionGroup } from "@/components/FormControls";
import { ACTIVITIES, SKILL_LEVELS } from "@/lib/constants";
import {
  getSocialProfile,
  saveSocialProfile,
} from "@/lib/socialStorage";
import type { SocialProfile, Visibility } from "@/lib/socialTypes";
import type { ActivityKey, SkillLevel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { COVER_THEMES } from "./ProfileHeader";
import { VISIBILITY_META, VISIBILITY_OPTIONS } from "./VisibilityBadge";

/** Parse a comma/newline separated string into a clean list of trip styles. */
function parseStyles(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function ProfileEditForm() {
  const router = useRouter();
  const [profile, setProfile] = useState<SocialProfile | null>(null);
  const [stylesText, setStylesText] = useState("");
  const [saved, setSaved] = useState(false);

  // Load the local profile on mount (localStorage is client-only).
  useEffect(() => {
    const p = getSocialProfile();
    setProfile(p);
    setStylesText(p.preferredTripStyles.join(", "));
  }, []);

  if (!profile) {
    return (
      <div className="card p-6 text-sm text-sand-200/70">Loading profile…</div>
    );
  }

  function update<K extends keyof SocialProfile>(
    key: K,
    value: SocialProfile[K],
  ) {
    setProfile((p) => (p ? { ...p, [key]: value } : p));
    setSaved(false);
  }

  function toggleActivity(key: ActivityKey) {
    setProfile((p) => {
      if (!p) return p;
      const has = p.favoriteActivities.includes(key);
      const favoriteActivities = has
        ? p.favoriteActivities.filter((k) => k !== key)
        : [...p.favoriteActivities, key];
      return { ...p, favoriteActivities };
    });
    setSaved(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const next: SocialProfile = {
      ...profile,
      preferredTripStyles: parseStyles(stylesText),
    };
    saveSocialProfile(next);
    setSaved(true);
    router.push("/profile");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Identity */}
      <section className="card p-5 sm:p-6">
        <h2 className="mb-4 text-lg font-bold text-sand-50">Identity</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Display name">
            <input
              className="input-base"
              value={profile.displayName}
              onChange={(e) => update("displayName", e.target.value)}
              placeholder="Sam R."
            />
          </Field>
          <Field label="Username" hint="Letters, numbers, and underscores.">
            <input
              className="input-base"
              value={profile.username}
              onChange={(e) =>
                update(
                  "username",
                  e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                )
              }
              placeholder="highcountry_sam"
            />
          </Field>
          <Field label="Home base">
            <input
              className="input-base"
              value={profile.homeBase}
              onChange={(e) => update("homeBase", e.target.value)}
              placeholder="Denver, Colorado"
            />
          </Field>
          <Field label="Vehicle / rig">
            <input
              className="input-base"
              value={profile.vehicleOrRig}
              onChange={(e) => update("vehicleOrRig", e.target.value)}
              placeholder="4Runner with a rooftop tent"
            />
          </Field>
        </div>
        <div className="mt-5">
          <Field
            label="Bio"
            hint="Who are you outdoors? Keep sensitive spots generalized."
          >
            <textarea
              className="input-base min-h-24 resize-y"
              value={profile.bio}
              onChange={(e) => update("bio", e.target.value)}
              placeholder="Weekend basecamper chasing quiet aspen groves and trout water…"
            />
          </Field>
        </div>
      </section>

      {/* Outdoor style */}
      <section className="card p-5 sm:p-6">
        <h2 className="mb-4 text-lg font-bold text-sand-50">Outdoor style</h2>
        <div className="space-y-5">
          <Field label="Experience level">
            <OptionGroup
              columns={2}
              options={SKILL_LEVELS}
              value={profile.experienceLevel}
              onChange={(v: SkillLevel) => update("experienceLevel", v)}
            />
          </Field>

          <Field
            label="Favorite activities"
            hint="What you actually do out there."
          >
            <div className="flex flex-wrap gap-2">
              {ACTIVITIES.map((a) => {
                const active = profile.favoriteActivities.includes(a.key);
                return (
                  <button
                    key={a.key}
                    type="button"
                    onClick={() => toggleActivity(a.key)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm font-medium transition",
                      active
                        ? "border-moss-500 bg-moss-600/25 text-sand-50"
                        : "border-basecamp-700 bg-basecamp-900/40 text-sand-200/70 hover:border-basecamp-600 hover:text-sand-100",
                    )}
                  >
                    {active && <span aria-hidden>✓ </span>}
                    {a.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field
            label="Preferred trip styles"
            hint="Free-form tags, separated by commas (e.g. weekend basecamp, quiet over crowded)."
          >
            <input
              className="input-base"
              value={stylesText}
              onChange={(e) => {
                setStylesText(e.target.value);
                setSaved(false);
              }}
              placeholder="weekend basecamp, quiet over crowded, easy overlanding"
            />
          </Field>
        </div>
      </section>

      {/* Look & sharing */}
      <section className="card p-5 sm:p-6">
        <h2 className="mb-4 text-lg font-bold text-sand-50">Look &amp; sharing</h2>
        <div className="space-y-5">
          <Field label="Cover theme" hint="Gradient only — no image upload yet.">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {COVER_THEMES.map((t) => {
                const active = profile.coverTheme === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => update("coverTheme", t.value)}
                    aria-pressed={active}
                    className={cn(
                      "overflow-hidden rounded-xl border text-left transition",
                      active
                        ? "border-moss-500 ring-2 ring-moss-500/30"
                        : "border-basecamp-700 hover:border-basecamp-600",
                    )}
                  >
                    <span
                      className={cn(
                        "block h-10 w-full bg-gradient-to-br",
                        t.gradient,
                      )}
                      aria-hidden
                    />
                    <span className="block px-3 py-1.5 text-xs font-medium text-sand-200">
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Visibility">
            <OptionGroup
              columns={2}
              options={VISIBILITY_OPTIONS}
              value={profile.visibility}
              onChange={(v: Visibility) => update("visibility", v)}
            />
            <p className="mt-2 text-xs text-basecamp-600">
              {VISIBILITY_META[profile.visibility].note} Everything is stored
              locally on this device — public sharing requires cloud sync later.
            </p>
          </Field>
        </div>
      </section>

      <div className="sticky bottom-4 z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-basecamp-600">
          {saved ? "Saved locally ✓" : "Changes are saved to this device only."}
        </p>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={() => router.push("/profile")}
          >
            Cancel
          </Button>
          <Button type="submit" size="lg">
            Save profile
          </Button>
        </div>
      </div>
    </form>
  );
}
