import { useState } from "react";
import { useCheckinRecords } from "@/hooks/useCheckinRecords";
import { useFidelityCards } from "@/hooks/useFidelityCards";
import { useCompany } from "@/hooks/useCompany";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const CheckinRecordsTable = () => {
  const { checkinRecords, isLoading, deleteCheckinRecord } = useCheckinRecords();
  const { fidelityCards } = useFidelityCards();
  const { profile } = useCompany();
  const [searchTerm, setSearchTerm] = useState("");

  const canDelete = profile?.role === "admin" || profile?.role === "manager";

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      identified: "default",
      completed: "default",
      expired: "outline",
    };
    const labels: Record<string, string> = {
      pending: "Aguardando",
      identified: "Identificado",
      completed: "Concluído",
      expired: "Expirado",
    };
    return <Badge variant={variants[status] || "default"}>{labels[status] || status}</Badge>;
  };

  const filteredRecords = checkinRecords.filter((record) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      record.checkin_links?.name.toLowerCase().includes(searchLower) ||
      record.contacts?.name.toLowerCase().includes(searchLower) ||
      record.contacts?.phone?.toLowerCase().includes(searchLower) ||
      record.whatsapp_user?.toLowerCase().includes(searchLower) ||
      record.token?.toLowerCase().includes(searchLower)
    );
  });

  const getContactFidelityProgress = (contactId: string | null) => {
    if (!contactId) return null;
    const card = fidelityCards.find(c => c.contact_id === contactId && c.status === 'active');
    return card;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registros de Check-in</CardTitle>
        <CardDescription>
          Histórico completo de check-ins realizados
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, telefone, origem ou token..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Token</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Fidelidade</TableHead>
              {canDelete && <TableHead className="w-[60px]">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRecords.map((record) => {
              const fidelityCard = getContactFidelityProgress(record.contact_id);
              return (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">
                    {record.contacts?.name || (
                      <span className="text-muted-foreground italic">Não identificado</span>
                    )}
                  </TableCell>
                  <TableCell>{record.contacts?.phone || record.whatsapp_user || "-"}</TableCell>
                  <TableCell>{record.checkin_links?.name || "N/A"}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(record.timestamp), "dd/MM/yyyy HH:mm")}
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {record.token || "-"}
                    </code>
                  </TableCell>
                  <TableCell>{getStatusBadge(record.status)}</TableCell>
                  <TableCell>
                    {fidelityCard ? (
                      <div className="space-y-1 min-w-[150px]">
                        <div className="flex items-center justify-between text-xs">
                          <span>{fidelityCard.current_stamps}/{fidelityCard.target_stamps}</span>
                          <span className="text-muted-foreground">
                            {Math.round((fidelityCard.current_stamps / fidelityCard.target_stamps) * 100)}%
                          </span>
                        </div>
                        <Progress 
                          value={(fidelityCard.current_stamps / fidelityCard.target_stamps) * 100} 
                          className="h-2"
                        />
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {isLoading && <div className="text-center py-4">Carregando...</div>}
        {!isLoading && filteredRecords.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            Nenhum registro encontrado
          </div>
        )}
      </CardContent>
    </Card>
  );
};
