import { FIELD_RULES, formAnswers } from "@/lib/autofill";
import { authenticateExtension, json, preflight } from "@/lib/extension-auth";
import { resumeFileName } from "@/lib/resume-pdf";
import { store } from "@/lib/store";

export const OPTIONS = preflight;

/** Everything the extension needs to fill one application: answers, custom Q&A and the resume. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await authenticateExtension(request);
  if (!userId) return json({ error: "Invalid or missing extension token" }, 401);

  const db = store({ system: true });
  const { id } = await params;
  const [app, profile] = await Promise.all([db.get(userId, "applications", id), db.get(userId, "profile", "me")]);
  if (!app || !profile) return json({ error: "Application not found" }, 404);
  const resume = app.resumeId ? await db.get(userId, "resumes", app.resumeId) : null;

  return json({
    application: { id: app.id, company: app.company, title: app.title, url: app.url, status: app.status },
    answers: formAnswers(profile),
    // The extension matches form labels with these, so the mapping lives in one place.
    rules: FIELD_RULES.map(([re, key]) => ({ pattern: re.source, flags: re.flags, key })),
    custom: profile.answers.custom.filter(c => c.question && c.answer),
    coverLetter: app.coverLetter,
    resume: resume ? { id: resume.id, name: resume.name, fileName: resumeFileName(profile), downloadPath: `/api/extension/resumes/${resume.id}` } : null,
  });
}
