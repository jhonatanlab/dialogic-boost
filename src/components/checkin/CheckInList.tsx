import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ClipboardList, Trash2, Search } from "lucide-react";
import { useCheckins } from "@/hooks/useCheckins";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const CheckInList = () => {
  const { checkins, deleteCheckin } = useCheckins();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCheckins = checkins.filter((checkin) => {
    const search = searchTerm.toLowerCase();
    return (
      checkin.customer_phone.includes(search) ||
      checkin.customer_name?.toLowerCase().includes(search) ||
      false
    );
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Check-ins Realizados
        </CardTitle>
        <CardDescription>
          Total: {checkins.length} check-ins
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por telefone ou nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Fonte</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCheckins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum check-in encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredCheckins.map((checkin) => (
                  <TableRow key={checkin.id}>
                    <TableCell>{checkin.customer_name || "—"}</TableCell>
                    <TableCell>{checkin.customer_phone}</TableCell>
                    <TableCell>
                      {format(new Date(checkin.created_at), "dd/MM/yyyy HH:mm", {
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell>
                      {checkin.source === "qr_code" ? "QR Code" : "Link"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteCheckin.mutate(checkin.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
