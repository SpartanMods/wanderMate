import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "WanderMate — Find the right trip",
  description:
    "An outdoor adventure decision engine for Colorado, Wyoming, and Utah. Find the right trip, not the same trip everyone else is taking.",
};

export const viewport: Viewport = {
  themeColor: "#0c0a07",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen topo-texture">
        <header className="sticky top-0 z-40 border-b border-basecamp-800/80 bg-basecamp-950/80 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 group">
              <span
                aria-hidden
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-moss-500 to-rust-600 text-base font-black text-basecamp-950 shadow-inner"
              >
                W
              </span>
              <span className="text-lg font-extrabold tracking-tight text-sand-50">
                Wander<span className="text-moss-300">Mate</span>
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link
                href="/planner"
                className="rounded-lg px-3 py-1.5 font-medium text-sand-200 transition hover:bg-basecamp-800 hover:text-sand-50"
              >
                Plan a Trip
              </Link>
              <Link
                href="/surprise"
                className="rounded-lg px-3 py-1.5 font-medium text-sand-200 transition hover:bg-basecamp-800 hover:text-sand-50"
              >
                Surprise Me
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6 sm:py-10">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 pb-10 pt-6 text-xs text-basecamp-600">
          <p>
            WanderMate · MVP for Colorado, Wyoming &amp; Utah · Recommendations
            are planning aids, not verified real-time conditions.
          </p>
        </footer>
      </body>
    </html>
  );
}
