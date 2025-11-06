import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Search } from "lucide-react";
import { useCheckinRecords } from "@/hooks/useCheckinRecords";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const CheckinRecordsTable = () => {
  const { checkinRecords, isLoading } = useCheckinRecords();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredRecords = checkinRecords.filter((record: any) =>
    record.whatsapp_user?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.checkin_links?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Acompanhamento de Check-ins</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente ou origem..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progresso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    {searchTerm ? "Nenhum registro encontrado" : "Nenhum check-in registrado ainda"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((record: any) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      {record.whatsapp_user || <span className="text-muted-foreground">Aguardando...</span>}
                    </TableCell>
                    <TableCell>{record.checkin_links?.name || "N/A"}</TableCell>
                    <TableCell>
                      {format(new Date(record.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={record.status === "pending" ? "secondary" : "default"}>
                        {record.status === "pending" ? "Pendente" : "Identificado"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={(record.fidelity_progress / 10) * 100} className="w-24" />
                        <span className="text-sm text-muted-foreground">
                          {record.fidelity_progress}/10
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
