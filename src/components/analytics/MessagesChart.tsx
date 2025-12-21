import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { DailyMessageData } from "@/hooks/useAnalytics";

interface MessagesChartProps {
  data: DailyMessageData[];
}

const chartConfig = {
  sent: {
    label: "Enviadas",
    color: "hsl(var(--primary))",
  },
  received: {
    label: "Recebidas",
    color: "hsl(var(--chart-2))",
  },
};

export function MessagesChart({ data }: MessagesChartProps) {
  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Mensagens ao Longo do Tempo</CardTitle>
        <CardDescription>Volume de mensagens enviadas e recebidas por dia</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              className="text-xs fill-muted-foreground"
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              className="text-xs fill-muted-foreground"
              tickLine={false}
              axisLine={false}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey="sent"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorSent)"
              name="Enviadas"
            />
            <Area
              type="monotone"
              dataKey="received"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorReceived)"
              name="Recebidas"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
