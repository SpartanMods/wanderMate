/*
 * Small shared helpers: className joining, clamping, season inference,
 * and label formatting used across the app.
 */

import type { Season } from "./types";

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Infer the dominant season from a start date string (YYYY-MM-DD).
 * Northern-hemisphere meteorological seasons.
 */
export function inferSeason(startDate?: string): Season | undefined {
  if (!startDate) return undefined;
  const d = new Date(startDate);
  if (Number.isNaN(d.getTime())) return undefined;
  const month = d.getMonth(); // 0-11
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "fall";
  return "winter";
}

export function formatDriveTime(hours: number): string {
  if (hours >= 6) return "6+ hrs";
  if (Number.isInteger(hours)) return `${hours} hr${hours === 1 ? "" : "s"}`;
  return `${hours} hrs`;
}

export function titleCase(str: string): string {
  return str
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Seeded pseudo-random generator (mulberry32). Deterministic given a seed,
 * which keeps "Surprise Me" reproducible within a single selection pass
 * while still feeling random across runs.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
