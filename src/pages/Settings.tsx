import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Building2, MessageCircle, Users, UsersRound, Settings as SettingsIcon, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Settings = () => {
  const navigate = useNavigate();

  const settingsCards = [
    {
      icon: Building2,
      title: "Perfil da Empresa",
      description: "Edite nome, logo e informações gerais.",
      action: () => console.log("Editar perfil"),
      actionLabel: "Editar perfil",
      color: "text-blue-500",
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
      action: () => console.log("Gerenciar usuários"),
      actionLabel: "Gerenciar usuários",
      color: "text-purple-500",
    },
    {
      icon: UsersRound,
      title: "Equipes",
      description: "Organize suas equipes de atendimento.",
      action: () => console.log("Gerenciar equipes"),
      actionLabel: "Gerenciar equipes",
      color: "text-cyan-500",
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
                  <card.icon className="h-6 w-6" />
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
