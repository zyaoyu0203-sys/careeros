"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { saveProfile } from "@/app/actions";
import { AnswersEditor, EducationEditor, ExperienceEditor, TagInput } from "@/components/fields";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";
import type { Profile } from "@/lib/types";

const SECTIONS = [
  { id: "basics", label: "About you" },
  { id: "education", label: "Education" },
  { id: "experience", label: "Experience library" },
  { id: "skills", label: "Skills & languages" },
  { id: "answers", label: "Application answers" },
];

export function ProfileForm({ initial }: { initial: Profile }) {
  const router = useRouter();
  const [profile, setProfile] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = (patch: Partial<Profile>) => {
    setProfile(p => ({ ...p, ...patch }));
    setDirty(true);
    setStatus(null);
  };

  const save = () =>
    start(async () => {
      const r = await saveProfile(profile);
      setStatus(r.ok ? { ok: true, text: "Saved" } : { ok: false, text: r.error });
      if (r.ok) {
        setDirty(false);
        router.refresh();
      }
    });

  return (
    <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
      <nav className="hidden self-start lg:sticky lg:top-6 lg:grid lg:gap-0.5" aria-label="Sections">
        {SECTIONS.map(s => (
          <a key={s.id} href={`#${s.id}`} className="rounded-[3px] px-3 py-2 text-[14px] font-medium text-ink-soft hover:bg-blue-50 hover:text-navy-800">
            {s.label}
          </a>
        ))}
      </nav>

      <div className="grid gap-6 pb-24">
        <Section id="basics" title="About you">
          <div className="grid gap-4 sm:grid-cols-2">
            <Label label="Full name">
              <Input value={profile.fullName} onChange={e => set({ fullName: e.target.value })} />
            </Label>
            <Label label="Email">
              <Input type="email" value={profile.email} onChange={e => set({ email: e.target.value })} />
            </Label>
            <Label label="Phone">
              <Input value={profile.phone} onChange={e => set({ phone: e.target.value })} />
            </Label>
            <Label label="Based in">
              <Input value={profile.location} onChange={e => set({ location: e.target.value })} />
            </Label>
            <Label label="LinkedIn URL">
              <Input value={profile.linkedin} onChange={e => set({ linkedin: e.target.value })} />
            </Label>
            <Label label="Portfolio / website">
              <Input value={profile.website} onChange={e => set({ website: e.target.value })} />
            </Label>
            <Label label="Headline" className="sm:col-span-2">
              <Input value={profile.headline} onChange={e => set({ headline: e.target.value })} />
            </Label>
            <Label label="Professional summary" className="sm:col-span-2">
              <Textarea value={profile.summary} onChange={e => set({ summary: e.target.value })} />
            </Label>
          </div>
        </Section>
        <Section id="education" title="Education">
          <EducationEditor value={profile.education} onChange={education => set({ education })} />
        </Section>
        <Section id="experience" title="Experience library" blurb="Tailored resumes only use the facts listed here.">
          <ExperienceEditor value={profile.experiences} onChange={experiences => set({ experiences })} />
        </Section>
        <Section id="skills" title="Skills & languages">
          <div className="grid gap-4">
            <TagInput label="Skills" value={profile.skills} onChange={skills => set({ skills })} />
            <TagInput label="Languages" value={profile.languages} onChange={languages => set({ languages })} />
          </div>
        </Section>
        <Section id="answers" title="Application answers" blurb="Reused in every application pack.">
          <AnswersEditor value={profile.answers} onChange={answers => set({ answers })} />
        </Section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1240px] items-center justify-end gap-3 px-4 py-3 sm:px-6">
          {status && <span className={`text-[14px] ${status.ok ? "text-green-600" : "text-rose-600"}`}>{status.text}</span>}
          {dirty && !status && <span className="text-[14px] text-muted">Unsaved changes</span>}
          <Button onClick={save} disabled={pending || !dirty}>
            {pending ? "Saving…" : "Save knowledge base"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Section({ id, title, blurb, children }: { id: string; title: string; blurb?: string; children: ReactNode }) {
  return (
    <Card id={id} className="scroll-mt-6 p-6 sm:p-7">
      <h2 className="font-serif text-[22px] font-semibold text-navy-900">{title}</h2>
      {blurb && <p className="mt-0.5 text-[14px] text-muted">{blurb}</p>}
      <div className="mt-5">{children}</div>
    </Card>
  );
}
