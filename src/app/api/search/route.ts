import { revalidatePath } from "next/cache";
import { getPreferences } from "@/lib/data";
import { runDiscovery } from "@/lib/discovery";
import { requireUserId } from "@/lib/session";
import { sourceLabels } from "@/lib/sources";

export const maxDuration = 300;

/**
 * Runs a search for the signed-in user and streams progress as NDJSON:
 * a `plan` event listing the sources, one `source` event as each finishes, `phase` events, then `done`.
 */
export async function POST() {
  const userId = await requireUserId();
  const prefs = await getPreferences(userId);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: object) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      send({ type: "plan", sources: sourceLabels(prefs) });
      try {
        const run = await runDiscovery(userId, { trigger: "manual", onEvent: send });
        revalidatePath("/", "layout");
        send({ type: "done", run });
      } catch (error) {
        send({ type: "error", message: error instanceof Error ? error.message : String(error) });
      }
      controller.close();
    },
  });

  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" } });
}
