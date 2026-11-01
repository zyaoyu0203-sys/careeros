import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import * as z from "zod/v4";
import type { Job, Profile, Resume, ResumeContent } from "@/lib/types";

// Two interchangeable providers behind one `structured()` call. DeepSeek (or any OpenAI-compatible
// endpoint hosting it, e.g. Volcengine Ark) is used when DEEPSEEK_API_KEY is set; otherwise Claude.

const CLAUDE_MODEL = "claude-opus-5-5";
const deepseek = () =>
  process.env.DEEPSEEK_API_KEY
    ? {
        key: process.env.DEEPSEEK_API_KEY,
        baseUrl: (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/, ""),
        model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      }
    : null;

export const aiAvailable = () => Boolean(process.env.DEEPSEEK_API_KEY || process.env.ANTHROPIC_API_KEY);
export const aiProvider = () => (deepseek() ? "deepseek" : process.env.ANTHROPIC_API_KEY ? "claude" : null);

let client: Anthropic | null = null;
const anthropic = () => (client ??= new Anthropic());

const GROUNDING_RULES = `You only use facts that appear in the candidate's knowledge base.
Never invent employers, titles, dates, numbers, tools or achievements. You may rephrase, reorder,
merge and shorten facts, and choose which to emphasise. If the job asks for something the
candidate has no evidence for, leave it out rather than imply it.`;

function profileBrief(profile: Profile) {
  return JSON.stringify({
    headline: profile.headline,
    summary: profile.summary,
    location: profile.location,
    education: profile.education,
    experiences: profile.experiences.map(e => ({
      id: e.id,
      company: e.company,
      title: e.title,
      period: `${e.start} – ${e.end}`,
      summary: e.summary,
      facts: e.bullets,
      metrics: e.metrics,
      skills: e.skills,
    })),
    skills: profile.skills,
    languages: profile.languages,
    workAuthorization: profile.answers.workAuthorization,
    needsSponsorship: profile.answers.needsSponsorship,
    earliestStart: profile.answers.earliestStart,
    availability: profile.answers.availability,
  });
}

type StructuredRequest<T> = {
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  effort: "low" | "medium" | "high";
  maxTokens: number;
};

/** A JSON answer validated against `schema`, or null when the model declines or can't comply. */
async function structured<T>(opts: StructuredRequest<T>): Promise<T | null> {
  const ds = deepseek();
  return ds ? structuredDeepSeek(ds, opts) : structuredClaude(opts);
}

async function structuredClaude<T>(opts: StructuredRequest<T>): Promise<T | null> {
  const response = await anthropic().beta.messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: opts.maxTokens,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: opts.system,
    output_config: { effort: opts.effort, format: betaZodOutputFormat(opts.schema) },
    messages: [{ role: "user", content: opts.prompt }],
  });
  if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") return null;
  return response.parsed_output ?? null;
}

/** Strips code fences some models wrap JSON in. */
export function extractJson(text: string): unknown {
  const body = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(body);
}

async function structuredDeepSeek<T>(ds: NonNullable<ReturnType<typeof deepseek>>, opts: StructuredRequest<T>): Promise<T | null> {
  // OpenAI-compatible JSON mode: the schema goes in the prompt and the reply is validated here.
  const system = `${opts.system}

Reply with a single JSON object (no prose, no code fences) that matches this JSON Schema:
${JSON.stringify(z.toJSONSchema(opts.schema))}`;
  const call = async (jsonMode: boolean) =>
    fetch(`${ds.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${ds.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ds.model,
        max_tokens: Math.min(opts.maxTokens, 8000),
        temperature: 0.2,
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
        messages: [
          { role: "system", content: system },
          { role: "user", content: opts.prompt },
        ],
      }),
      signal: AbortSignal.timeout(120_000),
    });

  let res = await call(true);
  if (res.status === 400) res = await call(false); // some hosts don't support JSON mode
  if (!res.ok) throw new Error(`DeepSeek ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string }; finish_reason?: string }[] };
  const choice = data.choices?.[0];
  if (!choice?.message?.content || choice.finish_reason === "length") return null;
  const parsed = opts.schema.safeParse(extractJson(choice.message.content));
  return parsed.success ? parsed.data : null;
}

