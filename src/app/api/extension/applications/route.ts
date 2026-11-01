import { authenticateExtension, json, preflight } from "@/lib/extension-auth";
import { store } from "@/lib/store";

export const OPTIONS = preflight;

const normalise = (url: string) => url.replace(/[?#].*$/, "").replace(/\/(apply|application)\/?$/, "").replace(/\/$/, "").toLowerCase();

/** Applications being prepared; `?url=` returns the one whose posting matches the open page. */
export async function GET(request: Request) {
  const userId = await authenticateExtension(request);
  if (!userId) return json({ error: "Invalid or missing extension token" }, 401);

  const apps = (await store({ system: true }).list(userId, "applications")).filter(a => a.status === "preparing");
  const pageUrl = new URL(request.url).searchParams.get("url");
  const match = pageUrl ? apps.find(a => a.url && normalise(pageUrl).startsWith(normalise(a.url))) : undefined;
  return json({
    match: match?.id ?? null,
    applications: apps.map(a => ({ id: a.id, company: a.company, title: a.title, url: a.url })),
  });
}
