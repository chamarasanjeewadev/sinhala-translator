-- Client invoices for manual / B2B transcription jobs, created in the admin
-- app (admin.helavoice.lk/invoices). Independent of the credit ledger: an
-- invoice records what a client is billed, it never grants or deducts credits.
-- Only the admin app's service-role server fns touch these tables, so RLS is
-- on with no policies.

CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL UNIQUE,                 -- HV-YYYYMMDD-NN
  client_name text NOT NULL DEFAULT '',
  client_email text,
  project text NOT NULL DEFAULT '',
  currency text NOT NULL DEFAULT 'USD',
  issued_on date NOT NULL DEFAULT current_date,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'paid', 'void')),
  -- Credit rate the transcription lines are priced at, e.g. Starter 60 / 500c.
  rate_label text NOT NULL DEFAULT '',
  rate_credits integer NOT NULL CHECK (rate_credits > 0),
  rate_price_cents integer NOT NULL CHECK (rate_price_cents >= 0),
  notes text NOT NULL DEFAULT '',              -- "Pricing & delivery", one point per line
  total_cents integer NOT NULL DEFAULT 0,      -- denormalised for the list view
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices (id) ON DELETE CASCADE,
  position integer NOT NULL,
  kind text NOT NULL CHECK (kind IN ('transcription', 'fee')),
  title text NOT NULL DEFAULT '',
  file_name text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  duration text,                               -- "17:27"; null renders "Not supplied"
  credits integer NOT NULL DEFAULT 0 CHECK (credits >= 0),
  complimentary boolean NOT NULL DEFAULT false,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),   -- fee lines
  unit_cents integer NOT NULL DEFAULT 0 CHECK (unit_cents >= 0), -- fee lines
  amount_cents integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS invoice_items_invoice_idx ON public.invoice_items (invoice_id, position);
CREATE INDEX IF NOT EXISTS invoices_issued_on_idx ON public.invoices (issued_on DESC);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
-- No policies: only the service-role key (admin server functions) bypasses RLS.
