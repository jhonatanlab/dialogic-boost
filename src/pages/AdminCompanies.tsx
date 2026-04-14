import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  Users,
  ShieldCheck,
  ShieldOff,
  Search,
  Ban,
  CheckCircle,
  Plus,
} from "lucide-react";
import { format } from "date-fns";

const AdminCompanies = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyCnpj, setNewCompanyCnpj] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Check admin role
  useEffect(() => {
    const checkAdmin = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        navigate("/auth");
        return;
      }
      const { data } = await supabase.rpc("has_role", {
        _user_id: userData.user.id,
        _role: "admin" as const,
      });
      if (!data) {
        navigate("/dashboard");
        return;
      }
      setIsAdmin(true);
    };
    checkAdmin();
  }, [navigate]);

  // Fetch companies with user count
  const { data: companies, isLoading } = useQuery({
    queryKey: ["admin-companies"],
    queryFn: async () => {
      const { data: companiesData, error } = await supabase
        .from("companies")
        .select("*")
        .order("name");
      if (error) throw error;

      const { data: profileCounts, error: pcError } = await supabase
        .from("profiles")
        .select("company_id");
      if (pcError) throw pcError;

      const countMap: Record<string, number> = {};
      profileCounts?.forEach((p) => {
        countMap[p.company_id] = (countMap[p.company_id] || 0) + 1;
      });

      return companiesData.map((c) => ({
        ...c,
        user_count: countMap[c.id] || 0,
      }));
    },
    enabled: isAdmin === true,
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("companies")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-companies"] });
      toast({
        title: variables.is_active ? "Empresa reativada" : "Empresa bloqueada",
        description: variables.is_active
          ? "A empresa foi reativada com sucesso."
          : "A empresa foi bloqueada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createCompany = useMutation({
    mutationFn: async () => {
      if (!newCompanyName.trim()) throw new Error("Nome da empresa é obrigatório");
      const { error } = await supabase
        .from("companies")
        .insert({ name: newCompanyName.trim(), cnpj: newCompanyCnpj.trim() || null });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-companies"] });
      toast({ title: "Empresa cadastrada com sucesso!" });
      setNewCompanyName("");
      setNewCompanyCnpj("");
      setShowCreateForm(false);
    },
    onError: (error: any) => {
      toast({ title: "Erro ao cadastrar empresa", description: error.message, variant: "destructive" });
    },
  });

  if (isAdmin === null) return null;

  const filtered = companies?.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const totalCompanies = companies?.length ?? 0;
  const activeCompanies = companies?.filter((c) => c.is_active !== false).length ?? 0;
  const blockedCompanies = totalCompanies - activeCompanies;
  const totalUsers = companies?.reduce((sum, c) => sum + c.user_count, 0) ?? 0;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-orange-500/20">
            <Building2 className="h-8 w-8 text-orange-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin SaaS — Empresas</h1>
            <p className="text-muted-foreground">Gerenciamento de empresas do EloChat</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Total de Empresas</p>
                  <p className="text-2xl font-bold">{totalCompanies}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Empresas Ativas</p>
                  <p className="text-2xl font-bold">{activeCompanies}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <ShieldOff className="h-5 w-5 text-destructive" />
                <div>
                  <p className="text-sm text-muted-foreground">Empresas Bloqueadas</p>
                  <p className="text-2xl font-bold">{blockedCompanies}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total de Usuários</p>
                  <p className="text-2xl font-bold">{totalUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Create Company Form */}
        {showCreateForm && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cadastrar Nova Empresa</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createCompany.mutate();
                }}
                className="flex flex-col sm:flex-row gap-4 items-end"
              >
                <div className="flex-1 space-y-2">
                  <Label>Nome da Empresa *</Label>
                  <Input
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    placeholder="Nome da empresa"
                    required
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <Label>CNPJ</Label>
                  <Input
                    value={newCompanyCnpj}
                    onChange={(e) => setNewCompanyCnpj(e.target.value)}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={createCompany.isPending}>
                    {createCompany.isPending ? "Cadastrando..." : "Cadastrar"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Empresas</CardTitle>
              <div className="flex items-center gap-3">
                {!showCreateForm && (
                  <Button size="sm" onClick={() => setShowCreateForm(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Nova Empresa
                  </Button>
                )}
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar empresa..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">Carregando...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Usuários</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        Nenhuma empresa encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((company) => {
                      const active = company.is_active !== false;
                      return (
                        <TableRow key={company.id}>
                          <TableCell className="font-medium">{company.name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {company.cnpj || "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{company.plan}</Badge>
                          </TableCell>
                          <TableCell>{company.user_count}</TableCell>
                          <TableCell>
                            {active ? (
                              <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                                Ativa
                              </Badge>
                            ) : (
                              <Badge variant="destructive">Bloqueada</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(company.created_at), "dd/MM/yyyy")}
                          </TableCell>
                          <TableCell className="text-right">
                            {active ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                                onClick={() =>
                                  toggleActive.mutate({ id: company.id, is_active: false })
                                }
                                disabled={toggleActive.isPending}
                              >
                                <Ban className="h-4 w-4 mr-1" />
                                Bloquear
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-500 border-green-500/30 hover:bg-green-500/10"
                                onClick={() =>
                                  toggleActive.mutate({ id: company.id, is_active: true })
                                }
                                disabled={toggleActive.isPending}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Reativar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminCompanies;
