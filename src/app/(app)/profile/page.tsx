import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { getProfile, profileCompleteness } from "@/lib/data";
import { requireUserId } from "@/lib/session";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Knowledge base" };

export default async function ProfilePage() {
  const userId = await requireUserId();
  const profile = await getProfile(userId);
  const { percent, missing } = profileCompleteness(profile);
  return (
    <>
      <PageHeader
        overline={`Knowledge base · ${percent}% complete`}
        title="Your knowledge base"
        description={
          missing.length
            ? `Everything CareerOS knows about you. Still missing: ${missing.join(", ").toLowerCase()}.`
            : "Everything CareerOS knows about you. Resumes, scores and application packs are all built from this page."
        }
      />
      <ProfileForm initial={profile} />
    </>
  );
}
