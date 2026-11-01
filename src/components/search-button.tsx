"use client";

import { Check, Loader2, Sparkles, TriangleAlert, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, cx } from "@/components/ui";
import type { SearchRun, SourceStat } from "@/lib/types";

type Event =
  | { type: "plan"; sources: string[] }
  | { type: "source"; stat: SourceStat }
  | { type: "phase"; detail: string }
  | { type: "done"; run: SearchRun }
  | { type: "error"; message: string };

/** Runs a real search and shows each job board's result as it arrives. */
export function SearchButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sources, setSources] = useState<string[]>([]);
  const [stats, setStats] = useState<Record<string, SourceStat>>({});
  const [phase, setPhase] = useState<string | null>(null);
  const [run, setRun] = useState<SearchRun | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setOpen(true);
    setSources([]);
    setStats({});
    setPhase(null);
    setRun(null);
    setError(null);
    try {
      const res = await fetch("/api/search", { method: "POST" });
      if (!res.ok || !res.body) throw new Error(`Search failed (${res.status})`);
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines.filter(Boolean)) {
          const e = JSON.parse(line) as Event;
          if (e.type === "plan") setSources(e.sources);
          else if (e.type === "source") setStats(s => ({ ...s, [e.stat.label]: e.stat }));
          else if (e.type === "phase") setPhase(e.detail);
          else if (e.type === "done") setRun(e.run);
          else setError(e.message);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const finished = Boolean(run || error);
  const close = () => {
    setOpen(false);
    router.refresh();
  };
  const done = Object.keys(stats).length;
  const fetched = Object.values(stats).reduce((n, s) => n + s.fetched, 0);

  return (
    <>
      <Button onClick={start}>
        <Sparkles size={16} /> Search now
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-navy-950/40 p-4" role="dialog" aria-modal="true" aria-label="Job search progress">
          <div className="relative w-full max-w-lg rounded-[4px] bg-surface p-7 shadow-2xl">
            {finished && (
              <button onClick={close} className="absolute top-4 right-4 text-muted hover:text-ink" aria-label="Close">
                <X size={18} />
              </button>
            )}
            <div className="eyebrow text-navy-700">Job push</div>
            <h2 className="mt-1 font-serif text-[26px] font-semibold text-navy-900">
              {run ? `${run.added} new role${run.added === 1 ? "" : "s"} found` : error ? "Search failed" : `Searching ${sources.length || ""} job boards…`}
            </h2>
            <p className="mt-1 text-[14px] text-muted tabular-nums">
              {run
                ? `${run.fetched} fetched → ${run.matched} matched your filters${run.aiScored ? ` → ${run.aiScored} AI-scored` : ""}`
                : error ?? (phase || `${done} of ${sources.length} boards · ${fetched} roles so far`)}
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line-soft">
              <div className="h-full bg-navy-700 transition-[width] duration-300" style={{ width: `${run ? 100 : sources.length ? (done / sources.length) * 90 : 3}%` }} />
            </div>
            <ul className="mt-4 grid max-h-[46vh] gap-1.5 overflow-y-auto">
              {sources.map(label => {
                const s = stats[label];
                return (
                  <li key={label} className={cx("flex items-center gap-3 text-[14px]", s ? "text-ink" : "text-muted")}>
                    <span className="grid h-5 w-5 shrink-0 place-items-center">
                      {!s ? <Loader2 size={15} className="animate-spin text-navy-700" /> : s.error ? <TriangleAlert size={15} className="text-rose-600" /> : <Check size={15} className="text-green-600" />}
                    </span>
                    <span className="flex-1">{label.replace("/", " · ")}</span>
                    <span className={cx("tabular-nums", s?.error ? "text-[12.5px] text-rose-600" : "text-muted")}>
                      {s ? (s.error ? s.error.slice(0, 40) : `${s.fetched} roles · ${(s.ms / 1000).toFixed(1)}s`) : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
            {finished && (
              <Button className="mt-6 w-full" onClick={close}>
                {run?.added ? "Review new roles" : "Close"}
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
