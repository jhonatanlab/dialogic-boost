import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { BackToProposals } from "@/components/propostas/BackToProposals";
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
import { Calculator, Loader2, Printer, Save } from "lucide-react";
import { toast } from "sonner";

const currency = (v: any) =>
  v === null || v === undefined || v === ""
    ? "-"
    : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const NewProposal = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { data: existing, isLoading: loadingExisting } = useSolarProposal(id);
  const saveProposal = useSaveSolarProposal();

  const { data: kits = [] } = useSolarCatalog("solar_kits");
  const { data: cities = [] } = useSolarCatalog("solar_cities");
  const { data: roofs = [] } = useSolarCatalog("solar_roof_types");
  const { data: orientations = [] } = useSolarCatalog("solar_orientations");
  const { data: connections = [] } = useSolarCatalog("solar_connection_types");
  const { data: utilities = [] } = useSolarCatalog("solar_utilities");
  const { data: banks = [] } = useSolarCatalog("solar_financing_banks");
  const { data: contacts = [] } = useContacts();
  const { data: branding = null } = useSolarBranding();
  const { profile, company } = useCompany();

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
  }, [existing]);

  const set = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const selects = useMemo(
    () => [
      { key: "kit_id", label: "Kit", options: kits },
      { key: "city_id", label: "Cidade", options: cities },
      { key: "roof_type_id", label: "Tipo de telhado", options: roofs },
      { key: "orientation_id", label: "Orientação", options: orientations },
      { key: "connection_type_id", label: "Tipo de ligação", options: connections },
      { key: "utility_id", label: "Concessionária", options: utilities },
    ],
    [kits, cities, roofs, orientations, connections, utilities]
  );

  const handleContact = (value: string) => {
    setContactId(value);
    const c = contacts.find((x: any) => x.id === value);
    if (c) {
      setClientName(c.name ?? "");
      setClientPhone(c.phone ?? "");
    }
  };

  const handleCalculate = async () => {
    const missing = selects.filter((s) => !form[s.key]).map((s) => s.label);
    if (missing.length) {
      toast.error(`Selecione: ${missing.join(", ")}`);
      return;
    }
    const consumption = Number(form.avg_monthly_consumption_kwh);
    if (!consumption || consumption <= 0) {
      toast.error("Informe o consumo médio mensal em kWh");
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
            Preencha os dados, calcule e salve a proposta do cliente.
          </p>
        </div>

        {isEditing && loadingExisting ? (
          <div className="py-10 text-center">
            <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Carregando...
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-6">
              <Card>
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

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Dados técnicos</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  {selects.map((s) => (
                    <div key={s.key} className="space-y-2">
                      <Label>{s.label}</Label>
                      <Select value={form[s.key]} onValueChange={(v) => set(s.key, v)}>
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
                    <Label>Consumo médio mensal (kWh)</Label>
                    <Input
                      type="number"
                      value={form.avg_monthly_consumption_kwh}
                      onChange={(e) => set("avg_monthly_consumption_kwh", e.target.value)}
                      placeholder="Ex: 650"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Distância (km)</Label>
                    <Input
                      type="number"
                      value={form.distance_km}
                      onChange={(e) => set("distance_km", e.target.value)}
                    />
                  </div>
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Condições</CardTitle>
                  <CardDescription>
                    Forma de pagamento e validade desta proposta.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
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

              <div className="flex gap-2">
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
              </div>
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
                        <p className="font-semibold">{result.consumption?.coverage_percent ?? "-"}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Valor à vista</p>
                        <p className="font-semibold">{currency(result.pricing?.cash_price)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Economia 1º ano</p>
                        <p className="font-semibold">{currency(result.summary?.first_year_saving)}</p>
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
                        <p className="font-semibold">{currency(result.summary?.total_saving_25y)}</p>
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
                            formatter={(v: any) =>
                              `${Number(v).toLocaleString("pt-BR")} kWh`
                            }
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
                              <TableCell className="text-right">{currency(f.installment)}</TableCell>
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
      </div>
    </DashboardLayout>
  );
};

export default NewProposal;
