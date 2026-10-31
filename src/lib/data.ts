import "server-only";
import { store } from "@/lib/store";
import type { Application, Job, Preferences, Profile, Resume, SearchRun } from "@/lib/types";

export const emptyProfile = (): Profile => ({
  fullName: "",
  email: "",
  phone: "",
  location: "",
  linkedin: "",
  website: "",
  headline: "",
  summary: "",
  education: [],
  experiences: [],
  skills: [],
  languages: [],
  answers: {
    workAuthorization: "",
    needsSponsorship: "",
    visaStatus: "",
    earliestStart: "",
    availability: "",
    expectedSalary: "",
    noticePeriod: "",
    willingToRelocate: "",
    custom: [],
  },
  onboardedAt: null,
  updatedAt: new Date().toISOString(),
});

export const defaultPreferences = (): Preferences => ({
  roles: [],
  keywords: [],
  excludeKeywords: [],
  locations: [],
  workModes: ["On-site", "Hybrid", "Remote"],
  sources: { greenhouse: [], lever: [], ashby: [], googleJobs: true },
  frequency: "daily",
  lastRunAt: null,
  lastRunSummary: null,
});

export async function getProfile(userId: string): Promise<Profile> {
  const saved = await store().get(userId, "profile", "me");
  return saved ? { ...emptyProfile(), ...saved, answers: { ...emptyProfile().answers, ...saved.answers } } : emptyProfile();
}

export async function getPreferences(userId: string, opts?: { system?: boolean }): Promise<Preferences> {
  const saved = await store(opts).get(userId, "preferences", "me");
  return saved ? { ...defaultPreferences(), ...saved, sources: { ...defaultPreferences().sources, ...saved.sources } } : defaultPreferences();
}

export async function listJobs(userId: string): Promise<Job[]> {
  const jobs = await store().list(userId, "jobs");
  return jobs.sort((a, b) => b.score - a.score || b.fetchedAt.localeCompare(a.fetchedAt));
}

export async function listResumes(userId: string): Promise<Resume[]> {
  const resumes = await store().list(userId, "resumes");
  return resumes.sort((a, b) => (a.kind === b.kind ? b.updatedAt.localeCompare(a.updatedAt) : a.kind === "version" ? -1 : 1));
}

export async function listApplications(userId: string): Promise<Application[]> {
  const apps = await store().list(userId, "applications");
  return apps.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function listRuns(userId: string): Promise<SearchRun[]> {
  const runs = await store().list(userId, "runs");
  return runs.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

/** Share of onboarding fields that are filled — drives the "profile strength" meter. */
export function profileCompleteness(profile: Profile): { percent: number; missing: string[] } {
  const checks: [string, boolean][] = [
    ["Name and contact", Boolean(profile.fullName && profile.email)],
    ["Headline", Boolean(profile.headline)],
    ["Education", profile.education.length > 0],
    ["At least two experiences", profile.experiences.length >= 2],
    ["Experience bullet points", profile.experiences.some(e => e.bullets.length >= 2)],
    ["Skills", profile.skills.length >= 3],
    ["Work authorisation", Boolean(profile.answers.workAuthorization)],
    ["Sponsorship answer", Boolean(profile.answers.needsSponsorship)],
    ["Earliest start date", Boolean(profile.answers.earliestStart)],
    ["Availability", Boolean(profile.answers.availability)],
  ];
  const done = checks.filter(([, ok]) => ok).length;
  return { percent: Math.round((done / checks.length) * 100), missing: checks.filter(([, ok]) => !ok).map(([label]) => label) };
}

export const newId = (prefix: string) => `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
