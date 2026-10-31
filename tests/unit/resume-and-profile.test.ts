import { describe, expect, it } from "vitest";
import { profileCompleteness } from "@/lib/data";
import { buildResumeContent } from "@/lib/resume";
import { profile } from "../support/fixtures";

describe("buildResumeContent", () => {
  it("keeps the chosen experiences in the chosen order, with at most five bullets each", () => {
    const content = buildResumeContent(profile(), ["e2", "e1"]);
    expect(content.experiences.map(e => e.experienceId)).toEqual(["e2", "e1"]);
    expect(content.experiences[1].bullets).toEqual(["a", "b", "c", "d", "e"]);
    expect(content.experiences[0].period).toBe("2024 – Present");
  });

  it("uses every experience when none are selected, and skips ids that no longer exist", () => {
    expect(buildResumeContent(profile(), []).experiences).toHaveLength(2);
    expect(buildResumeContent(profile(), ["gone", "e1"]).experiences.map(e => e.experienceId)).toEqual(["e1"]);
  });

  it("formats education as degree, field and period", () => {
    expect(buildResumeContent(profile(), []).education).toEqual([{ school: "HKU", degree: "BBA, IS", period: "2024 – 2027" }]);
  });
});

describe("profileCompleteness", () => {
  it("lists what is missing and scores the rest", () => {
    const { percent, missing } = profileCompleteness(profile());
    expect(missing).toEqual(["Work authorisation", "Sponsorship answer", "Earliest start date", "Availability"]);
    expect(percent).toBe(60);
  });

  it("reaches 100% when every check passes", () => {
    const complete = profile({
      answers: { ...profile().answers, workAuthorization: "PR", needsSponsorship: "no", earliestStart: "Now", availability: "Full-time" },
    });
    expect(profileCompleteness(complete)).toEqual({ percent: 100, missing: [] });
  });
});
