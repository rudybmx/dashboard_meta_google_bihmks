import React, { useMemo } from 'react';
import { CampaignData } from '../types';
import { DollarSign, Users, Target, MousePointer2 } from 'lucide-react';
import { FunnelSection } from './FunnelSection';
import { CreativeMatrix } from './CreativeMatrix';
import { SegmentationSection } from './SegmentationSection';
import { CampaignsTable } from './CampaignsTable';

interface Props {
  data: CampaignData[];
}

export const ManagerialView: React.FC<Props> = ({ data }) => {
  
  // Calculate "Big Numbers" specific for this view
  const kpis = useMemo(() => {
    let totalSpend = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let blendedLeads = 0; // Forms + New Contacts

    data.forEach(d => {
      totalSpend += d.valor_gasto;
      totalImpressions += d.impressoes;
      totalClicks += d.cliques_todos;
      blendedLeads += d.leads_total + (d.msgs_novos_contatos || 0);
    });

    const cplBlended = blendedLeads > 0 ? totalSpend / blendedLeads : 0;
    const globalCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    return { totalSpend, blendedLeads, cplBlended, globalCtr };
  }, [data]);

  const topCards = [
    { label: 'Investimento Total', value: `R$ ${kpis.totalSpend.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, icon: <DollarSign size={20} className="text-white" />, color: 'bg-indigo-500' },
    { label: 'Leads Totais (Blended)', value: kpis.blendedLeads, icon: <Users size={20} className="text-white" />, color: 'bg-orange-500' },
    { label: 'CPL Blended', value: `R$ ${kpis.cplBlended.toFixed(2)}`, icon: <Target size={20} className="text-white" />, color: 'bg-emerald-500' },
    { label: 'CTR Global', value: `${kpis.globalCtr.toFixed(2)}%`, icon: <MousePointer2 size={20} className="text-white" />, color: 'bg-blue-500' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* 1. Big Numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {topCards.map((card, idx) => (
          <div key={idx} className="bg-white p-5 rounded-3xl shadow-lg shadow-indigo-500/5 border border-slate-100 flex items-center gap-4">
            <div className={`h-12 w-12 rounded-2xl ${card.color} shadow-lg shadow-indigo-500/20 flex items-center justify-center shrink-0`}>
              {card.icon}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{card.label}</p>
              <h3 className="text-xl font-bold text-slate-800">{card.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* 2. Funnel Section (Section A) */}
      <section>
        <FunnelSection data={data} />
      </section>

      {/* 3. Creative Matrix (Section B) */}
      <section>
        <CreativeMatrix data={data} />
      </section>

      {/* 4. Segmentation (Section C) */}
      <section>
        <SegmentationSection data={data} />
      </section>

      {/* 5. Analytical Table (Section D - Reusing existing but placed here) */}
      <section>
         <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">Detalhamento de Campanhas</h3>
        </div>
        <CampaignsTable data={data} />
      </section>

    </div>
  );
};