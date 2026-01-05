import React from 'react';
import { DollarSign, Users, Target, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { KPIAggregates } from '../types';

interface Props {
  data: KPIAggregates;
}

export const KPISection: React.FC<Props> = ({ data }) => {
  const cards = [
    {
      label: 'Investimento Total',
      value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.totalSpend),
      icon: <DollarSign size={24} />,
      trend: '+12.5%',
      trendUp: true,
      color: 'indigo',
    },
    {
      label: 'Total de Leads',
      value: data.totalLeads.toLocaleString('pt-BR'),
      icon: <Users size={24} />,
      trend: '+8.2%',
      trendUp: true,
      color: 'orange',
    },
    {
      label: 'Custo por Lead (CPL)',
      value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.cpl),
      icon: <Target size={24} />,
      trend: '-2.4%',
      trendUp: true, // Lower CPL is good, so we color it "good"
      color: 'emerald',
    },
    {
      label: 'ROAS',
      value: `${data.roas.toFixed(2)}x`,
      icon: <TrendingUp size={24} />,
      trend: '+4.1%',
      trendUp: true,
      color: 'blue',
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      {cards.map((card, idx) => (
        <div 
          key={idx} 
          className="group relative bg-white rounded-3xl p-6 shadow-xl shadow-indigo-500/5 hover:shadow-indigo-500/10 border border-slate-100 transition-all duration-300 hover:-translate-y-1"
        >
          <div className="flex justify-between items-start mb-4">
            <div className={`
              p-3 rounded-2xl
              ${card.color === 'indigo' ? 'bg-indigo-50 text-indigo-600' : ''}
              ${card.color === 'orange' ? 'bg-orange-50 text-orange-600' : ''}
              ${card.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' : ''}
              ${card.color === 'blue' ? 'bg-blue-50 text-blue-600' : ''}
            `}>
              {card.icon}
            </div>
            <div className={`
              flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full
              ${card.trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}
            `}>
              {card.trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {card.trend}
            </div>
          </div>
          
          <div className="space-y-1">
            <p className="text-slate-500 text-sm font-medium">{card.label}</p>
            <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{card.value}</h3>
          </div>

          {/* Decorative background blob */}
          <div className={`
            absolute -bottom-4 -right-4 w-24 h-24 rounded-full opacity-5 blur-2xl transition-all group-hover:opacity-10
            ${card.color === 'indigo' ? 'bg-indigo-600' : ''}
            ${card.color === 'orange' ? 'bg-orange-600' : ''}
            ${card.color === 'emerald' ? 'bg-emerald-600' : ''}
            ${card.color === 'blue' ? 'bg-blue-600' : ''}
          `} />
        </div>
      ))}
    </div>
  );
};