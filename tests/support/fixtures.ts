import type { Application, ApplicationStatus, Job, Preferences, Profile, Resume, SearchRun } from "@/lib/types";
import type { RawJob } from "@/lib/sources";

export const prefs = (patch: Partial<Preferences> = {}): Preferences => ({
  roles: ["Product", "AI", "Analyst"],
  keywords: ["SQL"],
  excludeKeywords: ["Senior"],
  locations: ["Hong Kong"],
  workModes: ["On-site", "Hybrid"],
  sources: { greenhouse: [], lever: [], ashby: [], googleJobs: false },
  frequency: "daily",
  lastRunAt: null,
  lastRunSummary: null,
  ...patch,
});

export const rawJob = (patch: Partial<RawJob> = {}): RawJob => ({
  source: "greenhouse",
  sourceId: "board:1",
  company: "Acme",
  title: "Product Analyst Intern",
  location: "Hong Kong",
  url: "https://example.com/job/1",
  description: "Work with SQL and Python on product metrics.",
  postedAt: null,
  ...patch,
});

export const profile = (patch: Partial<Profile> = {}): Profile => ({
  fullName: "Test User",
  email: "test@example.com",
  phone: "",
  location: "Hong Kong",
  linkedin: "",
  website: "",
  headline: "Product analyst",
  summary: "",
  education: [{ id: "edu1", school: "HKU", degree: "BBA", field: "IS", start: "2024", end: "2027" }],
  experiences: [
    { id: "e1", company: "One", title: "Intern", start: "2025", end: "2025", summary: "", bullets: ["a", "b", "c", "d", "e", "f"], metrics: [], skills: [], verified: true },
    { id: "e2", company: "Two", title: "Founder", start: "2024", end: "Present", summary: "", bullets: ["x"], metrics: [], skills: [], verified: true },
  ],
  skills: ["SQL", "Python", "Figma"],
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
  updatedAt: "2026-11-01T00:00:00.000Z",
  ...patch,
});

export const resume = (patch: Partial<Resume> = {}): Resume => ({
  id: "r1",
  name: "General",
  kind: "version",
  focus: [],
  experienceIds: [],
  jobId: null,
  content: { headline: "", summary: "", experiences: [], education: [], skills: [] },
  approved: true,
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
  ...patch,
});

export const job = (patch: Partial<Job> = {}): Job => ({
  ...rawJob(),
  id: "j1",
  fetchedAt: "2026-10-30T00:00:00.000Z",
  score: 70,
  scoredBy: "keywords",
  fit: [],
  risks: [],
  suggestedResumeId: null,
  status: "new",
  ...patch,
});

/** An application whose history walks through `path` (the last entry is its current status). */
export const app = (id: string, path: ApplicationStatus[], patch: Partial<Application> = {}): Application => ({
  id,
  jobId: null,
  company: "Acme",
  title: "Intern",
  url: "",
  resumeId: null,
  status: path[path.length - 1],
  appliedAt: path.includes("applied") ? "2026-10-20T02:00:00.000Z" : null,
  notes: "",
  coverLetter: "",
  history: path.map((status, i) => ({ status, at: `2026-10-${String(10 + i).padStart(2, "0")}T00:00:00.000Z` })),
  createdAt: "2026-10-10T00:00:00.000Z",
  updatedAt: "2026-10-20T00:00:00.000Z",
  ...patch,
});

export const run = (startedAt: string, sources: SearchRun["sources"]): SearchRun => ({
  id: `run_${startedAt}`,
  trigger: "schedule",
  startedAt,
  finishedAt: startedAt,
  sources,
  fetched: sources.reduce((n, s) => n + s.fetched, 0),
  matched: 0,
  added: 0,
  aiScored: 0,
  aiError: null,
});
