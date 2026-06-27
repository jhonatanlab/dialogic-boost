import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ConversationClosureInfo {
  id: string;
  conversation_id: string;
  closure_reason_id: string | null;
  reason_name: string | null;
  reason_color: string | null;
  notes: string | null;
  tag_ids: string[] | null;
  closed_by_name: string | null;
  closed_by_user_id: string | null;
  created_at: string;
}

export function useConversationClosure(conversationId: string | null | undefined) {
  return useQuery({
    queryKey: ["conversation-closure", conversationId],
    enabled: !!conversationId,
    queryFn: async (): Promise<ConversationClosureInfo | null> => {
      if (!conversationId) return null;
      const { data, error } = await supabase
        .from("conversation_closures")
        .select(
          `id, conversation_id, closure_reason_id, notes, tag_ids, closed_by_name, closed_by_user_id, created_at,
           closure_reasons:closure_reason_id ( name, color )`
        )
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        console.error("useConversationClosure error:", error);
        return null;
      }
      if (!data) return null;
      const r: any = (data as any).closure_reasons;
      return {
        id: (data as any).id,
        conversation_id: (data as any).conversation_id,
        closure_reason_id: (data as any).closure_reason_id,
        reason_name: r?.name ?? null,
        reason_color: r?.color ?? null,
        notes: (data as any).notes ?? null,
        tag_ids: (data as any).tag_ids ?? null,
        closed_by_name: (data as any).closed_by_name ?? null,
        closed_by_user_id: (data as any).closed_by_user_id ?? null,
        created_at: (data as any).created_at,
      };
    },
  });
}
