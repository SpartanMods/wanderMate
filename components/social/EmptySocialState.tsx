import type { ReactNode } from "react";
import { ButtonLink } from "@/components/Button";

/*
 * A useful, actionable empty state. The social layer leans on these because a
 * fresh profile has saved nothing and logged nothing yet — so each empty state
 * tells the user what to do next rather than just saying "nothing here".
 */
export function EmptySocialState({
  icon = "🧭",
  title,
  body,
  action,
  children,
}: {
  icon?: ReactNode;
  title: string;
  body: string;
  action?: { label: string; href: string };
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-basecamp-700 bg-basecamp-900/40 px-6 py-10 text-center">
      <div className="mb-3 text-3xl" aria-hidden>
        {icon}
      </div>
      <h3 className="text-base font-bold text-sand-50">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-sand-200/75">
        {body}
      </p>
      {action && (
        <ButtonLink href={action.href} variant="ghost" size="sm" className="mt-5">
          {action.label}
        </ButtonLink>
      )}
      {children}
    </div>
  );
}
