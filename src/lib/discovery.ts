import "server-only";
import { aiAvailable, scoreJobs } from "@/lib/ai/llm";
import { getPreferences, newId } from "@/lib/data";
import { fetchAll, type RawJob } from "@/lib/sources";
import { store } from "@/lib/store";
import type { Job, Preferences, Profile, Resume, SearchRun, SourceStat } from "@/lib/types";

export type DiscoveryEvent =
  | { type: "source"; stat: SourceStat }
  | { type: "phase"; phase: "filtering" | "scoring" | "saving"; detail: string };

const MAX_AI_SCORED_PER_RUN = 24;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9一-鿿]+/g, " ").trim();
const dedupeKey = (j: { company: string; title: string; location: string }) => `${norm(j.company)}|${norm(j.title)}|${norm(j.location)}`;

/** Whole-word, case-insensitive match, so "AI" doesn't match "maintain". */
function matchesAny(text: string, terms: string[]) {
  const hay = ` ${norm(text)} `;
  return terms.some(term => {
    const needle = norm(term);
    return needle !== "" && hay.includes(` ${needle} `);
  });
}

/** Does a fetched job pass the user's role, location and exclusion filters? */
export function passesFilters(job: RawJob, prefs: Preferences) {
  // Target roles are matched against the title; keywords only influence the score.
  if (prefs.roles.length && !matchesAny(job.title, prefs.roles)) return false;
  if (prefs.excludeKeywords.length && matchesAny(job.title, prefs.excludeKeywords)) return false;
  if (prefs.locations.length) {
    const remoteOk = prefs.workModes.includes("Remote") && /remote/i.test(job.location);
    if (!remoteOk && !matchesAny(job.location || "", prefs.locations)) return false;
  }
  return true;
}

/** Pick the resume version whose focus keywords best match the job. */
export function chooseResumeVersion(versions: Resume[], job: { title: string; description: string }) {
  let best: Resume | null = null;
  let bestHits = 0;
  for (const version of versions) {
    const hits = version.focus.filter(term => matchesAny(job.title, [term])).length * 3 +
      version.focus.filter(term => matchesAny(job.description, [term])).length;
    if (hits > bestHits) {
      best = version;
      bestHits = hits;
    }
  }
  return best ?? versions[0] ?? null;
}

/** Transparent fallback score used when AI scoring is unavailable. */
export function keywordScore(job: RawJob, prefs: Preferences, profile: Profile) {
  const fit: string[] = [];
  let score = 40;
  const roleHits = prefs.roles.filter(role => matchesAny(job.title, [role]));
  if (roleHits.length) {
    score += Math.min(30, 18 + roleHits.length * 6);
    fit.push(`Title matches your target role${roleHits.length > 1 ? "s" : ""}: ${roleHits.join(", ")}`);
  }
  const keywordHits = prefs.keywords.filter(k => matchesAny(`${job.title} ${job.description}`, [k]));
  if (keywordHits.length) {
    score += Math.min(10, keywordHits.length * 5);
    fit.push(`Mentions ${keywordHits.slice(0, 3).join(", ")}`);
  }
  const skillHits = profile.skills.filter(skill => skill.length > 2 && matchesAny(job.description, [skill]));
  if (skillHits.length) {
    score += Math.min(20, skillHits.length * 5);
    fit.push(`Mentions your skills: ${skillHits.slice(0, 4).join(", ")}`);
  }
  if (prefs.locations.some(loc => matchesAny(job.location, [loc]))) {
    score += 8;
    fit.push(`Located in ${job.location}`);
  }
  const risks: string[] = [];
  if (/\b(senior|lead|principal|manager|director|head of)\b/i.test(job.title) && !/intern/i.test(job.title)) {
    score -= 15;
    risks.push("Title suggests a senior role");
  }
  if (/(permanent resident|right to work|citizen|no sponsorship)/i.test(job.description) && profile.answers.needsSponsorship === "yes") {
    score -= 20;
    risks.push("Posting mentions work-right requirements; you need sponsorship");
  }
  return { score: Math.max(0, Math.min(100, score)), fit, risks };
}

export function isDue(prefs: Preferences, now = new Date()) {
  if (prefs.frequency === "manual") return false;
  if (!prefs.lastRunAt) return true;
  const hours = (now.getTime() - new Date(prefs.lastRunAt).getTime()) / 36e5;
  return prefs.frequency === "daily" ? hours >= 20 : hours >= 24 * 6.5;
}

const MAX_RUNS_KEPT = 30;

