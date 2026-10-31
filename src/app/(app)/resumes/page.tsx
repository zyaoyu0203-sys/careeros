import { CheckCircle2, Plus, Printer, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { approveResume, deleteResume } from "@/app/actions";
import { ResumeDocument } from "@/components/resume-document";
import { Badge, Button, EmptyState, LinkButton, PageHeader, buttonClass, cx, relativeDays } from "@/components/ui";
import { getProfile, listJobs, listResumes } from "@/lib/data";
import { requireUserId } from "@/lib/session";
import { VersionForm } from "./version-form";

export const metadata: Metadata = { title: "Resumes" };

export default async function ResumesPage({ searchParams }: { searchParams: Promise<{ id?: string; new?: string }> }) {
  const params = await searchParams;
  const userId = await requireUserId();
  const [profile, resumes, jobs] = await Promise.all([getProfile(userId), listResumes(userId), listJobs(userId)]);
  const creating = params.new === "1";
  const selected = creating ? undefined : (resumes.find(r => r.id === params.id) ?? resumes[0]);
  const versions = resumes.filter(r => r.kind === "version");
  const tailored = resumes.filter(r => r.kind === "tailored");
  const job = selected?.jobId ? jobs.find(j => j.id === selected.jobId) : undefined;

  return (
    <>
      <PageHeader
        overline="Resume studio"
        title="Resumes"
        description="Versions are built from your knowledge base and chosen for each job automatically. Tailored drafts are rewritten for one job and need your approval."
        actions={
          <LinkButton href="/resumes?new=1">
            <Plus size={16} /> New version
          </LinkButton>
        }
      />

      <div className="grid overflow-hidden rounded-[4px] border border-navy-900 bg-surface lg:grid-cols-[280px_1fr_300px]">
        <nav className="border-b border-line lg:border-r lg:border-b-0" aria-label="Resumes">
          <ListGroup title="Versions" items={versions.map(r => ({ id: r.id, title: r.name, meta: r.focus.slice(0, 3).join(", ") || "General", pending: false }))} activeId={selected?.id} />
          <ListGroup
            title="Tailored for a job"
            items={tailored.map(r => ({ id: r.id, title: r.name, meta: `${r.approved ? "Approved" : "Awaiting approval"} · ${relativeDays(r.createdAt)}`, pending: !r.approved }))}
            activeId={selected?.id}
            empty="Open a role on the Jobs page and choose “Tailor resume”."
          />
        </nav>

        <div className="min-w-0 bg-bg/60">
          {creating ? (
            <div className="p-6 sm:p-8">
              <h2 className="font-serif text-[24px] font-semibold text-navy-900">New resume version</h2>
              <p className="mt-1 mb-5 text-[14px] text-muted">A version is a curated selection from your knowledge base, aimed at one kind of role.</p>
              <VersionForm experiences={profile.experiences} />
            </div>
          ) : selected ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-5 py-3">
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-semibold text-ink">{selected.name}</div>
                  <div className="text-[13px] text-muted">{job ? `Tailored for ${job.title} at ${job.company}` : `Updated ${relativeDays(selected.updatedAt).toLowerCase()}`}</div>
                </div>
                <Link href={`/print/resume/${selected.id}`} target="_blank" className={buttonClass("secondary", "sm")}>
                  <Printer size={15} /> Print / save PDF
                </Link>
              </div>
              <div className="p-4 sm:p-8">
                <div className="mx-auto max-w-[760px] bg-white px-8 py-10 shadow-[0_8px_30px_rgba(11,37,69,0.10)] ring-1 ring-line sm:px-12">
                  <ResumeDocument profile={profile} content={selected.content} />
                </div>
              </div>
            </>
          ) : (
            <EmptyState title="No resumes yet" body="Create a version from your knowledge base to get started." />
          )}
        </div>

        <aside className="border-t border-line p-5 lg:border-t-0 lg:border-l">
          {selected?.kind === "tailored" ? (
            <div className="grid gap-4">
              <h3 className="text-[16px] font-semibold text-navy-900">Review this draft</h3>
              {selected.approved ? (
                <Badge tone="green" className="justify-self-start">
                  <CheckCircle2 size={13} /> Approved — used in its application pack
                </Badge>
              ) : (
                <>
                  <p className="text-[14px] text-ink-soft">
                    Every line comes from your knowledge base. Check the wording reads like you and nothing overstates what you did, then approve it.
                  </p>
                  <form action={approveResume.bind(null, selected.id)}>
                    <Button className="w-full">
                      <CheckCircle2 size={16} /> Approve draft
                    </Button>
                  </form>
                </>
              )}
              {job && (
                <LinkButton href={`/jobs?id=${job.id}`} variant="secondary">
                  Back to the role
                </LinkButton>
              )}
              <form action={deleteResume.bind(null, selected.id)}>
                <Button variant="danger" size="sm">
                  <Trash2 size={14} /> Delete draft
                </Button>
              </form>
            </div>
          ) : selected ? (
            <div className="grid gap-4">
              <h3 className="text-[16px] font-semibold text-navy-900">Edit version</h3>
              <VersionForm key={selected.id} resume={selected} experiences={profile.experiences} />
              {versions.length > 1 && (
                <form action={deleteResume.bind(null, selected.id)} className="border-t border-line pt-4">
                  <Button variant="danger" size="sm">
                    <Trash2 size={14} /> Delete version
                  </Button>
                </form>
              )}
            </div>
          ) : (
            <p className="text-[14px] text-muted">Pick the experiences and role keywords for this version.</p>
          )}
        </aside>
      </div>
    </>
  );
}

function ListGroup({ title, items, activeId, empty }: { title: string; items: { id: string; title: string; meta: string; pending: boolean }[]; activeId?: string; empty?: string }) {
  return (
    <div className="py-3">
      <div className="eyebrow px-5 pb-2 text-muted">{title}</div>
      {items.length === 0 && empty && <p className="px-5 text-[13px] text-muted">{empty}</p>}
      {items.map(item => (
        <Link
          key={item.id}
          href={`/resumes?id=${item.id}`}
          aria-current={item.id === activeId}
          className={cx("flex items-start gap-2 px-5 py-2.5 hover:bg-blue-50", item.id === activeId && "bg-blue-50 shadow-[inset_4px_0_0_var(--navy-800)]")}
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-semibold text-ink">{item.title}</span>
            <span className="block truncate text-[12.5px] text-muted">{item.meta}</span>
          </span>
          {item.pending && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-label="Awaiting approval" />}
        </Link>
      ))}
    </div>
  );
}
