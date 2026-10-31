import { expect, test } from "@playwright/test";

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
  await expect(page.getByRole("alert")).toHaveText(/name and email/);
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
  await expect(page.getByText("Interview rate").locator("..")).toContainText("100%");
});

test("editing the knowledge base rebuilds resume versions", async ({ page }) => {
  await page.goto("/profile");
  await page.getByLabel("Headline").fill("Product analytics · SQL · user research");
  await page.getByRole("button", { name: "Save knowledge base" }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();

  await page.goto("/resumes");
  await expect(page.getByText("Product analytics · SQL · user research")).toBeVisible();
});
