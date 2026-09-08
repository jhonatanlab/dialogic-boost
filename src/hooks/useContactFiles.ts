import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ContactFile {
  id: string;
  contact_id: string;
  company_id: string;
  file_name: string;
  file_path: string;
  mime_type: string | null;
  size: number | null;
  uploaded_by: string | null;
  created_at: string;
}

const BUCKET = "contact-files";
const db = supabase as any;

export function useContactFiles(contactId?: string) {
  return useQuery({
    queryKey: ["contact-files", contactId],
    queryFn: async () => {
      if (!contactId) return [];
      const { data, error } = await db
        .from("contact_files")
        .select("*")
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ContactFile[];
    },
    enabled: !!contactId,
  });
}

export function useUploadContactFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ contactId, file }: { contactId: string; file: File }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");
      const { data: profile } = await db
        .from("profiles")
        .select("company_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${profile.company_id}/${contactId}/${Date.now()}_${safeName}`;

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type || undefined, upsert: false });
      if (upErr) throw upErr;

      const { error } = await db.from("contact_files").insert([
        {
          contact_id: contactId,
          company_id: profile.company_id,
          file_name: file.name,
          file_path: path,
          mime_type: file.type || null,
          size: file.size,
          uploaded_by: user.id,
        },
      ]);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["contact-files", vars.contactId] });
      toast.success("Arquivo anexado!");
    },
    onError: () => toast.error("Não foi possível anexar o arquivo"),
  });
}

export function useDeleteContactFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: ContactFile) => {
      await supabase.storage.from(BUCKET).remove([file.file_path]);
      const { error } = await db.from("contact_files").delete().eq("id", file.id);
      if (error) throw error;
    },
    onSuccess: (_d, file) => {
      queryClient.invalidateQueries({ queryKey: ["contact-files", file.contact_id] });
      toast.success("Arquivo removido");
    },
    onError: () => toast.error("Não foi possível remover o arquivo"),
  });
}

export async function getContactFileUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
