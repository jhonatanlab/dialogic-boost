import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarCog, Plus, Trash2, ArrowLeft, FlaskConical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/hooks/useCompany";
import {
  AppointmentRules as RulesType,
  DAY_LABELS,
  DAY_ORDER,
  DayKey,
  TimeWindow,
  useAppointmentRules,
  useDeleteUserOverride,
  useUpsertAppointmentRules,
} from "@/hooks/useAppointmentRules";
import { AppointmentSimulator } from "@/components/agenda/AppointmentSimulator";

type Editable = Omit<RulesType, "id" | "company_id" | "user_id">;

function RulesForm({
  initial,
  onSave,
  saving,
  extra,
}: {
  initial: Editable;
  onSave: (r: Editable) => void;
  saving: boolean;
  extra?: React.ReactNode;
}) {
  const [state, setState] = useState<Editable>(initial);

  useEffect(() => {
    setState(initial);
  }, [initial]);

  const updateDay = (day: DayKey, windows: TimeWindow[]) => {
    setState((s) => ({ ...s, weekly_schedule: { ...s.weekly_schedule, [day]: windows } }));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Duração mínima (minutos)</Label>
          <Input
            type="number"
            min={5}
            value={state.min_duration_minutes}
            onChange={(e) => setState({ ...state, min_duration_minutes: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label>Duração máxima (minutos)</Label>
          <Input
            type="number"
            min={5}
            value={state.max_duration_minutes}
            onChange={(e) => setState({ ...state, max_duration_minutes: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label>Intervalo entre agendamentos (minutos)</Label>
          <Input
            type="number"
            min={0}
            value={state.buffer_minutes}
            onChange={(e) => setState({ ...state, buffer_minutes: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label>Total máximo por dia (vazio = sem limite)</Label>
          <Input
            type="number"
            min={1}
            value={state.max_per_day ?? ""}
            onChange={(e) =>
              setState({ ...state, max_per_day: e.target.value ? Number(e.target.value) : null })
            }
          />
        </div>
      </div>

      <div className="space-y-3 rounded-md border p-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base">Permitir repetir mesmo horário</Label>
            <p className="text-xs text-muted-foreground">
              Quando ativo, mais de um agendamento pode ocorrer no mesmo horário.
            </p>
          </div>
          <Switch
            checked={state.allow_repeat_same_slot}
            onCheckedChange={(v) =>
              setState({
                ...state,
                allow_repeat_same_slot: v,
                max_per_slot: v ? Math.max(2, state.max_per_slot) : 1,
              })
            }
          />
        </div>
        {state.allow_repeat_same_slot && (
          <div className="space-y-2">
            <Label>Máximo de agendamentos simultâneos no mesmo horário</Label>
            <Input
              type="number"
              min={2}
              value={state.max_per_slot}
              onChange={(e) => setState({ ...state, max_per_slot: Number(e.target.value) })}
            />
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-md border p-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base">Duração fixa para todos os agendamentos</Label>
            <p className="text-xs text-muted-foreground">
              Quando ativo, o campo de duração no modal de agendamento fica bloqueado com o valor definido aqui.
            </p>
          </div>
          <Switch
            checked={state.fixed_duration_enabled}
            onCheckedChange={(v) => setState({ ...state, fixed_duration_enabled: v })}
          />
        </div>
        {state.fixed_duration_enabled && (
          <div className="space-y-2">
            <Label>Duração fixa (minutos)</Label>
            <Input
              type="number"
              min={5}
              step={5}
              value={state.fixed_duration_minutes}
              onChange={(e) => setState({ ...state, fixed_duration_minutes: Number(e.target.value) })}
            />
          </div>
        )}
      </div>

      <Separator />

      <div className="space-y-3">
        <div>
          <Label className="text-base">Dias e horários permitidos</Label>
          <p className="text-xs text-muted-foreground">
            Marque os dias e defina as janelas. Dias sem janelas bloqueiam agendamentos.
          </p>
        </div>
        <div className="space-y-3">
          {DAY_ORDER.map((day) => {
            const windows = state.weekly_schedule[day] ?? [];
            const enabled = windows.length > 0;
            return (
              <div key={day} className="rounded-md border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={enabled}
                      onCheckedChange={(v) =>
                        updateDay(day, v ? [{ start: "08:00", end: "18:00" }] : [])
                      }
                    />
                    <span className="font-medium">{DAY_LABELS[day]}</span>
                  </div>
                  {enabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        updateDay(day, [...windows, { start: "08:00", end: "18:00" }])
                      }
                    >
                      <Plus className="h-4 w-4 mr-1" /> Janela
                    </Button>
                  )}
                </div>
                {enabled && (
                  <div className="space-y-2">
                    {windows.map((w, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={w.start}
                          onChange={(e) => {
                            const next = [...windows];
                            next[i] = { ...next[i], start: e.target.value };
                            updateDay(day, next);
                          }}
                          className="w-32"
                        />
                        <span className="text-muted-foreground">até</span>
                        <Input
                          type="time"
                          value={w.end}
                          onChange={(e) => {
                            const next = [...windows];
                            next[i] = { ...next[i], end: e.target.value };
                            updateDay(day, next);
                          }}
                          className="w-32"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => updateDay(day, windows.filter((_, j) => j !== i))}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between">
        {extra}
        <Button onClick={() => onSave(state)} disabled={saving} className="ml-auto">
          Salvar regras
        </Button>
      </div>
    </div>
  );
}

const AppointmentRulesPage = () => {
  const navigate = useNavigate();
  const { profile, isLoading } = useCompany();
  const isManager = profile?.role === "admin" || profile?.role === "manager";

  const companyRules = useAppointmentRules("company");
  const userRules = useAppointmentRules("user");
  const upsert = useUpsertAppointmentRules();
  const deleteOverride = useDeleteUserOverride();

  if (isLoading) return null;

  const stripMeta = (r: RulesType): Editable => ({
    min_duration_minutes: r.min_duration_minutes,
    max_duration_minutes: r.max_duration_minutes,
    buffer_minutes: r.buffer_minutes,
    max_per_day: r.max_per_day,
    max_per_slot: r.max_per_slot,
    allow_repeat_same_slot: r.allow_repeat_same_slot,
    fixed_duration_enabled: r.fixed_duration_enabled,
    fixed_duration_minutes: r.fixed_duration_minutes,
    weekly_schedule: r.weekly_schedule,
  });

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => navigate("/settings")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CalendarCog className="h-8 w-8 text-primary" />
            Regras de Agendamento
          </h1>
          <p className="text-muted-foreground mt-2">
            Defina limites e janelas que controlam como agendamentos podem ser criados.
          </p>
        </div>

        <Tabs defaultValue={isManager ? "company" : "user"}>
          <TabsList>
            {isManager && <TabsTrigger value="company">Padrão da empresa</TabsTrigger>}
            <TabsTrigger value="user">Meu override</TabsTrigger>
            <TabsTrigger value="simulator">
              <FlaskConical className="h-4 w-4 mr-1" />
              Simulador
            </TabsTrigger>
          </TabsList>

          {isManager && (
            <TabsContent value="company">
              <Card>
                <CardHeader>
                  <CardTitle>Regras padrão da empresa</CardTitle>
                  <CardDescription>
                    Aplicadas a todos os usuários que não possuem regras próprias.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {companyRules.data && (
                    <RulesForm
                      initial={stripMeta(companyRules.data)}
                      onSave={(rules) => upsert.mutate({ scope: "company", rules })}
                      saving={upsert.isPending}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="user">
            <Card>
              <CardHeader>
                <CardTitle>Minhas regras pessoais</CardTitle>
                <CardDescription>
                  Quando definidas, substituem o padrão da empresa apenas para você.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {userRules.data && (
                  <RulesForm
                    initial={stripMeta(userRules.data)}
                    onSave={(rules) => upsert.mutate({ scope: "user", rules })}
                    saving={upsert.isPending}
                    extra={
                      userRules.data.id ? (
                        <Button
                          variant="outline"
                          onClick={() => deleteOverride.mutate()}
                          disabled={deleteOverride.isPending}
                        >
                          Remover override
                        </Button>
                      ) : null
                    }
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="simulator">
            <AppointmentSimulator />
          </TabsContent>
        </Tabs>

      </div>
    </DashboardLayout>
  );
};

export default AppointmentRulesPage;
