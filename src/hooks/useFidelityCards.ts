import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FidelityCard {
  id: string;
  contact_id: string;
  fidelity_program_id: string;
  current_stamps: number;
  target_stamps: number;
  status: string;
  last_checkin_id: string | null;
  created_at: string;
  updated_at: string;
  contacts?: {
    name: string;
    phone: string | null;
  };
  fidelity_programs?: {
    name: string;
    reward: string;
    congratulations_message: string;
  };
}

export const useFidelityCards = () => {
  const queryClient = useQueryClient();

  const { data: fidelityCards = [], isLoading } = useQuery({
    queryKey: ["fidelity-cards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fidelity_cards")
        .select(`
          *,
          contacts:contact_id (
            name,
            phone
          ),
          fidelity_programs:fidelity_program_id (
            name,
            reward,
            congratulations_message
          )
        `)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data as FidelityCard[];
    },
  });

  const updateCardStamps = useMutation({
    mutationFn: async ({ 
      contactId, 
      programId, 
      checkinId 
    }: { 
      contactId: string; 
      programId: string;
      checkinId: string;
    }) => {
      // Get or create fidelity card
      const { data: existingCard } = await supabase
        .from("fidelity_cards")
        .select("*")
        .eq("contact_id", contactId)
        .eq("fidelity_program_id", programId)
        .maybeSingle();

      if (existingCard) {
        // Update existing card
        const newStamps = existingCard.current_stamps + 1;
        const isCompleted = newStamps >= existingCard.target_stamps;

        const { data, error } = await supabase
          .from("fidelity_cards")
          .update({
            current_stamps: newStamps,
            last_checkin_id: checkinId,
            status: isCompleted ? "completed" : "active",
          })
          .eq("id", existingCard.id)
          .select()
          .single();

        if (error) throw error;
        return { data, isCompleted };
      } else {
        // Get program details
        const { data: program } = await supabase
          .from("fidelity_programs")
          .select("goal")
          .eq("id", programId)
          .single();

        if (!program) throw new Error("Programa não encontrado");

        // Create new card
        const { data, error } = await supabase
          .from("fidelity_cards")
          .insert({
            contact_id: contactId,
            fidelity_program_id: programId,
            current_stamps: 1,
            target_stamps: program.goal,
            last_checkin_id: checkinId,
          })
          .select()
          .single();

        if (error) throw error;
        return { data, isCompleted: false };
      }
    },
    onSuccess: ({ isCompleted }) => {
      queryClient.invalidateQueries({ queryKey: ["fidelity-cards"] });
      if (isCompleted) {
        toast.success("🎉 Cartão fidelidade completo!");
      } else {
        toast.success("Check-in registrado! +1 carimbo");
      }
    },
    onError: () => {
      toast.error("Erro ao atualizar fidelidade");
    },
  });

  const rewardCard = useMutation({
    mutationFn: async (cardId: string) => {
      const { data, error } = await supabase
        .from("fidelity_cards")
        .update({
          status: "rewarded",
          current_stamps: 0,
        })
        .eq("id", cardId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fidelity-cards"] });
      toast.success("Recompensa entregue!");
    },
  });

  return {
    fidelityCards,
    isLoading,
    updateCardStamps,
    rewardCard,
  };
};
