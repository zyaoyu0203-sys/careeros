import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Badge, Card, EmptyState, PageHeader, formatDate } from "@/components/ui";
import { listApplications, listJobs, listResumes, listRuns } from "@/lib/data";
import { funnel, outcomesBySource, pct, performanceByResume, sourceHealth, weeklyApplications } from "@/lib/insights";
import { requireUserId } from "@/lib/session";

export const metadata: Metadata = { title: "Insights" };

const SOURCE_NAME: Record<string, string> = {
  greenhouse: "Greenhouse boards",
  lever: "Lever boards",
  ashby: "Ashby boards",
  google_jobs: "Google Jobs",
  manual: "Added by hand",
  other: "Logged elsewhere",
};

export default async function InsightsPage() {
  const userId = await requireUserId();
  const [jobs, apps, resumes, runs] = await Promise.all([listJobs(userId), listApplications(userId), listResumes(userId), listRuns(userId)]);

  if (jobs.length === 0 && apps.length === 0) {
    return (
      <>
        <PageHeader overline="Insights" title="Search insights" />
        <Card>
          <EmptyState title="Nothing to measure yet" body="Run a search and track a few applications — conversion, resume performance and source health appear here." />
        </Card>
      </>
    );
  }

  const steps = funnel(jobs, apps);
  const byResume = performanceByResume(apps, resumes);
  const bySource = outcomesBySource(jobs, apps);
  const health = sourceHealth(runs);
  const weekly = weeklyApplications(apps);
  const applied = steps[2].count;
  const interviews = steps[3].count;
  const offers = steps[4].count;
  const maxStep = Math.max(1, steps[0].count);
  const maxWeek = Math.max(1, ...weekly.map(w => w.count));

  return (
    <>
      <PageHeader
        overline="Insights"
        title="Search insights"
        description="How roles turn into applications and interviews, which resume versions work, and how reliable each job source is."
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Roles pushed" value={steps[0].count} note={`${runs.length} searches run`} />
        <Kpi label="Applications" value={applied} note={`${apps.filter(a => a.status === "preparing").length} more in preparation`} />
        <Kpi label="Interview rate" value={applied ? pct(interviews / applied) : "—"} note={`${interviews} reached assessment or interview`} />
        <Kpi label="Offers" value={offers} note={applied ? `${pct(offers / applied)} of applications` : ""} />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[7fr_5fr]">
        <Panel title="Conversion funnel" subtitle="Each step as a share of the step before it">
          <ol className="grid gap-3">
            {steps.map(step => (
              <li key={step.label} className="grid grid-cols-[150px_1fr] items-center gap-4 sm:grid-cols-[190px_1fr]">
                <span className="text-[14px] text-ink-soft">{step.label}</span>
                <span className="flex items-center gap-3">
                  <span
                    className="h-7 rounded-r-[4px] bg-navy-700"
                    style={{ width: `${Math.max(1.5, (step.count / maxStep) * 100)}%` }}
                    title={`${step.label}: ${step.count}`}
                  />
                  <span className="shrink-0 text-[14px] font-semibold text-ink tabular-nums">
                    {step.count}
                    {step.rateFromPrevious !== null && <span className="ml-1.5 font-normal text-muted">{pct(step.rateFromPrevious)}</span>}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel title="Applications per week" subtitle="Last 8 weeks">
          <div className="flex h-44 items-end gap-2 border-b border-line">
            {weekly.map(w => (
              <div key={w.weekStart} className="group flex h-full flex-1 flex-col justify-end" title={`Week of ${formatDate(w.weekStart)}: ${w.count}`}>
                <span className="mb-1 text-center text-[12px] font-semibold text-ink tabular-nums">{w.count || ""}</span>
                <span className="rounded-t-[4px] bg-navy-700 group-hover:bg-blue-600" style={{ height: `${(w.count / maxWeek) * 100}%`, minHeight: w.count ? 4 : 0 }} />
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex gap-2">
            {weekly.map((w, i) => (
              <span key={w.weekStart} className="flex-1 text-center text-[11.5px] text-muted">
                {i % 2 === 0 ? formatDate(w.weekStart) : ""}
              </span>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Interview rate by resume version" subtitle="Tailored drafts count toward the version they came from">
          <Table
            head={["Version", "Applied", "Interviews", "Rate"]}
            textColumns={[3]}
            rows={byResume.map(r => [
              <span key="n" className="font-semibold text-ink">{r.name}</span>,
              r.applied,
              r.interviews,
              <RateBar key="r" value={r.rate} empty={r.applied === 0} />,
            ])}
          />
        </Panel>
        <Panel title="Where interviews come from" subtitle="Roles pushed and applications by source">
          <Table
            head={["Source", "Pushed", "Applied", "Interviews"]}
            rows={bySource.map(s => [<span key="n" className="font-semibold text-ink">{SOURCE_NAME[s.source] ?? s.source}</span>, s.pushed, s.applied, s.interviews])}
          />
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="Source health" subtitle={`Across the last ${runs.length} searches · least reliable first`}>
          {health.length ? (
            <Table
              head={["Board", "Runs", "Success", "Avg roles", "Avg time", "Last error"]}
              textColumns={[5]}
              rows={health.map(h => [
                <span key="n" className="font-semibold text-ink">{h.label}</span>,
                h.runs,
                <Badge key="s" tone={h.successRate === 1 ? "green" : h.successRate >= 0.9 ? "amber" : "rose"}>
                  {pct(h.successRate)}
                </Badge>,
                h.avgFetched,
                `${h.avgMs} ms`,
                <span key="e" className="text-[13px] text-muted">{h.lastError ?? "—"}</span>,
              ])}
            />
          ) : (
            <p className="text-[14px] text-muted">No searches recorded yet.</p>
          )}
        </Panel>
      </div>
    </>
  );
}

function Kpi({ label, value, note }: { label: string; value: ReactNode; note: string }) {
  return (
    <Card className="px-5 py-4">
      <div className="eyebrow text-muted">{label}</div>
      <div className="mt-1 font-serif text-[36px] leading-none font-semibold text-navy-900 tabular-nums">{value}</div>
      <div className="mt-2 text-[13px] text-muted">{note}</div>
    </Card>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-[17px] font-semibold text-navy-900">{title}</h2>
      <p className="mb-5 text-[13px] text-muted">{subtitle}</p>
      {children}
    </Card>
  );
}

function RateBar({ value, empty }: { value: number; empty: boolean }) {
  if (empty) return <span className="text-muted">—</span>;
  return (
    <span className="flex items-center gap-2">
      <span className="h-2 w-20 overflow-hidden rounded-full bg-line-soft">
        <span className="block h-full rounded-full bg-navy-700" style={{ width: `${value * 100}%` }} />
      </span>
      <span className="font-semibold text-ink tabular-nums">{pct(value)}</span>
    </span>
  );
}

/** First column is the label; the rest are numbers (right-aligned) unless `textColumns` says otherwise. */
function Table({ head, rows, textColumns = [] }: { head: string[]; rows: ReactNode[][]; textColumns?: number[] }) {
  const align = (i: number) => (i > 0 && !textColumns.includes(i) ? "text-right" : "");
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-left text-[14px]">
        <thead>
          <tr className="border-b border-line text-[12px] tracking-[0.06em] text-muted uppercase">
            {head.map((h, i) => (
              <th key={h} className={`px-3 py-2 font-semibold first:pl-0 ${align(i)}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r} className="border-b border-line-soft last:border-b-0">
              {row.map((cell, i) => (
                <td key={i} className={`px-3 py-2.5 text-ink-soft tabular-nums first:pl-0 ${align(i)}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
