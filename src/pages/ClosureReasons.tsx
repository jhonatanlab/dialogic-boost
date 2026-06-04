import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Plus, Trash2, ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/hooks/useCompany";
import {
  useClosureReasons,
  useCreateClosureReason,
  useUpdateClosureReason,
  useDeleteClosureReason,
} from "@/hooks/useClosureReasons";

const ClosureReasons = () => {
  const navigate = useNavigate();
  const { profile, isLoading: loadingProfile } = useCompany();
  const { data: reasons = [], isLoading } = useClosureReasons(false);
  const createReason = useCreateClosureReason();
  const updateReason = useUpdateClosureReason();
  const deleteReason = useDeleteClosureReason();

  const [newName, setNewName] = useState("");

  const canManage = profile?.role === "admin" || profile?.role === "manager";

  useEffect(() => {
    if (!loadingProfile && !canManage) navigate("/settings");
  }, [loadingProfile, canManage, navigate]);

  if (loadingProfile || !canManage) return null;

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await createReason.mutateAsync({ name: newName, sort_order: reasons.length });
    setNewName("");
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-3xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => navigate("/settings")} className="mb-4 gap-1">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-primary" />
            Motivos de Conclusão
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cadastre os motivos que aparecerão quando um atendente concluir uma conversa.
          </p>
        </div>

        <Card className="p-4 mb-4">
          <div className="flex gap-2">
            <Input
              placeholder="Ex: Problema resolvido"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <Button onClick={handleAdd} disabled={!newName.trim() || createReason.isPending} className="gap-1">
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </div>
        </Card>

        <Card className="p-2">
          {isLoading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Carregando...
            </div>
          ) : reasons.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nenhum motivo cadastrado ainda.
            </div>
          ) : (
            <div className="divide-y">
              {reasons.map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.name}</p>
                  </div>
                  {!r.is_active && <Badge variant="outline" className="text-[10px]">Inativo</Badge>}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">Ativo</span>
                    <Switch
                      checked={r.is_active}
                      onCheckedChange={(v) => updateReason.mutate({ id: r.id, is_active: v })}
                    />
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm(`Remover o motivo "${r.name}"?`)) deleteReason.mutate(r.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ClosureReasons;
