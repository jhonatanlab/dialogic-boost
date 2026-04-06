import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { User, Lock, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCompany } from "@/hooks/useCompany";

const Profile = () => {
  const { profile } = useCompany();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name);
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email);
    });
  }, [profile]);

  const handleSaveName = async () => {
    if (!fullName.trim()) {
      toast.error("Nome não pode estar vazio");
      return;
    }
    setSavingName(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim() })
        .eq("id", profile?.id);
      if (error) throw error;
      toast.success("Nome atualizado com sucesso");
    } catch {
      toast.error("Erro ao atualizar nome");
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error("Preencha todos os campos de senha");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Senha alterada com sucesso");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast.error("Erro ao alterar senha");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <User className="h-8 w-8 text-primary" />
            Meu Perfil
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie suas informações pessoais e senha.
          </p>
        </div>

        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Informações Pessoais
          </h2>
          <div className="space-y-3">
            <div>
              <Label>E-mail</Label>
              <Input value={email} disabled className="bg-muted" />
            </div>
            <div>
              <Label>Nome completo</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome"
              />
            </div>
          </div>
          <Button onClick={handleSaveName} disabled={savingName} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            {savingName ? "Salvando..." : "Salvar Nome"}
          </Button>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Alterar Senha
          </h2>
          <div className="space-y-3">
            <div>
              <Label>Nova senha</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div>
              <Label>Confirmar nova senha</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
              />
            </div>
          </div>
          <Button onClick={handleChangePassword} disabled={savingPassword} className="w-full">
            <Lock className="h-4 w-4 mr-2" />
            {savingPassword ? "Alterando..." : "Alterar Senha"}
          </Button>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
