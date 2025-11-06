import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CheckinLink {
  id: string;
  user_id: string;
  name: string;
  url_token: string;
  created_at: string;
}

export const useCheckinLinks = () => {
  const queryClient = useQueryClient();

  const { data: checkinLinks = [], isLoading } = useQuery({
    queryKey: ["checkin-links"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checkin_links")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CheckinLink[];
    },
  });

  const createCheckinLink = useMutation({
    mutationFn: async (name: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const urlToken = crypto.randomUUID();

      const { data, error } = await supabase
        .from("checkin_links")
        .insert({
          user_id: user.id,
          name,
          url_token: urlToken,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checkin-links"] });
      toast.success("Link de check-in criado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao criar link de check-in");
    },
  });

  const deleteCheckinLink = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("checkin_links")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checkin-links"] });
      toast.success("Link de check-in removido com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao remover link de check-in");
    },
  });

  return {
    checkinLinks,
    isLoading,
    createCheckinLink,
    deleteCheckinLink,
  };
};
