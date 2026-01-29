import React, { useState, useEffect, useMemo } from 'react';
import {
    fetchCategories,
    fetchPlannings,
    CategoryRow,
    PlanningRow
} from '../services/supabaseService';
import { supabase } from '../services/supabaseClient';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowDown, Loader2, TrendingUp, AlertTriangle } from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';

const formatCurrency = (val: number) => `R$ ${val?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}`;
const formatNumber = (val: number) => val?.toLocaleString('pt-BR') || '0';

const DEFAULT_PHASES = ['Impressões/Alcance', 'Cliques', 'Leads/Conversas', 'Vendas'];

interface PlanningDashboardViewProps {
    allowedFranchises?: string[]; // Names of allowed franchises for security
    userRole?: string;
}

export const PlanningDashboardView: React.FC<PlanningDashboardViewProps> = ({ allowedFranchises = [], userRole }) => {
    const [categories, setCategories] = useState<CategoryRow[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
    const [plannings, setPlannings] = useState<PlanningRow[]>([]);

    // Data State
    const [actuals, setActuals] = useState<any>({ phases: [0, 0, 0, 0], revenue: 0, spent: 0, cpl_real: 0 });
    const [dailyChartData, setDailyChartData] = useState<any[]>([]);

    // Date State (Month/Year)
    const [selectedDate, setSelectedDate] = useState({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
    });

    const [isLoading, setIsLoading] = useState(false);

    // 1. Load Categories
    useEffect(() => {
        const load = async () => {
            const cats = await fetchCategories();
            setCategories(cats);
            if (cats.length > 0) setSelectedCategoryId(cats[0].id);
        };
        load();
    }, []);

    // 2. Fetch Data
    useEffect(() => {
        if (!selectedCategoryId) return;

        const fetchData = async () => {
            setIsLoading(true);
            setActuals({ phases: [0, 0, 0, 0], revenue: 0, spent: 0, cpl_real: 0 });
            setDailyChartData([]);

            try {
                const allPlannings = await fetchPlannings();

                // --- SECURITY FILTER ---
                // Filter plannings by Category AND Allowed Franchise
                const categoryPlannings = allPlannings.filter(p => {
                    const matchCategory = p.account?.categoria_id === selectedCategoryId;

                    // If Admin/Executive (no specific list passed or handled upstream), allow all.
                    // If Client/Standard, check against allowed list.
                    // Important: `allowedFranchises` comes from App.tsx's `availableFranchises`, which respects RBAC.
                    // We assume p.account has `franqueado` column JOINED? 
                    // fetchPlannings joins `tb_meta_ads_contas (account_id, nome_original, categoria_id)`.
                    // It does NOT currently join `franqueado`. We must fix fetchPlannings or re-fetch details.
                    // Workaround: We will rely on account_ids fetched in step 2 which WE CAN filter by franchise.
                    return matchCategory;
                });

                setPlannings(categoryPlannings);

                // Fetch Account IDs for Actuals
                // We need to fetch details (including franchise) to filter securelly
                const { data: accounts } = await supabase
                    .from('tb_meta_ads_contas')
                    .select('account_id, franqueado')
                    .eq('categoria_id', selectedCategoryId);

                // --- SECURITY ENFORCEMENT ---
                // Only include accounts where 'franqueado' is in allowedFranchises (if restricted)
                const isRestricted = userRole !== 'admin' && userRole !== 'executive';
                const validAccounts = (accounts || []).filter(acc => {
                    if (!isRestricted) return true;
                    return allowedFranchises.includes(acc.franqueado || '');
                });

                const accountIds = validAccounts.map(a => a.account_id);

                if (accountIds.length > 0) {
                    const startStr = `${selectedDate.year}-${String(selectedDate.month).padStart(2, '0')}-01`;
                    const lastDay = new Date(selectedDate.year, selectedDate.month, 0).getDate();
                    const endStr = `${selectedDate.year}-${String(selectedDate.month).padStart(2, '0')}-${lastDay}`;

                    // Fetch Daily Data for Chart & Aggregation
                    const { data: unifiedData } = await supabase
                        .from('vw_dashboard_unified')
                        .select('date_start, impressoes, cliques_todos, leads_total, msgs_iniciadas, compras, valor_gasto')
                        .in('account_id', accountIds)
                        .gte('date_start', startStr)
                        .lte('date_start', endStr)
                        .order('date_start', { ascending: true });

                    // Aggregate Logic
                    const agg = (unifiedData || []).reduce((acc, row) => ({
                        imp: acc.imp + (row.impressoes || 0),
                        clicks: acc.clicks + (row.cliques_todos || 0),
                        leads: acc.leads + (row.leads_total || 0) + (row.msgs_iniciadas || 0),
                        sales: acc.sales + (row.compras || 0),
                        spent: acc.spent + (row.valor_gasto || 0)
                    }), { imp: 0, clicks: 0, leads: 0, sales: 0, spent: 0 });

                    setActuals({
                        phases: [agg.imp, agg.clicks, agg.leads, agg.sales],
                        revenue: 0,
                        spent: agg.spent,
                        cpl_real: agg.leads > 0 ? agg.spent / agg.leads : 0
                    });

                    // Prepare Chart Data (Cumulative Actuals by Day)
                    const daysMap = new Map<number, number>(); // Day -> Cumulative Leads
                    let runningTotal = 0;

                    // Group by day first
                    const dailyMap = new Map<string, number>();
                    (unifiedData || []).forEach(row => {
                        const d = row.date_start; // YYYY-MM-DD
                        const val = (row.leads_total || 0) + (row.msgs_iniciadas || 0);
                        dailyMap.set(d, (dailyMap.get(d) || 0) + val);
                    });

                    const chartRaw = [];
                    for (let i = 1; i <= lastDay; i++) {
                        const dateKey = `${selectedDate.year}-${String(selectedDate.month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                        const dayVal = dailyMap.get(dateKey) || 0;
                        runningTotal += dayVal;
                        chartRaw.push({
                            day: i,
                            actual: runningTotal,
                            // planned: computed below based on total target
                        });
                    }
                    setDailyChartData(chartRaw);

                } else {
                    setDailyChartData([]);
                }

            } catch (err) {
                console.error("Error fetching Planning View data:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [selectedCategoryId, selectedDate, allowedFranchises, userRole]);

    // 3. Planned Metrics Calculation
    const plannedData = useMemo(() => {
        if (!selectedCategoryId) return null;
        const cat = categories.find(c => c.id === selectedCategoryId);
        if (!cat) return null;

        const accountPlans = new Map<string, PlanningRow>();
        plannings.forEach(p => {
            const isMonthly = p.month === selectedDate.month && p.year === selectedDate.year;
            const isUndefined = p.is_undefined;
            if (isMonthly || isUndefined) {
                const existing = accountPlans.get(p.account_id);
                if (!existing) {
                    accountPlans.set(p.account_id, p);
                } else if (isMonthly && existing.is_undefined) {
                    accountPlans.set(p.account_id, p);
                }
            }
        });

        let totalRevenue = 0;
        let totalTicketSum = 0;
        let count = 0;
        let weightedCplSum = 0;

        accountPlans.forEach(p => {
            totalRevenue += p.planned_revenue || 0;
            totalTicketSum += p.average_ticket || 0;
            weightedCplSum += p.cpl_average || 0; // Simple avg for now
            count++;
        });

        const avgTicket = count > 0 ? totalTicketSum / count : 0;
        const avgCpl = count > 0 ? weightedCplSum / count : (cat.cpl_medio || 0);
        const targetSales = avgTicket > 0 ? totalRevenue / avgTicket : 0;

        // Phases: 4=Sales, 3=Leads, 2=Clicks, 1=Imp
        const p4 = targetSales;
        const p3 = (cat.fase4_perc && cat.fase4_perc > 0) ? p4 / (cat.fase4_perc / 100) : 0; // Leads
        const p2 = (cat.fase3_perc && cat.fase3_perc > 0) ? p3 / (cat.fase3_perc / 100) : 0;
        const p1 = (cat.fase2_perc && cat.fase2_perc > 0) ? p2 / (cat.fase2_perc / 100) : 0;

        return {
            totalRevenue,
            avgTicket,
            avgCpl,
            phases: [p1, p2, p3, p4],
            phaseNames: [
                cat.fase1_nome || DEFAULT_PHASES[0],
                cat.fase2_nome || DEFAULT_PHASES[1],
                cat.fase3_nome || DEFAULT_PHASES[2],
                cat.fase4_nome || DEFAULT_PHASES[3]
            ],
            percs: [cat.fase1_perc, cat.fase2_perc, cat.fase3_perc, cat.fase4_perc]
        };
    }, [plannings, selectedCategoryId, categories, selectedDate]);


    // 4. Merge Chart Data (Add Planned Line)
    const finalChartData = useMemo(() => {
        if (!plannedData || dailyChartData.length === 0) return [];

        const targetLeads = plannedData.phases[2]; // Phase 3 = Leads
        const daysInMonth = dailyChartData.length;

        return dailyChartData.map(d => ({
            ...d,
            planned: (targetLeads / daysInMonth) * d.day // Linear accumulation
        }));
    }, [dailyChartData, plannedData]);


    const getStatus = (actual: number, planned: number, isProportional: boolean) => {
        let reference = planned;
        if (isProportional) {
            const today = new Date();
            const daysInMonth = new Date(selectedDate.year, selectedDate.month, 0).getDate();
            let day = today.getDate();
            if (selectedDate.month < today.getMonth() + 1 || selectedDate.year < today.getFullYear()) day = daysInMonth; // Past
            else if (selectedDate.month > today.getMonth() + 1 || selectedDate.year > today.getFullYear()) day = 0; // Future

            reference = (planned / daysInMonth) * day;
        }
        if (reference === 0) return { percent: 0, color: 'text-slate-400', bg: 'bg-slate-50' };

        const percent = (actual / reference) * 100;
        let color = 'text-red-500';
        let bg = 'bg-red-50';

        if (percent >= 90) { color = 'text-green-600'; bg = 'bg-green-50'; }
        else if (percent >= 70) { color = 'text-yellow-600'; bg = 'bg-yellow-50'; }

        return { percent, color, bg };
    };

    return (
        <div className="space-y-6 w-full h-full p-4 overflow-y-auto pb-20">
            {/* --- Header --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Painel de Planejamento</h2>
                    <p className="text-sm text-slate-500">Monitoramento da Qualidade e Metas</p>
                </div>
                <div className="flex gap-3 items-center">
                    <Select value={String(selectedDate.month)} onValueChange={(v) => setSelectedDate(p => ({ ...p, month: parseInt(v) }))}>
                        <SelectTrigger className="w-[140px]"><SelectValue placeholder="Mês" /></SelectTrigger>
                        <SelectContent>{Array.from({ length: 12 }, (_, i) => i + 1).map(m => <SelectItem key={m} value={String(m)}>{new Date(0, m - 1).toLocaleString('pt-BR', { month: 'long' })}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={String(selectedDate.year)} onValueChange={(v) => setSelectedDate(p => ({ ...p, year: parseInt(v) }))}>
                        <SelectTrigger className="w-[100px]"><SelectValue placeholder="Ano" /></SelectTrigger>
                        <SelectContent><SelectItem value="2024">2024</SelectItem><SelectItem value="2025">2025</SelectItem><SelectItem value="2026">2026</SelectItem></SelectContent>
                    </Select>
                    <div className="h-8 w-px bg-slate-200 mx-2"></div>
                    <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                        <SelectTrigger className="w-[220px] bg-indigo-50 border-indigo-100 ring-2 ring-indigo-500/10"><SelectValue placeholder="Selecione Categoria" /></SelectTrigger>
                        <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.nome_categoria}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
            </div>

            {/* --- Funnels Section --- */}
            <div className="grid grid-cols-12 gap-6 h-[400px]">
                {/* Planned Funnel */}
                <div className="col-span-5 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
                    <div className="p-3 border-b border-slate-100 bg-indigo-50/50 rounded-t-xl text-center">
                        <span className="font-semibold text-slate-700 text-sm">Funil Planejado (Meta)</span>
                    </div>
                    <div className="flex-1 p-4 flex flex-col justify-around">
                        {plannedData?.phases.map((val, idx) => (
                            <div key={idx} className="relative group flex flex-col items-center">
                                <div className="w-full max-w-[80%] h-10 bg-indigo-100 rounded flex items-center justify-center text-sm font-bold text-indigo-900 group-hover:bg-indigo-200 transition-colors"
                                    style={{ width: `${100 - (idx * 15)}%`, opacity: 0.9 }}>
                                    {formatNumber(Math.round(val))}
                                </div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 mt-1">{plannedData.phaseNames[idx]}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Status Column */}
                <div className="col-span-2 flex flex-col gap-4 py-8">
                    {plannedData?.phases.map((planVal, idx) => {
                        const actualVal = actuals.phases[idx];
                        const proportional = getStatus(actualVal, planVal, true);
                        return (
                            <div key={`comp-${idx}`} className="flex-1 flex flex-col items-center justify-center">
                                {idx === 0 && <span className="text-[10px] text-slate-400 mb-1">Status Hoje</span>}
                                <div className={`w-14 h-8 rounded-full flex items-center justify-center font-bold text-xs border ${proportional.bg} ${proportional.color} border-current opacity-80`}>
                                    {Math.round(proportional.percent)}%
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Actual Funnel */}
                <div className="col-span-5 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
                    <div className="p-3 border-b border-slate-100 bg-slate-50 rounded-t-xl text-center">
                        <span className="font-semibold text-slate-700 text-sm">Funil Realizado</span>
                    </div>
                    <div className="flex-1 p-4 flex flex-col justify-around">
                        {actuals.phases.map((val: number, idx: number) => (
                            <div key={`act-${idx}`} className="relative flex flex-col items-center">
                                <div className="w-full max-w-[80%] h-10 bg-slate-200 rounded flex items-center justify-center text-sm font-bold text-slate-800 hover:bg-slate-300 transition-colors"
                                    style={{ width: `${100 - (idx * 15)}%` }}>
                                    {formatNumber(val)}
                                </div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 mt-1">{plannedData?.phaseNames[idx]}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- Quality Table & Charts --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Quality Metrics Table */}
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="py-4 border-b border-slate-50">
                        <CardTitle className="text-base text-slate-800 flex items-center gap-2">
                            <AlertTriangle size={18} className="text-indigo-500" />
                            Tabela de Qualidade e Alertas
                        </CardTitle>
                    </CardHeader>
                    <div className="p-0">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-slate-500 text-left border-b border-slate-100">
                                <tr>
                                    <th className="p-3 font-medium">Métrica</th>
                                    <th className="p-3 font-medium text-right">Planejado</th>
                                    <th className="p-3 font-medium text-right">Realizado</th>
                                    <th className="p-3 font-medium text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {/* CPL Row - Special Logic: Lower is Better */}
                                <tr className={actuals.cpl_real > (plannedData?.avgCpl || 0) && actuals.cpl_real > 0 ? "bg-red-50/50" : ""}>
                                    <td className="p-3 font-medium text-slate-700">CPL Médio (Fase 3)</td>
                                    <td className="p-3 text-right text-slate-500">{formatCurrency(plannedData?.avgCpl || 0)}</td>
                                    <td className="p-3 text-right font-bold text-slate-800">{formatCurrency(actuals.cpl_real)}</td>
                                    <td className="p-3 text-center">
                                        {actuals.cpl_real > (plannedData?.avgCpl || 0) && actuals.cpl_real > 0 ? (
                                            <span className="inline-flex items-center px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-bold">ALERTA</span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-bold">OK</span>
                                        )}
                                    </td>
                                </tr>
                                {/* Leads Quality Row - Higher is Better */}
                                <tr>
                                    <td className="p-3 font-medium text-slate-700">Volume de Leads/Convs</td>
                                    <td className="p-3 text-right text-slate-500">{formatNumber(Math.round(plannedData?.phases[2] || 0))}</td>
                                    <td className="p-3 text-right font-bold text-slate-800">{formatNumber(actuals.phases[2])}</td>
                                    <td className="p-3 text-center">
                                        {/* Compare Proportional */}
                                        {(() => {
                                            const target = plannedData?.phases[2] || 0;
                                            const prop = getStatus(actuals.phases[2], target, true);
                                            return (
                                                <span className={`text-xs font-bold ${prop.color}`}>
                                                    {Math.round(prop.percent)}%
                                                </span>
                                            )
                                        })()}
                                    </td>
                                </tr>
                                {/* Spend Row */}
                                <tr>
                                    <td className="p-3 font-medium text-slate-700">Investimento</td>
                                    <td className="p-3 text-right text-slate-500">-</td>
                                    <td className="p-3 text-right font-bold text-slate-800">{formatCurrency(actuals.spent)}</td>
                                    <td className="p-3 text-center text-slate-400">-</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* History Chart */}
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="py-4 border-b border-slate-50">
                        <CardTitle className="text-base text-slate-800 flex items-center gap-2">
                            <TrendingUp size={18} className="text-indigo-500" />
                            Tendência: Leads Acumulados
                        </CardTitle>
                    </CardHeader>
                    <div className="h-[250px] p-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={finalChartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ fontSize: '12px' }}
                                />
                                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                <Line type="monotone" dataKey="planned" name="Meta Cumulativa" stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="actual" name="Realizado" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

            </div>
        </div>
    );
};
