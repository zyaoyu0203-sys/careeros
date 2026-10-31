import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResumeDocument } from "@/components/resume-document";
import { getProfile } from "@/lib/data";
import { requireUserId } from "@/lib/session";
import { store } from "@/lib/store";
import { PrintButton } from "./print-button";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const userId = await requireUserId();
  const [profile, resume] = await Promise.all([getProfile(userId), store().get(userId, "resumes", (await params).id)]);
  // The title becomes the default PDF file name.
  return { title: { absolute: `${profile.fullName} — Resume${resume?.kind === "tailored" ? ` — ${resume.name}` : ""}` } };
}

export default async function PrintResumePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await requireUserId();
  const [profile, resume] = await Promise.all([getProfile(userId), store().get(userId, "resumes", id)]);
  if (!resume) notFound();
  return (
    <div className="min-h-screen bg-bg py-8 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] items-center justify-between px-2">
        <span className="text-[14px] text-muted">Use your browser&apos;s “Save as PDF” to get a file you can upload.</span>
        <PrintButton />
      </div>
      <div className="mx-auto min-h-[297mm] w-full max-w-[210mm] bg-white px-[16mm] py-[14mm] shadow-[0_8px_30px_rgba(11,37,69,0.10)] print:shadow-none">
        <ResumeDocument profile={profile} content={resume.content} />
      </div>
      <style>{`@page { size: A4; margin: 0; }`}</style>
    </div>
  );
}
