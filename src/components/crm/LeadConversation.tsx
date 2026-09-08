import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function LeadConversation({ contactId }: { contactId: string }) {
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["crm-lead-messages", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, direction, content, message_type, created_at, sent_at")
        .eq("contact_id", contactId)
        .order("sent_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
    enabled: !!contactId,
  });

  if (isLoading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Carregando conversa...</p>;
  }

  if (messages.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Nenhuma mensagem trocada com este contato ainda.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Histórico apenas para leitura.</p>
      {messages.map((m: any) => {
        const outbound = m.direction === "outbound";
        const isText = m.message_type === "text";
        return (
          <div key={m.id} className={cn("flex", outbound ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[80%] rounded-xl px-3 py-2 text-sm",
                outbound ? "bg-primary text-primary-foreground" : "bg-muted"
              )}
            >
              <p className="whitespace-pre-wrap break-words">
                {isText ? m.content : `[${m.message_type}]`}
              </p>
              <span
                className={cn(
                  "mt-1 block text-[10px]",
                  outbound ? "text-primary-foreground/70" : "text-muted-foreground"
                )}
              >
                {format(new Date(m.sent_at || m.created_at), "dd/MM/yyyy HH:mm")}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
