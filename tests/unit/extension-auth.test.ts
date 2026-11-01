import { mkdtempSync, rmSync } from "fs";
import os from "os";
import path from "path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ serverSupabase: vi.fn() }));

const dir = mkdtempSync(path.join(os.tmpdir(), "careeros-auth-"));
let auth: typeof import("@/lib/extension-auth");

beforeAll(async () => {
  vi.stubEnv("CAREEROS_DATA_FILE", path.join(dir, "db.json"));
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  auth = await import("@/lib/extension-auth");
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const request = (token?: string) => new Request("http://x/api/extension/applications", { headers: token ? { Authorization: `Bearer ${token}` } : {} });

describe("extension tokens", () => {
  it("accepts the issued token and resolves its user", async () => {
    const token = await auth.issueExtensionToken("user-a");
    expect(token).toMatch(/^cos_user-a\./);
    expect(await auth.authenticateExtension(request(token))).toBe("user-a");
  });

  it("rejects missing, malformed, tampered and rotated tokens", async () => {
    const old = await auth.issueExtensionToken("user-b");
    const current = await auth.issueExtensionToken("user-b");
    expect(await auth.authenticateExtension(request())).toBeNull();
    expect(await auth.authenticateExtension(request("not-a-token"))).toBeNull();
    expect(await auth.authenticateExtension(request(`${current.slice(0, -1)}x`))).toBeNull();
    expect(await auth.authenticateExtension(request(old))).toBeNull();
    expect(await auth.authenticateExtension(request(current))).toBe("user-b");
  });

  it("can't be used for another user by swapping the id", async () => {
    const token = await auth.issueExtensionToken("user-c");
    await auth.issueExtensionToken("user-d");
    expect(await auth.authenticateExtension(request(token.replace("user-c", "user-d")))).toBeNull();
  });
});
