import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useCampaigns, type CampaignWithStats } from "@/hooks/useCampaigns";
import { Button } from "@/components/ui/button";
import { Plus, MoreVertical, Send, Trash2, Calendar } from "lucide-react";
import { CampaignForm } from "@/components/campaigns/CampaignForm";
import { CampaignDetailsModal } from "@/components/campaigns/CampaignDetailsModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusColors = {
  draft: "bg-gray-500",
  scheduled: "bg-blue-500",
  sending: "bg-yellow-500",
  sent: "bg-green-500",
  cancelled: "bg-red-500",
};

const statusLabels = {
  draft: "Rascunho",
  scheduled: "Agendada",
  sending: "Enviando",
  sent: "Enviada",
  cancelled: "Cancelada",
};

const Campaigns = () => {
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);
  const { campaigns, isLoading, createCampaign, deleteCampaign } = useCampaigns();

  const handleCreateCampaign = (data: { name: string; message: string; contactIds: string[] }) => {
    createCampaign(data);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Campanhas</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie suas campanhas e disparos em massa
            </p>
          </div>
          <Button onClick={() => navigate("/campaigns/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Campanha
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : campaigns && campaigns.length > 0 ? (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Destinatários</TableHead>
                  <TableHead>Enviados</TableHead>
                  <TableHead>Criada em</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell className="font-medium">{campaign.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={statusColors[campaign.status]}
                      >
                        {statusLabels[campaign.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>{campaign.total_contacts}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">
                          {campaign.sent_count}/{campaign.total_contacts}
                        </div>
                        {campaign.failed_count > 0 && (
                          <div className="text-xs text-destructive">
                            {campaign.failed_count} falhas
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(campaign.created_at), "dd/MM/yyyy HH:mm", {
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {campaign.status === 'draft' && (
                            <DropdownMenuItem>
                              <Send className="h-4 w-4 mr-2" />
                              Enviar
                            </DropdownMenuItem>
                          )}
                          {campaign.status === 'draft' && (
                            <DropdownMenuItem>
                              <Calendar className="h-4 w-4 mr-2" />
                              Agendar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => deleteCampaign(campaign.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12 border rounded-lg bg-muted/20">
            <Send className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma campanha criada</h3>
            <p className="text-muted-foreground mb-4">
              Crie sua primeira campanha para começar a enviar mensagens em massa.
            </p>
            <Button onClick={() => navigate("/campaigns/new")}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Campanha
            </Button>
          </div>
        )}

        <CampaignForm
          open={formOpen}
          onOpenChange={setFormOpen}
          onSubmit={handleCreateCampaign}
        />
      </div>
    </DashboardLayout>
  );
};

export default Campaigns;
