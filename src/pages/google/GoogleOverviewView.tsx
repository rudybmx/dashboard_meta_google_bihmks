import React from 'react';
import { BarChart2, TrendingUp, MousePointerClick, DollarSign, Eye, Target } from 'lucide-react';

export const GoogleOverviewView: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Visão Geral — Google Ads</h2>
        <p className="text-slate-500 text-sm mt-1">Resumo consolidado de performance das campanhas Google.</p>
      </div>

      {/* KPI Cards placeholder */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: 'Investimento', icon: DollarSign, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Cliques', icon: MousePointerClick, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Impressões', icon: Eye, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Conversões', icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'CTR', icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'CPC Médio', icon: BarChart2, color: 'text-rose-600', bg: 'bg-rose-50' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-3">
            <div className={`w-9 h-9 rounded-lg ${kpi.bg} flex items-center justify-center`}>
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{kpi.label}</p>
              <div className="h-6 w-20 bg-slate-100 rounded animate-pulse mt-1" />
            </div>
          </div>
        ))}
      </div>

      {/* Chart placeholder */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <p className="text-sm font-semibold text-slate-700 mb-4">Investimento vs Conversões — últimos 30 dias</p>
        <div className="h-48 bg-slate-50 rounded-lg flex items-center justify-center border border-dashed border-slate-200">
          <p className="text-sm text-slate-400">Gráfico em desenvolvimento</p>
        </div>
      </div>

      {/* Table placeholder */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <p className="text-sm font-semibold text-slate-700 mb-4">Top Campanhas</p>
        <div className="h-40 bg-slate-50 rounded-lg flex items-center justify-center border border-dashed border-slate-200">
          <p className="text-sm text-slate-400">Tabela em desenvolvimento</p>
        </div>
      </div>
    </div>
  );
};

export default GoogleOverviewView;
