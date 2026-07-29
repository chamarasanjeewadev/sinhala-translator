# Promo Codes — Admin Runbook

There are **two independent kinds** of promo code. They live in different places
and you manage them differently. Percentage discounts only exist for purchases
(Stripe); free-credit grants only exist in-app (the database).

| | Track 1 — Discount on a purchase | Track 2 — Free credits (no purchase) |
|---|---|---|
| Example | "SAVE50" = 50% off a pack | "LAW26" = 60 free credits |
| Where it applies | Web checkout (Stripe) | Mobile "Redeem" button |
| Managed in | **Stripe Dashboard** | **Supabase Table Editor** (`promo_codes`) |
| Supports % off | ✅ | ❌ (grants a fixed credit amount) |
| Needs a deploy to add/expire | ❌ | ❌ |

---

## Track 1 — Discount codes (Stripe)

The app sets `allow_promotion_codes: true` on checkout, so it accepts **any
active promotion code** the customer types — you never touch code to add one.

### Add a code
1. Stripe Dashboard → **Product catalog → Coupons → New**.
   - `Percent off` (e.g. 50%) or `Amount off`.
   - Optional: **Redemption limits** → max redemptions (total), and expiry date
     (`redeem_by`).
2. On the coupon, **Add promotion code** → set the customer-facing text
   (e.g. `SAVE50`). Optional restrictions:
   - **Limit to first-time customers** — closest thing to "once per customer."
     Works because checkout reuses one Stripe customer per user; once they've
     paid once, the code stops applying.
   - **Minimum order amount**, per-code max redemptions.

### Expire / disable a code
- Stripe Dashboard → the promotion code → **Archive** (stops new redemptions
  immediately), or let `redeem_by` pass.

### Caveats
- A code applies to **whatever pack** the customer is buying — Stripe can't scope
  a coupon to specific packs while checkout uses inline `price_data`. So a "50%
  off" code discounts the $50 pack too. Bound your exposure with the coupon's
  `max_redemptions` / `redeem_by`.
- Stripe has **no native "once per existing customer"** for a shared code — only
  first-time-customer. For hard one-per-person on discounts you'd need
  per-customer unique codes (heavier).

### If you need per-pack targeting later
Migrate checkout from inline `price_data` to real Stripe **Product/Price**
objects (one Price per pack), then coupons can be restricted to specific
products. This is a code change in `src/app/api/stripe/checkout/route.ts` plus
creating Products/Prices in Stripe. Ask a dev to scope it — it touches the
payment path and needs testing.

---

## Track 2 — Free-credit codes (Supabase)

Stored in the `promo_codes` table. Enforced atomically by `redeem_promo_code()`:
one redemption per normalized email (kills Gmail dot/+alias multi-accounts),
plus global cap, expiry, and an active flag.

### Add a code (no SQL — Supabase Table Editor)
Supabase → **Table Editor → `promo_codes` → Insert row**:
| Column | Meaning |
|---|---|
| `code` | UPPERCASE code text, e.g. `LAW26` |
| `credits` | how many credits to grant |
| `description` | shows on the user's transaction ledger |
| `max_redemptions` | total cap across all users; leave empty = unlimited |
| `expires_at` | date picker; leave empty = never |
| `active` | toggle off to disable instantly |

Leave `redeemed_count` at 0 — the system increments it.

### Or via SQL
```sql
insert into public.promo_codes (code, credits, description, max_redemptions, expires_at)
values ('NEWYEAR', 100, 'New Year 100 credits', 1000, '2027-01-31 23:59:59+00');
```

### Expire / disable a code
```sql
-- hard off:
update public.promo_codes set active = false where code = 'LAW26';
-- or let it lapse:
update public.promo_codes set expires_at = now() where code = 'LAW26';
```

### See how many times a code was used
```sql
select code, credits, redeemed_count, max_redemptions, expires_at, active
from public.promo_codes order by code;
```

### Notes
- Percentage discounts don't apply here — there's no price to reduce. If you want
  "50% off," that's a Track 1 (Stripe) code.
- The mobile app shows a generic "invalid" message for expired/exhausted codes
  (it only special-cases "already redeemed"). Fine for now; distinct messages
  need dictionary keys.
