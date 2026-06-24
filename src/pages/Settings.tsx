import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Building2, MessageCircle, Users, UsersRound, Settings as SettingsIcon, Shuffle, Webhook, CheckCircle2, CalendarCog } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useCompany } from "@/hooks/useCompany";

const Settings = () => {
  const navigate = useNavigate();
  const { profile, isLoading } = useCompany();

  // Redirect agents away from settings
  useEffect(() => {
    if (!isLoading && profile?.role === "agent") {
      navigate("/dashboard");
    }
  }, [profile, isLoading, navigate]);

  // Show nothing while checking role or if agent
  if (isLoading || profile?.role === "agent") {
    return null;
  }

  const settingsCards = [
    {
      icon: Building2,
      title: "Perfil da Empresa",
      description: "Edite nome, logo e informações gerais.",
      action: () => navigate("/settings/company"),
      actionLabel: "Editar perfil",
      color: "text-blue-950",
    },
    {
      icon: MessageCircle,
      title: "Modelos e Mensagens",
      description: "Gerencie mensagens e respostas rápidas.",
      action: () => navigate("/modelo-messages"),
      actionLabel: "Ir para Modelos",
      color: "text-orange-500",
    },
    {
      icon: MessageCircle,
      title: "Integrações WhatsApp",
      description: "Configure API Oficial Meta ou Z-API.",
      action: () => navigate("/settings/whatsapp-integrations"),
      actionLabel: "Configurar Integrações",
      color: "text-green-500",
    },
    {
      icon: Users,
      title: "Usuários",
      description: "Adicione ou remova usuários.",
      action: () => navigate("/settings/users"),
      actionLabel: "Gerenciar usuários",
      color: "text-purple-500",
    },
    {
      icon: UsersRound,
      title: "Equipes",
      description: "Organize suas equipes de atendimento.",
      action: () => navigate("/settings/teams"),
      actionLabel: "Gerenciar equipes",
      color: "text-primary",
    },
    {
      icon: Shuffle,
      title: "Distribuição de Conversas",
      description: "Configure a distribuição automática de atendimentos.",
      action: () => navigate("/settings/distribution"),
      actionLabel: "Configurar distribuição",
      color: "text-teal-500",
    },
    {
      icon: Webhook,
      title: "Integrações de Webhook",
      description: "Receba leads externos e dispare boas-vindas automáticas.",
      action: () => navigate("/settings/webhook-integrations"),
      actionLabel: "Configurar webhooks",
      color: "text-indigo-500",
    },
    {
      icon: CheckCircle2,
      title: "Motivos de Conclusão",
      description: "Cadastre os motivos exibidos ao concluir uma conversa.",
      action: () => navigate("/settings/closure-reasons"),
      actionLabel: "Gerenciar motivos",
      color: "text-emerald-500",
    },
  ];

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <SettingsIcon className="h-8 w-8 text-primary" />
            Configurações Gerais
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie informações e personalizações da sua conta e equipe.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {settingsCards.map((card) => (
            <Card
              key={card.title}
              className="p-6 hover:shadow-lg transition-all duration-200 cursor-pointer group"
              onClick={card.action}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-2xl bg-accent ${card.color}`}>
                  <card.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {card.description}
                  </p>
                  <span className="text-sm font-medium text-primary group-hover:underline">
                    {card.actionLabel} →
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
