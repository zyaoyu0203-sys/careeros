import { expect, test, type Page } from "@playwright/test";

// Crawls every screen — and every job, resume and application detail — and fails on any server
// error, error boundary, or uncaught browser exception. Runs after the flow tests, so the
// workspace has a profile, roles, resumes and applications to render.

const BROKEN = /didn't load|Application error|server-side exception|Internal Server Error/i;

async function visit(page: Page, path: string, errors: string[]) {
  const response = await page.goto(path);
  expect(response?.status(), `${path} status`).toBeLessThan(500);
  await expect(page.locator("body"), `${path} rendered an error`).not.toContainText(BROKEN);
  expect(errors, `${path} threw in the browser`).toEqual([]);
}

test("every page and detail view renders without errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));

  for (const path of ["/", "/jobs", "/jobs?view=all", "/jobs?view=saved", "/jobs/new", "/resumes", "/resumes?new=1", "/applications", "/applications?add=1", "/insights", "/profile", "/settings", "/onboarding"]) {
    await visit(page, path, errors);
  }

  await page.goto("/jobs?view=all");
  const jobLinks = await page.locator("ul a[href*='id=job_']").evaluateAll(as => as.map(a => (a as HTMLAnchorElement).getAttribute("href")!));
  expect(jobLinks.length).toBeGreaterThan(0);
  for (const href of jobLinks) await visit(page, href, errors);

  await page.goto("/resumes");
  const resumeLinks = await page.locator("nav[aria-label='Resumes'] a").evaluateAll(as => as.map(a => (a as HTMLAnchorElement).getAttribute("href")!));
  for (const href of resumeLinks) {
    await visit(page, href, errors);
    await visit(page, href.replace("/resumes?id=", "/print/resume/"), errors);
  }

  await page.goto("/applications");
  const appLinks = await page.locator("a[href^='/applications/app_']").evaluateAll(as => as.map(a => (a as HTMLAnchorElement).getAttribute("href")!));
  expect(appLinks.length).toBeGreaterThan(0);
  for (const href of appLinks) await visit(page, href, errors);
});

test("AI failures degrade to a message instead of breaking the page", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));

  // A role without a tailored resume shows the AI action; the AI endpoint is unreachable in tests.
  await page.goto("/jobs/new");
  await page.getByLabel("Company").fill("Offline Labs");
  await page.getByLabel("Job title").fill("Data Analyst Intern");
  await page.getByLabel("Link to the posting").fill("https://example.com/jobs/offline");
  await page.getByLabel("Job description").fill("SQL and dashboards.");
  await page.getByRole("button", { name: "Add and score" }).click();
  await expect(page.getByRole("heading", { name: "Data Analyst Intern", level: 2 })).toBeVisible();

  await page.getByRole("button", { name: "Tailor resume" }).click();
  await expect(page.getByRole("status")).toContainText(/fetch failed|ECONNREFUSED|couldn't|DeepSeek|error/i);
  await expect(page.locator("body")).not.toContainText(BROKEN);
  expect(errors).toEqual([]);
});
