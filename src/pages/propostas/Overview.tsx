import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCompany } from "@/hooks/useCompany";
import {
  PROPOSAL_STATUS_LABELS,
  useDeleteSolarProposal,
  useSolarProposals,
  useUpdateProposalStatus,
  type ProposalStatus,
} from "@/hooks/useSolarProposals";
import { FileText, Loader2, Plus, Search, Settings2, Trash2 } from "lucide-react";

const currency = (v: number | null | undefined) =>
  v === null || v === undefined
    ? "-"
    : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const statusVariant = (status: ProposalStatus) =>
  status === "accepted" ? "default" : status === "rejected" ? "destructive" : "outline";

const ProposalsOverview = () => {
  const navigate = useNavigate();
  const { profile } = useCompany();
  const canManage = profile?.role === "admin" || profile?.role === "manager";
  const { data: proposals = [], isLoading } = useSolarProposals();
  const updateStatus = useUpdateProposalStatus();
  const deleteProposal = useDeleteSolarProposal();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(
    () =>
      proposals
        .filter((p) => (statusFilter === "all" ? true : p.status === statusFilter))
        .filter((p) => {
          const term = search.trim().toLowerCase();
          if (!term) return true;
          return (
            p.client_name.toLowerCase().includes(term) ||
            String(p.quote_number ?? "").includes(term)
          );
        }),
    [proposals, search, statusFilter]
  );

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" /> Propostas
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Propostas geradas para os clientes da sua empresa.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canManage && (
              <Button variant="outline" asChild>
                <Link to="/propostas/configuracoes">
                  <Settings2 className="h-4 w-4 mr-2" />
                  Configurações
                </Link>
              </Button>
            )}
            <Button asChild>
              <Link to="/propostas/nova">
                <Plus className="h-4 w-4 mr-2" />
                Nova proposta
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente ou nº..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Situação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as situações</SelectItem>
              {Object.entries(PROPOSAL_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[90px]">Nº cotação</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>kWp</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="w-[80px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Carregando...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-sm text-muted-foreground">
                    Nenhuma proposta encontrada. Clique em “Nova proposta” para gerar a primeira.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => {
                  return (
                    <TableRow
                      key={p.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/propostas/${p.id}`)}
                    >
                      <TableCell className="text-sm font-mono">
                        #{String(p.quote_number ?? "-").padStart(3, "0")}
                      </TableCell>
                      <TableCell className="font-medium">
                        {p.client_name}
                        {p.client_phone && (
                          <span className="block text-xs text-muted-foreground">
                            {p.client_phone}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{p.kwp_total ?? "-"}</TableCell>
                      <TableCell className="text-sm">{currency(p.cash_price)}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={p.status}
                          onValueChange={(status) =>
                            updateStatus.mutate({ id: p.id, status: status as ProposalStatus })
                          }
                        >
                          <SelectTrigger className="h-8 w-[130px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(PROPOSAL_STATUS_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm(`Excluir a proposta de ${p.client_name}?`))
                              deleteProposal.mutate(p.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>

        {!isLoading && filtered.length > 0 && (
          <div className="flex gap-2 text-xs text-muted-foreground">
            {Object.entries(PROPOSAL_STATUS_LABELS).map(([value, label]) => (
              <Badge key={value} variant={statusVariant(value as ProposalStatus)}>
                {label}: {proposals.filter((p) => p.status === value).length}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ProposalsOverview;
