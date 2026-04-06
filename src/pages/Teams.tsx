import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  UsersRound, Plus, ArrowLeft, Trash2, Pencil, UserPlus, UserMinus,
  Globe, Users, User, MessageSquare,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Team {
  id: string;
  name: string;
  description: string | null;
  access_level: string;
  channel: string;
  created_at: string;
  members: TeamMember[];
}

interface TeamMember {
  id: string;
  member_user_id: string;
  full_name: string | null;
  email: string;
  role: string;
}

interface CompanyUser {
  user_id: string;
  full_name: string | null;
  email: string;
  role: string;
}

const ACCESS_OPTIONS = [
  {
    value: "all",
    label: "Todos",
    icon: Globe,
    description: "Visível aos usuários desta equipe na aba Outros e a todos os usuários na aba Concluídos.",
  },
  {
    value: "team",
    label: "Equipe",
    icon: Users,
    description: "Visível apenas aos usuários desta equipe nas abas Outros e Concluídos.",
  },
  {
    value: "agent",
    label: "Atendente",
    icon: User,
    description: "Visível apenas ao atendente da conversa e aos supervisores desta equipe nas abas Outros e Concluídos.",
  },
];

const CHANNEL_OPTIONS = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram", label: "Instagram" },
  { value: "telegram", label: "Telegram" },
  { value: "email", label: "E-mail" },
];

