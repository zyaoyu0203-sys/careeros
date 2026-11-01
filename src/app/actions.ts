"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { aiAvailable, importResumeText, tailorResume, writeCoverLetter } from "@/lib/ai/llm";
import { getPreferences, getProfile, newId } from "@/lib/data";
import { addManualJob, chooseResumeVersion, runDiscovery } from "@/lib/discovery";
import { issueExtensionToken } from "@/lib/extension-auth";
import { buildResumeContent, newVersion } from "@/lib/resume";
import { requireUserId } from "@/lib/session";
import { store, supabaseConfigured } from "@/lib/store";
import { serverSupabase } from "@/lib/supabase/server";
import type { Application, ApplicationStatus, JobStatus, Preferences, Profile } from "@/lib/types";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

const fail = (error: unknown): ActionResult => ({ ok: false, error: error instanceof Error ? error.message : String(error) });

// ---------- Knowledge base & preferences ----------

export async function saveProfile(profile: Profile, opts: { finishOnboarding?: boolean } = {}): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const db = store();
    const now = new Date().toISOString();
    const next: Profile = { ...profile, updatedAt: now, onboardedAt: profile.onboardedAt ?? (opts.finishOnboarding ? now : null) };
    await db.put(userId, "profile", "me", next);

    // Versions are views over the knowledge base, so rebuild them whenever it changes.
    // Tailored drafts are left alone: they were approved as written.
    const resumes = await db.list(userId, "resumes");
    const versions = resumes.filter(r => r.kind === "version");
    await db.putMany(
      userId,
      "resumes",
      versions.map(v => {
        const ids = v.experienceIds.filter(id => next.experiences.some(e => e.id === id));
        return { id: v.id, data: { ...v, experienceIds: ids, content: buildResumeContent(next, ids), updatedAt: now } };
      }),
    );

    // Every user starts with one general resume version built from their knowledge base.
    if (opts.finishOnboarding) {
      if (versions.length === 0) {
        const prefs = await getPreferences(userId);
        const general = newVersion(next, "General", prefs.roles, []);
        await db.put(userId, "resumes", general.id, general);
      }
    }
    revalidatePath("/", "layout");
    return { ok: true, message: "Knowledge base saved" };
  } catch (error) {
    return fail(error);
  }
}

export async function savePreferences(prefs: Preferences): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const clean = (list: string[]) => [...new Set(list.map(s => s.trim()).filter(Boolean))];
    const slug = (list: string[]) =>
      clean(list.map(s => s.replace(/^https?:\/\/[^/]+\//, "").replace(/\/.*$/, "").toLowerCase()));
    await store().put(userId, "preferences", "me", {
      ...prefs,
      roles: clean(prefs.roles),
      keywords: clean(prefs.keywords),
      excludeKeywords: clean(prefs.excludeKeywords),
      locations: clean(prefs.locations),
      sources: { ...prefs.sources, greenhouse: slug(prefs.sources.greenhouse), lever: slug(prefs.sources.lever), ashby: slug(prefs.sources.ashby) },
    });
    revalidatePath("/", "layout");
    return { ok: true, message: "Job search settings saved" };
  } catch (error) {
    return fail(error);
  }
}

export async function importResume(text: string): Promise<{ ok: true; profile: Partial<Profile> } | { ok: false; error: string }> {
  try {
    await requireUserId();
    if (!aiAvailable()) return { ok: false, error: "Resume import needs the AI service, which isn't configured yet." };
    if (text.trim().length < 200) return { ok: false, error: "Paste the full text of your resume (at least a few paragraphs)." };
    const parsed = await importResumeText(text);
    if (!parsed) return { ok: false, error: "Couldn't read that resume. Try pasting it as plain text." };
    return {
      ok: true,
      profile: {
        fullName: parsed.fullName,
        email: parsed.email,
        phone: parsed.phone,
        location: parsed.location,
        linkedin: parsed.linkedin,
        headline: parsed.headline,
        summary: parsed.summary,
        education: parsed.education.map(ed => ({ ...ed, id: newId("edu") })),
        experiences: parsed.experiences.map(exp => ({ ...exp, id: newId("exp"), verified: true })),
        skills: parsed.skills,
        languages: parsed.languages,
      },
    };
  } catch (error) {
    return fail(error) as { ok: false; error: string };
  }
}

// ---------- Jobs ----------

export async function discoverNow(): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const run = await runDiscovery(userId, { trigger: "manual" });
    revalidatePath("/", "layout");
    const failed = run.sources.filter(s => s.error).length;
    const parts = [`${run.added} new role${run.added === 1 ? "" : "s"} from ${run.fetched} fetched`];
    if (failed) parts.push(`${failed} source error(s) — see Job sources › Search history`);
    if (run.aiError) parts.push("AI scoring failed, keyword scores used");
    return { ok: true, message: parts.join(" · ") };
  } catch (error) {
    return fail(error);
  }
}

