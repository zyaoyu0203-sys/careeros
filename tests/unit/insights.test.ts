import { describe, expect, it } from "vitest";
import { everReached, funnel, outcomesBySource, performanceByResume, sourceHealth, weeklyApplications } from "@/lib/insights";
import { app, job, resume, run } from "../support/fixtures";

describe("everReached", () => {
  it("counts an interview even if the application was later rejected", () => {
    expect(everReached(app("a", ["preparing", "applied", "interview", "rejected"]), ["interview"])).toBe(true);
    expect(everReached(app("b", ["preparing", "applied", "rejected"]), ["interview"])).toBe(false);
  });
});

describe("funnel", () => {
  it("computes each step and its conversion from the previous step", () => {
    const jobs = [job({ id: "1", status: "applying" }), job({ id: "2", status: "saved" }), job({ id: "3" }), job({ id: "4", status: "dismissed" })];
    const apps = [
      app("a", ["preparing", "applied", "interview", "offer"], { jobId: "1" }),
      app("b", ["preparing", "applied", "rejected"]), // logged elsewhere: no job
      app("c", ["preparing"], { jobId: "2" }),
    ];
    const steps = funnel(jobs, apps);
    expect(steps.map(s => [s.label, s.count])).toEqual([
      ["Roles pushed", 4],
      ["Shortlisted", 3],
      ["Applied", 2],
      ["Assessment or interview", 1],
      ["Offer", 1],
    ]);
    expect(steps[0].rateFromPrevious).toBeNull();
    expect(steps[3].rateFromPrevious).toBe(0.5);
  });
});

describe("performanceByResume", () => {
  it("attributes tailored resumes to the version they were cut from", () => {
    const resumes = [
      resume({ id: "product", name: "Product" }),
      resume({ id: "data", name: "Data" }),
      resume({ id: "t1", kind: "tailored", baseId: "product" }),
    ];
    const apps = [
      app("a", ["applied", "interview"], { resumeId: "t1" }),
      app("b", ["applied", "rejected"], { resumeId: "product" }),
      app("c", ["applied"], { resumeId: "data" }),
      app("d", ["preparing"], { resumeId: "data" }), // not submitted: excluded
    ];
    const rows = performanceByResume(apps, resumes);
    expect(rows).toEqual([
      { resumeId: "product", name: "Product", applied: 2, interviews: 1, rate: 0.5 },
      { resumeId: "data", name: "Data", applied: 1, interviews: 0, rate: 0 },
    ]);
  });
});

describe("outcomesBySource", () => {
  it("groups pushed roles, applications and interviews by job source", () => {
    const jobs = [job({ id: "g", source: "greenhouse" }), job({ id: "l", source: "lever" })];
    const apps = [app("a", ["applied", "interview"], { jobId: "g" }), app("b", ["applied"])];
    expect(outcomesBySource(jobs, apps)).toEqual([
      { source: "greenhouse", pushed: 1, applied: 1, interviews: 1 },
      { source: "other", pushed: 0, applied: 1, interviews: 0 },
      { source: "lever", pushed: 1, applied: 0, interviews: 0 },
    ]);
  });
});

describe("sourceHealth", () => {
  it("reports success rate, averages over successful runs, and the most recent error", () => {
    const runs = [
      run("2026-10-03", [{ label: "Lever/x", fetched: 10, ms: 100, error: null }]),
      run("2026-10-01", [{ label: "Lever/x", fetched: 0, ms: 300, error: "old failure" }]),
      run("2026-10-02", [{ label: "Lever/x", fetched: 0, ms: 200, error: "latest failure" }]),
      run("2026-10-04", [{ label: "Lever/x", fetched: 20, ms: 200, error: null }]),
    ];
    expect(sourceHealth(runs)).toEqual([{ label: "Lever/x", runs: 4, successRate: 0.5, avgFetched: 15, avgMs: 200, lastError: "latest failure" }]);
  });
});

describe("weeklyApplications", () => {
  it("buckets by Monday-start week and keeps empty weeks", () => {
    const now = new Date("2026-11-04T12:00:00Z"); // Wednesday
    const apps = [
      app("a", ["applied"], { appliedAt: "2026-11-02T01:00:00Z" }), // this week (Mon)
      app("b", ["applied"], { appliedAt: "2026-11-01T23:00:00Z" }), // previous week (Sun)
      app("c", ["applied"], { appliedAt: "2026-09-01T00:00:00Z" }), // outside the window
      app("d", ["preparing"], { appliedAt: null }),
    ];
    expect(weeklyApplications(apps, 3, now)).toEqual([
      { weekStart: "2026-10-19", count: 0 },
      { weekStart: "2026-10-26", count: 1 },
      { weekStart: "2026-11-02", count: 1 },
    ]);
  });
});
