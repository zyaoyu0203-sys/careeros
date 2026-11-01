import { corsHeaders, authenticateExtension, json, preflight } from "@/lib/extension-auth";
import { renderResumePdf, resumeFileName } from "@/lib/resume-pdf";
import { store } from "@/lib/store";

export const OPTIONS = preflight;

/** The resume as a PDF, for the extension to attach to the form's file input. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await authenticateExtension(request);
  if (!userId) return json({ error: "Invalid or missing extension token" }, 401);

  const db = store({ system: true });
  const { id } = await params;
  const [resume, profile] = await Promise.all([db.get(userId, "resumes", id), db.get(userId, "profile", "me")]);
  if (!resume || !profile) return json({ error: "Resume not found" }, 404);

  const pdf = await renderResumePdf(profile, resume.content);
  return new Response(new Uint8Array(pdf), {
    headers: { ...corsHeaders, "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${resumeFileName(profile)}"` },
  });
}
