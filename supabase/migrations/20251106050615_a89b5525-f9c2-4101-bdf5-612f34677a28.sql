-- Add token field to checkin_records
ALTER TABLE public.checkin_records
ADD COLUMN IF NOT EXISTS token text UNIQUE,
ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.contacts(id);

-- Create fidelity_cards table
CREATE TABLE IF NOT EXISTS public.fidelity_cards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  fidelity_program_id uuid NOT NULL REFERENCES public.fidelity_programs(id) ON DELETE CASCADE,
  current_stamps integer NOT NULL DEFAULT 0,
  target_stamps integer NOT NULL,
  status text NOT NULL DEFAULT 'active',
  last_checkin_id uuid REFERENCES public.checkin_records(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(contact_id, fidelity_program_id)
);

-- Enable RLS on fidelity_cards
ALTER TABLE public.fidelity_cards ENABLE ROW LEVEL SECURITY;

-- RLS policies for fidelity_cards
CREATE POLICY "Users can view their own fidelity cards"
ON public.fidelity_cards
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.contacts
    WHERE contacts.id = fidelity_cards.contact_id
    AND contacts.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create fidelity cards for their contacts"
ON public.fidelity_cards
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.contacts
    WHERE contacts.id = fidelity_cards.contact_id
    AND contacts.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own fidelity cards"
ON public.fidelity_cards
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.contacts
    WHERE contacts.id = fidelity_cards.contact_id
    AND contacts.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own fidelity cards"
ON public.fidelity_cards
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.contacts
    WHERE contacts.id = fidelity_cards.contact_id
    AND contacts.user_id = auth.uid()
  )
);

-- Add trigger for updated_at on fidelity_cards
CREATE TRIGGER update_fidelity_cards_updated_at
BEFORE UPDATE ON public.fidelity_cards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();