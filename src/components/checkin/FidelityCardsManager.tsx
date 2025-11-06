import { useFidelityCards } from "@/hooks/useFidelityCards";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Gift, Trophy } from "lucide-react";

export const FidelityCardsManager = () => {
  const { fidelityCards, isLoading, rewardCard } = useFidelityCards();

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      active: "default",
      completed: "secondary",
      rewarded: "outline",
    };
    const labels: Record<string, string> = {
      active: "Ativo",
      completed: "Completo",
      rewarded: "Premiado",
    };
    return <Badge variant={variants[status] || "default"}>{labels[status] || status}</Badge>;
  };

  const activeCards = fidelityCards.filter(c => c.status === 'active');
  const completedCards = fidelityCards.filter(c => c.status === 'completed');
  const rewardedCards = fidelityCards.filter(c => c.status === 'rewarded');

  return (
    <div className="space-y-6">
      {/* Active Cards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Cartões Ativos
          </CardTitle>
          <CardDescription>
            Clientes com cartões fidelidade em progresso
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Programa</TableHead>
                <TableHead>Progresso</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeCards.map((card) => (
                <TableRow key={card.id}>
                  <TableCell className="font-medium">{card.contacts?.name}</TableCell>
                  <TableCell>{card.contacts?.phone || "-"}</TableCell>
                  <TableCell>{card.fidelity_programs?.name}</TableCell>
                  <TableCell>
                    <div className="space-y-1 min-w-[200px]">
                      <div className="flex items-center justify-between text-xs">
                        <span>{card.current_stamps}/{card.target_stamps} carimbos</span>
                        <span className="text-muted-foreground">
                          {Math.round((card.current_stamps / card.target_stamps) * 100)}%
                        </span>
                      </div>
                      <Progress 
                        value={(card.current_stamps / card.target_stamps) * 100} 
                        className="h-2"
                      />
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(card.status)}</TableCell>
                </TableRow>
              ))}
              {activeCards.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum cartão ativo
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Completed Cards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Prontos para Premiar
          </CardTitle>
          <CardDescription>
            Clientes que completaram seus cartões fidelidade
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Programa</TableHead>
                <TableHead>Recompensa</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {completedCards.map((card) => (
                <TableRow key={card.id}>
                  <TableCell className="font-medium">{card.contacts?.name}</TableCell>
                  <TableCell>{card.contacts?.phone || "-"}</TableCell>
                  <TableCell>{card.fidelity_programs?.name}</TableCell>
                  <TableCell className="font-medium text-primary">
                    {card.fidelity_programs?.reward}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      onClick={() => rewardCard.mutate(card.id)}
                      disabled={rewardCard.isPending}
                    >
                      <Gift className="h-4 w-4 mr-1" />
                      Premiar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {completedCards.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum cartão completo aguardando premiação
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Rewarded History */}
      {rewardedCards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Premiações</CardTitle>
            <CardDescription>
              Cartões que já foram premiados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Programa</TableHead>
                  <TableHead>Recompensa</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rewardedCards.slice(0, 10).map((card) => (
                  <TableRow key={card.id}>
                    <TableCell>{card.contacts?.name}</TableCell>
                    <TableCell>{card.fidelity_programs?.name}</TableCell>
                    <TableCell>{card.fidelity_programs?.reward}</TableCell>
                    <TableCell>{getStatusBadge(card.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
