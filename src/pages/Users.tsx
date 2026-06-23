import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Users as UsersIcon, UserPlus, ArrowLeft, Ban, CheckCircle2, Shield, Headset } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CompanyUser {
  id: string;
  user_id: string;
  full_name: string | null;
  role: string;
  email: string;
  created_at: string;
}

async function callManageUsers(body: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const res = await supabase.functions.invoke("manage-users", {
    body,
  });

  if (res.error) throw new Error(res.error.message);
  if (res.data?.error) throw new Error(res.data.error);
  return res.data;
}

const roleBadge = (role: string) => {
  switch (role) {
    case "admin":
      return <Badge className="bg-primary/15 text-primary border-primary/30">Admin</Badge>;
    case "manager":
      return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30">Gerente</Badge>;
    case "agent":
      return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Atendente</Badge>;
    default:
      return <Badge variant="secondary">{role}</Badge>;
  }
};

const roleIcon = (role: string) => {
  switch (role) {
    case "admin":
      return <Shield className="h-4 w-4 text-primary" />;
    case "manager":
      return <Shield className="h-4 w-4 text-amber-500" />;
    default:
      return <Headset className="h-4 w-4 text-emerald-500" />;
  }
};

const Users = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("agent");

  const { data: users = [], isLoading } = useQuery<CompanyUser[]>({
    queryKey: ["company-users"],
    queryFn: async () => {
      const result = await callManageUsers({ action: "list" });
      return result.users || [];
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      return callManageUsers({
        action: "create_user",
        email: inviteEmail,
        password: invitePassword,
        full_name: inviteName || null,
        role: inviteRole,
      });
    },
    onSuccess: () => {
      toast.success("Usuário criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["company-users"] });
      setInviteOpen(false);
      setInviteEmail("");
      setInvitePassword("");
      setInviteName("");
      setInviteRole("agent");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ user_id, role }: { user_id: string; role: string }) => {
      return callManageUsers({ action: "update_role", user_id, role });
    },
    onSuccess: () => {
      toast.success("Papel atualizado!");
      queryClient.invalidateQueries({ queryKey: ["company-users"] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (user_id: string) => {
      return callManageUsers({ action: "remove", user_id });
    },
    onSuccess: () => {
      toast.success("Usuário removido.");
      queryClient.invalidateQueries({ queryKey: ["company-users"] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <UsersIcon className="h-6 w-6 text-primary" />
              Gerenciar Usuários
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Adicione atendentes e gerentes à sua equipe.
            </p>
          </div>
        </div>

        <div className="flex justify-end mb-4">
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
             <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Criar Usuário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar novo usuário</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">E-mail *</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="usuario@email.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-password">Senha *</Label>
                  <Input
                    id="invite-password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={invitePassword}
                    onChange={(e) => setInvitePassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-name">Nome completo</Label>
                  <Input
                    id="invite-name"
                    placeholder="Nome do usuário"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cargo</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agent">
                        <span className="flex items-center gap-2">
                          <Headset className="h-4 w-4 text-emerald-500" /> Atendente
                        </span>
                      </SelectItem>
                      <SelectItem value="manager">
                        <span className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-amber-500" /> Gerente
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancelar</Button>
                </DialogClose>
                <Button
                  onClick={() => inviteMutation.mutate()}
                  disabled={!inviteEmail || !invitePassword || invitePassword.length < 6 || inviteMutation.isPending}
                >
                  {inviteMutation.isPending ? "Criando..." : "Criar Usuário"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando...</div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nenhum usuário encontrado. Convide alguém para começar!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {roleIcon(user.role)}
                        <span className="font-medium">{user.full_name || "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>{roleBadge(user.role)}</TableCell>
                    <TableCell className="text-right">
                      {user.role === "admin" ? (
                        <span className="text-xs text-muted-foreground">Proprietário</span>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <Select
                            value={user.role}
                            onValueChange={(newRole) =>
                              updateRoleMutation.mutate({ user_id: user.user_id, role: newRole })
                            }
                          >
                            <SelectTrigger className="w-[130px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="agent">Atendente</SelectItem>
                              <SelectItem value="manager">Gerente</SelectItem>
                            </SelectContent>
                          </Select>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover usuário?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {user.full_name || user.email} será removido da sua empresa. Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => removeMutation.mutate(user.user_id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Remover
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Users;
