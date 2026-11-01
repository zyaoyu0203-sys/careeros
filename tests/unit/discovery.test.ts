import { describe, expect, it, vi } from "vitest";
import { chooseResumeVersion, isDue, keywordScore, passesFilters } from "@/lib/discovery";
import { prefs, profile, rawJob, resume } from "../support/fixtures";

// discovery.ts imports the AI client and store; the pure functions under test don't touch them.
vi.mock("@/lib/ai/llm", () => ({ aiAvailable: () => false, scoreJobs: vi.fn() }));

describe("passesFilters", () => {
  it("matches target roles as whole words in the title", () => {
    expect(passesFilters(rawJob({ title: "AI Product Intern" }), prefs())).toBe(true);
    // "AI" must not match inside "Maintenance" or "Email".
    expect(passesFilters(rawJob({ title: "Maintenance Engineer, Email Systems" }), prefs())).toBe(false);
  });

  it("ignores role words that only appear in the description", () => {
    expect(passesFilters(rawJob({ title: "Office Manager", description: "Work with the Product team" }), prefs())).toBe(false);
  });

  it("drops excluded titles", () => {
    expect(passesFilters(rawJob({ title: "Senior Product Analyst" }), prefs())).toBe(false);
  });

  it("requires a matching location unless the role is remote and remote is allowed", () => {
    expect(passesFilters(rawJob({ location: "Singapore" }), prefs())).toBe(false);
    expect(passesFilters(rawJob({ location: "Remote — APAC" }), prefs())).toBe(false);
    expect(passesFilters(rawJob({ location: "Remote — APAC" }), prefs({ workModes: ["Remote"] }))).toBe(true);
  });

  it("passes everything when no roles or locations are configured", () => {
    expect(passesFilters(rawJob({ title: "Anything", location: "Mars" }), prefs({ roles: [], locations: [], excludeKeywords: [] }))).toBe(true);
  });
});

describe("keywordScore", () => {
  it("rewards title matches, skills and location, and explains why", () => {
    const { score, fit } = keywordScore(rawJob(), prefs(), profile());
    expect(score).toBeGreaterThanOrEqual(80);
    expect(fit.join(" ")).toMatch(/Product, Analyst/);
    expect(fit.join(" ")).toMatch(/SQL, Python/);
  });

  it("penalises senior titles and flags them as a risk", () => {
    const junior = keywordScore(rawJob({ title: "Product Analyst" }), prefs(), profile()).score;
    const senior = keywordScore(rawJob({ title: "Product Analyst Lead" }), prefs(), profile());
    expect(senior.score).toBeLessThan(junior);
    expect(senior.risks).toContain("Title suggests a senior role");
  });

  it("flags work-right requirements for candidates who need sponsorship", () => {
    const candidate = profile({ answers: { ...profile().answers, needsSponsorship: "yes" } });
    const { risks } = keywordScore(rawJob({ description: "Applicants must have the right to work in Hong Kong." }), prefs(), candidate);
    expect(risks.join()).toMatch(/sponsorship/);
  });

  it("stays within 0–100", () => {
    const { score } = keywordScore(rawJob({ title: "Senior Director", location: "", description: "" }), prefs({ roles: [] }), profile({ skills: [] }));
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe("chooseResumeVersion", () => {
  const product = resume({ id: "product", focus: ["Product", "AI"] });
  const data = resume({ id: "data", focus: ["Data", "Analyst"] });
  const general = resume({ id: "general", focus: [] });

  it("weights title matches above description matches", () => {
    const job = { title: "Data Analyst", description: "Partner with Product and AI teams" };
    expect(chooseResumeVersion([product, data, general], job)?.id).toBe("data");
  });

  it("falls back to the first version when nothing matches", () => {
    expect(chooseResumeVersion([general, product], { title: "Chef", description: "" })?.id).toBe("general");
  });

  it("returns null when there are no versions", () => {
    expect(chooseResumeVersion([], { title: "x", description: "" })).toBeNull();
  });
});

describe("isDue", () => {
  const at = (iso: string) => new Date(iso);
  it("runs immediately when never run, and never for manual schedules", () => {
    expect(isDue(prefs({ lastRunAt: null }))).toBe(true);
    expect(isDue(prefs({ frequency: "manual", lastRunAt: null }))).toBe(false);
  });

  it("tolerates a daily cron firing slightly early", () => {
    const p = prefs({ frequency: "daily", lastRunAt: "2026-11-01T00:00:00Z" });
    expect(isDue(p, at("2026-11-01T21:00:00Z"))).toBe(true);
    expect(isDue(p, at("2026-11-01T12:00:00Z"))).toBe(false);
  });

  it("waits about a week for weekly schedules", () => {
    const p = prefs({ frequency: "weekly", lastRunAt: "2026-11-01T00:00:00Z" });
    expect(isDue(p, at("2026-11-05T00:00:00Z"))).toBe(false);
    expect(isDue(p, at("2026-11-08T00:00:00Z"))).toBe(true);
  });
});
