import * as z from "zod/v4";
import { aiAvailable, answerFormFields } from "@/lib/ai/llm";
import { authenticateExtension, json, preflight } from "@/lib/extension-auth";
import { store } from "@/lib/store";

export const OPTIONS = preflight;
export const maxDuration = 60;

const Body = z.object({
  fields: z
    .array(
      z.object({
        id: z.number().int(),
        label: z.string().max(400),
        kind: z.enum(["text", "long", "select", "choice"]),
        options: z.array(z.string().max(200)).max(400),
        required: z.boolean(),
      }),
    )
    .max(60),
});

/** AI answers for form questions the extension's fixed rules couldn't fill. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await authenticateExtension(request);
  if (!userId) return json({ error: "Invalid or missing extension token" }, 401);
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid request" }, 400);
  if (!aiAvailable()) return json({ answers: [], note: "AI is not configured" });

  const db = store({ system: true });
  const { id } = await params;
  const [app, profile] = await Promise.all([db.get(userId, "applications", id), db.get(userId, "profile", "me")]);
  if (!app || !profile) return json({ error: "Application not found" }, 404);

  try {
    const answers = await answerFormFields(profile, { company: app.company, title: app.title }, parsed.data.fields);
    return json({ answers });
  } catch (error) {
    console.error("Form answers failed", error);
    return json({ answers: [], note: "AI unavailable right now" });
  }
}
