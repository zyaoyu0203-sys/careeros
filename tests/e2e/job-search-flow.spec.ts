import { chromium, expect, test } from "@playwright/test";
import { mkdtempSync, readFileSync } from "fs";
import os from "os";
import path from "path";

// One journey through the core product, in order: onboarding → a role → an application pack →
// a tracked application. Tests share one data file, so they run serially.
test.describe.configure({ mode: "serial" });

test("new users are sent to onboarding and can finish it", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByRole("heading", { name: "Start fast" })).toBeVisible();

  await page.getByRole("button", { name: "Use demo profile" }).click();
  await expect(page.getByText("Step 2 of 7")).toBeVisible();
  await expect(page.getByLabel("Full name")).toHaveValue("Alex Chen");

  // Work through the remaining steps; each Continue saves progress.
  for (const step of ["Education", "Experience library", "Skills & languages", "Application answers", "Job search"]) {
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: step, level: 1 })).toBeVisible();
  }
  await page.getByRole("button", { name: "Finish and open my portal" }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Alex Chen" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Jobs" }).first()).toBeVisible();
  await expect(page.getByRole("region", { name: "What CareerOS is doing for you" })).toBeVisible();
});

test("validation stops onboarding when a required answer is missing", async ({ page }) => {
  // Onboarding is finished at this point, so the app opens on the portal instead.
  await page.goto("/onboarding");
  await page.getByLabel("Full name").fill("");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /name and email/ })).toBeVisible();
});

test("a role added by hand becomes an application pack and then a tracked application", async ({ page }) => {
  await page.goto("/jobs/new");
  await page.getByLabel("Company").fill("Harbour Fintech");
  await page.getByLabel("Job title").fill("Product Analyst Intern");
  await page.getByLabel("Location").fill("Hong Kong");
  await page.getByLabel("Link to the posting").fill("https://example.com/jobs/42");
  await page.getByLabel("Job description").fill("Analyse product metrics with SQL and Python and run user research.");
  await page.getByRole("button", { name: "Add and score" }).click();

  await expect(page).toHaveURL(/\/jobs\?id=job_/);
  await expect(page.getByRole("heading", { name: "Product Analyst Intern", level: 2 })).toBeVisible();
  await expect(page.getByText("Title matches your target roles")).toBeVisible();

  await page.getByRole("button", { name: "Prepare application" }).click();
  await expect(page).toHaveURL(/\/applications\/app_/);
  await expect(page.getByRole("heading", { name: "Product Analyst Intern" })).toBeVisible();
  // Answers come straight from the knowledge base.
  await expect(page.getByText("alex.chen@example.com")).toBeVisible();
  await expect(page.getByText("Hong Kong student visa — eligible for internships")).toBeVisible();

  await page.getByRole("button", { name: "I've submitted it" }).click();
  await expect(page.getByText(/^Submitted /)).toBeVisible();

  await page.goto("/applications");
  const row = page.getByRole("row", { name: /Product Analyst Intern/ });
  await expect(row.getByRole("combobox")).toHaveValue("applied");

  // Moving it forward is recorded in the history and reflected in Insights.
  await row.getByRole("combobox").selectOption("interview");
  await expect(row.getByRole("combobox")).toHaveValue("interview");
  await page.goto("/insights");
  await expect(page.getByText("Interview rate", { exact: true }).locator("..")).toContainText("100%");
});

