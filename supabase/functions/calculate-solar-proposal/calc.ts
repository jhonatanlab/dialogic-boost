// Cálculo de proposta solar (modo preview) — sem acesso ao banco.

export const MONTHS = [
  { key: "jan", label: "Janeiro", days: 31 },
  { key: "fev", label: "Fevereiro", days: 28 },
  { key: "mar", label: "Março", days: 31 },
  { key: "abr", label: "Abril", days: 30 },
  { key: "mai", label: "Maio", days: 31 },
  { key: "jun", label: "Junho", days: 30 },
  { key: "jul", label: "Julho", days: 31 },
  { key: "ago", label: "Agosto", days: 31 },
  { key: "set", label: "Setembro", days: 30 },
  { key: "out", label: "Outubro", days: 31 },
  { key: "nov", label: "Novembro", days: 30 },
  { key: "dez", label: "Dezembro", days: 31 },
] as const;

/** Perdas fixas do sistema (cabeamento, sujidade, temperatura, inversor). */
export const SYSTEM_LOSS_PERCENT = 20;

/** Cronograma de cobrança do Fio B (Lei 14.300). */
export const FIO_B_SCHEDULE: Record<number, number> = {
  2023: 0.15,
  2024: 0.30,
  2025: 0.45,
  2026: 0.60,
  2027: 0.75,
  2028: 0.90,
};
export const FIO_B_FULL_FROM_YEAR = 2029;

/** Parcela da tarifa cheia estimada como TUSD Fio B. */
export const FIO_B_TARIFF_SHARE = 0.28;

export const PROJECTION_YEARS = 25;

const round = (v: number, d = 2) => {
  const f = Math.pow(10, d);
  return Math.round((Number.isFinite(v) ? v : 0) * f) / f;
};

export const num = (v: unknown, fallback = 0): number => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : fallback;
};

export function fioBFactor(year: number): number {
  if (year >= FIO_B_FULL_FROM_YEAR) return 1;
  const keys = Object.keys(FIO_B_SCHEDULE).map(Number).sort((a, b) => a - b);
  if (year <= keys[0]) return FIO_B_SCHEDULE[keys[0]];
  return FIO_B_SCHEDULE[year] ?? 1;
}

export interface GenerationInput {
  kwp: number;
  irradiance: Record<string, number>;
  roofLossPercent: number;
  orientationLossPercent: number;
}

export function calcGeneration({
  kwp,
  irradiance,
  roofLossPercent,
  orientationLossPercent,
}: GenerationInput) {
  const performanceRatio =
    (1 - roofLossPercent / 100) *
    (1 - orientationLossPercent / 100) *
    (1 - SYSTEM_LOSS_PERCENT / 100);

  const monthly = MONTHS.map((m) => {
    const irr = num(irradiance[m.key]);
    const kwh = irr * kwp * m.days * performanceRatio;
    return {
      month: m.key,
      label: m.label,
      days: m.days,
      irradiance_kwh_m2_day: round(irr, 3),
      generation_kwh: round(kwh),
    };
  });

  const annual = monthly.reduce((a, m) => a + m.generation_kwh, 0);

  return {
    kwp: round(kwp, 3),
    performance_ratio: round(performanceRatio, 4),
    losses: {
      roof_percent: round(roofLossPercent),
      orientation_percent: round(orientationLossPercent),
      system_percent: SYSTEM_LOSS_PERCENT,
    },
    monthly,
    annual_kwh: round(annual),
    monthly_average_kwh: round(annual / 12),
  };
}

export interface SavingsInput {
  annualGenerationKwh: number;
  avgMonthlyConsumptionKwh: number;
  tariffKwh: number;
  minimumFee: number;
  minimumKwh: number;
  tariffInflationPercent: number;
  degradationPercent: number;
  investment: number;
  startYear: number;
}

