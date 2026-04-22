import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Send, CheckCheck, Eye, MessageSquare, AlertCircle, TrendingUp } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface AutomationDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  automation: {
    id: string;
    name: string;
    status: string;
    execution_count: number;
    trigger_type: string | null;
    created_at: string;
  } | null;
}

export function AutomationDetailModal({ open, onOpenChange, automation }: AutomationDetailModalProps) {
  const [dateFrom, setDateFrom] = useState<Date>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date>(endOfMonth(new Date()));

  const { data: executions = [], isLoading } = useQuery({
    queryKey: ["automation-executions", automation?.id, dateFrom.toISOString(), dateTo.toISOString()],
    queryFn: async () => {
      if (!automation?.id) return [];
      const { data, error } = await supabase
        .from("automation_executions" as any)
        .select("*")
        .eq("automation_id", automation.id)
        .gte("executed_at", dateFrom.toISOString())
        .lte("executed_at", dateTo.toISOString())
        .order("executed_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as { id: string; status: string; executed_at: string }[];
    },
    enabled: open && !!automation?.id,
  });

  const stats = useMemo(() => {
    const total = executions.length;
    const sent = executions.filter(e => e.status === "sent").length;
    const delivered = executions.filter(e => e.status === "delivered").length;
    const read = executions.filter(e => e.status === "read").length;
    const replied = executions.filter(e => e.status === "replied").length;
    const failed = executions.filter(e => e.status === "failed").length;
    const successRate = total > 0 ? Math.round(((total - failed) / total) * 100) : 0;
    return { total, sent, delivered, read, replied, failed, successRate };
  }, [executions]);

  if (!automation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-primary" />
            {automation.name}
            <Badge variant={automation.status === "active" ? "default" : "secondary"} className={automation.status === "active" ? "bg-green-500/10 text-green-500 border-green-500/20" : ""}>
              {automation.status === "active" ? "Ativo" : "Pausado"}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Date filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(dateFrom, "dd/MM/yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateFrom} onSelect={(d) => d && setDateFrom(d)} locale={ptBR} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          <span className="text-sm text-muted-foreground">até</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(dateTo, "dd/MM/yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateTo} onSelect={(d) => d && setDateTo(d)} locale={ptBR} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total", value: stats.total, icon: Send, color: "text-primary" },
            { label: "Entregues", value: stats.delivered, icon: CheckCheck, color: "text-blue-500" },
            { label: "Visualizadas", value: stats.read, icon: Eye, color: "text-green-500" },
            { label: "Respondidas", value: stats.replied, icon: MessageSquare, color: "text-emerald-500" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
                <p className="text-2xl font-bold">{isLoading ? "..." : s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Success rate + failures */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Taxa de Sucesso</span>
              </div>
              <p className={`text-3xl font-bold ${stats.successRate >= 80 ? "text-green-500" : stats.successRate >= 50 ? "text-yellow-500" : "text-destructive"}`}>
                {isLoading ? "..." : `${stats.successRate}%`}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-xs text-muted-foreground">Falhas</span>
              </div>
              <p className="text-3xl font-bold text-destructive">{isLoading ? "..." : stats.failed}</p>
            </CardContent>
          </Card>
        </div>

        {/* Info */}
        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <p>Gatilho: {automation.trigger_type === "first_message" ? "Primeira mensagem" : automation.trigger_type === "keyword" ? "Palavra-chave" : automation.trigger_type === "inactivity" ? "Inatividade" : automation.trigger_type || "—"}</p>
          <p>Execuções totais (histórico): {automation.execution_count}</p>
          <p>Criada em: {format(new Date(automation.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
