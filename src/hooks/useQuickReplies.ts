import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface QuickReply {
  id: string;
  user_id: string;
  name: string;
  text: string;
  created_at: string;
  updated_at: string;
}

export const useQuickReplies = () => {
  const queryClient = useQueryClient();

  const { data: quickReplies, isLoading } = useQuery({
    queryKey: ["quick-replies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quick_replies")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as QuickReply[];
    },
  });

  const createQuickReply = useMutation({
    mutationFn: async (replyData: Omit<QuickReply, "id" | "user_id" | "created_at" | "updated_at">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("quick_replies")
        .insert({
          ...replyData,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quick-replies"] });
      toast({
        title: "✅ Mensagem rápida criada!",
        description: "A mensagem rápida foi salva.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar mensagem rápida",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteQuickReply = useMutation({
    mutationFn: async (replyId: string) => {
      const { error } = await supabase
        .from("quick_replies")
        .delete()
        .eq("id", replyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quick-replies"] });
      toast({
        title: "Mensagem rápida excluída",
        description: "A mensagem rápida foi removida.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir mensagem rápida",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    quickReplies,
    isLoading,
    createQuickReply: createQuickReply.mutate,
    deleteQuickReply: deleteQuickReply.mutate,
  };
};
