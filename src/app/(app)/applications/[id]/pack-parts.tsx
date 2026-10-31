"use client";

import { Check, Copy, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { generateCoverLetter, updateApplication } from "@/app/actions";
import { Button, Select, Textarea } from "@/components/ui";

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[3px] border border-line px-2.5 text-[12.5px] font-semibold text-navy-800 hover:bg-blue-50"
      aria-label={`Copy ${label}`}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function ResumePicker({ appId, value, options }: { appId: string; value: string | null; options: { id: string; label: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Select
      aria-label="Resume for this application"
      value={value ?? ""}
      disabled={pending}
      onChange={e =>
        start(async () => {
          await updateApplication(appId, { resumeId: e.target.value || null });
          router.refresh();
        })
      }
    >
      {options.map(o => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}

export function CoverLetterEditor({ appId, initial, canGenerate }: { appId: string; initial: string; canGenerate: boolean }) {
  const router = useRouter();
  const [text, setText] = useState(initial);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="grid gap-3">
      <Textarea value={text} onChange={e => setText(e.target.value)} className="min-h-56" placeholder="Optional. Many applications don't need one." />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={pending || text === initial}
          onClick={() =>
            start(async () => {
              const r = await updateApplication(appId, { coverLetter: text });
              setStatus(r.ok ? "Saved" : r.error);
            })
          }
        >
          Save letter
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending || !canGenerate}
          title={canGenerate ? undefined : "Needs a saved job description and the AI service"}
          onClick={() =>
            start(async () => {
              const r = await generateCoverLetter(appId);
              setStatus(r.ok ? "Draft written — review before using" : r.error);
              router.refresh();
            })
          }
        >
          <Sparkles size={14} /> {pending ? "Working…" : text ? "Rewrite with AI" : "Draft with AI"}
        </Button>
        {text && <CopyButton text={text} label="cover letter" />}
        {status && <span className="text-[13px] text-muted">{status}</span>}
      </div>
    </div>
  );
}

export function NotesEditor({ appId, initial }: { appId: string; initial: string }) {
  const [text, setText] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div className="grid gap-2">
      <Textarea value={text} onChange={e => (setText(e.target.value), setSaved(false))} placeholder="Recruiter name, referral, interview dates…" />
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="justify-self-start"
        disabled={pending || text === initial}
        onClick={() =>
          start(async () => {
            await updateApplication(appId, { notes: text });
            setSaved(true);
          })
        }
      >
        {saved ? "Saved" : "Save notes"}
      </Button>
    </div>
  );
}

export function MarkSubmitted({ appId }: { appId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await updateApplication(appId, { status: "applied" });
          router.refresh();
        })
      }
    >
      <Check size={16} /> {pending ? "Saving…" : "I've submitted it"}
    </Button>
  );
}
