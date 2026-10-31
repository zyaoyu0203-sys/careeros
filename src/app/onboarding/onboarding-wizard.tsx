"use client";

import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { importResume, savePreferences, saveProfile } from "@/app/actions";
import { AnswersEditor, EducationEditor, ExperienceEditor, PreferencesEditor, TagInput } from "@/components/fields";
import { Button, Card, Input, Label, Textarea, cx } from "@/components/ui";
import { samplePreferences, sampleProfile } from "@/lib/sample";
import type { Preferences, Profile } from "@/lib/types";

const STEPS = [
  { key: "import", title: "Start fast", blurb: "Paste your current resume and we'll pre-fill everything. You can also skip this and type it in." },
  { key: "basics", title: "About you", blurb: "How employers reach you, and the one-line headline that opens every resume." },
  { key: "education", title: "Education", blurb: "Degrees in progress count — add the expected end date." },
  { key: "experience", title: "Experience library", blurb: "The facts here are the only material CareerOS uses to tailor resumes. Be specific and honest." },
  { key: "skills", title: "Skills & languages", blurb: "Used to match you to roles and to fill the skills section." },
  { key: "answers", title: "Application answers", blurb: "The questions every application form asks. Answer once; every application pack reuses them." },
  { key: "search", title: "Job search", blurb: "What to look for, where, and how often CareerOS should search for you." },
] as const;

