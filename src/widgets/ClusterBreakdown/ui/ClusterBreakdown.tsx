import React, { useMemo } from 'react';
import { useFinanceData } from '@/src/entities/finance';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/shared/ui/table";
import { Skeleton } from '@/src/shared/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';

const fmtCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const fmtInt = (value: number) => new Intl.NumberFormat('pt-BR').format(value);

export const ClusterBreakdown: React.FC = () => {
    const { data: metrics, isLoading, isError } = useFinanceData();

    const chartData = useMemo(() => {
        if (!metrics?.rawData) return [];

        return metrics.rawData.map((row: any) => {
            const accId = row.meta_account_id || row.account_id || 'ID Desconhecido';
            const accountName = row.nome_conta && row.nome_conta.trim() !== '' ? row.nome_conta : `Conta ${accId}`;
            const cpl = row.cpl_total ?? (row.leads > 0 ? row.investimento / row.leads : 0);
            return {
                name: accountName,
                cpl,
                investimento: row.investimento || 0,
                leads: row.leads || 0,
                id: accId
            };
        }).sort((a, b) => b.investimento - a.investimento); // Sort by spend
    }, [metrics]);

    if (isLoading) {
        return <Skeleton className="w-full h-[400px] rounded-xl" />;
    }

    if (isError || !metrics || chartData.length === 0) {
        return null;
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8 animate-in fade-in">
            {/* Chart Column */}
            <div className="bg-card rounded-xl border p-6 shadow-sm">
                <div className="mb-6">
                    <h3 className="text-lg font-bold">Custo por Lead (CPL) entre Contas</h3>
                    <p className="text-sm text-muted-foreground cursor-default">Comparação de eficiência das unidades no agrupamento.</p>
                </div>

                <div className="h-[300px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis
                                dataKey="name"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={10}
                                tickFormatter={(value) => value.length > 15 ? value.substring(0, 15) + '...' : value}
                            />
                            <YAxis
                                tickFormatter={(val) => `R$${val}`}
                                tickLine={false}
                                axisLine={false}
                            />
                            <RechartsTooltip
                                formatter={(value: number) => [fmtCurrency(value), 'CPL']}
                                labelStyle={{ color: 'black' }}
                                cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                            />
                            <Bar dataKey="cpl" radius={[4, 4, 0, 0]} maxBarSize={50}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill="hsl(var(--chart-2))" />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Table Ranking Column */}
            <div className="bg-card rounded-xl shadow-sm overflow-hidden flex flex-col border">
                <div className="p-6 border-b">
                    <h3 className="text-lg font-bold">Ranking de Contas</h3>
                    <p className="text-sm text-muted-foreground cursor-default">Performance detalhada de cada unidade.</p>
                </div>

                <div className="overflow-auto max-h-[350px]">
                    <Table>
                        <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm border-b">
                            <TableRow>
                                <TableHead>Unidade</TableHead>
                                <TableHead className="text-right">Investimento</TableHead>
                                <TableHead className="text-right">Leads</TableHead>
                                <TableHead className="text-right">CPL</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {chartData.map((row) => (
                                <TableRow key={row.id} className="hover:bg-slate-50">
                                    <TableCell className="font-medium text-xs truncate max-w-[150px]" title={row.name}>
                                        {row.name}
                                    </TableCell>
                                    <TableCell className="text-right text-xs text-slate-600">{fmtCurrency(row.investimento)}</TableCell>
                                    <TableCell className="text-right text-xs text-slate-600">{fmtInt(row.leads)}</TableCell>
                                    <TableCell className="text-right text-xs font-semibold text-slate-700">{fmtCurrency(row.cpl)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
};
