"use client";

import { MousePointerClick, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { startOneClickApply } from "@/app/actions";
import { Button, cx } from "@/components/ui";

/**
 * Pick a resume version, then open the employer's form in a new tab. The CareerOS extension fills
 * it from the knowledge base and attaches the PDF; the user reviews and presses Submit themselves.
 */
export function OneClickApply({ jobId, company, versions, suggestedId }: { jobId: string; company: string; versions: { id: string; name: string }[]; suggestedId: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [resumeId, setResumeId] = useState(suggestedId ?? versions[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const go = () => {
    // Open the tab synchronously so pop-up blockers allow it, then point it at the form.
    const tab = window.open("about:blank", "_blank");
    start(async () => {
      const r = await startOneClickApply(jobId, resumeId);
      if (!r.ok) {
        tab?.close();
        return setError(r.error);
      }
      if (tab) tab.location.href = r.applyUrl;
      else window.location.href = r.applyUrl;
      setOpen(false);
      router.push(`/applications/${r.appId}`);
    });
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <MousePointerClick size={16} /> One-click apply
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-navy-950/40 p-4" role="dialog" aria-modal="true" aria-label={`Apply to ${company}`}>
          <div className="relative w-full max-w-md rounded-[4px] bg-surface p-7 shadow-2xl">
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4 text-muted hover:text-ink" aria-label="Close">
              <X size={18} />
            </button>
            <div className="eyebrow text-navy-700">One-click apply</div>
            <h2 className="mt-1 font-serif text-[26px] font-semibold text-navy-900">Apply to {company}</h2>
            <p className="mt-2 text-[14px] text-muted">Choose the resume to send. The suggested version matches this role best.</p>
            <div className="mt-4 grid gap-2">
              {versions.map(v => (
                <label key={v.id} className={cx("flex cursor-pointer items-center gap-3 rounded-[3px] border px-4 py-3 text-[14.5px]", resumeId === v.id ? "border-navy-800 bg-blue-50" : "border-line hover:bg-blue-50/50")}>
                  <input type="radio" name="resume" checked={resumeId === v.id} onChange={() => setResumeId(v.id)} className="accent-[var(--navy-800)]" />
                  <span className="flex-1 font-semibold text-ink">{v.name}</span>
                  {v.id === suggestedId && <span className="text-[12px] font-semibold text-green-600">Suggested</span>}
                </label>
              ))}
            </div>
            <ol className="mt-5 grid gap-1.5 rounded-[3px] bg-blue-50 px-4 py-3 text-[13.5px] text-ink-soft">
              <li>1. The employer&apos;s form opens in a new tab</li>
              <li>2. The CareerOS extension fills it and attaches your resume</li>
              <li>3. You review it and press Submit — CareerOS records it automatically</li>
            </ol>
            {error && <p className="mt-3 text-[13.5px] text-rose-600">{error}</p>}
            <Button className="mt-5 w-full" onClick={go} disabled={pending || !resumeId}>
              {pending ? "Preparing…" : "Open application form"}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
