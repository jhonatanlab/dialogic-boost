import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";
import {
  MONTHS,
  calcFinancing,
  calcGeneration,
  calcPricing,
  calcSavings,
  num,
} from "./calc.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const BodySchema = z.object({
  kit_id: z.string().uuid(),
  city_id: z.string().uuid(),
  roof_type_id: z.string().uuid(),
  orientation_id: z.string().uuid(),
  connection_type_id: z.string().uuid(),
  utility_id: z.string().uuid(),
  avg_monthly_consumption_kwh: z.number().positive().max(1_000_000),
  distance_km: z.number().min(0).max(10_000),
  financing_bank_id: z.string().uuid().optional().nullable(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anon.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub as string;

    // Tolerância a JSON com quebras de linha/tabs escapadas incorretamente.
    const raw = await req.text();
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch {
      try {
        parsedJson = JSON.parse(raw.replace(/[\n\r\t]/g, " "));
      } catch {
        return json({ error: "Invalid JSON body" }, 400);
      }
    }

    const parsed = BodySchema.safeParse(parsedJson);
    if (!parsed.success) {
      return json({ error: parsed.error.flatten().fieldErrors }, 400);
    }
    const input = parsed.data;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("company_id, is_blocked")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError) return json({ error: profileError.message }, 500);
    if (!profile?.company_id) return json({ error: "Perfil sem empresa vinculada" }, 403);
    if (profile.is_blocked) return json({ error: "Usuário bloqueado" }, 403);
    const companyId = profile.company_id as string;

    const byCompany = (table: string, id: string, select = "*") =>
      admin.from(table).select(select).eq("id", id).eq("company_id", companyId).maybeSingle();

    const [kitRes, cityRes, roofRes, orientationRes, connectionRes, utilityRes, configRes] =
      await Promise.all([
        byCompany(
          "solar_kits",
          input.kit_id,
          "*, inverter:solar_inverters(id,name,brand,model,power_kw,phases), module:solar_modules(id,name,brand,model,power_wp)",
        ),
        byCompany("solar_cities", input.city_id),
        byCompany("solar_roof_types", input.roof_type_id),
        byCompany("solar_orientations", input.orientation_id),
        byCompany("solar_connection_types", input.connection_type_id),
        byCompany("solar_utilities", input.utility_id),
        admin
          .from("solar_pricing_config")
          .select("*")
          .eq("company_id", companyId)
          .maybeSingle(),
      ]);

    const missing: string[] = [];
    if (!kitRes.data) missing.push("kit");
    if (!cityRes.data) missing.push("cidade");
    if (!roofRes.data) missing.push("tipo de telhado");
    if (!orientationRes.data) missing.push("orientação");
    if (!connectionRes.data) missing.push("tipo de ligação");
    if (!utilityRes.data) missing.push("concessionária");
    if (missing.length) {
      return json({ error: `Cadastro não encontrado: ${missing.join(", ")}` }, 404);
    }

    const kit = kitRes.data as any;
    const city = cityRes.data as any;
    const roof = roofRes.data as any;
    const orientation = orientationRes.data as any;
    const connection = connectionRes.data as any;
    const utility = utilityRes.data as any;
    const config = (configRes.data ?? {}) as any;

    const module = kit.module ?? null;
    const kwp =
      num(kit.kwp_total) ||
      (num(module?.power_wp) * num(kit.module_quantity, 0)) / 1000;

    if (kwp <= 0) {
      return json({ error: "O kit selecionado não possui potência (kWp) definida" }, 400);
    }

    const irradiance: Record<string, number> = {};
    for (const m of MONTHS) irradiance[m.key] = num(city[`irradiance_${m.key}`]);
    if (!Object.values(irradiance).some((v) => v > 0)) {
      return json({ error: "A cidade selecionada não possui irradiação cadastrada" }, 400);
    }

    const generation = calcGeneration({
      kwp,
      irradiance,
      roofLossPercent: num(roof.loss_factor),
      orientationLossPercent: num(orientation.loss_factor),
    });

    const pricing = calcPricing({
      kitPrice: num(kit.price),
      pricePerKm: num(config.price_per_km),
      distanceKm: input.distance_km,
      baseVisitFee: num(config.base_visit_fee),
      marginPercent: num(config.margin_percent),
    });
    pricing.price_per_wp = Math.round((pricing.cash_price / (kwp * 1000)) * 100) / 100;

    const tariff = num(utility.tariff_kwh);
    const savings = calcSavings({
      annualGenerationKwh: generation.annual_kwh,
      avgMonthlyConsumptionKwh: input.avg_monthly_consumption_kwh,
      tariffKwh: tariff,
      minimumFee: num(utility.minimum_fee),
      minimumKwh: num(connection.minimum_kwh),
      tariffInflationPercent: num(config.annual_tariff_inflation_percent, 8.5),
      degradationPercent: num(config.annual_module_degradation_percent, 0.55),
      investment: pricing.cash_price,
      startYear: new Date().getUTCFullYear(),
    });

    let termsQuery = admin
      .from("solar_financing_terms")
      .select("id, bank_id, term_months, monthly_interest_rate")
      .eq("company_id", companyId)
      .eq("is_active", true);
    if (input.financing_bank_id) termsQuery = termsQuery.eq("bank_id", input.financing_bank_id);

    const [termsRes, banksRes] = await Promise.all([
      termsQuery,
      admin
        .from("solar_financing_banks")
        .select("id, name")
        .eq("company_id", companyId)
        .eq("is_active", true),
    ]);

    const bankNames: Record<string, string> = {};
    for (const b of banksRes.data ?? []) bankNames[b.id as string] = b.name as string;
    const financing = calcFinancing(pricing.cash_price, (termsRes.data ?? []) as any[], bankNames);

    const annualConsumption = input.avg_monthly_consumption_kwh * 12;

    return json({
      mode: "preview",
      generated_at: new Date().toISOString(),
      input_resolved: {
        company_id: companyId,
        kit: {
          id: kit.id,
          name: kit.name,
          kwp_total: generation.kwp,
          module_quantity: kit.module_quantity,
          price: num(kit.price),
          inverter: kit.inverter
            ? { id: kit.inverter.id, name: kit.inverter.name, power_kw: num(kit.inverter.power_kw) }
            : null,
          module: module
            ? { id: module.id, name: module.name, power_wp: num(module.power_wp) }
            : null,
        },
        city: { id: city.id, name: city.name, state: city.state },
        roof_type: { id: roof.id, name: roof.name, loss_factor: num(roof.loss_factor) },
        orientation: {
          id: orientation.id,
          name: orientation.name,
          azimuth: num(orientation.azimuth),
          loss_factor: num(orientation.loss_factor),
        },
        connection_type: {
          id: connection.id,
          name: connection.name,
          phases: connection.phases,
          minimum_kwh: num(connection.minimum_kwh),
        },
        utility: {
          id: utility.id,
          name: utility.name,
          tariff_kwh: tariff,
          minimum_fee: num(utility.minimum_fee),
        },
        avg_monthly_consumption_kwh: input.avg_monthly_consumption_kwh,
        distance_km: input.distance_km,
        financing_bank_id: input.financing_bank_id ?? null,
        pricing_config: {
          margin_percent: num(config.margin_percent),
          price_per_km: num(config.price_per_km),
          base_visit_fee: num(config.base_visit_fee),
          annual_tariff_inflation_percent: num(config.annual_tariff_inflation_percent, 8.5),
          annual_module_degradation_percent: num(config.annual_module_degradation_percent, 0.55),
        },
      },
      generation,
      consumption: {
        monthly_average_kwh: input.avg_monthly_consumption_kwh,
        annual_kwh: annualConsumption,
        coverage_percent:
          annualConsumption > 0
            ? Math.round((generation.annual_kwh / annualConsumption) * 1000) / 10
            : null,
        surplus_annual_kwh: Math.round((generation.annual_kwh - annualConsumption) * 100) / 100,
      },
      pricing,
      savings_years: savings.years,
      summary: savings.summary,
      financing,
    });
  } catch (e) {
    console.error("calculate-solar-proposal error", e);
    return json({ error: (e as Error)?.message ?? "Erro inesperado" }, 500);
  }
});
