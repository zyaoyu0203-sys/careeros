import "server-only";
import type { Preferences, SourceKind, SourceStat } from "@/lib/types";

// A job as it comes off a source, before scoring. Every fetcher returns this shape.
export type RawJob = {
  source: SourceKind;
  sourceId: string;
  company: string;
  title: string;
  location: string;
  url: string;
  description: string;
  postedAt: string | null;
};

const TIMEOUT_MS = 15_000;

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} from ${new URL(url).host}`);
  return res.json() as Promise<T>;
}

export function htmlToText(html: string): string {
  return html
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/<\s*(br|\/p|\/li|\/h\d)\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const titleCase = (slug: string) => slug.replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());

// Public ATS job boards — official, unauthenticated endpoints that companies publish for this purpose.

async function greenhouse(board: string): Promise<RawJob[]> {
  type Res = { jobs: { id: number; title: string; location: { name: string }; absolute_url: string; content: string; updated_at: string; company_name?: string }[] };
  const data = await getJson<Res>(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs?content=true`);
  return data.jobs.map(job => ({
    source: "greenhouse",
    sourceId: `${board}:${job.id}`,
    company: job.company_name || titleCase(board),
    title: job.title,
    location: job.location?.name ?? "",
    url: job.absolute_url,
    description: htmlToText(job.content ?? ""),
    postedAt: job.updated_at ?? null,
  }));
}

async function lever(company: string): Promise<RawJob[]> {
  type Res = { id: string; text: string; categories: { location?: string; commitment?: string }; hostedUrl: string; descriptionPlain?: string; additionalPlain?: string; lists?: { text: string; content: string }[]; createdAt: number }[];
  const data = await getJson<Res>(`https://api.lever.co/v0/postings/${encodeURIComponent(company)}?mode=json`);
  return data.map(job => ({
    source: "lever",
    sourceId: `${company}:${job.id}`,
    company: titleCase(company),
    title: job.text,
    location: [job.categories?.location, job.categories?.commitment].filter(Boolean).join(" · "),
    url: job.hostedUrl,
    description: [job.descriptionPlain, ...(job.lists ?? []).map(list => `${list.text}\n${htmlToText(list.content)}`), job.additionalPlain]
      .filter(Boolean)
      .join("\n\n"),
    postedAt: job.createdAt ? new Date(job.createdAt).toISOString() : null,
  }));
}

async function ashby(board: string): Promise<RawJob[]> {
  type Res = { jobs: { id: string; title: string; location: string; jobUrl: string; descriptionPlain?: string; publishedAt?: string }[] };
  const data = await getJson<Res>(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board)}`);
  return data.jobs.map(job => ({
    source: "ashby",
    sourceId: `${board}:${job.id}`,
    company: titleCase(board),
    title: job.title,
    location: job.location ?? "",
    url: job.jobUrl,
    description: job.descriptionPlain ?? "",
    postedAt: job.publishedAt ?? null,
  }));
}

// Google Jobs via SerpAPI aggregates listings from JobsDB, Indeed, LinkedIn and company sites.
async function googleJobs(query: string, location: string): Promise<RawJob[]> {
  const key = process.env.SERPAPI_API_KEY;
  if (!key) return [];
  type Res = {
    jobs_results?: {
      job_id: string;
      title: string;
      company_name: string;
      location: string;
      description: string;
      via?: string;
      share_link?: string;
      apply_options?: { title: string; link: string }[];
      detected_extensions?: { posted_at?: string };
    }[];
  };
  const params = new URLSearchParams({ engine: "google_jobs", q: query, api_key: key, hl: "en" });
  if (location) params.set("location", location);
  const data = await getJson<Res>(`https://serpapi.com/search.json?${params}`);
  return (data.jobs_results ?? []).map(job => ({
    source: "google_jobs",
    sourceId: job.job_id,
    company: job.company_name,
    title: job.title,
    location: job.location,
    url: job.apply_options?.[0]?.link ?? job.share_link ?? "",
    description: job.description,
    postedAt: job.detected_extensions?.posted_at ?? null,
  }));
}

export const googleJobsAvailable = () => Boolean(process.env.SERPAPI_API_KEY);

/** Fetch from every configured source. A failing source is recorded, not fatal. */
export async function fetchAll(prefs: Preferences): Promise<{ jobs: RawJob[]; stats: SourceStat[] }> {
  const tasks: { label: string; run: () => Promise<RawJob[]> }[] = [
    ...prefs.sources.greenhouse.map(b => ({ label: `Greenhouse/${b}`, run: () => greenhouse(b) })),
    ...prefs.sources.lever.map(c => ({ label: `Lever/${c}`, run: () => lever(c) })),
    ...prefs.sources.ashby.map(b => ({ label: `Ashby/${b}`, run: () => ashby(b) })),
  ];
  if (prefs.sources.googleJobs && googleJobsAvailable()) {
    const locations = prefs.locations.length ? prefs.locations : [""];
    for (const role of prefs.roles.slice(0, 4)) {
      for (const location of locations.slice(0, 2)) {
        tasks.push({ label: `Google Jobs/${role}${location ? ` in ${location}` : ""}`, run: () => googleJobs(role, location) });
      }
    }
  }

  const jobs: RawJob[] = [];
  const stats = await Promise.all(
    tasks.map(async (task): Promise<SourceStat> => {
      const started = Date.now();
      try {
        const found = await task.run();
        jobs.push(...found);
        return { label: task.label, fetched: found.length, ms: Date.now() - started, error: null };
      } catch (error) {
        return { label: task.label, fetched: 0, ms: Date.now() - started, error: error instanceof Error ? error.message : String(error) };
      }
    }),
  );
  return { jobs, stats };
}
