import { notFound } from "next/navigation";
import Link from "next/link";
import tripZones from "@/data/tripZones";
import { ZoneHero } from "@/components/zone/ZoneHero";
import { ZoneAccess } from "@/components/zone/ZoneAccess";
import { ZoneItinerary } from "@/components/zone/ZoneItinerary";
import { ZoneLegalRemote } from "@/components/zone/ZoneLegalRemote";
import { DataQualityDetails } from "@/components/DataQuality";
import { LiveConditionsBadge } from "@/components/LiveConditionsBadge";
import { fetchLiveConditions } from "@/lib/conditions";

// Revalidate zone detail pages every hour so live conditions stay fresh
export const revalidate = 3600;

export function generateStaticParams() {
  return tripZones.map((z) => ({ id: z.id }));
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}) {
  const zone = tripZones.find((z) => z.id === params.id);
  if (!zone) return {};
  return {
    title: `${zone.name} — WanderMate`,
    description: zone.summary,
  };
}

export default async function ZoneDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const zone = tripZones.find((z) => z.id === params.id);
  if (!zone) notFound();

  const conditions = await fetchLiveConditions(zone);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/results"
          className="text-sm text-sand-200/50 hover:text-sand-200"
        >
          ← Back to results
        </Link>
      </div>
      <ZoneHero zone={zone} />
      <LiveConditionsBadge conditions={conditions} />
      <ZoneAccess zone={zone} />
      <ZoneLegalRemote zone={zone} />
      <ZoneItinerary zone={zone} />
      <section className="card p-6">
        <h2 className="mb-4 text-lg font-bold text-sand-50">Data Quality</h2>
        <DataQualityDetails trip={zone} />
      </section>
    </div>
  );
}
