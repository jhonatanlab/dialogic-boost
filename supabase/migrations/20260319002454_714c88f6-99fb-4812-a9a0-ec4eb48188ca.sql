
-- Create admin_settings table
CREATE TABLE public.admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  setting_key text NOT NULL,
  setting_value text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, setting_key)
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings" ON public.admin_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON public.admin_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON public.admin_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own settings" ON public.admin_settings FOR DELETE USING (auth.uid() = user_id);

-- Create whatsapp_instances table
CREATE TABLE public.whatsapp_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_name text NOT NULL,
  instance_id text,
  status text NOT NULL DEFAULT 'disconnected',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own instances" ON public.whatsapp_instances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own instances" ON public.whatsapp_instances FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own instances" ON public.whatsapp_instances FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own instances" ON public.whatsapp_instances FOR DELETE USING (auth.uid() = user_id);

-- Add updated_at triggers
CREATE TRIGGER update_admin_settings_updated_at BEFORE UPDATE ON public.admin_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_whatsapp_instances_updated_at BEFORE UPDATE ON public.whatsapp_instances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
