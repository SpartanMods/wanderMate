import { ButtonLink } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { LAUNCH_REGION_LABEL } from "@/lib/constants";

const FEATURES = [
  {
    title: "Decision-first, not map-first",
    body: "We don't dump pins on a map. We rank real zones by how well they fit your situation and tell you why.",
    icon: "🧭",
  },
  {
    title: "Weighted activity matching",
    body: "Mark what's a must-have vs. nice-to-have. A trip that whiffs your must-have gets penalized, not buried in a list.",
    icon: "🎯",
  },
  {
    title: "Hidden-gem logic",
    body: "Prefer quiet? We boost under-the-radar zones and dampen the obvious headliners everyone else is crowding.",
    icon: "💎",
  },
  {
    title: "Built-in guardrails",
    body: "Skill level, vehicle capability, off-grid appetite, and must-avoids all shape the ranking — and every pick ships with watchouts.",
    icon: "🛡️",
  },
];

const ACTIVITY_PILLS = [
  "Dispersed camping",
  "Hiking",
  "Fishing",
  "Dirt biking / OHV",
  "Overlanding",
  "Backpacking",
  "Scenic drives",
  "Stargazing",
];

export default function LandingPage() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-basecamp-700/70 bg-gradient-to-b from-basecamp-850 to-basecamp-950 px-6 py-14 sm:px-12 sm:py-20">
        <div className="pointer-events-none absolute inset-0 topo-texture opacity-70" />
        <div className="relative mx-auto max-w-3xl text-center">
          <div className="mb-6 flex justify-center">
            <Badge tone="moss" className="px-3 py-1 text-sm">
              {LAUNCH_REGION_LABEL}
            </Badge>
          </div>
          <h1 className="text-4xl font-black leading-tight tracking-tight text-sand-50 sm:text-6xl">
            Find the right trip,
            <br />
            <span className="bg-gradient-to-r from-moss-300 to-rust-300 bg-clip-text text-transparent">
              not the same trip
            </span>{" "}
            everyone else is taking.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-sand-200/90 sm:text-lg">
            Plan camping, hiking, fishing, dirt biking, overlanding, backpacking,
            and hidden-gem weekend trips based on your location, skill level,
            vehicle, and appetite for getting off-grid.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="/planner" size="lg" className="w-full sm:w-auto">
              Plan a Trip →
            </ButtonLink>
            <ButtonLink
              href="/surprise"
              variant="secondary"
              size="lg"
              className="w-full sm:w-auto"
            >
              🎲 Surprise Me
            </ButtonLink>
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-2">
            {ACTIVITY_PILLS.map((a) => (
              <Badge key={a} tone="neutral">
                {a}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* Value props */}
      <section>
        <h2 className="mb-2 text-center text-2xl font-bold text-sand-50">
          A decision engine for the backcountry
        </h2>
        <p className="mx-auto mb-8 max-w-2xl text-center text-sand-200/80">
          The hard part of an outdoor trip isn&apos;t the map — it&apos;s deciding
          where to actually go. WanderMate turns scattered planning inputs into a
          confident, explained recommendation.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6">
              <div className="mb-3 text-2xl" aria-hidden>
                {f.icon}
              </div>
              <h3 className="mb-1.5 text-lg font-bold text-sand-50">
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed text-sand-200/80">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="card p-6 sm:p-8">
        <h2 className="mb-6 text-2xl font-bold text-sand-50">How it works</h2>
        <ol className="grid gap-5 sm:grid-cols-3">
          {[
            {
              n: "1",
              t: "Tell us your constraints",
              d: "Location, drive time, dates, vehicle, skill, and the vibe you're after.",
            },
            {
              n: "2",
              t: "Weight your activities",
              d: "Must-have vs. nice-to-have, plus must-avoids the engine will respect.",
            },
            {
              n: "3",
              t: "Get ranked, explained picks",
              d: "Match scores, hidden gems, watchouts, itineraries, and backup plans.",
            },
          ].map((s) => (
            <li key={s.n} className="flex gap-3">
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-moss-600/20 font-black text-moss-300">
                {s.n}
              </span>
              <div>
                <h3 className="font-semibold text-sand-50">{s.t}</h3>
                <p className="mt-1 text-sm text-sand-200/75">{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/planner" size="md">
            Start planning
          </ButtonLink>
          <ButtonLink href="/surprise" variant="ghost" size="md">
            Or roll the dice
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