test("editing the knowledge base rebuilds resume versions", async ({ page }) => {
  await page.goto("/profile");
  await page.getByLabel("Headline").fill("Product analytics · SQL · user research");
  await page.getByRole("button", { name: "Save knowledge base" }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();

  await page.goto("/resumes");
  await expect(page.getByText("Product analytics · SQL · user research")).toBeVisible();
});

test("the browser extension fills an employer form and records the submission", async ({ page, baseURL }) => {
  // A role whose posting lives on a Greenhouse URL, prepared as an application.
  const postingUrl = "https://boards.greenhouse.io/careeros-test/jobs/123";
  await page.goto("/jobs/new");
  await page.getByLabel("Company").fill("Northwind Payments");
  await page.getByLabel("Job title").fill("AI Product Intern");
  await page.getByLabel("Link to the posting").fill(postingUrl);
  await page.getByLabel("Job description").fill("Product work on AI features.");
  await page.getByRole("button", { name: "Add and score" }).click();
  await page.getByRole("button", { name: "Prepare application" }).click();
  await expect(page).toHaveURL(/\/applications\/app_/);
  const appId = page.url().split("/").pop()!;

  await page.goto("/settings");
  await page.getByRole("button", { name: "Generate token" }).click();
  const token = (await page.locator("code", { hasText: "cos_" }).textContent())!.trim();

  // Real Chromium with the unpacked extension; the employer page is served from the fixture.
  const extensionPath = path.resolve("extension");
  const context = await chromium.launchPersistentContext(mkdtempSync(path.join(os.tmpdir(), "careeros-ext-")), {
    channel: "chromium",
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
  });
  try {
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
    // Runs inside the extension's service worker, where `chrome` is the extension API.
    type ExtensionGlobal = { chrome: { storage: { local: { set(items: object): Promise<void> } } } };
    await worker.evaluate(([baseUrl, t]) => (globalThis as unknown as ExtensionGlobal).chrome.storage.local.set({ baseUrl, token: t }), [baseURL!, token]);
    await context.route(`${postingUrl}*`, route => route.fulfill({ contentType: "text/html", body: readFileSync("tests/e2e/fixtures/greenhouse-form.html", "utf8") }));

    const form = await context.newPage();
    await form.goto(`${postingUrl}#careeros-app=${appId}`);
    const panel = form.locator("#careeros-panel");
    await expect(panel).toContainText("AI Product Intern");
    await panel.getByRole("button", { name: "Fill application" }).click();
    await expect(panel).toContainText(/Filled \d+ fields and attached your resume/);

    await expect(form.getByLabel("First Name *")).toHaveValue("Alex");
    await expect(form.getByLabel("Last Name *")).toHaveValue("Chen");
    await expect(form.getByLabel("Email *")).toHaveValue("alex.chen@example.com");
    await expect(form.getByLabel("Will you now or in the future require visa sponsorship?")).toHaveValue("0");
    await expect(form.getByLabel("Why are you interested in AI products?")).toHaveValue(/research turns into a feature/);
    expect(await form.getByLabel("Resume/CV *").evaluate((i: HTMLInputElement) => i.files?.[0]?.name)).toBe("Alex_Chen_Resume.pdf");

    // The user submits; the extension only reports it.
    await form.getByRole("button", { name: "Submit application" }).click();
    await expect(panel).toContainText("Application recorded in CareerOS");
  } finally {
    await context.close();
  }

  await page.goto(`/applications/${appId}`);
  await expect(page.getByText(/^Submitted \d/)).toBeVisible();
  await expect(page.getByPlaceholder("Recruiter name, referral, interview dates…")).toHaveValue(/confirmation detected by the CareerOS extension/);
});

test("the extension labels each field correctly on the newer Greenhouse layout and fills dropdowns", async ({ page, baseURL }) => {
  const postingUrl = "https://job-boards.greenhouse.io/careeros-test/jobs/456";
  await page.goto("/jobs/new");
  await page.getByLabel("Company").fill("Northwind Labs");
  await page.getByLabel("Job title").fill("AI Product Intern II");
  await page.getByLabel("Link to the posting").fill(postingUrl);
  await page.getByLabel("Job description").fill("AI product work.");
  await page.getByRole("button", { name: "Add and score" }).click();
  await page.getByRole("button", { name: "Prepare application" }).click();
  await expect(page).toHaveURL(/\/applications\/app_/);
  const appId = page.url().split("/").pop()!;
  await page.goto("/settings");
  await page.getByRole("button", { name: /Generate (a new )?token/ }).click();
  const token = (await page.locator("code", { hasText: "cos_" }).textContent())!.trim();

  const extensionPath = path.resolve("extension");
  const context = await chromium.launchPersistentContext(mkdtempSync(path.join(os.tmpdir(), "careeros-ext-")), {
    channel: "chromium",
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
  });
  try {
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
    type ExtensionGlobal = { chrome: { storage: { local: { set(items: object): Promise<void> } } } };
    await worker.evaluate(([baseUrl, t]) => (globalThis as unknown as ExtensionGlobal).chrome.storage.local.set({ baseUrl, token: t }), [baseURL!, token]);
    await context.route(`${postingUrl}*`, route => route.fulfill({ contentType: "text/html", body: readFileSync("tests/e2e/fixtures/greenhouse-new-form.html", "utf8") }));

    const form = await context.newPage();
    await form.goto(`${postingUrl}#careeros-app=${appId}`);
    const panel = form.locator("#careeros-panel");
    await panel.getByRole("button", { name: "Fill application" }).click();
    await expect(panel).toContainText(/Filled \d+ fields/);

    // Each field gets its own answer — not the first label in the form.
    await expect(form.locator("#first_name")).toHaveValue("Alex");
    await expect(form.locator("#last_name")).toHaveValue("Chen");
    await expect(form.locator("#email")).toHaveValue("alex.chen@example.com");
    await expect(form.locator("#phone")).toHaveValue("+852 5555 0100");
    await expect(form.locator("#question_linkedin")).toHaveValue("linkedin.com/in/alex-chen-example");
    await expect(form.locator("#preferred_name")).toHaveValue("Alex");
    // Dropdown chosen from its options; nothing typed into the search box.
    await expect(form.locator(".field-wrapper", { hasText: "sponsorship" }).locator(".select__single-value")).toHaveText("No");
    await expect(form.locator("#question_sponsor")).toHaveValue("");
    // AI is unreachable in tests, so the open questions are listed for the user rather than guessed.
    await expect(panel).toContainText("Needs your answer");
    await expect(panel).toContainText("Please describe your experience with AI");
    expect(await form.locator("#resume").evaluate((i: HTMLInputElement) => i.files?.[0]?.name)).toBe("Alex_Chen_Resume.pdf");
  } finally {
    await context.close();
  }
});
