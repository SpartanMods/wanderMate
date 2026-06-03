import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone =
  | "moss"
  | "rust"
  | "sand"
  | "neutral"
  | "sky"
  | "amber";

const tones: Record<Tone, string> = {
  moss: "border-moss-500/40 bg-moss-600/15 text-moss-200",
  rust: "border-rust-500/40 bg-rust-600/15 text-rust-200",
  sand: "border-sand-300/30 bg-sand-300/10 text-sand-200",
  neutral: "border-basecamp-700 bg-basecamp-800/70 text-sand-200",
  sky: "border-sky-500/30 bg-sky-500/10 text-sky-200",
  amber: "border-amber-500/30 bg-amber-500/10 text-amber-200",
};

export function Badge({
  children,
  tone = "neutral",
  className,
  title,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
