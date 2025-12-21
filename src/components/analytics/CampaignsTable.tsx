import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CampaignPerformance } from "@/hooks/useAnalytics";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CampaignsTableProps {
  campaigns: CampaignPerformance[];
}

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  scheduled: "Agendada",
  sending: "Enviando",
  sent: "Enviada",
  failed: "Falhou",
};

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  scheduled: "outline",
  sending: "default",
  sent: "default",
  failed: "destructive",
};

export function CampaignsTable({ campaigns }: CampaignsTableProps) {
  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Performance das Campanhas</CardTitle>
        <CardDescription>Detalhamento de envios por campanha</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Contatos</TableHead>
              <TableHead className="text-center">Enviados</TableHead>
              <TableHead className="text-center">Falhas</TableHead>
              <TableHead className="text-center">Pendentes</TableHead>
              <TableHead>Taxa de Sucesso</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Nenhuma campanha encontrada no período selecionado
                </TableCell>
              </TableRow>
            ) : (
              campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariants[campaign.status] || "secondary"}>
                      {statusLabels[campaign.status] || campaign.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">{campaign.total_contacts}</TableCell>
                  <TableCell className="text-center text-green-600 font-medium">
                    {campaign.sent_count}
                  </TableCell>
                  <TableCell className="text-center text-red-600 font-medium">
                    {campaign.failed_count}
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {campaign.pending_count}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={campaign.success_rate} className="h-2 w-20" />
                      <span className="text-sm font-medium">{campaign.success_rate}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(campaign.created_at), "dd MMM yyyy", { locale: ptBR })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
