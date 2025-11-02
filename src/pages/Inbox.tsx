import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Send, Phone, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const Inbox = () => {
  const conversations = [
    {
      id: 1,
      name: "Maria Silva",
      channel: "whatsapp",
      lastMessage: "Olá, gostaria de saber mais sobre o produto",
      time: "10:30",
      unread: 2,
      status: "active",
    },
    {
      id: 2,
      name: "João Santos",
      channel: "instagram",
      lastMessage: "Obrigado pelo atendimento!",
      time: "09:15",
      unread: 0,
      status: "completed",
    },
    {
      id: 3,
      name: "Ana Costa",
      channel: "messenger",
      lastMessage: "Quando posso retirar meu pedido?",
      time: "Ontem",
      unread: 1,
      status: "paused",
    },
  ];

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "whatsapp":
        return <Phone className="h-4 w-4 text-green-500" />;
      case "instagram":
        return <MessageSquare className="h-4 w-4 text-pink-500" />;
      case "messenger":
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: "default",
      paused: "secondary",
      completed: "outline",
    };
    const labels = {
      active: "Ativo",
      paused: "Pausado",
      completed: "Concluído",
    };
    return (
      <Badge variant={variants[status as keyof typeof variants] as any}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Inbox</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie todas as suas conversas em um só lugar
          </p>
        </div>

        <div className="flex-1 grid grid-cols-3 gap-4 min-h-0">
          <Card className="col-span-1 p-4 flex flex-col">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar conversas..."
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto space-y-2">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className="p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <Avatar>
                      <AvatarFallback>{conv.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {getChannelIcon(conv.channel)}
                          <span className="font-medium text-sm truncate">
                            {conv.name}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {conv.time}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate mb-2">
                        {conv.lastMessage}
                      </p>
                      <div className="flex items-center justify-between">
                        {getStatusBadge(conv.status)}
                        {conv.unread > 0 && (
                          <Badge variant="default" className="h-5 w-5 p-0 flex items-center justify-center">
                            {conv.unread}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="col-span-2 p-6 flex flex-col">
            <div className="border-b pb-4 mb-4">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>M</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">Maria Silva</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3 w-3 text-green-500" />
                    <span>WhatsApp</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto mb-4 space-y-4">
              <div className="flex justify-start">
                <div className="max-w-[70%] bg-muted p-3 rounded-lg">
                  <p className="text-sm">Olá, gostaria de saber mais sobre o produto</p>
                  <span className="text-xs text-muted-foreground mt-1 block">10:30</span>
                </div>
              </div>
              <div className="flex justify-end">
                <div className="max-w-[70%] bg-primary text-primary-foreground p-3 rounded-lg">
                  <p className="text-sm">Olá! Claro, como posso ajudar?</p>
                  <span className="text-xs opacity-70 mt-1 block">10:31</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Input placeholder="Digite sua mensagem..." />
              <Button size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Inbox;
