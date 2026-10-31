import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { supabaseConfigured } from "@/lib/store";
import { serverSupabase } from "@/lib/supabase/server";

export const LOCAL_USER_ID = "local-user";

/** The signed-in user's id; redirects to /login when there is none. */
export async function requireUserId(): Promise<string> {
  // Per-user data: never prerender at build time.
  await connection();
  if (!supabaseConfigured) {
    // Local mode has no sign-in, so it must never be reachable on a deployment.
    if (process.env.VERCEL) throw new Error("Supabase is not configured for this deployment");
    return LOCAL_USER_ID;
  }
  const supabase = await serverSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user.id;
}

export async function currentUserEmail(): Promise<string | null> {
  if (!supabaseConfigured) return null;
  const supabase = await serverSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email ?? null;
}
