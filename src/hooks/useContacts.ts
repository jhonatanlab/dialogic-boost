import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Contact {
  id: string;
  user_id: string;
  name: string;
  phone?: string;
  email?: string;
  instagram?: string;
  avatar_url?: string;
  birthday?: string;
  created_at: string;
  updated_at: string;
  tags?: Tag[];
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export function useContacts(searchTerm?: string) {
  return useQuery({
    queryKey: ["contacts", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("contacts")
        .select(`
          *,
          contact_tags (
            tag_id,
            tags (
              id,
              name,
              color
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data.map((contact: any) => ({
        ...contact,
        tags: contact.contact_tags?.map((ct: any) => ct.tags).filter(Boolean) || [],
      })) as Contact[];
    },
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contact: Omit<Contact, "id" | "user_id" | "created_at" | "updated_at" | "tags">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("contacts")
        .insert([{ ...contact, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contato criado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao criar contato");
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...contact }: Partial<Contact> & { id: string }) => {
      const { data, error } = await supabase
        .from("contacts")
        .update(contact)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contato atualizado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao atualizar contato");
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Verifica existência/permissão antes (RLS) para distinguir "não encontrado" de erro real
      const { data: existing, error: selErr } = await supabase
        .from("contacts")
        .select("id")
        .eq("id", id)
        .maybeSingle();

      if (selErr) throw selErr;
      if (!existing) throw new Error("NO_CONTACT_DELETED");

      // Cascata: remove mensagens, conversas, automações, ai_control etc.
      const { error } = await supabase.rpc("delete_contact_cascade", {
        p_contact_id: id,
      });

      if (error) throw error;
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contato excluído com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao excluir contato:", error);
      if (error instanceof Error && error.message === "NO_CONTACT_DELETED") {
        toast.error("Você não tem permissão para excluir este contato");
        return;
      }

      toast.error("Erro ao excluir contato. Tente novamente.");
    },
  });
}
