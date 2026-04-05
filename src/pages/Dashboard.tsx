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
    },
    {
      title: "Total de Contatos",
      value: "1.247",
      description: "+89 novos esta semana",
      icon: Users,
    },
    {
      title: "Taxa de Conversão",
      value: "68%",
      description: "+5% em relação ao mês anterior",
      icon: TrendingUp,
    },
    {
      title: "Tempo Médio",
      value: "3min",
      description: "Tempo médio de resposta",
      icon: Clock,
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6" style={{ background: "#EEF8F8", margin: "-1.5rem", padding: "1.5rem", minHeight: "100%" }}>
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
                <stat.icon className="h-4 w-4" style={{ color: "#00D4D4" }} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs mt-1" style={{ color: "#00D4D4" }}>
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
                  <div
                    key={i}
                    className="flex items-center gap-4 p-3 rounded-lg transition-colors"
                    style={{
                      border: "1px solid rgba(0, 212, 212, 0.2)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0, 212, 212, 0.04)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div
                      className="h-10 w-10 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(0, 212, 212, 0.1)" }}
                    >
                      <MessageSquare className="h-5 w-5" style={{ color: "#00D4D4" }} />
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
                  { name: "WhatsApp", value: 65, bg: "#00D4D4" },
                  { name: "Instagram", value: 25, bg: "#1A2B5C" },
                  { name: "Messenger", value: 10, bg: "rgba(0, 212, 212, 0.45)" },
                ].map((channel) => (
                  <div key={channel.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{channel.name}</span>
                      <span className="text-muted-foreground">{channel.value}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "#E8F5F5" }}>
                      <div
                        className="h-full"
                        style={{ width: `${channel.value}%`, background: channel.bg }}
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
