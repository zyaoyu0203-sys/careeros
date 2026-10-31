import { mkdtempSync, rmSync } from "fs";
import os from "os";
import path from "path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Store } from "@/lib/store";
import { job } from "../support/fixtures";

vi.mock("@/lib/supabase/server", () => ({ serverSupabase: vi.fn() }));

let dir: string;
let fileStore: Store;

beforeAll(async () => {
  // The store resolves its file from the working directory at import time.
  dir = mkdtempSync(path.join(os.tmpdir(), "careeros-store-"));
  vi.spyOn(process, "cwd").mockReturnValue(dir);
  ({ fileStore } = await import("@/lib/store/file"));
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("fileStore", () => {
  it("round-trips records per user and collection", async () => {
    await fileStore.put("u1", "jobs", "j1", job({ id: "j1" }));
    expect(await fileStore.get("u1", "jobs", "j1")).toMatchObject({ id: "j1" });
    expect(await fileStore.get("u2", "jobs", "j1")).toBeNull();
    await fileStore.remove("u1", "jobs", "j1");
    expect(await fileStore.list("u1", "jobs")).toEqual([]);
  });

  it("serialises concurrent writes so none are lost", async () => {
    await Promise.all(Array.from({ length: 25 }, (_, i) => fileStore.put("u3", "jobs", `j${i}`, job({ id: `j${i}` }))));
    expect(await fileStore.list("u3", "jobs")).toHaveLength(25);
  });

  it("finds users with preferences for the scheduled search", async () => {
    await fileStore.put("u4", "preferences", "me", {} as never);
    expect(await fileStore.usersWithPreferences()).toEqual(["u4"]);
  });
});
