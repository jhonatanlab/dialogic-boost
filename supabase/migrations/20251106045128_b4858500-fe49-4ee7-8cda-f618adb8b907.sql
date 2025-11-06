-- Drop old tables and create new structure for checkin system

-- Drop old tables if they exist
DROP TABLE IF EXISTS public.checkins CASCADE;
DROP TABLE IF EXISTS public.customer_fidelity CASCADE;
DROP TABLE IF EXISTS public.fidelity_settings CASCADE;

-- Create checkin_links table (multiple QR codes/links)
CREATE TABLE public.checkin_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  url_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create checkin_records table
CREATE TABLE public.checkin_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checkin_link_id UUID NOT NULL REFERENCES public.checkin_links(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  whatsapp_user TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  fidelity_progress INTEGER NOT NULL DEFAULT 0
);

-- Create fidelity_programs table
CREATE TABLE public.fidelity_programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  goal INTEGER NOT NULL DEFAULT 10,
  reward TEXT NOT NULL,
  congratulations_message TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.checkin_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fidelity_programs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for checkin_links
CREATE POLICY "Users can view their own checkin links"
  ON public.checkin_links FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own checkin links"
  ON public.checkin_links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own checkin links"
  ON public.checkin_links FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for checkin_records
CREATE POLICY "Users can view their own checkin records"
  ON public.checkin_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can create checkin records"
  ON public.checkin_records FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own checkin records"
  ON public.checkin_records FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for fidelity_programs
CREATE POLICY "Users can view their own fidelity programs"
  ON public.fidelity_programs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own fidelity programs"
  ON public.fidelity_programs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fidelity programs"
  ON public.fidelity_programs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fidelity programs"
  ON public.fidelity_programs FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at on fidelity_programs
CREATE TRIGGER update_fidelity_programs_updated_at
  BEFORE UPDATE ON public.fidelity_programs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();