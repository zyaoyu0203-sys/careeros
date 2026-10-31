import type { Application, ApplicationStatus, Job, Resume, SearchRun, SourceKind } from "@/lib/types";

// Pure metric functions behind the Insights dashboard — no I/O, so they are unit-tested directly.

const REACHED_INTERVIEW: ApplicationStatus[] = ["assessment", "interview", "offer"];
const SUBMITTED: ApplicationStatus[] = ["applied", "assessment", "interview", "offer", "rejected", "withdrawn"];

/** Did the application ever reach this stage? Uses history, so a later rejection still counts the interview. */
export function everReached(app: Application, stages: ApplicationStatus[]) {
  return stages.includes(app.status) || app.history.some(h => stages.includes(h.status));
}

export type FunnelStep = { label: string; count: number; rateFromPrevious: number | null };

export function funnel(jobs: Job[], apps: Application[]): FunnelStep[] {
  const counts: [string, number][] = [
    ["Roles pushed", jobs.length],
    ["Shortlisted", jobs.filter(j => j.status === "saved" || j.status === "applying").length + apps.filter(a => !a.jobId).length],
    ["Applied", apps.filter(a => everReached(a, SUBMITTED)).length],
    ["Assessment or interview", apps.filter(a => everReached(a, REACHED_INTERVIEW)).length],
    ["Offer", apps.filter(a => everReached(a, ["offer"])).length],
  ];
  return counts.map(([label, count], i) => ({
    label,
    count,
    rateFromPrevious: i === 0 || counts[i - 1][1] === 0 ? null : count / counts[i - 1][1],
  }));
}

export type VersionPerformance = { resumeId: string; name: string; applied: number; interviews: number; rate: number };

/** Interview rate per resume version; tailored resumes count toward the version they were cut from. */
export function performanceByResume(apps: Application[], resumes: Resume[]): VersionPerformance[] {
  const versions = resumes.filter(r => r.kind === "version");
  const versionOf = (resumeId: string | null) => {
    const r = resumes.find(x => x.id === resumeId);
    if (!r) return null;
    if (r.kind === "version") return r.id;
    return r.baseId ?? null;
  };
  return versions
    .map(v => {
      const used = apps.filter(a => versionOf(a.resumeId) === v.id && everReached(a, SUBMITTED));
      const interviews = used.filter(a => everReached(a, REACHED_INTERVIEW)).length;
      return { resumeId: v.id, name: v.name, applied: used.length, interviews, rate: used.length ? interviews / used.length : 0 };
    })
    .sort((a, b) => b.applied - a.applied);
}

export type SourceHealth = { label: string; runs: number; successRate: number; avgFetched: number; avgMs: number; lastError: string | null };

export function sourceHealth(runs: SearchRun[]): SourceHealth[] {
  type Acc = { ok: number; total: number; fetched: number; ms: number; lastError: string | null; lastErrorAt: string };
  const by = new Map<string, Acc>();
  for (const run of runs) {
    for (const s of run.sources) {
      const e = by.get(s.label) ?? { ok: 0, total: 0, fetched: 0, ms: 0, lastError: null, lastErrorAt: "" };
      e.total++;
      e.ms += s.ms;
      if (!s.error) {
        e.ok++;
        e.fetched += s.fetched;
      } else if (run.startedAt > e.lastErrorAt) {
        e.lastError = s.error;
        e.lastErrorAt = run.startedAt;
      }
      by.set(s.label, e);
    }
  }
  return [...by.entries()]
    .map(([label, e]) => ({
      label,
      runs: e.total,
      successRate: e.ok / e.total,
      avgFetched: e.ok ? Math.round(e.fetched / e.ok) : 0,
      avgMs: Math.round(e.ms / e.total),
      lastError: e.lastError,
    }))
    .sort((a, b) => a.successRate - b.successRate || b.avgFetched - a.avgFetched);
}

export type SourceOutcome = { source: SourceKind | "other"; pushed: number; applied: number; interviews: number };

/** Which job sources produced roles that turned into applications and interviews. */
export function outcomesBySource(jobs: Job[], apps: Application[]): SourceOutcome[] {
  const jobById = new Map(jobs.map(j => [j.id, j]));
  const rows = new Map<SourceOutcome["source"], SourceOutcome>();
  const row = (source: SourceOutcome["source"]) => {
    if (!rows.has(source)) rows.set(source, { source, pushed: 0, applied: 0, interviews: 0 });
    return rows.get(source)!;
  };
  for (const j of jobs) row(j.source).pushed++;
  for (const a of apps) {
    if (!everReached(a, SUBMITTED)) continue;
    const r = row(a.jobId ? (jobById.get(a.jobId)?.source ?? "other") : "other");
    r.applied++;
    if (everReached(a, REACHED_INTERVIEW)) r.interviews++;
  }
  return [...rows.values()].sort((a, b) => b.applied - a.applied || b.pushed - a.pushed);
}

/** Applications submitted per ISO week (Monday start), oldest first, including empty weeks. */
export function weeklyApplications(apps: Application[], weeks = 8, now = new Date()): { weekStart: string; count: number }[] {
  const monday = (d: Date) => {
    const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
    return x;
  };
  const start = monday(now);
  start.setUTCDate(start.getUTCDate() - 7 * (weeks - 1));
  const buckets = Array.from({ length: weeks }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + 7 * i);
    return { weekStart: d.toISOString().slice(0, 10), count: 0 };
  });
  for (const a of apps) {
    if (!a.appliedAt) continue;
    const idx = Math.floor((monday(new Date(a.appliedAt)).getTime() - start.getTime()) / (7 * 864e5));
    if (idx >= 0 && idx < weeks) buckets[idx].count++;
  }
  return buckets;
}

export const pct = (x: number) => `${Math.round(x * 100)}%`;
