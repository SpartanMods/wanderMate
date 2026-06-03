"use client";

import {
  ACTIVITIES,
  ACTIVITY_WEIGHT_OPTIONS,
} from "@/lib/constants";
import type { ActivityKey, ActivityWeight } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  value: Partial<Record<ActivityKey, ActivityWeight>>;
  onChange: (next: Partial<Record<ActivityKey, ActivityWeight>>) => void;
};

const weightTone: Record<ActivityWeight, string> = {
  nice_to_have: "bg-basecamp-700 text-sand-200",
  important: "bg-rust-600/40 text-rust-100",
  must_have: "bg-moss-600 text-basecamp-950",
};

export function ActivityWeightSelector({ value, onChange }: Props) {
  function toggle(key: ActivityKey) {
    const next = { ...value };
    if (next[key]) {
      delete next[key];
    } else {
      next[key] = "important"; // sensible default once selected
    }
    onChange(next);
  }

  function setWeight(key: ActivityKey, weight: ActivityWeight) {
    onChange({ ...value, [key]: weight });
  }

  return (
    <div className="space-y-2">
      {ACTIVITIES.map((a) => {
        const selected = value[a.key];
        return (
          <div
            key={a.key}
            className={cn(
              "rounded-xl border transition",
              selected
                ? "border-moss-500/50 bg-basecamp-800/60"
                : "border-basecamp-700 bg-basecamp-900/40"
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 p-3">
              <button
                type="button"
                onClick={() => toggle(a.key)}
                className="flex items-center gap-2.5 text-left"
                aria-pressed={!!selected}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 flex-none items-center justify-center rounded-md border text-xs",
                    selected
                      ? "border-moss-400 bg-moss-500 text-basecamp-950"
                      : "border-basecamp-600 text-transparent"
                  )}
                  aria-hidden
                >
                  ✓
                </span>
                <span
                  className={cn(
                    "font-medium",
                    selected ? "text-sand-50" : "text-sand-200/80"
                  )}
                >
                  {a.label}
                </span>
              </button>

              {selected && (
                <div className="flex overflow-hidden rounded-lg border border-basecamp-700">
                  {ACTIVITY_WEIGHT_OPTIONS.map((w) => {
                    const active = selected === w.value;
                    return (
                      <button
                        key={w.value}
                        type="button"
                        onClick={() => setWeight(a.key, w.value)}
                        className={cn(
                          "px-2.5 py-1 text-xs font-semibold transition",
                          active
                            ? weightTone[w.value]
                            : "bg-transparent text-sand-200/60 hover:text-sand-100"
                        )}
                      >
                        {w.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}
      <p className="text-xs text-basecamp-600">
        Tap an activity to include it, then set how much it matters. Must-haves
        carry the most weight and penalize trips that can&apos;t deliver them.
      </p>
    </div>
  );
}
