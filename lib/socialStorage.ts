/*
 * Client-side storage adapter for WanderMate's social layer.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * IMPORTANT — this is localStorage ONLY.
 *
 * Nothing here is shared off-device. The Visibility field ("public",
 * "followers", etc.) records *intent*, but TRUE SHARING requires real cloud
 * persistence + auth that does not exist yet. When a backend is added, this
 * module is the seam to swap: keep the same function signatures and replace the
 * localStorage reads/writes with API calls. Until then, "public" is aspirational.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Design notes:
 * - All functions are SSR-safe: with no `window` they fall back to mock data
 *   for reads and no-op for writes, so they can be imported anywhere.
 * - Mock data (data/mock*) seeds the store on first read when localStorage is
 *   empty, giving the UI realistic content out of the box.
 * - Reads are defensive: a corrupt/partial payload degrades to the mock or an
 *   empty list rather than throwing.
 */

import type {
  SavedTrip,
  SocialProfile,
  TripJournal,
  TripJournalFormInput,
} from "./socialTypes";
import { mockSocialProfile } from "../data/mockSocialProfile";
import { mockSavedTrips } from "../data/mockSavedTrips";
import { mockTripJournals } from "../data/mockTripJournals";
import {
  generateId,
  nowIso,
  safeArray,
  uniqueSlug,
} from "./socialUtils";

const KEYS = {
  profile: "wandermate:social:profile",
  savedTrips: "wandermate:social:savedTrips",
  journals: "wandermate:social:journals",
} as const;

// ---------------------------------------------------------------------------
// Low-level localStorage helpers (the only place that touches window.storage)
// ---------------------------------------------------------------------------

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/** Read + JSON.parse a key. Returns null on any failure (missing/corrupt/blocked). */
function readKey<T>(key: string): T | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    // Quota, private mode, or malformed JSON — treat as "no data".
    return null;
  }
}

/** JSON.stringify + write a key. Returns true on success, false if it failed. */
function writeKey(key: string, value: unknown): boolean {
  if (!isBrowser()) return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    // Storage may be unavailable (private mode, quota). Fail quietly.
    return false;
  }
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

/**
 * Get the current user's profile. Seeds and returns the mock profile if the
 * store is empty so the UI always has something to render.
 */
export function getSocialProfile(): SocialProfile {
  const stored = readKey<SocialProfile>(KEYS.profile);
  if (stored && typeof stored.id === "string") return stored;
  // Seed on first read (no-op off-browser) and return the mock.
  writeKey(KEYS.profile, mockSocialProfile);
  return mockSocialProfile;
}

/** Persist the profile, stamping updatedAt. Returns the saved profile. */
export function saveSocialProfile(profile: SocialProfile): SocialProfile {
  const next: SocialProfile = { ...profile, updatedAt: nowIso() };
  writeKey(KEYS.profile, next);
  return next;
}

// ---------------------------------------------------------------------------
// Saved trips
// ---------------------------------------------------------------------------

/** Get all saved trips. Seeds with mock data when the store is empty. */
export function getSavedTrips(): SavedTrip[] {
  const stored = readKey<unknown>(KEYS.savedTrips);
  if (stored === null) {
    writeKey(KEYS.savedTrips, mockSavedTrips);
    return mockSavedTrips;
  }
  return safeArray<SavedTrip>(
    stored,
    (item): item is SavedTrip =>
      !!item && typeof (item as SavedTrip).id === "string",
  );
}

/**
 * Save (bookmark) a trip. Fills in id/savedAt when missing, then upserts by id.
 * Returns the stored record.
 */
export function saveTrip(
  savedTrip: Omit<SavedTrip, "id" | "savedAt"> & Partial<Pick<SavedTrip, "id" | "savedAt">>,
): SavedTrip {
  const trips = getSavedTrips();
  const record: SavedTrip = {
    ...savedTrip,
    id: savedTrip.id ?? generateId("saved"),
    savedAt: savedTrip.savedAt ?? nowIso(),
  };
  const idx = trips.findIndex((t) => t.id === record.id);
  const next = idx >= 0 ? trips.map((t) => (t.id === record.id ? record : t)) : [...trips, record];
  writeKey(KEYS.savedTrips, next);
  return record;
}

