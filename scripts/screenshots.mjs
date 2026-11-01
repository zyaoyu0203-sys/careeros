// Captures README screenshots from a running local server loaded with the demo workspace:
//   npm run demo:local && npm run dev   (then)   node scripts/screenshots.mjs
import { chromium } from "@playwright/test";

const base = process.env.BASE_URL ?? "http://localhost:3100";
const shots = [
  ["home", "/"],
  ["jobs", "/jobs"],
  ["insights", "/insights"],
  ["settings", "/settings"],
];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1360, height: 900 }, deviceScaleFactor: 2 });
for (const [name, path] of shots) {
  await page.goto(base + path, { waitUntil: "networkidle" });
  await page.screenshot({ path: `docs/images/${name}.png` });
}
await browser.close();
