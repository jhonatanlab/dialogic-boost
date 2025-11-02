-- Criar tabela de etiquetas (tags)
CREATE TABLE public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#FC6625',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Criar tabela de contatos
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  instagram TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de relacionamento contatos-etiquetas (many-to-many)
CREATE TABLE public.contact_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(contact_id, tag_id)
);

-- Criar tabela de notas dos contatos
CREATE TABLE public.contact_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de campos personalizados
CREATE TABLE public.custom_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Criar tabela de valores de campos personalizados
CREATE TABLE public.contact_custom_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  custom_field_id UUID NOT NULL REFERENCES public.custom_fields(id) ON DELETE CASCADE,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(contact_id, custom_field_id)
);

-- Enable RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_custom_fields ENABLE ROW LEVEL SECURITY;

-- RLS Policies para tags
CREATE POLICY "Users can view their own tags"
  ON public.tags FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tags"
  ON public.tags FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tags"
  ON public.tags FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tags"
  ON public.tags FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies para contacts
CREATE POLICY "Users can view their own contacts"
  ON public.contacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own contacts"
  ON public.contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contacts"
  ON public.contacts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contacts"
  ON public.contacts FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies para contact_tags
CREATE POLICY "Users can view contact_tags for their contacts"
  ON public.contact_tags FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.contacts
    WHERE contacts.id = contact_tags.contact_id
    AND contacts.user_id = auth.uid()
  ));

CREATE POLICY "Users can create contact_tags for their contacts"
  ON public.contact_tags FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.contacts
    WHERE contacts.id = contact_tags.contact_id
    AND contacts.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete contact_tags for their contacts"
  ON public.contact_tags FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.contacts
    WHERE contacts.id = contact_tags.contact_id
    AND contacts.user_id = auth.uid()
  ));

-- RLS Policies para contact_notes
CREATE POLICY "Users can view notes for their contacts"
  ON public.contact_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create notes for their contacts"
  ON public.contact_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
  ON public.contact_notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
  ON public.contact_notes FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies para custom_fields
CREATE POLICY "Users can view their own custom fields"
  ON public.custom_fields FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own custom fields"
  ON public.custom_fields FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom fields"
  ON public.custom_fields FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom fields"
  ON public.custom_fields FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies para contact_custom_fields
CREATE POLICY "Users can view custom field values for their contacts"
  ON public.contact_custom_fields FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.contacts
    WHERE contacts.id = contact_custom_fields.contact_id
    AND contacts.user_id = auth.uid()
  ));

CREATE POLICY "Users can create custom field values for their contacts"
  ON public.contact_custom_fields FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.contacts
    WHERE contacts.id = contact_custom_fields.contact_id
    AND contacts.user_id = auth.uid()
  ));

CREATE POLICY "Users can update custom field values for their contacts"
  ON public.contact_custom_fields FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.contacts
    WHERE contacts.id = contact_custom_fields.contact_id
    AND contacts.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete custom field values for their contacts"
  ON public.contact_custom_fields FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.contacts
    WHERE contacts.id = contact_custom_fields.contact_id
    AND contacts.user_id = auth.uid()
  ));

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contact_notes_updated_at
  BEFORE UPDATE ON public.contact_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contact_custom_fields_updated_at
  BEFORE UPDATE ON public.contact_custom_fields
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Criar índices para performance
CREATE INDEX idx_contacts_user_id ON public.contacts(user_id);
CREATE INDEX idx_contacts_name ON public.contacts(name);
CREATE INDEX idx_contacts_phone ON public.contacts(phone);
CREATE INDEX idx_contacts_email ON public.contacts(email);
CREATE INDEX idx_tags_user_id ON public.tags(user_id);
CREATE INDEX idx_contact_tags_contact_id ON public.contact_tags(contact_id);
CREATE INDEX idx_contact_tags_tag_id ON public.contact_tags(tag_id);
CREATE INDEX idx_contact_notes_contact_id ON public.contact_notes(contact_id);
CREATE INDEX idx_custom_fields_user_id ON public.custom_fields(user_id);
CREATE INDEX idx_contact_custom_fields_contact_id ON public.contact_custom_fields(contact_id);