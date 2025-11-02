import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ContactNote {
  id: string;
  contact_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export function useContactNotes(contactId?: string) {
  return useQuery({
    queryKey: ["contact-notes", contactId],
    queryFn: async () => {
      if (!contactId) return [];

      const { data, error } = await supabase
        .from("contact_notes")
        .select("*")
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ContactNote[];
    },
    enabled: !!contactId,
  });
}

export function useCreateContactNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (note: { contactId: string; content: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("contact_notes")
        .insert([{ 
          contact_id: note.contactId, 
          content: note.content, 
          user_id: user.id 
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contact-notes", variables.contactId] });
      toast.success("Nota adicionada!");
    },
    onError: () => {
      toast.error("Erro ao adicionar nota");
    },
  });
}

export function useDeleteContactNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ noteId, contactId }: { noteId: string; contactId: string }) => {
      const { error } = await supabase
        .from("contact_notes")
        .delete()
        .eq("id", noteId);

      if (error) throw error;
      return contactId;
    },
    onSuccess: (contactId) => {
      queryClient.invalidateQueries({ queryKey: ["contact-notes", contactId] });
      toast.success("Nota excluída!");
    },
    onError: () => {
      toast.error("Erro ao excluir nota");
    },
  });
}