export function calcSavings({
  annualGenerationKwh,
  avgMonthlyConsumptionKwh,
  tariffKwh,
  minimumFee,
  minimumKwh,
  tariffInflationPercent,
  degradationPercent,
  investment,
  startYear,
}: SavingsInput) {
  const annualConsumption = avgMonthlyConsumptionKwh * 12;
  const years: Array<Record<string, number>> = [];
  let cumulative = 0;
  let paybackMonths: number | null = null;

  for (let i = 0; i < PROJECTION_YEARS; i++) {
    const year = startYear + i;
    const tariff = tariffKwh * Math.pow(1 + tariffInflationPercent / 100, i);
    const generation = annualGenerationKwh * Math.pow(1 - degradationPercent / 100, i);

    // Energia compensada não pode exceder o consumo do período.
    const selfConsumed = Math.min(generation, annualConsumption);
    const injected = Math.max(generation - selfConsumed, 0);

    const grossSaving = selfConsumed * tariff;
    const fioBCost = (selfConsumed + injected) * tariff * FIO_B_TARIFF_SHARE * fioBFactor(year);
    const minimumCost = Math.max(minimumFee, minimumKwh * tariff) * 12;

    const netSaving = grossSaving - fioBCost - minimumCost;
    const previousCumulative = cumulative;
    cumulative += netSaving;

    if (paybackMonths === null && cumulative >= investment && netSaving > 0) {
      const missing = investment - previousCumulative;
      paybackMonths = i * 12 + Math.ceil((missing / netSaving) * 12);
    }

    years.push({
      year,
      generation_kwh: round(generation),
      tariff_kwh: round(tariff, 4),
      self_consumed_kwh: round(selfConsumed),
      injected_kwh: round(injected),
      gross_saving: round(grossSaving),
      fio_b_percent: round(fioBFactor(year) * 100),
      fio_b_cost: round(fioBCost),
      minimum_cost: round(minimumCost),
      net_saving: round(netSaving),
      cumulative_saving: round(cumulative),
    });
  }

  const totalSaving = cumulative;

  return {
    years,
    summary: {
      total_saving_25y: round(totalSaving),
      first_year_saving: round(years[0]?.net_saving ?? 0),
      first_year_monthly_saving: round((years[0]?.net_saving ?? 0) / 12),
      payback_months: paybackMonths,
      payback_years: paybackMonths === null ? null : round(paybackMonths / 12, 1),
      roi_percent: investment > 0 ? round((totalSaving / investment) * 100, 1) : null,
    },
  };
}

export interface PricingInput {
  kitPrice: number;
  pricePerKm: number;
  distanceKm: number;
  baseVisitFee: number;
  marginPercent: number;
}

export function calcPricing({
  kitPrice,
  pricePerKm,
  distanceKm,
  baseVisitFee,
  marginPercent,
}: PricingInput) {
  const logistics = pricePerKm * distanceKm;
  const cost = kitPrice + logistics + baseVisitFee;
  const margin = Math.min(Math.max(marginPercent, 0), 95);
  const total = cost / (1 - margin / 100);

  return {
    kit_price: round(kitPrice),
    logistics_cost: round(logistics),
    base_visit_fee: round(baseVisitFee),
    total_cost: round(cost),
    margin_percent: round(margin),
    margin_value: round(total - cost),
    cash_price: round(total),
    price_per_wp: round(total / Math.max(1, 1), 2),
  };
}

export function pricePayment(principal: number, monthlyRatePercent: number, months: number) {
  const i = monthlyRatePercent / 100;
  if (months <= 0) return 0;
  if (i <= 0) return principal / months;
  const factor = Math.pow(1 + i, months);
  return principal * ((i * factor) / (factor - 1));
}

export interface FinancingTermRow {
  id: string;
  bank_id: string;
  term_months: number;
  monthly_interest_rate: number | string | null;
}

export function calcFinancing(
  principal: number,
  terms: FinancingTermRow[],
  bankNames: Record<string, string>,
) {
  return terms
    .slice()
    .sort((a, b) => a.term_months - b.term_months)
    .map((t) => {
      const rate = num(t.monthly_interest_rate);
      const installment = pricePayment(principal, rate, t.term_months);
      const totalPaid = installment * t.term_months;
      return {
        term_id: t.id,
        bank_id: t.bank_id,
        bank_name: bankNames[t.bank_id] ?? null,
        term_months: t.term_months,
        monthly_interest_rate: round(rate, 4),
        installment: round(installment),
        total_paid: round(totalPaid),
        total_interest: round(totalPaid - principal),
      };
    });
}
