"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveResumeVersion } from "@/app/actions";
import { TagInput } from "@/components/fields";
import { Button, Input, Label } from "@/components/ui";
import type { Experience, Resume } from "@/lib/types";

export function VersionForm({ resume, experiences }: { resume?: Resume; experiences: Experience[] }) {
  const router = useRouter();
  const [name, setName] = useState(resume?.name ?? "");
  const [focus, setFocus] = useState(resume?.focus ?? []);
  const [selected, setSelected] = useState<string[]>(resume?.experienceIds.length ? resume.experienceIds : experiences.map(e => e.id));
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const toggle = (id: string) => setSelected(s => (s.includes(id) ? s.filter(x => x !== id) : [...experiences.map(e => e.id).filter(x => x === id || s.includes(x))]));

  return (
    <form
      className="grid gap-4"
      onSubmit={e => {
        e.preventDefault();
        start(async () => {
          const r = await saveResumeVersion({ id: resume?.id, name, focus, experienceIds: selected });
          if (!r.ok) return setMessage(r.error);
          setMessage("Saved");
          router.push(`/resumes?id=${r.message}`);
          router.refresh();
        });
      }}
    >
      <Label label="Version name">
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="AI Product" required />
      </Label>
      <TagInput label="Use for roles mentioning" hint="Jobs are routed to the version whose words best match the title and description." value={focus} onChange={setFocus} placeholder="Product, AI…" />
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-[13px] font-semibold text-ink-soft">Experiences to include</legend>
        {experiences.map(exp => (
          <label key={exp.id} className="flex items-start gap-2.5 text-[14px]">
            <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--navy-800)]" checked={selected.includes(exp.id)} onChange={() => toggle(exp.id)} />
            <span>
              <span className="font-semibold text-ink">{exp.title}</span>
              <span className="text-muted"> · {exp.company}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <div className="flex items-center gap-3">
        <Button disabled={pending}>{pending ? "Saving…" : resume ? "Save version" : "Create version"}</Button>
        {message && <span className="text-[13px] text-muted">{message}</span>}
      </div>
    </form>
  );
}
