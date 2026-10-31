/**
 * Generates a complete, fictional demo workspace and prints it as SQL for `public.records`.
 *
 *   node --conditions=react-server --import tsx scripts/demo-data.ts <user-uuid> > demo.sql
 *   npx supabase db query --linked -f demo.sql
 *
 *   npm run demo:local   # same data into the local development store (.data/db.json)
 *
 * The candidate (Chloe Lam) and her experience are invented. Roles are fetched live from the
 * same public job boards the product uses, so the demo shows real postings; the application
 * outcomes attached to them are made up. Randomness is seeded, so a rerun on the same day
 * produces the same story.
 */
import { mkdirSync, writeFileSync } from "fs";
import { buildResumeContent } from "@/lib/resume";
import { chooseResumeVersion, keywordScore, passesFilters } from "@/lib/discovery";
import { fetchAll } from "@/lib/sources";
import type { Application, ApplicationStatus, Collections, Job, Preferences, Profile, Resume, SearchRun } from "@/lib/types";

const local = process.argv[2] === "--local";
const userId = local ? "local-user" : process.argv[2];
if (!local && !/^[0-9a-f-]{36}$/.test(userId ?? "")) {
  console.error("Usage: demo-data.ts <user-uuid> | --local");
  process.exit(1);
}

// Seeded PRNG (mulberry32) so the story is reproducible.
let seed = 20270602;
const rand = () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
const now = Date.now();
const daysAgo = (d: number, hour = 10) => {
  const t = new Date(now - d * 864e5);
  t.setUTCHours(hour - 8, Math.floor(rand() * 60)); // hour in HKT
  return t.toISOString();
};

const profile: Profile = {
  fullName: "Chloe Lam",
  email: "chloe.lam@example.com",
  phone: "+852 5123 4567",
  location: "Hong Kong",
  linkedin: "linkedin.com/in/chloe-lam-demo",
  website: "chloelam.dev",
  headline: "Product & data · BBA (Information Systems), HKU · Summer 2027 intern",
  summary:
    "Third-year HKU Information Systems student who likes turning messy data into product decisions. Shipped a campus fintech app, built churn dashboards for a payments startup and led HKU FinTech Society's AI workshop series.",
  education: [
    { id: "edu_hku", school: "The University of Hong Kong", degree: "BBA", field: "Information Systems (Minor in Computer Science)", start: "Sep 2024", end: "Jun 2027 (expected)", grade: "CGPA 3.72 / 4.3 · Dean's Honours List" },
    { id: "edu_nus", school: "National University of Singapore", degree: "Exchange", field: "School of Computing", start: "Jan 2026", end: "May 2026" },
  ],
  experiences: [
    {
      id: "exp_victoriapay",
      company: "Victoria Pay",
      title: "Product Analyst Intern",
      location: "Hong Kong",
      start: "Jun 2026",
      end: "Aug 2026",
      summary: "Seed-stage payments startup serving SME merchants in Hong Kong.",
      bullets: [
        "Built a merchant churn dashboard in SQL and Metabase that the founders used in every weekly review",
        "Identified that 38% of churned merchants never completed onboarding and proposed a 3-step checklist, cutting drop-off by 22% in four weeks",
        "Wrote PRDs for two onboarding features and ran 12 merchant interviews to validate them",
      ],
      metrics: ["38% of churn traced to onboarding", "22% drop-off reduction", "12 merchant interviews"],
      skills: ["SQL", "Metabase", "PRD writing", "User interviews"],
      verified: true,
    },
    {
      id: "exp_lab",
      company: "HKU Business School — Digital Innovation Lab",
      title: "Research Assistant (LLM Applications)",
      location: "Hong Kong",
      start: "Jan 2026",
      end: "Present",
      summary: "Applied research on LLM tools for financial-statement analysis.",
      bullets: [
        "Built a Python pipeline that extracts KPIs from 400+ annual reports with GPT-based parsing and rule-based validation",
        "Benchmarked three prompting strategies and raised extraction accuracy from 81% to 94% on a labelled set",
        "Presented findings at the lab's industry day to 60+ practitioners",
      ],
      metrics: ["400+ annual reports", "81% → 94% accuracy"],
      skills: ["Python", "Prompt engineering", "LLM evaluation", "pandas"],
      verified: true,
    },
    {
      id: "exp_fintechsoc",
      company: "HKU FinTech Society",
      title: "Vice President, Events",
      location: "Hong Kong",
      start: "Sep 2025",
      end: "Present",
      summary: "Student society of 900+ members.",
      bullets: [
        "Led a 6-week AI-in-finance workshop series with 4 industry speakers and 350+ total attendees",
        "Secured HK$40,000 in sponsorship from two banks and a crypto exchange",
      ],
      metrics: ["350+ attendees", "HK$40,000 sponsorship"],
      skills: ["Event management", "Partnerships"],
      verified: true,
    },
    {
      id: "exp_campusapp",
      company: "SplitSmart (personal project)",
      title: "Founder & Developer",
      location: "Hong Kong",
      start: "Mar 2025",
      end: "Dec 2025",
      summary: "Bill-splitting app for HKU students.",
      bullets: [
        "Designed and shipped a React Native app with FPS payment links, reaching 1,200 student users",
        "Ran A/B tests on the invite flow that lifted week-1 retention from 31% to 46%",
      ],
      metrics: ["1,200 users", "31% → 46% week-1 retention"],
      skills: ["React Native", "Figma", "A/B testing"],
      verified: true,
    },
  ],
  skills: ["SQL", "Python", "pandas", "Tableau", "Metabase", "Figma", "PRD writing", "A/B testing", "Prompt engineering", "LLM evaluation", "React Native", "User research"],
  languages: ["Cantonese (native)", "English (fluent)", "Mandarin (fluent)"],
  answers: {
    workAuthorization: "Hong Kong permanent resident — no restrictions",
    needsSponsorship: "no",
    visaStatus: "HKSAR permanent resident",
    earliestStart: "2 Jun 2027",
    availability: "Full-time Jun–Aug 2027; 2 days/week during term",
    expectedSalary: "HK$18,000–22,000 per month",
    noticePeriod: "None",
    willingToRelocate: "depends",
    custom: [
      { id: "q_why_fintech", question: "Why are you interested in fintech?", answer: "At Victoria Pay I saw how a small onboarding fix changed whether a merchant got paid on time. I want to work where product decisions move real money for real people." },
      { id: "q_strength", question: "Describe a time you used data to change a decision.", answer: "At Victoria Pay the team believed pricing drove churn. I traced 38% of churned merchants to incomplete onboarding, proposed a checklist, and drop-off fell 22% in four weeks." },
    ],
  },
  onboardedAt: daysAgo(45),
  updatedAt: daysAgo(2),
};