export async function addJob(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const job = await addManualJob(userId, {
    company: get("company"),
    title: get("title"),
    location: get("location"),
    url: get("url"),
    description: get("description"),
  });
  revalidatePath("/", "layout");
  redirect(`/jobs?id=${job.id}&view=saved`);
}

export async function setJobStatus(jobId: string, status: JobStatus): Promise<void> {
  const userId = await requireUserId();
  const db = store();
  const job = await db.get(userId, "jobs", jobId);
  if (!job) return;
  await db.put(userId, "jobs", jobId, { ...job, status });
  revalidatePath("/", "layout");
}

// ---------- Resumes ----------

export async function saveResumeVersion(input: { id?: string; name: string; focus: string[]; experienceIds: string[] }): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const db = store();
    const profile = await getProfile(userId);
    const focus = input.focus.map(s => s.trim()).filter(Boolean);
    if (input.id) {
      const existing = await db.get(userId, "resumes", input.id);
      if (!existing) return { ok: false, error: "Resume not found" };
      await db.put(userId, "resumes", input.id, {
        ...existing,
        name: input.name,
        focus,
        experienceIds: input.experienceIds,
        content: buildResumeContent(profile, input.experienceIds),
        updatedAt: new Date().toISOString(),
      });
    } else {
      const version = newVersion(profile, input.name || "New version", focus, input.experienceIds);
      await db.put(userId, "resumes", version.id, version);
      input.id = version.id;
    }
    revalidatePath("/", "layout");
    return { ok: true, message: input.id };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteResume(id: string): Promise<void> {
  const userId = await requireUserId();
  await store().remove(userId, "resumes", id);
  revalidatePath("/", "layout");
  redirect("/resumes");
}

export async function approveResume(id: string): Promise<void> {
  const userId = await requireUserId();
  const db = store();
  const resume = await db.get(userId, "resumes", id);
  if (!resume) return;
  await db.put(userId, "resumes", id, { ...resume, approved: true, updatedAt: new Date().toISOString() });
  revalidatePath("/", "layout");
}

export async function tailorForJob(jobId: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    if (!aiAvailable()) return { ok: false, error: "Tailoring needs the AI service, which isn't configured yet." };
    const db = store();
    const [profile, job, resumes] = await Promise.all([getProfile(userId), db.get(userId, "jobs", jobId), db.list(userId, "resumes")]);
    if (!job) return { ok: false, error: "Job not found" };
    const versions = resumes.filter(r => r.kind === "version");
    const base = versions.find(v => v.id === job.suggestedResumeId) ?? chooseResumeVersion(versions, job);
    if (!base) return { ok: false, error: "Create a resume version first" };

    const content = await tailorResume(profile, job, base);
    if (!content) return { ok: false, error: "The AI couldn't produce a tailored draft for this job." };
    const now = new Date().toISOString();
    const id = newId("res");
    await db.put(userId, "resumes", id, {
      id,
      name: `${job.company} — ${job.title}`,
      kind: "tailored",
      focus: base.focus,
      experienceIds: content.experiences.map(e => e.experienceId),
      jobId,
      baseId: base.id,
      content,
      approved: false,
      createdAt: now,
      updatedAt: now,
    });
    revalidatePath("/", "layout");
    return { ok: true, message: id };
  } catch (error) {
    return fail(error);
  }
}

// ---------- Applications ----------

export async function prepareApplication(jobId: string): Promise<void> {
  const userId = await requireUserId();
  const db = store();
  const [job, resumes, apps] = await Promise.all([db.get(userId, "jobs", jobId), db.list(userId, "resumes"), db.list(userId, "applications")]);
  if (!job) redirect("/jobs");
  const existing = apps.find(a => a.jobId === jobId);
  if (existing) redirect(`/applications/${existing.id}`);

  // Prefer an approved tailored resume for this job, then the suggested version.
  const tailored = resumes.find(r => r.kind === "tailored" && r.jobId === jobId && r.approved);
  const resumeId = tailored?.id ?? job.suggestedResumeId ?? resumes.find(r => r.kind === "version")?.id ?? null;
  const now = new Date().toISOString();
  const app: Application = {
    id: newId("app"),
    jobId,
    company: job.company,
    title: job.title,
    url: job.url,
    resumeId,
    status: "preparing",
    appliedAt: null,
    notes: "",
    coverLetter: "",
    history: [{ status: "preparing", at: now }],
    createdAt: now,
    updatedAt: now,
  };
  await db.put(userId, "applications", app.id, app);
  await db.put(userId, "jobs", jobId, { ...job, status: "applying" });
  revalidatePath("/", "layout");
  redirect(`/applications/${app.id}`);
}