export function OnboardingWizard(props: { initialProfile: Profile; initialPrefs: Preferences; aiAvailable: boolean; googleJobsAvailable: boolean; allowSample: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState(props.initialProfile.fullName ? 1 : 0);
  const [profile, setProfile] = useState(props.initialProfile);
  const [prefs, setPrefs] = useState(props.initialPrefs);
  const [resumeText, setResumeText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const set = (patch: Partial<Profile>) => setProfile(p => ({ ...p, ...patch }));

  const validate = (): string | null => {
    const key = STEPS[step].key;
    if (key === "basics" && (!profile.fullName.trim() || !profile.email.trim())) return "Add your name and email to continue.";
    if (key === "experience" && profile.experiences.length === 0) return "Add at least one experience — internships, projects and ventures all count.";
    if (key === "answers" && (!profile.answers.workAuthorization || !profile.answers.needsSponsorship)) return "Work authorisation and sponsorship are asked on almost every form — please answer both.";
    if (key === "search" && prefs.roles.length === 0) return "Add at least one target role so CareerOS knows what to push to you.";
    return null;
  };

  const next = () => {
    const problem = validate();
    if (problem) return setError(problem);
    setError(null);
    setNotice(null);
    startTransition(async () => {
      if (step === STEPS.length - 1) {
        const p = await savePreferences(prefs);
        if (!p.ok) return setError(p.error);
        const r = await saveProfile(profile, { finishOnboarding: true });
        if (!r.ok) return setError(r.error);
        router.push("/");
        router.refresh();
        return;
      }
      // Keep progress if the tab closes.
      if (step > 0) await Promise.all([saveProfile(profile), savePreferences(prefs)]);
      setStep(s => s + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const runImport = () =>
    startTransition(async () => {
      setError(null);
      const result = await importResume(resumeText);
      if (!result.ok) return setError(result.error);
      setProfile(p => ({ ...p, ...result.profile, answers: p.answers }));
      setNotice("Imported. Check each step — nothing is saved until you continue.");
      setStep(1);
    });

  const current = STEPS[step];

  return (
    <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
      <ol className="hidden self-start lg:sticky lg:top-8 lg:grid lg:gap-1">
        {STEPS.map((s, i) => (
          <li key={s.key}>
            <button
              type="button"
              disabled={i > step}
              onClick={() => setStep(i)}
              className={cx(
                "flex w-full items-center gap-3 rounded-[3px] px-3 py-2.5 text-left text-[14px]",
                i === step ? "bg-navy-900 font-semibold text-white" : i < step ? "text-navy-800 hover:bg-blue-50" : "text-muted",
              )}
            >
              <span
                className={cx(
                  "grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-bold",
                  i === step ? "bg-amber-500 text-navy-950" : i < step ? "bg-blue-100 text-navy-800" : "bg-line-soft text-muted",
                )}
              >
                {i < step ? <Check size={13} /> : i + 1}
              </span>
              {s.title}
            </button>
          </li>
        ))}
      </ol>

      <Card className="overflow-hidden">
        <div className="border-b border-line px-6 py-5 sm:px-8">
          <div className="eyebrow text-navy-700">
            Step {step + 1} of {STEPS.length}
          </div>
          <h1 className="mt-1 font-serif text-[30px] font-semibold text-navy-900">{current.title}</h1>
          <p className="mt-1 text-[15px] text-muted">{current.blurb}</p>
          <div className="mt-4 h-1 overflow-hidden rounded-full bg-line-soft">
            <div className="h-full bg-navy-700 transition-[width]" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
          </div>
        </div>

        <div className="px-6 py-6 sm:px-8">
          {notice && <div className="mb-5 rounded-[3px] border border-green-600/30 bg-green-100 px-4 py-3 text-[14px] text-green-600">{notice}</div>}

          {current.key === "import" && (
            <div className="grid gap-4">
              <Label label="Your resume as text" hint="Open your resume PDF, select all, copy, and paste here.">
                <Textarea value={resumeText} onChange={e => setResumeText(e.target.value)} className="min-h-72 font-mono text-[13px]" placeholder="Paste resume text…" />
              </Label>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" onClick={runImport} disabled={pending || !props.aiAvailable || !resumeText.trim()}>
                  <Sparkles size={16} /> {pending ? "Reading your resume…" : "Import with AI"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setStep(1)} disabled={pending}>
                  Skip and fill in manually
                </Button>
                {props.allowSample && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setProfile(sampleProfile());
                      setPrefs(samplePreferences(prefs));
                      setNotice("Loaded the fictional demo profile (Alex Chen).");
                      setStep(1);
                    }}
                  >
                    Use demo profile
                  </Button>
                )}
              </div>
              {!props.aiAvailable && <p className="text-[13px] text-muted">AI import becomes available once the AI service key is configured.</p>}
            </div>
          )}

          {current.key === "basics" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Label label="Full name">
                <Input value={profile.fullName} onChange={e => set({ fullName: e.target.value })} autoComplete="name" />
              </Label>
              <Label label="Email">
                <Input type="email" value={profile.email} onChange={e => set({ email: e.target.value })} autoComplete="email" />
              </Label>
              <Label label="Phone">
                <Input value={profile.phone} onChange={e => set({ phone: e.target.value })} autoComplete="tel" />
              </Label>
              <Label label="Based in">
                <Input value={profile.location} onChange={e => set({ location: e.target.value })} placeholder="Hong Kong" />
              </Label>
              <Label label="LinkedIn URL">
                <Input value={profile.linkedin} onChange={e => set({ linkedin: e.target.value })} />
              </Label>
              <Label label="Portfolio / website">
                <Input value={profile.website} onChange={e => set({ website: e.target.value })} />
              </Label>
              <Label label="Headline" className="sm:col-span-2" hint="e.g. “AI product & user research · MSc AI in Business, HKU”">
                <Input value={profile.headline} onChange={e => set({ headline: e.target.value })} />
              </Label>
              <Label label="Professional summary" className="sm:col-span-2">
                <Textarea value={profile.summary} onChange={e => set({ summary: e.target.value })} />
              </Label>
            </div>
          )}

          {current.key === "education" && <EducationEditor value={profile.education} onChange={education => set({ education })} />}
          {current.key === "experience" && <ExperienceEditor value={profile.experiences} onChange={experiences => set({ experiences })} />}
          {current.key === "skills" && (
            <div className="grid gap-4">
              <TagInput label="Skills" value={profile.skills} onChange={skills => set({ skills })} placeholder="SQL, Figma, user research…" />
              <TagInput label="Languages" value={profile.languages} onChange={languages => set({ languages })} placeholder="English (fluent)" />
            </div>
          )}
          {current.key === "answers" && <AnswersEditor value={profile.answers} onChange={answers => set({ answers })} />}
          {current.key === "search" && <PreferencesEditor value={prefs} onChange={setPrefs} googleJobsAvailable={props.googleJobsAvailable} />}

          {error && (
            <div role="alert" className="mt-5 rounded-[3px] border border-rose-600/30 bg-rose-100 px-4 py-3 text-[14px] text-rose-600">
              {error}
            </div>
          )}
        </div>

        {current.key !== "import" && (
          <div className="flex items-center justify-between gap-3 border-t border-line bg-blue-50/50 px-6 py-4 sm:px-8">
            <Button type="button" variant="ghost" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={pending}>
              <ArrowLeft size={16} /> Back
            </Button>
            <Button type="button" onClick={next} disabled={pending}>
              {step === STEPS.length - 1 ? (pending ? "Setting up…" : "Finish and open my portal") : pending ? "Saving…" : "Continue"}
              {step < STEPS.length - 1 && <ArrowRight size={16} />}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
