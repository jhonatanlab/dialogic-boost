import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/analytics/StatCard";
import { MessagesChart } from "@/components/analytics/MessagesChart";
import { CampaignsTable } from "@/components/analytics/CampaignsTable";
import { ConversationsChart } from "@/components/analytics/ConversationsChart";
import { CampaignStatsCards } from "@/components/analytics/CampaignStatsCards";
import { PrintReportDialog } from "@/components/analytics/PrintReportDialog";
import { useAnalytics } from "@/hooks/useAnalytics";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Send,
  MessageSquare,
  CheckCheck,
  Eye,
  AlertCircle,
  Megaphone,
  Users,
  Target,
  CalendarIcon,
  PlayCircle,
  CheckCircle2,
  Clock3,
  Timer,
  UserCheck,
  Printer,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

const formatDuration = (ms: number) => {
  if (!ms) return "—";
  const minutes = Math.floor(ms / 1000 / 60);
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;

  if (hours > 0) return `${hours}h ${remMinutes}min`;
  return `${Math.max(minutes, 1)}min`;
};

const Analytics = () => {
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
  });
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [printSections, setPrintSections] = useState<string[]>(["atendimento", "mensagens", "campanhas"]);

  const {
    messageStats,
    dailyMessages,
    campaignStats,
    campaignPerformance,
    conversationStats,
    isLoading,
  } = useAnalytics(dateRange);

  const presetRanges = [
    { label: "Este mês", start: startOfMonth(new Date()), end: endOfMonth(new Date()) },
    { label: "Mês passado", start: startOfMonth(subMonths(new Date(), 1)), end: endOfMonth(subMonths(new Date(), 1)) },
    { label: "Últimos 3 meses", start: startOfMonth(subMonths(new Date(), 2)), end: endOfMonth(new Date()) },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
            <p className="text-muted-foreground mt-1">Análise de mensagens, conversas e campanhas</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {presetRanges.map((range) => (
              <Button
                key={range.label}
                variant={
                  dateRange.start.getTime() === range.start.getTime() &&
                  dateRange.end.getTime() === range.end.getTime()
                    ? "default"
                    : "outline"
                }
                size="sm"
                onClick={() => setDateRange({ start: range.start, end: range.end })}
              >
                {range.label}
              </Button>
            ))}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Personalizado
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.start, to: dateRange.end }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) setDateRange({ start: range.from, end: range.to });
                  }}
                  locale={ptBR}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
            <Button variant="outline" size="sm" onClick={() => setPrintDialogOpen(true)}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir Relatório
            </Button>
            <PrintReportDialog
              open={printDialogOpen}
              onOpenChange={setPrintDialogOpen}
              currentDateRange={dateRange}
              onPrint={({ start, end, sections }) => {
                setDateRange({ start, end });
                setPrintSections(sections);
                setTimeout(() => window.print(), 500);
              }}
            />
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Período: {format(dateRange.start, "dd 'de' MMMM", { locale: ptBR })} a {" "}
          {format(dateRange.end, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>

        <div className={printSections.includes("atendimento") ? "" : "print:hidden"} data-print-section="atendimento">
          <h2 className="text-lg font-semibold mb-4">Atendimento (Conversas)</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-32" />)
            ) : (
              <>
                <StatCard
                  title="Iniciadas"
                  value={conversationStats?.started_count || 0}
                  icon={PlayCircle}
                  description="Conversas iniciadas no período"
                />
                <StatCard
                  title="Concluídas"
                  value={conversationStats?.closed_count || 0}
                  icon={CheckCircle2}
                  description="Conversas encerradas"
                  variant="success"
                />
                <StatCard
                  title="Tempo p/ Concluir"
                  value={formatDuration(conversationStats?.avg_resolution_ms || 0)}
                  icon={Clock3}
                  description="Média do início ao fim"
                />
                <StatCard
                  title="Tempo Médio Resposta"
                  value={formatDuration(conversationStats?.avg_response_ms || 0)}
                  icon={Timer}
                  description="Primeira resposta ao cliente"
                  variant="warning"
                />
                <StatCard
                  title="Em Atendimento"
                  value={conversationStats?.in_progress || 0}
                  icon={UserCheck}
                  description="Conversas ativas"
                />
              </>
            )}
          </div>
        </div>

        <Card className={printSections.includes("atendimento") ? "" : "print:hidden"} data-print-section="atendimento">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Conversas por Atendente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-40" />
            ) : conversationStats?.agent_conversations?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Atendente</TableHead>
                    <TableHead className="text-right">Conversas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conversationStats.agent_conversations.map((agent, index) => (
                    <TableRow key={`${agent.agent_name}-${index}`}>
                      <TableCell className="font-medium">{agent.agent_name}</TableCell>
                      <TableCell className="text-right">{agent.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">Sem atendimentos atribuídos no período.</p>
            )}
          </CardContent>
        </Card>

        <div>
          <h2 className="text-lg font-semibold mb-4">Mensagens</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-32" />)
            ) : (
              <>
                <StatCard
                  title="Enviadas"
                  value={messageStats?.total_sent || 0}
                  icon={Send}
                  description="Total de mensagens enviadas"
                />
                <StatCard
                  title="Recebidas"
                  value={messageStats?.total_received || 0}
                  icon={MessageSquare}
                  description="Total de mensagens recebidas"
                  variant="success"
                />
                <StatCard
                  title="Entregues"
                  value={messageStats?.total_delivered || 0}
                  icon={CheckCheck}
                  description="Confirmação de entrega"
                />
                <StatCard
                  title="Lidas"
                  value={messageStats?.total_read || 0}
                  icon={Eye}
                  description="Mensagens visualizadas"
                  variant="success"
                />
                <StatCard
                  title="Falhas"
                  value={messageStats?.total_failed || 0}
                  icon={AlertCircle}
                  description="Erros no envio"
                  variant="danger"
                />
              </>
            )}
          </div>
        </div>

        {isLoading ? <Skeleton className="h-[380px]" /> : dailyMessages && <MessagesChart data={dailyMessages} />}

        <div>
          <h2 className="text-lg font-semibold mb-4">Campanhas</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)
            ) : (
              <>
                <StatCard
                  title="Total de Campanhas"
                  value={campaignStats?.total_campaigns || 0}
                  icon={Megaphone}
                  description="Campanhas criadas no período"
                />
                <StatCard
                  title="Contatos Alcançados"
                  value={campaignStats?.total_contacts_reached || 0}
                  icon={Users}
                  description="Total de contatos nas campanhas"
                />
                <StatCard
                  title="Mensagens Enviadas"
                  value={campaignStats?.total_messages_sent || 0}
                  icon={Send}
                  description="Envios bem-sucedidos"
                  variant="success"
                />
                <StatCard
                  title="Taxa de Sucesso"
                  value={`${campaignStats?.success_rate || 0}%`}
                  icon={Target}
                  description="Percentual de envios concluídos"
                  variant={
                    (campaignStats?.success_rate || 0) >= 90
                      ? "success"
                      : (campaignStats?.success_rate || 0) >= 70
                      ? "warning"
                      : "danger"
                  }
                />
              </>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {isLoading ? (
            <>
              <Skeleton className="h-[320px]" />
              <Skeleton className="h-[320px]" />
            </>
          ) : (
            <>
              {campaignStats && <CampaignStatsCards stats={campaignStats} />}
              {conversationStats && <ConversationsChart data={conversationStats} />}
            </>
          )}
        </div>

        {isLoading ? (
          <Skeleton className="h-[400px]" />
        ) : (
          campaignPerformance && <CampaignsTable campaigns={campaignPerformance} />
        )}
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
