import { NextResponse } from "next/server";
import { getPreferences } from "@/lib/data";
import { isDue, runDiscovery } from "@/lib/discovery";
import { store } from "@/lib/store";

// Called by Vercel Cron (see vercel.json). Searches for every user whose schedule is due.
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = store({ system: true });
  const users = await db.usersWithPreferences();
  const results: { user: string; added?: number; aiScored?: number; skipped?: boolean; error?: string }[] = [];

  for (const user of users) {
    try {
      const prefs = await getPreferences(user, { system: true });
      if (!isDue(prefs)) {
        results.push({ user, skipped: true });
        continue;
      }
      const run = await runDiscovery(user, { system: true, trigger: "schedule" });
      results.push({ user, added: run.added, aiScored: run.aiScored, ...(run.aiError ? { error: "AI scoring failed" } : {}) });
    } catch (error) {
      results.push({ user, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return NextResponse.json({ ran: results.filter(r => !r.skipped).length, results });
}
