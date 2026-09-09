import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import { getBrandingSignedUrl, type SolarBranding } from "@/hooks/useSolarBranding";

const currency = (v: any) =>
  v === null || v === undefined || v === ""
    ? "-"
    : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const number = (v: any, digits = 0) =>
  v === null || v === undefined || v === ""
    ? "-"
    : Number(v).toLocaleString("pt-BR", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });

const date = (v?: string | null) =>
  v ? new Date(v.length <= 10 ? `${v}T12:00:00` : v).toLocaleDateString("pt-BR") : "-";

export interface ProposalDocumentData {
  quote_number?: number | null;
  client_name: string;
  client_phone?: string | null;
  payment_condition?: string | null;
  valid_until?: string | null;
  created_at?: string | null;
  avg_monthly_consumption_kwh?: number | string | null;
}

interface Props {
  proposal: ProposalDocumentData;
  result: any;
  branding: SolarBranding | null;
  companyName?: string | null;
  sellerName?: string | null;
  selectedTermMonths?: number | null;
}

const RESPONSIBILITIES = {
  company: [
    "Projeto elétrico e homologação junto à concessionária de energia.",
    "Fornecimento dos equipamentos descritos nesta proposta, com garantia de fábrica.",
    "Instalação completa do sistema por equipe técnica qualificada.",
    "Comissionamento, testes e configuração do monitoramento do sistema.",
    "Treinamento de uso e entrega do manual do sistema instalado.",
  ],
  client: [
    "Disponibilizar o local de instalação livre, seguro e com acesso à área do telhado.",
    "Garantir que a estrutura do telhado esteja em condições de receber os módulos.",
    "Fornecer energia e água durante o período da instalação.",
    "Providenciar eventuais adequações do padrão de entrada exigidas pela concessionária.",
    "Manter a limpeza periódica dos módulos conforme orientação da equipe técnica.",
  ],
};

