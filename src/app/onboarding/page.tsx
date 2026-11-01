import type { Metadata } from "next";
import { Brand } from "@/components/brand";
import { aiAvailable } from "@/lib/ai/llm";
import { getPreferences, getProfile } from "@/lib/data";
import { requireUserId } from "@/lib/session";
import { googleJobsAvailable } from "@/lib/sources";
import { supabaseConfigured } from "@/lib/store";
import { OnboardingWizard } from "./onboarding-wizard";

export const metadata: Metadata = { title: "Set up your profile" };

export default async function OnboardingPage() {
  const userId = await requireUserId();
  const [profile, prefs] = await Promise.all([getProfile(userId), getPreferences(userId)]);
  return (
    <div className="min-h-screen">
      <header className="border-t-4 border-navy-900 bg-surface">
        <div className="mx-auto flex h-[72px] max-w-[1240px] items-center px-4 sm:px-6">
          <Brand />
        </div>
      </header>
      <main className="mx-auto max-w-[1240px] px-4 py-8 sm:px-6 sm:py-10">
        <OnboardingWizard
          initialProfile={profile}
          initialPrefs={prefs}
          aiAvailable={aiAvailable()}
          googleJobsAvailable={googleJobsAvailable()}
          allowSample={!supabaseConfigured}
        />
      </main>
    </div>
  );
}
