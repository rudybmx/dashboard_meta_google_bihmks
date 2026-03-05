import React from 'react';
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
} from "@/src/shared/ui/chart";
import { useFinanceData } from '@/src/entities/finance';
import { Skeleton } from '@/src/shared/ui/skeleton';
import { getChartData } from './model/chartDataMapper';

// Configuration for colors and labels
const chartConfig = {
    spend: {
        label: "Investimento",
        color: "hsl(var(--chart-1))",
    },
    leads: {
        label: "Leads",
        color: "hsl(var(--chart-2))",
    }
} satisfies ChartConfig;

export const MainCharts: React.FC<{ accountIds?: string[] }> = ({ accountIds }) => {
    const { data, isLoading, isError } = useFinanceData(accountIds);

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Skeleton className="lg:col-span-2 h-[450px] rounded-xl" />
                <Skeleton className="h-[450px] rounded-xl" />
            </div>
        );
    }

    if (isError || !data) {
        return null;
    }

    const { barData, pieData } = getChartData(data.rawData);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Main Area/Composed Chart - Account Performance */}
            <div className="lg:col-span-2 bg-card rounded-xl border p-6 shadow-sm">
                <div className="mb-6">
                    <h3 className="text-lg font-bold">Investimento vs. Leads por Conta</h3>
                    <p className="text-sm text-muted-foreground">Distribuição de performance entre contas ativas.</p>
                </div>

                <ChartContainer config={chartConfig} className="h-[350px] w-full">
                    <ComposedChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="fillSpendC" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-spend)" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="var(--color-spend)" stopOpacity={0.1} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="accountName"
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
                            fill="url(#fillSpendC)"
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

            {/* Donut Chart - Account Distribution */}
            <div className="bg-card rounded-xl border p-6 shadow-sm flex flex-col">
                <div className="mb-2">
                    <h3 className="text-lg font-bold">Divisão de Gastos por Conta</h3>
                    <p className="text-sm text-muted-foreground">Onde seu investimento está concentrado.</p>
                </div>

                <div className="flex-1 min-h-[300px] relative">
                    <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[300px]">
                        <PieChart>
                            <Pie
                                data={pieData}
                                dataKey="value"
                                nameKey="name"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={5}
                            >
                            </Pie>
                            <ChartTooltip
                                content={<ChartTooltipContent nameKey="name" hideLabel />}
                            />
                        </PieChart>
                    </ChartContainer>

                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-12">
                        <span className="text-xs text-muted-foreground font-medium">Contas</span>
                        <span className="text-xl font-bold text-foreground">Top</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