const preferences: Preferences = {
  roles: ["Intern", "Internship", "Graduate", "Analyst", "AI", "Product", "Data", "Strategy", "Solutions"],
  keywords: ["SQL", "Python", "Product Manager", "Fintech", "LLM", "Payments"],
  excludeKeywords: ["Senior", "Sr", "Lead", "Principal", "Director", "Head", "Staff", "VP", "Sales", "Legal", "Counsel"],
  locations: ["Hong Kong"],
  workModes: ["On-site", "Hybrid", "Remote"],
  sources: {
    greenhouse: ["binance", "okx", "point72", "imc", "jumptrading", "schonfeld", "flowtraders", "towerresearchcapital"],
    lever: ["lalamove", "crypto", "animocabrands"],
    ashby: ["airwallex"],
    googleJobs: true,
  },
  frequency: "daily",
  lastRunAt: null,
  lastRunSummary: null,
};

function version(id: string, name: string, focus: string[], experienceIds: string[]): Resume {
  return { id, name, kind: "version", focus, experienceIds, jobId: null, content: buildResumeContent(profile, experienceIds), approved: true, createdAt: daysAgo(44), updatedAt: daysAgo(10) };
}
const versions = [
  version("res_product", "Product & AI", ["Product", "AI", "LLM", "Solutions", "Growth"], ["exp_victoriapay", "exp_lab", "exp_campusapp", "exp_fintechsoc"]),
  version("res_data", "Data & Analytics", ["Data", "Analyst", "Analytics", "Scientist", "Insights"], ["exp_lab", "exp_victoriapay", "exp_campusapp"]),
  version("res_fintech", "FinTech & Markets", ["Trading", "Quant", "Markets", "Risk", "Crypto", "Finance", "Strategy"], ["exp_victoriapay", "exp_lab", "exp_fintechsoc"]),
  version("res_general", "General", [], []),
];

