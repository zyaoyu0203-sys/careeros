import type { Profile, ResumeContent } from "@/lib/types";

/** The rendered resume — shared by the in-app preview and the print/PDF page. */
export function ResumeDocument({ profile, content }: { profile: Profile; content: ResumeContent }) {
  const contact = [profile.location, profile.email, profile.phone, profile.linkedin].filter(Boolean);
  return (
    <div className="font-sans text-[10.5pt] leading-[1.45] text-[#111]">
      <header className="text-center">
        <h1 className="text-[20pt] font-bold tracking-[0.06em] uppercase">{profile.fullName}</h1>
        <p className="mt-0.5 text-[9.5pt] text-[#333]">{contact.join("  ·  ")}</p>
        {content.headline && <p className="mt-1.5 text-[10.5pt] font-semibold">{content.headline}</p>}
      </header>

      {content.summary && <p className="mt-3 text-[10pt]">{content.summary}</p>}

      {content.education.length > 0 && (
        <Section title="Education">
          {content.education.map(ed => (
            <div key={`${ed.school}-${ed.degree}`} className="flex justify-between gap-4">
              <span>
                <b>{ed.school}</b> — {ed.degree}
              </span>
              <span className="shrink-0 text-[#333]">{ed.period}</span>
            </div>
          ))}
        </Section>
      )}

      {content.experiences.length > 0 && (
        <Section title="Experience">
          <div className="grid gap-2.5">
            {content.experiences.map(exp => (
              <div key={exp.experienceId}>
                <div className="flex justify-between gap-4">
                  <span>
                    <b>{exp.company}</b> — {exp.title}
                  </span>
                  <span className="shrink-0 text-[#333]">{exp.period}</span>
                </div>
                <ul className="mt-0.5 list-disc pl-5">
                  {exp.bullets.map(b => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      )}

      {(content.skills.length > 0 || profile.languages.length > 0) && (
        <Section title="Skills">
          {content.skills.length > 0 && (
            <p>
              <b>Skills:</b> {content.skills.join(", ")}
            </p>
          )}
          {profile.languages.length > 0 && (
            <p>
              <b>Languages:</b> {profile.languages.join(", ")}
            </p>
          )}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-3.5">
      <h2 className="border-b-[1.5px] border-[#111] pb-0.5 text-[10pt] font-bold tracking-[0.1em] uppercase">{title}</h2>
      <div className="mt-1.5">{children}</div>
    </section>
  );
}
