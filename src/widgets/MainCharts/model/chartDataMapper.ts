import { RawFinanceData } from '@/src/entities/finance';

export const getChartData = (rawData: RawFinanceData[]) => {
    const barData = rawData.map(row => ({
        accountName: row.nome_conta || row.meta_account_id,
        spend: row.investimento || 0,
        leads: row.leads || 0,
    })).sort((a, b) => b.spend - a.spend); // Sort by spend

    // Create donut chart mapping using the defined chart colors
    const pieColors = [
        "hsl(var(--chart-1))",
        "hsl(var(--chart-2))",
        "hsl(var(--chart-3))",
        "hsl(var(--chart-4))",
        "hsl(var(--chart-5))"
    ];

    const pieData = rawData
        .filter(row => row.investimento > 0)
        .sort((a, b) => b.investimento - a.investimento)
        .map((row, idx) => ({
            name: row.nome_conta || row.meta_account_id,
            value: row.investimento,
            fill: pieColors[idx % pieColors.length]
        }));

    return { barData, pieData };
};
