"use client";

// Scripted presentation flows for the demo account: an animated search and a one-click apply.
// Real accounts use the actual search and the application pack instead.

import { Check, Loader2, Send, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { demoOneClickApply, demoRevealBatch } from "@/app/actions";
import { Button, cx } from "@/components/ui";

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function Steps({ steps, done }: { steps: string[]; done: number }) {
  return (
    <ol className="mt-5 grid gap-2.5">
      {steps.map((s, i) => (
        <li key={s} className={cx("flex items-center gap-3 text-[14.5px]", i > done ? "text-muted/60" : "text-ink")}>
          <span className="grid h-6 w-6 shrink-0 place-items-center">
            {i < done ? <Check size={17} className="text-green-600" /> : i === done ? <Loader2 size={17} className="animate-spin text-navy-700" /> : <span className="h-2 w-2 rounded-full bg-line" />}
          </span>
          {s}
        </li>
      ))}
    </ol>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-navy-950/40 p-4">
      <div className="relative w-full max-w-lg rounded-[4px] bg-surface p-7 shadow-2xl">
        {onClose && (
          <button onClick={onClose} className="absolute top-4 right-4 text-muted hover:text-ink" aria-label="Close">
            <X size={18} />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

const SOURCES: [string, number][] = [
  ["Binance", 254], ["OKX", 376], ["Point72", 206], ["IMC Trading", 168], ["Jump Trading", 96], ["Schonfeld", 70],
  ["Flow Traders", 48], ["Tower Research", 97], ["Lalamove", 143], ["Crypto.com", 101], ["Animoca Brands", 10], ["Airwallex", 499],
];

export function DemoSearchButton({ durationSec = 24 }: { durationSec?: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const steps = [...SOURCES.map(([n, c]) => `Scanning ${n} — ${c} open roles`), "Filtering by role, location and seniority", "AI scoring against your knowledge base", "Routing each role to a resume version"];

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const per = (durationSec * 1000) / steps.length;
      for (let i = 0; i < steps.length && !cancelled; i++) {
        setDone(i);
        await sleep(per * (0.6 + Math.random() * 0.8));
      }
      const r = await demoRevealBatch();
      if (cancelled) return;
      setDone(steps.length);
      setResult(r.ok ? r.message ?? "" : r.error);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Button onClick={() => (setDone(0), setResult(null), setOpen(true))}>
        <Sparkles size={16} /> Search now
      </Button>
      {open && (
        <Modal onClose={result ? () => (setOpen(false), router.refresh()) : undefined}>
          <div className="eyebrow text-navy-700">Job push</div>
          <h2 className="mt-1 font-serif text-[26px] font-semibold text-navy-900">{result ? result : "Searching 12 job boards…"}</h2>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line-soft">
            <div className="h-full bg-navy-700 transition-[width] duration-700" style={{ width: `${(Math.min(done, steps.length) / steps.length) * 100}%` }} />
          </div>
          <div className="max-h-[50vh] overflow-y-auto">
            <Steps steps={steps} done={done} />
          </div>
          {result && (
            <Button className="mt-6 w-full" onClick={() => (setOpen(false), router.refresh())}>
              Review new roles
            </Button>
          )}
        </Modal>
      )}
    </>
  );
}

export function DemoOneClickApply({ jobId, company, versions, suggestedId }: { jobId: string; company: string; versions: { id: string; name: string }[]; suggestedId: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [resumeId, setResumeId] = useState(suggestedId ?? versions[0]?.id ?? "");
  const [phase, setPhase] = useState<"choose" | "running" | "done">("choose");
  const [done, setDone] = useState(0);
  const steps = ["Tailoring resume to the job description", "Generating PDF", `Opening ${company}'s application form`, "Filling 14 fields from your knowledge base", "Attaching resume", "Submitting application", "Confirmation received"];

  const run = async () => {
    setPhase("running");
    for (let i = 0; i < steps.length; i++) {
      setDone(i);
      await sleep(900 + Math.random() * 900);
    }
    await demoOneClickApply(jobId, resumeId);
    setDone(steps.length);
    setPhase("done");
  };

  return (
    <>
      <Button onClick={() => (setPhase("choose"), setDone(0), setOpen(true))}>
        <Send size={16} /> One-click apply
      </Button>
      {open && (
        <Modal onClose={phase === "running" ? undefined : () => (setOpen(false), router.refresh())}>
          <div className="eyebrow text-navy-700">One-click apply</div>
          <h2 className="mt-1 font-serif text-[26px] font-semibold text-navy-900">{phase === "done" ? "Application submitted" : `Apply to ${company}`}</h2>
          {phase === "choose" ? (
            <>
              <p className="mt-2 text-[14px] text-muted">Choose the resume version to send. The suggested one matches this role best.</p>
              <div className="mt-4 grid gap-2">
                {versions.map(v => (
                  <label key={v.id} className={cx("flex cursor-pointer items-center gap-3 rounded-[3px] border px-4 py-3 text-[14.5px]", resumeId === v.id ? "border-navy-800 bg-blue-50" : "border-line")}>
                    <input type="radio" name="resume" checked={resumeId === v.id} onChange={() => setResumeId(v.id)} className="accent-[var(--navy-800)]" />
                    <span className="flex-1 font-semibold text-ink">{v.name}</span>
                    {v.id === suggestedId && <span className="text-[12px] font-semibold text-green-600">Suggested</span>}
                  </label>
                ))}
              </div>
              <Button className="mt-6 w-full" onClick={run}>
                <Send size={16} /> Apply now
              </Button>
            </>
          ) : (
            <>
              <Steps steps={steps} done={done} />
              {phase === "done" && (
                <Button className="mt-6 w-full" onClick={() => (setOpen(false), router.push("/applications"), router.refresh())}>
                  View in tracker
                </Button>
              )}
            </>
          )}
        </Modal>
      )}
    </>
  );
}
