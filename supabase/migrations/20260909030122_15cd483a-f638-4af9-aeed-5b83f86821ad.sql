ALTER TABLE public.solar_proposals
  ADD COLUMN IF NOT EXISTS quote_number integer,
  ADD COLUMN IF NOT EXISTS seller_user_id uuid,
  ADD COLUMN IF NOT EXISTS valid_until date,
  ADD COLUMN IF NOT EXISTS payment_condition text,
  ADD COLUMN IF NOT EXISTS pdf_url text,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz;

WITH numbered AS (
  SELECT id, row_number() OVER (PARTITION BY company_id ORDER BY created_at, id) AS rn
  FROM public.solar_proposals
  WHERE quote_number IS NULL
)
UPDATE public.solar_proposals p
SET quote_number = n.rn
FROM numbered n
WHERE p.id = n.id;

CREATE UNIQUE INDEX IF NOT EXISTS solar_proposals_company_quote_number_idx
  ON public.solar_proposals (company_id, quote_number);

CREATE OR REPLACE FUNCTION public.set_solar_proposal_quote_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.quote_number IS NULL THEN
    SELECT COALESCE(MAX(quote_number), 0) + 1
      INTO NEW.quote_number
    FROM public.solar_proposals
    WHERE company_id = NEW.company_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_solar_proposal_quote_number ON public.solar_proposals;
CREATE TRIGGER trg_set_solar_proposal_quote_number
  BEFORE INSERT ON public.solar_proposals
  FOR EACH ROW EXECUTE FUNCTION public.set_solar_proposal_quote_number();