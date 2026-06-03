"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {hint && <p className="-mt-1 mb-2 text-xs text-basecamp-600">{hint}</p>}
      {children}
    </div>
  );
}

/** Single-select pill group. */
export function OptionGroup<T extends string | number>({
  options,
  value,
  onChange,
  columns = 2,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  columns?: 1 | 2 | 3;
}) {
  const grid =
    columns === 1
      ? "grid-cols-1"
      : columns === 3
        ? "grid-cols-2 sm:grid-cols-3"
        : "grid-cols-1 sm:grid-cols-2";
  return (
    <div className={cn("grid gap-2", grid)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={active}
            className={cn(
              "rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition",
              active
                ? "border-moss-500 bg-moss-600/20 text-sand-50 shadow-inner"
                : "border-basecamp-700 bg-basecamp-900/40 text-sand-200/80 hover:border-basecamp-600 hover:text-sand-100"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Multi-select chip group. */
export function ChipMultiSelect({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  const set = new Set(selected);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = set.has(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => onToggle(o)}
            aria-pressed={active}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition",
              active
                ? "border-moss-500 bg-moss-600/25 text-sand-50"
                : "border-basecamp-700 bg-basecamp-900/40 text-sand-200/70 hover:border-basecamp-600 hover:text-sand-100"
            )}
          >
            {active && <span aria-hidden>✓ </span>}
            {o}
          </button>
        );
      })}
    </div>
  );
}
