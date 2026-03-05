import React from 'react';
import { useDashboardMetrics } from '../../hooks/useDashboardMetrics';
import { useAvailableBalance } from '../../hooks/useAvailableBalance';
import { Eye, Route, MousePointer2, Wallet, Loader2 } from 'lucide-react';
import { Funnel3DWidget } from '../../components/Funnel3DWidget';
import { WeeklyTrendsWidget } from '../../components/WeeklyTrendsWidget';
import { ObjectivesPerformanceWidget } from '../../components/ObjectivesPerformanceWidget';
import { TopCreativesWidget } from '../../components/TopCreativesWidget';
import { KPISection } from '@/src/widgets/KPISection';
import { useFilters } from '@/src/features/filters/model/useFilters';
const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const formatNumber = (val: number) => new Intl.NumberFormat('pt-BR').format(val);

interface ManagerialViewProps {
    dateRange: any;
    accountIds: string[];
}

export const ManagerialView: React.FC<ManagerialViewProps> = ({ dateRange, accountIds }) => {
    const { selectedPlatform } = useFilters();
    // Balance (Date Independent)
    const { balance: totalBalance, loading: balanceLoading } = useAvailableBalance(accountIds);

    // Remaining Local Metrics (for widgets that need specific backend processing not in useFinanceData yet)
    const { metrics, loading: metricsLoading, error } = useDashboardMetrics({
        startDate: dateRange.start,
        endDate: dateRange.end,
        accountFilter: accountIds,
        platform: selectedPlatform
    });

    const isLoading = balanceLoading || metricsLoading;

    if (isLoading && !metrics) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (error) {
        return <div className="p-4 text-red-500 bg-red-50 rounded-lg">Erro ao carregar métricas adicionais: {error}</div>;
    }

    const m = metrics || {
        investment: 0, purchases: 0, leads: 0, cpl: 0, impressions: 0, reach: 0, linkClicks: 0,
        funnel: { impressions: 0, reach: 0, clicks: 0, leads: 0 },
        weeklySeries: [], topObjectives: [], topCreatives: []
    };

    const secondaryMetrics = [
        { label: 'Impressões', value: formatNumber(m.impressions), icon: <Eye size={14} /> },
        { label: 'Alcance', value: formatNumber(m.reach), icon: <Route size={14} /> },
        { label: 'Cliques no Link', value: formatNumber(m.linkClicks), icon: <MousePointer2 size={14} /> },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">

            {/* Cards Row - Saldo + FSD KPI Section */}
            <div className="flex flex-col gap-6">
                <div className="bg-white rounded-3xl p-5 shadow-lg border border-slate-100 flex items-center justify-between w-full md:w-80">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-emerald-600 shadow-lg shadow-emerald-500/20 flex items-center justify-center shrink-0">
                            <Wallet size={24} className="text-white" />
                        </div>
                        <div>
                            <span className="text-slate-500 font-bold text-sm uppercase tracking-wide">Saldo Disponível</span>
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight">{formatCurrency(totalBalance)}</h3>
                        </div>
                    </div>
                </div>

                {/* FSD KPI Widgets - Reads its own data via useFinanceData */}
                <KPISection />
            </div>

            {/* Secondary Metrics Row */}
            <div className="flex flex-wrap gap-4 items-center justify-center md:justify-start px-2">
                {secondaryMetrics.map((met, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm text-sm text-slate-600 font-medium tracking-tight">
                        <span className="text-slate-400">{met.icon}</span>
                        {met.label}: <span className="text-slate-900 font-bold">{met.value}</span>
                    </div>
                ))}
            </div>

            {/* Objectives & Top Creatives Widget */}
            <section className="space-y-8">
                <div className="w-full">
                    <ObjectivesPerformanceWidget ads={[]} topObjectives={m.topObjectives} />
                </div>
                <div className="w-full">
                    <TopCreativesWidget data={[]} topCreatives={m.topCreatives} />
                </div>
            </section>

            {/* Charts Row (Funnel + Weekly Trends) */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-auto lg:h-[450px]">

                {/* Widget 1: Funnel */}
                <Funnel3DWidget
                    investment={m.investment}
                    reach={m.reach}
                    impressions={m.impressions}
                    clicks={m.linkClicks}
                    leads={m.leads}
                />

                {/* Widget 2: Weekly Trends */}
                <WeeklyTrendsWidget data={m.weeklySeries.map(s => ({
                    day: s.date,
                    spend: s.investment,
                    leads: s.leads
                }))} />

            </section>
        </div>
    );
};

export default ManagerialView;