const Teams = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { companyId } = useCompany();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTeam, setEditTeam] = useState<Team | null>(null);
  const [teamName, setTeamName] = useState("");
  const [teamDesc, setTeamDesc] = useState("");
  const [accessLevel, setAccessLevel] = useState("all");
  const [channel, setChannel] = useState("whatsapp");
  const [createMembers, setCreateMembers] = useState<string[]>([]);

  const [membersDialogTeam, setMembersDialogTeam] = useState<Team | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const resetForm = () => {
    setTeamName("");
    setTeamDesc("");
    setAccessLevel("all");
    setChannel("whatsapp");
    setCreateMembers([]);
  };

  // Fetch teams with members
  const { data: teams = [], isLoading } = useQuery<Team[]>({
    queryKey: ["company-teams", companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data: teamsData, error } = await supabase
        .from("teams")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const teamsWithMembers: Team[] = [];
      for (const team of teamsData || []) {
        const { data: membersData } = await supabase
          .from("team_members")
          .select("id, member_user_id")
          .eq("team_id", team.id);

        const members: TeamMember[] = [];
        for (const m of membersData || []) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("full_name, role, user_id")
            .eq("user_id", m.member_user_id)
            .maybeSingle();

          members.push({
            id: m.id,
            member_user_id: m.member_user_id,
            full_name: prof?.full_name || null,
            email: "",
            role: prof?.role || "agent",
          });
        }

        teamsWithMembers.push({
          ...team,
          access_level: (team as any).access_level || "all",
          channel: (team as any).channel || "whatsapp",
          members,
        });
      }

      return teamsWithMembers;
    },
    enabled: !!companyId,
  });

  const { data: companyUsers = [] } = useQuery<CompanyUser[]>({
    queryKey: ["company-users-for-teams", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, role")
        .eq("company_id", companyId);
      if (error) throw error;
      return (data || []).map((p) => ({
        user_id: p.user_id,
        full_name: p.full_name,
        email: "",
        role: p.role,
      }));
    },
    enabled: !!companyId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Não autenticado");

      const { data: newTeam, error } = await supabase.from("teams").insert({
        name: teamName.trim(),
        description: teamDesc.trim() || null,
        user_id: userData.user.id,
        company_id: companyId,
        access_level: accessLevel,
        channel,
      } as any).select().single();
      if (error) throw error;

      // Add selected members
      if (createMembers.length > 0 && newTeam) {
        const inserts = createMembers.map((uid) => ({
          team_id: newTeam.id,
          member_user_id: uid,
          company_id: companyId,
        }));
        const { error: mErr } = await supabase.from("team_members").insert(inserts);
        if (mErr) throw mErr;
      }
    },
    onSuccess: () => {
      toast.success("Equipe criada!");
      queryClient.invalidateQueries({ queryKey: ["company-teams"] });
      setCreateOpen(false);
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editTeam) return;
      const { error } = await supabase
        .from("teams")
        .update({
          name: teamName.trim(),
          description: teamDesc.trim() || null,
          access_level: accessLevel,
          channel,
        } as any)
        .eq("id", editTeam.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Equipe atualizada!");
      queryClient.invalidateQueries({ queryKey: ["company-teams"] });
      setEditTeam(null);
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (teamId: string) => {
      const { error } = await supabase.from("teams").delete().eq("id", teamId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Equipe removida.");
      queryClient.invalidateQueries({ queryKey: ["company-teams"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addMembersMutation = useMutation({
    mutationFn: async ({ teamId, userIds }: { teamId: string; userIds: string[] }) => {
      const inserts = userIds.map((uid) => ({
        team_id: teamId,
        member_user_id: uid,
        company_id: companyId,
      }));
      const { error } = await supabase.from("team_members").insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Membros adicionados!");
      queryClient.invalidateQueries({ queryKey: ["company-teams"] });
      setMembersDialogTeam(null);
      setSelectedUsers([]);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (membershipId: string) => {
      const { error } = await supabase.from("team_members").delete().eq("id", membershipId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Membro removido.");
      queryClient.invalidateQueries({ queryKey: ["company-teams"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openEdit = (team: Team) => {
    setEditTeam(team);
    setTeamName(team.name);
    setTeamDesc(team.description || "");
    setAccessLevel(team.access_level);
    setChannel(team.channel);
  };

  const openAddMembers = (team: Team) => {
    setMembersDialogTeam(team);
    setSelectedUsers([]);
  };

  const existingMemberIds = membersDialogTeam?.members.map((m) => m.member_user_id) || [];
  const availableUsers = companyUsers.filter((u) => !existingMemberIds.includes(u.user_id));

  const toggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleCreateMember = (userId: string) => {
    setCreateMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const roleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-primary/15 text-primary border-primary/30 text-xs">Admin</Badge>;
      case "manager":
        return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-xs">Gerente</Badge>;
      default:
        return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-xs">Atendente</Badge>;
    }
  };

  const accessLabel = (level: string) => {
    const opt = ACCESS_OPTIONS.find((o) => o.value === level);
    return opt?.label || level;
  };

  const channelLabel = (ch: string) => {
    const opt = CHANNEL_OPTIONS.find((o) => o.value === ch);
    return opt?.label || ch;
  };

  const renderAccessLevelSelector = (value: string, onChange: (v: string) => void) => (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        Acesso aos atendimentos
      </Label>
      <div className="grid gap-2">
        {ACCESS_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 text-left transition-all",
                selected
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-muted-foreground/30 hover:bg-accent/50"
              )}
            >
              <div className={cn(
                "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-semibold", selected && "text-primary")}>{opt.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{opt.description}</p>
              </div>
              <div className={cn(
                "mt-1 h-4 w-4 shrink-0 rounded-full border-2 transition-colors",
                selected ? "border-primary bg-primary" : "border-muted-foreground/40"
              )}>
                {selected && (
                  <div className="h-full w-full flex items-center justify-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderTeamFormFields = (isCreate: boolean) => (
    <div className="space-y-5 py-2">
      <div className="space-y-2">
        <Label>Nome *</Label>
        <Input placeholder="Ex: Suporte Nível 1" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Descrição</Label>
        <Textarea placeholder="Descrição da equipe..." value={teamDesc} onChange={(e) => setTeamDesc(e.target.value)} rows={2} />
      </div>

      {/* Add members (create only) */}
      {isCreate && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-muted-foreground" />
            Adicionar usuários à equipe
          </Label>
          {companyUsers.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum usuário disponível.</p>
          ) : (
            <div className="space-y-1 max-h-40 overflow-y-auto rounded-lg border p-2">
              {companyUsers.map((u) => (
                <label
                  key={u.user_id}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-accent cursor-pointer"
                >
                  <Checkbox
                    checked={createMembers.includes(u.user_id)}
                    onCheckedChange={() => toggleCreateMember(u.user_id)}
                  />
                  <span className="flex-1 text-sm font-medium">{u.full_name || "Sem nome"}</span>
                  {roleBadge(u.role)}
                </label>
              ))}
            </div>
          )}
          {createMembers.length > 0 && (
            <p className="text-xs text-muted-foreground">{createMembers.length} selecionado(s)</p>
          )}
        </div>
      )}

      {/* Access level */}
      {renderAccessLevelSelector(accessLevel, setAccessLevel)}

      {/* Channel */}
      <div className="space-y-2">
        <Label>Canal da equipe</Label>
        <Select value={channel} onValueChange={setChannel}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CHANNEL_OPTIONS.map((ch) => (
              <SelectItem key={ch.value} value={ch.value}>{ch.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <UsersRound className="h-6 w-6 text-primary" />
              Equipes
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Organize seus atendentes em equipes de trabalho.
            </p>
          </div>
        </div>

        {/* Create button */}
        <div className="flex justify-end mb-4">
          <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Equipe
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Criar equipe</DialogTitle>
              </DialogHeader>
              {renderTeamFormFields(true)}
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancelar</Button>
                </DialogClose>
                <Button onClick={() => createMutation.mutate()} disabled={!teamName.trim() || createMutation.isPending}>
                  {createMutation.isPending ? "Criando..." : "Criar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit dialog */}
        <Dialog open={!!editTeam} onOpenChange={(open) => { if (!open) { setEditTeam(null); resetForm(); } }}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar equipe</DialogTitle>
            </DialogHeader>
            {renderTeamFormFields(false)}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setEditTeam(null); resetForm(); }}>Cancelar</Button>
              <Button onClick={() => updateMutation.mutate()} disabled={!teamName.trim() || updateMutation.isPending}>
                {updateMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Members dialog */}
        <Dialog open={!!membersDialogTeam} onOpenChange={(open) => { if (!open) setMembersDialogTeam(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar membros — {membersDialogTeam?.name}</DialogTitle>
            </DialogHeader>
            {availableUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Todos os usuários já fazem parte desta equipe.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto py-2">
                {availableUsers.map((u) => (
                  <label
                    key={u.user_id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedUsers.includes(u.user_id)}
                      onCheckedChange={() => toggleUser(u.user_id)}
                    />
                    <span className="flex-1 text-sm font-medium">{u.full_name || "Sem nome"}</span>
                    {roleBadge(u.role)}
                  </label>
                ))}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setMembersDialogTeam(null)}>Cancelar</Button>
              <Button
                disabled={selectedUsers.length === 0 || addMembersMutation.isPending}
                onClick={() =>
                  membersDialogTeam &&
                  addMembersMutation.mutate({ teamId: membersDialogTeam.id, userIds: selectedUsers })
                }
              >
                {addMembersMutation.isPending ? "Adicionando..." : `Adicionar (${selectedUsers.length})`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Teams list */}
        {isLoading ? (
          <div className="text-center text-muted-foreground py-12">Carregando...</div>
        ) : teams.length === 0 ? (
          <Card className="p-12 text-center">
            <UsersRound className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-1">Nenhuma equipe criada</h3>
            <p className="text-sm text-muted-foreground">Crie uma equipe para organizar seus atendentes.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {teams.map((team) => (
              <Card key={team.id} className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold">{team.name}</h3>
                    {team.description && (
                      <p className="text-sm text-muted-foreground mt-0.5">{team.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        Acesso: {accessLabel(team.access_level)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Canal: {channelLabel(team.channel)}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(team)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir equipe?</AlertDialogTitle>
                          <AlertDialogDescription>
                            A equipe "{team.name}" e todos os seus vínculos serão removidos.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(team.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                {/* Members */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Membros ({team.members.length})
                  </span>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openAddMembers(team)}>
                    <UserPlus className="h-3 w-3 mr-1" />
                    Adicionar
                  </Button>
                </div>

                {team.members.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Nenhum membro ainda.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {team.members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-2 bg-accent/50 rounded-full pl-3 pr-1.5 py-1 text-sm"
                      >
                        <span className="font-medium">{member.full_name || "Sem nome"}</span>
                        {roleBadge(member.role)}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 rounded-full text-muted-foreground hover:text-destructive"
                          onClick={() => removeMemberMutation.mutate(member.id)}
                        >
                          <UserMinus className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Teams;