export function ProposalDocument({
  proposal,
  result,
  branding,
  companyName,
  sellerName,
  selectedTermMonths,
}: Props) {
  const [logo, setLogo] = useState<string | null>(null);
  const [cover, setCover] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const l = branding?.logo_url ? await getBrandingSignedUrl(branding.logo_url) : null;
      const c = branding?.cover_background_url
        ? await getBrandingSignedUrl(branding.cover_background_url)
        : null;
      if (!active) return;
      setLogo(l);
      setCover(c);
    })();
    return () => {
      active = false;
    };
  }, [branding?.logo_url, branding?.cover_background_url]);

  const primary = branding?.primary_color || "#00D4D4";
  const secondary = branding?.secondary_color || "#0C1A3B";

  const resolved = result?.input_resolved ?? {};
  const kit = resolved.kit ?? {};
  const generation = result?.generation ?? {};
  const monthly = generation.monthly ?? [];
  const savingsYears: any[] = result?.savings_years ?? result?.savings?.years ?? [];
  const summary = result?.summary ?? {};
  const pricing = result?.pricing ?? {};
  const financing: any[] = result?.financing ?? [];
  const selectedTerm =
    selectedTermMonths != null
      ? financing.find((f) => Number(f.term_months) === Number(selectedTermMonths))
      : null;

  const roiData = savingsYears.map((y: any, i: number) => ({
    year: y.year,
    accumulated: Number(y.cumulative_saving ?? 0),
    investment: Number(pricing.cash_price ?? 0),
    index: i,
  }));

  const sectionTitle = (text: string) => (
    <h2
      className="text-[15px] font-bold uppercase tracking-wide mb-3 pb-1"
      style={{ color: secondary, borderBottom: `2px solid ${primary}` }}
    >
      {text}
    </h2>
  );

  const th = "text-left font-semibold px-2 py-1.5 text-[10px] uppercase tracking-wide";
  const td = "px-2 py-1.5 text-[11px] border-t border-black/10";

  return (
    <div className="proposal-doc text-black bg-white">
      {/* ---------- Capa ---------- */}
      <section
        className="proposal-page relative flex flex-col justify-between text-white"
        style={{ background: secondary }}
      >
        {cover && (
          <img
            src={cover}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-30"
          />
        )}
        <div className="relative p-[18mm]">
          {logo ? (
            <img src={logo} alt={companyName ?? "Logo"} className="h-[24mm] object-contain" />
          ) : (
            <p className="text-2xl font-bold">{companyName ?? "Energia Solar"}</p>
          )}
          <p className="mt-[26mm] text-[13px] uppercase tracking-[0.25em]" style={{ color: primary }}>
            Proposta comercial
          </p>
          <h1 className="mt-2 text-[34px] font-bold leading-tight">
            Sistema de energia solar
            <br />
            fotovoltaica
          </h1>
          <p className="mt-3 text-[15px] opacity-90">
            {number(kit.kwp_total ?? generation.kwp, 2)} kWp · Geração média de{" "}
            {number(generation.monthly_average_kwh)} kWh/mês
          </p>
        </div>

        <div className="relative p-[18mm] pt-0">
          <div className="rounded-lg bg-white/10 p-5 text-[12px] leading-relaxed backdrop-blur-sm">
            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
              <p>
                <span className="opacity-70">Cliente:</span>{" "}
                <strong>{proposal.client_name}</strong>
              </p>
              <p>
                <span className="opacity-70">Cotação:</span>{" "}
                <strong>#{String(proposal.quote_number ?? "-").padStart(3, "0")}</strong>
              </p>
              <p>
                <span className="opacity-70">Telefone:</span> {proposal.client_phone || "-"}
              </p>
              <p>
                <span className="opacity-70">Data:</span> {date(proposal.created_at ?? new Date().toISOString())}
              </p>
              <p>
                <span className="opacity-70">Cidade:</span> {resolved.city?.name ?? "-"}
                {resolved.city?.state ? ` / ${resolved.city.state}` : ""}
              </p>
              <p>
                <span className="opacity-70">Válida até:</span> {date(proposal.valid_until)}
              </p>
              <p>
                <span className="opacity-70">Consumo médio:</span>{" "}
                {number(proposal.avg_monthly_consumption_kwh)} kWh/mês
              </p>
              <p>
                <span className="opacity-70">Consultor:</span> {sellerName || "-"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Sobre nós ---------- */}
      <section className="proposal-page p-[16mm]">
        {sectionTitle("Sobre nós")}
        <p className="text-[12px] leading-relaxed whitespace-pre-line">
          {branding?.about_us_text ||
            "Somos uma empresa especializada em soluções de energia solar fotovoltaica, do projeto à instalação e ao acompanhamento da geração."}
        </p>

        <div className="mt-6 grid grid-cols-3 gap-4">
          {[
            { title: "Missão", text: branding?.mission_text },
            { title: "Visão", text: branding?.vision_text },
            { title: "Valores", text: branding?.values_text },
          ].map((b) => (
            <div
              key={b.title}
              className="rounded-lg p-4 text-[11px] leading-relaxed"
              style={{ background: `${primary}1a`, borderTop: `3px solid ${primary}` }}
            >
              <p className="font-bold mb-1" style={{ color: secondary }}>
                {b.title}
              </p>
              <p className="whitespace-pre-line">{b.text || "-"}</p>
            </div>
          ))}
        </div>

        <div className="mt-8">
          {sectionTitle("Equipamentos do sistema")}
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ background: secondary, color: "#fff" }}>
                <th className={th}>Item</th>
                <th className={th}>Descrição</th>
                <th className={th}>Qtd.</th>
                <th className={th}>Potência</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className={td}>Módulos fotovoltaicos</td>
                <td className={td}>{kit.module?.name ?? "-"}</td>
                <td className={td}>{kit.module_quantity ?? "-"}</td>
                <td className={td}>
                  {kit.module?.power_wp ? `${number(kit.module.power_wp)} Wp` : "-"}
                </td>
              </tr>
              <tr>
                <td className={td}>Inversor</td>
                <td className={td}>{kit.inverter?.name ?? "-"}</td>
                <td className={td}>1</td>
                <td className={td}>
                  {kit.inverter?.power_kw ? `${number(kit.inverter.power_kw, 2)} kW` : "-"}
                </td>
              </tr>
              <tr>
                <td className={td}>Estrutura e materiais</td>
                <td className={td}>
                  Estrutura de fixação para telhado {resolved.roof_type?.name ?? "-"}, cabos,
                  conectores e proteções CC/CA
                </td>
                <td className={td}>1</td>
                <td className={td}>-</td>
              </tr>
              <tr style={{ background: `${primary}1a` }}>
                <td className={`${td} font-bold`}>Kit</td>
                <td className={`${td} font-bold`}>{kit.name ?? "-"}</td>
                <td className={td}>-</td>
                <td className={`${td} font-bold`}>
                  {number(kit.kwp_total ?? generation.kwp, 2)} kWp
                </td>
              </tr>
            </tbody>
          </table>

          <div className="mt-4 grid grid-cols-4 gap-3 text-[11px]">
            {[
              { label: "Orientação", value: resolved.orientation?.name ?? "-" },
              { label: "Tipo de ligação", value: resolved.connection_type?.name ?? "-" },
              { label: "Concessionária", value: resolved.utility?.name ?? "-" },
              {
                label: "Tarifa",
                value: resolved.utility?.tariff_kwh
                  ? `${currency(resolved.utility.tariff_kwh)}/kWh`
                  : "-",
              },
            ].map((i) => (
              <div key={i.label} className="rounded border border-black/10 p-3">
                <p className="text-black/50">{i.label}</p>
                <p className="font-semibold">{i.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Financeiro ---------- */}
      <section className="proposal-page p-[16mm]">
        {sectionTitle("Investimento e condições")}

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Valor à vista", value: currency(pricing.cash_price) },
            {
              label: "Condição escolhida",
              value: proposal.payment_condition || "À vista",
            },
            {
              label: selectedTerm ? `Parcela em ${selectedTerm.term_months}x` : "Economia 1º ano",
              value: selectedTerm
                ? currency(selectedTerm.installment)
                : currency(summary.first_year_saving),
            },
          ].map((c) => (
            <div
              key={c.label}
              className="rounded-lg p-4"
              style={{ background: secondary, color: "#fff" }}
            >
              <p className="text-[10px] uppercase tracking-wide opacity-70">{c.label}</p>
              <p className="mt-1 text-[17px] font-bold">{c.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-4 gap-3 text-[11px]">
          {[
            {
              label: "Payback",
              value: summary.payback_years ? `${summary.payback_years} anos` : "-",
            },
            { label: "Economia em 25 anos", value: currency(summary.total_saving_25y) },
            { label: "Retorno sobre investimento", value: `${summary.roi_percent ?? "-"}%` },
            {
              label: "Economia média mensal (1º ano)",
              value: currency(summary.first_year_monthly_saving),
            },
          ].map((i) => (
            <div
              key={i.label}
              className="rounded border border-black/10 p-3"
              style={{ borderTop: `3px solid ${primary}` }}
            >
              <p className="text-black/50">{i.label}</p>
              <p className="font-semibold text-[13px]">{i.value}</p>
            </div>
          ))}
        </div>

        {financing.length > 0 && (
          <div className="mt-8">
            {sectionTitle("Opções de financiamento")}
            <table className="w-full border-collapse">
              <thead>
                <tr style={{ background: secondary, color: "#fff" }}>
                  <th className={th}>Banco</th>
                  <th className={th}>Prazo</th>
                  <th className={th}>Juros/mês</th>
                  <th className={th}>Parcela</th>
                  <th className={th}>Total pago</th>
                  <th className={th}>Juros totais</th>
                </tr>
              </thead>
              <tbody>
                {financing.map((f: any) => {
                  const highlight =
                    selectedTermMonths != null &&
                    Number(f.term_months) === Number(selectedTermMonths);
                  return (
                    <tr key={f.term_id} style={highlight ? { background: `${primary}26` } : undefined}>
                      <td className={td}>{f.bank_name ?? "-"}</td>
                      <td className={td}>{f.term_months}x</td>
                      <td className={td}>{f.monthly_interest_rate}%</td>
                      <td className={`${td} font-semibold`}>{currency(f.installment)}</td>
                      <td className={td}>{currency(f.total_paid)}</td>
                      <td className={td}>{currency(f.total_interest)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-6 text-[10px] text-black/60 leading-relaxed">
          Valores sujeitos a confirmação após visita técnica. Proposta válida até{" "}
          {date(proposal.valid_until)}. As parcelas de financiamento são simulações e dependem da
          aprovação de crédito pela instituição financeira.
        </p>
      </section>

      {/* ---------- Geração ---------- */}
      <section className="proposal-page p-[16mm]">
        {sectionTitle("Geração de energia estimada")}
        <p className="text-[11px] text-black/70 mb-4">
          Geração anual estimada de {number(generation.annual_kwh)} kWh, com média de{" "}
          {number(generation.monthly_average_kwh)} kWh por mês.
        </p>

        <BarChart width={640} height={230} data={monthly}>
          <CartesianGrid strokeDasharray="3 3" stroke="#00000018" />
          <XAxis
            dataKey="label"
            tickFormatter={(v: string) => String(v).slice(0, 3)}
            tick={{ fontSize: 10 }}
          />
          <YAxis tick={{ fontSize: 10 }} />
          <Bar
            dataKey="generation_kwh"
            fill={primary}
            radius={[3, 3, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>

        <table className="w-full border-collapse mt-4">
          <thead>
            <tr style={{ background: secondary, color: "#fff" }}>
              <th className={th}>Mês</th>
              <th className={th}>Irradiação (kWh/m²·dia)</th>
              <th className={th}>Geração (kWh)</th>
            </tr>
          </thead>
          <tbody>
            {monthly.map((m: any) => (
              <tr key={m.month}>
                <td className={td}>{m.label}</td>
                <td className={td}>{number(m.irradiance_kwh_m2_day, 2)}</td>
                <td className={td}>{number(m.generation_kwh)}</td>
              </tr>
            ))}
            <tr style={{ background: `${primary}1a` }}>
              <td className={`${td} font-bold`}>Total anual</td>
              <td className={td}>-</td>
              <td className={`${td} font-bold`}>{number(generation.annual_kwh)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* ---------- Investimento x retorno ---------- */}
      <section className="proposal-page p-[16mm]">
        {sectionTitle("Retorno do investimento")}
        <p className="text-[11px] text-black/70 mb-4">
          Economia acumulada em 25 anos comparada ao investimento inicial de{" "}
          {currency(pricing.cash_price)}.
        </p>

        <AreaChart width={640} height={240} data={roiData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#00000018" />
          <XAxis dataKey="year" tick={{ fontSize: 10 }} />
          <YAxis
            tick={{ fontSize: 10 }}
            tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
          />
          <Area
            type="monotone"
            dataKey="accumulated"
            stroke={primary}
            fill={primary}
            fillOpacity={0.25}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="investment"
            stroke={secondary}
            strokeDasharray="5 4"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>

        <div className="mt-6">
          {sectionTitle("Cobrança do Fio B (Lei 14.300)")}
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ background: secondary, color: "#fff" }}>
                <th className={th}>Ano</th>
                <th className={th}>Fio B</th>
                <th className={th}>Tarifa (R$/kWh)</th>
                <th className={th}>Geração (kWh)</th>
                <th className={th}>Custo Fio B</th>
                <th className={th}>Economia do ano</th>
                <th className={th}>Acumulado</th>
              </tr>
            </thead>
            <tbody>
              {savingsYears.slice(0, 15).map((y: any) => (
                <tr key={y.year}>
                  <td className={td}>{y.year}</td>
                  <td className={td}>{number(y.fio_b_percent)}%</td>
                  <td className={td}>{Number(y.tariff_kwh).toFixed(3)}</td>
                  <td className={td}>{number(y.generation_kwh)}</td>
                  <td className={td}>{currency(y.fio_b_cost)}</td>
                  <td className={td}>{currency(y.net_saving)}</td>
                  <td className={`${td} font-semibold`}>{currency(y.cumulative_saving)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {savingsYears.length > 15 && (
            <p className="mt-2 text-[10px] text-black/60">
              Projeção completa de {savingsYears.length} anos disponível com o consultor. Economia
              total estimada: {currency(summary.total_saving_25y)}.
            </p>
          )}
        </div>
      </section>

      {/* ---------- Responsabilidades e aceite ---------- */}
      <section className="proposal-page p-[16mm]">
        {sectionTitle("Responsabilidades")}
        <div className="grid grid-cols-2 gap-6 text-[11px] leading-relaxed">
          <div>
            <p className="font-bold mb-2" style={{ color: secondary }}>
              Da empresa
            </p>
            <ul className="space-y-1.5">
              {RESPONSIBILITIES.company.map((r) => (
                <li key={r} className="flex gap-2">
                  <span style={{ color: primary }}>•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-bold mb-2" style={{ color: secondary }}>
              Do cliente
            </p>
            <ul className="space-y-1.5">
              {RESPONSIBILITIES.client.map((r) => (
                <li key={r} className="flex gap-2">
                  <span style={{ color: primary }}>•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10">
          {sectionTitle("Aceite da proposta")}
          <p className="text-[11px] leading-relaxed">
            Declaro estar de acordo com o escopo, os valores e as condições apresentadas nesta
            proposta nº #{String(proposal.quote_number ?? "-").padStart(3, "0")}, no valor de{" "}
            <strong>{currency(pricing.cash_price)}</strong> ({proposal.payment_condition || "à vista"}).
          </p>
          <div className="mt-12 grid grid-cols-2 gap-10 text-[11px]">
            <div>
              <div className="border-t border-black/40 pt-2">
                <p className="font-semibold">{proposal.client_name}</p>
                <p className="text-black/60">Cliente — assinatura e data</p>
              </div>
            </div>
            <div>
              <div className="border-t border-black/40 pt-2">
                <p className="font-semibold">{companyName ?? "-"}</p>
                <p className="text-black/60">{sellerName || "Consultor"} — assinatura</p>
              </div>
            </div>
          </div>
        </div>

        <div
          className="mt-12 rounded-lg p-4 text-[10px] leading-relaxed text-white"
          style={{ background: secondary }}
        >
          <p className="whitespace-pre-line">{branding?.footer_text || companyName || ""}</p>
          {(branding?.footer_contacts ?? []).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
              {(branding?.footer_contacts ?? []).map((c, i) => (
                <span key={`${c.label}-${i}`}>
                  <span className="opacity-70">{c.label}:</span> {c.value}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default ProposalDocument;
