import { describe, expect, it } from "vitest";
import { fieldFor, formAnswers } from "@/lib/autofill";
import { profile } from "../support/fixtures";

describe("fieldFor", () => {
  it.each([
    ["First Name *", "firstName"],
    ["Legal last name", "lastName"],
    ["Email address", "email"],
    ["Mobile number", "phone"],
    ["LinkedIn Profile URL", "linkedin"], // not "website"
    ["Portfolio / GitHub", "website"],
    ["Will you now or in the future require visa sponsorship?", "needsSponsorship"], // not "workAuthorization"
    ["Are you legally authorized to work in Hong Kong?", "workAuthorization"],
    ["What is your earliest start date?", "earliestStart"],
    ["Expected salary (HKD)", "expectedSalary"],
    ["University", "school"],
    ["Current city", "location"],
  ])("maps %s → %s", (label, key) => {
    expect(fieldFor(label)).toBe(key);
  });

  it("leaves unknown questions alone", () => {
    expect(fieldFor("Tell us about a project you are proud of")).toBeNull();
    expect(fieldFor(" * ")).toBeNull();
  });
});

describe("formAnswers", () => {
  it("splits the name and turns yes/no answers into form wording", () => {
    const answers = formAnswers(profile({ fullName: "Mary Jane Watson", answers: { ...profile().answers, needsSponsorship: "no", willingToRelocate: "depends" } }));
    expect(answers.firstName).toBe("Mary");
    expect(answers.lastName).toBe("Jane Watson");
    expect(answers.needsSponsorship).toBe("No");
    expect(answers.willingToRelocate).toBe("Open to discussing");
    expect(answers.school).toBe("HKU");
  });
});
