import { NextResponse } from "next/server";
import { getSignupBonusConfig } from "@/lib/app-settings";

// Public, unauthenticated marketing config for the mobile app (and any other
// client) to keep its "free credits" copy in sync with the admin-controlled
// signup bonus. Exposes only the two already-public values — the free-tier
// ON/OFF state and the grant amount — never any account data, so it's safe to
// serve without auth and to cache briefly at the edge.
export async function GET() {
  const { enabled, amount } = await getSignupBonusConfig();
  const res = NextResponse.json({
    freeTierEnabled: enabled,
    freeCredits: amount,
  });
  // Short cache: admin changes surface within a minute without hammering the DB.
  res.headers.set("Cache-Control", "public, max-age=60, s-maxage=60");
  return res;
}
