import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Users, TrendingUp, Clock } from "lucide-react";

const Dashboard = () => {
  const stats = [
    {
      title: "Conversas Ativas",
      value: "24",
      description: "+12% em relação ao mês anterior",
      icon: MessageSquare,
      color: "text-primary",
    },
    {
      title: "Total de Contatos",
      value: "1.247",
      description: "+89 novos esta semana",
      icon: Users,
      color: "text-chart-2",
    },
    {
      title: "Taxa de Conversão",
      value: "68%",
      description: "+5% em relação ao mês anterior",
      icon: TrendingUp,
      color: "text-chart-3",
    },
    {
      title: "Tempo Médio",
      value: "3min",
      description: "Tempo médio de resposta",
      icon: Clock,
      color: "text-muted-foreground",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Visão geral da sua plataforma de atendimento
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Conversas Recentes</CardTitle>
              <CardDescription>
                Últimas interações com clientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-lg border">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <MessageSquare className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Cliente {i}</p>
                      <p className="text-sm text-muted-foreground">
                        Última mensagem há {i}h
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Atividade por Canal</CardTitle>
              <CardDescription>
                Distribuição de mensagens por canal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: "WhatsApp", value: 65, color: "bg-green-500" },
                  { name: "Instagram", value: 25, color: "bg-pink-500" },
                  { name: "Messenger", value: 10, color: "bg-blue-500" },
                ].map((channel) => (
                  <div key={channel.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{channel.name}</span>
                      <span className="text-muted-foreground">{channel.value}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${channel.color}`}
                        style={{ width: `${channel.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
