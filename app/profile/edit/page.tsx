import Link from "next/link";
import { ProfileEditForm } from "@/components/social/ProfileEditForm";

export default function ProfileEditPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/profile"
          className="text-sm text-sand-200/70 transition hover:text-sand-50"
        >
          ← Back to profile
        </Link>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-sand-50">
          Edit your outdoor identity
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-sand-200/70">
          This is your identity card and adventure log — not a generic social
          profile. Changes save to this device only; public sharing requires
          cloud sync later.
        </p>
      </div>

      <ProfileEditForm />
    </div>
  );
}
