import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AiSummaryCardProps {
  contactId?: string;
}

export function AiSummaryCard({ contactId }: AiSummaryCardProps) {
  const { data: summary, isLoading } = useQuery({
    queryKey: ["ai-summary", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_ai_summaries")
        .select("summary, updated_at")
        .eq("contact_id", contactId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!contactId,
  });

  if (!contactId) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          Resumo IA
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : summary ? (
          <div className="space-y-1">
            <p className="text-sm text-foreground whitespace-pre-wrap">{summary.summary}</p>
            <p className="text-[10px] text-muted-foreground">
              Atualizado em {format(new Date(summary.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum resumo disponível</p>
        )}
      </CardContent>
    </Card>
  );
}
