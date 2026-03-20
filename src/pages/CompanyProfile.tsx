import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Building2, Save, Loader2, Upload, Crown, Lock, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/hooks/useCompany";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  free: { label: "Gratuito", color: "bg-muted text-muted-foreground" },
  starter: { label: "Starter", color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  professional: { label: "Profissional", color: "bg-primary/15 text-primary border-primary/30" },
  enterprise: { label: "Enterprise", color: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
};

const CompanyProfile = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { company, companyId, profile, isLoading } = useCompany();

  const [companyName, setCompanyName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (company) {
      setCompanyName(company.name || "");
      setCnpj(company.cnpj || "");
      setCompanyAddress((company as any).address || "");
      setCompanyPhone((company as any).phone || "");
      setLogoUrl(null);
    }
    if (profile) {
      setFullName((profile as any).full_name || "");
    }
  }, [company, profile]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserEmail(data.user.email || "");
        setUserPhone(data.user.phone || "");
      }
    });
  }, []);

  const updateCompanyMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Empresa não encontrada");

      const { error: companyError } = await supabase
        .from("companies")
        .update({ name: companyName.trim(), cnpj: cnpj.trim() || null })
        .eq("id", companyId);
      if (companyError) throw companyError;

      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ full_name: fullName.trim() || null })
          .eq("user_id", userData.user.id);
        if (profileError) throw profileError;
      }
    },
    onSuccess: () => {
      toast.success("Perfil atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !companyId) return;

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${companyId}/logo.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("chat-attachments")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("chat-attachments")
        .getPublicUrl(path);

      setLogoUrl(urlData.publicUrl);
      toast.success("Logo enviado com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao enviar logo: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const formatCnpj = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 14);
    return digits
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  };

  const plan = PLAN_LABELS[company?.plan || "free"] || PLAN_LABELS.free;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              Perfil da Empresa
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie as informações da sua empresa e perfil.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Plan card */}
          <Card>
            <CardContent className="flex items-center justify-between py-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent">
                  <Crown className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Plano atual</p>
                  <p className="text-xs text-muted-foreground">Gerencie sua assinatura</p>
                </div>
              </div>
              <Badge className={plan.color}>{plan.label}</Badge>
            </CardContent>
          </Card>

          {/* Company info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações da Empresa</CardTitle>
              <CardDescription>Dados cadastrais visíveis para sua equipe.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Logo */}
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={logoUrl || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                    {(companyName || "E")[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Label
                    htmlFor="logo-upload"
                    className="inline-flex items-center gap-2 cursor-pointer text-sm font-medium text-primary hover:underline"
                  >
                    <Upload className="h-4 w-4" />
                    {uploading ? "Enviando..." : "Alterar logo"}
                  </Label>
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                    disabled={uploading}
                  />
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG ou SVG. Máx 2MB.</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome da empresa *</Label>
                  <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Nome da sua empresa"
                  />
                </div>
                <div className="space-y-2">
                  <Label>CNPJ</Label>
                  <Input
                    value={cnpj}
                    onChange={(e) => setCnpj(formatCnpj(e.target.value))}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User profile */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Seu Perfil</CardTitle>
              <CardDescription>Informações pessoais da sua conta.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome completo</Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Seu nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Papel</Label>
                  <Input
                    value={profile?.role === "admin" ? "Administrador" : profile?.role === "manager" ? "Gerente" : "Atendente"}
                    readOnly
                    className="bg-muted"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save */}
          <div className="flex justify-end">
            <Button
              onClick={() => updateCompanyMutation.mutate()}
              disabled={!companyName.trim() || updateCompanyMutation.isPending}
              className="min-w-[140px]"
            >
              {updateCompanyMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {updateCompanyMutation.isPending ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CompanyProfile;
