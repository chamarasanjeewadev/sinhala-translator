import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Free pages this account has already used. Only rows that consumed a free page
 * are read, so the result is bounded by the free allowance (scan_pages is
 * service-role only).
 */
export async function freePagesUsed(userId: string): Promise<number> {
  const { data, error } = await createAdminClient()
    .from("scan_pages")
    .select("free_pages")
    .eq("user_id", userId)
    .gt("free_pages", 0);
  if (error) throw error;
  return (data ?? []).reduce((sum, row) => sum + row.free_pages, 0);
}
