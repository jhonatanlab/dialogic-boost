import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MessageSquare, Users, TrendingUp, Clock, CalendarIcon, Filter, Wifi } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useDashboardStats, useAgentsAndTeams, DashboardFilters } from "@/hooks/useDashboardStats";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCompany } from "@/hooks/useCompany";

const Dashboard = () => {
  const queryClient = useQueryClient();
  const { companyId, profile } = useCompany();
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [agentId, setAgentId] = useState<string>("all");
  const [teamId, setTeamId] = useState<string>("all");

  const filters: DashboardFilters = {
    dateFrom: dateFrom ? format(dateFrom, "yyyy-MM-dd") : null,
    dateTo: dateTo ? format(dateTo, "yyyy-MM-dd") : null,
    agentId: agentId !== "all" ? agentId : null,
    teamId: teamId !== "all" ? teamId : null,
  };

  const { data: stats, isLoading } = useDashboardStats(filters);
  const { data: options } = useAgentsAndTeams();

  const clearFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    setAgentId("all");
    setTeamId("all");
  };

  const hasFilters = dateFrom || dateTo || agentId !== "all" || teamId !== "all";
  const canViewOnlineUsers = profile?.role === "admin" || profile?.role === "manager";

  // Online users query
  const { data: onlineUsers = [] } = useQuery({
    queryKey: ["online-users", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("user_presence" as any)
        .select("user_id, is_online, last_seen_at")
        .eq("company_id", companyId)
        .eq("is_online", true);
      if (error) return [];
      // Get profile names
      const userIds = (data || []).map((u: any) => u.user_id);
      if (userIds.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      const nameMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p.full_name || "Usuário"]));
      return (data || []).map((u: any) => ({ ...u, full_name: nameMap[u.user_id] || "Usuário" }));
    },
    enabled: !!companyId && canViewOnlineUsers,
    refetchInterval: 30000,
  });

  // Realtime subscription for presence changes
  useEffect(() => {
    if (!companyId || !canViewOnlineUsers) return;
    const channel = supabase
      .channel("presence-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_presence" }, () => {
        queryClient.invalidateQueries({ queryKey: ["online-users", companyId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [companyId, canViewOnlineUsers, queryClient]);

  const channelColors: Record<string, string> = {
    Whatsapp: "#00D4D4",
    WhatsApp: "#00D4D4",
    Instagram: "#1A2B5C",
    Telegram: "#0088cc",
    Email: "rgba(0, 212, 212, 0.45)",
    Messenger: "rgba(0, 212, 212, 0.45)",
  };

  const sourceColors = ["#00D4D4", "#1A2B5C", "#FC6625", "rgba(0, 212, 212, 0.45)", "#6366f1", "#8b5cf6"];

  function timeSince(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6" style={{ background: "#EEF8F8", margin: "-1.5rem", padding: "1.5rem", minHeight: "100%" }}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Visão geral da sua plataforma de atendimento
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Date From */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Data início"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} locale={ptBR} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>

            {/* Date To */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "dd/MM/yyyy") : "Data fim"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateTo} onSelect={setDateTo} locale={ptBR} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>

            {/* Agent */}
            <Select value={agentId} onValueChange={setAgentId}>
              <SelectTrigger className="w-[160px] h-9 text-sm">
                <SelectValue placeholder="Atendente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos atendentes</SelectItem>
                {(options?.agents || []).map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Team */}
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger className="w-[160px] h-9 text-sm">
                <SelectValue placeholder="Equipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas equipes</SelectItem>
                {(options?.teams || []).map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
                <Filter className="h-3 w-3 mr-1" /> Limpar
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { title: "Conversas Ativas", value: stats?.activeConversations ?? "—", icon: MessageSquare },
            { title: "Total de Contatos", value: stats?.totalContacts?.toLocaleString("pt-BR") ?? "—", icon: Users },
            { title: "Total de Mensagens", value: stats?.totalMessages?.toLocaleString("pt-BR") ?? "—", icon: TrendingUp },
            { title: "Tempo Médio", value: stats?.avgResponseTime ?? "—", icon: Clock },
          ].map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className="h-4 w-4" style={{ color: "#00D4D4" }} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isLoading ? "..." : stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Online Users Card */}
          {canViewOnlineUsers && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wifi className="h-4 w-4" style={{ color: "#00D4D4" }} />
                  Usuários Online
                </CardTitle>
                <CardDescription>{onlineUsers.length} online agora</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {onlineUsers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum usuário online</p>
                  ) : (
                    onlineUsers.map((u: any) => (
                      <div key={u.user_id} className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                        <span className="text-sm font-medium truncate">{u.full_name}</span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Conversations */}
          <Card>
            <CardHeader>
              <CardTitle>Conversas Recentes</CardTitle>
              <CardDescription>Últimas interações com clientes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">Carregando...</p>
                ) : (stats?.recentConversations || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma conversa encontrada</p>
                ) : (
                  (stats?.recentConversations || []).map((conv) => (
                    <div
                      key={conv.id}
                      className="flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-[rgba(0,212,212,0.04)]"
                      style={{ border: "1px solid rgba(0, 212, 212, 0.2)" }}
                    >
                      <div className="h-9 w-9 rounded-full flex items-center justify-center" style={{ background: "rgba(0, 212, 212, 0.1)" }}>
                        <MessageSquare className="h-4 w-4" style={{ color: "#00D4D4" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{conv.contactName}</p>
                        <p className="text-xs text-muted-foreground">
                          {conv.channel} · há {timeSince(conv.lastMessageAt)}
                        </p>
                      </div>
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        conv.status === "open" ? "bg-yellow-100 text-yellow-800" :
                        conv.status === "in_progress" ? "bg-blue-100 text-blue-800" :
                        "bg-gray-100 text-gray-600"
                      )}>
                        {conv.status === "open" ? "Fila" : conv.status === "in_progress" ? "Em atendimento" : "Concluída"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Channel Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Atividade por Canal</CardTitle>
              <CardDescription>Distribuição de conversas por canal</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">Carregando...</p>
                ) : (stats?.channelDistribution || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem dados</p>
                ) : (
                  (stats?.channelDistribution || []).map((ch) => (
                    <div key={ch.name} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{ch.name}</span>
                        <span className="text-muted-foreground">{ch.percentage}% ({ch.count})</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: "#E8F5F5" }}>
                        <div className="h-full rounded-full" style={{ width: `${ch.percentage}%`, background: channelColors[ch.name] || "#00D4D4" }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Source Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Origem dos Contatos</CardTitle>
              <CardDescription>De onde vieram seus contatos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">Carregando...</p>
                ) : (stats?.sourceDistribution || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem dados</p>
                ) : (
                  (stats?.sourceDistribution || []).map((src, i) => (
                    <div key={src.name} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{src.name}</span>
                        <span className="text-muted-foreground">{src.percentage}% ({src.count})</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: "#E8F5F5" }}>
                        <div className="h-full rounded-full" style={{ width: `${src.percentage}%`, background: sourceColors[i % sourceColors.length] }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
