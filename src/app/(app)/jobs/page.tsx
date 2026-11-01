import { Bookmark, ExternalLink, EyeOff, FileText, Plus, Send, ShieldAlert, Sparkles, ThumbsUp, Undo2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { prepareApplication, setJobStatus, tailorForJob } from "@/app/actions";
import { ActionButton } from "@/components/action-button";
import { OneClickApply } from "@/components/one-click-apply";
import { SearchButton } from "@/components/search-button";
import { Badge, Button, Card, CompanyMark, EmptyState, LinkButton, PageHeader, ScorePill, buttonClass, cx, formatDate, relativeDays } from "@/components/ui";
import { aiAvailable } from "@/lib/ai/llm";
import { getPreferences, listJobs, listResumes } from "@/lib/data";
import { requireUserId } from "@/lib/session";
import type { Job, JobStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Jobs" };

const VIEWS: { key: JobStatus | "all"; label: string }[] = [
  { key: "new", label: "New" },
  { key: "saved", label: "Saved" },
  { key: "applying", label: "Applying" },
  { key: "dismissed", label: "Dismissed" },
  { key: "all", label: "All" },
];

const SOURCE_LABEL: Record<Job["source"], string> = {
  greenhouse: "Greenhouse",
  lever: "Lever",
  ashby: "Ashby",
  google_jobs: "Google Jobs",
  manual: "Added by you",
};

export default async function JobsPage({ searchParams }: { searchParams: Promise<{ view?: string; id?: string; q?: string }> }) {
  const params = await searchParams;
  const userId = await requireUserId();
  const [jobs, resumes, prefs] = await Promise.all([listJobs(userId), listResumes(userId), getPreferences(userId)]);
  const view = (VIEWS.find(v => v.key === params.view)?.key ?? "new") as JobStatus | "all";
  const q = (params.q ?? "").trim().toLowerCase();

  const visible = jobs
    .filter(j => (view === "all" ? j.status !== "dismissed" : j.status === view))
    .filter(j => !q || `${j.title} ${j.company} ${j.location}`.toLowerCase().includes(q));
  const selected = visible.find(j => j.id === params.id) ?? jobs.find(j => j.id === params.id) ?? visible[0];
  const counts = Object.fromEntries(VIEWS.map(v => [v.key, v.key === "all" ? jobs.filter(j => j.status !== "dismissed").length : jobs.filter(j => j.status === v.key).length]));
  const href = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams({ view, ...(q ? { q } : {}), ...(selected ? { id: selected.id } : {}) });
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) next.delete(k);
      else next.set(k, v);
    }
    return `/jobs?${next}`;
  };

  return (
    <>
      <PageHeader
        overline="Job push"
        title="Jobs"
        description={
          prefs.lastRunAt
            ? `Last search ${relativeDays(prefs.lastRunAt).toLowerCase()} — ${prefs.lastRunSummary}. Next run: ${prefs.frequency === "manual" ? "when you ask" : prefs.frequency}.`
            : "Roles from your chosen sources, filtered by your preferences and ranked by fit."
        }
        actions={
          <>
            <LinkButton href="/jobs/new" variant="secondary">
              <Plus size={16} /> Add a job
            </LinkButton>
            <SearchButton />
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Job status">
          {VIEWS.map(v => (
            <Link
              key={v.key}
              href={`/jobs?view=${v.key}`}
              role="tab"
              aria-selected={view === v.key}
              className={cx(
                "inline-flex h-9 items-center gap-2 rounded-[3px] border px-3.5 text-[14px] font-semibold",
                view === v.key ? "border-navy-800 bg-navy-800 text-white" : "border-line bg-surface text-ink-soft hover:bg-blue-50",
              )}
            >
              {v.label}
              <span className={cx("text-[12px] tabular-nums", view === v.key ? "text-white/70" : "text-muted")}>{counts[v.key]}</span>
            </Link>
          ))}
        </div>
        <form action="/jobs" className="flex gap-2">
          <input type="hidden" name="view" value={view} />
          <input
            name="q"
            defaultValue={params.q}
            placeholder="Filter by title, company, location"
            className="h-9 w-full rounded-[3px] border border-line bg-surface px-3 text-[14px] md:w-72 focus:border-blue-500 focus:outline-none"
          />
          <Button variant="secondary" size="sm" className="h-9">
            Filter
          </Button>
        </form>
      </div>

      {visible.length === 0 && !selected ? (
        <Card>
          <EmptyState
            title={view === "new" ? "No new roles right now" : `Nothing in ${VIEWS.find(v => v.key === view)?.label.toLowerCase()}`}
            body={
              view === "new"
                ? "Run a search, add more sources, or broaden your target roles. Roles you found yourself can be added by hand."
                : "Roles you act on appear here."
            }
            action={
              <LinkButton href="/settings" variant="secondary">
                Edit job sources
              </LinkButton>
            }
          />
        </Card>
      ) : (
        <div className="grid overflow-hidden rounded-[4px] border border-navy-900 bg-surface lg:grid-cols-[minmax(320px,5fr)_7fr]">
          <ul className="max-h-[78vh] overflow-y-auto border-b border-navy-900 lg:border-r lg:border-b-0">
            {visible.map(job => (
              <li key={job.id}>
                <Link
                  href={href({ id: job.id })}
                  scroll={false}
                  aria-current={job.id === selected?.id}
                  className={cx(
                    "flex gap-3.5 border-b border-line-soft px-5 py-4 hover:bg-blue-50",
                    job.id === selected?.id && "bg-blue-50 shadow-[inset_4px_0_0_var(--navy-800)]",
                  )}
                >
                  <CompanyMark name={job.company} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-navy-700">{job.company}</span>
                    <span className="block text-[15px] leading-snug font-semibold text-ink">{job.title}</span>
                    <span className="mt-0.5 block truncate text-[13px] text-muted">
                      {job.location || "Location not listed"} · {SOURCE_LABEL[job.source]}
                    </span>
                    <span className="mt-2 flex flex-wrap gap-1.5">
                      <ScorePill score={job.score} scoredBy={job.scoredBy} />
                      {job.risks.length > 0 && <Badge tone="amber">{job.risks.length} risk{job.risks.length > 1 ? "s" : ""}</Badge>}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {selected ? <JobDetail versions={resumes.filter(r => r.kind === "version").map(r => ({ id: r.id, name: r.name }))} job={selected} resumeName={resumes.find(r => r.id === selected.suggestedResumeId)?.name} hasTailored={resumes.some(r => r.jobId === selected.id)} tailoredId={resumes.find(r => r.jobId === selected.id)?.id} /> : <div />}
        </div>
      )}
    </>
  );
}

function JobDetail({ job, versions, resumeName, hasTailored, tailoredId }: { job: Job; versions: { id: string; name: string }[]; resumeName?: string; hasTailored: boolean; tailoredId?: string }) {
  const ai = aiAvailable();
  return (
    <article className="max-h-[78vh] overflow-y-auto px-6 py-6 sm:px-8">
      <div className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="eyebrow text-navy-700">{job.company}</div>
          <h2 className="mt-1 font-serif text-[28px] leading-tight font-semibold text-navy-900">{job.title}</h2>
          <p className="mt-1 text-[14px] text-muted">
            {job.location || "Location not listed"} · {SOURCE_LABEL[job.source]}
            {job.postedAt ? ` · posted ${/^\d{4}-/.test(job.postedAt) ? formatDate(job.postedAt) : job.postedAt}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {job.status === "dismissed" || job.status === "saved" ? (
            <form action={setJobStatus.bind(null, job.id, "new")}>
              <Button variant="ghost" size="sm">
                <Undo2 size={15} /> Move to new
              </Button>
            </form>
          ) : (
            <form action={setJobStatus.bind(null, job.id, "saved")}>
              <Button variant="secondary" size="sm">
                <Bookmark size={15} /> Save
              </Button>
            </form>
          )}
          {job.status !== "dismissed" && (
            <form action={setJobStatus.bind(null, job.id, "dismissed")}>
              <Button variant="ghost" size="sm">
                <EyeOff size={15} /> Dismiss
              </Button>
            </form>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Fact label="Fit">
          <ScorePill score={job.score} scoredBy={job.scoredBy} />
        </Fact>
        <Fact label="Suggested resume">{resumeName ?? "General"}</Fact>
        <Fact label="Found">{relativeDays(job.fetchedAt)}</Fact>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <section className="rounded-[4px] border border-green-600/25 bg-green-100/50 p-4">
          <h3 className="flex items-center gap-2 text-[14.5px] font-semibold text-green-600">
            <ThumbsUp size={16} /> Why it fits
          </h3>
          <ul className="mt-2 grid gap-1.5 text-[14px] text-ink-soft">
            {job.fit.length ? job.fit.map(f => <li key={f}>• {f}</li>) : <li className="text-muted">No specific signals found.</li>}
          </ul>
        </section>
        <section className="rounded-[4px] border border-amber-500/30 bg-amber-100/50 p-4">
          <h3 className="flex items-center gap-2 text-[14.5px] font-semibold text-[#8a5a10]">
            <ShieldAlert size={16} /> Check before applying
          </h3>
          <ul className="mt-2 grid gap-1.5 text-[14px] text-ink-soft">
            {job.risks.length ? job.risks.map(r => <li key={r}>• {r}</li>) : <li className="text-muted">No eligibility risks detected.</li>}
          </ul>
        </section>
      </div>

      <div className="mt-6 flex flex-wrap items-start gap-2 rounded-[4px] border border-navy-900 bg-blue-50 p-4">
        {job.url && job.status !== "applying" && <OneClickApply jobId={job.id} company={job.company} versions={versions} suggestedId={job.suggestedResumeId} />}
        <form action={prepareApplication.bind(null, job.id)}>
          <Button variant={job.url && job.status !== "applying" ? "secondary" : "primary"}>
            <Send size={16} /> {job.status === "applying" ? "Open application pack" : "Prepare application"}
          </Button>
        </form>
        {hasTailored ? (
          <LinkButton href={`/resumes?id=${tailoredId}`} variant="secondary">
            <FileText size={16} /> View tailored resume
          </LinkButton>
        ) : ai ? (
          <ActionButton action={tailorForJob.bind(null, job.id)} pendingLabel="Tailoring resume…" variant="secondary" successHrefPrefix="/resumes?id=">
            <Sparkles size={16} /> Tailor resume
          </ActionButton>
        ) : (
          <Button variant="secondary" disabled title="Available once the AI service key is configured">
            <Sparkles size={16} /> Tailor resume
          </Button>
        )}
        {job.url && (
          <a href={job.url} target="_blank" rel="noreferrer" className={buttonClass("ghost")}>
            <ExternalLink size={16} /> Original posting
          </a>
        )}
      </div>

      <section className="mt-7">
        <h3 className="text-[16px] font-semibold text-navy-900">Job description</h3>
        <div className="mt-2 text-[14.5px] leading-relaxed whitespace-pre-line text-ink-soft">{job.description || "No description was provided by the source."}</div>
      </section>
    </article>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[4px] border border-line px-4 py-3">
      <div className="eyebrow text-muted">{label}</div>
      <div className="mt-1 text-[14.5px] font-semibold text-ink">{children}</div>
    </div>
  );
}
