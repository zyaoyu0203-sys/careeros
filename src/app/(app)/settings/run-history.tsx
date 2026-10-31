import { Badge, Card, formatDate } from "@/components/ui";
import type { SearchRun } from "@/lib/types";

const seconds = (run: SearchRun) => ((new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()) / 1000).toFixed(1);

/** Observability for the discovery pipeline: what each run fetched, from where, and what failed. */
export function RunHistory({ runs }: { runs: SearchRun[] }) {
  return (
    <Card className="mt-8 max-w-4xl overflow-hidden">
      <div className="border-b border-line px-6 py-4">
        <h2 className="text-[17px] font-semibold text-navy-900">Search history</h2>
        <p className="text-[13.5px] text-muted">Every run of the job search, scheduled or manual, with per-source results.</p>
      </div>
      {runs.length === 0 ? (
        <p className="px-6 py-8 text-[14px] text-muted">No searches yet.</p>
      ) : (
        <ul>
          {runs.map(run => {
            const failed = run.sources.filter(s => s.error);
            return (
              <li key={run.id} className="border-b border-line-soft last:border-b-0">
                <details className="group">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 px-6 py-3.5 hover:bg-blue-50/60">
                    <span className="w-40 text-[14px] font-semibold text-ink">
                      {formatDate(run.startedAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <Badge tone={run.trigger === "schedule" ? "navy" : "neutral"}>{run.trigger === "schedule" ? "Scheduled" : "Manual"}</Badge>
                    <span className="text-[14px] text-ink-soft tabular-nums">
                      {run.fetched} fetched → {run.matched} matched → <b className="text-ink">{run.added} new</b>
                    </span>
                    <span className="text-[13px] text-muted tabular-nums">{seconds(run)}s</span>
                    <span className="ml-auto flex gap-1.5">
                      {run.aiScored > 0 && <Badge tone="green">{run.aiScored} AI-scored</Badge>}
                      {run.aiError && <Badge tone="rose">AI scoring failed</Badge>}
                      {failed.length > 0 && <Badge tone="amber">{failed.length} source error{failed.length > 1 ? "s" : ""}</Badge>}
                    </span>
                  </summary>
                  <div className="bg-bg/60 px-6 pt-1 pb-4">
                    <table className="w-full text-left text-[13.5px]">
                      <thead className="text-[12px] tracking-[0.06em] text-muted uppercase">
                        <tr>
                          <th className="py-2 font-semibold">Source</th>
                          <th className="py-2 text-right font-semibold">Fetched</th>
                          <th className="py-2 text-right font-semibold">Time</th>
                          <th className="py-2 pl-6 font-semibold">Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {run.sources.map(s => (
                          <tr key={s.label} className="border-t border-line-soft">
                            <td className="py-1.5 text-ink">{s.label}</td>
                            <td className="py-1.5 text-right tabular-nums">{s.fetched}</td>
                            <td className="py-1.5 text-right text-muted tabular-nums">{s.ms} ms</td>
                            <td className={`py-1.5 pl-6 ${s.error ? "text-rose-600" : "text-green-600"}`}>{s.error ?? "OK"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {run.aiError && <p className="mt-3 rounded-[3px] bg-rose-100 px-3 py-2 text-[13px] text-rose-600">AI scoring: {run.aiError}</p>}
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
