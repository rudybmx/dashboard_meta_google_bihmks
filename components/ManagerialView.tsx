import React, { useMemo } from 'react';
import { CampaignData } from '../types';
import { DollarSign, MessageCircle, Users, Target, ArrowRight, TrendingUp, TrendingDown, Eye, Route, MousePointer2 } from 'lucide-react';
import { Funnel3DWidget } from './Funnel3DWidget';
import { WeeklyTrendsWidget } from './WeeklyTrendsWidget';
import { CreativeCarousel } from './CreativeCarousel';
import { GeoMapWidget } from './GeoMapWidget';
import { AgeChartWidget } from './AgeChartWidget';
import { ObjectivesPerformanceWidget } from './ObjectivesPerformanceWidget';

import { CampaignsTable } from './CampaignsTable';

interface Props {
  data: CampaignData[];
  comparisonData?: CampaignData[];
}

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const formatNumber = (val: number) => new Intl.NumberFormat('pt-BR').format(val);

export const ManagerialView: React.FC<Props> = ({ data, comparisonData = [] }) => {
  
  // Aggregate Weekly Data
  const weeklyData = useMemo(() => {
    const daysMap = new Map<string, { spend: number, leads: number, order: number }>();
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    // Initialize map to ensure all days exist (optional, or just map existing)
    // For sorting, we rely on standard JS Date.getDay()
    
    data.forEach(d => {
        const date = new Date(d.date_start + 'T12:00:00');
        const dayIndex = date.getDay();
        const dayName = dayNames[dayIndex];
        
        const current = daysMap.get(dayName) || { spend: 0, leads: 0, order: dayIndex };
        
        daysMap.set(dayName, {
            spend: current.spend + d.valor_gasto,
            leads: current.leads + (d.msgs_iniciadas || 0), // Consistent with "Leads" definition
            order: dayIndex
        });
    });

    return Array.from(daysMap.values())
        .sort((a, b) => a.order - b.order)
        .map(item => ({
            day: dayNames[item.order],
            spend: item.spend,
            leads: item.leads
        }));
  }, [data]);

  
  // Calculate KPIS (Current vs Previous)
  const kpis = useMemo(() => {
    const calc = (dataset: CampaignData[]) => {
      let totalSpend = 0;
      let totalImpressions = 0;
      let totalClicks = 0;
      let totalLeads = 0; // Now represents msgs_iniciadas
      let totalPurchases = 0; // New metric
      let totalAlcance = 0;

      dataset.forEach(d => {
        totalSpend += d.valor_gasto;
        totalImpressions += d.impressoes;
        totalClicks += d.cliques_todos;
        totalLeads += d.msgs_iniciadas || 0; // Leads is now based on msgs_iniciadas
        totalPurchases += d.compras || 0;
        totalAlcance += d.alcance || 0;
      });

      const cpl = totalLeads > 0 ? totalSpend / totalLeads : 0;
      const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

      return { totalSpend, totalLeads, totalPurchases, cpl, totalImpressions, totalClicks, totalAlcance };
    };

    const current = calc(data);
    const prev = calc(comparisonData);

    const getDelta = (curr: number, past: number) => {
        if (past === 0) return 0;
        return ((curr - past) / past) * 100;
    };

    return {
      current,
      prev,
      deltas: {
        spend: getDelta(current.totalSpend, prev.totalSpend),
        purchases: getDelta(current.totalPurchases, prev.totalPurchases),
        leads: getDelta(current.totalLeads, prev.totalLeads),
        cpl: getDelta(current.cpl, prev.cpl)
      }
    };
  }, [data, comparisonData]);

  const cards = [
    {
      title: 'Investimento',
      icon: <DollarSign size={20} className="text-white" />,
      color: 'bg-indigo-600',
      value: formatCurrency(kpis.current.totalSpend),
      prevLabel: 'Mês anterior',
      prevValue: formatCurrency(kpis.prev.totalSpend),
      delta: kpis.deltas.spend,
      inverseTrend: false, 
      goalProgress: 75 
    },
    {
      title: 'Compras',
      icon: <Target size={20} className="text-white" />, // Changed Icon to Target or similar
      color: 'bg-blue-500',
      value: formatNumber(kpis.current.totalPurchases),
      prevLabel: 'Mês anterior',
      prevValue: formatNumber(kpis.prev.totalPurchases),
      delta: kpis.deltas.purchases,
      inverseTrend: false,
      goalProgress: 60 
    },
    {
      title: 'Leads (Msgs)',
      icon: <MessageCircle size={20} className="text-white" />, // Changed Icon to MessageCircle reflecting definition
      color: 'bg-orange-500',
      value: formatNumber(kpis.current.totalLeads),
      prevLabel: 'Mês anterior',
      prevValue: formatNumber(kpis.prev.totalLeads),
      delta: kpis.deltas.leads,
      inverseTrend: false,
      goalProgress: 45 
    },
    {
      title: 'CPL (Médio)',
      icon: <Users size={20} className="text-white" />, // Icon change maybe? Keeping Users or Target
      color: 'bg-emerald-500',
      value: formatCurrency(kpis.current.cpl),
      prevLabel: 'Mês anterior',
      prevValue: formatCurrency(kpis.prev.cpl),
      delta: kpis.deltas.cpl,
      inverseTrend: true, 
      goalProgress: 90 
    }
  ];

  const secondaryMetrics = [
      { label: 'Impressões', value: formatNumber(kpis.current.totalImpressions), icon: <Eye size={14}/> },
      { label: 'Alcance', value: formatNumber(kpis.current.totalAlcance), icon: <Route size={14}/> }, // Updated with real data
      { label: 'Cliques no Link', value: formatNumber(kpis.current.totalClicks), icon: <MousePointer2 size={14}/> },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* 1. New Managerial Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards.map((card, idx) => {
             const isPositive = card.delta >= 0;
             const isGood = card.inverseTrend ? !isPositive : isPositive;
             const trendColor = isGood ? 'text-emerald-600' : 'text-red-500';
             const TrendIcon = isPositive ? TrendingUp : TrendingDown;

             return (
                <div key={idx} className="bg-white rounded-3xl p-5 shadow-lg shadow-indigo-500/5 border border-slate-100 flex flex-col justify-between hover:scale-[1.02] transition-transform duration-300">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`h-10 w-10 rounded-xl ${card.color} shadow-lg shadow-indigo-500/20 flex items-center justify-center shrink-0`}>
                                {card.icon}
                            </div>
                            <span className="text-slate-500 font-bold text-sm uppercase tracking-wide">{card.title}</span>
                        </div>
                        
                        <div className="mb-4">
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-1">{card.value}</h3>
                        </div>

                        <div className="flex items-center justify-between text-xs mb-3 bg-slate-50 p-2 rounded-lg">
                             <div className="flex flex-col">
                                <span className="text-slate-400 font-medium mb-0.5">{card.prevLabel}</span>
                                <span className="text-slate-600 font-bold">{card.prevValue}</span>
                             </div>
                             <div className={`flex items-center gap-1 font-bold ${trendColor} bg-white px-2 py-1 rounded-md shadow-sm`}>
                                <TrendIcon size={14} />
                                {Math.abs(card.delta).toFixed(1)}%
                             </div>
                        </div>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-50">
                        <div className="flex justify-between text-[10px] font-semibold text-slate-400">
                            <span>Planejado do Mês</span>
                            <span>{card.goalProgress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div 
                                className={`h-full rounded-full ${card.color} opacity-80`} 
                                style={{ width: `${card.goalProgress}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
             );
        })}
        
        {/* Saldo em Conta Placeholder */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-5 shadow-xl shadow-slate-900/20 text-white flex flex-col justify-between hover:scale-[1.02] transition-transform duration-300 relative overflow-hidden group">
            <div className="absolute top-0 right-0 -mt-2 -mr-2 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
            
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
                        <DollarSign size={20} className="text-emerald-400" />
                    </div>
                    <span className="text-slate-300 font-bold text-sm uppercase tracking-wide">Saldo em Conta</span>
                </div>
                <h3 className="text-2xl font-black text-white tracking-tight mb-1">R$ ---</h3>
                <p className="text-xs text-slate-400">Integração em breve</p>
            </div>
            
            <div className="relative z-10 mt-4 pt-4 border-t border-white/10">
                <button className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
                    Configurar <ArrowRight size={14} />
                </button>
            </div>
        </div>
      </div>

      {/* Secondary Metrics Row */}
      <div className="flex flex-wrap gap-4 items-center justify-center md:justify-start px-2">
         {secondaryMetrics.map((met, idx) => (
             <div key={idx} className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm text-sm text-slate-600 font-medium hover:border-indigo-200 transition-colors">
                 <span className="text-slate-400">{met.icon}</span>
                 {met.label}: <span className="text-slate-900 font-bold">{met.value}</span>
             </div>
         ))}
      </div>

      {/* New Objectives Widget */}
      <section>
        <ObjectivesPerformanceWidget ads={data} />
      </section>

      {/* 2. Charts Row (Funnel + Weekly Trends) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-auto lg:h-[450px]">
        
        {/* Widget 1: Funnel */}
        <Funnel3DWidget 
            investment={kpis.current.totalSpend}
            reach={kpis.current.totalAlcance}
            impressions={kpis.current.totalImpressions}
            clicks={kpis.current.totalClicks}
            leads={kpis.current.totalLeads}
        />

        {/* Widget 2: Weekly Trends */}
        <WeeklyTrendsWidget data={weeklyData} />

      </section>

      {/* 3. Creative Matrix Carousel (Section B) */}
      <section>
        <CreativeCarousel ads={data} />
      </section>

      {/* 4. Geography & Age Analysis (Section C) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-auto">
        <GeoMapWidget ads={data} />
        <AgeChartWidget ads={data} />
      </section>

      {/* 5. Analytical Table (Section D) */}
      <section>
         <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">Detalhamento de Campanhas</h3>
        </div>
        <CampaignsTable data={data} />
      </section>

    </div>
  );
};