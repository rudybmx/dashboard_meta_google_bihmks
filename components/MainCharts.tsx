import React, { useMemo } from 'react';
import {
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
    ChartContainer, 
    ChartTooltip, 
    ChartTooltipContent, 
    ChartConfig,
    ChartLegend,
    ChartLegendContent
} from "@/components/ui/chart";
import { CampaignData } from '../types';

interface Props {
  data: CampaignData[];
}

// Configuration for colors and labels
const chartConfig = {
  spend: {
    label: "Investimento",
    color: "hsl(var(--chart-1))", 
  },
  leads: {
    label: "Leads",
    color: "hsl(var(--chart-2))",
  },
  facebook: {
    label: "Facebook",
    color: "hsl(var(--chart-1))",
  },
  instagram: {
    label: "Instagram",
    color: "hsl(var(--chart-3))",
  },
  google: {
    label: "Google",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

export const MainCharts: React.FC<Props> = ({ data }) => {
  
  // Prepare Time Series Data
  const timeSeriesData = useMemo(() => {
    const grouped: Record<string, { date: string, spend: number, leads: number, displayDate: string }> = {};
    
    // Sort chronologically first
    const sortedData = [...data].sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());

    sortedData.forEach(d => {
      if (!grouped[d.date_start]) {
        grouped[d.date_start] = { 
            date: d.date_start, 
            spend: 0, 
            leads: 0,
            displayDate: new Date(d.date_start).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        };
      }
      grouped[d.date_start].spend += d.valor_gasto;
      grouped[d.date_start].leads += d.leads_total;
    });

    return Object.values(grouped);
  }, [data]);

  // Prepare Platform Data
  const platformData = useMemo(() => {
    const counts = { facebook: 0, google: 0, instagram: 0 };
    data.forEach(d => {
      const plat = (d.target_plataformas || 'facebook').toLowerCase();
      if (['facebook', 'instagram', 'google'].includes(plat)) {
          counts[plat as keyof typeof counts] += d.valor_gasto;
      } else {
         counts['facebook'] += d.valor_gasto;
      }
    });
    
    return [
      { name: 'facebook', value: counts.facebook, fill: "var(--color-facebook)" }, 
      { name: 'instagram', value: counts.instagram, fill: "var(--color-instagram)" }, 
      { name: 'google', value: counts.google, fill: "var(--color-google)" },   
    ].filter(item => item.value > 0);
  }, [data]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* Main Area/Composed Chart */}
      <div className="lg:col-span-2 bg-card rounded-xl border p-6 shadow-sm">
        <div className="mb-6">
          <h3 className="text-lg font-bold">Investimento vs. Leads</h3>
          <p className="text-sm text-muted-foreground">Acompanhamento diário de performance.</p>
        </div>
        
        <ChartContainer config={chartConfig} className="h-[350px] w-full">
            <ComposedChart data={timeSeriesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fillSpend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-spend)" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="var(--color-spend)" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis 
                dataKey="displayDate" 
                tickLine={false} 
                axisLine={false} 
                tickMargin={10}
              />
              <YAxis 
                yAxisId="left" 
                orientation="left" 
                tickLine={false} 
                axisLine={false} 
                tickMargin={10}
                tickFormatter={(val) => `R$${val}`}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                tickLine={false} 
                axisLine={false} 
                tickMargin={10}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              
              <Area 
                yAxisId="left"
                type="monotone" 
                dataKey="spend" 
                fill="url(#fillSpend)" 
                stroke="var(--color-spend)" 
                radius={4}
              />
              <Bar 
                yAxisId="right"
                dataKey="leads" 
                fill="var(--color-leads)" 
                radius={[4, 4, 0, 0]} 
                barSize={20}
              />
            </ComposedChart>
        </ChartContainer>
      </div>

      {/* Donut Chart */}
      <div className="bg-card rounded-xl border p-6 shadow-sm flex flex-col">
        <div className="mb-2">
            <h3 className="text-lg font-bold">Divisão por Plataforma</h3>
            <p className="text-sm text-muted-foreground">Distribuição de investimento.</p>
        </div>
        
        <div className="flex-1 min-h-[300px] relative">
            <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[300px]">
                <PieChart>
                    <Pie
                        data={platformData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                    >
                        {/* Cells are automatically filled by matching nameKey to config key or explicitly passing fill from data if using var() */}
                        {/* In this case platformData has 'fill' property with var(--color-name) */}
                    </Pie>
                    <ChartTooltip 
                        content={<ChartTooltipContent nameKey="name" hideLabel />} 
                    />
                     <ChartLegend 
                        content={<ChartLegendContent nameKey="name" />} 
                        className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
                      />
                </PieChart>
            </ChartContainer>
            
            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-12">
                <span className="text-xs text-muted-foreground font-medium">Investimento</span>
                <span className="text-xl font-bold text-foreground">Total</span>
            </div>
        </div>
      </div>
    </div>
  );
};