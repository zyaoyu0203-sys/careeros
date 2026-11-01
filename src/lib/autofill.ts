import type { Profile } from "@/lib/types";

/** Values the browser extension fills into application forms, keyed by field meaning. */
export type FormAnswers = Record<string, string>;

const yesNo = (v: string) => ({ yes: "Yes", no: "No", depends: "Open to discussing" })[v] ?? "";

export function formAnswers(profile: Profile): FormAnswers {
  const [first, ...rest] = profile.fullName.trim().split(/\s+/);
  const latestEducation = profile.education[0];
  return {
    firstName: first ?? "",
    lastName: rest.join(" "),
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    linkedin: profile.linkedin,
    website: profile.website,
    school: latestEducation?.school ?? "",
    degree: [latestEducation?.degree, latestEducation?.field].filter(Boolean).join(", "),
    graduation: latestEducation?.end ?? "",
    workAuthorization: profile.answers.workAuthorization,
    needsSponsorship: yesNo(profile.answers.needsSponsorship),
    earliestStart: profile.answers.earliestStart,
    availability: profile.answers.availability,
    expectedSalary: profile.answers.expectedSalary,
    noticePeriod: profile.answers.noticePeriod,
    willingToRelocate: yesNo(profile.answers.willingToRelocate),
  };
}

/**
 * Which answer a form field's label is asking for. Order matters: specific phrases first,
 * so "LinkedIn profile URL" doesn't fall through to "website".
 */
export const FIELD_RULES: [RegExp, keyof ReturnType<typeof formAnswers>][] = [
  [/first\s*name|given\s*name|preferred\s*name/i, "firstName"],
  [/last\s*name|family\s*name|surname/i, "lastName"],
  [/full\s*name|^name\b|your name/i, "fullName"],
  [/e-?mail/i, "email"],
  [/phone|mobile|contact number/i, "phone"],
  [/linkedin/i, "linkedin"],
  [/website|portfolio|github|personal (site|url)/i, "website"],
  [/sponsor/i, "needsSponsorship"],
  [/authori[sz]ed|right to work|work (permit|authori[sz]ation|eligib)|visa/i, "workAuthorization"],
  [/relocat/i, "willingToRelocate"],
  [/notice period/i, "noticePeriod"],
  [/salary|compensation|pay expectation/i, "expectedSalary"],
  [/start date|earliest|when can you start|available to start/i, "earliestStart"],
  [/availability|hours per week|duration/i, "availability"],
  [/graduat/i, "graduation"],
  [/school|university|college|institution/i, "school"],
  [/degree|discipline|major|field of study/i, "degree"],
  [/location|city|where are you based|current address/i, "location"],
];

export function fieldFor(label: string): keyof FormAnswers | null {
  const text = label.replace(/\*/g, " ").trim();
  if (!text) return null;
  return FIELD_RULES.find(([re]) => re.test(text))?.[1] ?? null;
}
