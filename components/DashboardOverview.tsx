import React, { useMemo } from 'react';
import { 
  DollarSign, 
  Users, 
  MousePointerClick, 
  Radio, 
  TrendingUp,
  ArrowRight
} from 'lucide-react';
import { 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend
} from 'recharts';
import { CampaignData } from '../types';

interface DashboardOverviewProps {
  data: CampaignData[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('pt-BR').format(Math.round(value));
};

const formatPercent = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value / 100);
};

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ data }) => {
  
  // 1. Aggregations
  const metrics = useMemo(() => {
    let totalSpend = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalReach = 0;
    let totalLeads = 0; // msgs_iniciadas + compras

    // Daily logic for chart
    const dailyMap = new Map<string, { date: string; spend: number; leads: number }>();

    data.forEach(item => {
        // Safety Check
        const spend = Number(item.valor_gasto) || 0;
        const imps = Number(item.impressoes) || 0;
        const clicks = Number(item.cliques_todos) || 0;
        const reach = Number(item.alcance) || 0;
        const msgs = Number(item.msgs_iniciadas) || 0;
        const compras = Number(item.compras) || 0;
        
        // Custom Lead Definition
        const itemLeads = msgs + compras;

        totalSpend += spend;
        totalImpressions += imps;
        totalClicks += clicks;
        totalReach += reach; // Simple sum as requested (deduping needs raw)
        totalLeads += itemLeads;

        // Chart Data Aggregation
        if (item.date_start) {
            const current = dailyMap.get(item.date_start) || { 
                date: item.date_start, 
                spend: 0, 
                leads: 0 
            };
            current.spend += spend;
            current.leads += itemLeads;
            dailyMap.set(item.date_start, current);
        }
    });

    const calculatedCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const cpl = totalLeads > 0 ? totalSpend / totalLeads : 0;

    // Sort Chart Data
    const chartData = Array.from(dailyMap.values()).sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
    ).map(d => ({
        ...d,
        formattedDate: new Date(d.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    }));

    return {
        totalSpend,
        totalLeads,
        totalImpressions,
        totalClicks,
        totalReach,
        calculatedCtr,
        cpl,
        chartData
    };
  }, [data]);

  // Funnel Data
  const funnelData = [
      { label: 'Impressões', value: metrics.totalImpressions, color: 'bg-indigo-100 text-indigo-700' },
      { label: 'Alcance', value: metrics.totalReach, color: 'bg-blue-100 text-blue-700' }, // Optional step
      { label: 'Cliques', value: metrics.totalClicks, color: 'bg-purple-100 text-purple-700' },
      { label: 'Leads (Msgs + Vendas)', value: metrics.totalLeads, color: 'bg-emerald-100 text-emerald-700' }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
        
        {/* HEADER */}
        <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp className="text-indigo-600" />
                Visão Executiva
            </h2>
            <p className="text-slate-500 text-sm">Resumo consolidado de performance e eficiência.</p>
        </div>

        {/* 1. KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
                title="Investimento Total" 
                value={formatCurrency(metrics.totalSpend)}
                icon={DollarSign}
                iconColor="text-green-600"
                bgIcon="bg-green-100"
            />
            <StatCard 
                title="Leads Gerados" 
                value={formatNumber(metrics.totalLeads)}
                subtext={`CPL Médio: ${formatCurrency(metrics.cpl)}`}
                icon={Users}
                iconColor="text-blue-600"
                bgIcon="bg-blue-100"
            />
            <StatCard 
                title="Taxa de Clique (CTR)" 
                value={formatPercent(metrics.calculatedCtr)}
                subtext="Média Ponderada"
                icon={MousePointerClick}
                iconColor="text-purple-600"
                bgIcon="bg-purple-100"
            />
            <StatCard 
                title="Alcance Total" 
                value={formatNumber(metrics.totalReach)}
                icon={Radio}
                iconColor="text-orange-600"
                bgIcon="bg-orange-100"
            />
        </div>

        {/* 2. MAIN TREND CHART & FUNNEL LAYOUT */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* CHART */}
            <div className="xl:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Tendência de Investimento vs. Resultados</h3>
                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={metrics.chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis 
                                dataKey="formattedDate" 
                                tick={{fontSize: 12, fill: '#64748b'}} 
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis 
                                yAxisId="left"
                                tick={{fontSize: 12, fill: '#64748b'}} 
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `R$${value/1000}k`}
                            />
                            <YAxis 
                                yAxisId="right"
                                orientation="right"
                                tick={{fontSize: 12, fill: '#64748b'}} 
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                formatter={(value: number, name: string) => [
                                    name === 'Investimento' ? formatCurrency(value) : value,
                                    name
                                ]}
                            />
                            <Legend />
                            <Bar 
                                yAxisId="left"
                                dataKey="spend" 
                                name="Investimento" 
                                fill="#6366f1" 
                                radius={[4, 4, 0, 0]}
                                barSize={20}
                            />
                            <Line 
                                yAxisId="right"
                                type="monotone" 
                                dataKey="leads" 
                                name="Leads" 
                                stroke="#10b981" 
                                strokeWidth={3}
                                dot={{r: 4, fill: '#10b981', strokeWidth: 2, stroke:'#fff'}}
                                activeDot={{r: 6}}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 3. MACRO FUNNEL */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Funil de Conversão Macro</h3>
                <div className="flex-1 flex flex-col justify-center gap-4">
                    {funnelData.map((step, index) => {
                        const prevStep = funnelData[index - 1];
                        const conversion = prevStep && prevStep.value > 0 
                            ? (step.value / prevStep.value) * 100 
                            : null;

                        return (
                            <div key={step.label} className="relative">
                                {/* Conversion Badge (between steps) */}
                                {conversion !== null && (
                                     <div className="absolute -top-3 right-0 lg:right-4 z-10">
                                        <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200 flex items-center gap-1">
                                            <ArrowRight size={10} />
                                            {conversion.toFixed(1)}%
                                        </span>
                                     </div>
                                )}

                                <div className={`p-4 rounded-xl ${step.color} bg-opacity-10 border border-slate-100 relative group transition-all hover:scale-[1.02]`}>
                                    <div className="flex justify-between items-center relative z-10">
                                        <span className="text-xs font-bold uppercase tracking-wider opacity-70">{step.label}</span>
                                        <span className="text-lg font-bold">{formatNumber(step.value)}</span>
                                    </div>
                                    {/* Visual Bar Background customized per step if needed, or stick to simple cards */}
                                </div>
                                
                                {/* Connector Line */}
                                {index < funnelData.length - 1 && (
                                    <div className="h-4 w-0.5 bg-slate-200 mx-auto my-1"></div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

        </div>

        {/* Footer Note */}
        <div className="text-center text-xs text-slate-400">
            * Leads contabilizados como soma de Conversas Iniciadas e Compras confirmadas.
        </div>
    </div>
  );
};

// Sub-component: StatCard
const StatCard = ({ title, value, subtext, icon: Icon, iconColor, bgIcon }: any) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start justify-between hover:shadow-md transition-all">
        <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wide mb-1">{title}</p>
            <h4 className="text-2xl font-black text-slate-900">{value}</h4>
            {subtext && <p className="text-slate-400 text-xs mt-1 font-medium">{subtext}</p>}
        </div>
        <div className={`p-3 rounded-xl ${bgIcon}`}>
            <Icon className={iconColor} size={20} />
        </div>
    </div>
);
