import { getProfile } from "@/lib/data";
import { renderResumePdf, resumeFileName } from "@/lib/resume-pdf";
import { requireUserId } from "@/lib/session";
import { store } from "@/lib/store";

/** Download a resume as PDF from inside the app (signed-in session). */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const { id } = await params;
  const [resume, profile] = await Promise.all([store().get(userId, "resumes", id), getProfile(userId)]);
  if (!resume) return new Response("Not found", { status: 404 });
  const pdf = await renderResumePdf(profile, resume.content);
  return new Response(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${resumeFileName(profile)}"` },
  });
}