// ---------- Job scoring ----------

const ScoreSchema = z.object({
  results: z.array(
    z.object({
      jobId: z.string(),
      score: z.number().describe("0–100 fit between this candidate and the job"),
      fit: z.array(z.string()).describe("2–3 short reasons grounded in the candidate's real experience"),
      risks: z.array(z.string()).describe("0–2 eligibility or skill gaps, e.g. visa, graduation date, seniority"),
      resumeId: z.string().nullable().describe("id of the best resume version, or null"),
    }),
  ),
});
export type JobScore = z.infer<typeof ScoreSchema>["results"][number];

export async function scoreJobs(profile: Profile, versions: Resume[], jobs: Job[]): Promise<JobScore[]> {
  const out: JobScore[] = [];
  // Small batches keep each request fast and let one failure lose little work.
  for (let i = 0; i < jobs.length; i += 6) {
    const batch = jobs.slice(i, i + 6);
    const result = await structured({
      system: `You screen job postings for one candidate and rate how well each fits them.
Score strictly: 85+ only when the role clearly matches their target direction and experience, and they appear eligible.
Penalise roles needing work rights the candidate lacks, much more seniority, or unrelated functions.
${GROUNDING_RULES}`,
      prompt: `Candidate knowledge base:\n${profileBrief(profile)}

Resume versions available (pick the best per job):
${JSON.stringify(versions.map(v => ({ id: v.id, name: v.name, focus: v.focus })))}

Jobs:
${JSON.stringify(batch.map(j => ({ jobId: j.id, company: j.company, title: j.title, location: j.location, description: j.description.slice(0, 4000) })))}`,
      schema: ScoreSchema,
      effort: "low",
      maxTokens: 8000,
    });
    if (result) out.push(...result.results);
  }
  return out;
}

// ---------- Resume tailoring ----------

const ResumeSchema = z.object({
  headline: z.string(),
  summary: z.string().describe("2–3 sentences aimed at this job"),
  experiences: z.array(
    z.object({
      experienceId: z.string(),
      bullets: z.array(z.string()).describe("3–4 achievement bullets, strongest and most relevant first"),
    }),
  ),
  skills: z.array(z.string()).describe("8–14 skills, most relevant to the job first"),
});

export async function tailorResume(profile: Profile, job: Job, base: Resume): Promise<ResumeContent | null> {
  const allowed = base.experienceIds.length ? base.experienceIds : profile.experiences.map(e => e.id);
  const result = await structured({
    system: `You tailor a candidate's resume to one job posting.
Choose and rewrite bullets from the candidate's facts so the most relevant evidence comes first, using the
job's vocabulary where it honestly applies. Keep bullets concise (under 30 words), start with a verb, keep numbers exact.
${GROUNDING_RULES}`,
    prompt: `Candidate knowledge base:\n${profileBrief(profile)}

Only use these experience ids, in the order you judge most relevant: ${JSON.stringify(allowed)}

Job: ${job.title} at ${job.company} (${job.location})
${job.description.slice(0, 8000)}`,
    schema: ResumeSchema,
    effort: "medium",
    maxTokens: 12000,
  });
  if (!result) return null;

  const byId = new Map(profile.experiences.map(e => [e.id, e]));
  return {
    headline: result.headline,
    summary: result.summary,
    experiences: result.experiences
      .filter(item => byId.has(item.experienceId))
      .map(item => {
        const exp = byId.get(item.experienceId)!;
        return { experienceId: exp.id, company: exp.company, title: exp.title, period: `${exp.start} – ${exp.end}`, bullets: item.bullets };
      }),
    education: base.content.education,
    skills: result.skills,
  };
}

// ---------- Cover letter ----------

const LetterSchema = z.object({ letter: z.string().describe("Plain-text cover letter, 180–260 words, no placeholders") });

