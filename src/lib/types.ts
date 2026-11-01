// Domain model. Every record is stored per user as JSON in the `records` table
// (Supabase) or the local JSON store (development), keyed by collection + id.

export type Education = {
  id: string;
  school: string;
  degree: string;
  field: string;
  start: string;
  end: string;
  grade?: string;
  notes?: string;
};

export type Experience = {
  id: string;
  company: string;
  title: string;
  location?: string;
  start: string;
  end: string; // "Present" when ongoing
  summary: string;
  bullets: string[]; // facts the candidate can defend; the only source for tailoring
  metrics: string[];
  skills: string[];
  verified: boolean;
};

export type ApplicationAnswers = {
  workAuthorization: string; // e.g. "Hong Kong IANG visa holder"
  needsSponsorship: "yes" | "no" | "";
  visaStatus: string;
  earliestStart: string;
  availability: string; // e.g. "Full-time, 6 months"
  expectedSalary: string;
  noticePeriod: string;
  willingToRelocate: "yes" | "no" | "depends" | "";
  pronouns?: string;
  custom: { id: string; question: string; answer: string }[];
};

export type Profile = {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  website: string;
  headline: string;
  summary: string;
  education: Education[];
  experiences: Experience[];
  skills: string[];
  languages: string[];
  answers: ApplicationAnswers;
  onboardedAt: string | null;
  updatedAt: string;
};

export type SourceKind = "greenhouse" | "lever" | "ashby" | "google_jobs" | "manual";

export type Preferences = {
  roles: string[]; // target role keywords, e.g. "AI Product"
  keywords: string[]; // extra positive keywords
  excludeKeywords: string[];
  locations: string[];
  workModes: string[];
  sources: {
    greenhouse: string[]; // board tokens, e.g. "airwallex"
    lever: string[];
    ashby: string[];
    googleJobs: boolean; // aggregator search via SerpAPI (covers JobsDB, Indeed, LinkedIn listings)
  };
  frequency: "daily" | "weekly" | "manual";
  lastRunAt: string | null;
  lastRunSummary: string | null;
  extensionTokenHash?: string; // SHA-256 of the browser-extension token
};

export type JobStatus = "new" | "saved" | "dismissed" | "applying";

export type Job = {
  id: string;
  source: SourceKind;
  sourceId: string;
  company: string;
  title: string;
  location: string;
  url: string;
  description: string;
  postedAt: string | null;
  fetchedAt: string;
  score: number; // 0–100
  scoredBy: "ai" | "keywords";
  fit: string[];
  risks: string[];
  suggestedResumeId: string | null;
  status: JobStatus;
};

export type ResumeContent = {
  headline: string;
  summary: string;
  experiences: { experienceId: string; company: string; title: string; period: string; bullets: string[] }[];
  education: { school: string; degree: string; period: string }[];
  skills: string[];
};

export type Resume = {
  id: string;
  name: string;
  kind: "version" | "tailored";
  focus: string[]; // role keywords this version targets; used for automatic routing
  experienceIds: string[];
  jobId: string | null; // tailored resumes only
  baseId?: string | null; // tailored resumes: the version they were cut from
  content: ResumeContent;
  approved: boolean; // tailored resumes must be approved before use
  createdAt: string;
  updatedAt: string;
};

export type ApplicationStatus =
  | "preparing"
  | "applied"
  | "assessment"
  | "interview"
  | "offer"
  | "rejected"
  | "withdrawn";

export type Application = {
  id: string;
  jobId: string | null;
  company: string;
  title: string;
  url: string;
  resumeId: string | null;
  status: ApplicationStatus;
  appliedAt: string | null;
  notes: string;
  coverLetter: string;
  history: { status: ApplicationStatus; at: string }[];
  createdAt: string;
  updatedAt: string;
};

export type SourceStat = { label: string; fetched: number; ms: number; error: string | null };

/** One execution of the discovery pipeline, kept for observability. */
export type SearchRun = {
  id: string;
  trigger: "manual" | "schedule";
  startedAt: string;
  finishedAt: string;
  sources: SourceStat[];
  fetched: number;
  matched: number; // passed filters and not seen before
  added: number;
  aiScored: number;
  aiError: string | null;
};

export type Collections = {
  profile: Profile;
  preferences: Preferences;
  jobs: Job;
  resumes: Resume;
  applications: Application;
  runs: SearchRun;
};
export type CollectionName = keyof Collections;
