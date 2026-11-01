import { AlertTriangle, ExternalLink, Printer, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { deleteApplication } from "@/app/actions";
import { Badge, Button, Card, LinkButton, PageHeader, buttonClass, formatDate } from "@/components/ui";
import { aiAvailable } from "@/lib/ai/claude";
import { getProfile, listResumes } from "@/lib/data";
import { requireUserId } from "@/lib/session";
import { statusMeta } from "@/lib/status";
import { store } from "@/lib/store";
import { StatusSelect } from "../status-select";
import { CopyButton, CoverLetterEditor, MarkSubmitted, NotesEditor, ResumePicker } from "./pack-parts";

export const metadata: Metadata = { title: "Application pack" };

export default async function ApplicationPackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await requireUserId();
  const db = store();
  const app = await db.get(userId, "applications", id);
  if (!app) notFound();
  const [profile, resumes, job] = await Promise.all([getProfile(userId), listResumes(userId), app.jobId ? db.get(userId, "jobs", app.jobId) : null]);

  const usable = resumes.filter(r => r.approved && (r.kind === "version" || r.jobId === app.jobId));
  const draft = resumes.find(r => r.kind === "tailored" && r.jobId === app.jobId && !r.approved);
  const resume = resumes.find(r => r.id === app.resumeId);
  const a = profile.answers;
  const yesNo = (v: string) => ({ yes: "Yes", no: "No", depends: "Depends on the role" })[v] ?? "";

  const answers: [string, string][] = [
    ["Full name", profile.fullName],
    ["Email", profile.email],
    ["Phone", profile.phone],
    ["LinkedIn", profile.linkedin],
    ["Location", profile.location],
    ["Work authorisation", a.workAuthorization],
    ["Requires visa sponsorship", yesNo(a.needsSponsorship)],
    ["Visa status", a.visaStatus],
    ["Earliest start date", a.earliestStart],
    ["Availability", a.availability],
    ["Expected salary", a.expectedSalary],
    ["Notice period", a.noticePeriod],
    ["Willing to relocate", yesNo(a.willingToRelocate)],
    ...a.custom.map(c => [c.question, c.answer] as [string, string]),
  ];
  const filled = answers.filter(([, v]) => v);
  const missing = answers.filter(([, v]) => !v).map(([k]) => k);

  return (
    <>
      <PageHeader
        overline={`Application pack · ${statusMeta(app.status).label}`}
        title={`${app.title}`}
        description={`${app.company}${job?.location ? ` · ${job.location}` : ""}`}
        actions={
          <LinkButton href="/applications" variant="ghost">
            All applications
          </LinkButton>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-5">
          <Step n={1} title="Resume" done={Boolean(resume)}>
            {draft && (
              <div className="mb-3 flex items-start gap-2 rounded-[3px] bg-amber-100 px-3 py-2.5 text-[14px] text-[#8a5a10]">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>
                  A tailored draft for this role is waiting for approval.{" "}
                  <Link href={`/resumes?id=${draft.id}`} className="font-semibold underline">
                    Review it
                  </Link>{" "}
                  to use it here.
                </span>
              </div>
            )}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex-1">
                <ResumePicker
                  appId={app.id}
                  value={app.resumeId}
                  options={usable.map(r => ({ id: r.id, label: r.kind === "tailored" ? `Tailored: ${r.name}` : `Version: ${r.name}` }))}
                />
              </div>
              {resume && (
                <a href={`/api/resumes/${resume.id}/pdf`} target="_blank" rel="noreferrer" className={buttonClass("secondary")}>
                  <Printer size={16} /> Open PDF
                </a>
              )}
            </div>
            <p className="mt-2 text-[13px] text-muted">Open the PDF, save it, and upload it on the application form.</p>
          </Step>

          <Step n={2} title="Form answers" done={missing.length === 0}>
            <p className="mb-3 text-[14px] text-muted">From your knowledge base. Copy each answer into the application form.</p>
            <dl className="divide-y divide-line-soft rounded-[4px] border border-line">
              {filled.map(([label, value]) => (
                <div key={label} className="flex items-start gap-3 px-4 py-2.5">
                  <dt className="w-44 shrink-0 text-[13px] font-semibold text-muted">{label}</dt>
                  <dd className="min-w-0 flex-1 text-[14px] break-words text-ink">{value}</dd>
                  <CopyButton text={value} label={label} />
                </div>
              ))}
            </dl>
            {missing.length > 0 && (
              <p className="mt-2 text-[13px] text-muted">
                Not in your knowledge base yet: {missing.join(", ")}.{" "}
                <Link href="/profile#answers" className="font-semibold text-navy-700 underline">
                  Add them
                </Link>
              </p>
            )}
          </Step>

          <Step n={3} title="Cover letter (optional)" done={Boolean(app.coverLetter)}>
            <CoverLetterEditor appId={app.id} initial={app.coverLetter} canGenerate={aiAvailable() && Boolean(job)} />
          </Step>

          <Step n={4} title="Submit on the employer's site" done={app.status !== "preparing"}>
            <p className="mb-3 text-[14px] text-ink-soft">
              CareerOS never submits for you. With the browser extension, the form is filled and your resume attached automatically; you review it and press Submit, and the application is recorded here. Without it, copy the answers above and record it yourself.
            </p>
            <div className="flex flex-wrap gap-2">
              {app.url && (
                <a href={`${app.url.replace(/#.*$/, "")}#careeros-app=${app.id}`} target="_blank" rel="noreferrer" className={buttonClass("secondary")}>
                  <ExternalLink size={16} /> Open application page
                </a>
              )}
              {app.status === "preparing" ? <MarkSubmitted appId={app.id} /> : <Badge tone="green">Submitted {formatDate(app.appliedAt)}</Badge>}
            </div>
          </Step>
        </div>

        <aside className="grid content-start gap-5">
          <Card className="p-5">
            <h2 className="text-[16px] font-semibold text-navy-900">Status</h2>
            <div className="mt-3">
              <StatusSelect id={app.id} value={app.status} label="Application status" />
            </div>
            <ol className="mt-4 grid gap-2.5 border-l-2 border-line pl-4">
              {[...app.history].reverse().map(h => (
                <li key={`${h.status}-${h.at}`} className="relative text-[13.5px]">
                  <span className="absolute top-1.5 -left-[21px] h-2 w-2 rounded-full bg-navy-700" />
                  <span className="font-semibold text-ink">{statusMeta(h.status).label}</span>
                  <span className="text-muted"> · {formatDate(h.at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                </li>
              ))}
            </ol>
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 text-[16px] font-semibold text-navy-900">Notes</h2>
            <NotesEditor appId={app.id} initial={app.notes} />
          </Card>
          {job && (
            <LinkButton href={`/jobs?id=${job.id}&view=all`} variant="secondary">
              View job description
            </LinkButton>
          )}
          <form action={deleteApplication.bind(null, app.id)}>
            <Button variant="danger" size="sm">
              <Trash2 size={14} /> Delete application
            </Button>
          </form>
        </aside>
      </div>
    </>
  );
}

function Step({ n, title, done, children }: { n: number; title: string; done: boolean; children: ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="mb-4 flex items-center gap-3 text-[17px] font-semibold text-navy-900">
        <span className={`grid h-7 w-7 place-items-center rounded-full text-[13px] font-bold ${done ? "bg-green-600 text-white" : "bg-navy-900 text-white"}`}>{done ? "✓" : n}</span>
        {title}
      </h2>
      {children}
    </Card>
  );
}
