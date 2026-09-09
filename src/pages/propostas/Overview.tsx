import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSolarCatalog } from "@/hooks/useSolarCatalog";
import { useSolarPricingConfig } from "@/hooks/useSolarPricingConfig";
import { useSolarBranding } from "@/hooks/useSolarBranding";
import {
  FileText,
  Settings2,
  Package,
  Zap,
  Grid3x3,
  Landmark,
  Coins,
  Palette,
  Building2,
  ArrowRight,
} from "lucide-react";

const ProposalsOverview = () => {
  const kits = useSolarCatalog("solar_kits");
  const inverters = useSolarCatalog("solar_inverters");
  const modules = useSolarCatalog("solar_modules");
  const utilities = useSolarCatalog("solar_utilities");
  const cities = useSolarCatalog("solar_cities");
  const roofs = useSolarCatalog("solar_roof_types");
  const orientations = useSolarCatalog("solar_orientations");
  const connections = useSolarCatalog("solar_connection_types");
  const banks = useSolarCatalog("solar_financing_banks");
  const { data: pricing } = useSolarPricingConfig();
  const { data: branding } = useSolarBranding();

  const supportCount =
    (utilities.data?.length ?? 0) +
    (cities.data?.length ?? 0) +
    (roofs.data?.length ?? 0) +
    (orientations.data?.length ?? 0) +
    (connections.data?.length ?? 0);

  const cards = [
    {
      title: "Kits",
      description: "Inversor, módulo e quantidade com o kWp calculado.",
      to: "/propostas/kits",
      icon: Package,
      info: `${kits.data?.length ?? 0} cadastrados`,
    },
    {
      title: "Inversores",
      description: "Equipamentos disponíveis para montar os kits.",
      to: "/propostas/inversores",
      icon: Zap,
      info: `${inverters.data?.length ?? 0} cadastrados`,
    },
    {
      title: "Módulos",
      description: "Placas solares com potência e dimensões.",
      to: "/propostas/modulos",
      icon: Grid3x3,
      info: `${modules.data?.length ?? 0} cadastrados`,
    },
    {
      title: "Cadastros de apoio",
      description: "Concessionárias, cidades, telhados, orientações e ligações.",
      to: "/propostas/configuracoes",
      icon: Building2,
      info: `${supportCount} registros`,
    },
    {
      title: "Financiamento",
      description: "Bancos, prazos e taxa de juros mensal.",
      to: "/propostas/configuracoes/financiamento",
      icon: Landmark,
      info: `${banks.data?.length ?? 0} bancos`,
    },
    {
      title: "Valores fixos",
      description: "Margem, valor por km, visita, inflação e degradação.",
      to: "/propostas/configuracoes/valores-fixos",
      icon: Coins,
      info: pricing ? "Configurado" : "Pendente",
    },
    {
      title: "Personalização",
      description: "Logo, cores e textos que aparecem na proposta.",
      to: "/propostas/configuracoes/personalizacao",
      icon: Palette,
      info: branding ? "Configurado" : "Pendente",
    },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" /> Propostas
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Central do módulo de propostas solares: cadastros, valores e personalização.
            </p>
          </div>
          <Button asChild>
            <Link to="/propostas/configuracoes">
              <Settings2 className="h-4 w-4 mr-2" />
              Configurações
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <Link key={card.to + card.title} to={card.to} className="group">
              <Card className="h-full rounded-xl transition-colors hover:border-primary/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <card.icon className="h-5 w-5 text-primary" />
                    </div>
                    <Badge variant="secondary">{card.info}</Badge>
                  </div>
                  <CardTitle className="text-base mt-3">{card.title}</CardTitle>
                  <CardDescription>{card.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="inline-flex items-center gap-1 text-sm text-primary">
                    Abrir
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <Card className="rounded-xl border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Propostas geradas</CardTitle>
            <CardDescription>
              Em breve: aqui ficará a lista das propostas criadas para os clientes. O cálculo já
              está disponível, mas ainda não é salvo.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ProposalsOverview;
