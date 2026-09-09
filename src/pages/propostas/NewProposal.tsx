import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { BackToProposals } from "@/components/propostas/BackToProposals";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useSolarCatalog } from "@/hooks/useSolarCatalog";
import { useContacts } from "@/hooks/useContacts";
import { useSaveSolarProposal, useSolarProposal } from "@/hooks/useSolarProposals";
import { useSolarBranding } from "@/hooks/useSolarBranding";
import { useCompany } from "@/hooks/useCompany";
import { ProposalDocument } from "@/components/propostas/ProposalDocument";
import { estimateKits } from "@/lib/solarEstimate";
import { ArrowLeft, ArrowRight, Calculator, Check, Loader2, Printer, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const currency = (v: any) =>
  v === null || v === undefined || v === ""
    ? "-"
    : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const nf = (v: number, digits = 0) =>
  Number(v).toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

const STEPS = [
  { id: 1, label: "Cliente" },
  { id: 2, label: "Consumo e local" },
  { id: 3, label: "Kit" },
  { id: 4, label: "Condições e resultado" },
];

const NewProposal = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { data: existing, isLoading: loadingExisting } = useSolarProposal(id);
  const saveProposal = useSaveSolarProposal();

  const { data: kits = [] } = useSolarCatalog("solar_kits");
  const { data: modules = [] } = useSolarCatalog("solar_modules");
  const { data: cities = [] } = useSolarCatalog("solar_cities");
  const { data: roofs = [] } = useSolarCatalog("solar_roof_types");
  const { data: orientations = [] } = useSolarCatalog("solar_orientations");
  const { data: connections = [] } = useSolarCatalog("solar_connection_types");
  const { data: utilities = [] } = useSolarCatalog("solar_utilities");
  const { data: banks = [] } = useSolarCatalog("solar_financing_banks");
  const { data: contacts = [] } = useContacts();
  const { data: branding = null } = useSolarBranding();
  const { profile, company } = useCompany();

  const [step, setStep] = useState(1);
  const [contactId, setContactId] = useState<string>("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [form, setForm] = useState<Record<string, string>>({
    kit_id: "",
    city_id: "",
    roof_type_id: "",
    orientation_id: "",
    connection_type_id: "",
    utility_id: "",
    avg_monthly_consumption_kwh: "",
    distance_km: "0",
    financing_bank_id: "",
  });
  const [result, setResult] = useState<any>(null);
  const [calculating, setCalculating] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"cash" | "financing">("cash");
  const [paymentTerm, setPaymentTerm] = useState<string>("60");
  const [validUntil, setValidUntil] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().slice(0, 10);
  });

  const paymentCondition =
    paymentMode === "cash" ? "À vista" : `Financiamento em ${paymentTerm}x`;

  const termOptions = useMemo(() => {
    const fromResult = Array.from(
      new Set((result?.financing ?? []).map((f: any) => Number(f.term_months)))
    ).filter(Boolean) as number[];
    return fromResult.length ? fromResult.sort((a, b) => a - b) : [12, 24, 36, 48, 60, 72, 84];
  }, [result]);

  useEffect(() => {
    if (!existing) return;
    setContactId(existing.contact_id ?? "");
    setClientName(existing.client_name ?? "");
    setClientPhone(existing.client_phone ?? "");
    setForm({
      kit_id: existing.kit_id ?? "",
      city_id: existing.city_id ?? "",
      roof_type_id: existing.roof_type_id ?? "",
      orientation_id: existing.orientation_id ?? "",
      connection_type_id: existing.connection_type_id ?? "",
      utility_id: existing.utility_id ?? "",
      avg_monthly_consumption_kwh: String(existing.avg_monthly_consumption_kwh ?? ""),
      distance_km: String(existing.distance_km ?? "0"),
      financing_bank_id: existing.financing_bank_id ?? "",
    });
    setResult(existing.result && Object.keys(existing.result).length ? existing.result : null);
    if (existing.valid_until) setValidUntil(existing.valid_until);
    if (existing.payment_condition) {
      const match = /(\d+)x/.exec(existing.payment_condition);
      if (match) {
        setPaymentMode("financing");
        setPaymentTerm(match[1]);
      } else {
        setPaymentMode("cash");
      }
    }
    setStep(4);
  }, [existing]);

  const set = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  // Alterações que invalidam o cálculo e as sugestões
  const setTechnical = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setResult(null);
  };

  const consumption = Number(form.avg_monthly_consumption_kwh) || 0;
  const city = cities.find((c: any) => c.id === form.city_id);
  const roof = roofs.find((r: any) => r.id === form.roof_type_id);
  const orientation = orientations.find((o: any) => o.id === form.orientation_id);

  const { perKwp, requiredKwp, estimates } = useMemo(
    () =>
      estimateKits({
        kits,
        modules,
        city,
        roof,
        orientation,
        monthlyConsumptionKwh: consumption,
      }),
    [kits, modules, city, roof, orientation, consumption]
  );

  const canGoToStep2 = clientName.trim().length > 0;
  const canGoToStep3 =
    canGoToStep2 &&
    consumption > 0 &&
    !!form.city_id &&
    !!form.roof_type_id &&
    !!form.orientation_id &&
    !!form.connection_type_id &&
    !!form.utility_id;
  const canGoToStep4 = canGoToStep3 && !!form.kit_id;

  const stepUnlocked = (target: number) => {
    if (target <= 1) return true;
    if (target === 2) return canGoToStep2;
    if (target === 3) return canGoToStep3;
    return canGoToStep4;
  };

  const goNext = () => {
    if (step === 1 && !canGoToStep2) return toast.error("Informe o nome do cliente");
    if (step === 2 && !canGoToStep3)
      return toast.error("Preencha o consumo médio e todos os dados do local");
    if (step === 3 && !canGoToStep4) return toast.error("Escolha um kit");
    setStep((s) => Math.min(4, s + 1));
  };

  const handleContact = (value: string) => {
    setContactId(value);
    const c = contacts.find((x: any) => x.id === value);
    if (c) {
      setClientName(c.name ?? "");
      setClientPhone(c.phone ?? "");
    }
  };

  const handleCalculate = async () => {
    if (!canGoToStep4) {
      toast.error("Complete as etapas anteriores");
      return;
    }

    setCalculating(true);
    try {
      const { data, error } = await supabase.functions.invoke("calculate-solar-proposal", {
        body: {
          kit_id: form.kit_id,
          city_id: form.city_id,
          roof_type_id: form.roof_type_id,
          orientation_id: form.orientation_id,
          connection_type_id: form.connection_type_id,
          utility_id: form.utility_id,
          avg_monthly_consumption_kwh: consumption,
          distance_km: Number(form.distance_km || 0),
          financing_bank_id: form.financing_bank_id || null,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error(JSON.stringify((data as any).error));
      setResult(data);
      toast.success("Cálculo concluído");
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível calcular");
    } finally {
      setCalculating(false);
    }
  };

  const handleSave = () => {
    if (!clientName.trim()) {
      toast.error("Informe o nome do cliente");
      return;
    }
    if (!result) {
      toast.error("Calcule a proposta antes de salvar");
      return;
    }
    saveProposal.mutate(
      {
        id,
        contact_id: contactId || null,
        client_name: clientName.trim(),
        client_phone: clientPhone.trim() || null,
        kit_id: form.kit_id,
        city_id: form.city_id,
        roof_type_id: form.roof_type_id,
        orientation_id: form.orientation_id,
        connection_type_id: form.connection_type_id,
        utility_id: form.utility_id,
        avg_monthly_consumption_kwh: Number(form.avg_monthly_consumption_kwh),
        distance_km: Number(form.distance_km || 0),
        financing_bank_id: form.financing_bank_id || null,
        kwp_total: result?.generation?.kwp ?? null,
        cash_price: result?.pricing?.cash_price ?? null,
        payback_months: result?.summary?.payback_months ?? null,
        payment_condition: paymentCondition,
        valid_until: validUntil || null,
        status: existing?.status ?? "draft",
        result,
      },
      { onSuccess: () => navigate("/propostas") }
    );
  };

  const handlePrint = () => {
    if (!result) {
      toast.error("Calcule a proposta antes de imprimir");
      return;
    }
    window.print();
  };

  const localSelects = [
    { key: "city_id", label: "Cidade", options: cities },
    { key: "roof_type_id", label: "Tipo de telhado", options: roofs },
    { key: "orientation_id", label: "Orientação", options: orientations },
    { key: "connection_type_id", label: "Tipo de ligação", options: connections },
    { key: "utility_id", label: "Concessionária", options: utilities },
  ];

  const selectedKit = kits.find((k: any) => k.id === form.kit_id);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 print:hidden">
        <BackToProposals />
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="h-6 w-6 text-primary" />
            {isEditing ? "Proposta" : "Nova proposta"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monte a proposta por etapas: cliente, consumo, kit sugerido e condições.
          </p>
        </div>

        {isEditing && loadingExisting ? (
          <div className="py-10 text-center">
            <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Carregando...
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {STEPS.map((s, i) => {
                const unlocked = stepUnlocked(s.id);
                const done = s.id < step && unlocked;
                return (
                  <div key={s.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!unlocked}
                      onClick={() => unlocked && setStep(s.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors",
                        step === s.id
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : unlocked
                            ? "text-muted-foreground hover:bg-muted"
                            : "text-muted-foreground/50 cursor-not-allowed"
                      )}
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-full border text-xs">
                        {done ? <Check className="h-3 w-3" /> : s.id}
                      </span>
                      {s.label}
                    </button>
                    {i < STEPS.length - 1 && (
                      <span className="hidden sm:block h-px w-6 bg-border" />
                    )}
                  </div>
                );
              })}
            </div>

            {step === 1 && (
              <Card className="max-w-2xl">
                <CardHeader>
                  <CardTitle className="text-base">Cliente</CardTitle>
                  <CardDescription>Escolha um contato ou digite os dados.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Contato</Label>
                    <Select value={contactId} onValueChange={handleContact}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar contato (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {contacts.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Nome</Label>
                      <Input
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="Nome do cliente"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Telefone</Label>
                      <Input
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <Card className="max-w-3xl">
                <CardHeader>
                  <CardTitle className="text-base">Consumo e local</CardTitle>
                  <CardDescription>
                    Com esses dados o sistema calcula a geração necessária e sugere os kits.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Consumo médio mensal (kWh)</Label>
                    <Input
                      type="number"
                      value={form.avg_monthly_consumption_kwh}
                      onChange={(e) => setTechnical("avg_monthly_consumption_kwh", e.target.value)}
                      placeholder="Ex: 650"
                    />
                  </div>
                  {localSelects.map((s) => (
                    <div key={s.key} className="space-y-2">
                      <Label>{s.label}</Label>
                      <Select
                        value={form[s.key]}
                        onValueChange={(v) => setTechnical(s.key, v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={`Selecionar ${s.label.toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {s.options.map((o: any) => (
                            <SelectItem key={o.id} value={o.id}>
                              {o.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                  <div className="space-y-2">
                    <Label>Distância (km)</Label>
                    <Input
                      type="number"
                      value={form.distance_km}
                      onChange={(e) => setTechnical("distance_km", e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 3 && (
              <Card className="overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-base">Escolha do kit</CardTitle>
                  <CardDescription>
                    Kits ordenados do mais adequado ao menos adequado para esse consumo.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Geração necessária</p>
                    <p className="font-semibold">{nf(consumption)} kWh/mês</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Geração anual necessária</p>
                    <p className="font-semibold">{nf(consumption * 12)} kWh/ano</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Potência necessária</p>
                    <p className="font-semibold">
                      {perKwp > 0 ? `${nf(requiredKwp, 2)} kWp` : "-"}
                    </p>
                  </div>
                </CardContent>
                {perKwp <= 0 && (
                  <div className="mx-6 mb-4 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                    A cidade selecionada não tem irradiação cadastrada, por isso não é possível
                    estimar a geração. Escolha o kit manualmente.
                  </div>
                )}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kit</TableHead>
                      <TableHead className="text-right">Potência</TableHead>
                      <TableHead className="text-right">Geração estimada</TableHead>
                      <TableHead className="text-right">Cobertura</TableHead>
                      <TableHead className="text-right">Valor do kit</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {estimates.map((e, index) => (
                      <TableRow
                        key={e.kit.id}
                        className={form.kit_id === e.kit.id ? "bg-muted/50" : undefined}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {e.kit.name}
                            {perKwp > 0 && index < 3 && (
                              <Badge variant="secondary">Sugestão</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{nf(e.kwp, 2)} kWp</TableCell>
                        <TableCell className="text-right">
                          {perKwp > 0 ? `${nf(e.monthlyKwh)} kWh/mês` : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {e.coveragePercent !== null ? `${nf(e.coveragePercent, 1)}%` : "-"}
                        </TableCell>
                        <TableCell className="text-right">{currency(e.kit.price)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant={form.kit_id === e.kit.id ? "default" : "outline"}
                            onClick={() => setTechnical("kit_id", e.kit.id)}
                          >
                            {form.kit_id === e.kit.id ? "Selecionado" : "Selecionar"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {estimates.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Nenhum kit ativo cadastrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            )}

            {step === 4 && (
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Condições</CardTitle>
                      <CardDescription>
                        {selectedKit?.name
                          ? `Kit selecionado: ${selectedKit.name}`
                          : "Forma de pagamento e validade desta proposta."}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Banco de financiamento (opcional)</Label>
                        <Select
                          value={form.financing_bank_id}
                          onValueChange={(v) => set("financing_bank_id", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Todos os bancos" />
                          </SelectTrigger>
                          <SelectContent>
                            {banks.map((b: any) => (
                              <SelectItem key={b.id} value={b.id}>
                                {b.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Condição de pagamento</Label>
                        <Select
                          value={paymentMode}
                          onValueChange={(v) => setPaymentMode(v as "cash" | "financing")}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">À vista</SelectItem>
                            <SelectItem value="financing">Financiamento</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {paymentMode === "financing" && (
                        <div className="space-y-2">
                          <Label>Prazo</Label>
                          <Select value={paymentTerm} onValueChange={setPaymentTerm}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {termOptions.map((t) => (
                                <SelectItem key={t} value={String(t)}>
                                  {t}x
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label>Válida até</Label>
                        <Input
                          type="date"
                          value={validUntil}
                          onChange={(e) => setValidUntil(e.target.value)}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex flex-wrap gap-2">
                    <Button onClick={handleCalculate} disabled={calculating}>
                      {calculating ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Calculator className="h-4 w-4 mr-2" />
                      )}
                      Calcular
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={handleSave}
                      disabled={!result || saveProposal.isPending}
                    >
                      {saveProposal.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Salvar proposta
                    </Button>
                    <Button variant="outline" onClick={handlePrint} disabled={!result}>
                      <Printer className="h-4 w-4 mr-2" />
                      Imprimir / Salvar PDF
                    </Button>
                  </div>
                  {!result && (
                    <p className="text-xs text-muted-foreground">
                      Calcule a proposta para liberar a impressão em PDF.
                    </p>
                  )}
                </div>

                <div className="space-y-6">
                  {!result ? (
                    <Card className="border-dashed">
                      <CardHeader>
                        <CardTitle className="text-base">Resultado</CardTitle>
                        <CardDescription>
                          Depois de calcular, os números da proposta aparecem aqui.
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  ) : (
                    <>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Resumo</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Potência</p>
                            <p className="font-semibold">{result.generation?.kwp} kWp</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Geração anual</p>
                            <p className="font-semibold">
                              {Number(result.generation?.annual_kwh ?? 0).toLocaleString("pt-BR")} kWh
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Cobertura do consumo</p>
                            <p className="font-semibold">
                              {result.consumption?.coverage_percent ?? "-"}%
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Valor à vista</p>
                            <p className="font-semibold">{currency(result.pricing?.cash_price)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Economia 1º ano</p>
                            <p className="font-semibold">
                              {currency(result.summary?.first_year_saving)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Payback</p>
                            <p className="font-semibold">
                              {result.summary?.payback_years
                                ? `${result.summary.payback_years} anos`
                                : "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Retorno em 25 anos</p>
                            <p className="font-semibold">
                              {currency(result.summary?.total_saving_25y)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Retorno sobre investimento</p>
                            <p className="font-semibold">{result.summary?.roi_percent ?? "-"}%</p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Geração mensal (kWh)</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[260px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={result.generation?.monthly ?? []}>
                              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                              <XAxis dataKey="label" fontSize={11} />
                              <YAxis fontSize={11} />
                              <Tooltip
                                formatter={(v: any) => `${Number(v).toLocaleString("pt-BR")} kWh`}
                              />
                              <Bar
                                dataKey="generation_kwh"
                                name="Geração"
                                fill="hsl(var(--primary))"
                                radius={[4, 4, 0, 0]}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      <Card className="overflow-hidden">
                        <CardHeader>
                          <CardTitle className="text-base">Geração mês a mês</CardTitle>
                        </CardHeader>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Mês</TableHead>
                              <TableHead>Irradiação</TableHead>
                              <TableHead className="text-right">Geração (kWh)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(result.generation?.monthly ?? []).map((m: any) => (
                              <TableRow key={m.month}>
                                <TableCell>{m.label}</TableCell>
                                <TableCell>{m.irradiance_kwh_m2_day}</TableCell>
                                <TableCell className="text-right">
                                  {Number(m.generation_kwh).toLocaleString("pt-BR")}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Card>

                      {(result.financing ?? []).length > 0 && (
                        <Card className="overflow-hidden">
                          <CardHeader>
                            <CardTitle className="text-base">Financiamento</CardTitle>
                          </CardHeader>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Banco</TableHead>
                                <TableHead>Prazo</TableHead>
                                <TableHead>Juros/mês</TableHead>
                                <TableHead className="text-right">Parcela</TableHead>
                                <TableHead className="text-right">Total pago</TableHead>
                                <TableHead className="text-right">Juros</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {result.financing.map((f: any) => (
                                <TableRow
                                  key={f.term_id}
                                  className={
                                    paymentMode === "financing" &&
                                    String(f.term_months) === paymentTerm
                                      ? "bg-muted/50 font-medium"
                                      : undefined
                                  }
                                >
                                  <TableCell>{f.bank_name ?? "-"}</TableCell>
                                  <TableCell>{f.term_months}x</TableCell>
                                  <TableCell>{f.monthly_interest_rate}%</TableCell>
                                  <TableCell className="text-right">
                                    {currency(f.installment)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {currency(f.total_paid ?? f.total_amount)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {currency(f.total_interest)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </Card>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between border-t pt-4">
              <Button
                variant="outline"
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                disabled={step === 1}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              {step < 4 && (
                <Button onClick={goNext}>
                  Continuar
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </>
        )}
      </div>

      {result &&
        createPortal(
          <div className="proposal-doc-wrap hidden">
            <ProposalDocument
              proposal={{
                quote_number: existing?.quote_number ?? null,
                client_name: clientName,
                client_phone: clientPhone,
                payment_condition: paymentCondition,
                valid_until: validUntil,
                created_at: existing?.created_at ?? new Date().toISOString(),
                avg_monthly_consumption_kwh: form.avg_monthly_consumption_kwh,
              }}
              result={result}
              branding={branding}
              companyName={(company as any)?.name ?? null}
              sellerName={profile?.full_name ?? null}
              selectedTermMonths={paymentMode === "financing" ? Number(paymentTerm) : null}
            />
          </div>,
          document.body
        )}
    </DashboardLayout>
  );
};

export default NewProposal;
