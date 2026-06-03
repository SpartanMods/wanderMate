import { TripPreferenceForm } from "@/components/TripPreferenceForm";

export const metadata = {
  title: "Plan a Trip — WanderMate",
};

export default function PlannerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-sand-50">
          Plan a Trip
        </h1>
        <p className="mt-2 max-w-2xl text-sand-200/80">
          Tell us your constraints and how much each activity matters. The more
          honest you are about your skill, vehicle, and tolerance for crowds, the
          sharper the match.
        </p>
      </div>
      <TripPreferenceForm />
    </div>
  );
}