export async function writeCoverLetter(profile: Profile, job: Job): Promise<string | null> {
  const result = await structured({
    system: `You write concise, specific cover letters. No clichés, no flattery, no restating the resume line by line.
Open with why this role, give two concrete pieces of evidence, close with availability. Sign with the candidate's name.
${GROUNDING_RULES}`,
    prompt: `Candidate knowledge base:\n${profileBrief(profile)}\nCandidate name: ${profile.fullName}\n\nJob: ${job.title} at ${job.company}\n${job.description.slice(0, 6000)}`,
    schema: LetterSchema,
    effort: "medium",
    maxTokens: 6000,
  });
  return result?.letter ?? null;
}

// ---------- Resume import (onboarding) ----------

const ImportSchema = z.object({
  fullName: z.string(),
  email: z.string(),
  phone: z.string(),
  location: z.string(),
  linkedin: z.string(),
  headline: z.string(),
  summary: z.string(),
  education: z.array(z.object({ school: z.string(), degree: z.string(), field: z.string(), start: z.string(), end: z.string(), grade: z.string() })),
  experiences: z.array(
    z.object({
      company: z.string(),
      title: z.string(),
      location: z.string(),
      start: z.string(),
      end: z.string(),
      summary: z.string(),
      bullets: z.array(z.string()),
      metrics: z.array(z.string()).describe("Exact quantified results stated in the text"),
      skills: z.array(z.string()),
    }),
  ),
  skills: z.array(z.string()),
  languages: z.array(z.string()),
});
export type ImportedProfile = z.infer<typeof ImportSchema>;

export async function importResumeText(text: string): Promise<ImportedProfile | null> {
  return structured({
    system: `You extract a structured profile from resume text. Copy facts faithfully; use "" for anything missing.
Do not embellish or add anything that is not in the text.`,
    prompt: text.slice(0, 30000),
    schema: ImportSchema,
    effort: "low",
    maxTokens: 16000,
  });
}

// ---------- Application form questions (browser extension) ----------

export type FormField = { id: number; label: string; kind: "text" | "long" | "select" | "choice"; options: string[]; required: boolean };

const FormAnswersSchema = z.object({
  answers: z.array(
    z.object({
      id: z.number(),
      answer: z.string().nullable().describe("The answer, an exact option for select/choice fields, or null if the knowledge base doesn't say"),
    }),
  ),
});

/** Answers the questions the fixed rules couldn't, from the knowledge base only. */
export async function answerFormFields(profile: Profile, job: { company: string; title: string } | null, fields: FormField[]) {
  if (!fields.length) return [];
  const custom = profile.answers.custom.filter(c => c.question && c.answer);
  const result = await structured({
    system: `You fill in a job application form on behalf of a candidate, using only their knowledge base.
Rules:
- For "select" and "choice" fields, answer with one of the listed options, copied exactly, or null. If options are empty, give a short value the field can search for (e.g. "Hong Kong").
- "text" answers are short (a name, place, number or phrase). "long" answers are 2–5 sentences in first person, specific and drawn from real experience.
- Equal-opportunity questions (gender, race, ethnicity, disability, veteran status, sexual orientation): choose the "decline"/"prefer not to say" option, or null.
- "Have you worked at <company> before?" — answer from the experience list.
- Never invent facts, numbers, employers, dates, visas or legal statements. If the knowledge base doesn't answer it, return null — the candidate will answer it.
${GROUNDING_RULES}`,
    prompt: `Candidate knowledge base:\n${profileBrief(profile)}
Name: ${profile.fullName} · Email: ${profile.email} · Phone: ${profile.phone} · Location: ${profile.location} · LinkedIn: ${profile.linkedin} · Website: ${profile.website}
Languages: ${profile.languages.join(", ")}
Saved answers: ${JSON.stringify({ ...profile.answers, custom })}
${job ? `Applying for: ${job.title} at ${job.company}` : ""}

Form fields:
${JSON.stringify(fields)}`,
    schema: FormAnswersSchema,
    effort: "low",
    maxTokens: 6000,
  });
  if (!result) return [];
  const byId = new Map(fields.map(f => [f.id, f]));
  // Trust nothing: drop unknown ids and options the field doesn't offer.
  return result.answers.filter(a => {
    const field = byId.get(a.id);
    if (!field || !a.answer?.trim()) return false;
    return field.options.length === 0 || field.options.includes(a.answer);
  });
}
