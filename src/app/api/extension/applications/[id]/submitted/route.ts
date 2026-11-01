import { revalidatePath } from "next/cache";
import { authenticateExtension, json, preflight } from "@/lib/extension-auth";
import { store } from "@/lib/store";

export const OPTIONS = preflight;

/**
 * Called by the extension after it sees the employer's confirmation page. The user clicked
 * Submit themselves; this only records it, with the confirmation page as evidence.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await authenticateExtension(request);
  if (!userId) return json({ error: "Invalid or missing extension token" }, 401);

  const { confirmationUrl, confirmationText } = (await request.json().catch(() => ({}))) as { confirmationUrl?: string; confirmationText?: string };
  const db = store({ system: true });
  const { id } = await params;
  const app = await db.get(userId, "applications", id);
  if (!app) return json({ error: "Application not found" }, 404);
  if (app.status !== "preparing") return json({ ok: true, alreadyRecorded: true });

  const now = new Date().toISOString();
  const evidence = [`Submitted on the employer's site; confirmation detected by the CareerOS extension.`, confirmationUrl && `Confirmation page: ${confirmationUrl}`, confirmationText && `“${confirmationText.slice(0, 160)}”`]
    .filter(Boolean)
    .join("\n");
  await db.put(userId, "applications", id, {
    ...app,
    status: "applied",
    appliedAt: now,
    notes: [app.notes, evidence].filter(Boolean).join("\n\n"),
    history: [...app.history, { status: "applied", at: now }],
    updatedAt: now,
  });
  revalidatePath("/", "layout");
  return json({ ok: true });
}
