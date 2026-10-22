-- LKR amounts on client invoices. Lines stay priced in USD cents (credit packs
-- are USD); an invoice can additionally show LKR, converted at the Central
-- Bank of Sri Lanka indicative USD/LKR spot rate captured when it was made.
-- display_currency: USD (default, as before) | LKR | BOTH.

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS display_currency text NOT NULL DEFAULT 'USD'
    CHECK (display_currency IN ('USD', 'LKR', 'BOTH')),
  ADD COLUMN IF NOT EXISTS lkr_rate numeric(12, 4)
    CHECK (lkr_rate IS NULL OR lkr_rate > 0),   -- LKR per 1 USD
  ADD COLUMN IF NOT EXISTS lkr_rate_date date;  -- CBSL publication date of that rate
