import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-moss-500/50 disabled:opacity-50 disabled:cursor-not-allowed";

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-br from-moss-500 to-moss-600 text-basecamp-950 hover:from-moss-400 hover:to-moss-500 shadow-lg shadow-moss-900/30",
  secondary:
    "border border-rust-500/60 bg-rust-600/10 text-rust-100 hover:bg-rust-600/20",
  ghost:
    "border border-basecamp-700 bg-transparent text-sand-200 hover:bg-basecamp-800",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      {...rest}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
}: CommonProps & { href: string }) {
  return (
    <Link
      href={href}
      className={cn(base, variants[variant], sizes[size], className)}
    >
      {children}
    </Link>
  );
}