export async function addApplication(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const status = (get("status") || "applied") as ApplicationStatus;
  const now = new Date().toISOString();
  const app: Application = {
    id: newId("app"),
    jobId: null,
    company: get("company"),
    title: get("title"),
    url: get("url"),
    resumeId: get("resumeId") || null,
    status,
    appliedAt: status === "preparing" ? null : now,
    notes: get("notes"),
    coverLetter: "",
    history: [{ status, at: now }],
    createdAt: now,
    updatedAt: now,
  };
  await store().put(userId, "applications", app.id, app);
  revalidatePath("/", "layout");
  redirect("/applications");
}

export async function updateApplication(
  id: string,
  patch: Partial<Pick<Application, "status" | "notes" | "resumeId" | "coverLetter">>,
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const db = store();
    const app = await db.get(userId, "applications", id);
    if (!app) return { ok: false, error: "Application not found" };
    const now = new Date().toISOString();
    const next: Application = { ...app, ...patch, updatedAt: now };
    if (patch.status && patch.status !== app.status) {
      next.history = [...app.history, { status: patch.status, at: now }];
      if (patch.status === "applied" && !app.appliedAt) next.appliedAt = now;
    }
    await db.put(userId, "applications", id, next);
    revalidatePath("/", "layout");
    return { ok: true, message: "Saved" };
  } catch (error) {
    return fail(error);
  }
}

export async function generateCoverLetter(appId: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    if (!aiAvailable()) return { ok: false, error: "Cover letters need the AI service, which isn't configured yet." };
    const db = store();
    const app = await db.get(userId, "applications", appId);
    if (!app?.jobId) return { ok: false, error: "This application isn't linked to a saved job description." };
    const [profile, job] = await Promise.all([getProfile(userId), db.get(userId, "jobs", app.jobId)]);
    if (!job) return { ok: false, error: "Job not found" };
    const letter = await writeCoverLetter(profile, job);
    if (!letter) return { ok: false, error: "The AI couldn't write a letter for this job." };
    await db.put(userId, "applications", appId, { ...app, coverLetter: letter, updatedAt: new Date().toISOString() });
    revalidatePath(`/applications/${appId}`);
    return { ok: true, message: "Draft written" };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteApplication(id: string): Promise<void> {
  const userId = await requireUserId();
  await store().remove(userId, "applications", id);
  revalidatePath("/", "layout");
  redirect("/applications");
}

// ---------- Auth ----------

export async function signOut(): Promise<void> {
  if (supabaseConfigured) {
    const supabase = await serverSupabase();
    await supabase.auth.signOut();
  }
  redirect("/login");
}


// ---------- One-click apply (with the browser extension) ----------

/**
 * Creates (or reuses) the application for a job with the chosen resume and returns the URL the
 * client should open. The `#careeros-app` fragment tells the extension which application it is filling.
 */
export async function startOneClickApply(jobId: string, resumeId: string): Promise<{ ok: true; appId: string; applyUrl: string } | { ok: false; error: string }> {
  try {
    const userId = await requireUserId();
    const db = store();
    const [job, apps] = await Promise.all([db.get(userId, "jobs", jobId), db.list(userId, "applications")]);
    if (!job?.url) return { ok: false, error: "This role has no application link" };
    const now = new Date().toISOString();
    const existing = apps.find(a => a.jobId === jobId);
    const app: Application = existing
      ? { ...existing, resumeId, updatedAt: now }
      : {
          id: newId("app"), jobId, company: job.company, title: job.title, url: job.url, resumeId, status: "preparing", appliedAt: null,
          notes: "", coverLetter: "", history: [{ status: "preparing", at: now }], createdAt: now, updatedAt: now,
        };
    await db.put(userId, "applications", app.id, app);
    if (job.status !== "applying") await db.put(userId, "jobs", jobId, { ...job, status: "applying" });
    revalidatePath("/", "layout");
    return { ok: true, appId: app.id, applyUrl: `${job.url.replace(/#.*$/, "")}#careeros-app=${app.id}` };
  } catch (error) {
    return fail(error) as { ok: false; error: string };
  }
}

export async function createExtensionToken(): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  try {
    const userId = await requireUserId();
    return { ok: true, token: await issueExtensionToken(userId) };
  } catch (error) {
    return fail(error) as { ok: false; error: string };
  }
}
