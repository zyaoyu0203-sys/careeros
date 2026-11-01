import { defineConfig, devices } from "@playwright/test";

const PORT = 3200;
// BASE_URL runs the suite (e.g. the smoke crawl) against an already-running server instead.
const external = process.env.BASE_URL;

// Runs the production build in single-user local mode against a throwaway data file.
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: external ?? `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: external ? undefined : {
    command: `rm -f .data/e2e.json && npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/onboarding`,
    timeout: 240_000,
    reuseExistingServer: false,
    env: {
      NEXT_DIST_DIR: ".next-e2e",
      CAREEROS_DATA_FILE: ".data/e2e.json",
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      ANTHROPIC_API_KEY: "",
      // AI is "on" but unreachable: every AI-dependent screen renders, and every AI call fails —
      // the app has to degrade without crashing.
      DEEPSEEK_API_KEY: "e2e-unreachable",
      DEEPSEEK_BASE_URL: "http://127.0.0.1:9",
      SERPAPI_API_KEY: "",
    },
  },
});