export async function runDiscovery(
  userId: string,
  opts: { system?: boolean; trigger?: SearchRun["trigger"]; onEvent?: (e: DiscoveryEvent) => void } = {},
): Promise<SearchRun> {
  const emit = opts.onEvent ?? (() => {});
  const startedAt = new Date().toISOString();
  const db = store(opts);
  const [prefs, profile, resumes, existing] = await Promise.all([
    getPreferences(userId, opts),
    db.get(userId, "profile", "me"),
    db.list(userId, "resumes"),
    db.list(userId, "jobs"),
  ]);
  if (!profile) throw new Error("Complete onboarding before running discovery");
  const versions = resumes.filter(r => r.kind === "version");

  const { jobs: raw, stats } = await fetchAll(prefs, stat => emit({ type: "source", stat }));
  emit({ type: "phase", phase: "filtering", detail: `Filtering ${raw.length} roles by title, location and seniority` });
  const seen = new Set(existing.flatMap(j => [j.sourceId, dedupeKey(j)]));
  const fresh: RawJob[] = [];
  for (const job of raw) {
    if (!job.url || seen.has(job.sourceId) || seen.has(dedupeKey(job))) continue;
    seen.add(job.sourceId).add(dedupeKey(job));
    if (passesFilters(job, prefs)) fresh.push(job);
  }

  const now = new Date().toISOString();
  const candidates: Job[] = fresh.map(job => {
    const heuristic = keywordScore(job, prefs, profile);
    return {
      ...job,
      id: newId("job"),
      fetchedAt: now,
      score: heuristic.score,
      scoredBy: "keywords",
      fit: heuristic.fit,
      risks: heuristic.risks,
      suggestedResumeId: chooseResumeVersion(versions, job)?.id ?? null,
      status: "new",
    };
  });
  candidates.sort((a, b) => b.score - a.score);

  let aiScored = 0;
  let aiError: string | null = null;
  if (aiAvailable() && candidates.length) {
    emit({ type: "phase", phase: "scoring", detail: `AI scoring the top ${Math.min(candidates.length, MAX_AI_SCORED_PER_RUN)} matches against your knowledge base` });
    const top = candidates.slice(0, MAX_AI_SCORED_PER_RUN);
    try {
      const scores = await scoreJobs(profile, versions, top);
      const versionIds = new Set(versions.map(v => v.id));
      for (const s of scores) {
        const job = top.find(j => j.id === s.jobId);
        if (!job) continue;
        Object.assign(job, {
          score: Math.round(Math.max(0, Math.min(100, s.score))),
          fit: s.fit,
          risks: s.risks,
          scoredBy: "ai",
          suggestedResumeId: s.resumeId && versionIds.has(s.resumeId) ? s.resumeId : job.suggestedResumeId,
        });
        aiScored++;
      }
    } catch (error) {
      aiError = error instanceof Error ? error.message : String(error);
      console.error("AI scoring failed", error);
    }
  }

  emit({ type: "phase", phase: "saving", detail: `Saving ${candidates.length} new roles` });
  await db.putMany(userId, "jobs", candidates.map(job => ({ id: job.id, data: job })));

  const failed = stats.filter(s => s.error).length;
  const run: SearchRun = {
    id: newId("run"),
    trigger: opts.trigger ?? "manual",
    startedAt,
    finishedAt: new Date().toISOString(),
    sources: stats,
    fetched: raw.length,
    matched: fresh.length,
    added: candidates.length,
    aiScored,
    aiError,
  };
  await db.put(userId, "runs", run.id, run);
  const runs = await db.list(userId, "runs");
  for (const old of runs.sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(MAX_RUNS_KEPT)) await db.remove(userId, "runs", old.id);

  const summary = `${candidates.length} new of ${raw.length} fetched${failed ? ` · ${failed} source error(s)` : ""}${aiError ? " · AI scoring failed" : ""}`;
  await db.put(userId, "preferences", "me", { ...prefs, lastRunAt: run.finishedAt, lastRunSummary: summary });
  return run;
}

/** Score and save a job the user pasted in themselves. */
export async function addManualJob(userId: string, input: { company: string; title: string; location: string; url: string; description: string }) {
  const db = store();
  const [prefs, profile, resumes] = await Promise.all([getPreferences(userId), db.get(userId, "profile", "me"), db.list(userId, "resumes")]);
  if (!profile) throw new Error("Complete onboarding first");
  const versions = resumes.filter(r => r.kind === "version");
  const raw: RawJob = { ...input, source: "manual", sourceId: `manual:${crypto.randomUUID()}`, postedAt: null };
  const heuristic = keywordScore(raw, prefs, profile);
  const job: Job = {
    ...raw,
    id: newId("job"),
    fetchedAt: new Date().toISOString(),
    score: heuristic.score,
    scoredBy: "keywords",
    fit: heuristic.fit,
    risks: heuristic.risks,
    suggestedResumeId: chooseResumeVersion(versions, raw)?.id ?? null,
    status: "saved",
  };
  if (aiAvailable()) {
    const [s] = await scoreJobs(profile, versions, [job]).catch(() => []);
    if (s) Object.assign(job, { score: Math.round(s.score), fit: s.fit, risks: s.risks, scoredBy: "ai", suggestedResumeId: s.resumeId ?? job.suggestedResumeId });
  }
  await db.put(userId, "jobs", job.id, job);
  return job;
}