/** Update a saved trip in place. Returns the updated record, or null if not found. */
export function updateSavedTrip(
  id: string,
  updates: Partial<Omit<SavedTrip, "id">>,
): SavedTrip | null {
  const trips = getSavedTrips();
  const idx = trips.findIndex((t) => t.id === id);
  if (idx < 0) return null;
  const updated: SavedTrip = { ...trips[idx], ...updates, id };
  const next = trips.map((t) => (t.id === id ? updated : t));
  writeKey(KEYS.savedTrips, next);
  return updated;
}

/** Delete a saved trip. Returns true if something was removed. */
export function deleteSavedTrip(id: string): boolean {
  const trips = getSavedTrips();
  const next = trips.filter((t) => t.id !== id);
  if (next.length === trips.length) return false;
  writeKey(KEYS.savedTrips, next);
  return true;
}

// ---------------------------------------------------------------------------
// Trip journals
// ---------------------------------------------------------------------------

/** Get all trip journals. Seeds with mock data when the store is empty. */
export function getTripJournals(): TripJournal[] {
  const stored = readKey<unknown>(KEYS.journals);
  if (stored === null) {
    writeKey(KEYS.journals, mockTripJournals);
    return mockTripJournals;
  }
  return safeArray<TripJournal>(
    stored,
    (item): item is TripJournal =>
      !!item && typeof (item as TripJournal).id === "string",
  );
}

/** Find a single journal by its slug, or null if none matches. */
export function getTripJournalBySlug(slug: string): TripJournal | null {
  return getTripJournals().find((j) => j.slug === slug) ?? null;
}

/**
 * Create a new journal from form input. Generates id/slug/timestamps and fills
 * sensible defaults for list fields, then persists. Returns the new journal.
 *
 * The slug is made unique against existing journals so links never collide.
 */
export function createTripJournal(input: TripJournalFormInput): TripJournal {
  const journals = getTripJournals();
  const profile = getSocialProfile();
  const timestamp = nowIso();

  const journal: TripJournal = {
    id: generateId("journal"),
    userId: profile.id,
    slug: uniqueSlug(input.title, journals.map((j) => j.slug)),
    title: input.title,
    tripZoneId: input.tripZoneId,
    tripName: input.tripName,
    status: input.status ?? "planned",
    visibility: input.visibility ?? "private",
    startDate: input.startDate,
    endDate: input.endDate,
    generalArea: input.generalArea,
    state: input.state,
    activities: input.activities ?? [],
    routeType: input.routeType,
    routeSummary: input.routeSummary,
    distanceMiles: input.distanceMiles,
    elevationGainFeet: input.elevationGainFeet,
    driveTimeHours: input.driveTimeHours,
    difficulty: input.difficulty,
    vehicleUsed: input.vehicleUsed,
    companions: input.companions,
    notes: input.notes ?? "",
    highlights: input.highlights ?? [],
    watchouts: input.watchouts ?? [],
    lessonsLearned: input.lessonsLearned ?? [],
    safetyNotes: input.safetyNotes ?? [],
    wouldReturn: input.wouldReturn,
    rating: input.rating,
    // Default to generalized protection: never expose precise spots by accident.
    sensitiveLocation: input.sensitiveLocation ?? {
      level: "generalized",
      displayArea: input.generalArea,
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  writeKey(KEYS.journals, [...journals, journal]);
  return journal;
}

/**
 * Update a journal in place, stamping updatedAt. id/slug/createdAt are
 * protected from accidental overwrite. Returns the updated journal, or null.
 */
export function updateTripJournal(
  id: string,
  updates: Partial<Omit<TripJournal, "id" | "slug" | "createdAt">>,
): TripJournal | null {
  const journals = getTripJournals();
  const idx = journals.findIndex((j) => j.id === id);
  if (idx < 0) return null;
  const current = journals[idx];
  const updated: TripJournal = {
    ...current,
    ...updates,
    id: current.id,
    slug: current.slug,
    createdAt: current.createdAt,
    updatedAt: nowIso(),
  };
  const next = journals.map((j) => (j.id === id ? updated : j));
  writeKey(KEYS.journals, next);
  return updated;
}

/** Delete a journal. Returns true if something was removed. */
export function deleteTripJournal(id: string): boolean {
  const journals = getTripJournals();
  const next = journals.filter((j) => j.id !== id);
  if (next.length === journals.length) return false;
  writeKey(KEYS.journals, next);
  return true;
}
