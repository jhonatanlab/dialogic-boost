import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { CampaignStats } from "@/hooks/useAnalytics";

interface CampaignStatsCardsProps {
  stats: CampaignStats;
}

const chartConfig = {
  value: {
    label: "Quantidade",
    color: "hsl(var(--primary))",
  },
};

export function CampaignStatsCards({ stats }: CampaignStatsCardsProps) {
  const statusData = [
    { name: "Rascunho", value: stats.campaigns_draft },
    { name: "Agendadas", value: stats.campaigns_scheduled },
    { name: "Enviadas", value: stats.campaigns_sent },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Campanhas por Status</CardTitle>
        <CardDescription>Total: {stats.total_campaigns} campanhas</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <BarChart data={statusData} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
            <XAxis type="number" className="text-xs fill-muted-foreground" />
            <YAxis 
              type="category" 
              dataKey="name" 
              className="text-xs fill-muted-foreground"
              tickLine={false}
              axisLine={false}
              width={80}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar 
              dataKey="value" 
              fill="hsl(var(--primary))" 
              radius={[0, 4, 4, 0]}
              name="Quantidade"
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