async function main() {
  const { jobs: raw, stats } = await fetchAll(preferences);
  const seen = new Set<string>();
  const matching = raw.filter(j => {
    const key = `${j.company}|${j.title}`.toLowerCase();
    if (seen.has(key) || !passesFilters(j, preferences)) return false;
    seen.add(key);
    return true;
  });
  if (matching.length < 50) throw new Error(`Only ${matching.length} live roles matched — check the job boards`);

  const scored = matching
    .map(j => ({ raw: j, ...keywordScore(j, preferences, profile) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 110);

  // Spread "found" dates over the last 30 days; better matches tend to be the ones applied to.
  const jobs: Job[] = scored.map((s, i) => ({
    ...s.raw,
    id: `job_demo_${String(i).padStart(3, "0")}`,
    fetchedAt: daysAgo(Math.floor(rand() * 30)),
    score: s.score,
    scoredBy: "keywords",
    fit: s.fit,
    risks: s.risks,
    suggestedResumeId: chooseResumeVersion(versions, s.raw)?.id ?? "res_general",
    status: "new",
  }));

  // Application outcomes: 37 roles, weighted towards recent weeks.
  const plan: ApplicationStatus[] = [
    ...Array(2).fill("offer"),
    ...Array(5).fill("interview"),
    ...Array(3).fill("assessment"),
    ...Array(12).fill("applied"),
    ...Array(13).fill("rejected"),
    "withdrawn",
    ...Array(3).fill("preparing"),
  ];
  const pool = jobs.slice(0, 70).sort(() => rand() - 0.5);
  const resumes: Resume[] = [...versions];
  const applications: Application[] = plan.map((status, i) => {
    const job = pool[i];
    job.status = "applying";
    job.fetchedAt = daysAgo(8 + Math.floor(rand() * 40));
    const appliedDaysAgo = status === "preparing" ? null : Math.max(1, Math.round(rand() ** 1.4 * 44)); // skewed towards recent weeks
    const appliedAt = appliedDaysAgo === null ? null : daysAgo(appliedDaysAgo, 9 + Math.floor(rand() * 10));
    const history: Application["history"] = [{ status: "preparing", at: daysAgo((appliedDaysAgo ?? 2) + 1) }];
    const path: ApplicationStatus[] =
      status === "offer" ? ["applied", "assessment", "interview", "offer"]
      : status === "interview" ? (rand() < 0.5 ? ["applied", "assessment", "interview"] : ["applied", "interview"])
      : status === "rejected" ? (rand() < 0.15 ? ["applied", "assessment", "rejected"] : ["applied", "rejected"])
      : status === "preparing" ? []
      : ["applied", ...(status === "applied" ? [] : [status])];
    let t = appliedDaysAgo ?? 0;
    path.forEach((s, k) => {
      if (k > 0) t = Math.max(0, t - (3 + Math.floor(rand() * 8)));
      history.push({ status: s, at: daysAgo(t, 9 + Math.floor(rand() * 9)) });
    });

    // Strong candidates got a tailored resume, cut from the routed version.
    let resumeId = job.suggestedResumeId;
    if (["offer", "interview", "assessment"].includes(status) && rand() < 0.6) {
      const base = versions.find(v => v.id === job.suggestedResumeId) ?? versions[3];
      const id = `res_tailored_${i}`;
      resumes.push({
        ...base,
        id,
        name: `${job.company} — ${job.title}`,
        kind: "tailored",
        jobId: job.id,
        baseId: base.id,
        approved: true,
        createdAt: history[0].at,
        updatedAt: history[0].at,
      });
      resumeId = id;
    }

    const notes =
      status === "offer" ? "Offer received — HR call scheduled to discuss start date."
      : status === "interview" ? pick(["Hiring-manager interview booked.", "Round 2: case on product metrics.", "Superday next week — prepare SQL + product sense."])
      : status === "assessment" ? pick(["HackerRank OA received — 90 minutes, SQL + Python.", "Online numerical test due Friday.", "Take-home case study: 3 days."])
      : status === "rejected" ? pick(["Rejected after OA.", "No longer considered — position filled.", "Rejected after first-round interview."])
      : status === "withdrawn" ? "Withdrew — overlaps with accepted offer timeline."
      : "";
    return {
      id: `app_demo_${String(i).padStart(2, "0")}`,
      jobId: job.id,
      company: job.company,
      title: job.title,
      url: job.url,
      resumeId,
      status,
      appliedAt,
      notes,
      coverLetter: "",
      history,
      createdAt: history[0].at,
      updatedAt: history[history.length - 1].at,
    };
  });

  // One fresh draft waiting for approval, so the review flow is visible.
  const pendingJob = jobs.find(j => j.status === "new")!;
  pendingJob.status = "saved";
  resumes.push({ ...versions[0], id: "res_tailored_pending", name: `${pendingJob.company} — ${pendingJob.title}`, kind: "tailored", jobId: pendingJob.id, baseId: "res_product", approved: false, createdAt: daysAgo(0, 9), updatedAt: daysAgo(0, 9) });

  jobs.filter(j => j.status === "new").slice(0, 9).forEach(j => (j.status = "saved"));
  jobs.filter(j => j.status === "new").slice(-8).forEach(j => (j.status = "dismissed"));

  // 30 days of daily scheduled searches, plus a few manual ones, built from today's live source stats.
  const runs: SearchRun[] = [];
  for (let d = 29; d >= 0; d--) {
    for (const trigger of rand() < 0.15 ? (["schedule", "manual"] as const) : (["schedule"] as const)) {
      const startedAt = daysAgo(d, trigger === "schedule" ? 8 : 14 + Math.floor(rand() * 6));
      const sources = stats.map(s => {
        const host = s.label.startsWith("Greenhouse") ? "boards-api.greenhouse.io" : s.label.startsWith("Lever") ? "api.lever.co" : "api.ashbyhq.com";
        const failure = rand() < 0.02 ? pick(["timeout after 15000 ms", `503 Service Unavailable from ${host}`, `429 Too Many Requests from ${host}`]) : null;
        return { label: s.label, fetched: failure ? 0 : Math.max(0, Math.round(s.fetched * (0.9 + rand() * 0.15))), ms: Math.round(s.ms * (0.7 + rand() * 0.8)), error: failure };
      });
      const fetched = sources.reduce((n, s) => n + s.fetched, 0);
      const added = d === 29 ? 46 : Math.floor(rand() * 7);
      runs.push({
        id: `run_demo_${d}_${trigger}`,
        trigger,
        startedAt,
        finishedAt: new Date(new Date(startedAt).getTime() + 3000 + Math.floor(rand() * 9000)).toISOString(),
        sources,
        fetched,
        matched: added,
        added,
        aiScored: 0,
        aiError: null,
      });
    }
  }
  const lastRun = runs[runs.length - 1];
  preferences.lastRunAt = lastRun.finishedAt;
  preferences.lastRunSummary = `${lastRun.added} new of ${lastRun.fetched} fetched`;

  const rows: [keyof Collections, string, unknown][] = [
    ["profile", "me", profile],
    ["preferences", "me", preferences],
    ...jobs.map(j => ["jobs", j.id, j] as [keyof Collections, string, unknown]),
    ...resumes.map(r => ["resumes", r.id, r] as [keyof Collections, string, unknown]),
    ...applications.map(a => ["applications", a.id, a] as [keyof Collections, string, unknown]),
    ...runs.slice(-30).map(r => ["runs", r.id, r] as [keyof Collections, string, unknown]),
  ];

  if (local) {
    const db: Record<string, Record<string, Record<string, unknown>>> = { [userId]: {} };
    for (const [c, id, data] of rows) (db[userId][c] ??= {})[id] = data;
    mkdirSync(".data", { recursive: true });
    writeFileSync(".data/db.json", JSON.stringify(db, null, 2));
    console.error(`demo: wrote .data/db.json — ${jobs.length} jobs, ${applications.length} applications`);
    return;
  }

  const values = rows.map(([c, id, data]) => `('${userId}', '${c}', '${id}', $demo$${JSON.stringify(data)}$demo$::jsonb, now())`).join(",\n");
  console.log(`begin;
delete from public.records where user_id = '${userId}';
insert into public.records (user_id, collection, id, data, updated_at) values
${values};
commit;`);
  console.error(`demo: ${jobs.length} jobs, ${applications.length} applications, ${resumes.length} resumes, ${Math.min(30, runs.length)} runs`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
