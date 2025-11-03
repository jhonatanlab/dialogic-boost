-- Create campaigns table
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create campaign_contacts junction table
CREATE TABLE public.campaign_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL,
  contact_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, contact_id)
);

-- Enable RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for campaigns
CREATE POLICY "Users can view their own campaigns"
  ON public.campaigns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own campaigns"
  ON public.campaigns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaigns"
  ON public.campaigns FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaigns"
  ON public.campaigns FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for campaign_contacts
CREATE POLICY "Users can view campaign contacts for their campaigns"
  ON public.campaign_contacts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE campaigns.id = campaign_contacts.campaign_id
    AND campaigns.user_id = auth.uid()
  ));

CREATE POLICY "Users can create campaign contacts for their campaigns"
  ON public.campaign_contacts FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE campaigns.id = campaign_contacts.campaign_id
    AND campaigns.user_id = auth.uid()
  ));

CREATE POLICY "Users can update campaign contacts for their campaigns"
  ON public.campaign_contacts FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE campaigns.id = campaign_contacts.campaign_id
    AND campaigns.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete campaign contacts for their campaigns"
  ON public.campaign_contacts FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE campaigns.id = campaign_contacts.campaign_id
    AND campaigns.user_id = auth.uid()
  ));

-- Trigger for updated_at on campaigns
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_campaigns_user_id ON public.campaigns(user_id);
CREATE INDEX idx_campaigns_status ON public.campaigns(status);
CREATE INDEX idx_campaign_contacts_campaign_id ON public.campaign_contacts(campaign_id);
CREATE INDEX idx_campaign_contacts_contact_id ON public.campaign_contacts(contact_id);
CREATE INDEX idx_campaign_contacts_status ON public.campaign_contacts(status);