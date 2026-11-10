import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Free characters this account has already used. Only rows that consumed free
 * characters are read, so the result set is bounded by the free allowance
 * (tts_generations is service-role only; see the 2026-11 migration).
 */
export async function freeCharsUsed(userId: string): Promise<number> {
  const { data, error } = await createAdminClient()
    .from("tts_generations")
    .select("free_chars")
    .eq("user_id", userId)
    .gt("free_chars", 0);
  if (error) throw error;
  return (data ?? []).reduce((sum, row) => sum + row.free_chars, 0);
}
