"use client";

import { FIRE_FILTER_OPTIONS, type FireFilterValue } from "@/lib/fireFilter";

/** Opt-in checkboxes; every option starts off so nothing is hidden by default. */
export function FireFilter({
  hidden,
  onChange,
}: {
  hidden: Set<FireFilterValue>;
  onChange: (next: Set<FireFilterValue>) => void;
}) {
  function toggle(value: FireFilterValue) {
    const next = new Set(hidden);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(next);
  }

  return (
    <fieldset className="card p-4">
      <legend className="sr-only">Fire restriction filter</legend>
      <p className="text-sm font-bold uppercase tracking-wide text-sand-300">
        🔥 Fire restrictions
      </p>
      <p className="mt-1 text-xs text-sand-200/60">
        Stricter restrictions already lower a zone&apos;s rank. Hide them entirely if you like:
      </p>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
        {FIRE_FILTER_OPTIONS.map((o) => (
          <label key={o.value} className="flex items-center gap-2 text-sm text-sand-200/85">
            <input
              type="checkbox"
              checked={hidden.has(o.value)}
              onChange={() => toggle(o.value)}
              className="h-4 w-4 accent-amber-500"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
