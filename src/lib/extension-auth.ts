import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { getPreferences } from "@/lib/data";
import { store } from "@/lib/store";

// Personal access tokens for the browser extension. The token embeds the user id so lookup is
// direct; only a SHA-256 hash is stored (in the user's preferences), so a leaked database row
// can't be replayed. Format: cos_<userId>.<secret>

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export async function issueExtensionToken(userId: string): Promise<string> {
  const token = `cos_${userId}.${randomBytes(24).toString("base64url")}`;
  const prefs = await getPreferences(userId);
  await store().put(userId, "preferences", "me", { ...prefs, extensionTokenHash: sha256(token) });
  return token;
}

/** Returns the user id for a valid `Authorization: Bearer cos_…` header, or null. */
export async function authenticateExtension(request: Request): Promise<string | null> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const match = /^cos_([A-Za-z0-9-]+)\.[A-Za-z0-9_-]{20,}$/.exec(token);
  if (!match) return null;
  const userId = match[1];
  const prefs = await getPreferences(userId, { system: true }).catch(() => null);
  if (!prefs?.extensionTokenHash) return null;
  const a = Buffer.from(sha256(token));
  const b = Buffer.from(prefs.extensionTokenHash);
  return a.length === b.length && timingSafeEqual(a, b) ? userId : null;
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export const json = (body: unknown, status = 200) => Response.json(body, { status, headers: corsHeaders });
export const preflight = () => new Response(null, { status: 204, headers: corsHeaders });
