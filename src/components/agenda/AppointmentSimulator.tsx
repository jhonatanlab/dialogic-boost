import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, FlaskConical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useToast } from "@/hooks/use-toast";

type Check = { label: string; ok: boolean; detail: string };
type SimResult = { ok: boolean; checks: Check[]; resolved_scope: string };

export function AppointmentSimulator() {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  const defaultLocal = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const [when, setWhen] = useState(defaultLocal);
  const [duration, setDuration] = useState(30);
  const [useMyRules, setUseMyRules] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimResult | null>(null);

  const run = async () => {
    if (!companyId) return;
    setLoading(true);
    setResult(null);
    try {
      const { data: u } = await supabase.auth.getUser();
      const userId = useMyRules ? u.user?.id ?? null : null;
      const iso = new Date(when).toISOString();
      const { data, error } = await supabase.rpc("simulate_appointment_rules" as any, {
        p_company_id: companyId,
        p_user_id: userId,
        p_scheduled_at: iso,
        p_duration_minutes: duration,
      });
      if (error) throw error;
      setResult(data as unknown as SimResult);
    } catch (e: any) {
      toast({ title: "Erro na simulação", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-primary" />
          Simulador de agendamento
        </CardTitle>
        <CardDescription>
          Teste uma data, hora e duração para ver se passariam pelas regras — sem salvar nada.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-2 md:col-span-2">
            <Label>Data e hora</Label>
            <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Duração (min)</Label>
            <Input
              type="number"
              min={1}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <Label className="text-sm">Aplicar minhas regras pessoais</Label>
            <p className="text-xs text-muted-foreground">
              Desligue para testar somente o padrão da empresa.
            </p>
          </div>
          <Switch checked={useMyRules} onCheckedChange={setUseMyRules} />
        </div>

        <Button onClick={run} disabled={loading || !companyId}>
          {loading ? "Simulando..." : "Simular"}
        </Button>

        {result && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              {result.ok ? (
                <Badge className="bg-green-600 hover:bg-green-600">Passaria</Badge>
              ) : (
                <Badge variant="destructive">Seria bloqueado</Badge>
              )}
              <span className="text-xs text-muted-foreground">
                Regras: {result.resolved_scope === "user" ? "pessoais" : result.resolved_scope === "company" ? "empresa" : "padrão"}
              </span>
            </div>
            <ul className="space-y-2">
              {result.checks.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  {c.ok ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  )}
                  <div>
                    <div className="font-medium">{c.label}</div>
                    <div className="text-muted-foreground text-xs">{c.detail}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
