import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";

interface ConversationsChartProps {
  data: {
    total: number;
    open: number;
    in_progress?: number;
    pending: number;
    closed: number;
    started_count?: number;
    closed_count?: number;
    avg_resolution_ms?: number;
    avg_response_ms?: number;
    agent_conversations?: { agent_name: string; count: number }[];
  };
}

const chartConfig = {
  open: {
    label: "Abertas",
    color: "hsl(var(--chart-1))",
  },
  pending: {
    label: "Pendentes",
    color: "hsl(var(--chart-3))",
  },
  closed: {
    label: "Fechadas",
    color: "hsl(var(--chart-2))",
  },
};

export function ConversationsChart({ data }: ConversationsChartProps) {
  const chartData = [
    { name: "Abertas", value: data.open, color: "hsl(var(--chart-1))" },
    { name: "Pendentes", value: data.pending, color: "hsl(var(--chart-3))" },
    { name: "Fechadas", value: data.closed, color: "hsl(var(--chart-2))" },
  ].filter(item => item.value > 0);

  if (data.total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Status das Conversas</CardTitle>
          <CardDescription>Distribuição por status</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[250px]">
          <p className="text-muted-foreground">Nenhuma conversa no período</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status das Conversas</CardTitle>
        <CardDescription>Distribuição por status</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
