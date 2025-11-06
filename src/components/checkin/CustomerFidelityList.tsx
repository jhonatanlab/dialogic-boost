import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Star, RotateCcw } from "lucide-react";
import { useCustomerFidelity } from "@/hooks/useCustomerFidelity";
import { useFidelitySettings } from "@/hooks/useFidelitySettings";

export const CustomerFidelityList = () => {
  const { customers, resetCustomerFidelity } = useCustomerFidelity();
  const { settings } = useFidelitySettings();

  const getProgressStars = (current: number, goal: number) => {
    const stars = [];
    for (let i = 0; i < goal; i++) {
      stars.push(
        <Star
          key={i}
          className={`h-4 w-4 ${i < current ? "fill-primary text-primary" : "text-muted-foreground"}`}
        />
      );
    }
    return stars;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5" />
          Cartões Fidelidade
        </CardTitle>
        <CardDescription>
          Acompanhe o progresso dos seus clientes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Progresso</TableHead>
                <TableHead>Check-ins</TableHead>
                <TableHead>Prêmios</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhum cliente no programa ainda
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => {
                  const goal = settings?.checkins_goal || 10;
                  const progress = (customer.total_checkins / goal) * 100;
                  const canWinReward = customer.total_checkins >= goal;

                  return (
                    <TableRow key={customer.id}>
                      <TableCell>{customer.customer_name || "—"}</TableCell>
                      <TableCell>{customer.customer_phone}</TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <div className="flex gap-1">
                            {getProgressStars(customer.total_checkins, goal)}
                          </div>
                          <Progress value={Math.min(progress, 100)} />
                        </div>
                      </TableCell>
                      <TableCell>
                        {customer.total_checkins}/{goal}
                      </TableCell>
                      <TableCell>
                        {canWinReward && (
                          <Badge variant="default" className="bg-green-500">
                            Prêmio Disponível! 🎉
                          </Badge>
                        )}
                        {customer.total_rewards > 0 && !canWinReward && (
                          <span className="text-sm text-muted-foreground">
                            {customer.total_rewards} {customer.total_rewards === 1 ? "prêmio" : "prêmios"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => resetCustomerFidelity.mutate(customer.customer_phone)}
                          title="Reiniciar fidelidade"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
