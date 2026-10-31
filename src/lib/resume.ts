import type { Profile, Resume, ResumeContent } from "@/lib/types";

/** Build resume content straight from the knowledge base, without AI. */
export function buildResumeContent(profile: Profile, experienceIds: string[]): ResumeContent {
  const chosen = experienceIds.length
    ? experienceIds.map(id => profile.experiences.find(e => e.id === id)).filter(e => e !== undefined)
    : profile.experiences;
  return {
    headline: profile.headline,
    summary: profile.summary,
    experiences: chosen.map(e => ({
      experienceId: e.id,
      company: e.company,
      title: e.title,
      period: `${e.start} – ${e.end}`,
      bullets: e.bullets.slice(0, 5),
    })),
    education: profile.education.map(ed => ({
      school: ed.school,
      degree: [ed.degree, ed.field].filter(Boolean).join(", "),
      period: [ed.start, ed.end].filter(Boolean).join(" – "),
    })),
    skills: profile.skills,
  };
}

export function newVersion(profile: Profile, name: string, focus: string[], experienceIds: string[]): Resume {
  const now = new Date().toISOString();
  return {
    id: `res_${crypto.randomUUID().slice(0, 8)}`,
    name,
    kind: "version",
    focus,
    experienceIds,
    jobId: null,
    content: buildResumeContent(profile, experienceIds),
    approved: true,
    createdAt: now,
    updatedAt: now,
  };
}
