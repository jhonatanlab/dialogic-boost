// Estimativa de geração usada apenas para orientar a escolha do kit na tela.
// Os números oficiais da proposta vêm da edge function calculate-solar-proposal.

const MONTH_KEYS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

export const SYSTEM_LOSS = 0.2; // perda fixa de sistema (mesma da edge function)
export const AVG_DAYS_MONTH = 30.4;

const num = (v: any, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export function averageIrradiance(city: any): number {
  if (!city) return 0;
  const values = MONTH_KEYS.map((k) => num(city[`irradiance_${k}`])).filter((v) => v > 0);
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function lossFactor(roof: any, orientation: any): number {
  const roofLoss = num(roof?.loss_factor) / 100;
  const orientationLoss = num(orientation?.loss_factor) / 100;
  return (1 - roofLoss) * (1 - orientationLoss) * (1 - SYSTEM_LOSS);
}

/** kWh gerados por mês para cada 1 kWp instalado. */
export function monthlyKwhPerKwp(city: any, roof: any, orientation: any): number {
  return averageIrradiance(city) * AVG_DAYS_MONTH * lossFactor(roof, orientation);
}

export function kitKwp(kit: any, modules: any[] = []): number {
  const direct = num(kit?.kwp_total);
  if (direct > 0) return direct;
  const mod = modules.find((m) => m.id === kit?.module_id);
  return (num(mod?.power_wp) * num(kit?.module_quantity)) / 1000;
}

export interface KitEstimate {
  kit: any;
  kwp: number;
  monthlyKwh: number;
  coveragePercent: number | null;
  diff: number;
}

export function estimateKits(params: {
  kits: any[];
  modules?: any[];
  city: any;
  roof: any;
  orientation: any;
  monthlyConsumptionKwh: number;
}): { perKwp: number; requiredKwp: number; estimates: KitEstimate[] } {
  const { kits, modules = [], city, roof, orientation, monthlyConsumptionKwh } = params;
  const perKwp = monthlyKwhPerKwp(city, roof, orientation);
  const requiredKwp = perKwp > 0 ? monthlyConsumptionKwh / perKwp : 0;

  const estimates = kits
    .filter((k) => k.is_active !== false)
    .map((kit) => {
      const kwp = kitKwp(kit, modules);
      const monthlyKwh = kwp * perKwp;
      return {
        kit,
        kwp,
        monthlyKwh,
        coveragePercent:
          monthlyConsumptionKwh > 0 && perKwp > 0
            ? (monthlyKwh / monthlyConsumptionKwh) * 100
            : null,
        diff: Math.abs(monthlyKwh - monthlyConsumptionKwh),
      };
    })
    .sort((a, b) => {
      if (perKwp <= 0 || monthlyConsumptionKwh <= 0) return a.kwp - b.kwp;
      if (a.diff !== b.diff) return a.diff - b.diff;
      return a.kwp - b.kwp;
    });

  return { perKwp, requiredKwp, estimates };
}
