import "server-only";
import type { CollectionName, Collections } from "@/lib/types";
import { fileStore } from "./file";
import { supabaseStore } from "./supabase";

export interface Store {
  list<C extends CollectionName>(userId: string, collection: C): Promise<Collections[C][]>;
  get<C extends CollectionName>(userId: string, collection: C, id: string): Promise<Collections[C] | null>;
  put<C extends CollectionName>(userId: string, collection: C, id: string, data: Collections[C]): Promise<void>;
  putMany<C extends CollectionName>(userId: string, collection: C, rows: { id: string; data: Collections[C] }[]): Promise<void>;
  remove(userId: string, collection: CollectionName, id: string): Promise<void>;
  /** All user ids that have saved preferences — used by the scheduled discovery job. */
  usersWithPreferences(): Promise<string[]>;
}

export const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

/** `system` bypasses the user session (service role) — only for scheduled jobs. */
export function store({ system = false } = {}): Store {
  return supabaseConfigured ? supabaseStore(system) : fileStore;
}
