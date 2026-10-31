import type { Metadata } from "next";
import { PageHeader, formatDate } from "@/components/ui";
import { getPreferences } from "@/lib/data";
import { requireUserId } from "@/lib/session";
import { googleJobsAvailable } from "@/lib/sources";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Job sources" };

export default async function SettingsPage() {
  const userId = await requireUserId();
  const prefs = await getPreferences(userId);
  return (
    <>
      <PageHeader
        overline="Job push"
        title="Job sources & schedule"
        description={
          prefs.lastRunAt
            ? `Last search ${formatDate(prefs.lastRunAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}: ${prefs.lastRunSummary}.`
            : "Choose what CareerOS looks for and where. Scheduled searches run every morning (Hong Kong time)."
        }
      />
      <SettingsForm initial={prefs} googleJobsAvailable={googleJobsAvailable()} />
    </>
  );
}
