import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAll, htmlToText } from "@/lib/sources";
import { prefs } from "../support/fixtures";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, statusText: status === 200 ? "OK" : "Not Found" });

afterEach(() => vi.unstubAllGlobals());

describe("htmlToText", () => {
  it("turns Greenhouse's escaped HTML into readable text", () => {
    const html = "&lt;p&gt;Hello &amp;amp; welcome&lt;/p&gt;&lt;ul&gt;&lt;li&gt;SQL&lt;/li&gt;&lt;li&gt;Python&lt;/li&gt;&lt;/ul&gt;";
    expect(htmlToText(html)).toBe("Hello &amp; welcome\n• SQL\n• Python");
  });
});

describe("fetchAll", () => {
  it("normalises each ATS into the same job shape", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("greenhouse")) {
          return json({ jobs: [{ id: 7, title: "Data Intern", location: { name: "Hong Kong" }, absolute_url: "https://gh/7", content: "&lt;p&gt;Hi&lt;/p&gt;", updated_at: "2026-10-01" }] });
        }
        if (url.includes("lever")) {
          return json([{ id: "a", text: "Product Intern", categories: { location: "Hong Kong", commitment: "Intern" }, hostedUrl: "https://lv/a", descriptionPlain: "About", lists: [{ text: "You will", content: "<li>Build</li>" }], createdAt: 1790000000000 }]);
        }
        return json({ jobs: [{ id: "z", title: "AI Analyst", location: "Hong Kong", jobUrl: "https://ash/z", descriptionPlain: "Desc" }] });
      }),
    );

    const { jobs, stats } = await fetchAll(prefs({ sources: { greenhouse: ["acme-co"], lever: ["levco"], ashby: ["ashco"], googleJobs: false } }));

    expect(stats.map(s => [s.label, s.fetched, s.error])).toEqual([
      ["Greenhouse/acme-co", 1, null],
      ["Lever/levco", 1, null],
      ["Ashby/ashco", 1, null],
    ]);
    expect(jobs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: "greenhouse", sourceId: "acme-co:7", company: "Acme Co", title: "Data Intern", description: "Hi" }),
        expect.objectContaining({ source: "lever", sourceId: "levco:a", location: "Hong Kong · Intern", description: "About\n\nYou will\n• Build" }),
        expect.objectContaining({ source: "ashby", sourceId: "ashco:z", url: "https://ash/z", postedAt: null }),
      ]),
    );
  });

  it("records a failing source without losing the others", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => (url.includes("missing") ? json({}, 404) : json({ jobs: [] }))),
    );
    const { jobs, stats } = await fetchAll(prefs({ sources: { greenhouse: ["missing", "fine"], lever: [], ashby: [], googleJobs: false } }));
    expect(jobs).toEqual([]);
    expect(stats.find(s => s.label === "Greenhouse/missing")?.error).toMatch(/404/);
    expect(stats.find(s => s.label === "Greenhouse/fine")?.error).toBeNull();
  });

  it("skips Google Jobs when no API key is configured", async () => {
    vi.stubEnv("SERPAPI_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { stats } = await fetchAll(prefs({ sources: { greenhouse: [], lever: [], ashby: [], googleJobs: true } }));
    expect(stats).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
