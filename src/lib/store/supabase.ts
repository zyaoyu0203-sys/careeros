import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { serverSupabase } from "@/lib/supabase/server";
import type { Store } from "./index";

// Rows live in `public.records` (see supabase/migrations). Requests made on behalf of a
// signed-in user go through their session so row-level security applies; the scheduled
// discovery job has no session and uses the service-role client instead.

function adminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for background jobs");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false } });
}

export function supabaseStore(system: boolean): Store {
  const client = (): Promise<SupabaseClient> | SupabaseClient => (system ? adminClient() : serverSupabase());

  const putMany: Store["putMany"] = async (userId, collection, rows) => {
    if (!rows.length) return;
    const db = await client();
    const { error } = await db.from("records").upsert(
      rows.map(row => ({ user_id: userId, collection, id: row.id, data: row.data, updated_at: new Date().toISOString() })),
    );
    if (error) throw error;
  };

  return {
    async list(userId, collection) {
      const db = await client();
      const { data, error } = await db.from("records").select("data").eq("user_id", userId).eq("collection", collection);
      if (error) throw error;
      return (data ?? []).map(row => row.data) as never;
    },
    async get(userId, collection, id) {
      const db = await client();
      const { data, error } = await db
        .from("records")
        .select("data")
        .eq("user_id", userId)
        .eq("collection", collection)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data?.data ?? null) as never;
    },
    async put(userId, collection, id, data) {
      await putMany(userId, collection, [{ id, data }]);
    },
    putMany,
    async remove(userId, collection, id) {
      const db = await client();
      const { error } = await db.from("records").delete().eq("user_id", userId).eq("collection", collection).eq("id", id);
      if (error) throw error;
    },
    async usersWithPreferences() {
      const { data, error } = await adminClient().from("records").select("user_id").eq("collection", "preferences");
      if (error) throw error;
      return [...new Set((data ?? []).map(row => row.user_id as string))];
    },
  };
}
