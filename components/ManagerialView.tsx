import React, { useMemo, useEffect, useState } from 'react';
import { CampaignData } from '../types';
import { fetchMetaAccounts } from '../services/supabaseService';
import { DollarSign, MessageCircle, Users, Target, ArrowRight, TrendingUp, TrendingDown, Eye, Route, MousePointer2, Wallet } from 'lucide-react';
import { Funnel3DWidget } from './Funnel3DWidget';
import { WeeklyTrendsWidget } from './WeeklyTrendsWidget';


import { ObjectivesPerformanceWidget } from './ObjectivesPerformanceWidget';
import { TopCreativesWidget } from './TopCreativesWidget';



interface KPIData {
    current_spend: number; current_leads: number; current_sales: number; current_impressions: number; current_clicks: number; current_reach: number;
    prev_spend: number; prev_leads: number; prev_sales: number; prev_impressions: number; prev_clicks: number; prev_reach: number;
}

interface Props {
  data: CampaignData[];
  comparisonData?: CampaignData[];
  kpiData?: KPIData | null;
  selectedFranchisee: string;
  selectedClient: string;
  externalTotalBalance?: number;
}

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const formatNumber = (val: number) => new Intl.NumberFormat('pt-BR').format(val);

export const ManagerialView: React.FC<Props> = ({ data, comparisonData = [], kpiData, selectedFranchisee, selectedClient, externalTotalBalance }) => {
  const [totalBalance, setTotalBalance] = useState<number>(0);

  // Update internal balance if external is provided
  useEffect(() => {
      if (typeof externalTotalBalance === 'number') {
          setTotalBalance(externalTotalBalance);
      }
  }, [externalTotalBalance]);

  // Fetch and Filter Balance Data (Date Range Independent)
  useEffect(() => {
     // Skip internal load if external data is provided
     if (typeof externalTotalBalance === 'number') return;

     // RBAC: Require account selection - no balance without specific account
     if (!selectedClient) {
       setTotalBalance(0);
       return;
     }

     let mounted = true;
     const loadBalance = async () => {
        try {
            const allAccounts = await fetchMetaAccounts();
            
            const filteredBalance = allAccounts
                .filter(acc => {
                    const matchFranchise = !selectedFranchisee || acc.franchise_id === selectedFranchisee;
                    // Check against both account_name and display_name for robustness
                    const matchClient = !selectedClient || (acc.account_name === selectedClient || acc.display_name === selectedClient);
                    return matchFranchise && matchClient;
                })
                .reduce((sum, acc) => sum + (acc.current_balance || 0), 0);
            
            if (mounted) setTotalBalance(filteredBalance);

        } catch (err) {
            console.error("Failed to load balance", err);
        }
     };

     loadBalance();
     return () => { mounted = false; };
  }, [selectedFranchisee, selectedClient, externalTotalBalance]);
  
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
  // Logic: Use RPC kpiData if available (Backend Source of Truth), otherwise fallback to frontend calc (legacy/charts)
  const kpis = useMemo(() => {
    // Helper for deltas
    const getDelta = (curr: number, past: number) => {
        if (past === 0) return 0;
        return ((curr - past) / past) * 100;
    };

    // 1. IF RPC DATA IS AVAILABLE -> USE IT (Fast & Accurate)
    // BUT Override Leads with client-side calculation to match Table/Grid view which uses 'msgs_iniciadas'
    if (kpiData) {
         // Force Calc Leads from Data Prop (Source of Truth for Table)
         const calculatedLeads = data.reduce((sum, d) => sum + (d.msgs_iniciadas || 0), 0);
         const calculatedPrevLeads = comparisonData.reduce((sum, d) => sum + (d.msgs_iniciadas || 0), 0);

         // Calculate Derived Metrics with NEW Leads value
         const cpl = calculatedLeads > 0 ? kpiData.current_spend / calculatedLeads : 0;
         const prevCpl = calculatedPrevLeads > 0 ? kpiData.prev_spend / calculatedPrevLeads : 0;
         
         const current = {
             totalSpend: kpiData.current_spend,
             totalLeads: calculatedLeads, // OVERRIDE
             totalPurchases: kpiData.current_sales,
             totalImpressions: kpiData.current_impressions,
             totalClicks: kpiData.current_clicks,
             totalAlcance: kpiData.current_reach,
             cpl
         };
         
         const prev = {
             totalSpend: kpiData.prev_spend,
             totalLeads: calculatedPrevLeads, // OVERRIDE
             totalPurchases: kpiData.prev_sales, 
             cpl: prevCpl
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
    }

    // 2. FALLBACK: Frontend Calculation (Original Logic)
    const calc = (dataset: CampaignData[]) => {
      let totalSpend = 0;
      let totalImpressions = 0;
      let totalClicks = 0;
      let totalLeads = 0; 
      let totalPurchases = 0; 
      let totalAlcance = 0;

      dataset.forEach(d => {
        totalSpend += d.valor_gasto;
        totalImpressions += d.impressoes;
        totalClicks += d.cliques_todos;
        totalLeads += d.msgs_iniciadas || 0; 
        totalPurchases += d.compras || 0;
        totalAlcance += d.alcance || 0;
      });

      const cpl = totalLeads > 0 ? totalSpend / totalLeads : 0;
      return { totalSpend, totalLeads, totalPurchases, cpl, totalImpressions, totalClicks, totalAlcance };
    };

    const current = calc(data);
    const prev = calc(comparisonData);

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
  }, [data, comparisonData, kpiData]);

  const cards = [
    {
        title: 'Saldo Disponível',
        icon: <Wallet size={20} className="text-white" />,
        color: 'bg-emerald-600',
        value: formatCurrency(totalBalance),
        prevLabel: '---',
        prevValue: '---',
        delta: 0,
        inverseTrend: false,
        goalProgress: 100
    },
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
        {cards.map((card) => {
             const isPositive = card.delta >= 0;
             const isGood = card.inverseTrend ? !isPositive : isPositive;
             const trendColor = isGood ? 'text-emerald-600' : 'text-red-500';
             const TrendIcon = isPositive ? TrendingUp : TrendingDown;
             const showTrend = card.delta !== 0 && card.prevValue !== '---';

             return (
                <div key={card.title} className="bg-white rounded-3xl p-5 shadow-lg shadow-indigo-500/5 border border-slate-100 flex flex-col justify-between hover:scale-[1.02] transition-transform duration-300">
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

                        <div className="flex flex-col text-xs mb-3 bg-slate-50 p-2 rounded-lg">
                             <span className="text-slate-400 font-medium mb-1">{card.prevLabel}</span>
                             <div className="flex items-center gap-2">
                                <span className="text-slate-600 font-bold">{card.prevValue}</span>
                                {showTrend && (
                                    <div className={`flex items-center gap-0.5 font-bold ${trendColor} text-[10px]`}>
                                        <TrendIcon size={12} />
                                        {Math.abs(card.delta).toFixed(1)}%
                                    </div>
                                )}
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

      {/* New Objectives & Top Creatives Widget */}
      <section className="space-y-8">
        <div className="w-full">
            <ObjectivesPerformanceWidget ads={data} />
        </div>
        <div className="w-full">
            <TopCreativesWidget data={data} />
        </div>
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



      {/* 4. Geography & Age Analysis (Section C) */}




    </div>
  );
};

export default ManagerialView;