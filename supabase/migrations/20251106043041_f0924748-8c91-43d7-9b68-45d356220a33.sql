-- Create checkins table
CREATE TABLE IF NOT EXISTS public.checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  source TEXT NOT NULL DEFAULT 'qr_code',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

-- RLS Policies for checkins
CREATE POLICY "Users can view their own checkins"
  ON public.checkins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create checkins for their business"
  ON public.checkins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own checkins"
  ON public.checkins FOR DELETE
  USING (auth.uid() = user_id);

-- Create fidelity_settings table
CREATE TABLE IF NOT EXISTS public.fidelity_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  campaign_name TEXT NOT NULL DEFAULT 'Programa Fidelidade',
  checkins_goal INTEGER NOT NULL DEFAULT 10,
  reward_description TEXT NOT NULL DEFAULT 'Prêmio especial',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fidelity_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fidelity_settings
CREATE POLICY "Users can view their own fidelity settings"
  ON public.fidelity_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fidelity settings"
  ON public.fidelity_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fidelity settings"
  ON public.fidelity_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Create customer_fidelity table
CREATE TABLE IF NOT EXISTS public.customer_fidelity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  total_checkins INTEGER NOT NULL DEFAULT 0,
  total_rewards INTEGER NOT NULL DEFAULT 0,
  last_checkin_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, customer_phone)
);

-- Enable RLS
ALTER TABLE public.customer_fidelity ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customer_fidelity
CREATE POLICY "Users can view their own customer fidelity records"
  ON public.customer_fidelity FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert customer fidelity records"
  ON public.customer_fidelity FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their customer fidelity records"
  ON public.customer_fidelity FOR UPDATE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_fidelity_settings_updated_at
  BEFORE UPDATE ON public.fidelity_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_fidelity_updated_at
  BEFORE UPDATE ON public.customer_fidelity
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_checkins_user_id ON public.checkins(user_id);
CREATE INDEX idx_checkins_customer_phone ON public.checkins(customer_phone);
CREATE INDEX idx_checkins_created_at ON public.checkins(created_at DESC);
CREATE INDEX idx_customer_fidelity_user_id ON public.customer_fidelity(user_id);
CREATE INDEX idx_customer_fidelity_customer_phone ON public.customer_fidelity(customer_phone);