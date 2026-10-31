"use client";

import { Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Button, Input, Label, Select, Textarea, cx } from "@/components/ui";
import type { ApplicationAnswers, Education, Experience, Preferences } from "@/lib/types";

const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 10)}`;

/** Chips with free-text entry: Enter or comma adds, × removes. */
export function TagInput({ value, onChange, placeholder, label, hint }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string; label: string; hint?: string }) {
  const [draft, setDraft] = useState("");
  const commit = () => {
    const parts = draft.split(",").map(s => s.trim()).filter(Boolean);
    if (parts.length) onChange([...new Set([...value, ...parts])]);
    setDraft("");
  };
  return (
    <Label label={label} hint={hint}>
      <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-[3px] border border-line bg-surface px-2 py-1.5 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
        {value.map(tag => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-[3px] bg-blue-100 py-0.5 pr-1 pl-2 text-[13px] text-navy-800">
            {tag}
            <button type="button" onClick={() => onChange(value.filter(t => t !== tag))} className="rounded-sm p-0.5 hover:bg-blue-200" aria-label={`Remove ${tag}`}>
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commit();
            } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={commit}
          placeholder={value.length ? "" : placeholder}
          className="min-w-[140px] flex-1 bg-transparent px-1 py-0.5 text-[14px] outline-none"
        />
      </div>
    </Label>
  );
}

const lines = (text: string) => text.split("\n").map(s => s.replace(/^[\s•\-*]+/, "").trim()).filter(Boolean);

export function EducationEditor({ value, onChange }: { value: Education[]; onChange: (v: Education[]) => void }) {
  const update = (id: string, patch: Partial<Education>) => onChange(value.map(e => (e.id === id ? { ...e, ...patch } : e)));
  return (
    <div className="grid gap-4">
      {value.map(ed => (
        <div key={ed.id} className="grid gap-3 rounded-[4px] border border-line bg-blue-50/40 p-4 sm:grid-cols-2">
          <Label label="School">
            <Input value={ed.school} onChange={e => update(ed.id, { school: e.target.value })} placeholder="The University of Hong Kong" />
          </Label>
          <Label label="Degree">
            <Input value={ed.degree} onChange={e => update(ed.id, { degree: e.target.value })} placeholder="MSc" />
          </Label>
          <Label label="Field of study">
            <Input value={ed.field} onChange={e => update(ed.id, { field: e.target.value })} placeholder="Artificial Intelligence in Business" />
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <Label label="Start">
              <Input value={ed.start} onChange={e => update(ed.id, { start: e.target.value })} placeholder="Sep 2026" />
            </Label>
            <Label label="End / expected">
              <Input value={ed.end} onChange={e => update(ed.id, { end: e.target.value })} placeholder="Jun 2028" />
            </Label>
          </div>
          <Label label="Grade (optional)">
            <Input value={ed.grade ?? ""} onChange={e => update(ed.id, { grade: e.target.value })} placeholder="WAM 77.8 / Distinction" />
          </Label>
          <div className="flex items-end justify-end">
            <Button type="button" variant="danger" size="sm" onClick={() => onChange(value.filter(e => e.id !== ed.id))}>
              <Trash2 size={14} /> Remove
            </Button>
          </div>
        </div>
      ))}
      <Button type="button" variant="secondary" className="justify-self-start" onClick={() => onChange([...value, { id: uid("edu"), school: "", degree: "", field: "", start: "", end: "" }])}>
        <Plus size={16} /> Add education
      </Button>
    </div>
  );
}

export function ExperienceEditor({ value, onChange }: { value: Experience[]; onChange: (v: Experience[]) => void }) {
  const update = (id: string, patch: Partial<Experience>) => onChange(value.map(e => (e.id === id ? { ...e, ...patch } : e)));
  return (
    <div className="grid gap-5">
      {value.map((exp, i) => (
        <div key={exp.id} className="rounded-[4px] border border-line">
          <div className="flex items-center justify-between gap-3 border-b border-line bg-blue-50/60 px-4 py-2.5">
            <span className="text-[14px] font-semibold text-navy-800">
              {exp.company || exp.title ? `${exp.title || "Role"} · ${exp.company || "Company"}` : `Experience ${i + 1}`}
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(value.filter(e => e.id !== exp.id))} aria-label="Remove experience">
              <Trash2 size={14} /> Remove
            </Button>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <Label label="Company">
              <Input value={exp.company} onChange={e => update(exp.id, { company: e.target.value })} />
            </Label>
            <Label label="Title">
              <Input value={exp.title} onChange={e => update(exp.id, { title: e.target.value })} />
            </Label>
            <Label label="Location">
              <Input value={exp.location ?? ""} onChange={e => update(exp.id, { location: e.target.value })} />
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <Label label="Start">
                <Input value={exp.start} onChange={e => update(exp.id, { start: e.target.value })} placeholder="Mar 2026" />
              </Label>
              <Label label="End">
                <Input value={exp.end} onChange={e => update(exp.id, { end: e.target.value })} placeholder="Present" />
              </Label>
            </div>
            <Label label="One-line summary" className="sm:col-span-2">
              <Input value={exp.summary} onChange={e => update(exp.id, { summary: e.target.value })} placeholder="What the role was about, in one sentence" />
            </Label>
            <Label label="Facts you can defend" hint="One per line. Tailored resumes only ever use these facts — be specific." className="sm:col-span-2">
              <Textarea
                defaultValue={exp.bullets.join("\n")}
                onBlur={e => update(exp.id, { bullets: lines(e.target.value) })}
                className="min-h-32"
                placeholder={"Tested 500+ navigation queries across 5 regions\nTranslated user research into 20+ interaction requirements"}
              />
            </Label>
            <TagInput label="Metrics" hint="Exact numbers, e.g. “31-store pilot”" value={exp.metrics} onChange={metrics => update(exp.id, { metrics })} />
            <TagInput label="Skills used" value={exp.skills} onChange={skills => update(exp.id, { skills })} />
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        className="justify-self-start"
        onClick={() => onChange([...value, { id: uid("exp"), company: "", title: "", location: "", start: "", end: "", summary: "", bullets: [], metrics: [], skills: [], verified: true }])}
      >
        <Plus size={16} /> Add experience
      </Button>
    </div>
  );
}

export function AnswersEditor({ value, onChange }: { value: ApplicationAnswers; onChange: (v: ApplicationAnswers) => void }) {
  const set = (patch: Partial<ApplicationAnswers>) => onChange({ ...value, ...patch });
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Label label="Work authorisation" hint="How you are allowed to work in your target location">
          <Input value={value.workAuthorization} onChange={e => set({ workAuthorization: e.target.value })} placeholder="Student visa — eligible for part-time internships" />
        </Label>
        <Label label="Will you need visa sponsorship?">
          <Select value={value.needsSponsorship} onChange={e => set({ needsSponsorship: e.target.value as ApplicationAnswers["needsSponsorship"] })}>
            <option value="">Select…</option>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </Select>
        </Label>
        <Label label="Current visa status">
          <Input value={value.visaStatus} onChange={e => set({ visaStatus: e.target.value })} placeholder="e.g. Hong Kong student visa, valid to 2028" />
        </Label>
        <Label label="Earliest start date">
          <Input value={value.earliestStart} onChange={e => set({ earliestStart: e.target.value })} placeholder="Immediately / 1 Jan 2027" />
        </Label>
        <Label label="Availability">
          <Input value={value.availability} onChange={e => set({ availability: e.target.value })} placeholder="Full-time 6 months, or 3 days/week during term" />
        </Label>
        <Label label="Expected salary">
          <Input value={value.expectedSalary} onChange={e => set({ expectedSalary: e.target.value })} placeholder="HKD 15,000/month, negotiable" />
        </Label>
        <Label label="Notice period">
          <Input value={value.noticePeriod} onChange={e => set({ noticePeriod: e.target.value })} placeholder="None" />
        </Label>
        <Label label="Willing to relocate?">
          <Select value={value.willingToRelocate} onChange={e => set({ willingToRelocate: e.target.value as ApplicationAnswers["willingToRelocate"] })}>
            <option value="">Select…</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
            <option value="depends">Depends on the role</option>
          </Select>
        </Label>
      </div>
      <div className="mt-2">
        <div className="mb-2 text-[13px] font-semibold text-ink-soft">Other questions you get asked often</div>
        <div className="grid gap-3">
          {value.custom.map(item => (
            <div key={item.id} className="grid gap-2 rounded-[4px] border border-line p-3 sm:grid-cols-[1fr_1.4fr_auto]">
              <Input
                value={item.question}
                onChange={e => set({ custom: value.custom.map(c => (c.id === item.id ? { ...c, question: e.target.value } : c)) })}
                placeholder="Question, e.g. Why are you interested in FinTech?"
              />
              <Textarea
                value={item.answer}
                onChange={e => set({ custom: value.custom.map(c => (c.id === item.id ? { ...c, answer: e.target.value } : c)) })}
                className="min-h-10"
                placeholder="Your standard answer"
              />
              <Button type="button" variant="ghost" size="sm" onClick={() => set({ custom: value.custom.filter(c => c.id !== item.id) })} aria-label="Remove question">
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
          <Button type="button" variant="secondary" size="sm" className="justify-self-start" onClick={() => set({ custom: [...value.custom, { id: uid("q"), question: "", answer: "" }] })}>
            <Plus size={14} /> Add question
          </Button>
        </div>
      </div>
    </div>
  );
}

const WORK_MODES = ["On-site", "Hybrid", "Remote"];

export function PreferencesEditor({ value, onChange, googleJobsAvailable }: { value: Preferences; onChange: (v: Preferences) => void; googleJobsAvailable: boolean }) {
  const set = (patch: Partial<Preferences>) => onChange({ ...value, ...patch });
  const setSources = (patch: Partial<Preferences["sources"]>) => set({ sources: { ...value.sources, ...patch } });
  return (
    <div className="grid gap-8">
      <section className="grid gap-4">
        <h3 className="text-[16px] font-semibold text-navy-900">What you&apos;re looking for</h3>
        <TagInput label="Target roles" hint="A role is pushed to you only if its job title contains one of these words" value={value.roles} onChange={roles => set({ roles })} placeholder="AI Product, Product Analyst…" />
        <div className="grid gap-4 sm:grid-cols-2">
          <TagInput label="Extra keywords" value={value.keywords} onChange={keywords => set({ keywords })} placeholder="GenAI, FinTech…" />
          <TagInput label="Never show titles containing" value={value.excludeKeywords} onChange={excludeKeywords => set({ excludeKeywords })} placeholder="Sales, Senior…" />
          <TagInput label="Locations" value={value.locations} onChange={locations => set({ locations })} placeholder="Hong Kong" />
          <div className="grid gap-1.5">
            <span className="text-[13px] font-semibold text-ink-soft">Work mode</span>
            <div className="flex flex-wrap gap-2">
              {WORK_MODES.map(mode => {
                const on = value.workModes.includes(mode);
                return (
                  <button
                    type="button"
                    key={mode}
                    aria-pressed={on}
                    onClick={() => set({ workModes: on ? value.workModes.filter(m => m !== mode) : [...value.workModes, mode] })}
                    className={cx("h-10 rounded-[3px] border px-4 text-[14px] font-medium", on ? "border-navy-800 bg-navy-800 text-white" : "border-line bg-surface text-ink-soft hover:bg-blue-50")}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        <div>
          <h3 className="text-[16px] font-semibold text-navy-900">Where to search</h3>
          <p className="text-[13.5px] text-muted">
            Add companies by their careers-board name. Find it in the URL of their job page: boards.greenhouse.io/<b>airwallex</b>, jobs.lever.co/<b>company</b>, jobs.ashbyhq.com/<b>company</b>.
          </p>
        </div>
        <label className={cx("flex items-start gap-3 rounded-[4px] border p-4", value.sources.googleJobs ? "border-navy-800 bg-blue-50" : "border-line")}>
          <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--navy-800)]" checked={value.sources.googleJobs} onChange={e => setSources({ googleJobs: e.target.checked })} />
          <span>
            <span className="block text-[14.5px] font-semibold text-ink">Job boards via Google Jobs</span>
            <span className="block text-[13.5px] text-muted">
              Searches listings from JobsDB, Indeed, LinkedIn and company sites for each target role and location.
              {!googleJobsAvailable && " (Activates once the search service key is added to the deployment.)"}
            </span>
          </span>
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <TagInput label="Greenhouse boards" value={value.sources.greenhouse} onChange={greenhouse => setSources({ greenhouse })} placeholder="airwallex" />
          <TagInput label="Lever companies" value={value.sources.lever} onChange={lever => setSources({ lever })} placeholder="company" />
          <TagInput label="Ashby boards" value={value.sources.ashby} onChange={ashby => setSources({ ashby })} placeholder="company" />
        </div>
        <p className="text-[13px] text-muted">LinkedIn doesn&apos;t allow automated searching. To track a role you found there, add it by hand on the Jobs page.</p>
      </section>

      <section className="grid gap-3">
        <h3 className="text-[16px] font-semibold text-navy-900">How often</h3>
        <div className="flex flex-wrap gap-2">
          {(["daily", "weekly", "manual"] as const).map(freq => (
            <button
              type="button"
              key={freq}
              aria-pressed={value.frequency === freq}
              onClick={() => set({ frequency: freq })}
              className={cx(
                "h-10 rounded-[3px] border px-4 text-[14px] font-medium",
                value.frequency === freq ? "border-navy-800 bg-navy-800 text-white" : "border-line bg-surface text-ink-soft hover:bg-blue-50",
              )}
            >
              {{ daily: "Daily", weekly: "Weekly", manual: "Only when I ask" }[freq]}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
